import * as THREE from 'three';
import { hash, pick, openRing, signedArea, centroid, obb } from '../util.js';

const FLOOR = 3.3;
const COLORS = {
  brick: '#9a5c48', brick2: '#86503f', gray: '#a8a296', white: '#d6d0c2', cream: '#cdbf9e', concrete: '#9d9a92',
};
const WALLS = {
  university: [['brick', 3], ['gray', 3], ['white', 2], ['cream', 1]],
  dormitory: [['brick', 5], ['brick2', 2], ['gray', 2]],
  hospital: [['white', 6], ['gray', 3]],
  school: [['white', 4], ['gray', 3], ['cream', 2]],
  default: [['gray', 4], ['white', 3], ['cream', 2], ['concrete', 2]],
};
const DEFAULT_LEVELS = {
  dormitory: 3, university: 3, hospital: 5, school: 3, apartments: 6, commercial: 3, retail: 2, supermarket: 2,
  industrial: 2, house: 2, residential: 2, detached: 2, garage: 1, roof: 1, church: 2, temple: 1, office: 4,
};

class GeoBuilder {
  constructor() { this.pos = []; this.nor = []; this.uv = []; this.col = []; }
  tri(a, b, c, n, color, ua = [0, 0], ub = [0, 0], uc = [0, 0]) {
    const ex = b[0] - a[0], ey = b[1] - a[1], ez = b[2] - a[2];
    const fx = c[0] - a[0], fy = c[1] - a[1], fz = c[2] - a[2];
    let cx = ey * fz - ez * fy, cy = ez * fx - ex * fz, cz = ex * fy - ey * fx;
    if (cx * n[0] + cy * n[1] + cz * n[2] < 0) { [b, c] = [c, b]; [ub, uc] = [uc, ub]; cx = -cx; cy = -cy; cz = -cz; }
    const l = Math.hypot(cx, cy, cz) || 1;
    for (const [p, u] of [[a, ua], [b, ub], [c, uc]]) {
      this.pos.push(p[0], p[1], p[2]); this.nor.push(cx / l, cy / l, cz / l);
      this.uv.push(u[0], u[1]); this.col.push(color.r, color.g, color.b);
    }
  }
  quad(a, b, c, d, n, color, ua, ub, uc, ud) { this.tri(a, b, c, n, color, ua, ub, uc); this.tri(a, c, d, n, color, ua, uc, ud); }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.computeBoundingSphere();
    return g;
  }
}

// Driven from the main loop: uNight 0..1 turns the lit windows on, uTime animates the flicker.
export const buildingUniforms = { uNight: { value: 1 }, uTime: { value: 0 } };

function makeWallTexture() {
  const S = 256; const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d');
  // wall plaster with subtle noise (alpha 255 = tinted by building colour)
  ctx.fillStyle = '#eeeeee'; ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 2500; i++) {
    const v = 215 + Math.random() * 40 | 0; ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 2, 2);
  }
  // floor slab line near bottom of each storey
  ctx.fillStyle = '#cfcfcf'; ctx.fillRect(0, S - 18, S, 14);
  // window frame
  ctx.fillStyle = '#d8d8d8'; ctx.fillRect(52, 58, 152, 126);
  // glass: alpha 128 marks "do not tint"
  const g = ctx.createLinearGradient(0, 64, 0, 178);
  g.addColorStop(0, 'rgba(120,140,155,0.5)'); g.addColorStop(0.5, 'rgba(48,60,70,0.5)'); g.addColorStop(1, 'rgba(70,84,94,0.5)');
  ctx.clearRect(60, 66, 136, 110);
  ctx.fillStyle = g; ctx.fillRect(60, 66, 136, 110);
  ctx.fillStyle = '#d8d8d8'; ctx.fillRect(126, 66, 4, 110); // mullion
  ctx.fillStyle = '#bdbdbd'; ctx.fillRect(48, 182, 160, 6);   // sill
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.premultiplyAlpha = false;
  return t;
}

