import * as THREE from 'three';
import { mulberry32, openRing, signedArea } from '../util.js';
import { boxes, material } from '../models.js';

// Things in the world you can walk up to and use (E): story fragments, shrines,
// lamp switches, boxes to search, notice boards, benches, the chapel bell and the
// bridge. This file only knows what they look like and where they stand; what
// happens when you use one is decided in quest.js.

const WOOD = 0x6b4a2e, STONE = 0x8d8a82, RED = 0x8a2a22, DARK = 0x24262a, PAPER = 0xe9e2cc, GREEN = 0x2f5a3c;

const GEO = {};
const geo = (k, make) => GEO[k] || (GEO[k] = make());
const G = {
  fragment: () => boxes([{ s: [0.3, 0.012, 0.22], p: [0, 0.2, 0], c: PAPER }, { s: [0.22, 0.014, 0.012], p: [0, 0.2, -0.05], c: 0x8a8068 }, { s: [0.16, 0.014, 0.012], p: [-0.03, 0.2, 0.0], c: 0x8a8068 }]),
  shrine: () => boxes([
    { s: [1.3, 0.35, 1.1], p: [0, 0.175, 0], c: STONE }, { s: [1.0, 0.8, 0.8], p: [0, 0.75, 0.05], c: 0x9a8f80 },
    { s: [0.6, 0.55, 0.06], p: [0, 0.7, -0.36], c: 0x1a1512 },                                        // dark niche
    { s: [0.16, 0.26, 0.1], p: [0, 0.6, -0.3], c: 0xc9a43a },                                         // the little gold figure inside
    { s: [1.5, 0.12, 1.25], p: [0, 1.21, 0], c: RED }, { s: [1.2, 0.14, 1.0], p: [0, 1.33, 0], c: 0x6e201a }, { s: [0.7, 0.12, 0.6], p: [0, 1.45, 0], c: RED },
    { s: [0.08, 0.5, 0.08], p: [-0.46, 0.95, -0.36], c: RED }, { s: [0.08, 0.5, 0.08], p: [0.46, 0.95, -0.36], c: RED },
    { s: [0.7, 0.3, 0.4], p: [0, 0.15, -0.85], c: STONE }, { cyl: [0.13, 0.16], p: [0, 0.38, -0.85], c: 0x6b5a3a, r: Math.PI / 2 },   // offering table + incense pot
    { s: [0.01, 0.22, 0.01], p: [-0.03, 0.57, -0.85], c: 0xb5322b }, { s: [0.01, 0.2, 0.01], p: [0.02, 0.56, -0.84], c: 0xb5322b }, { s: [0.01, 0.23, 0.01], p: [0.05, 0.57, -0.87], c: 0xb5322b },
  ]),
  lamp: () => boxes([
    { cyl: [0.06, 4.2, 0.09], p: [0, 2.1, 0], c: DARK, r: Math.PI / 2 }, { s: [0.06, 0.06, 0.9], p: [0, 4.15, -0.42], c: DARK },
    { s: [0.22, 0.34, 0.14], p: [0, 1.15, -0.1], c: 0x5b6068 }, { s: [0.05, 0.1, 0.03], p: [0, 1.15, -0.18], c: 0xc0392b },             // switch box
  ]),
  lampHead: () => new THREE.BoxGeometry(0.3, 0.1, 0.5).translate(0, 4.08, -0.75),
  crate: () => boxes([{ s: [0.62, 0.46, 0.5], p: [0, 0.23, 0], c: 0xa98a5c }, { s: [0.64, 0.05, 0.12], p: [0, 0.445, 0], c: 0xcdb98c }, { s: [0.12, 0.47, 0.52], p: [0, 0.23, 0], c: 0xcdb98c }]),
  locker: () => boxes([{ s: [0.5, 1.7, 0.45], p: [0, 0.85, 0], c: 0x6d7782 }, { s: [0.44, 0.76, 0.02], p: [0, 1.26, -0.23], c: 0x5b646e }, { s: [0.44, 0.76, 0.02], p: [0, 0.44, -0.23], c: 0x5b646e },
    { s: [0.03, 0.08, 0.03], p: [0.16, 1.2, -0.25], c: DARK }, { s: [0.03, 0.08, 0.03], p: [0.16, 0.42, -0.25], c: DARK }]),
  board: () => boxes([
    { s: [0.09, 1.9, 0.09], p: [-0.85, 0.95, 0], c: WOOD }, { s: [0.09, 1.9, 0.09], p: [0.85, 0.95, 0], c: WOOD }, { s: [1.9, 0.08, 0.3], p: [0, 1.94, 0], c: 0x4a3320 },
    { s: [1.62, 1.0, 0.06], p: [0, 1.32, 0], c: GREEN },
    { s: [0.3, 0.4, 0.01], p: [-0.5, 1.4, -0.04], c: PAPER }, { s: [0.34, 0.26, 0.01], p: [-0.05, 1.5, -0.04], c: 0xe2d9a8 }, { s: [0.26, 0.36, 0.01], p: [0.42, 1.36, -0.04], c: PAPER },
    { s: [0.36, 0.2, 0.01], p: [-0.1, 1.13, -0.04], c: 0xd9c9c0 }, { s: [0.2, 0.24, 0.01], p: [0.62, 1.62, -0.04], c: 0xc9d4c0 },
  ]),
  bench: () => boxes([
    { s: [1.6, 0.06, 0.42], p: [0, 0.44, 0], c: WOOD }, { s: [1.6, 0.34, 0.05], p: [0, 0.76, 0.2], c: WOOD },
    { s: [0.07, 0.44, 0.4], p: [-0.68, 0.22, 0], c: DARK }, { s: [0.07, 0.44, 0.4], p: [0.68, 0.22, 0], c: DARK },
    { s: [0.07, 0.5, 0.06], p: [-0.68, 0.7, 0.2], c: DARK }, { s: [0.07, 0.5, 0.06], p: [0.68, 0.7, 0.2], c: DARK },
  ]),
  bell: () => boxes([
    { s: [0.14, 2.3, 0.14], p: [-0.7, 1.15, 0], c: WOOD }, { s: [0.14, 2.3, 0.14], p: [0.7, 1.15, 0], c: WOOD }, { s: [1.8, 0.14, 0.2], p: [0, 2.3, 0], c: WOOD },
    { cyl: [0.14, 0.5, 0.34], p: [0, 1.75, 0], c: 0x8a6a2a, r: Math.PI / 2 }, { sph: [0.16], p: [0, 2.02, 0], c: 0x8a6a2a }, { s: [0.03, 0.5, 0.03], p: [0, 1.25, 0], c: 0x3a3020 },
  ]),
  bridge: () => boxes([   // a small offering of flowers left on the rail
    { cyl: [0.06, 0.24, 0.05], p: [0, 0.12, 0], c: 0x7c8fa0, r: Math.PI / 2 },
    { sph: [0.07], p: [0, 0.3, 0], c: 0xf2f0e6 }, { sph: [0.055], p: [0.07, 0.27, 0.03], c: 0xf2f0e6 }, { sph: [0.05], p: [-0.06, 0.28, -0.03], c: 0xe9d9a0 },
  ]),
};

