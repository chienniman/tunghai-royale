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
      clock: $('clock'), scare: $('scare'), dread: $('dread'), event: $('event'), fade: $('fade'),
      objective: $('objective'), ward: $('ward'), interact: $('interact'), subtitle: $('subtitle'),
      dialog: $('dialog'), phone: $('phone'), chapter: $('chapter'),
      reader: $('reader'), journal: $('journal'), journalBody: $('journal-body'), choice: $('choice'), choiceList: $('choice-list'),
    };
    this.scareT = 0; this.bannerT = 0; this.fadeT = 0; this.fadeMax = 1; this.subT = 0;
    this.onModal = null;     // (name | null) => void: main.js shows / hides the panel and frees the mouse
    this._afterRead = null; this._onChoice = null;
    $('reader-close').onclick = () => this.closeReader();
    $('journal-close').onclick = () => this.onModal?.(null);
    this.el.choiceList.addEventListener('click', (e) => { const b = e.target.closest('[data-id]'); if (!b) return; const f = this._onChoice; this._onChoice = null; f?.(b.dataset.id); if (this.modal === 'choice') this.onModal?.(null); });
    this.el.journalBody.addEventListener('click', (e) => { const b = e.target.closest('[data-read]'); if (b) this.onJournalRead?.(b.dataset.read); });
    this.toastT = 0; this.hitT = 0; this.targetT = 0; this.vigT = 0; this.dirT = 0; this.dirFrom = null;
    this.feed = [];
    this._sig = {};
    this.invOpen = false;
    this.onInvAction = null; // (action, arg) => void
    { // film-grain tile for the dread overlay
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const ctx = c.getContext('2d'), img = ctx.createImageData(128, 128);
      for (let i = 0; i < img.data.length; i += 4) { const v = Math.random() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 46; }
      ctx.putImageData(img, 0, 0);
      this.el.dread.style.backgroundImage = `url(${c.toDataURL()}), radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, .92) 100%)`;
    }
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

  // --- story UI ---------------------------------------------------------------
  // "[E] verb label" beside the crosshair; fill = 0..1 progress for hold-to-search.
  prompt(verb, label = '', fill = 0) {
    const el = this.el.interact;
    if (!verb) { if (this._prompt) { this._prompt = ''; el.classList.remove('show'); } return; }
    const text = `${verb}　${label}`;
    if (this._prompt !== text) { this._prompt = text; el.children[1].textContent = text; el.classList.add('show'); }
    el.lastElementChild.style.width = (fill * 100).toFixed(0) + '%';
  }

  // Her voice.
  subtitle(text) { this.el.subtitle.className = ''; this.el.subtitle.textContent = `「${text}」`; this.subT = 4; }
  // Your own thoughts, or something overheard (cls: 'radio').
  narrate(text, cls = '') { this.el.subtitle.className = 'narr ' + cls; this.el.subtitle.textContent = text; this.subT = 4.5; }

  // Conversation box. dialog(null) closes it.
  dialog(name, text = '', more = false) {
    const el = this.el.dialog;
    if (name === null) { el.classList.remove('show'); return; }
    el.children[0].textContent = name; el.children[0].style.display = name ? '' : 'none';
    el.children[1].textContent = text; el.children[2].textContent = more ? 'E　繼續' : 'E　結束';
    this.subT = 0; // one voice at a time
    el.classList.add('show');
  }

  // A message arrives on your phone: a card slides in at the lower left.
  phone(from, text, stamp = '') {
    const card = document.createElement('div');
    card.className = 'msg' + (from === '未知號碼' ? ' unknown' : '');
    card.innerHTML = '<b></b><small></small><span></span>';
    card.children[0].textContent = from; card.children[1].textContent = stamp; card.children[2].textContent = text;
    this.el.phone.appendChild(card);
    while (this.el.phone.children.length > 2) this.el.phone.firstElementChild.remove();
    this._msgs = (this._msgs || []).concat({ card, t: 8 });
  }

  // Chapter title card.
  chapter(kicker, title) { const el = this.el.chapter; el.children[0].textContent = kicker; el.children[1].textContent = title; this.chapT = 4.2; }
  setObjective(text) { if (this._obj !== text) { this._obj = text; this.el.objective.textContent = text ? `目標　${text}` : ''; } }
  setWard(n) { if (this._ward !== n) { this._ward = n; this.el.ward.textContent = n ? `平安符 ×${n}` : ''; } }

  // Open the reading panel. page: { tag, title, meta, body, foot, count }; after: called when it is closed.
  read(page, after = null) {
    const el = this.el.reader, q = (s) => el.querySelector(s);
    const cls = { 過去: '', 現在: 'now', 未來: 'future', 怪談: 'rumor', 序: 'now' }[page.tag] ?? '';
    q('.r-tag').textContent = page.tag; q('.r-tag').className = 'r-tag ' + cls;
    q('.r-count').textContent = page.count || '';
    q('h2').textContent = page.title; q('.r-meta').textContent = page.meta || '';
    q('.r-body').textContent = page.body; q('.r-foot').textContent = page.foot || '';
    el.querySelector('.paper').scrollTop = 0;
    this._afterRead = after; this._readN = (this._readN || 0) + 1;
    this.onModal?.('reader');
  }
  // Closing turns the page if there is one, otherwise puts the paper away.
  closeReader() { const f = this._afterRead, n = this._readN; this._afterRead = null; f?.(); if (this._readN === n && this.modal === 'reader') this.onModal?.(null); }

  // A question with buttons. options: [{ id, label }]
  choice(text, options, onPick) {
    this.el.choice.querySelector('p').textContent = text;
    this.el.choiceList.innerHTML = options.map((o) => `<button data-id="${o.id}">${o.label}</button>`).join('');
    this._onChoice = onPick;
    this.onModal?.('choice');
  }

  // The notebook: 過去 / 現在 / 未來 and the rumours. data comes from story.js.
  journal(story, { FRAGMENTS, FORTUNES, ENDINGS, RUMORS }) {
    const past = FRAGMENTS.map((f, i) => (story.has(f.id)
      ? `<div class="e" data-read="${f.id}"><b>${f.title}</b><small>${f.date}　·　${f.where}</small></div>`
      : `<div class="e lock"><b>${i === story.stage ? '？　' + f.hint : '？？？'}</b></div>`)).join('');
    const o = story.objective;
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const phone = story.phone.length ? '<h3 class="sub">手機</h3>' + story.phone.slice(-7).reverse().map((m) => `<div class="e${m.from === '未知號碼' ? ' unknown' : ''}"><b>${esc(m.from)}　<small>${esc(m.stamp || '')}</small></b>${esc(m.text)}</div>`).join('') : '';
    const now = (o ? `<div class="goal">${o.text}<br><small>${o.where}</small></div>` : '') +
      (story.log.length ? story.log.slice(-5).reverse().map((l) => `<div class="e">${l}</div>`).join('') : '<div class="e lock">還沒有做什麼值得記下來的事。</div>');
    let future = story.ending ? `<div class="e" data-read="ending"><b>${ENDINGS[story.ending].name}</b><small>五十年後</small></div>` : '';
    future += story.fortunes.map((i) => `<div class="e verse"><b>${FORTUNES[i].no}</b>${FORTUNES[i].verse}</div>`).join('');
    if (!future) future = '<div class="e lock">還沒有人知道。去土地公廟拜一拜、抽支籤。</div>';
    const rumors = RUMORS.map((r) => (story.rumors.includes(r.id) ? `<div class="e"><b>${r.title}</b>${r.body.replace(/\n/g, '<br>')}</div>` : '<div class="e lock"><b>？？？</b>公佈欄上也許有寫</div>')).join('');
    this.el.journalBody.innerHTML = `<div class="past"><h3>過去 <small>${story.stage} / ${FRAGMENTS.length}</small></h3>${past}</div>` +
      `<div class="now"><h3>現在</h3>${now}${phone}</div><div class="future"><h3>未來</h3>${future}</div>` +
      `<div class="rumors"><h3>校園怪談 <small>${story.rumors.length} / ${RUMORS.length}</small></h3><div class="list">${rumors}</div></div>`;
    this.onModal?.('journal');
  }

  // Announce an event across the top of the screen. tone: 'gold' | 'red' | 'blue'
  banner(title, sub = '', tone = 'gold') {
    const el = this.el.event;
    el.firstElementChild.textContent = title; el.lastElementChild.textContent = sub;
    el.className = tone; this.bannerT = 5.5;
  }

  // Screen goes black and comes back slowly (being led away).
  blackoutFade(seconds) { this.fadeT = this.fadeMax = seconds; }

  // A ghost in your face: one white frame, then the dark closes in and stays a while.
  scare() { this.scareT = 1.5; }

  // 0..1: film grain and a closing vignette as something gets nearer.
  setDread(v) {
    const el = this.el.dread;
    if (v < 0.02) { if (this._dread) { this._dread = 0; el.style.opacity = 0; } return; }
    this._dread = v;
    el.style.opacity = Math.min(0.85, v * 0.9).toFixed(2);
    el.style.backgroundPosition = `${(Math.random() * 128) | 0}px ${(Math.random() * 128) | 0}px, center`;
  }

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
    this.bannerT = Math.max(0, this.bannerT - dt);
    this.subT = Math.max(0, this.subT - dt);
    this.chapT = Math.max(0, (this.chapT || 0) - dt);
    el.chapter.style.opacity = Math.min(1, this.chapT / 1.0, (4.2 - this.chapT) / 0.8).toFixed(2);
    if (this._msgs?.length) {
      for (const m of this._msgs) { m.t -= dt; m.card.style.opacity = Math.min(1, m.t / 0.6, (8 - m.t) / 0.25).toFixed(2); if (m.t <= 0) m.card.remove(); }
      this._msgs = this._msgs.filter((m) => m.t > 0);
    }
    el.subtitle.style.opacity = Math.min(1, this.subT / 0.6).toFixed(2);
    el.event.style.opacity = Math.min(1, this.bannerT / 0.6, (5.5 - this.bannerT) / 0.25).toFixed(2);
    this.fadeT = Math.max(0, this.fadeT - dt);
    el.fade.style.opacity = Math.min(1, this.fadeT / (this.fadeMax * 0.6)).toFixed(2);
    el.scare.style.opacity = Math.min(1, this.scareT / 0.6).toFixed(2);
    el.scare.classList.toggle('flash', this.scareT > 1.44);
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
