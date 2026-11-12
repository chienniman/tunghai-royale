// Short-lived visuals: tracers, muzzle flash, impact puffs, bullet holes. Everything is pooled.
import * as THREE from 'three';

const _v = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3();
const Z_AXIS = new THREE.Vector3(0, 0, 1);

function canvasTexture(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const flashTexture = () => canvasTexture(128, (g, s) => {
  const h = s / 2;
  const rad = g.createRadialGradient(h, h, 0, h, h, h);
  rad.addColorStop(0, 'rgba(255,250,225,1)'); rad.addColorStop(0.22, 'rgba(255,205,110,.9)');
  rad.addColorStop(0.55, 'rgba(255,120,30,.3)'); rad.addColorStop(1, 'rgba(255,90,0,0)');
  g.fillStyle = rad; g.fillRect(0, 0, s, s);
  g.translate(h, h); g.fillStyle = 'rgba(255,235,170,.85)';
  for (let i = 0; i < 5; i++) {             // spikes
    g.rotate(Math.PI * 2 / 5 + 0.3 * i);
    g.beginPath(); g.moveTo(-5, 0); g.lineTo(0, -h * (0.7 + 0.3 * (i % 2))); g.lineTo(5, 0); g.closePath(); g.fill();
  }
});

const puffTexture = () => canvasTexture(64, (g, s) => {
  const h = s / 2, rad = g.createRadialGradient(h, h, 0, h, h, h);
  rad.addColorStop(0, 'rgba(255,255,255,1)'); rad.addColorStop(0.5, 'rgba(255,255,255,.55)'); rad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rad; g.fillRect(0, 0, s, s);
});

const holeTexture = () => canvasTexture(64, (g, s) => {
  const h = s / 2, rad = g.createRadialGradient(h, h, 0, h, h, h);
  rad.addColorStop(0, 'rgba(8,8,8,1)'); rad.addColorStop(0.28, 'rgba(14,13,12,.95)');
  rad.addColorStop(0.5, 'rgba(40,36,32,.5)'); rad.addColorStop(1, 'rgba(60,55,50,0)');
  g.fillStyle = rad; g.fillRect(0, 0, s, s);
});

const PUFF = {
  ground: { color: 0x8a7556, n: 4, size: 0.9, life: 0.7, speed: 1.6, add: false },
  wall: { color: 0xb9b4aa, n: 4, size: 0.7, life: 0.55, speed: 1.8, add: false },
  roof: { color: 0x9b9a96, n: 3, size: 0.6, life: 0.5, speed: 1.6, add: false },
  tree: { color: 0x6a5238, n: 3, size: 0.5, life: 0.45, speed: 1.5, add: false },
  target: { color: 0xffc46a, n: 4, size: 0.22, life: 0.22, speed: 4.5, add: true },
};

export class Effects {
  constructor(scene) {
    this.scene = scene;

    // --- tracers: a short bright streak that travels along the bullet path
    const tGeo = new THREE.BoxGeometry(1, 1, 1).translate(0, 0, 0.5);
    this.tracers = [];
    for (let i = 0; i < 28; i++) {
      const m = new THREE.Mesh(tGeo, new THREE.MeshBasicMaterial({ color: 0xffdf9a, transparent: true, opacity: 0.9,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      m.visible = false; m.frustumCulled = false; scene.add(m);
      this.tracers.push({ mesh: m, on: false, from: new THREE.Vector3(), dir: new THREE.Vector3(), dist: 0, head: 0 });
    }

    // --- muzzle flash
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false }));
    this.flash.visible = false; scene.add(this.flash);
    this.flashLight = new THREE.PointLight(0xffb060, 0, 9, 2);   // always in the scene so shaders never recompile
    scene.add(this.flashLight);
    this.flashT = 0;

    // --- impact puffs
    const puffMap = puffTexture();
    this.puffs = [];
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffMap, transparent: true, depthWrite: false }));
      s.visible = false; scene.add(s);
      this.puffs.push({ sprite: s, on: false, vel: new THREE.Vector3(), life: 0, max: 1, size: 1, grow: 1 });
    }
    this.puffI = 0;

    // --- bullet holes (ring buffer)
    this.holeCap = 160; this.holeI = 0;
    this.holes = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.13, 0.13),
      new THREE.MeshBasicMaterial({ map: holeTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
      this.holeCap);
    this.holes.count = 0; this.holes.frustumCulled = false; scene.add(this.holes);
  }

  tracer(from, to) {
    const t = this.tracers.find((x) => !x.on); if (!t) return;
    t.from.copy(from); t.dir.subVectors(to, from); t.dist = t.dir.length();
    if (t.dist < 1.5) return;
    t.dir.divideScalar(t.dist); t.head = 2; t.on = true;
  }

  muzzle(pos, dir, big = 1) {
    this.flash.position.copy(pos).addScaledVector(dir, 0.12);
    const s = (0.34 + Math.random() * 0.2) * big;
    this.flash.scale.set(s, s, 1);
    this.flash.material.rotation = Math.random() * Math.PI * 2;
    this.flash.visible = true;
    this.flashLight.position.copy(pos).addScaledVector(dir, 0.3);
    this.flashLight.intensity = 14 * big;
    this.flashT = 0.05;
  }

  impact(x, y, z, nx, ny, nz, kind) {
    const k = PUFF[kind] || PUFF.wall;
    for (let i = 0; i < k.n; i++) {
      const p = this.puffs[this.puffI]; this.puffI = (this.puffI + 1) % this.puffs.length;
      p.on = true; p.life = p.max = k.life * (0.7 + Math.random() * 0.6);
      p.size = k.size * (0.14 + Math.random() * 0.1); p.grow = k.size;
      p.vel.set(nx + (Math.random() - 0.5) * 1.1, ny + (Math.random() - 0.5) * 1.1 + (k.add ? 0 : 0.5), nz + (Math.random() - 0.5) * 1.1)
        .multiplyScalar(k.speed * (0.5 + Math.random() * 0.7));
      p.gravity = k.add ? 9 : 1.2; p.fade = k.add ? 1 : 0.5;
      const m = p.sprite.material;
      m.color.set(k.color); m.blending = k.add ? THREE.AdditiveBlending : THREE.NormalBlending; m.opacity = p.fade;
      m.rotation = Math.random() * 6.28;
      p.sprite.position.set(x + nx * 0.05, y + ny * 0.05, z + nz * 0.05);
      p.sprite.scale.set(p.size, p.size, 1);
      p.sprite.visible = true;
    }
  }

  hole(x, y, z, nx, ny, nz) {
    _v.set(nx, ny, nz);
    _q.setFromUnitVectors(Z_AXIS, _v).multiply(_q2.setFromAxisAngle(Z_AXIS, Math.random() * 6.28));
    const s = 0.8 + Math.random() * 0.5;
    _m.compose(_a.set(x + nx * 0.012, y + ny * 0.012, z + nz * 0.012), _q, _s.set(s, s, s));
    this.holes.setMatrixAt(this.holeI, _m);
    this.holeI = (this.holeI + 1) % this.holeCap;
    this.holes.count = Math.min(this.holeCap, this.holes.count + 1);
    this.holes.instanceMatrix.needsUpdate = true;
  }

  update(dt, camera) {
    // tracers
    const SPEED = 520, LEN = 14;
    for (const t of this.tracers) {
      if (!t.on) continue;
      const tail = Math.max(0, t.head - LEN), head = Math.min(t.dist, t.head);
      if (tail >= t.dist) { t.on = false; t.mesh.visible = false; continue; }
      _a.copy(t.from).addScaledVector(t.dir, tail);
      _b.copy(t.from).addScaledVector(t.dir, head);
      const w = Math.max(0.018, _a.distanceTo(camera.position) * 0.0011);
      t.mesh.position.copy(_a); t.mesh.lookAt(_b); t.mesh.scale.set(w, w, Math.max(0.01, head - tail));
      t.mesh.visible = true;
      t.head += SPEED * dt;
    }
    // muzzle flash
    if (this.flashT > 0) {
      this.flashT -= dt;
      if (this.flashT <= 0) { this.flash.visible = false; this.flashLight.intensity = 0; }
    }
    // puffs
    for (const p of this.puffs) {
      if (!p.on) continue;
      p.life -= dt;
      if (p.life <= 0) { p.on = false; p.sprite.visible = false; continue; }
      const k = 1 - p.life / p.max;
      p.vel.y -= p.gravity * dt; p.vel.multiplyScalar(Math.exp(-3 * dt));
      p.sprite.position.addScaledVector(p.vel, dt);
      const s = p.size + (p.grow - p.size) * Math.sqrt(k);
      p.sprite.scale.set(s, s, 1);
      p.sprite.material.opacity = p.fade * (1 - k) * (1 - k * 0.3);
    }
  }
}
