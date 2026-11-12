// Item definitions (weapons, ammo, healing) and their low-poly models.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const AMMO = {
  '9mm': { name: '9mm 手槍彈', short: '9mm', color: 0xc9a23a, box: 30 },
  '556': { name: '5.56mm 步槍彈', short: '5.56', color: 0x4d8f55, box: 30 },
  '762': { name: '7.62mm 步槍彈', short: '7.62', color: 0xa8553a, box: 10 },
  '12g': { name: '12 號霰彈', short: '12G', color: 0xb83232, box: 10 },
};

// hip / ads: cone half-angle (rad). falloff: [full damage until, minimum from, minimum multiplier].
export const WEAPONS = {
  pistol: { name: 'T75 手槍', slot: 'side', ammo: '9mm', mag: 15, dmg: 26, rpm: 420, auto: false, reload: 1.7,
    hip: 0.014, ads: 0.004, bloom: 0.006, recoilV: 0.020, recoilH: 0.008, range: 150, falloff: [25, 100, 0.55],
    adsFov: 58, head: 2.0, sound: 'pistol', hold: 'pistol' },
  smg: { name: 'T77 衝鋒槍', slot: 'main', ammo: '9mm', mag: 30, dmg: 21, rpm: 820, auto: true, reload: 2.2,
    hip: 0.018, ads: 0.007, bloom: 0.0032, recoilV: 0.011, recoilH: 0.007, range: 200, falloff: [30, 120, 0.5],
    adsFov: 55, head: 2.0, sound: 'smg', hold: 'rifle' },
  ar: { name: 'T91 步槍', slot: 'main', ammo: '556', mag: 30, dmg: 36, rpm: 700, auto: true, reload: 2.5,
    hip: 0.022, ads: 0.0035, bloom: 0.0038, recoilV: 0.015, recoilH: 0.006, range: 500, falloff: [80, 350, 0.7],
    adsFov: 48, head: 2.3, sound: 'rifle', hold: 'rifle' },
  shotgun: { name: 'M12 霰彈槍', slot: 'main', ammo: '12g', mag: 5, dmg: 14, pellets: 9, rpm: 70, auto: false, reload: 0.6,
    shellReload: true, hip: 0.05, ads: 0.04, bloom: 0, recoilV: 0.06, recoilH: 0.015, range: 70, falloff: [10, 45, 0.25],
    adsFov: 60, head: 1.5, sound: 'shotgun', hold: 'rifle' },
  sniper: { name: 'T93 狙擊槍', slot: 'main', ammo: '762', mag: 5, dmg: 88, rpm: 40, auto: false, reload: 3.2,
    hip: 0.05, ads: 0.0005, bloom: 0, recoilV: 0.07, recoilH: 0.012, range: 900, falloff: [200, 700, 0.8],
    adsFov: 13, scope: true, head: 2.5, sound: 'sniper', hold: 'rifle' },
};

// Tools against ghosts. `charges` is durability (melee) or how many you carry (throwables).
// tag: what kind of hit it is, so each ghost type can be weak or immune to it.
Object.assign(WEAPONS, {
  broom: { name: '竹掃把', kind: 'melee', slot: 'main', hold: 'broom', charges: 60, cooldown: 0.8, swing: 0.45,
    range: 2.7, arc: 2.1, stun: 1.6, push: 4.5, banish: 35, tag: 'sweep',
    desc: '勞作教育的老戰友。掃落葉、掃教室，掃阿飄也是剛好而已。' },
  milk: { name: '東海鮮乳', kind: 'throw', slot: 'side', hold: 'throw', charges: 3, stack: true, cooldown: 0.9, speed: 13,
    radius: 3.4, duration: 10, slow: 0.25, stun: 0.6, banish: 14, tag: 'milk', upright: true,
    desc: '牧場直送。砸在地上，阿飄踩到會滑。' },
  bat: { name: '教官的球棒', kind: 'melee', slot: 'main', hold: 'broom', charges: 8, cooldown: 1.15, swing: 0.5,
    range: 2.3, arc: 1.3, stun: 3.2, push: 8, banish: 60, tag: 'bat',
    desc: '傳說教官一聽到鬧鬼，抄起球棒就把鏡子打爆。沒人知道球棒哪來的。' },
  slip: { name: '預警單', kind: 'melee', slot: 'side', hold: 'throw', charges: 1, cooldown: 0.9, swing: 0.4,
    range: 2.0, arc: 1.2, stun: 0.5, push: 1, banish: 100, tag: 'slip', stack: true,
    desc: '比鬼故事還恐怖的一張紙。塞給阿飄，祂會頭也不回地跑走。' },
  bait: { name: '雞腳凍', kind: 'throw', slot: 'side', hold: 'throw', charges: 2, cooldown: 0.9, speed: 12,
    radius: 1.2, duration: 14, slow: 1, stun: 0, banish: 0, tag: 'food', lure: 16, upright: true, stack: true,
    desc: '東別名產。丟出去，貪吃的阿飄會先去吃。' },
  bell: { name: '聖誕鐘', kind: 'use', slot: 'side', hold: 'throw', charges: 2, cooldown: 12, swing: 0.6,
    range: 38, stun: 5, push: 9, banish: 30, tag: 'bell', upright: true,
    desc: '聖誕夜要敲九十九加一響。敲一下，附近的阿飄全部退散；但祂們會記仇。' },
});

