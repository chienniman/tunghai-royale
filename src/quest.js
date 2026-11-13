import { FRAGMENTS, ENDINGS, RUMORS } from './story.js';
import { INTRO, CHAPTERS, PHONE, GUARD, GUARD_TALK, GUARD_AFTER, BROADCAST, PHONE_CALL, LOOK, STELES, BEATS } from './script.js';
import { ITEMS, CONSUMABLES, rollCluster, ammoStack } from './items.js';
import { mulberry32 } from './util.js';

const BRIDGE = [-334.4, -188.1];   // 女鬼橋, as mapped in OpenStreetMap
const SEARCH_TIME = 1.3, LAMP_TIME = 75;
const HOLD = { crate: 1, bin: 1 };  // props that are searched by holding E

// The director. It knows the script (script.js), the story so far (story.js) and
// the props (props.js), and decides what happens: what each thing does when you
// use it, where 伍伯 is waiting, when your phone buzzes, and what the night does
// each time you find another piece of her.
export class Quest {
  // deps: { story, props, ui, hud, player, inv, combat, loot, targets, ghosts, monsters, events, sky, sfx, world, terrain, spawn }
  constructor(deps) {
    Object.assign(this, deps);
    this.rng = mulberry32(88);
    this.near = null;        // prop in reach
    this.hold = 0;           // seconds E has been held on a searchable prop
    this.queue = [];         // phone messages on their way: { t, msg }
    this.later = [];         // beats waiting their turn: { t, fn } (so a chapter card and its set piece do not land on top of each other)
    this.dialog = null;      // { lines: [[speaker, text]], i, done }
    this.broadcast = null;   // { radio, i, t } the old typhoon bulletin playing
    this.ringing = null;     // phone booth that is ringing
    this._zoneT = 0; this._ringT = 0; this._catT = 20; this._wasNight = false;
    this.bellCd = 0;
    this.player.ward = 0;

    // story fragments: all placed up front, only the next one is shown
    this.fragments = FRAGMENTS.map((f) => {
      let c;
      if (f.place === 'spawn') c = { x: this.spawn.x - this.spawn.dx * 2 - this.spawn.dz * 4, z: this.spawn.z - this.spawn.dz * 2 + this.spawn.dx * 4, r: 0 };
      else if (Array.isArray(f.place)) c = { x: f.place[0], z: f.place[1], r: f.id === 'ring' ? 0 : 30 };
      else { const b = this.world.named.find((n) => n.name === f.place); c = b ? { x: b.x, z: b.z, r: b.r + 2 } : { x: this.spawn.x, z: this.spawn.z, r: 20 }; }
      const s = this.props.spot(c.x, c.z, c.r, c.r + 30) || { x: c.x, z: c.z };
      return this.props.add('fragment', s.x, s.z, { data: { id: f.id, label: f.title } });
    });
    const bs = this.props.spot(BRIDGE[0], BRIDGE[1], 0, 10) || { x: BRIDGE[0], z: BRIDGE[1] };
    this.bridge = this.props.add('bridge', bs.x, bs.z, { r: 3 });

    // nobody should be shot at while reading a dead woman's diary
    for (const p of [...this.fragments, this.bridge]) this.targets?.clearSentries(p.x, p.z, 70);

    this.ghosts.onLine = (kind) => { const l = this.story.line(kind, this.rng); if (l) this.ui.subtitle(l); };
    this.ghosts.onWard = () => { this.ui.toast('平安符燒掉了——她退開了'); this.sfx?.ghostDie(); };
    this.monsters.onWard = () => this.ui.toast('平安符燒掉了——繩子鬆開了');
    this.refresh();
  }

