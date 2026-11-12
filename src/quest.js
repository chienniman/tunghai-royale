import { FRAGMENTS, ENDINGS, RUMORS } from './story.js';
import { ITEMS, CONSUMABLES, rollCluster } from './items.js';
import { mulberry32 } from './util.js';

const BRIDGE = [-334.4, -188.1];   // 女鬼橋, as mapped in OpenStreetMap
const SEARCH_TIME = 1.3, LAMP_TIME = 75;

// Glue between the story, the props you can use, and the rest of the game:
// what each prop does, where the story fragments are, what she says, and what
// the ending you chose does to the nights that follow.
export class Quest {
  // deps: { story, props, ui, hud, player, inv, combat, loot, ghosts, monsters, events, sky, sfx, world, terrain, spawn }
  constructor(deps) {
    Object.assign(this, deps);
    this.rng = mulberry32(88);
    this.near = null;        // prop in reach
    this.hold = 0;           // seconds E has been held on a searchable prop
    this._zoneT = 0;
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

    this.ghosts.onLine = (kind) => { const l = this.story.line(kind, this.rng); if (l) this.ui.subtitle(l); };
    this.ghosts.onWard = () => { this.ui.toast('平安符燒掉了——她退開了'); this.sfx?.ghostDie(); };
    this.monsters.onWard = () => this.ui.toast('平安符燒掉了——繩子鬆開了');
    this.refresh();
  }

  // Bring props and ghost behaviour in line with where the story stands.
  refresh() {
    const { story } = this, next = story.nextFragment;
    for (const p of this.fragments) p.hidden = !next || p.data.id !== next.id;
    const ready = story.complete && !story.ending;
    this.bridge.beam.visible = this.bridge.ring.visible = ready;
    this.bridge.verb = story.ending ? '看看橋上' : '走上橋';
    // her mood: hunting until she understands what you are carrying
    this.ghosts.mood = story.ending === 'release' ? 'gone' : story.ending === 'burn' ? 'rage' : story.ending === 'stay' || ready ? 'follow' : 'hunt';
    this.events.forceBlood = story.ending === 'burn';
    const o = story.objective;
    this.target = !o ? null : o.id === 'bridge' ? this.bridge : this.fragments.find((p) => p.data.id === o.id);
  }

  // Blue pin for the current objective.
  get markers() { return this.target ? [{ x: this.target.x, z: this.target.z, color: '#8fc8ff', pin: true }] : []; }

  use(p) {
    const { story, ui, player, sky, sfx } = this;
    switch (p.kind) {
      case 'fragment': {
        const f = story.collect(p.data.id, sky.clock); if (!f) return;
        sfx?.pickup(); this.refresh();
        if (sky.night > 0.5) this.ghosts.spawnT.banshee = Math.min(this.ghosts.spawnT.banshee, 5); // she notices
        ui.read({ tag: '過去', title: f.title, meta: `${f.where}　·　${f.date}`, body: f.body, foot: f.next, count: `${story.stage} / ${FRAGMENTS.length}` });
        break;
      }
      case 'bridge': {
        if (story.ending) { const e = ENDINGS[story.ending]; ui.read({ tag: '未來', title: e.name, meta: '女鬼橋', body: e.future, foot: e.effect }); break; }
        if (!story.complete) { ui.toast(`橋上很冷。你覺得還少了什麼（${story.stage} / ${FRAGMENTS.length}）`); break; }
        ui.choice('她站在橋的另一頭，看著你手上的信和戒指。', Object.entries(ENDINGS).map(([id, e]) => ({ id, label: e.choice })), (id) => this.finish(id));
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
        if (sky.night < 0.5) { ui.blackoutFade(2.2); sky.setHour(17.9); ui.banner('暮鐘', '鐘聲一響，天色就暗了下來', 'blue'); }
        else this.events.start('midnight');
        break;
    }
  }

  _search(p) {
    p.used = true; p.obj.rotation.z = 0.12; p.obj.scale.y = p.data.label === '紙箱' ? 0.72 : 1;
    const night = this.sky.night > 0.6, r = this.rng();
    const fx = p.x - Math.sin(p.yaw) * 0.9, fz = p.z - Math.cos(p.yaw) * 0.9;
    if (night && r < 0.12) { // something was in there
      const g = this.ghosts._spawn('wisp', this.player);
      if (g) { g.x = fx; g.z = fz; g.opacity = 0.9; this.ui.toast('裡面有東西——'); this.sfx?.wisp(); return; }
    }
    if (r < 0.3) { this.ui.toast('空的'); return; }
    this.loot.scatter(rollCluster(this.rng), fx, fz, 0.5);
    this.sfx?.pickup();
  }

  // The choice on the bridge: tell the present, then the future, then change the nights.
  finish(id) {
    const e = this.story.choose(id, this.sky.clock); if (!e) return;
    this.refresh();
    if (id === 'release') this.ghosts.banish();
    if (id === 'burn') { this.events.start('blood'); this.sfx?.scream(); }
    this.sfx?.bell?.(2);
    this.ui.read({ tag: '現在', title: e.name, meta: '女鬼橋', body: e.now, foot: '繼續' }, () => {
      this.ui.read({ tag: '未來', title: e.name, meta: '五十年後', body: e.future, foot: e.effect });
    });
  }

  update(dt, input, running) {
    const { player, props, ui } = this, p = player.pos;
    this.bellCd = Math.max(0, this.bellCd - dt);
    for (const q of props.list) if (q.cd > 0) q.cd -= dt;
    if ((this._zoneT -= dt) <= 0) { this._zoneT = 0.4; this.ghosts.safe = props.safeZones(); }

    // objective line + distance
    const o = this.story.objective;
    ui.setObjective(o ? `${o.text}${this.target ? `　${Math.round(Math.hypot(this.target.x - p.x, this.target.z - p.z))} m` : ''}` : this.story.ending ? `結局：${ENDINGS[this.story.ending].name.replace('　', '')}` : '');
    ui.setWard(player.ward);

    if (!running || player.dead) { this.near = null; ui.prompt(null); this.hold = 0; player.resting = false; return; }
    if (player.resting) {
      player.heal(4 * dt, 60);
      if (input.down('KeyW') || input.down('KeyA') || input.down('KeyS') || input.down('KeyD') || input.down('Space') || Math.abs(input.axis.x) + Math.abs(input.axis.y) > 0.3) { player.resting = false; player.crouch = false; }
    }

    const near = this.near = player.grabbed ? null : props.nearest(p.x, p.z);
    if (!near) { ui.prompt(null); this.hold = 0; input.consumePressed('KeyE'); return; }
    const hold = near.kind === 'crate';
    ui.prompt(near.verb, near.label, hold ? this.hold / SEARCH_TIME : 0);
    if (hold) {
      if (input.down('KeyE')) { this.hold += dt; if (this.hold >= SEARCH_TIME) { this.hold = 0; this._search(near); } }
      else this.hold = 0;
      input.consumePressed('KeyE');
    } else if (input.consumePressed('KeyE')) this.use(near);
  }
}
