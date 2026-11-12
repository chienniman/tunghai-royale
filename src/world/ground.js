import * as THREE from 'three';
import { mulberry32 } from '../util.js';

// [width in metres, colour]
const ROAD = {
  primary: [13, '#3d3f42'], secondary: [11, '#434548'], tertiary: [9, '#47494c'], tertiary_link: [7, '#47494c'],
  unclassified: [6, '#525356'], residential: [6.5, '#525356'], living_street: [5, '#5c5d60'], service: [4.5, '#5c5d60'],
  pedestrian: [9, '#a3907a'], footway: [2.4, '#a69c8a'], steps: [3.5, '#b2a996'], path: [1.6, '#86765a'],
  track: [3, '#857152'], cycleway: [2, '#786d66'], waterway: [2.5, '#3a5560'],
};
const AREA = {
  urban: '#7a786f', farm: '#86884c', grass: '#6c8a43', park: '#62823c', dirt: '#86714f',
  wood: '#34502a', trees: '#3f5c2e', plaza: '#9d978b', pitch: '#5b8b3b', track: '#9b4c3c', water: '#3c6774',
};
const AREA_ORDER = ['urban', 'farm', 'grass', 'park', 'dirt', 'wood', 'trees', 'plaza', 'pitch', 'track', 'water'];
// Red channel of the class map drives tree density (see trees.js).
export const CLASS_VALUE = {
  wood: 220, trees: 190, park: 130, grass: 110, urban: 70,
  farm: 40, plaza: 40, pitch: 40, track: 40, water: 40, dirt: 40, road: 40, building: 40,
};

// Replace the red channel inside the current path, keeping green/blue: multiply by (0,1,1) then add (v,0,0).
function setClass(c, v, mode) {
  c.save();
  c.globalCompositeOperation = 'multiply';
  c.fillStyle = c.strokeStyle = 'rgb(0,255,255)'; mode === 'fill' ? c.fill() : c.stroke();
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = c.strokeStyle = `rgb(${v},0,0)`; mode === 'fill' ? c.fill() : c.stroke();
  c.restore();
}

const closed = (p) => p.length >= 8 && p[0] === p[p.length - 2] && p[1] === p[p.length - 1];

