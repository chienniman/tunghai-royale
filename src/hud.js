import { Colliders } from './world/colliders.js';

const DIRS = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
const LANDMARKS = ['路思義教堂', '圖書館', '銘賢堂', '體育館', '東海放牧場', '相思林', '文理大道', '乳品小棧',
  '管理學院', '學生餐廳', '邦華游泳池', '東海大學郵局', '男生宿舍72棟', '省政研究大樓', '好學堂', '行政中心'];

export class HUD {
  constructor(world, terrain) {
    this.world = world; this.terrain = terrain;
    this.el = document.getElementById('hud');
    this.loc = document.getElementById('location');
    this.stats = document.getElementById('stats');
    this.mini = document.getElementById('minimap');
    this.mctx = this.mini.getContext('2d');
    this.big = document.getElementById('bigmap');
    this.bigCanvas = document.getElementById('bigmap-canvas');
    this.strip = document.getElementById('compass-strip');
    this.deg = document.getElementById('compass-deg');
    this.compassW = document.getElementById('compass').clientWidth || 520;
    this.pxPerDeg = 4;
    this._buildCompass();
    this.t = 0; this.frames = 0; this.fps = 0; this.fpsT = 0;
    this.places = this._places();
    this.lastLoc = '';
    this.extra = '';        // extra line under the stats
    this.markers = null;    // () => [{ x, z, color? }] drawn as dots on the maps (red by default)
    this.jam = 0;           // 1 = 鬼打牆: compass spins, minimap is useless
  }

  _buildCompass() {
    const html = [];
    for (let d = -180; d <= 540; d += 15) {
      const n = ((d % 360) + 360) % 360;
      if (n % 45 === 0) html.push(`<span class="major" style="left:${d * this.pxPerDeg}px">${DIRS[n / 45]}</span>`);
      else html.push(`<span style="left:${d * this.pxPerDeg}px">${n}</span>`);
      html.push(`<span class="tick" style="left:${d * this.pxPerDeg}px"></span>`);
    }
    this.strip.innerHTML = html.join('');
  }

  _places() {
    const out = [];
    for (const b of this.world.named) out.push({ name: b.name, x: b.x, z: b.z, r: b.r + 25, pri: 2 });
    for (const a of this.world.map.areas) if (a.n) {
      let x = 0, z = 0; const n = a.p.length / 2; for (let i = 0; i < a.p.length; i += 2) { x += a.p[i]; z += a.p[i + 1]; }
      out.push({ name: a.n, x: x / n, z: z / n, poly: a.p, pri: 1 });
    }
    for (const r of this.world.map.roads) if (r.n) {
      for (let i = 0; i < r.p.length; i += 2) out.push({ name: r.n, x: r.p[i], z: r.p[i + 1], r: 12, pri: 2.5 });
    }
    return out;
  }

  locate(x, z) {
    let best = null, bd = Infinity;
    for (const p of this.places) {
      if (p.poly) { if (Colliders.pointInPoly(p.poly, x, z) && (!best || best.pri <= p.pri)) { best = p; bd = 0; } continue; }
      const d = Math.hypot(p.x - x, p.z - z);
      if (d < p.r && (d - p.pri * 30) < bd) { bd = d - p.pri * 30; best = p; }
    }
    if (best) return best.name;
    return this.world.inCampus(x, z) ? '東海大學' : '大度山';
  }

  update(dt, player, fpsDt) {
    this.frames++; this.fpsT += fpsDt;
    if (this.fpsT >= 0.5) { this.fps = Math.round(this.frames / this.fpsT); this.frames = 0; this.fpsT = 0; }
    let heading = ((-player.yaw * 180 / Math.PI) % 360 + 360) % 360;
    if (this.jam) heading = (heading + performance.now() * 0.31 + Math.sin(performance.now() / 370) * 140 + 3600) % 360;
    this.strip.style.transform = `translateX(${this.compassW / 2 - heading * this.pxPerDeg}px)`;
    this.deg.textContent = Math.round(heading) + '°';

    this.t += dt;
    if (this.t > 0.25) {
      this.t = 0;
      const name = this.locate(player.pos.x, player.pos.z);
      if (name !== this.lastLoc) { this.loc.textContent = name; this.lastLoc = name; }
      this.stats.innerHTML = `${this.extra ? this.extra + '<br>' : ''}海拔 ${player.pos.y.toFixed(1)} m · ${this.fps} FPS`;
    }
    this._drawMini(player);
    if (!this.big.classList.contains('hidden')) this._drawBig(player);
  }

