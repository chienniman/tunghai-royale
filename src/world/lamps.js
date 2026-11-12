// Street lamps along campus roads: instanced poles, a glow sprite and a fake pool of light per lamp,
// plus a handful of real lights that follow the lamps nearest the player.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from '../util.js';

// road type -> [half width (m), spacing between lamps (m)]
const ROADS = {
  primary: [6.5, 38], secondary: [5.5, 38], tertiary: [4.5, 36], tertiary_link: [3.5, 40], unclassified: [3, 40],
  residential: [3.25, 36], living_street: [2.5, 40], service: [2.25, 48], pedestrian: [4.5, 22], footway: [1.2, 64],
};
const HEAD_Y = 4.45, REACH = 0.62, WARM = 0xffb060;
const UP = new THREE.Vector3(0, 1, 0);

function radialTexture(stops) {
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), h = S / 2, rad = g.createRadialGradient(h, h, 0, h, h, h);
  for (const [o, col] of stops) rad.addColorStop(o, col);
  g.fillStyle = rad; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildLamps(scene, terrain, map, world) {
  const rng = mulberry32(90210), col = world.colliders;
  const lamps = [];
  const taken = new Map(), CELL = 14;
  const cellKey = (x, z) => Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
  const crowded = (x, z) => {
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
      const a = taken.get(i + ',' + j); if (!a) continue;
      for (const l of a) if ((l.x - x) ** 2 + (l.z - z) ** 2 < CELL * CELL) return true;
    }
    return false;
  };

  for (const r of map.roads) {
    const spec = ROADS[r.t]; if (!spec) continue;
    const [half, spacing] = spec, p = r.p;
    let carry = spacing * (0.3 + rng() * 0.5), side = rng() < 0.5 ? 1 : -1;
    for (let i = 0; i + 3 < p.length; i += 2) {
      const ax = p[i], az = p[i + 1], dx = p[i + 2] - ax, dz = p[i + 3] - az, len = Math.hypot(dx, dz);
      if (len < 0.01) continue;
      let d = carry;
      while (d < len) {
        const t = d / len, nx = dz / len * side, nz = -dx / len * side;
        const x = ax + dx * t + nx * (half + 0.9), z = az + dz * t + nz * (half + 0.9);
        d += spacing; side = -side;
        if (!terrain.inBounds(x, z, 10) || !world.inCampus(x, z)) continue;
        const y = terrain.heightAt(x, z);
        if (col.blocked(x, y + 1, z) || crowded(x, z)) continue;
        const roll = rng();
        const lamp = { x, y, z, nx: -nx, nz: -nz, state: roll < 0.13 ? 'off' : roll < 0.19 ? 'flicker' : 'on', lit: 1 };
        lamps.push(lamp);
        const k = cellKey(x, z); let a = taken.get(k); if (!a) taken.set(k, a = []); a.push(lamp);
        col.addCircle(x, z, 0.14, y + HEAD_Y + 0.2);
      }
      carry = d - len;
    }
  }

  const group = new THREE.Group();
  // --- poles
  const poleGeo = mergeGeometries([
    new THREE.CylinderGeometry(0.05, 0.075, HEAD_Y + 0.1, 6).translate(0, (HEAD_Y + 0.1) / 2, 0),
    new THREE.BoxGeometry(0.06, 0.06, REACH + 0.1).translate(0, HEAD_Y + 0.08, -(REACH + 0.1) / 2 + 0.05),
    new THREE.BoxGeometry(0.2, 0.09, 0.42).translate(0, HEAD_Y + 0.03, -REACH),
  ]);
  const poles = new THREE.InstancedMesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x23272b, roughness: 0.6, metalness: 0.5 }), lamps.length);
  poles.castShadow = true; poles.frustumCulled = false;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  lamps.forEach((l, i) => {
    q.setFromAxisAngle(UP, Math.atan2(-l.nx, -l.nz));       // arm reaches over the road
    m.compose(v.set(l.x, l.y, l.z), q, s); poles.setMatrixAt(i, m);
    l.hx = l.x + l.nx * REACH; l.hz = l.z + l.nz * REACH; l.hy = l.y + HEAD_Y - 0.03;
  });
  group.add(poles);

  // --- glow sprites and pools of light, steady lamps and flickering lamps drawn separately
  const glowTex = radialTexture([[0, 'rgba(255,255,255,1)'], [0.12, 'rgba(255,225,170,.85)'], [0.4, 'rgba(255,170,80,.22)'], [1, 'rgba(255,150,60,0)']]);
  const poolTex = radialTexture([[0, 'rgba(255,255,255,.9)'], [0.35, 'rgba(255,255,255,.5)'], [0.75, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]);
  const poolGeo = new THREE.CircleGeometry(5.2, 24).rotateX(-Math.PI / 2);
  const n = new THREE.Vector3(), e = 1.2;
  const makeSet = (list) => {
    const pos = new Float32Array(list.length * 3);
    list.forEach((l, i) => { pos[i * 3] = l.hx; pos[i * 3 + 1] = l.hy; pos[i * 3 + 2] = l.hz; });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const glow = new THREE.Points(geo, new THREE.PointsMaterial({ map: glowTex, size: 3.2, sizeAttenuation: true, color: WARM,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.frustumCulled = false; glow.renderOrder = 3;
    const pools = new THREE.InstancedMesh(poolGeo, new THREE.MeshBasicMaterial({ map: poolTex, color: 0xff9a4a, transparent: true, opacity: 0.42,
      depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), Math.max(1, list.length));
    pools.count = list.length; pools.frustumCulled = false; pools.renderOrder = 2;
    list.forEach((l, i) => {
      n.set(terrain.heightAt(l.hx - e, l.hz) - terrain.heightAt(l.hx + e, l.hz), 2 * e, terrain.heightAt(l.hx, l.hz - e) - terrain.heightAt(l.hx, l.hz + e)).normalize();
      q.setFromUnitVectors(UP, n);
      m.compose(v.set(l.hx, terrain.heightAt(l.hx, l.hz) + 0.07, l.hz), q, s); pools.setMatrixAt(i, m);
    });
    group.add(glow, pools);
    return { glow, pools };
  };
  const steady = makeSet(lamps.filter((l) => l.state === 'on'));
  const flick = makeSet(lamps.filter((l) => l.state === 'flicker'));

  // --- a few real lights hop between the nearest lit lamps so characters and trees near a lamp are actually lit
  const real = [];
  for (let i = 0; i < 3; i++) { const L = new THREE.PointLight(WARM, 0, 17, 1.5); group.add(L); real.push({ light: L, lamp: null }); }
  scene.add(group);

  let t = 0, pick = 0, flickLevel = 1;
  const near = [];
  return {
    group, lamps, count: lamps.length,
    // nearest lit lamp within `range`, for gameplay (standing in the light)
    litAt(x, z, range = 6) {
      const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
      let best = null, bd = range * range;
      for (let i = cx - 1; i <= cx + 1; i++) for (let j = cz - 1; j <= cz + 1; j++) {
        const a = taken.get(i + ',' + j); if (!a) continue;
        for (const l of a) {
          if (l.state === 'off' || (l.state === 'flicker' && flickLevel < 0.5)) continue;
          const d = (l.hx - x) ** 2 + (l.hz - z) ** 2;
          if (d < bd) { bd = d; best = l; }
        }
      }
      return best;
    },
    update(dt, focus) {
      t += dt;
      // one shared stutter for the faulty lamps
      const nz = Math.sin(t * 31.0) * Math.sin(t * 12.3 + 1.7) * Math.sin(t * 5.1 + 0.3);
      flickLevel = nz > 0.25 ? 0.05 : 0.75 + 0.25 * Math.sin(t * 47.0);
      flick.glow.material.opacity = flickLevel; flick.pools.material.opacity = 0.42 * flickLevel;
      // re-pick the three nearest lit lamps four times a second
      pick -= dt;
      if (pick <= 0) {
        pick = 0.25; near.length = 0;
        const cx = Math.floor(focus.x / CELL), cz = Math.floor(focus.z / CELL);
        for (let i = cx - 3; i <= cx + 3; i++) for (let j = cz - 3; j <= cz + 3; j++) {
          const a = taken.get(i + ',' + j); if (!a) continue;
          for (const l of a) if (l.state !== 'off') near.push(l);
        }
        near.sort((a, b) => ((a.hx - focus.x) ** 2 + (a.hz - focus.z) ** 2) - ((b.hx - focus.x) ** 2 + (b.hz - focus.z) ** 2));
        real.forEach((r, i) => {
          r.lamp = near[i] || null;
          if (r.lamp) r.light.position.set(r.lamp.hx, r.lamp.hy - 0.25, r.lamp.hz);
        });
      }
      for (const r of real) r.light.intensity = !r.lamp ? 0 : 26 * (r.lamp.state === 'flicker' ? flickLevel : 1);
    },
  };
}
