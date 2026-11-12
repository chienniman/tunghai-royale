import * as THREE from 'three';
import { hash } from '../util.js';

const CELL = 0.75, RADIUS = 32, MAX = 9000;

// Grass tufts around the player. Positions come from a hash of the grid cell, so
// the same tuft is always in the same place; the instance buffer is simply
// refilled when the player has moved a few metres.
export class Grass {
  constructor(scene, terrain, classAt, colorAt) {
    this.terrain = terrain; this.classAt = classAt; this.colorAt = colorAt;
    // one tuft = five thin blades fanning out from the root, darker at the root and lighter at the tip
    const pos = [], col = [], nor = [];
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 + 0.3, c = Math.cos(a), s = Math.sin(a), w = 0.035, r = 0.05, lean = 0.2 + (i % 2) * 0.12;
      const bx = c * r, bz = s * r;
      pos.push(bx - s * w, 0, bz + c * w, bx + s * w, 0, bz - c * w, bx + c * lean, i % 2 ? 0.75 : 1, bz + s * lean);
      col.push(0.8, 0.82, 0.78, 0.8, 0.82, 0.78, 1.28, 1.34, 1.05);
      nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0); // lit like the ground it stands on
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 1 }), MAX);
    this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.receiveShadow = true;
    scene.add(this.mesh);
    this.cx = Infinity; this.cz = Infinity;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(); this._p = new THREE.Vector3();
    this._c = new THREE.Color(); this._up = new THREE.Vector3(0, 1, 0);
  }

  update(px, pz) {
    if (Math.hypot(px - this.cx, pz - this.cz) < 6) return;
    this.cx = px; this.cz = pz;
    const i0 = Math.floor((px - RADIUS) / CELL), i1 = Math.floor((px + RADIUS) / CELL);
    const j0 = Math.floor((pz - RADIUS) / CELL), j1 = Math.floor((pz + RADIUS) / CELL);
    let n = 0;
    for (let i = i0; i <= i1 && n < MAX; i++) {
      for (let j = j0; j <= j1 && n < MAX; j++) {
        const h = i * 73856093 ^ j * 19349663;
        const x = (i + hash(h)) * CELL, z = (j + hash(h + 1)) * CELL;
        const d = Math.hypot(x - px, z - pz);
        if (d > RADIUS) continue;
        const cls = this.classAt(x, z);
        // lawns and parks are lush, woodland floor and untagged campus ground are patchy, paving has none
        const p = cls >= 100 && cls < 170 ? 1 : cls >= 170 ? 0.3 : cls < 25 ? 0.45 : 0;
        if (p === 0 || hash(h + 2) > p) continue;
        const fade = 1 - THREE.MathUtils.smoothstep(d, RADIUS * 0.7, RADIUS); // shrink into the ground at the edge
        const sc = (0.8 + hash(h + 3) * 0.6) * fade;
        if (sc < 0.05) continue;
        this._q.setFromAxisAngle(this._up, hash(h + 4) * 6.283);
        this._m.compose(this._p.set(x, this.terrain.heightAt(x, z) - 0.02, z), this._q, this._s.set(sc, sc * (0.2 + hash(h + 5) * 0.2), sc));
        this.mesh.setMatrixAt(n, this._m);
        this.colorAt(x, z, this._c); this._c.multiplyScalar(0.92 + hash(h + 6) * 0.3);
        this.mesh.setColorAt(n, this._c);
        n++;
      }
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}
