import * as THREE from 'three';
import { mulberry32, hash } from './util.js';

const BANSHEE_HP = 90, WISP_HP = 30, BANSHEE_DMG = 24, WISP_DMG = 7;
const MAX_BANSHEE = 4, MAX_WISP = 6;
const uTime = { value: 0 };
const smooth = THREE.MathUtils.smoothstep, lerp = THREE.MathUtils.lerp;

// Cloth / hair flutter in the vertex shader. `weight` is a GLSL expression of `position`.
function sway(mat, weight, amp) {
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
function robe(profile, segs, { fadeTo, ragged, blood, flat = 1 }) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs);
  const p = g.attributes.position, col = new Float32Array(p.count * 4);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const a = Math.atan2(x, z), k = Math.round(a * 20);
    if (y < ragged) { const h = hash(k * 31 + 7); y += h * 0.2 - 0.04; x *= 0.9 + h * 0.25; z *= 0.9 + h * 0.25; }
    p.setXYZ(i, x, y, z * flat);
    const fold = 0.86 + 0.14 * Math.sin(a * 7 + y * 3);
    let r = fold, gr = fold, b = fold * 1.02;
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
function white(g) {
  const n = g.attributes.position.count, c = new Float32Array(n * 4).fill(1);
  g.setAttribute('color', new THREE.BufferAttribute(c, 4));
  return g;
}

// 女鬼: white burial dress that dissolves into mist, long black hair over a pale face, clawed hands.
function makeBanshee() {
  const root = new THREE.Group(), mats = [];
  const M = (m, base = 1) => { m.transparent = true; m.userData.base = base; mats.push(m); return m; };
  const cloth = M(sway(new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1, color: 0xf3f5f9, emissive: 0x8ea6c8, emissiveIntensity: 0.32 }), '1.6 - position.y', 0.05));
  const skin = M(new THREE.MeshStandardMaterial({ color: 0xd9e1e6, roughness: 0.8, emissive: 0x5a6878, emissiveIntensity: 0.45 }));
  const hairM = M(sway(new THREE.MeshStandardMaterial({ color: 0x020203, roughness: 0.95, side: THREE.DoubleSide }), '-position.y', 0.07));
  const blood = M(new THREE.MeshBasicMaterial({ color: 0x5a0606 }));
  const dark = M(new THREE.MeshBasicMaterial({ color: 0x000000 }));
  const glow = M(new THREE.MeshBasicMaterial({ color: 0xff2a1a, fog: false }));

  const dress = new THREE.Mesh(robe([[0.52, 0], [0.45, 0.2], [0.36, 0.48], [0.27, 0.78], [0.19, 1.02], [0.17, 1.13], [0.2, 1.28], [0.21, 1.38], [0.15, 1.47], [0.07, 1.54]], 28,
    { fadeTo: [0.02, 0.62], ragged: 0.25, blood: true, flat: 0.72 }), cloth);
  root.add(dress);

  const arms = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(s * 0.19, 1.4, -0.02); root.add(arm);
    const sleeve = new THREE.Mesh(white(new THREE.CylinderGeometry(0.055, 0.15, 0.5, 16, 4, true).translate(0, -0.25, 0)), cloth); arm.add(sleeve);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.02, 0.3, 8).translate(0, -0.52, 0), skin); arm.add(fore);
    const palm = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6).scale(1, 1.3, 0.6), skin); palm.position.y = -0.69; arm.add(palm);
    for (let f = 0; f < 4; f++) { // long fingers, splayed
      const fg = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.15, 5).translate(0, -0.075, 0), skin);
      fg.position.set((f - 1.5) * 0.016, -0.71, 0); fg.rotation.set(-0.25, 0, (f - 1.5) * 0.16); arm.add(fg);
    }
    arm.userData.side = s; arms.push(arm);
  }

  const head = new THREE.Group(); head.position.set(0, 1.64, 0); root.add(head);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.115, 18, 14).scale(0.88, 1.15, 0.98), skin));
  for (const s of [-1, 1]) {
    const socket = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10).scale(1, 1.35, 0.5), dark); socket.position.set(s * 0.043, 0.016, -0.094); head.add(socket);
    const tear = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.075, 0.004), blood); tear.position.set(s * 0.046, -0.055, -0.103); tear.rotation.z = s * 0.06; head.add(tear); // blood running from the eyes
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), glow); pupil.position.set(s * 0.043, 0.012, -0.112); head.add(pupil);
  }
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 10), dark); mouth.position.set(0, -0.066, -0.09); mouth.scale.set(1, 0.4, 0.5); head.add(mouth);
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.124, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6).rotateX(0.8).scale(0.94, 1.14, 1.06).translate(0, 0.012, 0.006), hairM)); // tipped back: hairline above the brow
  // curtain of hair down the back and sides, strands across the face
  head.add(new THREE.Mesh(new THREE.LatheGeometry([[0.112, 0.07], [0.128, -0.1], [0.142, -0.36], [0.15, -0.62], [0.12, -0.9]].map(([r, y]) => new THREE.Vector2(r, y)), 16, -2.3, 4.6), hairM));
  for (const [x, len, rz] of [[-0.092, 0.5, 0.03], [-0.07, 0.36, 0.06], [0.064, 0.3, -0.05], [0.09, 0.52, -0.02], [0.012, 0.13, 0.5]]) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.024, len, 0.006, 1, 6, 1).translate(0, -len / 2, 0), hairM);
    st.position.set(x, 0.105, -0.112); st.rotation.z = rz; head.add(st);
  }

  const halo = new THREE.Sprite(M(new THREE.SpriteMaterial({ map: softDot(), color: 0x9fc4ff, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }), 0.2));
  halo.scale.setScalar(2.8); halo.position.y = 1.0; root.add(halo);
  return { root, mats, arms, head, mouth, cloth, skin };
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

