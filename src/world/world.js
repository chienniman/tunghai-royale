import * as THREE from 'three';
import { Colliders } from './colliders.js';
import { paintGround, makeDetailTexture, makeGroundMaterial } from './ground.js';
import { buildBuildings } from './buildings.js';
import { buildChapel } from './chapel.js';
import { plantTrees } from './trees.js';
import { Grass } from './grass.js';

export async function buildWorld(scene, terrain, map, progress = () => {}) {
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const colliders = new Colliders();

  progress('繪製地表…'); await tick();
  const ground = paintGround(map, terrain);
  const groundMesh = terrain.buildMesh(makeGroundMaterial(ground.texture, makeDetailTexture()));
  scene.add(groundMesh);

  progress('建造建築物…'); await tick();
  const bld = buildBuildings(map, terrain, colliders);
  scene.add(bld.group);

  let chapel = null;
  if (bld.chapel) {
    chapel = buildChapel(bld.chapel, terrain, colliders);
    scene.add(chapel.group);
    bld.named.push({ name: '路思義教堂', x: chapel.center.x, z: chapel.center.z, r: 25 });
  }

  progress('種樹中…'); await tick();
  const trees = plantTrees(terrain, ground, colliders);
  scene.add(trees.group);

  const cd = ground.classData;
  const inCampus = (x, z) => {
    const px = Math.min(cd.width - 1, Math.max(0, ((x - terrain.minX) * ground.classScale) | 0));
    const pz = Math.min(cd.height - 1, Math.max(0, ((z - terrain.minZ) * ground.classScale) | 0));
    return cd.data[(pz * cd.width + px) * 4 + 1] > 128;
  };

  // Ground class (see CLASS_VALUE in ground.js) and painted colour at a point, for grass placement.
  const classAt = (x, z) => {
    const px = Math.min(cd.width - 1, Math.max(0, ((x - terrain.minX) * ground.classScale) | 0));
    const pz = Math.min(cd.height - 1, Math.max(0, ((z - terrain.minZ) * ground.classScale) | 0));
    return cd.data[(pz * cd.width + px) * 4];
  };
  const small = document.createElement('canvas'); small.width = 768; small.height = Math.round(768 * ground.canvas.height / ground.canvas.width);
  const sctx = small.getContext('2d', { willReadFrequently: true }); sctx.drawImage(ground.canvas, 0, 0, small.width, small.height);
  const cdata = sctx.getImageData(0, 0, small.width, small.height).data, cscale = small.width / terrain.width;
  const colorAt = (x, z, out) => {
    const px = Math.min(small.width - 1, Math.max(0, ((x - terrain.minX) * cscale) | 0));
    const pz = Math.min(small.height - 1, Math.max(0, ((z - terrain.minZ) * cscale) | 0));
    const i = (pz * small.width + px) * 4;
    return out.setRGB(cdata[i] / 255, cdata[i + 1] / 255, cdata[i + 2] / 255, THREE.SRGBColorSpace);
  };
  const grass = new Grass(scene, terrain, classAt, colorAt);

  // Nearest solid along a ray with unit direction: { t, nx, ny, nz, kind: 'ground' | 'solid' } or null.
  const raycast = (ox, oy, oz, dx, dy, dz, maxT) => {
    const tg = terrain.raycast(ox, oy, oz, dx, dy, dz, maxT);
    const hit = colliders.raycast(ox, oy, oz, dx, dy, dz, tg >= 0 ? tg : maxT);
    if (hit) return { t: hit.t, nx: hit.nx, ny: hit.ny, nz: hit.nz, kind: 'solid' };
    if (tg >= 0) return { t: tg, nx: 0, ny: 1, nz: 0, kind: 'ground' };
    return null;
  };

  return { raycast, grass, colliders, groundCanvas: ground.canvas, named: bld.named, chapel, map, treeCount: trees.count, inCampus };
}