export const HEALS = {
  bandage: { name: 'OK 繃', time: 2.5, heal: 15, cap: 75, key: 'Digit4', stack: 3 },
  medkit: { name: '熱八寶粥', time: 4, heal: 100, cap: 100, key: 'Digit5', stack: 1 },
  drink: { name: '牧場冰淇淋', time: 3, boost: 40, cap: 100, key: 'Digit6', stack: 1 },
};

// ---------------------------------------------------------------- models
const GUN = 0x2a2c30, POLY = 0x1b1c1e, STEEL = 0x5a5d62, WOOD = 0x6b4a2b, OLIVE = 0x4a4f38;
const _c = new THREE.Color();

// Colour a primitive, rotate it about its own centre, then move it into place.
function P(geo, color, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  if (rx) geo.rotateX(rx); if (ry) geo.rotateY(ry); if (rz) geo.rotateZ(rz);
  geo.translate(x, y, z);
  _c.set(color);
  const n = geo.attributes.position.count, col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (r, len, seg = 10) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2); // along z
const Y = (r, len, seg = 12) => new THREE.CylinderGeometry(r, r, len, seg);                       // upright

// Guns are modelled with the barrel along -z, +y up and the origin at the pistol grip.
const BAMBOO = 0xb99a58, TWIG = 0x6e5129;
const GUN_PARTS = {
  broom: () => [
    P(C(0.016, 1.28, 8), BAMBOO, 0, 0, -0.36),                    // bamboo pole
    P(C(0.02, 0.05, 8), 0x3a2c18, 0, 0, -0.98),                   // binding
    P(new THREE.CylinderGeometry(0.17, 0.03, 0.46, 9).rotateX(-Math.PI / 2).scale(1, 0.5, 1), TWIG, 0, 0, -1.2),   // twig head, fanned out
    P(new THREE.CylinderGeometry(0.12, 0.025, 0.36, 7).rotateX(-Math.PI / 2).scale(1, 0.4, 1), 0x7d5e33, 0, -0.015, -1.17),
  ],
  bat: () => [
    P(new THREE.CylinderGeometry(0.034, 0.018, 0.86, 10).rotateX(-Math.PI / 2), 0xc9a36a, 0, 0, -0.33),   // tapered wooden bat
    P(C(0.024, 0.03, 8), 0x2a2a2a, 0, 0, 0.11),                    // knob
  ],
  slip: () => [
    P(B(0.15, 0.002, 0.21), 0xf3efe2, 0, 0.0, 0),                   // a sheet of paper
    P(B(0.11, 0.003, 0.02), 0xc0392b, 0, 0.001, -0.07),             // the red stamp
  ],
  bait: () => [
    P(B(0.12, 0.05, 0.09), 0xe9e4d4, 0, 0, 0),                      // takeaway box
    P(B(0.122, 0.012, 0.092), 0xb5462b, 0, 0.012, 0),               // paper band
  ],
  bell: () => [
    P(new THREE.CylinderGeometry(0.02, 0.06, 0.08, 12), 0xc8a13a, 0, 0.0, 0),    // brass bell
    P(Y(0.008, 0.08), 0x5a3d1e, 0, 0.075, 0),                      // wooden handle
  ],
  milk: () => [
    P(Y(0.036, 0.13), 0xf4f1e8, 0, 0.005, 0),                     // bottle of milk
    P(Y(0.022, 0.035), 0xf4f1e8, 0, 0.085, 0),                    // neck
    P(Y(0.025, 0.014), 0x2d5fa8, 0, 0.108, 0),                    // blue cap
    P(Y(0.0365, 0.05), 0x2d5fa8, 0, 0.0, 0),                      // label
  ],
  ar: () => [
    P(B(0.046, 0.07, 0.21), GUN, 0, 0.055, -0.06),              // receiver
    P(B(0.05, 0.058, 0.25), POLY, 0, 0.055, -0.29),             // handguard
    P(C(0.011, 0.2), STEEL, 0, 0.06, -0.50),                    // barrel
    P(C(0.016, 0.05), GUN, 0, 0.06, -0.62),                     // flash hider
    P(B(0.012, 0.055, 0.02), GUN, 0, 0.105, -0.40),             // front sight
    P(B(0.022, 0.028, 0.15), GUN, 0, 0.104, -0.05),             // carry handle
    P(B(0.03, 0.15, 0.058), STEEL, 0, -0.045, -0.115, 0.18),    // magazine
    P(B(0.032, 0.1, 0.042), POLY, 0, -0.035, 0.03, -0.35),      // grip
    P(C(0.016, 0.17), GUN, 0, 0.058, 0.125),                    // buffer tube
    P(B(0.04, 0.1, 0.13), POLY, 0, 0.04, 0.235),                // stock
  ],
  smg: () => [
    P(B(0.044, 0.06, 0.30), GUN, 0, 0.05, -0.09),               // receiver
    P(C(0.012, 0.09), STEEL, 0, 0.055, -0.285),                 // barrel
    P(B(0.026, 0.21, 0.036), STEEL, 0, -0.085, -0.10, 0.06),    // long magazine
    P(B(0.03, 0.095, 0.04), POLY, 0, -0.035, 0.03, -0.3),       // grip
    P(B(0.012, 0.03, 0.012), GUN, 0, 0.095, -0.21),             // front sight
    P(B(0.02, 0.025, 0.03), GUN, 0, 0.092, 0.03),               // rear sight
    P(B(0.012, 0.012, 0.24), STEEL, 0.018, 0.06, 0.18),         // wire stock
    P(B(0.012, 0.012, 0.24), STEEL, -0.018, 0.06, 0.18),
    P(B(0.05, 0.09, 0.014), STEEL, 0, 0.03, 0.30),              // butt plate
  ],
  pistol: () => [
    P(B(0.028, 0.034, 0.185), GUN, 0, 0.062, -0.055),           // slide
    P(B(0.026, 0.03, 0.12), POLY, 0, 0.034, -0.05),             // frame
    P(B(0.027, 0.105, 0.046), POLY, 0, -0.012, 0.022, -0.22),   // grip
    P(B(0.006, 0.01, 0.006), STEEL, 0, 0.083, -0.14),           // front sight
  ],
  shotgun: () => [
    P(B(0.046, 0.07, 0.24), GUN, 0, 0.05, -0.07),               // receiver
    P(C(0.014, 0.5), STEEL, 0, 0.068, -0.44),                   // barrel
    P(C(0.014, 0.4), GUN, 0, 0.036, -0.39),                     // tube magazine
    P(B(0.046, 0.046, 0.17), WOOD, 0, 0.034, -0.33),            // pump
    P(B(0.036, 0.085, 0.07), WOOD, 0, 0.0, 0.07, -0.5),         // wrist
    P(B(0.04, 0.1, 0.27), WOOD, 0, 0.0, 0.26, -0.1),            // stock
  ],
  sniper: () => [
    P(B(0.05, 0.065, 0.62), OLIVE, 0, 0.03, -0.05),             // stock body
    P(B(0.045, 0.11, 0.2), OLIVE, 0, 0.012, 0.31),              // butt
    P(B(0.03, 0.09, 0.04), OLIVE, 0, -0.035, 0.05, -0.4),       // grip
    P(C(0.013, 0.56), STEEL, 0, 0.068, -0.60),                  // barrel
    P(B(0.04, 0.045, 0.2), GUN, 0, 0.072, -0.1),                // action
    P(C(0.02, 0.26), GUN, 0, 0.128, -0.08),                     // scope tube
    P(C(0.03, 0.07), GUN, 0, 0.128, -0.24),                     // objective
    P(C(0.026, 0.05), GUN, 0, 0.128, 0.07),                     // eyepiece
    P(B(0.012, 0.035, 0.016), GUN, 0, 0.1, -0.15),              // scope rings
    P(B(0.012, 0.035, 0.016), GUN, 0, 0.1, -0.02),
    P(B(0.03, 0.05, 0.06), STEEL, 0, -0.02, -0.12),             // magazine
    P(B(0.05, 0.012, 0.012), STEEL, 0.04, 0.075, 0.0),          // bolt handle
  ],
};

