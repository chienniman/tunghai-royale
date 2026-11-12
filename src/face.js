import * as THREE from 'three';
import { mulberry32 } from './util.js';

// Painted faces for the dead. The rule (borrowed from every horror game that gets
// this right) is "almost human, slightly wrong": soft shading instead of hard shapes,
// real eyes set a little too far apart and open a little too wide, no brows, and a
// mouth that is merely open rather than cartoonishly unhinged.
//
// The canvas is an equirectangular map for a THREE.SphereGeometry whose face looks
// down -z, which puts the middle of the face at u = 0.75.
const W = 1024, H = 512, CX = W * 0.75, CY = H * 0.5;

function soft(ctx, x, y, rx, ry, color, alpha) {
  ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, color.replace('A', alpha)); g.addColorStop(1, color.replace('A', 0));
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function eye(ctx, x, y, { open, iris, look, veins, rng, lid = '#1b1014' }) {
  const rx = 27, ry = open;
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath(); ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
  const g = ctx.createRadialGradient(0, 0, 4, 0, 0, rx);
  g.addColorStop(0, '#d8d3c4'); g.addColorStop(0.7, '#c2b6a4'); g.addColorStop(1, '#8a5a52');
  ctx.fillStyle = g; ctx.fillRect(-rx, -ry, rx * 2, ry * 2);
  ctx.strokeStyle = 'rgba(150,30,25,.55)'; ctx.lineWidth = 1;
  for (let i = 0; i < veins; i++) { // bloodshot
    const s = rng() < 0.5 ? -1 : 1, y0 = (rng() - 0.5) * ry * 1.6;
    ctx.beginPath(); ctx.moveTo(s * rx, y0);
    ctx.bezierCurveTo(s * rx * 0.7, y0 + (rng() - 0.5) * 8, s * rx * 0.5, (rng() - 0.5) * 10, s * (iris + 2 + rng() * 6), (rng() - 0.5) * 8); ctx.stroke();
  }
  const ig = ctx.createRadialGradient(look[0], look[1], 1, look[0], look[1], iris);
  ig.addColorStop(0, '#000'); ig.addColorStop(0.45, '#050303'); ig.addColorStop(0.8, '#2a1712'); ig.addColorStop(1, '#0c0605');
  ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(look[0], look[1], iris, 0, Math.PI * 2); ctx.fill();
  // heavy shadow under the upper lid: the eye sits deep in the head
  const sg = ctx.createLinearGradient(0, -ry, 0, ry * 0.4);
  sg.addColorStop(0, 'rgba(10,4,6,.85)'); sg.addColorStop(1, 'rgba(10,4,6,0)');
  ctx.fillStyle = sg; ctx.fillRect(-rx, -ry, rx * 2, ry * 1.4);
  ctx.restore();
  ctx.strokeStyle = lid; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(120,40,40,.7)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI); ctx.stroke();
}

