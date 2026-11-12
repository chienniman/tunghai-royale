// Small deterministic PRNG so the world looks the same on every load.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(n) {
  n = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); n ^= n >>> 13; n = Math.imul(n, 0xc2b2ae35); n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

export function pick(r, list) {
  // list: [[value, weight], ...]
  let t = 0; for (const [, w] of list) t += w;
  let x = r * t;
  for (const [v, w] of list) { if ((x -= w) <= 0) return v; }
  return list[list.length - 1][0];
}

// Flat [x,z,...] polygon helpers.
export function openRing(p) {
  const n = p.length;
  if (n >= 4 && p[0] === p[n - 2] && p[1] === p[n - 1]) return p.slice(0, n - 2);
  return p.slice();
}

export function signedArea(p) {
  let a = 0;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) a += p[j] * p[i + 1] - p[i] * p[j + 1];
  return a / 2;
}

export function centroid(p) {
  let x = 0, z = 0; const n = p.length / 2;
  for (let i = 0; i < p.length; i += 2) { x += p[i]; z += p[i + 1]; }
  return { x: x / n, z: z / n };
}

// Minimum-area oriented bounding box (edge-aligned).
export function obb(p) {
  let best = null;
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    let ux = p[i] - p[j], uz = p[i + 1] - p[j + 1];
    const l = Math.hypot(ux, uz); if (l < 1e-6) continue; ux /= l; uz /= l;
    const vx = -uz, vz = ux;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (let k = 0; k < p.length; k += 2) {
      const a = p[k] * ux + p[k + 1] * uz, b = p[k] * vx + p[k + 1] * vz;
      if (a < a0) a0 = a; if (a > a1) a1 = a; if (b < b0) b0 = b; if (b > b1) b1 = b;
    }
    const area = (a1 - a0) * (b1 - b0);
    if (!best || area < best.area) {
      const ca = (a0 + a1) / 2, cb = (b0 + b1) / 2;
      best = { area, ux, uz, vx, vz, hu: (a1 - a0) / 2, hv: (b1 - b0) / 2, cx: ca * ux + cb * vx, cz: ca * uz + cb * vz };
    }
  }
  if (best && best.hv > best.hu) { // make u the long axis
    best = { ...best, ux: best.vx, uz: best.vz, vx: -best.ux, vz: -best.uz, hu: best.hv, hv: best.hu };
  }
  return best;
}