  // Bring props and ghost behaviour in line with where the story stands.
  refresh() {
    const { story, props } = this, next = story.nextFragment;
    for (const p of this.fragments) p.hidden = !next || p.data.id !== next.id;
    const ready = story.complete && !story.ending;
    this.bridge.beam.visible = this.bridge.ring.visible = ready;
    this.bridge.verb = story.ending ? '看看橋上' : '走上橋';
    // her mood: hunting until she understands what you are carrying
    this.ghosts.mood = story.ending === 'release' || story.ending === 'deliver' ? 'gone' : story.ending === 'burn' ? 'rage' : story.ending === 'stay' || ready ? 'follow' : 'hunt';
    this.events.forceBlood = story.ending === 'burn';
    const o = story.objective;
    this.target = !o ? null : o.id === 'bridge' ? this.bridge : this.fragments.find((p) => p.data.id === o.id);

    // 伍伯 waits a little way short of wherever you have to go next, on the side you will come from.
    const g = props.npc;
    if (g) {
      const t = this.target || { x: this.spawn.x, z: this.spawn.z };
      let s;
      if (story.stage === 0 || story.ending) s = { x: this.spawn.x + this.spawn.dx * 3 + this.spawn.dz * 3, z: this.spawn.z + this.spawn.dz * 3 - this.spawn.dx * 3 };
      else {
        const dx = this.spawn.x - t.x, dz = this.spawn.z - t.z, d = Math.hypot(dx, dz) || 1, back = story.stage >= 6 ? 7 : 11;
        s = props.spot(t.x + dx / d * back, t.z + dz / d * back, 0, 12) || { x: t.x + dx / d * back, z: t.z + dz / d * back };
      }
      props.move(g, s.x, s.z);
      g.hidden = story.ending === 'burn' && story.flags.cursed === 1;
    }
  }

  // Blue pin for the current objective, orange for a ringing phone.
  get markers() {
    const out = this.target ? [{ x: this.target.x, z: this.target.z, color: '#8fc8ff', pin: true }] : [];
    if (this.ringing) out.push({ x: this.ringing.x, z: this.ringing.z, color: '#ffa94d', pin: true });
    return out;
  }

  // --- voices -----------------------------------------------------------------
  // Queue the phone messages tied to a moment in the script (each moment fires once per save).
  trigger(when) {
    if (!this.story.flag('ph:' + when)) return;
    for (const m of PHONE) if (m.when === when) this.queue.push({ t: m.delay, msg: m });
    this.queue.sort((a, b) => a.t - b.t);
  }
  narrate(text) { this.ui.narrate(Array.isArray(text) ? text[Math.floor(this.rng() * text.length)] : text); }
  // A conversation in the box at the bottom of the screen; E moves it on. lines: [[speaker, text], ...]
  say(lines, done = null) {
    this.dialog = { lines, i: 0, done }; this.player.talking = true;
    this.ui.dialog(lines[0][0], lines[0][1], lines.length > 1);
  }
  _advance() {
    const d = this.dialog; d.i++;
    if (d.i < d.lines.length) { this.ui.dialog(d.lines[d.i][0], d.lines[d.i][1], d.i < d.lines.length - 1); return; }
    this.dialog = null; this.player.talking = false; this.ui.dialog(null); d.done?.();
  }

  // --- what the night does each time you find another piece ---------------------
  onStage(n) {
    const { ui, sky, events, ghosts, props, player } = this;
    ui.chapter(...CHAPTERS[n]);
    this.trigger('stage:' + n);
    switch (n) {
      case 2: // you look up from the diary and it is dark
        if (sky.night < 0.5) { ui.blackoutFade(2.4); sky.setHour(18.75); this.narrate(BEATS.nightfall); }
        ghosts.spawnT.banshee = 4;
        break;
      case 3: { // the radio at the dairy comes on by itself: a bulletin from fifty years ago
        const r = this._closest('radio', 80);
        if (r) { r.on = 34; this.broadcast = { radio: r, i: 0, t: 5 }; }
        break;
      }
      case 4: this.later.push({ t: 5, fn: () => events.start('blackout') }); break;
      case 5: { // somewhere, a public phone starts ringing
        const b = this._closest('booth', 400, 12);
        if (b) this.later.push({ t: 5, fn: () => { this.ringing = b; this.narrate(BEATS.ringing); } });
        break;
      }
      case 6: // the typhoon comes back, and she leads the way
        this.later.push({ t: 5, fn: () => { events.start('storm'); events.storm = 240; this.narrate(BEATS.storm); } });
        ghosts.spawnT.banshee = 8; this._lead = 16;
        break;
    }
    if (player.riding) this._dismount();
  }

