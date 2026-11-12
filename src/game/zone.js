// The shrinking safe zone ("毒圈"). Everything is derived from a seed and the match clock,
// so every player in a networked match computes exactly the same circles without syncing them.
import * as THREE from 'three';
import { mulberry32, centroid } from '../util.js';

const RADII = [820, 480, 280, 160, 85, 40, 18];
// For phase p: hold on circle p for `wait` seconds, then close in to circle p+1 over `shrink` seconds.
const PHASES = [
  { wait: 120, shrink: 90, dps: 0.6 },
  { wait: 90, shrink: 60, dps: 1 },
  { wait: 60, shrink: 45, dps: 2 },
  { wait: 45, shrink: 30, dps: 4 },
  { wait: 40, shrink: 25, dps: 7 },
  { wait: 30, shrink: 20, dps: 11 },
];
const FINAL_DPS = 14;

const wallVertex = /* glsl */`
  varying vec2 vUv; varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }`;

const wallFragment = /* glsl */`
  uniform float uTime, uRadius; uniform vec3 uCam, uColor;
  varying vec2 vUv; varying vec3 vWorld;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    float d = distance(vWorld.xz, uCam.xz);
    float near = smoothstep(320.0, 15.0, d);                 // detail only shows up close
    float h = vWorld.y - uCam.y;
    float band = exp(-max(0.0, h) * 0.012) * smoothstep(-60.0, -5.0, h + 40.0);
    float arc = vUv.x * 6.2831853 * uRadius;                 // metres along the wall
    // slow rising shimmer + a faint lattice
    float n = noise(vec2(arc * 0.08, vWorld.y * 0.08 - uTime * 0.6)) * 0.6 + noise(vec2(arc * 0.31, vWorld.y * 0.3 - uTime * 1.3)) * 0.4;
    float gx = abs(fract(arc / 5.0) - 0.5), gy = abs(fract((vWorld.y - uTime * 1.5) / 5.0) - 0.5);
    float grid = smoothstep(0.46, 0.5, max(gx, gy));
    float alpha = (0.16 + 0.22 * n + (0.18 * n + 0.35 * grid) * near) * band;
    vec3 col = uColor * (0.75 + 0.6 * n) + vec3(0.25, 0.4, 0.5) * grid * near;
    gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.85));
  }`;

export class Zone {
  constructor(scene, terrain, world) {
    this.terrain = terrain; this.world = world;
    this.circles = []; this.t = 0; this.active = false;
    this.x = 0; this.z = 0; this.r = 1e6;      // current wall
    this.next = null;                          // the circle it is closing in to
    this.phase = 0; this.state = 'idle';       // 'idle' | 'wait' | 'shrink' | 'done'
    this.remaining = 0; this.total = 1; this.dps = 0;
    this.onEvent = null;                       // (kind: 'new' | 'shrink' | 'final', phase)

    const H = (terrain.maxH - terrain.minH) + 320;
    this.uniforms = { uTime: { value: 0 }, uRadius: { value: 1 }, uCam: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color(0x2f7dff) } };
    this.wall = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 1, 160, 1, true),
      new THREE.ShaderMaterial({ uniforms: this.uniforms, vertexShader: wallVertex, fragmentShader: wallFragment,
        transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    this.wall.scale.set(1, H, 1);
    this.wallY = (terrain.minH + terrain.maxH) / 2 + 110;
    this.wall.visible = false; this.wall.frustumCulled = false; this.wall.renderOrder = 5;
    scene.add(this.wall);
  }

  // Lay out every circle of the match up front.
  start(seed) {
    const rng = mulberry32(seed), { terrain, world } = this;
    const campus = world.map.campus ? centroid(world.map.campus) : { x: 0, z: 0 };
    const ok = (x, z) => terrain.inBounds(x, z, 20) && world.inCampus(x, z);
    const pickIn = (cx, cz, maxD, walkable) => {
      let best = { x: cx, z: cz };
      for (let i = 0; i < 40; i++) {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * maxD;
        const x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (!ok(x, z)) continue;
        if (walkable && world.colliders.blocked(x, terrain.heightAt(x, z) + 1, z)) continue;
        best = { x, z }; break;
      }
      return best;
    };
    const first = pickIn(campus.x, campus.z, 180, false);
    this.circles = [{ x: first.x, z: first.z, r: RADII[0] }];
    for (let i = 1; i < RADII.length; i++) {
      const prev = this.circles[i - 1];
      const c = pickIn(prev.x, prev.z, prev.r - RADII[i], i >= RADII.length - 2);   // the last circles end on open ground
      this.circles.push({ x: c.x, z: c.z, r: RADII[i] });
    }
    this.seed = seed; this.t = 0; this.active = true; this.phase = -1; this.state = 'idle';
    this.wall.visible = true;
    this._evaluate(true);
  }

  stop() { this.active = false; this.wall.visible = false; this.state = 'idle'; this.r = 1e6; this.next = null; this.dps = 0; }

  // How far (m) a point is outside the wall; negative means safe.
  outside(x, z) { return this.active ? Math.hypot(x - this.x, z - this.z) - this.r : -1; }

  _evaluate(silent) {
    let t = this.t;
    const c = this.circles;
    for (let p = 0; p < PHASES.length; p++) {
      const ph = PHASES[p], a = c[p], b = c[p + 1];
      if (t < ph.wait) { this._set(p, 'wait', a.x, a.z, a.r, b, ph.wait - t, ph.wait, ph.dps, silent); return; }
      t -= ph.wait;
      if (t < ph.shrink) {
        const k = t / ph.shrink;
        this._set(p, 'shrink', a.x + (b.x - a.x) * k, a.z + (b.z - a.z) * k, a.r + (b.r - a.r) * k, b, ph.shrink - t, ph.shrink, ph.dps, silent);
        return;
      }
      t -= ph.shrink;
    }
    const last = c[c.length - 1];
    this._set(PHASES.length, 'done', last.x, last.z, last.r, null, 0, 1, FINAL_DPS, silent);
  }

  _set(phase, state, x, z, r, next, remaining, total, dps, silent) {
    const changed = phase !== this.phase || state !== this.state;
    this.phase = phase; this.state = state; this.x = x; this.z = z; this.r = r;
    this.next = next; this.remaining = remaining; this.total = total; this.dps = dps;
    if (changed && !silent) this.onEvent?.(state === 'wait' ? 'new' : state === 'shrink' ? 'shrink' : 'final', phase);
  }

  // Advance the match clock (pass the shared match time instead of dt in a networked game via setTime).
  update(dt, camera) {
    if (!this.active) return;
    this.t += dt;
    this._evaluate(false);
    this.wall.position.set(this.x, this.wallY, this.z);
    this.wall.scale.x = this.wall.scale.z = this.r;
    this.uniforms.uTime.value += dt;
    this.uniforms.uRadius.value = this.r;
    this.uniforms.uCam.value.copy(camera.position);
  }

  setTime(t) { this.t = t; }
}
