// Ways out of the campus. Gates are found where real roads cross the campus boundary, so they sit
// where the real gates are. A gate can be sealed or open; walking through an open one ends the night.
import * as THREE from 'three';
import { Colliders } from '../world/colliders.js';

const RANK = { primary: 5, secondary: 5, tertiary: 4, tertiary_link: 3, residential: 3, unclassified: 3, pedestrian: 3, living_street: 2, service: 2 };
const HALF = { primary: 6.5, secondary: 5.5, tertiary: 4.5, tertiary_link: 3.5, residential: 3.25, unclassified: 3, pedestrian: 4.5, living_street: 2.5, service: 2.25 };

function glowTexture() {
  const S = 64, c = document.createElement('canvas'); c.width = 16; c.height = S;
  const g = c.getContext('2d'), grad = g.createLinearGradient(0, 0, 0, S);
  grad.addColorStop(0, 'rgba(255,255,255,0)'); grad.addColorStop(0.75, 'rgba(255,255,255,.55)'); grad.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = grad; g.fillRect(0, 0, 16, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function haloTexture() {
  const S = 64, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), h = S / 2, rad = g.createRadialGradient(h, h, 0, h, h, h);
  rad.addColorStop(0, 'rgba(255,255,255,1)'); rad.addColorStop(0.2, 'rgba(255,255,255,.6)'); rad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = rad; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Exits {
  constructor(scene, terrain, world, max = 4) {
    this.terrain = terrain; this.world = world;
    this.gates = [];
    this.onExtract = null;            // (gate) => void
    this.group = new THREE.Group(); scene.add(this.group);
    this._find(max);
    this._build();
  }

  // Road segments that cross the campus outline, best roads first, kept apart from each other.
  _find(max) {
    const map = this.world.map, camp = map.campus; if (!camp) return;
    const inside = (x, z) => Colliders.pointInPoly(camp, x, z);
    const cands = [];
    for (const r of map.roads) {
      const rank = RANK[r.t]; if (!rank) continue;
      const p = r.p;
      for (let i = 0; i + 3 < p.length; i += 2) {
        const a = inside(p[i], p[i + 1]), b = inside(p[i + 2], p[i + 3]);
        if (a === b) continue;
        // walk the segment to the point where it leaves the campus
        let t0 = 0, t1 = 1;
        for (let k = 0; k < 12; k++) { const m = (t0 + t1) / 2; if (inside(p[i] + (p[i + 2] - p[i]) * m, p[i + 1] + (p[i + 3] - p[i + 1]) * m) === a) t0 = m; else t1 = m; }
        const x = p[i] + (p[i + 2] - p[i]) * t0, z = p[i + 1] + (p[i + 3] - p[i + 1]) * t0;
        if (!this.terrain.inBounds(x, z, 25)) continue;
        let dx = p[i + 2] - p[i], dz = p[i + 3] - p[i + 1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        if (!a) { dx = -dx; dz = -dz; }                       // (dx, dz) points out of the campus
        cands.push({ x, z, dx, dz, rank, road: r.n || '', half: HALF[r.t] });
      }
    }
    cands.sort((a, b) => b.rank - a.rank);
    for (const c of cands) {
      if (this.gates.length >= max) break;
      if (this.gates.some((g) => Math.hypot(g.x - c.x, g.z - c.z) < 320)) continue;
      // step back inside a little so the gate stands on campus ground
      const x = c.x - c.dx * 6, z = c.z - c.dz * 6;
      this.gates.push({ ...c, x, z, y: this.terrain.heightAt(x, z), open: false, name: c.road ? `${c.road}校門` : '側門', id: this.gates.length });
    }
  }

  _build() {
    const stone = new THREE.MeshStandardMaterial({ color: 0x6f6a62, roughness: 0.9 });
    const beamTex = glowTexture(), haloTex = haloTexture();
    for (const g of this.gates) {
      const grp = new THREE.Group(); grp.position.set(g.x, g.y, g.z);
      grp.rotation.y = Math.atan2(g.dx, g.dz);            // local +z points out of the campus
      const w = g.half + 0.9;
      for (const sx of [-1, 1]) {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 3.4, 0.9), stone); pillar.position.set(sx * w, 1.7, 0);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 1.15), stone); cap.position.set(sx * w, 3.5, 0);
        pillar.castShadow = cap.castShadow = true;
        grp.add(pillar, cap);
        this.world.colliders.addCircle(g.x + Math.cos(grp.rotation.y) * sx * w, g.z - Math.sin(grp.rotation.y) * sx * w, 0.6, g.y + 3.6);
      }
      // lanterns on the pillars: red while sealed, warm white when the way is open
      g.lamps = [-1, 1].map((sx) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff2a1a }));
        m.position.set(sx * w, 3.85, 0); grp.add(m); return m;
      });
      // glow sprites instead of real lights: every extra light costs every pixel on screen
      g.glows = [-1, 1].map((sx) => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex, color: 0xff2a1a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
        s.position.set(sx * w, 3.85, 0); s.scale.set(3.4, 3.4, 1); grp.add(s); return s;
      });
      // a tall faint column of light so an open gate can be found from far away
      const beam = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 90),
        new THREE.MeshBasicMaterial({ map: beamTex, color: 0xfff0c8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
      beam.position.set(0, 45, 0); grp.add(beam);
      const beam2 = beam.clone(); beam2.rotation.y = Math.PI / 2; grp.add(beam2);
      g.beams = [beam, beam2];
      g.group = grp;
      this.group.add(grp);
    }
  }

  setOpen(gate, open) {
    gate.open = open;
    const col = open ? 0xffe2a8 : 0xff2a1a;
    for (const m of gate.lamps) m.material.color.setHex(col);
    for (const s of gate.glows) s.material.color.setHex(col);
    for (const b of gate.beams) b.material.opacity = open ? 0.16 : 0;
  }
  openAll() { for (const g of this.gates) this.setOpen(g, true); }
  sealAll() { for (const g of this.gates) this.setOpen(g, false); }

  nearest(pos, onlyOpen = false) {
    let best = null, bd = Infinity;
    for (const g of this.gates) {
      if (onlyOpen && !g.open) continue;
      const d = Math.hypot(g.x - pos.x, g.z - pos.z);
      if (d < bd) { bd = d; best = g; }
    }
    return best ? { gate: best, dist: bd } : null;
  }

  // Returns the gate the player is standing in, if any (open or not), and fires onExtract for an open one.
  update(dt, player) {
    let at = null;
    for (const g of this.gates) {
      const rx = player.pos.x - g.x, rz = player.pos.z - g.z;
      const along = rx * g.dx + rz * g.dz, across = Math.abs(-rx * g.dz + rz * g.dx);
      if (Math.abs(along) < 3 && across < g.half + 0.9) { at = g; break; }
    }
    if (at && at.open && player.alive) this.onExtract?.(at);
    return at;
  }
}
