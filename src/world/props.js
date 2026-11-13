import * as THREE from 'three';
import { mulberry32, openRing, signedArea } from '../util.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { boxes, material } from '../models.js';

// Things in the world you can walk up to and use (E): story fragments, shrines,
// lamp switches, boxes to search, notice boards, benches, the chapel bell and the
// bridge. This file only knows what they look like and where they stand; what
// happens when you use one is decided in quest.js.

const WOOD = 0x6b4a2e, STONE = 0x8d8a82, RED = 0x8a2a22, DARK = 0x24262a, PAPER = 0xe9e2cc, GREEN = 0x2f5a3c;

// A geometry painted one flat colour (for shapes boxes() cannot make, like wheels).
function tint(g, hex) {
  g = g.toNonIndexed();
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  g.deleteAttribute('uv');
  return g;
}
const SKIN = 0xc9a07a, NAVY = 0x1f2a44, STEEL = 0x9aa3ab;

const GEO = {};
const geo = (k, make) => GEO[k] || (GEO[k] = make());
const G = {
  fragment: () => boxes([{ s: [0.3, 0.012, 0.22], p: [0, 0.2, 0], c: PAPER }, { s: [0.22, 0.014, 0.012], p: [0, 0.2, -0.05], c: 0x8a8068 }, { s: [0.16, 0.014, 0.012], p: [-0.03, 0.2, 0.0], c: 0x8a8068 }]),
  shrine: () => boxes([
    { s: [1.3, 0.35, 1.1], p: [0, 0.175, 0], c: STONE }, { s: [1.0, 0.8, 0.8], p: [0, 0.75, 0.05], c: 0x9a8f80 },
    { s: [0.6, 0.55, 0.06], p: [0, 0.7, -0.36], c: 0x1a1512 },                                        // dark niche
    { s: [0.16, 0.26, 0.1], p: [0, 0.6, -0.3], c: 0xc9a43a },                                         // the little gold figure inside
    { s: [1.5, 0.12, 1.25], p: [0, 1.21, 0], c: RED }, { s: [1.2, 0.14, 1.0], p: [0, 1.33, 0], c: 0x6e201a }, { s: [0.7, 0.12, 0.6], p: [0, 1.45, 0], c: RED },
    { s: [0.08, 0.5, 0.08], p: [-0.46, 0.95, -0.36], c: RED }, { s: [0.08, 0.5, 0.08], p: [0.46, 0.95, -0.36], c: RED },
    { s: [0.7, 0.3, 0.4], p: [0, 0.15, -0.85], c: STONE }, { cyl: [0.13, 0.16], p: [0, 0.38, -0.85], c: 0x6b5a3a, r: Math.PI / 2 },   // offering table + incense pot
    { s: [0.01, 0.22, 0.01], p: [-0.03, 0.57, -0.85], c: 0xb5322b }, { s: [0.01, 0.2, 0.01], p: [0.02, 0.56, -0.84], c: 0xb5322b }, { s: [0.01, 0.23, 0.01], p: [0.05, 0.57, -0.87], c: 0xb5322b },
  ]),
  lamp: () => boxes([
    { cyl: [0.06, 4.2, 0.09], p: [0, 2.1, 0], c: DARK, r: Math.PI / 2 }, { s: [0.06, 0.06, 0.9], p: [0, 4.15, -0.42], c: DARK },
    { s: [0.22, 0.34, 0.14], p: [0, 1.15, -0.1], c: 0x5b6068 }, { s: [0.05, 0.1, 0.03], p: [0, 1.15, -0.18], c: 0xc0392b },             // switch box
  ]),
  lampHead: () => new THREE.BoxGeometry(0.3, 0.1, 0.5).translate(0, 4.08, -0.75),
  crate: () => boxes([{ s: [0.62, 0.46, 0.5], p: [0, 0.23, 0], c: 0xa98a5c }, { s: [0.64, 0.05, 0.12], p: [0, 0.445, 0], c: 0xcdb98c }, { s: [0.12, 0.47, 0.52], p: [0, 0.23, 0], c: 0xcdb98c }]),
  locker: () => boxes([{ s: [0.5, 1.7, 0.45], p: [0, 0.85, 0], c: 0x6d7782 }, { s: [0.44, 0.76, 0.02], p: [0, 1.26, -0.23], c: 0x5b646e }, { s: [0.44, 0.76, 0.02], p: [0, 0.44, -0.23], c: 0x5b646e },
    { s: [0.03, 0.08, 0.03], p: [0.16, 1.2, -0.25], c: DARK }, { s: [0.03, 0.08, 0.03], p: [0.16, 0.42, -0.25], c: DARK }]),
  board: () => boxes([
    { s: [0.09, 1.9, 0.09], p: [-0.85, 0.95, 0], c: WOOD }, { s: [0.09, 1.9, 0.09], p: [0.85, 0.95, 0], c: WOOD }, { s: [1.9, 0.08, 0.3], p: [0, 1.94, 0], c: 0x4a3320 },
    { s: [1.62, 1.0, 0.06], p: [0, 1.32, 0], c: GREEN },
    { s: [0.3, 0.4, 0.01], p: [-0.5, 1.4, -0.04], c: PAPER }, { s: [0.34, 0.26, 0.01], p: [-0.05, 1.5, -0.04], c: 0xe2d9a8 }, { s: [0.26, 0.36, 0.01], p: [0.42, 1.36, -0.04], c: PAPER },
    { s: [0.36, 0.2, 0.01], p: [-0.1, 1.13, -0.04], c: 0xd9c9c0 }, { s: [0.2, 0.24, 0.01], p: [0.62, 1.62, -0.04], c: 0xc9d4c0 },
  ]),
  bench: () => boxes([
    { s: [1.6, 0.06, 0.42], p: [0, 0.44, 0], c: WOOD }, { s: [1.6, 0.34, 0.05], p: [0, 0.76, 0.2], c: WOOD },
    { s: [0.07, 0.44, 0.4], p: [-0.68, 0.22, 0], c: DARK }, { s: [0.07, 0.44, 0.4], p: [0.68, 0.22, 0], c: DARK },
    { s: [0.07, 0.5, 0.06], p: [-0.68, 0.7, 0.2], c: DARK }, { s: [0.07, 0.5, 0.06], p: [0.68, 0.7, 0.2], c: DARK },
  ]),
  bell: () => boxes([
    { s: [0.14, 2.3, 0.14], p: [-0.7, 1.15, 0], c: WOOD }, { s: [0.14, 2.3, 0.14], p: [0.7, 1.15, 0], c: WOOD }, { s: [1.8, 0.14, 0.2], p: [0, 2.3, 0], c: WOOD },
    { cyl: [0.14, 0.5, 0.34], p: [0, 1.75, 0], c: 0x8a6a2a, r: Math.PI / 2 }, { sph: [0.16], p: [0, 2.02, 0], c: 0x8a6a2a }, { s: [0.03, 0.5, 0.03], p: [0, 1.25, 0], c: 0x3a3020 },
  ]),
  // 公共電話: a hooded stand with the phone inside
  booth: () => boxes([
    { s: [0.1, 2.0, 0.1], p: [0, 1.0, 0.32], c: 0x5b6470 }, { s: [0.86, 1.0, 0.06], p: [0, 1.5, 0.3], c: 0x7a8a9a }, { s: [0.06, 1.0, 0.5], p: [-0.43, 1.5, 0.06], c: 0x7a8a9a }, { s: [0.06, 1.0, 0.5], p: [0.43, 1.5, 0.06], c: 0x7a8a9a },
    { s: [0.94, 0.07, 0.6], p: [0, 2.03, 0.06], c: 0x3a6ea5 }, { s: [0.34, 0.5, 0.16], p: [0, 1.4, 0.2], c: 0x2a2c30 }, { s: [0.08, 0.28, 0.07], p: [-0.2, 1.42, 0.1], c: 0x101114 }, { s: [0.2, 0.14, 0.02], p: [0.02, 1.5, 0.11], c: 0x9aa3ab },
    { s: [0.7, 0.04, 0.3], p: [0, 1.08, 0.14], c: 0x5b6470 },
  ]),
  radio: () => boxes([
    { s: [0.42, 0.5, 0.42], p: [0, 0.25, 0], c: WOOD }, { s: [0.4, 0.24, 0.14], p: [0, 0.62, 0], c: 0x5a3a26 }, { s: [0.2, 0.16, 0.02], p: [-0.08, 0.62, -0.075], c: 0x1c1c1c },
    { s: [0.06, 0.06, 0.02], p: [0.12, 0.66, -0.075], c: 0xd9b46a }, { s: [0.06, 0.06, 0.02], p: [0.12, 0.57, -0.075], c: 0xd9b46a }, { s: [0.012, 0.42, 0.012], p: [0.17, 0.94, 0.03], c: STEEL },
  ]),
  vending: () => boxes([
    { s: [0.98, 1.86, 0.76], p: [0, 0.93, 0], c: 0xe6e8ec }, { s: [0.72, 1.0, 0.03], p: [-0.08, 1.22, -0.385], c: 0x16233a }, { s: [0.98, 0.26, 0.78], p: [0, 1.73, 0], c: 0x2f6fb7 },
    { s: [0.12, 0.4, 0.03], p: [0.38, 1.2, -0.385], c: 0x2a2c30 }, { s: [0.6, 0.18, 0.05], p: [-0.08, 0.34, -0.385], c: 0x101114 },
    { s: [0.1, 0.18, 0.01], p: [-0.3, 1.5, -0.402], c: 0xb98a5a }, { s: [0.1, 0.18, 0.01], p: [-0.14, 1.5, -0.402], c: 0xc0392b }, { s: [0.1, 0.18, 0.01], p: [0.02, 1.5, -0.402], c: 0x5f8f3a }, { s: [0.1, 0.18, 0.01], p: [0.18, 1.5, -0.402], c: 0xb98a5a },
    { s: [0.1, 0.18, 0.01], p: [-0.3, 1.2, -0.402], c: 0x2f6fb7 }, { s: [0.1, 0.18, 0.01], p: [-0.14, 1.2, -0.402], c: 0xb98a5a }, { s: [0.1, 0.18, 0.01], p: [0.02, 1.2, -0.402], c: 0xd9b46a }, { s: [0.1, 0.18, 0.01], p: [0.18, 1.2, -0.402], c: 0xc0392b },
  ]),
  bike: () => mergeGeometries([
    tint(new THREE.TorusGeometry(0.32, 0.028, 6, 18).rotateY(Math.PI / 2).translate(0, 0.35, 0.52), DARK), tint(new THREE.TorusGeometry(0.32, 0.028, 6, 18).rotateY(Math.PI / 2).translate(0, 0.35, -0.52), DARK),
    tint(new THREE.BoxGeometry(0.04, 0.04, 0.72).rotateX(-0.42).translate(0, 0.62, -0.1), 0x2f8a6a), tint(new THREE.BoxGeometry(0.04, 0.5, 0.04).rotateX(0.25).translate(0, 0.58, 0.28), 0x2f8a6a),
    tint(new THREE.BoxGeometry(0.035, 0.035, 0.6).rotateX(0.5).translate(0, 0.5, 0.26), 0x2f8a6a), tint(new THREE.BoxGeometry(0.04, 0.62, 0.04).rotateX(-0.3).translate(0, 0.66, -0.44), STEEL),
    tint(new THREE.BoxGeometry(0.48, 0.035, 0.035).translate(0, 0.98, -0.36), DARK), tint(new THREE.BoxGeometry(0.14, 0.05, 0.26).translate(0, 0.86, 0.3), 0x1a1a1a),
    tint(new THREE.BoxGeometry(0.3, 0.2, 0.24).translate(0, 0.86, -0.58), 0x6b4a2e),   // basket
  ]),
  cat: () => boxes([
    { s: [0.13, 0.14, 0.36], p: [0, 0.2, 0], c: 0xc98a4a }, { s: [0.13, 0.12, 0.13], p: [0, 0.29, -0.22], c: 0xc98a4a }, { s: [0.04, 0.05, 0.02], p: [-0.04, 0.37, -0.22], c: 0x8a5a2a }, { s: [0.04, 0.05, 0.02], p: [0.04, 0.37, -0.22], c: 0x8a5a2a },
    { s: [0.03, 0.26, 0.03], p: [0, 0.34, 0.2], c: 0x8a5a2a }, { s: [0.035, 0.14, 0.035], p: [-0.045, 0.07, -0.13], c: 0xe9d9c0 }, { s: [0.035, 0.14, 0.035], p: [0.045, 0.07, -0.13], c: 0xe9d9c0 },
    { s: [0.035, 0.14, 0.035], p: [-0.045, 0.07, 0.13], c: 0xc98a4a }, { s: [0.035, 0.14, 0.035], p: [0.045, 0.07, 0.13], c: 0xc98a4a }, { s: [0.132, 0.03, 0.08], p: [0, 0.24, 0.06], c: 0x8a5a2a },
  ]),
  cow: () => boxes([
    { s: [0.62, 0.66, 1.5], p: [0, 1.0, 0], c: 0xefeee8 }, { s: [0.64, 0.4, 0.5], p: [0, 1.08, 0.3], c: 0x1c1c1e }, { s: [0.64, 0.3, 0.36], p: [0, 0.98, -0.42], c: 0x1c1c1e },
    { s: [0.3, 0.36, 0.48], p: [0, 1.14, -0.94], c: 0xefeee8 }, { s: [0.24, 0.2, 0.16], p: [0, 1.04, -1.2], c: 0xd9a8a0 }, { s: [0.32, 0.16, 0.2], p: [0, 1.3, -0.86], c: 0x1c1c1e },
    { s: [0.1, 0.05, 0.05], p: [-0.2, 1.3, -0.9], c: 0x1c1c1e }, { s: [0.1, 0.05, 0.05], p: [0.2, 1.3, -0.9], c: 0x1c1c1e },
    { s: [0.13, 0.7, 0.13], p: [-0.2, 0.35, -0.55], c: 0xefeee8 }, { s: [0.13, 0.7, 0.13], p: [0.2, 0.35, -0.55], c: 0xefeee8 }, { s: [0.13, 0.7, 0.13], p: [-0.2, 0.35, 0.55], c: 0x1c1c1e }, { s: [0.13, 0.7, 0.13], p: [0.2, 0.35, 0.55], c: 0xefeee8 },
    { s: [0.26, 0.16, 0.3], p: [0, 0.62, 0.36], c: 0xe0a8a8 }, { s: [0.04, 0.5, 0.04], p: [0, 0.9, 0.78], c: 0x1c1c1e },
  ]),
  fountain: () => boxes([{ s: [0.42, 0.9, 0.42], p: [0, 0.45, 0], c: STEEL }, { s: [0.5, 0.08, 0.5], p: [0, 0.94, 0], c: 0x7a838b }, { s: [0.04, 0.12, 0.04], p: [0.1, 1.04, 0], c: 0x5b6470 }, { s: [0.1, 0.03, 0.03], p: [0.05, 1.1, 0], c: 0x5b6470 }]),
  bin: () => boxes([{ cyl: [0.27, 0.78, 0.23], p: [0, 0.39, 0], c: 0x2f5a3c, r: Math.PI / 2 }, { cyl: [0.29, 0.06], p: [0, 0.8, 0], c: 0x24452e, r: Math.PI / 2 }, { s: [0.3, 0.1, 0.02], p: [0, 0.5, -0.26], c: 0xe9e2cc }]),
  breaker: () => boxes([{ s: [0.1, 1.6, 0.1], p: [0, 0.8, 0.08], c: 0x5b6470 }, { s: [0.56, 0.74, 0.22], p: [0, 1.3, 0], c: 0x8a9098 }, { s: [0.5, 0.1, 0.01], p: [0, 1.56, -0.115], c: 0xd9b93a }, { s: [0.06, 0.16, 0.05], p: [0.18, 1.24, -0.13], c: 0x24262a }, { s: [0.2, 0.2, 0.01], p: [-0.1, 1.24, -0.115], c: 0xc0392b }]),
  mailbox: () => boxes([
    { s: [0.08, 0.9, 0.08], p: [-0.18, 0.45, 0], c: 0x3a3c40 }, { s: [0.08, 0.9, 0.08], p: [0.18, 0.45, 0], c: 0x3a3c40 },
    { s: [0.34, 0.5, 0.32], p: [-0.18, 1.15, 0], c: 0x2f7a3c }, { s: [0.34, 0.5, 0.32], p: [0.18, 1.15, 0], c: 0xb5322b },
    { s: [0.22, 0.03, 0.02], p: [-0.18, 1.28, -0.165], c: 0x101114 }, { s: [0.22, 0.03, 0.02], p: [0.18, 1.28, -0.165], c: 0x101114 }, { s: [0.24, 0.05, 0.02], p: [0.18, 1.28, -0.17], c: 0xc9b98a },
    { s: [0.38, 0.06, 0.36], p: [-0.18, 1.42, 0], c: 0x24602e }, { s: [0.38, 0.06, 0.36], p: [0.18, 1.42, 0], c: 0x8a241e },
  ]),
  stele: () => boxes([{ s: [0.9, 0.22, 0.4], p: [0, 0.11, 0], c: 0x77746c }, { s: [0.7, 1.0, 0.2], p: [0, 0.72, 0], c: STONE }, { s: [0.5, 0.6, 0.01], p: [0, 0.78, -0.105], c: 0x6e6b63 }]),
  busstop: () => boxes([{ cyl: [0.035, 2.5], p: [0, 1.25, 0], c: STEEL, r: Math.PI / 2 }, { s: [0.5, 0.5, 0.03], p: [0, 2.3, 0], c: 0x2f6fb7 }, { s: [0.34, 0.2, 0.01], p: [0, 2.3, -0.02], c: 0xf1f2f4 }, { s: [0.36, 0.5, 0.03], p: [0, 1.5, 0], c: 0xe9e2cc }]),
  // 伍伯: the night guard. Navy jacket, cap, a torch in his hand; a little stooped.
  npc: () => boxes([
    { s: [0.14, 0.82, 0.16], p: [-0.09, 0.41, 0], c: 0x23262e }, { s: [0.14, 0.82, 0.16], p: [0.09, 0.41, 0], c: 0x23262e }, { s: [0.15, 0.07, 0.26], p: [-0.09, 0.035, -0.04], c: 0x101114 }, { s: [0.15, 0.07, 0.26], p: [0.09, 0.035, -0.04], c: 0x101114 },
    { s: [0.42, 0.58, 0.25], p: [0, 1.1, -0.02], c: NAVY, r: -0.1 }, { s: [0.1, 0.56, 0.11], p: [-0.26, 1.1, -0.03], c: NAVY }, { s: [0.1, 0.34, 0.11], p: [0.26, 1.2, -0.03], c: NAVY }, { s: [0.09, 0.09, 0.3], p: [0.26, 1.02, -0.18], c: NAVY },
    { sph: [0.045], p: [-0.26, 0.8, -0.03], c: SKIN }, { sph: [0.045], p: [0.26, 1.02, -0.34], c: SKIN }, { cyl: [0.03, 0.18, 0.04], p: [0.26, 1.02, -0.44], c: 0x24262a },
    { s: [0.1, 0.08, 0.1], p: [0, 1.42, -0.05], c: SKIN }, { sph: [0.105, 0.12, 0.11], p: [0, 1.55, -0.07], c: SKIN }, { sph: [0.112, 0.07, 0.115], p: [0, 1.63, -0.065], c: NAVY }, { s: [0.2, 0.02, 0.12], p: [0, 1.61, -0.19], c: 0x101114 },
    { s: [0.16, 0.03, 0.01], p: [0, 1.5, -0.175], c: 0xb9bcc0 }, { s: [0.05, 0.05, 0.01], p: [-0.12, 1.26, -0.165], c: 0xc9a43a },
  ]),
  bridge: () => boxes([   // a small offering of flowers left on the rail
    { cyl: [0.06, 0.24, 0.05], p: [0, 0.12, 0], c: 0x7c8fa0, r: Math.PI / 2 },
    { sph: [0.07], p: [0, 0.3, 0], c: 0xf2f0e6 }, { sph: [0.055], p: [0.07, 0.27, 0.03], c: 0xf2f0e6 }, { sph: [0.05], p: [-0.06, 0.28, -0.03], c: 0xe9d9a0 },
  ]),
};