  _closest(kind, maxD, minD = 0) {
    const p = this.player.pos; let best = null, bd = maxD;
    for (const q of this.props.list) { if (q.kind !== kind) continue; const d = Math.hypot(q.x - p.x, q.z - p.z); if (d >= minD && d < bd) { bd = d; best = q; } }
    return best;
  }

  // --- using things -------------------------------------------------------------
  use(p) {
    const { story, ui, player, sky, sfx, events } = this;
    switch (p.kind) {
      case 'fragment': {
        const f = story.collect(p.data.id, sky.clock); if (!f) return;
        sfx?.pickup(); this.refresh();
        const stage = story.stage;
        ui.read({ tag: '過去', title: f.title, meta: `${f.where}　·　${f.date}`, body: f.body, foot: f.next, count: `${stage} / ${FRAGMENTS.length}` }, () => this.onStage(stage));
        break;
      }
      case 'bridge': {
        if (story.ending) { const e = ENDINGS[story.ending]; ui.read({ tag: '未來', title: e.name, meta: '女鬼橋', body: e.future, foot: e.effect }); break; }
        if (!story.complete) { ui.toast(`橋上很冷。你覺得還少了什麼（${story.stage} / ${FRAGMENTS.length}）`); break; }
        if (sky.night < 0.5) { this.narrate(BEATS.bridgeDay); break; }
        ui.choice('她站在橋的另一頭，看著你手上的信和戒指。', story.choices.map((id) => ({ id, label: ENDINGS[id].choice })), (id) => this.finish(id));
        break;
      }
      case 'npc': {
        if (story.ending) { this.say([[GUARD, GUARD_AFTER[story.ending]]]); break; }
        const n = story.stage, t = GUARD_TALK[n];
        if (story.talked.includes(n)) this.say([[GUARD, t.again]]);
        else this.say(t.lines.map((l) => [GUARD, l]), () => { story.talk(n); if (t.confession) ui.toast('伍伯把話說完了。到了橋上，你多了一個選擇'); });
        break;
      }
      case 'shrine': {
        if (p.cd > 0) { ui.toast('香還沒燒完，等一下再拜'); break; }
        const food = CONSUMABLES.find((id) => this.inv.items[id] > 0);
        if (!food) { ui.toast('身上沒有可以當供品的食物'); break; }
        this.inv.items[food]--; p.cd = 60;
        player.ward = Math.min(3, player.ward + 1);
        const f = story.drawFortune(this.rng, sky.clock);
        sfx?.bell?.(1);
        ui.read({ tag: '未來', title: f.no, meta: '土地公廟　·　籤詩', body: `${f.verse}\n\n—— ${f.note}`, foot: `供上${ITEMS[food].name}，得到一張平安符（擋下一次鬼怪的攻擊，目前 ${player.ward} 張）` });
        break;
      }
      case 'lamp':
        this.props.light(p, LAMP_TIME); sfx?.reload();
        ui.toast(`路燈亮了，${LAMP_TIME} 秒內她和阿飄不敢靠近燈下`);
        break;
      case 'board': {
        const r = RUMORS[p.data.rumor % RUMORS.length];
        story.readRumor(r.id);
        ui.read({ tag: '怪談', title: r.title, meta: '公佈欄上的手寫字條', body: r.body, foot: '已記在筆記本裡（J）' });
        break;
      }
      case 'bench':
        player.resting = !player.resting; player.crouch = player.resting;
        ui.toast(player.resting ? '坐下休息（慢慢回血到 60，移動就會站起來）' : '站起來了');
        break;
      case 'bell':
        if (this.bellCd > 0) { ui.toast('鐘還在晃'); break; }
        this.bellCd = 90; sfx?.bell?.(3);
        if (sky.night < 0.5) { ui.blackoutFade(2.2); sky.setHour(18.75); ui.banner('暮鐘', '鐘聲一響，天色就暗了下來', 'blue'); }
        else events.start('midnight');
        break;
      case 'booth':
        if (this.ringing === p) {
          this.ringing = null;
          this.say(PHONE_CALL, () => { story.flag('call'); this.ghosts.spawnT.banshee = Math.min(this.ghosts.spawnT.banshee, 3); });
        } else this.narrate(sky.night > 0.6 && this.rng() < 0.4 ? LOOK.boothNight : LOOK.booth);
        break;
      case 'radio':
        if (p.on > 0) { p.on = 0; ui.toast('收音機關掉了'); break; }
        p.on = 40; this.narrate(LOOK.radio);
        ui.toast('收音機開著，40 秒內聽聲音的東西會被引過去');
        break;
      case 'vending':
        if (p.cd > 0) { this.narrate('（還在補貨的燈號。等一下。）'); break; }
        p.cd = 45;
        if (this.rng() < 0.65) { this.loot.scatter([{ id: 'milktea', n: 1 }], p.x - Math.sin(p.yaw) * 0.9, p.z - Math.cos(p.yaw) * 0.9, 0.2); sfx?.thud?.(0.6); }
        else { this.narrate(LOOK.vendingEmpty); this.monsters.hear(p.x, p.z, 35); sfx?.thud?.(1); }
        break;
      case 'bike': this._mount(p); break;
      case 'cat': {
        const afraid = this._herNear(30);
        this.narrate(afraid ? LOOK.catAfraid : LOOK.cat);
        break;
      }
      case 'cow':
        if (!p.milked) { p.milked = true; player.heal(8); ui.toast('擠了一點牛奶，還是溫的（+8）'); }
        this.narrate(LOOK.cow);
        break;
      case 'fountain':
        if (p.cd > 0) { this.narrate('（水壓還沒回來。）'); break; }
        p.cd = 30; player.heal(6); this.narrate(LOOK.fountain);
        break;
      case 'breaker':
        if (events.blackout > 0) { events.blackout = 0; sfx?.reload(); ui.banner('復電', '總開關扳回去了，燈一盞一盞亮起來', 'gold'); }
        else this.narrate(LOOK.breaker);
        break;
      case 'mailbox': this.narrate(LOOK.mailbox); break;
      case 'busstop': this.narrate(LOOK.busstop); break;
      case 'stele': { const s = STELES[p.data.stele % STELES.length]; this.narrate(s.text); break; }
    }
  }