export function paintGround(map, terrain, texWidth = 3072) {
  const scale = texWidth / terrain.width;
  const W = texWidth, H = Math.round(terrain.depth * scale);
  const tx = (x) => (x - terrain.minX) * scale, tz = (z) => (z - terrain.minZ) * scale;
  const rng = mulberry32(7);

  const canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const cls = document.createElement('canvas'); cls.width = 1024; cls.height = Math.round(1024 * H / W);
  const cctx = cls.getContext('2d');
  const cs = cls.width / W;

  const path = (c, p, k) => {
    c.beginPath();
    c.moveTo(tx(p[0]) * k, tz(p[1]) * k);
    for (let i = 2; i < p.length; i += 2) c.lineTo(tx(p[i]) * k, tz(p[i + 1]) * k);
  };

  // Base soil / undergrowth with soft blotches.
  ctx.fillStyle = '#5f6b3e'; ctx.fillRect(0, 0, W, H);
  const blot = ['#4f5c33', '#6e7848', '#73694a', '#56663a', '#7b7f50'];
  for (let i = 0; i < 9000; i++) {
    ctx.globalAlpha = 0.06 + rng() * 0.08;
    ctx.fillStyle = blot[(rng() * blot.length) | 0];
    ctx.beginPath(); ctx.arc(rng() * W, rng() * H, (2 + rng() * 22) * scale, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Class map: R = vegetation class, G = 255 inside campus.
  cctx.fillStyle = 'rgb(0,0,0)'; cctx.fillRect(0, 0, cls.width, cls.height);
  if (map.campus) {
    path(cctx, map.campus, cs); cctx.closePath();
    cctx.fillStyle = 'rgb(0,255,0)'; cctx.fill();
  }

  // Land-use areas.
  const areas = map.areas.slice().sort((a, b) => AREA_ORDER.indexOf(a.c) - AREA_ORDER.indexOf(b.c));
  for (const a of areas) {
    const col = AREA[a.c]; if (!col) continue;
    const v = CLASS_VALUE[a.c];
    if (a.c === 'trees' && !closed(a.p)) {
      ctx.strokeStyle = col; ctx.lineWidth = 6 * scale; ctx.lineCap = 'round'; path(ctx, a.p, 1); ctx.stroke();
      cctx.lineWidth = Math.max(1.5, 6 * scale * cs); path(cctx, a.p, cs); setClass(cctx, v, 'stroke');
      continue;
    }
    if (!closed(a.p)) continue;
    path(ctx, a.p, 1); ctx.closePath(); ctx.fillStyle = col; ctx.fill();
    if (a.c === 'pitch') { ctx.strokeStyle = 'rgba(240,240,230,.55)'; ctx.lineWidth = Math.max(1, 0.25 * scale); ctx.stroke(); }
    // overwrite R (class) while keeping G (campus flag)
    path(cctx, a.p, cs); cctx.closePath(); setClass(cctx, v, 'fill');
  }

  // Roads: widest first so footpaths sit on top.
  const roads = map.roads.filter((r) => ROAD[r.t]).sort((a, b) => ROAD[b.t][0] - ROAD[a.t][0]);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const r of roads) {
    const [w, col] = ROAD[r.t];
    if (w >= 6) { // kerb / verge
      ctx.strokeStyle = 'rgba(150,145,130,.9)'; ctx.lineWidth = (w + 1.4) * scale; path(ctx, r.p, 1); ctx.stroke();
    }
    ctx.strokeStyle = col; ctx.lineWidth = w * scale; path(ctx, r.p, 1); ctx.stroke();
    if (r.t === 'primary' || r.t === 'tertiary') {
      ctx.setLineDash([3 * scale, 4 * scale]); ctx.strokeStyle = 'rgba(235,235,225,.75)';
      ctx.lineWidth = Math.max(1, 0.18 * scale); path(ctx, r.p, 1); ctx.stroke(); ctx.setLineDash([]);
    }
    if (r.t !== 'waterway') {
      cctx.lineCap = 'round'; cctx.lineWidth = Math.max(1.5, (w + 2) * scale * cs);
      path(cctx, r.p, cs); setClass(cctx, CLASS_VALUE.road, 'stroke');
    }
  }

  // Building footprints (shadowed ground under walls).
  for (const b of map.buildings) {
    path(ctx, b.p, 1); ctx.closePath(); ctx.fillStyle = '#6d6a63'; ctx.fill();
    path(cctx, b.p, cs); cctx.closePath(); setClass(cctx, CLASS_VALUE.building, 'fill');
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const classData = cctx.getImageData(0, 0, cls.width, cls.height);
  return { canvas, texture, classData, classScale: cls.width / terrain.width };
}

// Tileable value-noise texture used for close-up ground detail.
export function makeDetailTexture(size = 256) {
  const rng = mulberry32(11);
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); const img = ctx.createImageData(size, size);
  const octave = (period) => {
    const g = Array.from({ length: period * period }, () => rng());
    return (x, y) => {
      const fx = x / size * period, fy = y / size * period;
      const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
      const at = (i, j) => g[((j % period + period) % period) * period + ((i % period + period) % period)];
      const s = (t) => t * t * (3 - 2 * t);
      const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * s(tx);
      const b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * s(tx);
      return a + (b - a) * s(ty);
    };
  };
  const os = [octave(4), octave(8), octave(16), octave(32), octave(64)];
  const ws = [0.35, 0.25, 0.18, 0.12, 0.10];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let v = 0; for (let k = 0; k < os.length; k++) v += os[k](x, y) * ws[k];
    const i = (y * size + x) * 4; const b = Math.round(v * 255);
    img.data[i] = img.data[i + 1] = img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; t.anisotropy = 8;
  return t;
}

// Ground material = painted map texture * world-space detail noise at two scales.
export function makeGroundMaterial(texture, detail) {
  const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.95, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.detailMap = { value: detail };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nuniform sampler2D detailMap;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        float dA = texture2D(detailMap, vWPos.xz * 0.31).r;
        float dB = texture2D(detailMap, vWPos.xz * 0.047).r;
        float dC = texture2D(detailMap, vWPos.xz * 0.0071).r;
        diffuseColor.rgb *= 0.62 + 0.55 * dA * 0.7 + 0.45 * (dB - 0.5) + 0.35 * (dC - 0.5) + 0.2;`);
  };
  return mat;
}