// kind: 'calm' | 'scream'. opts: { skin, tint } for the other dead things.
export function faceTexture(kind, { skin = '#b4b8b2', seed = 3, bruise = 'rgba(46,22,48,A)' } = {}) {
  const rng = mulberry32(seed + (kind === 'scream' ? 0 : 0));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx.roundRect) ctx.roundRect = (x, y, w, h) => ctx.rect(x, y, w, h); // older Safari
  ctx.fillStyle = skin; ctx.fillRect(0, 0, W, H);
  // mottled, bloodless skin
  for (let i = 0; i < 520; i++) {
    const col = ['rgba(92,108,128,A)', 'rgba(120,96,128,A)', 'rgba(210,214,206,A)', 'rgba(96,112,96,A)'][(rng() * 4) | 0];
    soft(ctx, CX + (rng() - 0.5) * 520, CY + (rng() - 0.5) * 460, 8 + rng() * 34, 8 + rng() * 34, col, 0.05 + rng() * 0.07);
  }
  const scream = kind === 'scream';
  const ex = 88, ey = -22;                    // eyes: a touch too far apart
  // hollows: temples, cheeks, around the eyes, under the lip
  soft(ctx, CX - 150, CY + 10, 90, 150, 'rgba(30,34,44,A)', 0.55); soft(ctx, CX + 150, CY + 10, 90, 150, 'rgba(30,34,44,A)', 0.55);
  soft(ctx, CX - 96, CY + 66, 44, 60, 'rgba(40,38,52,A)', 0.42); soft(ctx, CX + 96, CY + 66, 44, 60, 'rgba(40,38,52,A)', 0.42);
  soft(ctx, CX - ex, CY + ey, 62, 50, bruise, 0.9); soft(ctx, CX + ex, CY + ey, 62, 50, bruise, 0.9);
  soft(ctx, CX - ex, CY + ey + 10, 40, 30, 'rgba(0,0,0,A)', 0.55); soft(ctx, CX + ex, CY + ey + 10, 40, 30, 'rgba(0,0,0,A)', 0.55);
  soft(ctx, CX, CY + 150, 70, 34, 'rgba(30,30,40,A)', 0.4);
  // eyes: wide, staring slightly upwards so white shows beneath the iris; one pupil drifts
  eye(ctx, CX - ex, CY + ey, { open: scream ? 21 : 16, iris: scream ? 8 : 10, look: [scream ? 1 : 2, scream ? -5 : -3], veins: scream ? 16 : 9, rng });
  eye(ctx, CX + ex, CY + ey, { open: scream ? 22 : 17, iris: scream ? 7.5 : 10, look: [scream ? -5 : -4, scream ? -6 : -2], veins: scream ? 16 : 9, rng });
  // nose: barely there
  soft(ctx, CX - 13, CY + 26, 12, 34, 'rgba(40,36,46,A)', 0.35); soft(ctx, CX + 13, CY + 26, 12, 34, 'rgba(40,36,46,A)', 0.3);
  ctx.fillStyle = 'rgba(14,8,10,.8)';
  ctx.beginPath(); ctx.ellipse(CX - 9, CY + 50, 4.5, 3, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(CX + 9, CY + 50, 4.5, 3, -0.3, 0, Math.PI * 2); ctx.fill();
  // mouth
  const my = CY + 100;
  if (scream) {
    soft(ctx, CX, my + 14, 60, 62, 'rgba(34,10,14,A)', 0.75);
    ctx.save(); ctx.beginPath(); ctx.ellipse(CX, my + 14, 30, 42, 0, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createRadialGradient(CX, my + 22, 2, CX, my + 14, 44);
    g.addColorStop(0, '#000'); g.addColorStop(0.7, '#090203'); g.addColorStop(1, '#3a0d10');
    ctx.fillStyle = g; ctx.fillRect(CX - 40, my - 40, 80, 110);
    ctx.fillStyle = '#a89f86';                         // teeth, uneven, partly in shadow
    for (let i = -3; i <= 3; i++) { const h = 9 + ((i * 7) & 3); ctx.beginPath(); ctx.roundRect(CX + i * 8.2 - 3.6, my - 27 - Math.abs(i) * 0.4, 7.2, h, 2); ctx.fill(); }
    ctx.fillStyle = 'rgba(150,140,120,.55)';
    for (let i = -3; i <= 3; i++) { const h = 7 + ((i * 5) & 3); ctx.beginPath(); ctx.roundRect(CX + i * 7.4 - 3.2, my + 52 - h + Math.abs(i) * -1.4, 6.4, h, 2); ctx.fill(); }
    ctx.restore();
    ctx.strokeStyle = 'rgba(60,18,24,.9)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(CX, my + 14, 31, 43, 0, 0, Math.PI * 2); ctx.stroke();
  } else {
    // closed, a few millimetres too wide, corners not quite level
    soft(ctx, CX, my, 66, 16, 'rgba(34,14,22,A)', 0.5);
    ctx.strokeStyle = '#1c090d'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(CX - 54, my - 5); ctx.bezierCurveTo(CX - 26, my + 5, CX + 20, my + 4, CX + 57, my - 9); ctx.stroke();
    ctx.strokeStyle = 'rgba(96,44,56,.55)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(CX - 40, my + 6); ctx.bezierCurveTo(CX - 14, my + 13, CX + 16, my + 12, CX + 42, my + 4); ctx.stroke();
  }
  // something dark has run from the eyes and the corner of the mouth, and dried
  const drip = (x, y, len, w, a) => {
    const g = ctx.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, `rgba(48,6,8,${a})`); g.addColorStop(0.7, `rgba(40,4,6,${a * 0.7})`); g.addColorStop(1, 'rgba(40,4,6,0)');
    ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 3, y + len * 0.3, x - 4, y + len * 0.6, x + 1, y + len); ctx.stroke();
  };
  drip(CX - ex - 6, CY + ey + 14, scream ? 150 : 96, 4, 0.75); drip(CX + ex + 9, CY + ey + 15, scream ? 120 : 60, 3, 0.7);
  if (scream) { drip(CX - ex + 9, CY + ey + 15, 90, 2.5, 0.6); drip(CX - 22, my + 50, 70, 4, 0.7); drip(CX + 14, my + 52, 46, 3, 0.6); }
  else drip(CX + 52, my - 6, 58, 3, 0.65);
  // hairline cracks and dark veins
  ctx.strokeStyle = 'rgba(30,26,40,.5)'; ctx.lineWidth = 1.1;
  for (let i = 0; i < 9; i++) {
    let x = CX + (rng() - 0.5) * 300, y = CY - 150 + rng() * 90;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (rng() - 0.5) * 22; y += 8 + rng() * 16; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  // shadow of the hair across the brow
  const hg = ctx.createLinearGradient(0, CY - 200, 0, CY - 90);
  hg.addColorStop(0, 'rgba(0,0,0,.95)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, CY - 90);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
