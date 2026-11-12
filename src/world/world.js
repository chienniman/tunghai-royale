import * as THREE from 'three';
import { Colliders } from './colliders.js';
import { paintGround, makeDetailTexture, makeGroundMaterial } from './ground.js';
import { buildBuildings } from './buildings.js';
import { buildChapel } from './chapel.js';
import { plantTrees } from './trees.js';
import { buildLamps } from './lamps.js';

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

  progress('架設路燈…'); await tick();
  const lamps = buildLamps(scene, terrain, map, { colliders, inCampus });

  return { colliders, groundCanvas: ground.canvas, named: bld.named, chapel, map, treeCount: trees.count, inCampus, lamps };
}
