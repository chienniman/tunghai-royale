import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ITEMS, RARITY, tierOf } from './items.js';

// Low-poly item models built from coloured boxes / cylinders merged into one
// geometry (one draw call per item). Guns point along -z, origin at the grip.
const METAL = 0x2f3236, DARK = 0x191a1d, WOOD = 0x7a5232, TAN = 0x9a8760, OLIVE = 0x4d5638, GREEN = 0x3f4a36;

// part: { s:[w,h,d] } box or { cyl:[radius,length] } cylinder along z; p = centre, c = colour, r = pitch (rad)
export function boxes(parts) {
  const geos = parts.map(({ s, cyl, p = [0, 0, 0], c = METAL, r }) => {
    let g = s ? new THREE.BoxGeometry(s[0], s[1], s[2]) : new THREE.CylinderGeometry(cyl[0], cyl[2] ?? cyl[0], cyl[1], 10).rotateX(Math.PI / 2);
    g = g.toNonIndexed();
    if (r) g.rotateX(r);
    g.translate(p[0], p[1], p[2]);
    const col = new THREE.Color(c), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  });
  const g = mergeGeometries(geos);
  g.computeBoundingSphere();
  return g;
}

// muzzle = distance from grip origin to barrel tip (along -z)
const SPECS = {
  pistol: { muzzle: 0.17, parts: [
    { s: [0.03, 0.04, 0.2], p: [0, 0.046, -0.055] },
    { s: [0.027, 0.024, 0.15], p: [0, 0.016, -0.045], c: DARK },
    { s: [0.03, 0.105, 0.046], p: [0, -0.04, 0.022], c: DARK, r: -0.22 },
    { s: [0.01, 0.012, 0.065], p: [0, -0.012, -0.04], c: DARK },
    { cyl: [0.008, 0.02], p: [0, 0.046, -0.16], c: DARK },
    { s: [0.012, 0.012, 0.012], p: [0, 0.072, 0.03], c: DARK }, { s: [0.006, 0.012, 0.01], p: [0, 0.072, -0.145], c: DARK },
  ] },
  smg: { muzzle: 0.41, parts: [
    { s: [0.045, 0.07, 0.3], p: [0, 0.036, -0.07] },
    { cyl: [0.021, 0.14], p: [0, 0.036, -0.29], c: DARK },
    { cyl: [0.012, 0.06], p: [0, 0.036, -0.385], c: METAL },
    { s: [0.028, 0.2, 0.04], p: [0, -0.1, -0.09], c: DARK },
    { s: [0.032, 0.1, 0.042], p: [0, -0.045, 0.03], c: DARK, r: -0.3 },
    { s: [0.02, 0.028, 0.22], p: [0, 0.048, 0.19], c: DARK }, { s: [0.03, 0.095, 0.02], p: [0, 0.02, 0.305], c: DARK },
    { s: [0.02, 0.012, 0.22], p: [0, 0.077, -0.07], c: DARK },
    { s: [0.026, 0.075, 0.03], p: [0, -0.035, -0.2], c: DARK },
  ] },
  ar: { muzzle: 0.76, parts: [
    { s: [0.044, 0.06, 0.36], p: [0, 0.046, -0.09] },
    { s: [0.04, 0.046, 0.2], p: [0, 0, -0.045], c: DARK },
    { s: [0.05, 0.056, 0.27], p: [0, 0.046, -0.4], c: TAN },
    { cyl: [0.011, 0.2], p: [0, 0.046, -0.62], c: DARK },
    { cyl: [0.017, 0.05], p: [0, 0.046, -0.735], c: DARK },
    { s: [0.028, 0.19, 0.06], p: [0, -0.11, -0.1], c: DARK, r: 0.18 },
    { s: [0.033, 0.1, 0.044], p: [0, -0.05, 0.04], c: TAN, r: -0.3 },
    { cyl: [0.016, 0.17], p: [0, 0.046, 0.16], c: DARK },
    { s: [0.04, 0.115, 0.15], p: [0, 0.02, 0.26], c: TAN },
    { s: [0.034, 0.05, 0.075], p: [0, 0.103, -0.08], c: DARK }, { s: [0.022, 0.02, 0.2], p: [0, 0.083, -0.1], c: DARK },
    { s: [0.01, 0.045, 0.012], p: [0, 0.095, -0.5], c: DARK },
  ] },
  shotgun: { muzzle: 0.75, parts: [
    { s: [0.048, 0.07, 0.28], p: [0, 0.036, -0.06] },
    { cyl: [0.015, 0.56], p: [0, 0.054, -0.47], c: DARK },
    { cyl: [0.013, 0.42], p: [0, 0.02, -0.4], c: METAL },
    { s: [0.052, 0.046, 0.17], p: [0, 0.02, -0.36], c: WOOD },
    { s: [0.042, 0.085, 0.3], p: [0, -0.005, 0.2], c: WOOD, r: 0.14 },
    { s: [0.044, 0.1, 0.03], p: [0, -0.03, 0.345], c: DARK },
    { s: [0.008, 0.012, 0.008], p: [0, 0.075, -0.74], c: 0xd8b24a },
  ] },
  sniper: { muzzle: 0.99, parts: [
    { s: [0.05, 0.07, 0.5], p: [0, 0.022, -0.06], c: GREEN },
    { s: [0.044, 0.105, 0.22], p: [0, 0, 0.27], c: GREEN, r: 0.08 },
    { s: [0.036, 0.03, 0.14], p: [0, 0.07, 0.24], c: DARK },
    { cyl: [0.013, 0.62], p: [0, 0.052, -0.6], c: DARK },
    { cyl: [0.021, 0.08], p: [0, 0.052, -0.945], c: METAL },
    { cyl: [0.021, 0.3], p: [0, 0.122, -0.09], c: DARK },
    { cyl: [0.03, 0.07], p: [0, 0.122, -0.26], c: DARK }, { cyl: [0.027, 0.06], p: [0, 0.122, 0.07], c: DARK },
    { s: [0.016, 0.04, 0.02], p: [0, 0.09, -0.16], c: DARK }, { s: [0.016, 0.04, 0.02], p: [0, 0.09, -0.02], c: DARK },
    { s: [0.03, 0.075, 0.07], p: [0, -0.045, -0.13], c: DARK },
    { s: [0.03, 0.1, 0.04], p: [0, -0.05, 0.035], c: GREEN, r: -0.25 },
    { s: [0.012, 0.012, 0.3], p: [0.022, 0.0, -0.42], c: DARK }, { s: [0.012, 0.012, 0.3], p: [-0.022, 0.0, -0.42], c: DARK },
    { s: [0.05, 0.012, 0.012], p: [0.04, 0.055, 0.02], c: METAL },
  ] },
};