  _herNear(r) {
    const p = this.player.pos;
    return this.ghosts.list.some((g) => g.kind === 'banshee' && g.active && Math.hypot(g.x - p.x, g.z - p.z) < r);
  }

  _search(p) {
    p.used = true; p.obj.rotation.z = 0.12; if (p.data.label === '紙箱') p.obj.scale.y = 0.72;
    const night = this.sky.night > 0.6, r = this.rng();
    const fx = p.x - Math.sin(p.yaw) * 0.9, fz = p.z - Math.cos(p.yaw) * 0.9;
    if (night && r < 0.12) { // something was in there
      const g = this.ghosts._spawn('wisp', this.player);
      if (g) { g.x = fx; g.z = fz; g.opacity = 0.9; this.ui.toast('裡面有東西——'); this.sfx?.wisp(); return; }
    }
    if (p.kind === 'bin') { // mostly rubbish
      if (r < 0.55) { this.narrate('（便當盒、飲料杯、一把壞掉的傘。）'); return; }
      this.loot.scatter([r < 0.8 ? ammoStack('ammo_9mm', this.rng) : { id: 'chickenfeet', n: 1 }], fx, fz, 0.3);
    } else {
      if (r < 0.3) { this.ui.toast('空的'); return; }
      this.loot.scatter(rollCluster(this.rng), fx, fz, 0.5);
    }
    this.sfx?.pickup();
  }

