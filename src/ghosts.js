import * as THREE from 'three';
import { mulberry32, hash } from './util.js';
import { faceTexture } from './face.js';

const BANSHEE_HP = 90, WISP_HP = 30, BANSHEE_DMG = 30, WISP_DMG = 7;
const MAX_BANSHEE = 2, MAX_WISP = 6;
const STAGE_DIST = [20, 13, 8, 5.2];   // how far from you she stands each time she reappears (the last is just behind the camera)
const clamp = THREE.MathUtils.clamp;
export const uTime = { value: 0 };
const smooth = THREE.MathUtils.smoothstep, lerp = THREE.MathUtils.lerp;

// Cloth / hair flutter in the vertex shader. `weight` is a GLSL expression of `position`.
export function sway(mat, weight, amp) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float gsw = max(0.0, ${weight}) * ${amp.toFixed(3)};
        transformed.x += sin(uTime * 2.3 + position.y * 5.0 + position.z * 3.0) * gsw;
        transformed.z += cos(uTime * 1.9 + position.y * 4.0 + position.x * 3.0) * gsw;`);
  };
  mat.customProgramCacheKey = () => 'sway:' + weight + amp;
  return mat;
}

let dotTex = null;
function softDot() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const ctx = c.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return (dotTex = new THREE.CanvasTexture(c));
}

// Lathe with per-vertex RGBA: fades to nothing at the hem, darker in the folds, optional blood down the front.
export function robe(profile, segs, { fadeTo, ragged, blood, grime, flat = 1 }) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  const p = g.attributes.position, col = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(x, z), k = Math.round(a * 20);
    if (y < ragged) { const h = hash(k * 31 + 7); y += h * 0.2 - 0.04; x *= 0.9 + h * 0.25; z *= 0.9 + h * 0.25; }
    p.setXYZ(i, x, y, z * flat);
    const fold = 0.86 + 0.14 * Math.sin(a * 7 + y * 3);
    let r = fold, gr = fold, b = fold * 1.02;
    if (grime) { // soaked and filthy towards the hem, blotchy everywhere
      const d = lerp(0.22, 1, smooth(y, 0.05, 1.1)) * (0.6 + 0.4 * hash(k * 7 + Math.round(y * 6) * 131));
      r *= d; gr *= d * 0.97; b *= d * 0.92;
    }
    if (blood) { // dried blood: chest down, on the front (-z), ragged edges
      const m = smooth(Math.cos(a - Math.PI), 0.55, 0.95) * smooth(y, 0.35, 0.9) * (1 - smooth(y, 1.25, 1.4)) * (0.55 + 0.45 * hash(k * 13 + Math.round(y * 9)));
      r = lerp(r, 0.42, m); gr = lerp(gr, 0.05, m); b = lerp(b, 0.05, m);
    }
    col[i * 4] = r; col[i * 4 + 1] = gr; col[i * 4 + 2] = b; col[i * 4 + 3] = smooth(y, fadeTo[0], fadeTo[1]);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  g.computeVertexNormals();
  return g;
}

// Plain white RGBA vertex colours, for parts that share the robe material.
export function white(g, v = 1) {
  const n = g.attributes.position.count, c = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { c[i * 4] = c[i * 4 + 1] = c[i * 4 + 2] = v; c[i * 4 + 3] = 1; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 4));
  return g;
}

// 女鬼. Built to be wrong rather than pretty: too tall, too thin, neck snapped over to one
// side, arms that hang to the knees, wet hair across most of the face, a jaw that drops
// much further than a jaw should. The dress is old and filthy and gives off no light.
function makeBanshee() {
  const root = new THREE.Group(), body = new THREE.Group(), mats = [];
  root.add(body);
  const M = (m, base = 1) => { m.transparent = true; m.userData.base = base; mats.push(m); return m; };
  const cloth = M(sway(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1, color: 0x7d796f, emissive: 0x39424c, emissiveIntensity: 0.1 }), '1.9 - position.y', 0.035));
  const skin = M(new THREE.MeshStandardMaterial({ color: 0xaeb5b3, roughness: 0.9, emissive: 0x2a3034, emissiveIntensity: 0.25 }));
  const hairM = M(sway(new THREE.MeshBasicMaterial({ color: 0x030303, side: THREE.DoubleSide }), '-position.y', 0.05)); // unlit: stays ink-black even in the torch beam

  body.add(new THREE.Mesh(robe([[0.42, 0], [0.36, 0.25], [0.27, 0.6], [0.2, 0.95], [0.155, 1.2], [0.14, 1.36], [0.165, 1.52], [0.18, 1.64], [0.12, 1.74], [0.05, 1.83]], 28,
    { fadeTo: [0, 0.5], ragged: 0.32, blood: true, grime: true, flat: 0.6 }), cloth));
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.2, 8), skin); neck.position.set(0.02, 1.88, -0.02); neck.rotation.z = -0.35; body.add(neck);

  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.165, 1.66, -0.02); body.add(arm);
    arm.add(new THREE.Mesh(white(new THREE.CylinderGeometry(0.05, 0.1, 0.56, 14, 4, true).translate(0, -0.28, 0), 0.8), cloth));
    arm.add(new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.014, 0.46, 7).translate(0, -0.72, 0), skin)); // bone-thin forearm
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6).scale(1, 1.5, 0.55), skin); palm.position.y = -0.97; arm.add(palm);
    const fingers = [];
    for (let f = 0; f < 5; f++) { // fingers far too long, in two joints so they can hook
      const a = new THREE.Group(); a.position.set((f - 2) * 0.013, -0.99, 0); a.rotation.z = (f - 2) * 0.13; arm.add(a);
      a.add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.005, 0.1, 5).translate(0, -0.05, 0), skin));
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.12, 5).translate(0, -0.06, 0), skin); tip.position.y = -0.1; a.add(tip);
      fingers.push({ a, tip });
    }
    arm.userData = { side: s, fingers }; arms.push(arm);
  }

  const head = new THREE.Group(); head.position.set(0.045, 1.97, -0.04); body.add(head);
  // The face is painted (see face.js): near-human, soft-shaded, with a second texture for the scream.
  const faces = { calm: faceTexture('calm'), scream: faceTexture('scream') };
  const faceM = M(new THREE.MeshStandardMaterial({ map: faces.calm, color: 0x808080, roughness: 0.95, emissive: 0xffffff, emissiveMap: faces.calm, emissiveIntensity: 0.1 }));
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.115, 28, 20).scale(0.86, 1.17, 0.95), faceM); head.add(skull);

  // hair: scalp, a long wet curtain behind, and ragged strands hanging over the face (parted around the wide eye)
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.124, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6).rotateX(0.85).scale(0.9, 1.2, 1.05).translate(0, 0.014, 0.006), hairM));
  const hang = new THREE.Group(); head.add(hang); // counter-rotated in _poseBanshee so the hair hangs straight down whatever the neck does
  hang.add(new THREE.Mesh(new THREE.LatheGeometry([[0.105, 0.09], [0.122, -0.12], [0.135, -0.45], [0.14, -0.85], [0.1, -1.3]].map(([r, y]) => new THREE.Vector2(r, y)), 18, -2.2, 4.4), hairM));
  const fringe = new THREE.Group(); hang.add(fringe); // strands over the face: they fly apart when she screams
  for (let i = 0; i < 11; i++) {
    const x = -0.1 + i * 0.02, h = hash(i * 17 + 3);
    if (Math.abs(x + 0.042) < 0.022) continue;                      // leave the wide eye staring out
    const len = Math.abs(x) < 0.03 ? 0.16 + h * 0.1 : 0.42 + h * 0.5;
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.019, len, 0.005, 1, 8, 1).translate(0, -len / 2, 0), hairM);
    st.position.set(x, 0.115, -0.108 + Math.abs(x) * 0.3); st.rotation.z = (h - 0.5) * 0.12; st.userData.x = x; fringe.add(st);
  }
  return { root, body, mats, arms, head, hang, fringe, skull, faces, faceM, cloth, skin };
}

// 阿飄: the little bedsheet kind. Round, translucent, hollow-eyed.
function makeWisp() {
  const root = new THREE.Group(), mats = [];
  const M = (m, base = 1) => { m.transparent = true; m.userData.base = base; mats.push(m); return m; };
  const sheet = M(sway(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1, color: 0xeaf6ff, emissive: 0x8fd0ff, emissiveIntensity: 0.9 }), '0.8 - position.y', 0.035), 0.88);
  const dark = M(new THREE.MeshBasicMaterial({ color: 0x05070c }));
  root.add(new THREE.Mesh(robe([[0.33, 0], [0.3, 0.14], [0.285, 0.32], [0.27, 0.46], [0.22, 0.62], [0.12, 0.74], [0.001, 0.78]], 20, { fadeTo: [0, 0.3], ragged: 0.12 }), sheet));
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8).scale(0.8, 1.25, 0.4), dark); eye.position.set(s * 0.09, 0.5, -0.235); root.add(eye);
    const nub = new THREE.Mesh(white(new THREE.SphereGeometry(0.07, 8, 6).scale(1.3, 0.7, 0.8)), sheet); nub.position.set(s * 0.3, 0.36, -0.03); root.add(nub);
  }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), dark); mouth.position.set(0, 0.37, -0.283); mouth.scale.set(1, 1.3, 0.4); root.add(mouth);
  const halo = new THREE.Sprite(M(new THREE.SpriteMaterial({ map: softDot(), color: 0x8fd0ff, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), 0.3));
  halo.scale.setScalar(1.5); halo.position.y = 0.4; root.add(halo);
  return { root, mats, mouth, cloth: sheet };
}

// Night-time enemies. They ignore walls (they are ghosts) and are swept away at dawn.
//
// The 女鬼 is built around dread rather than damage: she stands still in the dark and
// watches. Look straight at her and she is simply gone, then back somewhere you are not
// looking, closer. She only moves while unobserved, in stop-motion hops, and ends up
// right behind you, waiting for you to turn round.
export class Ghosts {
  constructor(scene, terrain, world, loot, fx, audio) {
    this.scene = scene; this.terrain = terrain; this.world = world; this.loot = loot; this.fx = fx; this.audio = audio;
    this.rng = mulberry32(666);
    this.list = [];
    for (let i = 0; i < MAX_BANSHEE; i++) this._make('banshee');
    for (let i = 0; i < MAX_WISP; i++) this._make('wisp');
    // one shared light: glow under the nearest 阿飄, or lighting the 女鬼's face from below when she is in yours
    this.light = new THREE.PointLight(0x9fc4ff, 0, 10, 1.8); scene.add(this.light);
    this.stats = { ghosts: 0 };
    this.spawnT = { banshee: 5, wisp: 3 };
    this.dread = 0;          // 0..1, how close the horror is: drives heartbeat, screen grain, torch flicker
    this.flicker = 0;        // 0..1, how much the torch is cutting out this frame
    this._pulse = 0;
    this.onKill = null;      // (ghost, dist) => void
    this.onScare = null;     // (ghost) => void, fired when one reaches the player's face
    this.scaring = null;
    this._v = new THREE.Vector3(); this._n = new THREE.Vector3();
  }

  _make(kind) {
    const rig = kind === 'banshee' ? makeBanshee() : makeWisp();
    rig.root.visible = false; this.scene.add(rig.root);
    this.list.push({
      kind, name: kind === 'banshee' ? '女鬼' : '阿飄', sys: this, rig, alive: false, active: false,
      x: 0, y: 0, z: 0, yaw: 0, hp: 0, maxHp: kind === 'banshee' ? BANSHEE_HP : WISP_HP,
      state: 'idle', t: 0, opacity: 0, seed: this.rng() * 100, flash: 0, biteCd: 0,
      stage: 0, stareT: 0, seenT: 0, hopT: 0, holdT: 0, goneFor: 0, los: true, losT: 0, twitchT: 0, tilt: 0.95, jawOpen: 0, reach: 0,
    });
  }

  get activeCount() { return this.list.filter((g) => g.active).length; }

  // Stand her somewhere for stage n: first at the edge of what you can see, afterwards always out of view.
  _place(g, player, stage) {
    const d0 = STAGE_DIST[Math.min(stage, STAGE_DIST.length - 1)];
    for (let tries = 0; tries < 16; tries++) {
      const side = this.rng() < 0.5 ? -1 : 1;
      const off = stage === 0 ? side * (0.5 + this.rng() * 0.4) : stage === 1 ? side * (1.7 + this.rng() * 0.7) : Math.PI + (this.rng() - 0.5) * (stage === 2 ? 1.0 : 0.5);
      const a = player.yaw + off, d = d0 * (stage >= 3 ? 1 : 0.9 + this.rng() * 0.25) + tries * 0.15;
      const x = player.pos.x - Math.sin(a) * d, z = player.pos.z - Math.cos(a) * d;
      if (!this.terrain.inBounds(x, z, 8)) continue;
      if (tries < 12 && this.world.colliders.blocked(x, this.terrain.heightAt(x, z) + 1, z)) continue;
      g.x = x; g.z = z; g.y = this.terrain.heightAt(x, z);
      g.yaw = Math.atan2(-(player.pos.x - x), -(player.pos.z - z));
      return true;
    }
    return false;
  }

  _spawn(kind, player) {
    const g = this.list.find((q) => q.kind === kind && !q.active);
    if (!g) return null;
    if (kind === 'banshee') {
      if (!this._place(g, player, 0)) return null;
      Object.assign(g, { stage: 0, state: 'watch', stareT: 0, seenT: 0, hopT: 1, holdT: 0, jawOpen: 0.1, reach: 0.05, tilt: 0.95 });
    } else {
      let ok = false;
      for (let tries = 0; tries < 10 && !ok; tries++) {
        const a = player.yaw + Math.PI + (this.rng() - 0.5) * 3.2, d = 16 + this.rng() * 14;
        g.x = player.pos.x - Math.sin(a) * d; g.z = player.pos.z - Math.cos(a) * d;
        ok = this.terrain.inBounds(g.x, g.z, 8);
      }
      if (!ok) return null;
      g.y = this.terrain.heightAt(g.x, g.z); g.state = 'stalk';
      g.yaw = Math.atan2(-(player.pos.x - g.x), -(player.pos.z - g.z));
      if (this.rng() < 0.5) this.audio?.wisp();
    }
    Object.assign(g, { active: true, alive: true, hp: g.maxHp, opacity: 0, t: 0, flash: 0, biteCd: 0.8 });
    g.rig.root.visible = true; g.rig.root.scale.setScalar(1);
    return g;
  }

  // Send everything away (dawn, or the player was eliminated).
  banish() { for (const g of this.list) if (g.active && g.state !== 'vanish' && g.state !== 'die') { g.state = 'vanish'; g.t = 0; g.alive = false; } }

  // Ray (unit direction) vs. ghosts. Returns { t, target, zone } or null.
  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    let best = null, bt = maxT;
    for (const g of this.list) {
      if (!g.alive || g.opacity < 0.15) continue;
      const fx = ox - g.x, fz = oz - g.z;
      let t = -1, zone = 'body';
      const sphere = (cy, r) => {
        const hy = oy - (g.y + cy), b = fx * dx + hy * dy + fz * dz, c = fx * fx + hy * hy + fz * fz - r * r, disc = b * b - c;
        if (disc < 0) return -1;
        const th = -b - Math.sqrt(disc);
        return th >= 0 ? th : -1;
      };
      if (g.kind === 'wisp') t = sphere(0.42, 0.36);
      else {
        const a = dx * dx + dz * dz;
        if (a > 1e-9) {
          const b = fx * dx + fz * dz, c = fx * fx + fz * fz - 0.3 * 0.3, disc = b * b - a * c;
          if (c < 0) { const y = oy - g.y; if (y >= 0.25 && y <= 1.85) t = 0; } // muzzle already inside her
          else if (disc >= 0) { const t0 = (-b - Math.sqrt(disc)) / a, y = oy + dy * t0 - g.y; if (t0 >= 0 && y >= 0.25 && y <= 1.85) t = t0; }
        }
        const th = sphere(1.97, 0.23);
        if (th >= 0 && (t < 0 || th < t)) { t = th; zone = 'head'; }
      }
      if (t >= 0 && t < bt) { bt = t; best = { t, target: g, zone }; }
    }
    return best;
  }

  damage(g, amount, dist = 0) {
    if (!g.alive) return false;
    g.hp -= amount; g.flash = 1;
    if (g.kind === 'banshee' && g.state === 'watch') this._lunge(g); // shooting her only makes her come for you
    if (g.hp > 0) return false;
    g.hp = 0; g.alive = false; g.state = 'die'; g.t = 0;
    this.stats.ghosts++;
    this._v.set(g.x, g.y + (g.kind === 'banshee' ? 1.3 : 0.45), g.z);
    this.fx.impact(this._v, this._n.set(0, 1, 0), 'ghost', 26);
    for (let i = 0; i < 3; i++) this.fx.puff(this._v, this._n, g.kind === 'banshee' ? 'smoke' : 'mist');
    if (this.rng() < (g.kind === 'banshee' ? 0.7 : 0.25)) {
      const id = ['chickenfeet', 'icecream', 'friedchicken', 'guabao'][Math.floor(this.rng() * (g.kind === 'banshee' ? 4 : 2))];
      this.loot.scatter([{ id, n: 1 }], g.x, g.z, 0.3);
    }
    if (this.scaring === g) this.scaring = null;
    this.onKill?.(g, dist);
    return true;
  }

  _lunge(g) { g.state = 'windup'; g.t = 0; g.opacity = 1; this.audio?.scream(); this._pulse = 1; }

  // sky: { night (0..1), hour } · cam: { pos, look }
  update(dt, player, cam, sky) {
    uTime.value += dt;
    const dark = sky.night > 0.6 && !player.dead;
    // how far into the night we are: more of them as it gets later (peaks around 01:00)
    const depth = dark ? 1 - Math.min(1, Math.abs(((sky.hour + 6) % 24) - 7) / 6) : 0;
    if (dark) {
      const wantB = depth > 0.55 ? 2 : 1, wantW = 1 + Math.round(depth * (MAX_WISP - 2));
      const count = (k) => this.list.filter((g) => g.kind === k && g.active).length;
      if ((this.spawnT.banshee -= dt) <= 0) { this.spawnT.banshee = 14 + this.rng() * 12; if (count('banshee') < wantB) this._spawn('banshee', player); }
      if ((this.spawnT.wisp -= dt) <= 0) { this.spawnT.wisp = 5 + this.rng() * 6; if (count('wisp') < wantW) this._spawn('wisp', player); }
    } else if (this.activeCount) this.banish();

    let nearest = null, nd = Infinity, dread = 0;
    for (const g of this.list) {
      if (!g.active) continue;
      g.t += dt; g.flash = Math.max(0, g.flash - dt * 5);
      const dx = player.pos.x - g.x, dz = player.pos.z - g.z, dist = Math.hypot(dx, dz);
      const want = Math.atan2(-dx, -dz);
      const turn = (rate) => { let d = want - g.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); g.yaw += d * (1 - Math.exp(-rate * dt)); };
      const step = (speed) => { g.x -= Math.sin(g.yaw) * speed * dt; g.z -= Math.cos(g.yaw) * speed * dt; };
      const rig = g.rig;
      let targetOpacity = 1, fade = 3, hover = 0;

      if (g.kind === 'banshee') {
        this._banshee(g, dt, player, cam, dist, want, turn, step);
        if (!g.active) continue;
        if (g.state === 'watch') { targetOpacity = 1; fade = 9; dread = Math.max(dread, clamp(1 - (dist - 2) / 24, 0, 1) * 0.85 + g.stage * 0.05); }
        else if (g.state === 'gone') { targetOpacity = 0; fade = 60; dread = Math.max(dread, 0.3 + 0.13 * g.stage); }
        else if (g.state === 'windup' || g.state === 'rush' || g.state === 'scare') dread = 1;
      } else {
        this._wisp(g, dt, player, dist, turn, step);
        hover = 0.22 + Math.sin(uTime.value * 1.7 + g.seed) * 0.08;
        if (g.state === 'stalk') targetOpacity = 0.85 + 0.15 * Math.sin(uTime.value * 9 + g.seed);
      }
      if (g.state === 'vanish') { targetOpacity = 0; fade = 7; }
      if (g.state === 'die') { targetOpacity = 0; fade = 7; rig.root.scale.setScalar(1 + g.t * (g.kind === 'banshee' ? 0.5 : 1.6)); }
      g.opacity += (targetOpacity - g.opacity) * (1 - Math.exp(-fade * dt));
      if ((g.state === 'vanish' || g.state === 'die') && g.opacity < 0.03) { g.active = false; rig.root.visible = false; if (this.scaring === g) this.scaring = null; continue; }
      if (dist > 95 && (g.state === 'stalk' || g.state === 'watch')) { g.state = 'vanish'; g.alive = false; }

      rig.root.visible = g.opacity > 0.01;
      for (const m of rig.mats) m.opacity = m.userData.base * g.opacity;
      if (g.kind === 'wisp') {
        rig.cloth.emissiveIntensity = 0.9 + g.flash * 2.5;
        g.y = this.terrain.heightAt(g.x, g.z);
        rig.root.position.set(g.x, g.y + hover, g.z); rig.root.rotation.set(0, g.yaw, 0);
        rig.mouth.scale.y = 1.3 + Math.sin(uTime.value * 4 + g.seed) * 0.4;
        if (dist < nd && g.opacity > 0.2) { nd = dist; nearest = g; }
      } else this._poseBanshee(g, dt);
    }

    this.dread += (dread - this.dread) * (1 - Math.exp(-2.2 * dt));
    this._pulse = Math.max(0, this._pulse - dt * 2.2);
    const stutter = this.dread > 0.4 && hash(Math.floor(uTime.value * 13)) > 0.7 ? this.dread * 0.85 : 0;
    this.flicker = clamp(Math.max(stutter, this._pulse > 0 ? (hash(Math.floor(uTime.value * 30)) > 0.4 ? 1 : 0.2) * Math.min(1, this._pulse * 2) : 0), 0, 1);

    const s = this.scaring;
    if (s) { // her face, lit from underneath, right in front of the lens
      this.light.color.setHex(0xd6ecd8); this.light.distance = 3; this.light.intensity = 14;
      this.light.position.set(s.x - cam.look.x * 0.32, cam.pos.y - 0.34, s.z - cam.look.z * 0.32);
    } else if (nearest) {
      this.light.color.setHex(0x9fc4ff); this.light.distance = 10;
      this.light.position.set(nearest.x, nearest.y + 1.1, nearest.z); this.light.intensity = 3.2 * nearest.opacity;
    } else this.light.intensity = 0;
  }

  _banshee(g, dt, player, cam, dist, want, turn, step) {
    // can the player actually see her right now?
    this._v.set(g.x - cam.pos.x, g.y + 1.5 - cam.pos.y, g.z - cam.pos.z);
    const cd = this._v.length(); this._v.multiplyScalar(1 / (cd || 1));
    const dot = this._v.dot(cam.look);
    if ((g.losT -= dt) <= 0) {
      g.losT = 0.15;
      const h = this.world.raycast(cam.pos.x, cam.pos.y, cam.pos.z, this._v.x, this._v.y, this._v.z, cd);
      g.los = !h || h.t > cd - 0.6;
    }
    const seen = dot > 0.6 && g.los && g.opacity > 0.4;

    switch (g.state) {
      case 'watch':
        g.yaw = want;                     // always squarely facing you
        if (seen) {
          g.seenT += dt; if (dot > 0.93) g.stareT += dt;
          if (dist < 6.5) this._lunge(g);  // you turned round and she was right there
          else if (g.stareT > 0.55 || g.seenT > 2.8) { // looked straight at her: gone, between one frame and the next
            g.state = 'gone'; g.t = 0; g.goneFor = 1.1 + this.rng() * 1.8; g.opacity = 0;
            this._pulse = 1; this.audio?.whisper();
          }
        } else {
          g.stareT = Math.max(0, g.stareT - dt);
          // only moves while nobody is looking, a hop at a time
          if ((g.hopT -= dt) <= 0 && dist > 5) {
            g.hopT = 0.4 + this.rng() * 0.35;
            const hop = Math.min(1.3, dist - 4.8);
            g.x -= Math.sin(want) * hop; g.z -= Math.cos(want) * hop;
          }
          if (dist <= 5.6) { g.holdT += dt; if (g.holdT > 5) this._lunge(g); } // tired of waiting behind you
        }
        break;
      case 'gone':
        if (g.t > g.goneFor) {
          g.stage++;
          if (this._place(g, player, g.stage)) { g.state = 'watch'; g.t = 0; g.stareT = g.seenT = g.holdT = 0; g.hopT = 0.8; g.los = false; g.losT = 0; }
          else g.goneFor += 0.5;
        }
        break;
      case 'windup': g.yaw = want; if (g.t > 0.28) { g.state = 'rush'; g.t = 0; } break;
      case 'rush':
        turn(9); step(15);
        g.x += Math.sin(g.t * 38) * 0.05; // jerks from side to side as she comes
        if (dist < 1.3) {
          g.state = 'scare'; g.t = 0; this.scaring = g;
          player.damage(BANSHEE_DMG, { raw: true, x: g.x, z: g.z, source: g.name });
          this.onScare?.(g);
        } else if (g.t > 2.4) { g.state = 'vanish'; g.t = 0; g.alive = false; }
        break;
      case 'scare': { // right in the camera's face, shaking
        const r = g.rig.root, sc = 1.25, k = 0.47 + Math.sin(g.t * 47) * 0.025;
        r.scale.setScalar(sc);
        r.position.set(cam.pos.x + cam.look.x * k + Math.sin(g.t * 83) * 0.035, cam.pos.y + cam.look.y * k - 1.97 * sc + 0.06 + Math.sin(g.t * 61) * 0.03, cam.pos.z + cam.look.z * k + Math.cos(g.t * 71) * 0.035);
        r.rotation.set(0, Math.atan2(cam.look.x, cam.look.z), 0);
        g.x = r.position.x; g.z = r.position.z;
        if (g.t > 0.85) { g.state = 'vanish'; g.t = 0; g.alive = false; g.opacity = 0; this.scaring = null; }
        break;
      }
    }
  }

  // Posture: slumped and still while watching (with the odd violent twitch), then all claws and jaw.
  _poseBanshee(g, dt) {
    const rig = g.rig, k = (rate) => 1 - Math.exp(-rate * dt);
    const attack = g.state === 'windup' || g.state === 'rush' || g.state === 'scare';
    const scare = g.state === 'scare';
    let tilt = 0.95, nod = 0.42, jaw = 0.2, reach = 0.04, lean = -0.17, spread = 0.03, curl = 0.2;
    if (attack) { tilt = scare ? Math.sin(g.t * 90) * 0.28 : 0.12; nod = scare ? -0.05 : -0.3; jaw = 1; reach = scare ? 1.25 : 1.5; lean = scare ? 0 : -0.5; spread = scare ? 0.55 : 0.22; curl = 0.75; }
    else if ((g.twitchT -= dt) <= 0) { // neck snaps across to the other shoulder and back
      g.twitchT = 1.5 + this.rng() * 4; g.tilt = g.tilt > 0 ? -0.8 : 0.95;
    }
    if (!attack) tilt = g.tilt;
    g.jawOpen += (jaw - g.jawOpen) * k(attack ? 26 : 6); g.reach += (reach - g.reach) * k(attack ? 16 : 5);
    if (scare) rig.body.rotation.x = 0; // must be upright at once: the face is positioned against the lens
    else rig.body.rotation.x += (lean - rig.body.rotation.x) * k(12);
    rig.head.rotation.z += (tilt - rig.head.rotation.z) * k(attack ? 30 : 40);   // snaps, never eases
    rig.head.rotation.x += (nod - rig.head.rotation.x) * k(20);
    const face = attack ? rig.faces.scream : rig.faces.calm;
    if (rig.faceM.map !== face) { rig.faceM.map = rig.faceM.emissiveMap = face; }
    rig.skull.scale.y = 1 + g.jawOpen * 0.07; // the face lengthens a little as the mouth opens
    rig.hang.rotation.set(-rig.head.rotation.x * 0.8, 0, -rig.head.rotation.z * 0.9);
    // strands slide out to the sides (without getting wider) to bare the face
    g.part = (g.part ?? 1) + ((attack ? 3.2 : 1) - (g.part ?? 1)) * k(attack ? 22 : 5);
    for (const st of rig.fringe.children) st.position.x = st.userData.x * g.part + Math.sign(st.userData.x) * (g.part - 1) * 0.02;
    for (const a of rig.arms) {
      const s = a.userData.side;
      a.rotation.set(g.reach + (attack ? Math.sin(uTime.value * 31 + s) * 0.08 : 0), 0, -s * (0.05 + spread));
      for (const f of a.userData.fingers) { f.a.rotation.x = curl * 0.5; f.tip.rotation.x = curl; }
    }
    rig.cloth.emissiveIntensity = 0.1 + g.flash * 1.5;
    rig.faceM.emissiveIntensity = scare ? 0.16 : 0.1; // a pale face is the first thing you make out in the dark
    if (!scare) {
      g.y = this.terrain.heightAt(g.x, g.z);
      rig.root.position.set(g.x, g.y + 0.04, g.z);
      rig.root.rotation.set(0, g.yaw, 0);
      if (g.state !== 'die') rig.root.scale.setScalar(1);
    }
  }

  _wisp(g, dt, player, dist, turn, step) {
    if (g.state !== 'stalk') return;
    turn(3);
    g.yaw += Math.sin(uTime.value * 2.2 + g.seed) * 1.2 * dt; // zig-zag
    g.biteCd -= dt;
    if (dist > 1.3) step(g.biteCd > 0 && dist < 4 ? -2.2 : 3.1);
    else if (g.biteCd <= 0) {
      g.biteCd = 1.6; g.flash = 0.6;
      player.damage(WISP_DMG, { raw: true, x: g.x, z: g.z, source: g.name });
    }
  }
}
