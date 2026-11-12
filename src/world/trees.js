import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../util.js';

// trees per square metre by class-map red value
function density(r, campus) {
  if (r >= 200) return 1 / 38;       // wood / forest (相思林 etc.)
  if (r >= 170) return 1 / 30;       // tree rows
  if (r >= 120) return 1 / 260;      // park / garden
  if (r >= 100) return 1 / 900;      // lawn
  if (r >= 60) return 1 / 1400;      // urban land use
  if (r >= 25) return 0;             // road, building, pitch, water, plaza
  return campus ? 1 / 140 : 1 / 650; // untagged ground: campus is heavily wooded
}

function crownGeometry(seed) {
  const rng = mulberry32(seed);
  let g = new THREE.IcosahedronGeometry(1, 1);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const k = 0.78 + rng() * 0.38;
    p.setXYZ(i, p.getX(i) * k, p.getY(i) * k * 0.85, p.getZ(i) * k);
  }
  g.computeVertexNormals();
  return g;
}

export function plantTrees(terrain, ground, colliders, chunkSize = 220) {
  const rng = mulberry32(2024);
  const { classData, classScale } = ground;
  const cw = classData.width, ch = classData.height, data = classData.data;
  const chunks = new Map();
  const cell = 3;
  for (let z = terrain.minZ + 2; z < terrain.maxZ - 2; z += cell) {
    for (let x = terrain.minX + 2; x < terrain.maxX - 2; x += cell) {
      const px = Math.min(cw - 1, ((x - terrain.minX) * classScale) | 0);
      const pz = Math.min(ch - 1, ((z - terrain.minZ) * classScale) | 0);
      const i = (pz * cw + px) * 4;
      const d = density(data[i], data[i + 1] > 128);
      if (d === 0 || rng() > d * cell * cell) continue;
      const tx = x + rng() * cell, tz = z + rng() * cell;
      const forest = data[i] >= 170;
      const h = forest ? 9 + rng() * 9 : 6 + rng() * 8;
      const r = (forest ? 2.2 : 2.6) + rng() * 2.2;
      const key = Math.floor(tx / chunkSize) + ',' + Math.floor(tz / chunkSize);
      let c = chunks.get(key); if (!c) chunks.set(key, c = []);
      c.push({ x: tx, z: tz, y: terrain.heightAt(tx, tz), h, r, rot: rng() * Math.PI * 2, v: rng(), kind: rng() < 0.5 ? 0 : 1 });
      colliders.addCircle(tx, tz, 0.32, terrain.heightAt(tx, tz) + h);
    }
  }

  const trunkGeo = new THREE.CylinderGeometry(0.16, 0.28, 1, 7, 1); trunkGeo.translate(0, 0.5, 0);
  const crowns = [crownGeometry(1), crownGeometry(2)];
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.95 });
  const crownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 });

  const group = new THREE.Group();
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0), col = new THREE.Color();
  const greens = ['#3e5a2a', '#4b6a30', '#56743a', '#35512a', '#5e7a3c', '#47602c'].map((c) => new THREE.Color(c));
  let total = 0;
  for (const list of chunks.values()) {
    total += list.length;
    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, list.length);
    const byKind = [list.filter((t) => t.kind === 0), list.filter((t) => t.kind === 1)];
    list.forEach((t, i) => {
      q.setFromAxisAngle(up, t.rot);
      m.compose(pos.set(t.x, t.y - 0.3, t.z), q, s.set(1 + t.h * 0.02, t.h * 0.62, 1 + t.h * 0.02));
      trunks.setMatrixAt(i, m);
    });
    trunks.castShadow = true; trunks.computeBoundingSphere(); group.add(trunks);
    byKind.forEach((arr, k) => {
      if (!arr.length) return;
      const crown = new THREE.InstancedMesh(crowns[k], crownMat, arr.length);
      arr.forEach((t, i) => {
        q.setFromAxisAngle(up, t.rot);
        m.compose(pos.set(t.x, t.y + t.h * 0.62 + t.r * 0.35, t.z), q, s.set(t.r, t.r * (0.8 + t.v * 0.4), t.r * (0.9 + t.v * 0.2)));
        crown.setMatrixAt(i, m);
        col.copy(greens[(t.v * greens.length) | 0]).multiplyScalar(0.85 + (t.v * 7 % 1) * 0.3);
        crown.setColorAt(i, col);
      });
      crown.castShadow = true; crown.receiveShadow = true; crown.computeBoundingSphere(); group.add(crown);
    });
  }
  return { group, count: total };
}