  // --- bicycles -------------------------------------------------------------------
  _mount(p) {
    const { player, inv, combat } = this;
    if (player.dead || player.grabbed) return;
    if (inv.active !== -1) combat._switch(inv.select(-1));   // both hands on the bars
    player.riding = p; player.crouch = false; player.resting = false;
    p.hidden = true; p.obj.visible = false;
    player.setBike(true);
    this.ui.toast('騎上腳踏車（E 下車。騎車時不能開槍，而且有聲音）');
  }
  _dismount() {
    const { player, props } = this, p = player.riding; if (!p) return;
    player.riding = null; player.setBike(false);
    props.move(p, player.pos.x + Math.cos(player.facing) * 0.7, player.pos.z - Math.sin(player.facing) * 0.7, player.facing);
    p.hidden = false; p.obj.visible = true;
  }

  // The choice on the bridge: tell the present, then the future, then change the nights.
  finish(id) {
    const e = this.story.choose(id, this.sky.clock); if (!e) return;
    this.refresh();
    const kind = id === 'deliver' ? 'release' : id;
    if (kind === 'release') { this.ghosts.banish(); this.events.storm = Math.min(this.events.storm, 4); }
    if (kind === 'burn') { this.events.start('blood'); this.sfx?.scream(); }
    this.sfx?.bell?.(2);
    this.ui.read({ tag: '現在', title: e.name, meta: '女鬼橋', body: e.now, foot: '繼續' }, () => {
      this.ui.read({ tag: '未來', title: e.name, meta: '五十年後', body: e.future, foot: e.effect }, () => {
        this.trigger('end:' + id);
        if (id === 'deliver' || id === 'release') { this.ui.blackoutFade(2.5); this.sky.setHour(id === 'deliver' ? 5.9 : this.sky.hour); }
        this.ui.chapter('結　局', e.name.replace('　', ''));
      });
    });
  }