// Night-time enemies. They ignore walls (they are ghosts), fade in out of the dark,
// and are swept away at dawn.
export class Ghosts {
  constructor(scene, terrain, world, loot, fx, audio) {
    this.scene = scene; this.terrain = terrain; this.world = world; this.loot = loot; this.fx = fx; this.audio = audio;
    this.rng = mulberry32(666);
    this.list = [];
    for (let i = 0; i < MAX_BANSHEE; i++) this._make('banshee');
    for (let i = 0; i < MAX_WISP; i++) this._make('wisp');
    // one shared light that follows the nearest ghost, so they cast an eerie glow on the ground
    this.light = new THREE.PointLight(0x9fc4ff, 0, 10, 1.8); scene.add(this.light);
    this.stats = { ghosts: 0 };
    this.spawnT = { banshee: 6, wisp: 3 };
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
      state: 'idle', t: 0, opacity: 0, seed: this.rng() * 100, lookT: 0, flash: 0, stalkFor: 0, biteCd: 0,
    });
  }

  get activeCount() { return this.list.filter((g) => g.active).length; }

  _spawn(kind, player, ambush) {
    const g = this.list.find((q) => q.kind === kind && !q.active);
    if (!g) return null;
    for (let tries = 0; tries < 12; tries++) {
      // mostly from behind or the sides, where the torch is not pointing
      const back = this.rng() < 0.7;
      const a = player.yaw + (back ? Math.PI + (this.rng() - 0.5) * 2.4 : (this.rng() - 0.5) * 1.6);
      const d = ambush ? 9 + this.rng() * 4 : kind === 'banshee' ? 24 + this.rng() * 14 : 16 + this.rng() * 14;
      const x = player.pos.x - Math.sin(a) * d, z = player.pos.z - Math.cos(a) * d;
      if (!this.terrain.inBounds(x, z, 8)) continue;
      g.x = x; g.z = z; g.y = this.terrain.heightAt(x, z);
      g.active = true; g.alive = true; g.hp = g.maxHp; g.opacity = 0; g.t = 0; g.lookT = 0; g.flash = 0; g.biteCd = 0.8;
      g.state = ambush ? 'windup' : 'stalk'; g.stalkFor = 6 + this.rng() * 8;
      g.yaw = Math.atan2(-(player.pos.x - x), -(player.pos.z - z));
      g.rig.root.visible = true; g.rig.root.scale.setScalar(1);
      if (ambush) this.audio?.scream();
      else if (kind === 'wisp' && this.rng() < 0.5) this.audio?.wisp();
      return g;
    }
    return null;
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
          const b = fx * dx + fz * dz, c = fx * fx + fz * fz - 0.34 * 0.34, disc = b * b - a * c;
          if (disc >= 0) { const t0 = (-b - Math.sqrt(disc)) / a, y = oy + dy * t0 - g.y; if (t0 >= 0 && y >= 0.25 && y <= 1.52) t = t0; }
        }
        const th = sphere(1.66, 0.2);
        if (th >= 0 && (t < 0 || th < t)) { t = th; zone = 'head'; }
      }
      if (t >= 0 && t < bt) { bt = t; best = { t, target: g, zone }; }
    }
    return best;
  }

  damage(g, amount, dist = 0) {
    if (!g.alive) return false;
    g.hp -= amount; g.flash = 1;
    if (g.kind === 'banshee' && g.state === 'stalk') { g.state = 'windup'; g.t = 0; this.audio?.scream(); } // shooting it makes it angry
    if (g.hp > 0) return false;
    g.hp = 0; g.alive = false; g.state = 'die'; g.t = 0;
    this.stats.ghosts++;
    this._v.set(g.x, g.y + (g.kind === 'banshee' ? 1.2 : 0.45), g.z);
    this.fx.impact(this._v, this._n.set(0, 1, 0), 'ghost', 26);
    for (let i = 0; i < 3; i++) this.fx.puff(this._v, this._n, 'mist');
    if (this.rng() < (g.kind === 'banshee' ? 0.6 : 0.25)) {
      const id = ['chickenfeet', 'icecream', 'friedchicken', 'guabao'][Math.floor(this.rng() * (g.kind === 'banshee' ? 4 : 2))];
      this.loot.scatter([{ id, n: 1 }], g.x, g.z, 0.3);
    }
    if (this.scaring === g) this.scaring = null;
    this.onKill?.(g, dist);
    return true;
  }

  // sky: { night (0..1), hour } · cam: { pos, look }
  update(dt, player, cam, sky) {
    uTime.value += dt;
    const night = sky.night, dark = night > 0.6 && !player.dead;
    // how far into the night we are: more of them as it gets later (peaks around 01:00)
    const depth = dark ? 1 - Math.min(1, Math.abs(((sky.hour + 6) % 24) - 7) / 6) : 0;
    if (dark) {
      const wantB = 1 + Math.round(depth * (MAX_BANSHEE - 1)), wantW = 2 + Math.round(depth * (MAX_WISP - 2));
      const count = (k) => this.list.filter((g) => g.kind === k && g.active).length;
      if ((this.spawnT.banshee -= dt) <= 0) { this.spawnT.banshee = 7 + this.rng() * 6; if (count('banshee') < wantB) this._spawn('banshee', player, this.rng() < 0.3); }
      if ((this.spawnT.wisp -= dt) <= 0) { this.spawnT.wisp = 3.5 + this.rng() * 4; if (count('wisp') < wantW) this._spawn('wisp', player, false); }
    } else if (this.activeCount) this.banish();

    let nearest = null, nd = Infinity;
    for (const g of this.list) {
      if (!g.active) continue;
      g.t += dt; g.flash = Math.max(0, g.flash - dt * 5);
      const dx = player.pos.x - g.x, dz = player.pos.z - g.z, dist = Math.hypot(dx, dz);
      const want = Math.atan2(-dx, -dz);
      const turn = (rate) => { let d = want - g.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); g.yaw += d * (1 - Math.exp(-rate * dt)); };
      const step = (speed) => { g.x -= Math.sin(g.yaw) * speed * dt; g.z -= Math.cos(g.yaw) * speed * dt; };
      let targetOpacity = 1, hover = 0.22 + Math.sin(uTime.value * 1.7 + g.seed) * 0.08, reach = 0.3, mouth = 0.4, tilt = 0.28;

      if (g.kind === 'banshee') this._banshee(g, dt, player, cam, dist, turn, step);
      else this._wisp(g, dt, player, dist, turn, step);

      const rig = g.rig;
      switch (g.state) {
        case 'stalk': // half there, flickering
          targetOpacity = (g.kind === 'banshee' ? 0.5 : 0.85) + 0.25 * Math.sin(uTime.value * 9 + g.seed) * (hash(Math.floor(uTime.value * 6) + (g.seed | 0)) > 0.6 ? 1 : 0.2);
          break;
        case 'windup': reach = lerp(0.3, 1.25, Math.min(1, g.t / 0.5)); mouth = lerp(0.4, 2.6, Math.min(1, g.t / 0.35)); tilt = 0; break;
        case 'rush': reach = 1.45; mouth = 2.8; tilt = 0; hover = 0.1; break;
        case 'scare': reach = 1.5; mouth = 3; tilt = Math.sin(g.t * 60) * 0.12; break;
        case 'vanish': targetOpacity = 0; break;
        case 'die': targetOpacity = 0; rig.root.scale.setScalar(1 + g.t * 1.6); break;
      }
      g.opacity += (targetOpacity - g.opacity) * (1 - Math.exp(-(g.state === 'vanish' || g.state === 'die' ? 7 : 3) * dt));
      if ((g.state === 'vanish' || g.state === 'die') && g.opacity < 0.03) { g.active = false; rig.root.visible = false; if (this.scaring === g) this.scaring = null; continue; }
      if (dist > 95 && g.state === 'stalk') { g.state = 'vanish'; g.alive = false; }

      for (const m of rig.mats) m.opacity = m.userData.base * g.opacity;
      rig.cloth.emissiveIntensity = (g.kind === 'banshee' ? 0.32 : 0.9) + g.flash * 2.5;
      if (rig.skin) rig.skin.emissiveIntensity = g.state === 'scare' ? 2.2 : g.state === 'rush' ? 1.0 : 0.45; // the face lights up as it lunges
      if (g.state !== 'scare') {
        g.y = this.terrain.heightAt(g.x, g.z);
        rig.root.position.set(g.x, g.y + hover, g.z);
        rig.root.rotation.set(g.state === 'rush' ? -0.35 : 0, g.yaw, 0);
      }
      if (g.kind === 'banshee') {
        for (const a of rig.arms) a.rotation.set(reach + Math.sin(uTime.value * 3 + a.userData.side) * 0.06, 0, -a.userData.side * (0.1 + 0.12 * reach));
        rig.mouth.scale.y += (mouth - rig.mouth.scale.y) * (1 - Math.exp(-18 * dt));
        // head lolls to one side while stalking, with the odd twitch
        const twitch = hash(Math.floor(uTime.value * 3) + (g.seed | 0)) > 0.86 ? 0.5 : 0;
        rig.head.rotation.z += (tilt + twitch - rig.head.rotation.z) * (1 - Math.exp(-14 * dt));
        rig.head.rotation.x = g.state === 'stalk' ? 0.3 : -0.15;
      } else rig.mouth.scale.y = 1.3 + Math.sin(uTime.value * 4 + g.seed) * 0.4;
      if (dist < nd && g.opacity > 0.2) { nd = dist; nearest = g; }
    }
    if (nearest) { this.light.position.set(nearest.x, nearest.y + 1.1, nearest.z); this.light.intensity = 3.2 * nearest.opacity; }
    else this.light.intensity = 0;
  }

  _banshee(g, dt, player, cam, dist, turn, step) {
    switch (g.state) {
      case 'stalk': {
        turn(2);
        // drift closer in a slow weave
        g.yaw += Math.sin(uTime.value * 0.9 + g.seed) * 0.5 * dt;
        step(dist > 15 ? 1.9 : 0.6);
        // being stared at provokes it
        this._v.set(g.x - cam.pos.x, g.y + 1.3 - cam.pos.y, g.z - cam.pos.z).normalize();
        g.lookT = this._v.dot(cam.look) > 0.965 && dist < 30 ? g.lookT + dt : Math.max(0, g.lookT - dt * 0.5);
        if (dist < 12.5 || g.t > g.stalkFor || g.lookT > 1.1) { g.state = 'windup'; g.t = 0; this.audio?.scream(); }
        break;
      }
      case 'windup': turn(10); if (g.t > 0.65) { g.state = 'rush'; g.t = 0; } break;
      case 'rush':
        turn(5); step(12.5);
        if (dist < 1.25) {
          g.state = 'scare'; g.t = 0; this.scaring = g;
          player.damage(BANSHEE_DMG, { raw: true, x: g.x, z: g.z, source: g.name });
          this.onScare?.(g);
        } else if (g.t > 2.6) { g.state = 'vanish'; g.t = 0; g.alive = false; }
        break;
      case 'scare': { // right in the camera's face
        const r = g.rig.root, k = 0.5 + Math.sin(g.t * 47) * 0.02;
        r.position.set(cam.pos.x + cam.look.x * k + Math.sin(g.t * 71) * 0.025, cam.pos.y + cam.look.y * k - 1.66 * 1.2 + 0.03 + Math.sin(g.t * 53) * 0.02, cam.pos.z + cam.look.z * k);
        r.rotation.set(0, Math.atan2(cam.look.x, cam.look.z), 0); r.scale.setScalar(1.2);
        g.x = r.position.x; g.z = r.position.z; g.y = r.position.y;
        if (g.t > 0.7) { g.state = 'vanish'; g.t = 0; g.alive = false; this.scaring = null; }
        break;
      }
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