// Where things are on each gun, in the gun's own frame (metres).
export const GUN_POINTS = {
  broom: { muzzle: [0, 0, -1.35], support: [0, 0, -0.3], mag: [0, 0, -0.3] },
  milk: { muzzle: [0, 0.1, 0], support: [0, 0, 0], mag: [0, 0, 0] },
  bat: { muzzle: [0, 0, -0.78], support: [0, 0, -0.14], mag: [0, 0, -0.14] },
  slip: { muzzle: [0, 0, -0.1], support: [0, 0, 0], mag: [0, 0, 0] },
  bait: { muzzle: [0, 0.05, 0], support: [0, 0, 0], mag: [0, 0, 0] },
  bell: { muzzle: [0, 0, 0], support: [0, 0, 0], mag: [0, 0, 0] },
  ar: { muzzle: [0, 0.06, -0.645], support: [0, 0.02, -0.29], mag: [0, -0.1, -0.115] },
  smg: { muzzle: [0, 0.055, -0.33], support: [0, -0.02, -0.16], mag: [0, -0.14, -0.10] },
  pistol: { muzzle: [0, 0.062, -0.15], support: [-0.03, -0.03, 0.02], mag: [0, -0.08, 0.03] },
  shotgun: { muzzle: [0, 0.068, -0.69], support: [0, 0.01, -0.33], mag: [0, 0.0, -0.12] },
  sniper: { muzzle: [0, 0.068, -0.885], support: [0, 0.0, -0.3], mag: [0, -0.05, -0.12] },
};

