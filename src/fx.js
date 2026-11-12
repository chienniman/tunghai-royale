import * as THREE from 'three';

const MAX_PARTICLES = 320, MAX_PUFFS = 48, MAX_TRACERS = 28, MAX_NUMBERS = 14;

function canvasTexture(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const softDot = () => canvasTexture(64, (ctx, s) => {
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
});
const flashStar = () => canvasTexture(128, (ctx, s) => {
  const c = s / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.18, 'rgba(255,236,170,.95)'); g.addColorStop(0.5, 'rgba(255,170,60,.35)'); g.addColorStop(1, 'rgba(255,120,20,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  ctx.globalCompositeOperation = 'lighter'; ctx.translate(c, c);
  for (let i = 0; i < 6; i++) { // spikes
    ctx.rotate(Math.PI / 3 + (i % 2) * 0.3);
    const sg = ctx.createLinearGradient(0, 0, c, 0);
    sg.addColorStop(0, 'rgba(255,240,190,.9)'); sg.addColorStop(1, 'rgba(255,160,40,0)');
    ctx.fillStyle = sg; ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(c * (0.7 + (i % 3) * 0.15), 0); ctx.lineTo(0, 5); ctx.closePath(); ctx.fill();
  }
});

// Short-lived combat visuals: tracers, muzzle flash, impact debris, dust puffs and
// floating damage numbers. Everything is pooled; nothing allocates per shot.
export class FX {
  constructor(scene, camera) {
    this.scene = scene; this.camera = camera;

    // Tracers: thin additive boxes stretched from muzzle to impact.
    const tg = new THREE.BoxGeometry(0.014, 0.014, 1).translate(0, 0, 0.5);
    this.tracers = [];
    for (let i = 0; i < MAX_TRACERS; i++) {
      const m = new THREE.Mesh(tg, new THREE.MeshBasicMaterial({
        color: 0xfff4d6, transparent: true, opacity: 0, depthWrite: false, fog: false,
      }));
      m.visible = false; m.frustumCulled = false; scene.add(m);
      this.tracers.push({ mesh: m, life: 0, max: 1 });
    }
    this._ti = 0;

    // Muzzle flash: a light that is always in the scene (no shader recompiles) + a camera-facing star.
    this.flashLight = new THREE.PointLight(0xffc878, 0, 16, 2);
    scene.add(this.flashLight);
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({
      map: flashStar(), color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }));
    this.flash.visible = false; scene.add(this.flash);
    this.flashT = 0;

    const dot = softDot();
    // Debris: small bright bits, one Points object with per-vertex RGBA.
    this.deb = this._pool(MAX_PARTICLES, 0.085, dot, THREE.NormalBlending);
    // Puffs: big soft dust / smoke clouds.
    this.puf = this._pool(MAX_PUFFS, 0.9, dot, THREE.NormalBlending);

    // Floating damage numbers (DOM).
    this.numbers = [];
    const layer = document.getElementById('dmg-layer');
    for (let i = 0; i < MAX_NUMBERS; i++) {
      const el = document.createElement('div'); el.className = 'dmg-num'; el.style.display = 'none';
      layer?.appendChild(el);
      this.numbers.push({ el, life: 0, pos: new THREE.Vector3() });
    }
    this._ni = 0;
    this._v = new THREE.Vector3();
  }

  _pool(n, size, map, blending) {
    const p = { n, i: 0, pos: new Float32Array(n * 3), col: new Float32Array(n * 4), vel: new Float32Array(n * 3), life: new Float32Array(n), max: new Float32Array(n), alpha: new Float32Array(n), grav: 9 };
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(p.col, 4));
    p.points = new THREE.Points(g, new THREE.PointsMaterial({ size, map, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true, blending }));
    p.points.frustumCulled = false; this.scene.add(p.points);
    return p;
  }

  _emit(p, x, y, z, vx, vy, vz, r, g, b, a, life) {
    const i = p.i = (p.i + 1) % p.n;
    p.pos[i * 3] = x; p.pos[i * 3 + 1] = y; p.pos[i * 3 + 2] = z;
    p.vel[i * 3] = vx; p.vel[i * 3 + 1] = vy; p.vel[i * 3 + 2] = vz;
    p.col[i * 4] = r; p.col[i * 4 + 1] = g; p.col[i * 4 + 2] = b; p.col[i * 4 + 3] = a;
    p.alpha[i] = a; p.life[i] = p.max[i] = life;
  }

  _step(p, dt, grav, drag) {
    let any = false;
    const k = Math.exp(-drag * dt);
    for (let i = 0; i < p.n; i++) {
      if (p.life[i] <= 0) continue;
      any = true;
      p.life[i] -= dt;
      p.vel[i * 3] *= k; p.vel[i * 3 + 2] *= k; p.vel[i * 3 + 1] = p.vel[i * 3 + 1] * k - grav * dt;
      p.pos[i * 3] += p.vel[i * 3] * dt; p.pos[i * 3 + 1] += p.vel[i * 3 + 1] * dt; p.pos[i * 3 + 2] += p.vel[i * 3 + 2] * dt;
      p.col[i * 4 + 3] = p.alpha[i] * Math.max(0, p.life[i] / p.max[i]);
    }
    if (any) { p.points.geometry.attributes.position.needsUpdate = true; p.points.geometry.attributes.color.needsUpdate = true; }
  }

  tracer(from, to, life = 0.07) {
    const t = this.tracers[this._ti = (this._ti + 1) % MAX_TRACERS];
    const len = from.distanceTo(to); if (len < 0.5) return;
    t.mesh.position.copy(from); t.mesh.lookAt(to); t.mesh.scale.set(1, 1, len);
    t.mesh.visible = true; t.life = t.max = life;
  }

  // Flash at the muzzle; dir (optional) pushes it slightly down the barrel and adds a wisp of smoke.
  muzzle(pos, dir) {
    this.flash.position.copy(pos); if (dir) this.flash.position.addScaledVector(dir, 0.1);
    this.flash.material.rotation = Math.random() * 6.28;
    this.flash.scale.setScalar(0.42 + Math.random() * 0.3); this.flash.visible = true;
    this.flashLight.position.copy(pos); this.flashLight.intensity = 22;
    this.flashT = 0.045;
    if (dir) this._emit(this.puf, pos.x, pos.y, pos.z, dir.x * 1.5, 0.5, dir.z * 1.5, 0.8, 0.8, 0.8, 0.16, 0.5);
  }

  // Burst of debris at p, thrown along normal n. kind: 'dirt' | 'stone' | 'spark' | 'hit'
  impact(p, n, kind = 'stone', count = 7) {
    const C = { dirt: [0.36, 0.28, 0.18], stone: [0.78, 0.76, 0.72], spark: [1, 0.82, 0.4], hit: [1, 0.3, 0.22], ghost: [0.78, 0.9, 1] }[kind];
    const speed = kind === 'spark' ? 5.5 : kind === 'ghost' ? 3.6 : 2.8;
    for (let k = 0; k < count; k++) {
      const v = 0.8 + Math.random() * 0.2, s = speed * (0.3 + Math.random() * 0.7);
      this._emit(this.deb, p.x, p.y, p.z,
        (n.x + (Math.random() - 0.5) * 1.3) * s, (n.y + Math.random() * 0.9) * s, (n.z + (Math.random() - 0.5) * 1.3) * s,
        C[0] * v, C[1] * v, C[2] * v, 1, 0.25 + Math.random() * 0.4);
    }
  }

  // Soft cloud drifting off a surface. kind: 'dirt' | 'stone' | 'smoke'
  puff(p, n, kind = 'stone') {
    const C = { dirt: [0.5, 0.42, 0.3], stone: [0.82, 0.8, 0.77], smoke: [0.16, 0.16, 0.17], mist: [0.82, 0.9, 1] }[kind];
    const up = kind === 'smoke' ? 1.6 : kind === 'mist' ? 1.0 : 0.5;
    this._emit(this.puf, p.x + n.x * 0.1, p.y + n.y * 0.1, p.z + n.z * 0.1,
      n.x * 0.9 + (Math.random() - 0.5) * 0.6, n.y * 0.9 + up * (0.6 + Math.random() * 0.6), n.z * 0.9 + (Math.random() - 0.5) * 0.6,
      C[0], C[1], C[2], kind === 'smoke' ? 0.55 : kind === 'mist' ? 0.45 : 0.32, kind === 'smoke' ? 1.6 + Math.random() : kind === 'mist' ? 1.1 + Math.random() * 0.5 : 0.55 + Math.random() * 0.3);
  }

  number(pos, text, cls = '') {
    const n = this.numbers[this._ni = (this._ni + 1) % MAX_NUMBERS];
    n.pos.copy(pos); n.life = 0.8; n.el.textContent = text; n.el.className = 'dmg-num ' + cls; n.el.style.display = 'block';
  }

  update(dt) {
    for (const t of this.tracers) {
      if (t.life <= 0) continue;
      t.life -= dt;
      if (t.life <= 0) t.mesh.visible = false; else t.mesh.material.opacity = 0.9 * t.life / t.max;
    }
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) { this.flash.visible = false; this.flashLight.intensity = 0; }
    }
    this._step(this.deb, dt, 9, 0.6);
    this._step(this.puf, dt, -0.15, 2.2);
    const w = innerWidth / 2, h = innerHeight / 2;
    for (const n of this.numbers) {
      if (n.life <= 0) continue;
      n.life -= dt;
      if (n.life <= 0) { n.el.style.display = 'none'; continue; }
      n.pos.y += dt * 0.9;
      this._v.copy(n.pos).project(this.camera);
      if (this._v.z > 1) { n.el.style.display = 'none'; continue; }
      n.el.style.display = 'block';
      n.el.style.transform = `translate(${(this._v.x * w + w).toFixed(1)}px, ${(-this._v.y * h + h).toFixed(1)}px) translate(-50%, -50%)`;
      n.el.style.opacity = Math.min(1, n.life / 0.3);
    }
  }
}
