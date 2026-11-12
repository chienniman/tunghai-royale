// Item definitions. Pure data (no three.js) so it can be unit-tested in Node.
// A world/inventory "stack" is { id, n, ammo?, dur? }:
//   ammo = rounds loaded in a weapon, dur = remaining armour durability.

export const AMMO_NAMES = { '9mm': '9mm', '556': '5.56mm', '762': '7.62mm', '12g': '12 號霰彈' };

const DEG = Math.PI / 180;

export const ITEMS = {
  // --- weapons -------------------------------------------------------------
  // dmg: per projectile · rpm: rounds/min · hip/ads: spread half-angle (rad)
  // kick: vertical recoil per shot (rad) · bloom: spread added per shot (rad)
  // near/far: damage falls linearly from 100% at `near` m to `minMul` at `far` m
  pistol: {
    kind: 'weapon', name: 'P9 手槍', ammoType: '9mm', dmg: 24, rpm: 420, mag: 15, reload: 1.5, auto: false,
    hip: 1.5 * DEG, ads: 0.45 * DEG, kick: 1.1 * DEG, bloom: 0.5 * DEG, near: 20, far: 60, minMul: 0.55,
    range: 150, head: 2, zoom: 58, tier: 1,
  },
  smg: {
    kind: 'weapon', name: '衝鋒槍', ammoType: '9mm', dmg: 19, rpm: 820, mag: 30, reload: 2.1, auto: true,
    hip: 2.0 * DEG, ads: 0.8 * DEG, kick: 0.55 * DEG, bloom: 0.28 * DEG, near: 25, far: 80, minMul: 0.5,
    range: 200, head: 2, zoom: 54, tier: 2,
  },
  ar: {
    kind: 'weapon', name: '突擊步槍', ammoType: '556', dmg: 32, rpm: 640, mag: 30, reload: 2.5, auto: true,
    hip: 2.4 * DEG, ads: 0.35 * DEG, kick: 0.8 * DEG, bloom: 0.3 * DEG, near: 60, far: 220, minMul: 0.6,
    range: 400, head: 2, zoom: 44, tier: 3,
  },
  shotgun: {
    kind: 'weapon', name: '霰彈槍', ammoType: '12g', dmg: 13, pellets: 8, rpm: 75, mag: 5, reload: 2.8, auto: false,
    hip: 3.6 * DEG, ads: 2.8 * DEG, kick: 4.0 * DEG, bloom: 0, near: 10, far: 40, minMul: 0.2,
    range: 70, head: 1.5, zoom: 58, tier: 2,
  },
  sniper: {
    kind: 'weapon', name: '狙擊步槍', ammoType: '762', dmg: 90, rpm: 42, mag: 5, reload: 3.2, auto: false,
    hip: 5.0 * DEG, ads: 0.03 * DEG, kick: 4.5 * DEG, bloom: 0, near: 150, far: 500, minMul: 0.8,
    range: 800, head: 2.5, zoom: 13, scope: true, tier: 4,
  },

  // --- ammo (w = weight per round) -----------------------------------------
  ammo_9mm: { kind: 'ammo', name: '9mm 子彈', ammoType: '9mm', w: 0.4 },
  ammo_556: { kind: 'ammo', name: '5.56mm 子彈', ammoType: '556', w: 0.5 },
  ammo_762: { kind: 'ammo', name: '7.62mm 子彈', ammoType: '762', w: 0.8 },
  ammo_12g: { kind: 'ammo', name: '12 號霰彈', ammoType: '12g', w: 1.2 },

  // --- consumables ---------------------------------------------------------
  bandage: { kind: 'heal', name: '繃帶', heal: 15, cap: 75, time: 3, w: 2, key: 'Digit4' },
  medkit: { kind: 'heal', name: '急救包', heal: 100, cap: 100, time: 6, w: 10, key: 'Digit5' },
  milk: { kind: 'boost', name: '東海鮮乳', boost: 45, time: 3, w: 4, key: 'Digit6' },

  // --- gear ----------------------------------------------------------------
  vest1: { kind: 'vest', name: '防彈背心 Lv.1', lv: 1, reduce: 0.30, dur: 200 },
  vest2: { kind: 'vest', name: '防彈背心 Lv.2', lv: 2, reduce: 0.40, dur: 220 },
  vest3: { kind: 'vest', name: '防彈背心 Lv.3', lv: 3, reduce: 0.55, dur: 250 },
  helmet1: { kind: 'helmet', name: '頭盔 Lv.1', lv: 1, reduce: 0.30, dur: 80 },
  helmet2: { kind: 'helmet', name: '頭盔 Lv.2', lv: 2, reduce: 0.40, dur: 150 },
  helmet3: { kind: 'helmet', name: '頭盔 Lv.3', lv: 3, reduce: 0.55, dur: 230 },
  pack1: { kind: 'pack', name: '背包 Lv.1', lv: 1, cap: 100 },
  pack2: { kind: 'pack', name: '背包 Lv.2', lv: 2, cap: 170 },
  pack3: { kind: 'pack', name: '背包 Lv.3', lv: 3, cap: 250 },
};
for (const [id, d] of Object.entries(ITEMS)) d.id = id;