const ITEM_PARTS = {
  ammo_9mm: [{ s: [0.16, 0.08, 0.1], c: 0xc9992f }, { s: [0.165, 0.02, 0.105], p: [0, 0.03, 0], c: 0x6b5318 }],
  ammo_556: [{ s: [0.18, 0.1, 0.11], c: 0x4f8a3c }, { s: [0.185, 0.02, 0.115], p: [0, 0.04, 0], c: 0x2c4f22 }],
  ammo_762: [{ s: [0.2, 0.1, 0.12], c: 0xa5523a }, { s: [0.205, 0.02, 0.125], p: [0, 0.04, 0], c: 0x5a2c1f }],
  ammo_12g: [{ s: [0.17, 0.09, 0.12], c: 0xb5322b }, { s: [0.175, 0.02, 0.125], p: [0, 0.035, 0], c: 0xd8b24a }],
  bandage: [{ cyl: [0.06, 0.1], c: 0xefeadc }, { cyl: [0.062, 0.03], c: 0xc9c1ad }, { cyl: [0.02, 0.102], c: 0x9a9384 }],
  medkit: [
    { s: [0.34, 0.16, 0.24], c: 0xeeeeea }, { s: [0.345, 0.03, 0.245], p: [0, 0.02, 0], c: 0xb9bbb8 },
    { s: [0.12, 0.165, 0.04], c: 0xd32f2f }, { s: [0.04, 0.165, 0.12], c: 0xd32f2f },
    { s: [0.1, 0.02, 0.03], p: [0, 0.09, 0], c: 0x3a3d42 },
  ],
  milk: [
    { cyl: [0.045, 0.17], p: [0, 0, 0], c: 0xf6f6f1 },
    { cyl: [0.047, 0.07], p: [0, 0, 0.005], c: 0x2f6fb7 },
    { cyl: [0.028, 0.035, 0.043], p: [0, 0, -0.1], c: 0xf6f6f1 },
    { cyl: [0.024, 0.025], p: [0, 0, -0.125], c: 0x2f6fb7 },
  ],
  vest: [
    { s: [0.4, 0.46, 0.14], p: [0, 0.23, 0], c: OLIVE },
    { s: [0.3, 0.14, 0.17], p: [0, 0.15, 0], c: 0x3a4129 },
    { s: [0.09, 0.1, 0.14], p: [-0.14, 0.5, 0], c: OLIVE }, { s: [0.09, 0.1, 0.14], p: [0.14, 0.5, 0], c: OLIVE },
  ],
  helmet: [
    { s: [0.26, 0.14, 0.3], p: [0, 0.1, 0], c: OLIVE },
    { s: [0.22, 0.06, 0.26], p: [0, 0.19, 0], c: OLIVE },
    { s: [0.28, 0.03, 0.1], p: [0, 0.04, -0.14], c: 0x3a4129 },
  ],
  pack: [
    { s: [0.36, 0.46, 0.2], p: [0, 0.23, 0], c: 0x5b5236 },
    { s: [0.26, 0.18, 0.08], p: [0, 0.16, -0.13], c: 0x473f29 },
    { s: [0.36, 0.06, 0.21], p: [0, 0.43, 0], c: 0x473f29 },
  ],
};
// Gear colour by level, matching what the character wears (see player.js).
const LEVEL_COLOR = { 1: 0x7a7d66, 2: 0x47566b, 3: 0x2b2d32 };
const UPRIGHT = { milk: true, bandage: true }; // modelled lying along z; stand them up on the ground