  _toPx(x, z, s) { return [(x - this.terrain.minX) * s, (z - this.terrain.minZ) * s]; }

  _drawMini(player) {
    const ctx = this.mctx, W = this.mini.width, src = this.world.groundCanvas;
    const s = src.width / this.terrain.width;     // canvas px per metre
    const view = 300;                                 // metres across
    const [cx, cz] = this._toPx(player.pos.x, player.pos.z, s);
    ctx.fillStyle = '#222'; ctx.fillRect(0, 0, W, W);
    ctx.drawImage(src, cx - view * s / 2, cz - view * s / 2, view * s, view * s, 0, 0, W, W);
    if (this.markers) {
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
      for (const m of this.markers()) {
        ctx.fillStyle = m.color || '#ff3b2a';
        const x = W / 2 + (m.x - player.pos.x) / view * W, y = W / 2 + (m.z - player.pos.z) / view * W;
        if (x < 0 || y < 0 || x > W || y > W) continue;
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
    }
    if (this.jam) { // static
      ctx.fillStyle = 'rgba(8,10,14,.82)'; ctx.fillRect(0, 0, W, W);
      for (let i = 0; i < 90; i++) { const v = (Math.random() * 150) | 0; ctx.fillStyle = `rgba(${v},${v},${v},.5)`; ctx.fillRect(Math.random() * W, Math.random() * W, 2 + Math.random() * 26, 1.5); }
      return;
    }
    this._arrow(ctx, W / 2, W / 2, player.yaw, 7);
  }

  _arrow(ctx, x, y, yaw, r) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-yaw);
    ctx.fillStyle = '#f2d27a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -r * 1.4); ctx.lineTo(r, r); ctx.lineTo(0, r * 0.4); ctx.lineTo(-r, r); ctx.closePath();
    ctx.fill(); ctx.stroke(); ctx.restore();
  }

  toggleBig() {
    this.big.classList.toggle('hidden');
    if (!this.big.classList.contains('hidden')) {
      const src = this.world.groundCanvas;
      this.bigCanvas.width = 1400; this.bigCanvas.height = Math.round(1400 * src.height / src.width);
    }
  }

  _drawBig(player) {
    const ctx = this.bigCanvas.getContext('2d'), src = this.world.groundCanvas;
    const W = this.bigCanvas.width, H = this.bigCanvas.height, s = W / this.terrain.width;
    ctx.drawImage(src, 0, 0, W, H);
    if (this.world.map.campus) {
      ctx.strokeStyle = 'rgba(242,210,122,.8)'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.beginPath();
      const p = this.world.map.campus;
      for (let i = 0; i < p.length; i += 2) { const [x, y] = this._toPx(p[i], p[i + 1], s); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.font = 'bold 14px "Microsoft JhengHei", sans-serif'; ctx.textAlign = 'center';
    const seen = new Set();
    for (const p of this.places) {
      if (!LANDMARKS.includes(p.name) || seen.has(p.name)) continue; seen.add(p.name);
      const [x, y] = this._toPx(p.x, p.z, s);
      ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillText(p.name, x + 1, y + 1);
      ctx.fillStyle = '#fff'; ctx.fillText(p.name, x, y);
    }
    if (this.markers) for (const m of this.markers()) {
      const [x, y] = this._toPx(m.x, m.z, s);
      ctx.fillStyle = m.color || '#ff3b2a'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    const [px, py] = this._toPx(player.pos.x, player.pos.z, s);
    this._arrow(ctx, px, py, player.yaw, 9);
  }
}