const VERB = { fragment: '查看', bridge: '走上橋', shrine: '拜拜', lamp: '開燈', crate: '翻找', board: '看公告', bench: '坐下休息', bell: '敲鐘' };
const NAME = { shrine: '土地公廟', lamp: '路燈開關', crate: '紙箱', board: '公佈欄', bench: '長椅', bell: '教堂的鐘', bridge: '女鬼橋' };

export class Props {
  constructor(scene, terrain, world) {
    this.scene = scene; this.terrain = terrain; this.world = world;
    this.list = [];
    this.rng = mulberry32(2025);
    this.onMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0, fog: false });
    this.offMat = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.5 });
    // glow for story fragments (and the bridge once it is time)
    this.ringGeo = new THREE.RingGeometry(0.34, 0.42, 28).rotateX(-Math.PI / 2);
    this.beamGeo = new THREE.CylinderGeometry(0.02, 0.07, 7, 8, 1, true).translate(0, 3.5, 0);
    const c = document.createElement('canvas'); c.width = 4; c.height = 64;
    const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = gr; x.fillRect(0, 0, 4, 64);
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
    this.beamMat = new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.4, alphaMap: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    // two real lights shared by whichever lit lamps are nearest
    this.lights = [0, 1].map(() => { const l = new THREE.PointLight(0xffd9a0, 0, 16, 1.4); scene.add(l); return l; });
    this._t = 0;
  }

  // Nearest clear ground between minR and maxR of (x, z).
  spot(x, z, minR, maxR, a0 = this.rng() * 6.283) {
    for (let d = minR; d <= maxR; d += 1.5) for (let k = 0; k < 10; k++) {
      const a = a0 + k * 0.63, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (this.terrain.inBounds(px, pz, 8) && !this.world.colliders.blocked(px, this.terrain.heightAt(px, pz) + 0.5, pz)) return { x: px, z: pz };
    }
    return null;
  }

  add(kind, x, z, { yaw = this.rng() * 6.283, data = {}, solid = 0, variant = kind, r = 2.3 } = {}) {
    const y = this.terrain.heightAt(x, z);
    const obj = new THREE.Group(); obj.position.set(x, y, z); obj.rotation.y = yaw;
    const mesh = new THREE.Mesh(geo(variant, G[variant]), material()); mesh.castShadow = true; obj.add(mesh);
    const p = { kind, x, y, z, yaw, r, data, obj, used: false, hidden: false, label: data.label || NAME[kind] || '', verb: VERB[kind] };
    if (kind === 'lamp') { p.head = new THREE.Mesh(geo('lampHead', G.lampHead), this.offMat); obj.add(p.head); p.lit = 0; }
    if (kind === 'fragment' || kind === 'bridge') {
      p.ring = new THREE.Mesh(this.ringGeo, this.glowMat); p.ring.position.y = 0.04; obj.add(p.ring);
      p.beam = new THREE.Mesh(this.beamGeo, this.beamMat); obj.add(p.beam);
    }
    if (solid) this.world.colliders.addCircle(x, z, solid, y + 2);
    obj.visible = false; this.scene.add(obj);
    this.list.push(p);
    return p;
  }

  // Scatter the generic props around campus. Deterministic, like the loot.
  populate(map, spawn) {
    const rng = this.rng, inCampus = this.world.inCampus;
    const near = (x, z, d, kind) => this.list.some((p) => (!kind || p.kind === kind) && Math.hypot(p.x - x, p.z - z) < d);

    // boxes and lockers against building walls
    for (const b of map.buildings) {
      if (rng() > 0.2) continue;
      let p = openRing(b.p); if (p.length < 6) continue;
      if (signedArea(p) < 0) { const q = []; for (let i = p.length - 2; i >= 0; i -= 2) q.push(p[i], p[i + 1]); p = q; }
      const i = Math.floor(rng() * (p.length / 2)) * 2, j = (i + 2) % p.length;
      const ex = p[j] - p[i], ez = p[j + 1] - p[i + 1], len = Math.hypot(ex, ez); if (len < 3) continue;
      const t = 0.2 + rng() * 0.6, x = p[i] + ex * t + ez / len * 0.75, z = p[i + 1] + ez * t - ex / len * 0.75;
      if (!this.terrain.inBounds(x, z, 8) || this.world.colliders.blocked(x, this.terrain.heightAt(x, z) + 0.5, z) || near(x, z, 3)) continue;
      const locker = rng() < 0.35;
      // back to the wall, facing out (model front is -z)
      this.add('crate', x, z, { yaw: Math.atan2(-ez / len, ex / len), variant: locker ? 'locker' : 'crate', solid: 0.32, data: { label: locker ? '置物櫃' : '紙箱' } });
    }

    // lamps and benches along campus roads
    const roads = map.roads.filter((r) => r.p.length >= 4 && ['residential', 'service', 'footway', 'pedestrian', 'path', 'steps'].includes(r.t));
    let tries = 0, lamps = 0, benches = 0;
    while ((lamps < 40 || benches < 26) && tries++ < 6000) {
      const r = roads[Math.floor(rng() * roads.length)], i = Math.floor(rng() * (r.p.length / 2 - 1)) * 2;
      const dx = r.p[i + 2] - r.p[i], dz = r.p[i + 3] - r.p[i + 1], l = Math.hypot(dx, dz); if (l < 2) continue;
      const k = rng(), side = rng() < 0.5 ? 1 : -1;
      const bench = lamps >= 40 || (benches < 26 && rng() < 0.4), off = bench ? 2.6 : 2.2;
      const x = r.p[i] + dx * k + dz / l * side * off, z = r.p[i + 1] + dz * k - dx / l * side * off;
      if (!inCampus(x, z) || !this.terrain.inBounds(x, z, 8) || this.world.colliders.blocked(x, this.terrain.heightAt(x, z) + 0.5, z)) continue;
      if (near(x, z, 5) || near(x, z, bench ? 70 : 60, bench ? 'bench' : 'lamp')) continue;
      // face the road
      const yaw = Math.atan2(dz / l * side, dx / l * side) + Math.PI / 2;
      if (bench) { this.add('bench', x, z, { yaw: yaw + Math.PI, solid: 0 }); benches++; } else { this.add('lamp', x, z, { yaw, solid: 0.12 }); lamps++; }
    }

    // shrines and notice boards at fixed places around campus
    const fixed = [
      ['shrine', -300, -150], ['shrine', -880, -200], ['shrine', -150, 60], ['shrine', 120, -40], ['shrine', 470, -200], ['shrine', -620, -60], ['shrine', 620, 240],
      ['board', -126, -56], ['board', -391, -23], ['board', -108, 132], ['board', -186, -310], ['board', -740, -120],
    ];
    let board = 0;
    for (const [kind, fx, fz] of fixed) {
      const s = this.spot(fx, fz, 2, 30); if (!s) continue;
      this.add(kind, s.x, s.z, { yaw: Math.atan2(-(spawn.x - s.x), -(spawn.z - s.z)), solid: kind === 'shrine' ? 0.7 : 0.25, data: kind === 'board' ? { rumor: board++ } : {} });
    }
    // the bell stands beside the chapel, a few steps from where you start
    const bx = spawn.x + spawn.dx * 9 + spawn.dz * 9, bz = spawn.z + spawn.dz * 9 - spawn.dx * 9;
    const bs = this.spot(bx, bz, 0, 8); if (bs) this.add('bell', bs.x, bs.z, { yaw: Math.atan2(-(spawn.x - bs.x), -(spawn.z - bs.z)), solid: 0.3 });
    return { crates: this.list.filter((p) => p.kind === 'crate').length, lamps, benches };
  }

  // Closest usable prop within reach of the player, or null.
  nearest(px, pz) {
    let best = null, bd = Infinity;
    for (const p of this.list) {
      if (p.hidden || (p.used && p.kind !== 'lamp')) continue;
      const d = Math.hypot(p.x - px, p.z - pz);
      if (d < p.r && d < bd) { bd = d; best = p; }
    }
    return best;
  }

  // Places ghosts will not enter: lit lamps, and the ground around a shrine.
  safeZones() {
    const out = [];
    for (const p of this.list) {
      if (p.kind === 'lamp' && p.lit > 0) out.push({ x: p.x, z: p.z, r: 10 });
      else if (p.kind === 'shrine') out.push({ x: p.x, z: p.z, r: 6 });
    }
    return out;
  }

  light(p, seconds) { p.lit = seconds; p.head.material = this.onMat; }

  update(dt, px, pz, time) {
    let lit = [];
    for (const p of this.list) {
      if (p.kind === 'lamp' && p.lit > 0) {
        p.lit -= dt;
        if (p.lit <= 0) p.head.material = this.offMat;
        else { p._d = Math.hypot(p.x - px, p.z - pz); lit.push(p); if (p.lit < 5) p.head.material = Math.sin(time * 30) > 0 ? this.onMat : this.offMat; } // flickers before it dies
      }
      if (p.beam) { p.ring.rotation.y = time * 0.6; p.obj.children[0].position.y = Math.sin(time * 1.6 + p.x) * 0.04; }
    }
    lit.sort((a, b) => a._d - b._d);
    this.lights.forEach((l, i) => {
      const p = lit[i];
      if (p && p._d < 60) { l.intensity = p.lit < 5 && Math.sin(time * 30) < 0 ? 0 : 9; l.position.set(p.x - Math.sin(p.yaw) * 0.75, p.y + 3.9, p.z - Math.cos(p.yaw) * 0.75); }
      else l.intensity = 0;
    });
    if ((this._t -= dt) > 0) return;
    this._t = 0.35;
    for (const p of this.list) p.obj.visible = !p.hidden && Math.abs(p.x - px) < 150 && Math.abs(p.z - pz) < 150;
  }
}
