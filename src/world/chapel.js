import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { centroid } from '../util.js';

// Luce Memorial Chapel: two curved shells per side rising to a ridge skylight,
// clad in golden diamond-pattern glazed tiles, glass end walls.
function makeTileTexture() {
  const S = 512; const c = document.createElement('canvas'); c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#6e5222'; ctx.fillRect(0, 0, S, S);
  const n = 4, d = S / n;
  for (let i = -1; i <= n; i++) for (let j = -1; j <= n; j++) {
    const cx = i * d + (j % 2 ? d / 2 : 0), cy = j * d / 2;
    const v = Math.random();
    const r = 196 + v * 30 | 0, g = 152 + v * 26 | 0, b = 70 + v * 18 | 0;
    const gr = ctx.createLinearGradient(cx - d / 2, cy - d / 4, cx + d / 2, cy + d / 4);
    gr.addColorStop(0, `rgb(${r + 20},${g + 18},${b + 10})`); gr.addColorStop(1, `rgb(${r - 25},${g - 25},${b - 15})`);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.moveTo(cx, cy - d / 4 + 3); ctx.lineTo(cx + d / 2 - 3, cy); ctx.lineTo(cx, cy + d / 4 - 3); ctx.lineTo(cx - d / 2 + 3, cy);
    ctx.closePath(); ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

export function buildChapel(b, terrain, colliders) {
  const p = b.p;
  const c = centroid(p);
  // principal axis via 2x2 covariance
  let sxx = 0, szz = 0, sxz = 0;
  for (let i = 0; i < p.length; i += 2) { const dx = p[i] - c.x, dz = p[i + 1] - c.z; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
  const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz);
  const ax = Math.cos(ang), az = Math.sin(ang);
  let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity, hMax = -Infinity, hMin = Infinity;
  for (let i = 0; i < p.length; i += 2) {
    const dx = p[i] - c.x, dz = p[i + 1] - c.z;
    const a = dx * ax + dz * az, bb = -dx * az + dz * ax;
    a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, bb); b1 = Math.max(b1, bb);
    const h = terrain.heightAt(p[i], p[i + 1]); hMax = Math.max(hMax, h); hMin = Math.min(hMin, h);
  }
  const L = THREE.MathUtils.clamp(a1 - a0, 22, 40);
  const W = THREE.MathUtils.clamp(b1 - b0, 14, 26);
  const H = 19.2, gap = 0.45;

  const group = new THREE.Group();
  group.position.set(c.x, Math.max(hMax, terrain.heightAt(c.x, c.z)) + 0.35, c.z);
  group.rotation.y = Math.atan2(ax, az); // local +z = long axis

  const tex = makeTileTexture();
  tex.repeat.set(L / 4, 22 / 4);
  const shellMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0.15, side: THREE.DoubleSide });

  // Each side = lower + upper shell. Lower shell twists outward at the ends (hyperbolic look).
  const halfBase = (u) => W / 2 * (0.8 + 0.2 * Math.abs(2 * u - 1));
  const profile = (u, v, s) => {
    const hb = halfBase(u);
    return s * (gap + (hb - gap) * Math.pow(1 - v, 1.55));
  };
  for (const s of [1, -1]) {
    const lower = new ParametricGeometry((u, v, t) => {
      const vv = v * 0.55, ends = Math.abs(2 * u - 1);
      t.set(profile(u, vv, s), H * vv * (1 - 0.06 * ends), (u - 0.5) * L);
    }, 24, 16);
    const upper = new ParametricGeometry((u, v, t) => {
      const vv = 0.5 + v * 0.5, k = 1 - 0.08 * Math.sin(u * Math.PI);
      t.set(profile(u, vv, s) * k + s * 0.35, H * vv, (u - 0.5) * L * 0.985);
    }, 24, 12);
    for (const g of [lower, upper]) {
      const m = new THREE.Mesh(g, shellMat); m.castShadow = true; m.receiveShadow = true; group.add(m);
    }
  }

  // Glass end walls following the shell profile.
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x1f2a33, roughness: 0.08, metalness: 0.6, transparent: true, opacity: 0.88, side: THREE.DoubleSide });
  const mullMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6 });
  for (const u of [0, 1]) {
    const shape = new THREE.Shape();
    const steps = 20;
    for (let i = 0; i <= steps; i++) { const v = i / steps; const x = profile(u, v, -1) * 0.97; const y = H * v * 0.98; i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
    for (let i = steps; i >= 0; i--) { const v = i / steps; shape.lineTo(profile(u, v, 1) * 0.97, H * v * 0.98); }
    const glass = new THREE.Mesh(new THREE.ShapeGeometry(shape), glassMat);
    glass.position.z = (u - 0.5) * L * 0.97;
    group.add(glass);
    for (let k = -3; k <= 3; k++) { // vertical mullions
      const x = k * W / 9; const v = 1 - Math.pow(Math.max(0, (Math.abs(x) - gap) / (halfBase(u) - gap)), 1 / 1.55);
      const hgt = Math.max(0.5, H * v * 0.97);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.15, hgt, 0.2), mullMat);
      m.position.set(x, hgt / 2, glass.position.z); group.add(m);
    }
  }
  // Ridge skylight
  const sky = new THREE.Mesh(new THREE.BoxGeometry(gap * 2 + 0.7, 0.15, L * 0.98), glassMat);
  sky.position.y = H; group.add(sky);
  // Stone plinth
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 3, 4, L + 4), new THREE.MeshStandardMaterial({ color: 0xb4ad9f, roughness: 0.9 }));
  plinth.position.y = -2; plinth.receiveShadow = true; group.add(plinth);

  // Collision: rectangle of the base.
  const pts = [];
  for (const [la, lb] of [[-L / 2, -W / 2], [L / 2, -W / 2], [L / 2, W / 2], [-L / 2, W / 2]]) {
    // local (x=lb across, z=la along) -> world
    const wx = c.x + la * ax - lb * az, wz = c.z + la * az + lb * ax;
    pts.push(wx, wz);
  }
  colliders.addPolygon(pts, group.position.y + H, { name: '路思義教堂', noDecal: true });

  return { group, center: c, axis: { x: ax, z: az }, length: L, width: W, baseY: group.position.y };
}
