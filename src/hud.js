import { Colliders } from './world/colliders.js';
import { WEAPONS, AMMO, HEALS, ITEMS } from './game/items.js';

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
    this.targets = null;
    this.zone = null;
    this._initCombat();
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
    const heading = ((-player.yaw * 180 / Math.PI) % 360 + 360) % 360;
    this.strip.style.transform = `translateX(${this.compassW / 2 - heading * this.pxPerDeg}px)`;
    this.deg.textContent = Math.round(heading) + '°';

    this.t += dt;
    if (this.t > 0.25) {
      this.t = 0;
      const cw = this.strip.parentElement.clientWidth; if (cw) this.compassW = cw;   // may have been measured while hidden
      const name = this.locate(player.pos.x, player.pos.z);
      if (name !== this.lastLoc) { this.loc.textContent = name; this.lastLoc = name; }
      this.stats.innerHTML = `海拔 ${player.pos.y.toFixed(1)} m<br>${this.fps} FPS`;
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
    if (this.zone && this.zone.active) {
      const k = W / view;
      this._drawZone(ctx, W, W, (x, z) => [(x - player.pos.x) * k + W / 2, (z - player.pos.z) * k + W / 2], k, player);
    }
    this._arrow(ctx, W / 2, W / 2, player.yaw, 7);
  }

  // Blue = where the wall is now (everything outside it is shaded), white = the next safe circle.
  _drawZone(ctx, W, H, toPx, k, player) {
    const z = this.zone;
    const [cx, cy] = toPx(z.x, z.z);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(cx, cy, Math.max(0.5, z.r * k), 0, Math.PI * 2, true);
    ctx.fillStyle = 'rgba(40,100,255,.28)'; ctx.fill('evenodd');
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(0.5, z.r * k), 0, Math.PI * 2);
    ctx.strokeStyle = '#4f9bff'; ctx.lineWidth = 2; ctx.stroke();
    if (z.next) {
      const [nx, ny] = toPx(z.next.x, z.next.z);
      ctx.beginPath(); ctx.arc(nx, ny, Math.max(0.5, z.next.r * k), 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 1.5; ctx.stroke();
      // not inside the next circle yet: dashed line pointing the way
      const d = Math.hypot(player.pos.x - z.next.x, player.pos.z - z.next.z);
      if (d > z.next.r) {
        const [px, py] = toPx(player.pos.x, player.pos.z);
        const e = (d - z.next.r) / d;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (nx - px) * e, py + (ny - py) * e);
        ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
      }
    }
    ctx.restore();
  }

  updateZone(zone, player) {
    this.zone = zone;
    if (!this.zoneEl) {
      this.zoneEl = document.getElementById('zone'); this.zoneText = document.getElementById('zone-text');
      this.zoneFill = document.getElementById('zone-fill'); this.zoneFx = document.getElementById('zonefx');
    }
    this._set('zoneOn', zone.active, (v) => this.zoneEl.classList.toggle('hidden', !v));
    if (!zone.active) { this._set('zoneOut', false, () => { this.zoneFx.style.opacity = 0; }); return; }
    const out = zone.outside(player.pos.x, player.pos.z) > 0;
    const mmss = (s) => { s = Math.ceil(s); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
    let text;
    if (out) text = `你在毒圈外！每秒 -${zone.dps} 生命`;
    else if (zone.state === 'done') text = '最後一圈';
    else {
      const toNext = zone.next ? Math.hypot(player.pos.x - zone.next.x, player.pos.z - zone.next.z) - zone.next.r : -1;
      const where = toNext > 0 ? ` · 距安全區 ${Math.round(toNext)} m` : '';
      text = zone.state === 'wait' ? `第 ${zone.phase + 1} 圈 · ${mmss(zone.remaining)} 後縮圈${where}` : `毒圈縮小中 ${mmss(zone.remaining)}${where}`;
    }
    this._set('zoneText', text, (v) => { this.zoneText.textContent = v; });
    this._set('zoneCls', (out ? 'danger ' : '') + (zone.state === 'shrink' ? 'shrink' : ''), (v) => { this.zoneEl.className = v; });
    this._set('zoneBar', Math.round(zone.remaining / zone.total * 100), (v) => { this.zoneFill.style.width = v + '%'; });
    this._set('zoneOut', out, (v) => { this.zoneFx.style.opacity = v ? 1 : 0; });
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
    if (this.targets) {   // practice targets
      for (const t of this.targets.list) {
        const [x, y] = this._toPx(t.x, t.z, s);
        ctx.fillStyle = t.down ? 'rgba(255,255,255,.35)' : '#ff7a2a';
        ctx.beginPath(); ctx.arc(x, y, 3, 0, 6.3); ctx.fill();
      }
    }
    const [px, py] = this._toPx(player.pos.x, player.pos.z, s);
    if (this.zone && this.zone.active) this._drawZone(ctx, W, H, (x, z) => this._toPx(x, z, s), s, player);
    this._arrow(ctx, px, py, player.yaw, 9);
  }

  // ---------------------------------------------------------------- v0.2 combat HUD
  _initCombat() {
    const $ = (id) => document.getElementById(id);
    this.c = {
      cross: $('crosshair'), hit: $('hitmarker'), prompt: $('prompt'), cast: $('cast'), castLabel: $('cast-label'), castFill: $('cast-fill'),
      feed: $('feed'), slots: $('slots'), wname: $('weapon-name'), ammo: $('ammo'), heal: $('heal-line'), hp: $('hp-fill'), boost: $('boost-fill'),
      inv: $('inventory'), scope: $('scope'), hurt: $('hurt'), score: $('score'),
    };
    this.last = {};
    this.hurtT = 0;
  }

  // Only touch the DOM when a value actually changed.
  _set(key, value, apply) { if (this.last[key] !== value) { this.last[key] = value; apply(value); } }

  updateCombat(dt, combat, player, rig, input) {
    const c = this.c, def = combat.def, w = combat.weapon;

    // crosshair: the gap shows the real cone of fire
    const gap = def ? Math.max(3, Math.round(Math.tan(combat.spread) / Math.tan(rig.fov * Math.PI / 360) * innerHeight / 2)) : 0;
    this._set('gap', gap, (v) => c.cross.style.setProperty('--gap', v + 'px'));
    this._set('crossMode', rig.scoped ? 'scope' : !def ? 'unarmed' : (player.sprinting || combat.swap > 0 || combat.reload) ? 'busy' : 'armed', (v) => {
      c.cross.className = v === 'unarmed' ? 'unarmed' : '';
      c.cross.style.display = v === 'scope' ? 'none' : '';
      c.cross.style.opacity = v === 'busy' ? 0.35 : 1;
      c.scope.classList.toggle('hidden', v !== 'scope');
    });
    this._set('hitO', Math.round(Math.min(1, combat.hitT / 0.12) * 10) / 10, (v) => { c.hit.style.opacity = v; });
    this._set('hitC', combat.hitKill ? 'kill' : combat.hitHead ? 'head' : '', (v) => { c.hit.className = v; });

    // weapon + ammo
    const name = !w ? '徒手' : combat.reload ? `${def.name} · 換彈中…` : def.name;
    this._set('wname', name, (v) => { c.wname.textContent = v; });
    const ammo = w ? `${w.loaded}|${combat.ammo[def.ammo]}` : '';
    this._set('ammo', ammo, () => {
      c.ammo.innerHTML = w ? `<b class="${w.loaded <= def.mag * 0.25 ? 'low' : ''}">${w.loaded}</b> / ${combat.ammo[def.ammo]}` : '';
    });

    // weapon slots
    const slotSig = combat.slots.map((s, i) => (s ? s.id + ':' + s.loaded : '-') + (i === combat.cur ? '*' : '')).join('|');
    this._set('slots', slotSig, () => {
      c.slots.innerHTML = combat.slots.map((s, i) => s
        ? `<div class="${i === combat.cur ? 'on' : ''}"><span><b>${i + 1}</b>${WEAPONS[s.id].name}</span><span class="n">${s.loaded}</span></div>`
        : `<div class="empty"><span><b>${i + 1}</b>${i === 2 ? '副武器' : '主武器'}</span><span></span></div>`).join('');
    });

    // healing items
    const h = combat.heals;
    this._set('heals', `${h.bandage}|${h.medkit}|${h.drink}`, () => {
      c.heal.innerHTML = Object.keys(HEALS).map((id, i) =>
        `<span class="${h[id] ? '' : 'none'}"><b>${i + 4}</b>${HEALS[id].name} ×${h[id]}</span>`).join('');
    });

    // health
    const hp = Math.ceil(player.hp);
    this._set('hp', hp, (v) => { c.hp.style.width = v + '%'; c.hp.className = v <= 25 ? 'low' : v <= 50 ? 'mid' : ''; });
    this._set('boost', Math.round(player.boost), (v) => { c.boost.style.width = v + '%'; });
    this.hurtT = Math.max(0, this.hurtT - dt);
    const hurt = Math.min(1, this.hurtT * 2 + (player.hp < 30 ? (30 - player.hp) / 60 : 0));
    this._set('hurt', Math.round(hurt * 20) / 20, (v) => { c.hurt.style.opacity = v; });

    // pick-up prompt
    const it = combat.nearby;
    const prompt = it ? `${ITEMS[it.id].name}${ITEMS[it.id].kind !== 'weapon' && it.count > 1 ? ' ×' + it.count : ''}` : '';
    this._set('prompt', prompt, (v) => { c.prompt.innerHTML = v ? `<b>E</b>撿起 ${v}` : ''; });

    // heal progress
    const cast = combat.cast;
    this._set('casting', !!cast, (v) => c.cast.classList.toggle('hidden', !v));
    if (cast) {
      this._set('castLabel', `使用${HEALS[cast.id].name} ${(cast.total - cast.t).toFixed(1)} 秒`, (v) => { c.castLabel.textContent = v; });
      c.castFill.style.width = (cast.t / cast.total * 100).toFixed(1) + '%';
    }

    // message feed + score
    this._set('feed', combat.feed.map((f) => f.text).join('\n'), () => {
      c.feed.innerHTML = combat.feed.map((f) => `<div>${f.text}</div>`).join('');
    });
    const acc = combat.shots ? Math.round(combat.hits / combat.shots * 100) : 0;
    this._set('score', `${this.targets ? this.targets.downed : 0}|${acc}`, () => {
      c.score.textContent = `擊倒靶子 ${this.targets ? this.targets.downed : 0} · 命中率 ${acc}%`;
    });

    // backpack (hold Tab)
    const open = input.down('Tab');
    this._set('inv', open, (v) => c.inv.classList.toggle('hidden', !v));
    if (open) {
      const sig = slotSig + JSON.stringify(combat.ammo) + JSON.stringify(h);
      this._set('invBody', sig, () => {
        const row = (a, b, none) => `<div class="row${none ? ' none' : ''}"><span>${a}</span><span>${b}</span></div>`;
        c.inv.innerHTML = '<h3>背包</h3><h4>武器</h4>' +
          combat.slots.map((s, i) => s ? row(`${i + 1}　${WEAPONS[s.id].name}`, `${s.loaded} / ${WEAPONS[s.id].mag}`) : row(`${i + 1}　（空）`, '', true)).join('') +
          '<h4>彈藥</h4>' + Object.keys(AMMO).map((a) => row(AMMO[a].name, combat.ammo[a], !combat.ammo[a])).join('') +
          '<h4>補給</h4>' + Object.keys(HEALS).map((id, i) => row(`${i + 4}　${HEALS[id].name}`, '×' + h[id], !h[id])).join('');
      });
    }
  }
}