  update(dt, input, running) {
    const { player, props, ui, story, sky } = this, p = player.pos;
    this.bellCd = Math.max(0, this.bellCd - dt);
    for (const q of props.list) if (q.cd > 0) q.cd -= dt;
    if ((this._zoneT -= dt) <= 0) { this._zoneT = 0.4; this.ghosts.safe = props.safeZones(); }

    // objective line + distance
    const o = story.objective;
    ui.setObjective(o ? `${o.text}${this.target ? `　${Math.round(Math.hypot(this.target.x - p.x, this.target.z - p.z))}\u00a0m` : ''}` : story.ending ? `結局：${ENDINGS[story.ending].name.replace('　', '')}` : '');
    ui.setWard(player.ward);

    if (!running) { this.near = null; ui.prompt(null); this.hold = 0; return; }

    // the opening, once
    if (!story.introSeen && !this._intro) {
      this._intro = true;
      const page = (i) => ui.read({ tag: '序', ...INTRO[i] }, () => {
        if (i + 1 < INTRO.length) { page(i + 1); return; }
        story.introSeen = true; story.save(); ui.chapter(...CHAPTERS[0]); this.trigger('start');
      });
      page(0);
      return;
    }

    for (const l of this.later) l.t -= dt;
    if (this.later.length && this.later.some((l) => l.t <= 0)) { const due = this.later.filter((l) => l.t <= 0); this.later = this.later.filter((l) => l.t > 0); for (const l of due) l.fn(); }
    // phone
    for (const q of this.queue) q.t -= dt;
    while (this.queue.length && this.queue[0].t <= 0) {
      const { msg } = this.queue.shift(), stamp = msg.stamp || sky.clock;
      story.receive({ from: msg.from, text: msg.text, stamp }); ui.phone(msg.from, msg.text, stamp); this.sfx?.buzz?.();
    }
    const night = sky.night > 0.6;
    if (night && !this._wasNight) this.trigger('night');
    this._wasNight = night;

    // the old bulletin on the radio; radios that are on draw whatever hunts by sound
    const b = this.broadcast;
    if (b && (b.t -= dt) <= 0) { if (b.i < BROADCAST.length) { ui.narrate(BROADCAST[b.i++], 'radio'); b.t = 4.2; } else this.broadcast = null; }
    for (const q of props.list) if (q.kind === 'radio' && q.on > 0) { q.on -= dt; if ((q._n = (q._n || 0) - dt) <= 0) { q._n = 1; this.monsters.hear(q.x, q.z, 45); } }
    if (this.ringing && (this._ringT -= dt) <= 0) { this._ringT = 2.6; const d = Math.hypot(this.ringing.x - p.x, this.ringing.z - p.z); if (d < 90) this.sfx?.ring?.(Math.max(0.15, 1 - d / 90)); }
    // she walks ahead of you to the bridge
    if (this._lead > 0 && (this._lead -= dt) <= 0 && this._herNear(40)) this.narrate(BEATS.lead);
    // cats know before you do
    if ((this._catT -= dt) <= 0) {
      this._catT = 6;
      if (this._herNear(26) && props.list.some((q) => q.kind === 'cat' && Math.hypot(q.x - p.x, q.z - p.z) < 9)) { this.narrate(LOOK.catAfraid); this._catT = 30; }
    }
    // 伍伯: torch on at night, turns to face you when you come close
    const g = props.npc;
    if (g) {
      const d = Math.hypot(g.x - p.x, g.z - p.z);
      if (d < 9 && !g.hidden) { g.yaw = Math.atan2(-(p.x - g.x), -(p.z - g.z)); g.obj.rotation.y = g.yaw; }
      props.npcLight.intensity = g.hidden ? 0 : 5 * sky.night;
      props.npcLight.position.set(g.x - Math.sin(g.yaw) * 0.6, g.y + 1.2, g.z - Math.cos(g.yaw) * 0.6);
    }

    if (player.dead) { this.near = null; ui.prompt(null); this.hold = 0; player.resting = false; if (player.riding) this._dismount(); if (this.dialog) { this.dialog = null; player.talking = false; ui.dialog(null); } return; }

    // talking: E moves the conversation on, nothing else happens
    if (this.dialog) { ui.prompt(null); if (input.consumePressed('KeyE')) this._advance(); return; }

    if (player.resting) {
      player.heal(4 * dt, 60);
      if (input.down('KeyW') || input.down('KeyA') || input.down('KeyS') || input.down('KeyD') || input.down('Space') || Math.abs(input.axis.x) + Math.abs(input.axis.y) > 0.3) { player.resting = false; player.crouch = false; }
    }
    if (player.riding) {
      if (player.grabbed) this._dismount();
      else { ui.prompt('下車', '腳踏車'); if (input.consumePressed('KeyE')) this._dismount(); this.monsters.hear(p.x, p.z, 20); return; }
    }

    const near = this.near = player.grabbed ? null : props.nearest(p.x, p.z);
    if (!near) { ui.prompt(null); this.hold = 0; input.consumePressed('KeyE'); return; }
    const hold = HOLD[near.kind];
    ui.prompt(this.ringing === near ? '接電話' : near.kind === 'radio' && near.on > 0 ? '關掉' : near.verb, near.kind === 'stele' ? STELES[near.data.stele % STELES.length].label : near.label, hold ? this.hold / SEARCH_TIME : 0);
    if (hold) {
      if (input.down('KeyE')) { this.hold += dt; if (this.hold >= SEARCH_TIME) { this.hold = 0; this._search(near); } }
      else this.hold = 0;
      input.consumePressed('KeyE');
    } else if (input.consumePressed('KeyE')) this.use(near);
  }
}