const VERB = { fragment: '查看', bridge: '走上橋', shrine: '拜拜', lamp: '開燈', crate: '翻找', board: '看公告', bench: '坐下休息', bell: '敲鐘',
  booth: '拿起話筒', radio: '轉開', vending: '買飲料', bike: '騎上去', cat: '摸摸', cow: '摸摸', fountain: '喝水', bin: '翻找', breaker: '扳開關', mailbox: '查看', stele: '查看', busstop: '查看', npc: '說話' };
const NAME = { shrine: '土地公廟', lamp: '路燈開關', crate: '紙箱', board: '公佈欄', bench: '長椅', bell: '教堂的鐘', bridge: '女鬼橋',
  booth: '公共電話', radio: '收音機', vending: '販賣機', bike: '腳踏車', cat: '校園裡的貓', cow: '乳牛', fountain: '飲水機', bin: '垃圾桶', breaker: '配電箱', mailbox: '郵筒', stele: '石碑', busstop: '公車站牌', npc: '伍伯' };

// A bicycle mesh for the player to sit on while riding.
export function bikeMesh() { const m = new THREE.Mesh(geo('bike', G.bike), material()); m.castShadow = true; return m; }

export class Props {
  constructor(scene, terrain, world) {
    this.scene = scene; this.terrain = terrain; this.world = world;
    this.list = [];
    this.rng = mulberry32(2025);
    this.onMat = new THREE.MeshBasicMaterial({ color: 0xffe2a0, fog: false });
    this.offMat = new THREE.MeshStandardMaterial({ color: 0x3a3c40, roughness: 0.5 });
    // glow for story fragments (and the bridge once it is time)
    this.ringGeo = new THREE.RingGeometry(0.34, 0.42, 28).rotateX(-Math.PI / 2);
    this.beamGeo = new THREE.CylinderGeometry(0.02, 0.07, 7, 8, 1, true).translate(0, 3.5, 0);
    const c = document.createElement('canvas'); c.width = 4; c.height = 64;
    const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 64);
    gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,1)'); x.fillStyle = gr; x.fillRect(0, 0, 4, 64);
    this.glowMat = new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.85, depthWrite: false, fog: false });
    this.beamMat = new THREE.MeshBasicMaterial({ color: 0xbfe0ff, transparent: true, opacity: 0.4, alphaMap: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    // two real lights shared by whichever lit lamps are nearest
    this.lights = [0, 1].map(() => { const l = new THREE.PointLight(0xffd9a0, 0, 16, 1.4); scene.add(l); return l; });
    this._t = 0;
  }

  // Nearest clear ground between minR and maxR of (x, z).
  spot(x, z, minR, maxR, a0 = this.rng() * 6.283) {
    for (let d = minR; d <= maxR; d += 1.5) for (let k = 0; k < 10; k++) {
      const a = a0 + k * 0.63, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (this.terrain.inBounds(px, pz, 8) && !this.world.colliders.blocked(px, this.terrain.heightAt(px, pz) + 0.5, pz)) return { x: px, z: pz };
    }
    return null;
  }

  add(kind, x, z, { yaw = this.rng() * 6.283, data = {}, solid = 0, variant = kind, r = 2.3 } = {}) {
    const y = this.terrain.heightAt(x, z);
    const obj = new THREE.Group(); obj.position.set(x, y, z); obj.rotation.y = yaw;
    const mesh = new THREE.Mesh(geo(variant, G[variant]), material()); mesh.castShadow = true; obj.add(mesh);
    const p = { kind, x, y, z, yaw, r, data, obj, used: false, hidden: false, label: data.label || NAME[kind] || '', verb: VERB[kind] };
    if (kind === 'lamp') { p.head = new THREE.Mesh(geo('lampHead', G.lampHead), this.offMat); obj.add(p.head); p.lit = 0; }
    if (kind === 'fragment' || kind === 'bridge') {
      p.ring = new THREE.Mesh(this.ringGeo, this.glowMat); p.ring.position.y = 0.04; obj.add(p.ring);
      p.beam = new THREE.Mesh(this.beamGeo, this.beamMat); obj.add(p.beam);
    }
    if (solid) this.world.colliders.addCircle(x, z, solid, y + 2);
    obj.visible = false; this.scene.add(obj);
    this.list.push(p);
    return p;
  }

  // Scatter the generic props around campus. Deterministic, like the loot.
  populate(map, spawn) {
    const rng = this.rng, inCampus = this.world.inCampus;
    const near = (x, z, d, kind) => this.list.some((p) => (!kind || p.kind === kind) && Math.hypot(p.x - x, p.z - z) < d);

    // boxes and lockers against building walls
    for (const b of map.buildings) {
      if (rng() > 0.2) continue;
      let p = openRing(b.p); if (p.length < 6) continue;
      if (signedArea(p) < 0) { const q = []; for (let i = p.length - 2; i >= 0; i -= 2) q.push(p[i], p[i + 1]); p = q; }
      const i = Math.floor(rng() * (p.length / 2)) * 2, j = (i + 2) % p.length;
      const ex = p[j] - p[i], ez = p[j + 1] - p[i + 1], len = Math.hypot(ex, ez); if (len < 3) continue;
      const t = 0.2 + rng() * 0.6, x = p[i] + ex * t + ez / len * 0.75, z = p[i + 1] + ez * t - ex / len * 0.75;
      if (!this.terrain.inBounds(x, z, 8) || this.world.colliders.blocked(x, this.terrain.heightAt(x, z) + 0.5, z) || near(x, z, 3)) continue;
      const locker = rng() < 0.35;
      // back to the wall, facing out (model front is -z)
      this.add('crate', x, z, { yaw: Math.atan2(-ez / len, ex / len), variant: locker ? 'locker' : 'crate', solid: 0.32, data: { label: locker ? '置物櫃' : '紙箱' } });
    }

    // lamps and benches along campus roads
    const roads = map.roads.filter((r) => r.p.length >= 4 && ['residential', 'service', 'footway', 'pedestrian', 'path', 'steps'].includes(r.t));
    let tries = 0, lamps = 0, benches = 0;
    while ((lamps < 40 || benches < 26) && tries++ < 6000) {
      const r = roads[Math.floor(rng() * roads.length)], i = Math.floor(rng() * (r.p.length / 2 - 1)) * 2;
      const dx = r.p[i + 2] - r.p[i], dz = r.p[i + 3] - r.p[i + 1], l = Math.hypot(dx, dz); if (l < 2) continue;
      const k = rng(), side = rng() < 0.5 ? 1 : -1;
      const bench = lamps >= 40 || (benches < 26 && rng() < 0.4), off = bench ? 2.6 : 2.2;
      const x = r.p[i] + dx * k + dz / l * side * off, z = r.p[i + 1] + dz * k - dx / l * side * off;
      if (!inCampus(x, z) || !this.terrain.inBounds(x, z, 8) || this.world.colliders.blocked(x, this.terrain.heightAt(x, z) + 0.5, z)) continue;
      if (near(x, z, 5) || near(x, z, bench ? 70 : 60, bench ? 'bench' : 'lamp')) continue;
      // face the road
      const yaw = Math.atan2(dz / l * side, dx / l * side) + Math.PI / 2;
      if (bench) { this.add('bench', x, z, { yaw: yaw + Math.PI, solid: 0 }); benches++; } else { this.add('lamp', x, z, { yaw, solid: 0.12 }); lamps++; }
    }

    // shrines and notice boards at fixed places around campus
    const fixed = [
      ['shrine', -300, -150], ['shrine', -880, -200], ['shrine', -150, 60], ['shrine', 120, -40], ['shrine', 470, -200], ['shrine', -620, -60], ['shrine', 620, 240],
      ['board', -126, -56], ['board', -391, -23], ['board', -108, 132], ['board', -186, -310], ['board', -740, -120],
    ];
    let board = 0;
    for (const [kind, fx, fz] of fixed) {
      const s = this.spot(fx, fz, 2, 30); if (!s) continue;
      this.add(kind, s.x, s.z, { yaw: Math.atan2(-(spawn.x - s.x), -(spawn.z - s.z)), solid: kind === 'shrine' ? 0.7 : 0.25, data: kind === 'board' ? { rumor: board++ } : {} });
    }
    // the bell stands beside the chapel, a few steps from where you start
    const bx = spawn.x + spawn.dx * 9 + spawn.dz * 9, bz = spawn.z + spawn.dz * 9 - spawn.dx * 9;
    const bs = this.spot(bx, bz, 0, 8); if (bs) this.add('bell', bs.x, bs.z, { yaw: Math.atan2(-(spawn.x - bs.x), -(spawn.z - bs.z)), solid: 0.3 });
    // --- things that make the place feel lived in ---------------------------------
    const B = (name) => this.world.named.find((n) => n.name === name);
    const by = (name, fx, fz) => { const b = B(name); return b ? [b.x, b.z, b.r + 1.5] : [fx, fz, 2]; };
    const put = (kind, [x, z, r], opt = {}) => {
      const s = this.spot(x, z, r, r + 26); if (!s || near(s.x, s.z, 2.2)) return null;
      return this.add(kind, s.x, s.z, { yaw: Math.atan2(x - s.x, z - s.z), ...opt }); // back to the building, facing out
    };
    const sx = spawn.x, sz = spawn.z;
    const sites = {
      booth: [[sx - spawn.dx * 12 + spawn.dz * 10, sz - spawn.dz * 12 - spawn.dx * 10, 0], by('女生宿舍餐廳', -108, 132), [-767, -111, 34], by('東海大學郵局', -1034, -344), by('乳品小棧', 174, -65), by('男生餐廳', -186, -324), by('銘賢堂', -154, -23)],
      vending: [[sx - spawn.dx * 6 + spawn.dz * 12, sz - spawn.dz * 6 - spawn.dx * 12, 0], by('女生宿舍餐廳', -108, 132), by('男生餐廳', -186, -324), [-767, -111, 34], by('乳品小棧', 174, -65), [-391, -23, 24], by('東海大學郵局', -1034, -344), [-126, -56, 20], by('學生餐廳', 870, 10)],
      radio: [by('乳品小棧', 174, -65), [sx - spawn.dx * 9 - spawn.dz * 9, sz - spawn.dz * 9 + spawn.dx * 9, 0], by('男生餐廳', -186, -324), [686, 290, 6], by('女生宿舍餐廳', -108, 132)],
      fountain: [by('圖書館', -767, -111), by('銘賢堂', -154, -23), by('女生宿舍3棟', -186, 108), by('男生餐廳', -186, -324), [-391, -23, 26], by('乳品小棧', 174, -65), [-126, -56, 22]],
      breaker: [[-300, -60, 4], [-170, 120, 6], [-760, -140, 30], [-200, -300, 8], [150, -90, 10], [-980, -330, 12], [-560, -100, 12]],
      mailbox: [by('東海大學郵局', -1034, -344), [-391, -23, 26], by('女生宿舍餐廳', -108, 132), by('男生餐廳', -186, -324)],
      busstop: [[-97, -407, 2], [-805, -230, 2], [400, -456, 2], [-1000, -520, 2]],
    };
    for (const [kind, list] of Object.entries(sites)) for (const site of list) put(kind, site, { solid: { booth: 0.45, vending: 0.55, radio: 0.25, fountain: 0.25, breaker: 0.2, mailbox: 0.3, busstop: 0.08 }[kind] });
    [[-719, -92, 3], [-900, -235, 2], [-334, -188, 5], [sx + spawn.dx * 20 + spawn.dz * 13, sz + spawn.dz * 20 - spawn.dx * 13, 0], [560, -85, 4]].forEach((site, i) => put('stele', site, { solid: 0.35, data: { stele: i } }));

    // bicycles and bins along the roads
    let bikes = 0, bins = 0; tries = 0;
    const b0 = this.spot(sx - spawn.dx * 4 + spawn.dz * 6, sz - spawn.dz * 4 - spawn.dx * 6, 0, 6); if (b0) { this.add('bike', b0.x, b0.z, { r: 1.9 }); bikes++; }
    while ((bikes < 22 || bins < 34) && tries++ < 8000) {
      const r = roads[Math.floor(rng() * roads.length)], i = Math.floor(rng() * (r.p.length / 2 - 1)) * 2;
      const dx = r.p[i + 2] - r.p[i], dz = r.p[i + 3] - r.p[i + 1], l = Math.hypot(dx, dz); if (l < 2) continue;
      const k = rng(), side = rng() < 0.5 ? 1 : -1, bike = bikes < 22 && (bins >= 34 || rng() < 0.4);
      const x = r.p[i] + dx * k + dz / l * side * 2.4, z = r.p[i + 1] + dz * k - dx / l * side * 2.4;
      if (!inCampus(x, z) || !this.terrain.inBounds(x, z, 8) || this.world.colliders.blocked(x, this.terrain.heightAt(x, z) + 0.5, z)) continue;
      if (near(x, z, 4) || near(x, z, bike ? 90 : 55, bike ? 'bike' : 'bin')) continue;
      if (bike) { this.add('bike', x, z, { yaw: Math.atan2(-dx, -dz) + (rng() < 0.5 ? Math.PI : 0), r: 1.9 }); bikes++; }
      else { this.add('bin', x, z, { solid: 0.28 }); bins++; }
    }
    // cats around the dormitories and lawns, cows at the dairy and the pasture
    for (const [cx, cz] of [[-180, 120], [-300, 45], [-48, 34], [-140, 126], [-220, -50], [-760, -160], [-27, 160], [-390, -40], [150, -50]]) {
      const s = this.spot(cx, cz, 2, 30); if (s) this.add('cat', s.x, s.z, { r: 1.7, data: { home: [s.x, s.z], t: rng() * 5 } });
    }
    for (const [cx, cz, n] of [[564, -82, 4], [686, 290, 5]]) for (let i = 0; i < n; i++) {
      const s = this.spot(cx + (rng() - 0.5) * 50, cz + (rng() - 0.5) * 50, 0, 30); if (s && !near(s.x, s.z, 4)) this.add('cow', s.x, s.z, { r: 2.6, data: { home: [s.x, s.z], t: rng() * 8 } });
    }
    // 伍伯 starts by the chapel; quest.js moves him as the story goes on
    this.npc = this.add('npc', sx + spawn.dx * 3 + spawn.dz * 3, sz + spawn.dz * 3 - spawn.dx * 3, { r: 2.6 });
    this.npcLight = new THREE.PointLight(0xffe9c4, 0, 9, 1.5); this.scene.add(this.npcLight);
    const count = (k) => this.list.filter((p) => p.kind === k).length;
    return { crates: count('crate'), lamps, benches, bikes, bins, kinds: new Set(this.list.map((p) => p.kind)).size, total: this.list.length };
  }

  // Closest usable prop within reach of the player, or null.
  nearest(px, pz) {
    let best = null, bd = Infinity;
    for (const p of this.list) {
      if (p.hidden || (p.used && p.kind !== 'lamp')) continue;
      const d = Math.hypot(p.x - px, p.z - pz);
      if (d < p.r && d < bd) { bd = d; best = p; }
    }
    return best;
  }

  // Places ghosts will not enter: lit lamps, and the ground around a shrine.
  safeZones() {
    const out = [];
    for (const p of this.list) {
      if (p.kind === 'lamp' && p.lit > 0) out.push({ x: p.x, z: p.z, r: 10 });
      else if (p.kind === 'shrine') out.push({ x: p.x, z: p.z, r: 6 });
      else if (p.kind === 'npc' && !p.hidden) out.push({ x: p.x, z: p.z, r: 7 });   // she will not come near 伍伯
    }
    return out;
  }

  light(p, seconds) { p.lit = seconds; p.head.material = this.onMat; }

  // Put a prop somewhere else (伍伯 walking ahead of you, a bicycle left where you got off).
  move(p, x, z, yaw = p.yaw) {
    p.x = x; p.z = z; p.y = this.terrain.heightAt(x, z); p.yaw = yaw;
    p.obj.position.set(x, p.y, z); p.obj.rotation.y = yaw;
  }

  // Cats wander and bolt from anyone running at them; cows amble.
  _animals(dt, px, pz, time, running) {
    for (const p of this.list) {
      if (p.kind !== 'cat' && p.kind !== 'cow') continue;
      const d = Math.hypot(p.x - px, p.z - pz); if (d > 90) continue;
      const a = p.data, cat = p.kind === 'cat';
      if (cat && running && d < 4.5) { a.tx = p.x + (p.x - px) / (d || 1) * 9; a.tz = p.z + (p.z - pz) / (d || 1) * 9; a.t = 3; a.fast = 1; }
      else if ((a.t -= dt) <= 0) {
        a.t = (cat ? 3 : 7) + this.rng() * (cat ? 6 : 14); a.fast = 0;
        if (this.rng() < 0.6) { const an = this.rng() * 6.283, r = this.rng() * (cat ? 9 : 6); a.tx = a.home[0] + Math.cos(an) * r; a.tz = a.home[1] + Math.sin(an) * r; } else a.tx = undefined;
      }
      if (a.tx === undefined) continue;
      const dx = a.tx - p.x, dz = a.tz - p.z, l = Math.hypot(dx, dz);
      if (l < 0.25) { a.tx = undefined; continue; }
      const sp = (cat ? (a.fast ? 6 : 0.9) : 0.45) * dt, q = { x: p.x + dx / l * sp, z: p.z + dz / l * sp };
      this.world.colliders.resolve(q, 0.3);
      this.move(p, q.x, q.z, Math.atan2(-dx, -dz));
      p.obj.position.y += cat ? Math.abs(Math.sin(time * (a.fast ? 22 : 9))) * 0.025 : 0;
    }
  }

  update(dt, px, pz, time, running = false) {
    this._animals(dt, px, pz, time, running);
    let lit = [];
    for (const p of this.list) {
      if (p.kind === 'lamp' && p.lit > 0) {
        p.lit -= dt;
        if (p.lit <= 0) p.head.material = this.offMat;
        else { p._d = Math.hypot(p.x - px, p.z - pz); lit.push(p); if (p.lit < 5) p.head.material = Math.sin(time * 30) > 0 ? this.onMat : this.offMat; } // flickers before it dies
      }
      if (p.beam) { p.ring.rotation.y = time * 0.6; p.obj.children[0].position.y = Math.sin(time * 1.6 + p.x) * 0.04; }
    }
    lit.sort((a, b) => a._d - b._d);
    this.lights.forEach((l, i) => {
      const p = lit[i];
      if (p && p._d < 60) { l.intensity = p.lit < 5 && Math.sin(time * 30) < 0 ? 0 : 9; l.position.set(p.x - Math.sin(p.yaw) * 0.75, p.y + 3.9, p.z - Math.cos(p.yaw) * 0.75); }
      else l.intensity = 0;
    });
    if ((this._t -= dt) > 0) return;
    this._t = 0.35;
    for (const p of this.list) p.obj.visible = !p.hidden && Math.abs(p.x - px) < 150 && Math.abs(p.z - pz) < 150;
  }
}
