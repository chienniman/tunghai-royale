import { ITEMS, CONSUMABLES, AMMO_NAMES, AMMO_ITEM, stackLabel, tierOf } from './items.js';
import { weaponIcon } from './models.js';

const $ = (id) => document.getElementById(id);
const KEY_LABEL = Object.fromEntries(CONSUMABLES.map((id) => [id, ITEMS[id].key.replace('Digit', '')]));
const GEAR_ICON = {
  helmet: '<svg viewBox="0 0 24 24"><path d="M3 14a9 9 0 0 1 18 0v3h-6v-3H3z"/></svg>',
  vest: '<svg viewBox="0 0 24 24"><path d="M7 3l2 3h6l2-3 3 2-2 5v11H6V10L4 5z"/></svg>',
  pack: '<svg viewBox="0 0 24 24"><path fill-rule="evenodd" d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2a3 3 0 0 1 3 3v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a3 3 0 0 1 3-3zm1 7h6v4H9z"/></svg>',
};

// Health, weapons, pickup prompts, hit feedback and the backpack panel.
export class CombatHUD {
  constructor(inv, player) {
    this.inv = inv; this.player = player;
    this.el = {
      hp: $('hp-fill'), hpText: $('hp-text'), boost: $('boost-fill'), gear: $('gear'),
      weapons: $('weapons'), quick: $('quick'), pickup: $('pickup'), progress: $('progress'),
      progressFill: $('progress-fill'), progressText: $('progress-text'), cross: $('crosshair'),
      hit: $('hitmarker'), toast: $('toast'), feed: $('killfeed'), vignette: $('vignette'), dmgDir: $('dmg-dir'),
      target: $('target'), targetFill: $('target-fill'), targetName: $('target-name'), scope: $('scope'),
      inv: $('inventory'), invBody: $('inv-body'), death: $('death'), deathText: $('death-text'),
      clock: $('clock'), scare: $('scare'),
    };
    this.scareT = 0;
    this.toastT = 0; this.hitT = 0; this.targetT = 0; this.vigT = 0; this.dirT = 0; this.dirFrom = null;
    this.feed = [];
    this._sig = {};
    this.invOpen = false;
    this.onInvAction = null; // (action, arg) => void
    this.el.invBody.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      e.preventDefault();
      this.onInvAction?.(b.dataset.act, b.dataset.arg);
    });
  }

  _set(key, el, html) { if (this._sig[key] !== html) { this._sig[key] = html; el.innerHTML = html; } }

  toast(msg) { this.el.toast.textContent = msg; this.toastT = 1.6; }

  hitmarker(kind) {
    const h = this.el.hit;
    h.className = 'show ' + kind; this.hitT = kind === 'kill' ? 0.35 : 0.18;
  }

  showTarget(name, frac) {
    this.el.targetName.textContent = name;
    this.el.targetFill.style.width = Math.max(0, frac * 100).toFixed(0) + '%';
    this.targetT = 2.2;
  }

  kill(text) {
    this.feed.push({ text, t: 5 });
    if (this.feed.length > 4) this.feed.shift();
    this._feed();
  }
  _feed() { this._set('feed', this.el.feed, this.feed.map((f) => `<div>${f.text}</div>`).join('')); }

  // Flash the screen edge and point at where the damage came from.
  damaged(amount, info) {
    this.vigT = Math.min(1, 0.35 + amount / 40);
    if (info && info.x !== undefined) { this.dirFrom = { x: info.x, z: info.z }; this.dirT = 1.2; }
  }

  // Blackout flash when a ghost gets in your face.
  scare() { this.scareT = 0.75; }

  setClock(text, night) {
    this._set('clock', this.el.clock.lastElementChild, text);
    if (this._night !== night) { this._night = night; this.el.clock.classList.toggle('night', night); }
  }

  showDeath(text) { this.el.deathText.innerHTML = text; this.el.death.classList.remove('hidden'); }
  hideDeath() { this.el.death.classList.add('hidden'); }

  setInventoryOpen(open) {
    this.invOpen = open;
    this.el.inv.classList.toggle('hidden', !open);
    this._sig.inv = null;
  }

  update(dt, combat, camera) {
    const p = this.player, inv = this.inv, el = this.el;

    // --- vitals ---
    el.hp.style.width = p.hp.toFixed(1) + '%';
    el.hp.className = p.hp <= 25 ? 'low' : p.hp <= 50 ? 'mid' : '';
    el.hpText.textContent = Math.ceil(p.hp);
    el.boost.style.width = p.boost.toFixed(1) + '%';
    const gear = [];
    for (const k of ['helmet', 'vest', 'pack']) {
      const g = inv[k];
      if (!g) { gear.push(`<span class="g none">${GEAR_ICON[k]}</span>`); continue; }
      const d = ITEMS[g.id];
      const dur = d.dur ? `<i style="width:${Math.round(100 * g.dur / d.dur)}%"></i>` : '';
      gear.push(`<span class="g t${d.lv}">${GEAR_ICON[k]}<small>${d.lv}</small>${dur}</span>`);
    }
    gear.push(`<span class="cap">${inv.weight.toFixed(0)} / ${inv.capacity}</span>`);
    this._set('gear', el.gear, gear.join(''));

    // --- weapons ---
    const cur = inv.weaponSlot;
    const ws = [cur
      ? `<div id="ammo"><span class="cur${cur.ammo === 0 ? ' out' : ''}">${cur.ammo}</span><span class="res">/ ${inv.ammo[ITEMS[cur.id].ammoType]}</span></div>`
      : '<div id="ammo"></div>'];
    inv.slots.forEach((s, i) => {
      const act = inv.active === i ? ' active' : '';
      if (!s) { ws.push(`<div class="w empty${act}" data-slot="${i}"><b>${i + 1}</b><div class="ico"></div><div class="meta"><span class="name">—</span></div></div>`); return; }
      const d = ITEMS[s.id];
      ws.push(`<div class="w t${d.tier}${act}" data-slot="${i}"><b>${i + 1}</b><div class="ico">${weaponIcon(s.id)}</div><div class="meta"><span class="name">${d.name}</span><span class="cal">${AMMO_NAMES[d.ammoType]} · ${s.ammo}</span></div></div>`);
    });
    ws.push(`<div class="w fist${inv.active === -1 ? ' active' : ''}" data-slot="-1"><b>3</b><div class="ico"></div><div class="meta"><span class="name">空手</span></div></div>`);
    this._set('weapons', el.weapons, ws.join(''));

    this._set('quick', el.quick, CONSUMABLES.map((id) => {
      const n = inv.items[id], using = combat.use?.id === id;
      return `<div class="q${n ? '' : ' none'}${using ? ' using' : ''}" data-use="${id}"><b>${KEY_LABEL[id]}</b><span>${ITEMS[id].name}</span><em>${n}</em></div>`;
    }).join(''));

    // --- pickup prompt ---
    const near = combat.near.slice(0, 4);
    this._set('pickup', el.pickup, near.map((it, i) => `<div class="t${tierOf(it.id)}${i ? '' : ' first'}" data-pick="${i}">${i ? '' : '<b>F</b>'}${stackLabel(it)}</div>`).join(''));

    // --- reload / use progress ---
    const job = combat.reload ? { label: '換彈中', ...combat.reload } : combat.use ? { label: `吃${ITEMS[combat.use.id].name}`, ...combat.use } : null;
    el.progress.classList.toggle('show', !!job);
    if (job) {
      el.progressFill.style.width = (100 * (1 - job.t / job.total)).toFixed(0) + '%';
      el.progressText.textContent = `${job.label}  ${Math.max(0, job.t).toFixed(1)}`;
    }

    // --- crosshair: gap follows the real spread ---
    const gap = Math.tan(combat.spread()) / Math.tan(camera.fov * Math.PI / 360) * (innerHeight / 2);
    el.cross.style.setProperty('--gap', Math.max(3, gap).toFixed(1) + 'px');
    el.cross.classList.toggle('hidden', combat.scoped || p.dead);
    el.scope.classList.toggle('hidden', !combat.scoped);

    // --- timed feedback ---
    // fades are driven here rather than by CSS transitions, so they stay in step with the game clock
    this.toastT = Math.max(0, this.toastT - dt); this.targetT = Math.max(0, this.targetT - dt);
    el.toast.style.opacity = Math.min(1, this.toastT / 0.25).toFixed(2);
    el.target.style.opacity = Math.min(1, this.targetT / 0.3).toFixed(2);
    if (this.hitT > 0 && (this.hitT -= dt) <= 0) el.hit.className = '';
    this.scareT = Math.max(0, this.scareT - dt);
    el.scare.style.opacity = Math.min(1, this.scareT / 0.35).toFixed(2);
    this.vigT = Math.max(0, this.vigT - dt * 1.4);
    const low = p.hp <= 25 && !p.dead ? 0.35 + 0.15 * Math.sin(performance.now() / 180) : 0;
    el.vignette.style.opacity = Math.max(this.vigT, low).toFixed(2);
    if (this.dirT > 0) {
      this.dirT -= dt;
      // bearing of the attacker relative to where the camera looks (0 = ahead, clockwise)
      const a = Math.atan2(this.dirFrom.x - p.pos.x, -(this.dirFrom.z - p.pos.z)) + p.yaw;
      el.dmgDir.style.transform = `rotate(${a}rad)`;
      el.dmgDir.style.opacity = Math.min(1, this.dirT / 0.5).toFixed(2);
    } else el.dmgDir.style.opacity = 0;
    if (this.feed.length) {
      for (const f of this.feed) f.t -= dt;
      if (this.feed[0].t <= 0) { this.feed.shift(); this._feed(); }
    }

    if (this.invOpen) this._inventory(combat);
  }

  _inventory(combat) {
    const inv = this.inv;
    const btn = (act, arg, label) => `<button data-act="${act}" data-arg="${arg}">${label}</button>`;
    const row = (label, buttons, cls = '', icon = '') => `<div class="row ${cls}">${icon ? `<div class="ico">${icon}</div>` : ''}<span>${label}</span>${buttons}</div>`;
    const icon = (id) => (ITEMS[id].kind === 'weapon' ? weaponIcon(id) : '');

    const near = this.loot ? this.loot.nearby(this.player.pos.x, this.player.pos.z, 2.6) : combat.near;
    this._near = near;
    let a = '<h3>附近物品</h3>';
    a += near.length ? near.map((it, i) => row(stackLabel(it), btn('take', i, '撿起'), 't' + tierOf(it.id), icon(it.id))).join('') : '<div class="none">附近沒有東西</div>';

    let b = `<h3>背包 <small>${inv.weight.toFixed(0)} / ${inv.capacity}</small></h3>`;
    let any = false;
    for (const [t, n] of Object.entries(inv.ammo)) if (n > 0) { any = true; b += row(`${ITEMS[AMMO_ITEM[t]].name} ×${n}`, btn('drop', t, '丟棄'), 't0'); }
    for (const id of CONSUMABLES) {
      const n = inv.items[id]; if (!n) continue; any = true;
      b += row(`${ITEMS[id].name} ×${n}`, btn('use', id, '吃') + btn('drop1', id, '丟 1'), 't' + tierOf(id));
    }
    if (!any) b += '<div class="none">空的</div>';

    let c = '<h3>裝備</h3>';
    inv.slots.forEach((s, i) => {
      if (!s) { c += row(`武器 ${i + 1}　—`, '', 'dim'); return; }
      const d = ITEMS[s.id];
      c += row(`${d.name}　${s.ammo}/${d.mag}`, btn('drop', 'slot' + i, '丟棄'), `t${d.tier}${inv.active === i ? ' on' : ''}`, weaponIcon(s.id));
    });
    for (const [k, label] of [['helmet', '頭盔'], ['vest', '背心'], ['pack', '背包']]) {
      const g = inv[k];
      if (!g) { c += row(`${label}　—`, '', 'dim'); continue; }
      const d = ITEMS[g.id];
      c += row(d.dur ? `${d.name}　${Math.round(100 * g.dur / d.dur)}%` : `${d.name}　+${d.cap}`, btn('drop', k, '卸下'), 't' + d.lv);
    }
    this._set('inv', this.el.invBody, `<div class="col">${a}</div><div class="col">${b}</div><div class="col">${c}</div>`);
  }
}