const geoCache = new Map();
let mat = null;
export const material = () => mat || (mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.18 }));

function geometryFor(id) {
  let g = geoCache.get(id);
  if (g) return g;
  const d = ITEMS[id];
  if (d.kind === 'weapon') g = boxes(SPECS[id].parts);
  else if (d.kind === 'vest' || d.kind === 'helmet' || d.kind === 'pack') {
    const base = new THREE.Color(LEVEL_COLOR[d.lv]);
    g = boxes(ITEM_PARTS[d.kind].map((p, i) => ({ ...p, c: base.clone().multiplyScalar(i === 0 ? 1 : 0.72).getHex() })));
  } else {
    g = boxes(ITEM_PARTS[id]);
    if (UPRIGHT[id]) { g.rotateX(Math.PI / 2); g.computeBoundingBox(); g.translate(0, -g.boundingBox.min.y, 0); }
  }
  geoCache.set(id, g);
  return g;
}

export const muzzleLength = (id) => SPECS[id]?.muzzle ?? 0.3;

// Mesh for holding in the hands (weapons only).
export function makeHeldWeapon(id) {
  const m = new THREE.Mesh(geometryFor(id), material());
  m.castShadow = true;
  return m;
}

// Side-view silhouette of a weapon as inline SVG, generated from the same parts as the 3D model.
const iconCache = new Map();
export function weaponIcon(id) {
  let svg = iconCache.get(id);
  if (svg) return svg;
  const spec = SPECS[id]; if (!spec) return '';
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  const rects = spec.parts.map(({ s, cyl, p = [0, 0, 0], r = 0 }) => {
    const w = s ? s[2] : cyl[1], h = s ? s[1] : cyl[0] * 2;
    const cx = -p[2], cy = -p[1];           // barrel to the right, up is up
    const rad = Math.hypot(w, h) / 2;
    x0 = Math.min(x0, cx - rad); x1 = Math.max(x1, cx + rad); y0 = Math.min(y0, cy - rad); y1 = Math.max(y1, cy + rad);
    const rot = r ? ` transform="rotate(${(-r * 180 / Math.PI).toFixed(1)} ${cx.toFixed(3)} ${cy.toFixed(3)})"` : '';
    return `<rect x="${(cx - w / 2).toFixed(3)}" y="${(cy - h / 2).toFixed(3)}" width="${w.toFixed(3)}" height="${h.toFixed(3)}" rx="0.006"${rot}/>`;
  });
  const pad = 0.01;
  svg = `<svg viewBox="${(x0 - pad).toFixed(3)} ${(y0 - pad).toFixed(3)} ${(x1 - x0 + pad * 2).toFixed(3)} ${(y1 - y0 + pad * 2).toFixed(3)}" fill="currentColor" preserveAspectRatio="xMidYMid meet">${rects.join('')}</svg>`;
  iconCache.set(id, svg);
  return svg;
}