const WORLD_PARTS = {
  ammo: (color) => [
    P(B(0.15, 0.075, 0.10), 0x8a7a55, 0, 0.0375, 0),
    P(B(0.152, 0.022, 0.102), color, 0, 0.048, 0),
    P(B(0.08, 0.004, 0.06), 0xe8e2d0, 0, 0.076, 0),
  ],
  bandage: () => [
    P(C(0.04, 0.075, 14), 0xe9e6dc, 0, 0.04, 0),
    P(C(0.041, 0.018, 14), 0xb53030, 0, 0.04, 0),
  ],
  medkit: () => [
    P(B(0.28, 0.12, 0.19), 0xb02a2a, 0, 0.06, 0),
    P(B(0.11, 0.004, 0.034), 0xf2f2f2, 0, 0.122, 0),
    P(B(0.034, 0.004, 0.11), 0xf2f2f2, 0, 0.122, 0),
    P(B(0.09, 0.018, 0.02), 0x1b1c1e, 0, 0.128, -0.07),
  ],
  drink: () => [
    P(Y(0.033, 0.12), 0x2f6fb5, 0, 0.06, 0),
    P(Y(0.034, 0.03), 0xf2d27a, 0, 0.07, 0),
    P(Y(0.029, 0.006), 0xc8ccd0, 0, 0.123, 0),
  ],
};

const gunMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.45 });
const matteMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0 });

const handCache = {};
// Geometry for a gun held in the hands (origin at the grip, barrel along -z).
export function handGeometry(id) {
  return handCache[id] ??= mergeGeometries(GUN_PARTS[id]());
}
export function gunMesh(id) {
  const m = new THREE.Mesh(handGeometry(id), WEAPONS[id].kind ? matteMaterial : gunMaterial);
  m.castShadow = true;
  return m;
}

// Geometry for an item lying on the ground: centred in x/z, resting on y = 0.
function grounded(geo, layOnSide) {
  if (layOnSide) geo.rotateZ(Math.PI / 2);
  geo.computeBoundingBox();
  const b = geo.boundingBox;
  geo.translate(-(b.min.x + b.max.x) / 2, -b.min.y, -(b.min.z + b.max.z) / 2);
  geo.computeBoundingSphere();
  return geo;
}

// id -> { kind, name, world (geometry), material, scale, ... }
export const ITEMS = {};
for (const id in WEAPONS) {
  const d = WEAPONS[id];
  ITEMS[id] = { kind: 'weapon', name: d.name, world: grounded(mergeGeometries(GUN_PARTS[id]()), !d.upright), material: d.kind ? matteMaterial : gunMaterial, scale: d.kind === 'throw' ? 1.5 : 1.15 };
}
for (const a in AMMO) {
  ITEMS['ammo_' + a] = { kind: 'ammo', ammo: a, name: AMMO[a].name, world: grounded(mergeGeometries(WORLD_PARTS.ammo(AMMO[a].color))), material: matteMaterial, scale: 1.35 };
}
for (const h in HEALS) {
  ITEMS[h] = { kind: 'heal', name: HEALS[h].name, world: grounded(mergeGeometries(WORLD_PARTS[h]())), material: matteMaterial, scale: 1.4 };
}

export function defaultCount(id) {
  const it = ITEMS[id];
  if (it.kind === 'ammo') return AMMO[it.ammo].box;
  if (it.kind === 'heal') return HEALS[id].stack;
  if (it.kind === 'weapon' && WEAPONS[id].kind) return WEAPONS[id].charges;
  return 1;
}

// 平安符: carried, not held. It takes one ghost's grab for you and burns up.
ITEMS.charm = { kind: 'charm', name: '平安符', material: matteMaterial, scale: 1.5,
  world: grounded(mergeGeometries([P(B(0.07, 0.012, 0.1), 0xc9302c, 0, 0, 0), P(B(0.045, 0.014, 0.07), 0xe8c24a, 0, 0, 0), P(B(0.012, 0.012, 0.05), 0xc9302c, 0, 0, -0.07)])) };