export const BASE_CAPACITY = 80;
export const FISTS = { id: 'fists', kind: 'melee', name: '空手', dmg: 20, rate: 0.45, range: 2.0, zoom: 62 };
export const CONSUMABLES = ['bandage', 'medkit', 'milk'];
export const AMMO_ITEM = { '9mm': 'ammo_9mm', '556': 'ammo_556', '762': 'ammo_762', '12g': 'ammo_12g' };

export const def = (id) => ITEMS[id];

// Rarity tier 0..4 (grey / green / blue / purple / gold) — drives ring, beam and UI colours.
export const RARITY = ['#c9ccd1', '#6fcf7c', '#5aa9ff', '#b57bff', '#ffb84a'];
const HEAL_TIER = { bandage: 0, milk: 1, medkit: 2 };
export function tierOf(id) {
  const d = ITEMS[id];
  if (!d) return 0;
  if (d.kind === 'weapon') return d.tier;
  if (d.lv) return d.lv;
  return HEAL_TIER[id] ?? 0;
}

// Label for a stack as shown in pickup lists / inventory.
export function stackLabel(s) {
  const d = ITEMS[s.id];
  if (!d) return s.id;
  if (d.kind === 'weapon') return `${d.name}（${s.ammo ?? 0}/${d.mag}）`;
  if (d.kind === 'vest' || d.kind === 'helmet') return `${d.name}（${Math.round(100 * (s.dur ?? d.dur) / d.dur)}%）`;
  return s.n > 1 ? `${d.name} ×${s.n}` : d.name;
}

// Damage multiplier by distance for a weapon.
export function falloff(w, dist) {
  if (dist <= w.near) return 1;
  if (dist >= w.far) return w.minMul;
  return 1 - (1 - w.minMul) * (dist - w.near) / (w.far - w.near);
}

// --- loot tables -------------------------------------------------------------
const pickW = (r, list) => {
  let t = 0; for (const [, w] of list) t += w;
  let x = r * t;
  for (const [v, w] of list) { if ((x -= w) <= 0) return v; }
  return list[list.length - 1][0];
};
const WEAPON_W = [['pistol', 30], ['smg', 25], ['ar', 22], ['shotgun', 15], ['sniper', 8]];
const AMMO_W = [['ammo_9mm', 34], ['ammo_556', 30], ['ammo_12g', 20], ['ammo_762', 16]];
const AMMO_N = { ammo_9mm: [20, 30], ammo_556: [20, 30], ammo_762: [8, 15], ammo_12g: [6, 10] };
const LEVEL_W = [[1, 55], [2, 32], [3, 13]];

export function ammoStack(id, rng) {
  const [a, b] = AMMO_N[id];
  return { id, n: a + Math.floor(rng() * (b - a + 1)) };
}

// One loot spawn point -> 1..3 stacks. rng: () => [0,1)
export function rollCluster(rng) {
  const r = rng();
  if (r < 0.34) {
    const id = pickW(rng(), WEAPON_W), w = ITEMS[id];
    const out = [{ id, n: 1, ammo: w.mag }, ammoStack(AMMO_ITEM[w.ammoType], rng)];
    if (rng() < 0.4) out.push(ammoStack(AMMO_ITEM[w.ammoType], rng));
    return out;
  }
  if (r < 0.54) {
    const out = [ammoStack(pickW(rng(), AMMO_W), rng)];
    if (rng() < 0.35) out.push(ammoStack(pickW(rng(), AMMO_W), rng));
    return out;
  }
  if (r < 0.77) {
    const k = rng();
    if (k < 0.5) return [{ id: 'bandage', n: 1 + Math.floor(rng() * 4) }];
    if (k < 0.75) return [{ id: 'milk', n: 1 + Math.floor(rng() * 2) }];
    return [{ id: 'medkit', n: 1 }];
  }
  const kind = pickW(rng(), [['vest', 38], ['helmet', 38], ['pack', 24]]);
  const id = kind + pickW(rng(), LEVEL_W);
  const d = ITEMS[id];
  return [d.dur ? { id, n: 1, dur: d.dur } : { id, n: 1 }];
}