const ringGeo = new THREE.RingGeometry(0.27, 0.33, 28).rotateX(-Math.PI / 2);
const discGeo = new THREE.CircleGeometry(0.27, 28).rotateX(-Math.PI / 2);
const beamGeo = new THREE.CylinderGeometry(0.012, 0.045, 4, 8, 1, true).translate(0, 2, 0);
const fxMats = new Map();
function tierMats(tier) {
  let m = fxMats.get(tier);
  if (m) return m;
  const color = new THREE.Color(RARITY[tier]);
  const opt = { color, transparent: true, depthWrite: false, fog: false };
  // beam fades out towards the top
  const c = document.createElement('canvas'); c.width = 4; c.height = 64;
  const ctx = c.getContext('2d'), gr = ctx.createLinearGradient(0, 0, 0, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, 4, 64);
  m = {
    ring: new THREE.MeshBasicMaterial({ ...opt, opacity: 0.9 }),
    disc: new THREE.MeshBasicMaterial({ ...opt, opacity: 0.16 }),
    beam: new THREE.MeshBasicMaterial({ ...opt, opacity: 0.32, alphaMap: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
  };
  fxMats.set(tier, m);
  return m;
}

// Object shown on the ground for a loot stack: the model plus a rarity-coloured ring
// (and a light beam for the rare stuff). userData.model is the part that bobs/spins.
export function makeLootObject(id) {
  const d = ITEMS[id], tier = tierOf(id), mats = tierMats(tier);
  const g = new THREE.Group();
  const m = new THREE.Mesh(geometryFor(id), material());
  m.castShadow = true;
  const holder = new THREE.Group();
  if (d.kind === 'weapon') { m.rotation.z = Math.PI / 2 - 0.25; m.scale.setScalar(1.2); holder.position.y = 0.2; }
  else { m.scale.setScalar(d.kind === 'ammo' || d.kind === 'heal' || d.kind === 'boost' ? 1.25 : 1); holder.position.y = 0.1; }
  holder.add(m); g.add(holder);
  const big = d.kind === 'weapon' ? 1.55 : 1;
  const ring = new THREE.Mesh(ringGeo, mats.ring); ring.position.y = 0.035; ring.scale.setScalar(big); g.add(ring);
  const disc = new THREE.Mesh(discGeo, mats.disc); disc.position.y = 0.03; disc.scale.setScalar(big); g.add(disc);
  if (tier >= 3) g.add(new THREE.Mesh(beamGeo, mats.beam));
  g.userData.model = holder;
  return g;
}