function makeTileTexture() {
  const S = 128; const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#d0d0d0'; ctx.fillRect(0, 0, S, S);
  for (let x = 0; x < S; x += 16) { // tile rows run down the slope
    ctx.fillStyle = '#9a9a9a'; ctx.fillRect(x, 0, 3, S);
    ctx.fillStyle = '#e4e4e4'; ctx.fillRect(x + 7, 0, 3, S);
  }
  for (let y = 0; y < S; y += 32) { ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(0, y, S, 2); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function buildBuildings(map, terrain, colliders) {
  const walls = new GeoBuilder(), flat = new GeoBuilder(), tiles = new GeoBuilder();
  const named = [];
  let chapel = null;
  const col = new THREE.Color();

  map.buildings.forEach((b, idx) => {
    let p = openRing(b.p);
    if (p.length < 6) return;
    if (signedArea(p) < 0) { const q = []; for (let i = p.length - 2; i >= 0; i -= 2) q.push(p[i], p[i + 1]); p = q; }
    const area = signedArea(p);
    if (area < 6) return;
    if (b.n === '路思義教堂') { chapel = { ...b, p }; return; }

    let minH = Infinity, maxH = -Infinity;
    for (let i = 0; i < p.length; i += 2) {
      const h = terrain.heightAt(p[i], p[i + 1]); minH = Math.min(minH, h); maxH = Math.max(maxH, h);
    }
    const r = hash(idx * 7 + 1);
    let levels = b.l || DEFAULT_LEVELS[b.t] || (area < 120 ? 1 : area < 600 ? 2 : 3);
    if (b.n && /教師宿舍/.test(b.n) && !b.l) levels = 1;
    // Original 1950s campus (文理大道 courtyards): narrow single-storey wings with tiled roofs.
    const box0 = obb(p);
    if (!b.l && !b.h && (b.t === 'university' || b.t === 'yes') && box0 && box0.hv * 2 < 13 && area < 1500) levels = 1;
    const height = b.h || levels * FLOOR + 0.4 + r * 0.6;
    // On slopes, measure storeys from the average ground level but keep at least 2.6 m on the uphill side.
    const base = minH - 1.2, top = Math.max((minH + maxH) / 2 + height, maxH + 2.6);

    const wallKey = WALLS[b.t] ? b.t : 'default';
    col.set(COLORS[pick(hash(idx * 13 + 5), WALLS[wallKey])]).convertSRGBToLinear();
    const shade = 0.9 + hash(idx * 3 + 2) * 0.2; col.multiplyScalar(shade);

    // Walls
    let run = 0;
    for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
      const x0 = p[j], z0 = p[j + 1], x1 = p[i], z1 = p[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0); if (len < 0.05) continue;
      const n = [(z1 - z0) / len, 0, -(x1 - x0) / len];
      const u0 = run / 4, u1 = (run + len) / 4; run += len;
      const v0 = (base - minH) / FLOOR, v1 = (top - minH) / FLOOR;
      walls.quad([x0, base, z0], [x1, base, z1], [x1, top, z1], [x0, top, z0], n, col,
        [u0, v0], [u1, v0], [u1, v1], [u0, v1]);
    }

    // Roof: gable for small rectangular low-rise buildings, otherwise flat.
    const box = obb(p);
    const rect = box ? area / (4 * box.hu * box.hv) : 0;
    const gable = box && rect > 0.82 && levels <= 3 && area < 1800 && box.hv > 2.5 && b.t !== 'hospital' && b.t !== 'industrial';
    if (gable) {
      const { cx, cz, ux, uz, vx, vz, hu, hv } = box;
      const o = 0.6, pitch = 0.5, rh = hv * pitch;
      const P = (a, bb, y) => [cx + ux * a + vx * bb, y, cz + uz * a + vz * bb];
      const eave = top - o * pitch;
      const rc = new THREE.Color('#4a5056').convertSRGBToLinear().multiplyScalar(0.85 + hash(idx * 17) * 0.3);
      const slopeLen = Math.hypot(hv + o, rh + o * pitch);
      for (const s of [1, -1]) {
        const n = [vx * s * rh, hv, vz * s * rh];
        tiles.quad(P(-hu - o, s * (hv + o), eave), P(hu + o, s * (hv + o), eave), P(hu + o, 0, top + rh), P(-hu - o, 0, top + rh),
          n, rc, [0, 0], [(2 * hu + 2 * o) / 2, 0], [(2 * hu + 2 * o) / 2, slopeLen / 2], [0, slopeLen / 2]);
      }
      for (const s of [1, -1]) { // gable ends in wall colour
        const n = [ux * s, 0, uz * s];
        walls.tri(P(s * hu, hv, top), P(s * hu, -hv, top), P(s * hu, 0, top + rh), n, col, [0.05, 0.02], [0.1, 0.02], [0.07, 0.04]);
      }
      flat.tri(P(-hu, -hv, top), P(hu, -hv, top), P(hu, hv, top), [0, -1, 0], col); // ceiling under the roof
      flat.tri(P(-hu, -hv, top), P(hu, hv, top), P(-hu, hv, top), [0, -1, 0], col);
    } else {
      const contour = []; for (let i = 0; i < p.length; i += 2) contour.push(new THREE.Vector2(p[i], p[i + 1]));
      const tris = THREE.ShapeUtils.triangulateShape(contour, []);
      const rc = new THREE.Color('#8f8c85').convertSRGBToLinear().multiplyScalar(0.85 + hash(idx * 19) * 0.25);
      for (const [a, bb, c] of tris) {
        flat.tri([p[a * 2], top, p[a * 2 + 1]], [p[bb * 2], top, p[bb * 2 + 1]], [p[c * 2], top, p[c * 2 + 1]], [0, 1, 0], rc);
      }
      // parapet cap
      const pc = col.clone().multiplyScalar(0.8);
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
        const x0 = p[j], z0 = p[j + 1], x1 = p[i], z1 = p[i + 1];
        const len = Math.hypot(x1 - x0, z1 - z0); if (len < 0.05) continue;
        const n = [(z1 - z0) / len, 0, -(x1 - x0) / len];
        walls.quad([x0, top, z0], [x1, top, z1], [x1, top + 0.9, z1], [x0, top + 0.9, z0], n, pc,
          [0.02, 0.02], [0.05, 0.02], [0.05, 0.03], [0.02, 0.03]);
      }
    }

    colliders.addPolygon(p, top + 1, { name: b.n });
    if (b.n) { const c = centroid(p); named.push({ name: b.n, x: c.x, z: c.z, r: Math.sqrt(area / Math.PI) }); }
  });

  const wallTex = makeWallTexture();
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, vertexColors: true, roughness: 0.82 });
  wallMat.onBeforeCompile = (shader) => {
    shader.uniforms.uNight = buildingUniforms.uNight;
    shader.uniforms.uTime = buildingUniforms.uTime;
    shader.fragmentShader = 'uniform float uNight, uTime;\n' + shader.fragmentShader
      .replace('#include <color_fragment>', `
      float glass = step(texture2D(map, vMapUv).a, 0.75);
      #ifdef USE_COLOR
        diffuseColor.rgb *= mix(vColor, vec3(0.75), glass);
        diffuseColor.a = 1.0;
      #endif`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      #ifdef USE_COLOR
        // at night a few windows are lit; one in a while flickers
        vec2 cell = floor(vMapUv);
        float wh = fract(sin(dot(cell + floor(vColor.rg * 255.0), vec2(12.9898, 78.233))) * 43758.5453);
        float lit = step(0.955, wh);
        float fl = step(0.992, wh) * step(0.6, fract(sin(floor(uTime * 9.0) * 12.9898 + wh * 50.0) * 43758.5453));
        totalEmissiveRadiance += vec3(1.0, 0.76, 0.40) * glass * lit * (1.0 - fl) * uNight * 0.85;
      #endif`);
  };
  const flatMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: THREE.DoubleSide });
  const tileMat = new THREE.MeshStandardMaterial({ map: makeTileTexture(), vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });

  const group = new THREE.Group();
  for (const [b, m] of [[walls, wallMat], [flat, flatMat], [tiles, tileMat]]) {
    const mesh = new THREE.Mesh(b.geometry(), m);
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
  }
  return { group, named, chapel };
}
