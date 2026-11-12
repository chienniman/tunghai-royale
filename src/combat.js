import * as THREE from 'three';
import { ITEMS, FISTS, CONSUMABLES, falloff } from './items.js';
import { makeHeldWeapon, muzzleLength } from './models.js';
import { WALK } from './player.js';

const DEG = Math.PI / 180;
export const BASE_FOV = 72;
const PICKUP_RANGE = 2.2;

// Weapons, shooting, reloading, healing and picking things up.
// pre() runs before the player moves (it sets movement modifiers);
// post() runs after the camera is placed (it needs the final aim ray).
export class Combat {
  // enemies: systems with raycast(ox,oy,oz,dx,dy,dz,maxT) -> { t, target, zone } and damage(target, amount, dist)
  constructor({ player, inv, world, enemies, loot, fx, ui, audio }) {
    this.player = player; this.inv = inv; this.world = world; this.enemies = enemies; this.loot = loot; this.fx = fx; this.ui = ui; this.audio = audio;
    this.cd = 0;            // seconds until the next shot is allowed
    this.reload = null;     // { t, total }
    this.use = null;        // { id, t, total }
    this.bloom = 0;         // extra spread from sustained fire (rad)
    this.kick = 0;          // recoil not yet recovered (rad)
    this.ads = 0;           // 0 = hip, 1 = fully aimed
    this.adsHeld = false;
    this.sinceShot = 9;
    this.near = [];         // loot within reach, nearest first
    this._nearT = 0;
    this.stats = { shots: 0, hits: 0 };
    this._o = new THREE.Vector3(); this._m = new THREE.Vector3(); this._d = new THREE.Vector3();
    this._e = new THREE.Vector3(); this._r = new THREE.Vector3(); this._u = new THREE.Vector3(); this._n = new THREE.Vector3();
  }

  get weapon() { return this.inv.weapon; }
  get fov() { return THREE.MathUtils.lerp(BASE_FOV, this.weapon.zoom ?? BASE_FOV, this.ads); }
  get scoped() { return !!this.weapon.scope && this.ads > 0.85; }

  // Current spread half-angle in radians (also drives the crosshair gap).
  spread() {
    const w = this.weapon, p = this.player;
    if (w.kind !== 'weapon') return 0.6 * DEG;
    let s = THREE.MathUtils.lerp(w.hip, w.ads, this.ads);
    if (p.crouch) s *= 0.75;
    s += Math.hypot(p.vel.x, p.vel.z) / WALK * 0.9 * DEG * (1 - 0.6 * this.ads);
    if (!p.onGround) s += 3 * DEG;
    return s + this.bloom;
  }

  syncHeld() {
    const id = this.inv.weaponSlot?.id ?? null;
    if (id !== this.player.heldId) this.player.setHeld(id, id ? makeHeldWeapon(id) : null);
  }

  _switch(changed) {
    if (!changed) return;
    this.reload = null; this.use = null; this.cd = Math.max(this.cd, 0.3); this.bloom = 0;
    this.syncHeld();
  }

  // --- before player.update ---------------------------------------------------
  pre(dt, input) {
    const p = this.player;
    if (!p.dead) {
      if (input.consumePressed('Digit1')) this._switch(this.inv.select(0));
      if (input.consumePressed('Digit2')) this._switch(this.inv.select(1));
      if (input.consumePressed('Digit3')) this._switch(this.inv.select(-1));
      const wheel = input.consumeWheel();
      if (wheel) this._switch(this.inv.cycle(wheel > 0 ? 1 : -1));
    }
    const gun = this.weapon.kind === 'weapon';
    this.adsHeld = gun && input.button(2) && !this.reload && !p.dead;
    this.ads += ((this.adsHeld ? 1 : 0) - this.ads) * (1 - Math.exp(-14 * dt));
    if (this.ads < 0.002) this.ads = 0;

    // recoil recovery: give back a little over half of each kick
    const r = this.kick * (1 - Math.exp(-7 * dt));
    this.kick -= r; p.pitch -= r * 0.55;
    this.bloom = Math.max(0, this.bloom - 5 * DEG * dt);

    p.armed = gun;
    p.noSprint = this.adsHeld || !!this.use || this.sinceShot < 0.3;
    p.speedMul = this.adsHeld ? 0.55 : this.use ? 0.6 : 1;
    p.sens = THREE.MathUtils.lerp(1, (this.weapon.zoom ?? BASE_FOV) / BASE_FOV, this.ads);
    // drives the character's weapon pose
    p.ads = this.ads; p.reloadK = this.reload ? 1 - this.reload.t / this.reload.total : 0;
    p.eating = !!this.use;
  }

  // --- after the camera is placed --------------------------------------------
  // cam: { pos, look, dist } — look is the unit view direction, dist the camera-to-shoulder distance
  post(dt, input, cam) {
    const p = this.player, inv = this.inv;
    this.cd = Math.max(0, this.cd - dt);
    this.sinceShot += dt;

    this._nearT -= dt;
    if (this._nearT <= 0) { this._nearT = 0.12; this.near = p.dead ? [] : this.loot.nearby(p.pos.x, p.pos.z, PICKUP_RANGE); }
    if (p.dead) { this.reload = null; this.use = null; return; }

    if (input.consumePressed('KeyF')) this.pickup(this.near[0]);

    if (input.consumePressed('KeyR')) this.startReload();
    if (this.reload) {
      this.reload.t -= dt;
      if (this.reload.t <= 0) { inv.reload(); this.reload = null; }
    }

    for (const id of CONSUMABLES) if (input.consumePressed(ITEMS[id].key)) this.startUse(id);
    if (this.use) {
      this.use.t -= dt;
      if (this.use.t <= 0) this._finishUse();
    }

    const w = this.weapon;
    const trigger = w.kind === 'weapon' && w.auto ? input.button(0) : input.consumeClick(0);
    if (trigger && this.cd <= 0) {
      if (w.kind === 'melee') this._punch(cam);
      else {
        const slot = inv.weaponSlot;
        if (this.reload) { /* busy */ }
        else if (slot.ammo <= 0) {
          if (!this.startReload()) { this.ui.toast('沒有子彈了'); this.audio?.dry(); this.cd = 0.35; }
        } else this._fire(w, slot, cam);
      }
    }
  }

  startReload() {
    if (this.reload || !this.inv.canReload()) return false;
    this.use = null;
    const total = this.weapon.reload;
    this.reload = { t: total, total };
    this.audio?.reload();
    return true;
  }

  startUse(id) {
    const d = ITEMS[id], p = this.player;
    if (this.use?.id === id) return false;
    if (this.inv.items[id] <= 0) { this.ui.toast(`沒有${d.name}`); return false; }
    if (d.kind === 'heal' && p.hp >= d.cap) { this.ui.toast(d.cap < 100 ? `${d.name}只能補到 ${d.cap}` : '血量已滿'); return false; }
    if (d.kind === 'boost' && p.boost >= 100) { this.ui.toast('能量已滿'); return false; }
    this.reload = null;
    this.use = { id, t: d.time, total: d.time };
    return true;
  }

  _finishUse() {
    const d = ITEMS[this.use.id], p = this.player;
    this.use = null;
    if (this.inv.items[d.id] <= 0) return;
    this.inv.items[d.id]--;
    this.audio?.eat();
    if (d.kind === 'heal') p.heal(d.heal, d.cap);
    else p.boost = Math.min(100, p.boost + d.boost);
  }

  // Pick up a world item (default: nearest). Returns true if anything was taken.
  pickup(it) {
    if (!it || this.player.dead) return false;
    const res = this.inv.add(it);
    if (res.msg) this.ui.toast(res.msg);
    if (res.taken <= 0) return false;
    this.audio?.pickup();
    if (res.taken >= it.n) this.loot.remove(it); else it.n -= res.taken;
    if (res.dropped.length) this.loot.scatter(res.dropped, it.x, it.z, 0.5);
    if (ITEMS[it.id].kind === 'weapon') this._switch(true);
    this._nearT = 0;
    return true;
  }

  // Drop from the inventory onto the ground in front of the player.
  drop(what, n) {
    const before = this.inv.weaponSlot?.id ?? null;
    const s = this.inv.drop(what, n);
    if (!s) { if (what === 'pack') this.ui.toast('先丟掉一些東西才能卸下背包'); return false; }
    const p = this.player;
    this.loot.scatter([s], p.pos.x - Math.sin(p.yaw) * 1.1, p.pos.z - Math.cos(p.yaw) * 1.1, 0.4);
    if ((this.inv.weaponSlot?.id ?? null) !== before) this._switch(true);
    this._nearT = 0;
    return true;
  }

  onPlayerDeath() {
    const p = this.player;
    this.reload = null; this.use = null; this.ads = 0;
    this.loot.scatter(this.inv.dropAll(), p.pos.x, p.pos.z, 1.4);
    this.syncHeld();
  }

  // Nearest thing along a ray: world geometry or a target.
  trace(o, d, maxT) {
    const wh = this.world.raycast(o.x, o.y, o.z, d.x, d.y, d.z, maxT);
    let best = wh, maxE = wh ? wh.t : maxT;
    for (const e of this.enemies) {
      const h = e.raycast(o.x, o.y, o.z, d.x, d.y, d.z, maxE);
      if (h) { best = h; maxE = h.t; }
    }
    return best;
  }

  _fire(w, slot, cam) {
    const p = this.player, fx = this.fx;
    slot.ammo--;
    this.cd = 60 / w.rpm; this.sinceShot = 0; this.use = null;
    this.stats.shots++;

    const look = cam.look;
    const origin = this._o.copy(cam.pos).addScaledVector(look, cam.dist);
    const muzzle = p.muzzleWorld(this._m, muzzleLength(w.id));
    fx.muzzle(muzzle, look); this.audio?.shot(w.id); this.onShot?.(w);
    p.recoil = 1;
    // camera basis for the spread cone
    const right = this._r.set(-look.z, 0, look.x).normalize();
    const up = this._u.crossVectors(right, look);
    const spread = this.spread();
    const totals = new Map(); // target -> { dmg, head, point }
    for (let i = 0; i < (w.pellets || 1); i++) {
      const a = Math.random() * Math.PI * 2, r = Math.tan(spread) * Math.sqrt(Math.random());
      const dir = this._d.copy(look).addScaledVector(right, Math.cos(a) * r).addScaledVector(up, Math.sin(a) * r).normalize();
      // 1) where is the crosshair pointing?  2) what does the bullet hit on its way there from the muzzle?
      const ch = this.trace(origin, dir, w.range);
      const aim = this._e.copy(origin).addScaledVector(dir, ch ? ch.t : w.range);
      const md = dir.copy(aim).sub(muzzle); const mdist = md.length(); md.multiplyScalar(1 / (mdist || 1));
      const hit = this.trace(muzzle, md, mdist + 0.4) || (ch && !ch.target ? { ...ch, t: mdist } : null);
      const end = aim.copy(muzzle).addScaledVector(md, hit ? hit.t : mdist);
      fx.tracer(muzzle, end);
      if (!hit) continue;
      if (hit.target) {
        const dmg = w.dmg * falloff(w, hit.t) * (hit.zone === 'head' ? w.head : 1);
        const e = totals.get(hit.target) || { dmg: 0, head: false, point: end.clone(), dist: hit.t };
        e.dmg += dmg; e.head = e.head || hit.zone === 'head';
        totals.set(hit.target, e);
        fx.impact(end, this._n.copy(md).negate(), hit.target.kind === 'sentry' ? 'spark' : hit.target.sys.stats.ghosts !== undefined ? 'ghost' : 'hit', 4);
      } else {
        fx.impact(end, this._n.set(hit.nx, hit.ny, hit.nz), hit.kind === 'ground' ? 'dirt' : 'stone', w.pellets ? 3 : 7);
        if (!w.pellets || i % 3 === 0) fx.puff(end, this._n, hit.kind === 'ground' ? 'dirt' : 'stone');
      }
    }
    if (totals.size) this.stats.hits++;
    for (const [tg, e] of totals) this._applyHit(tg, e);

    // recoil + bloom
    const k = w.kick * (1 - 0.3 * this.ads) * (p.crouch ? 0.8 : 1);
    p.pitch = Math.min(0.95, p.pitch + k); this.kick += k;
    p.yaw += (Math.random() - 0.5) * k * 0.7;
    this.bloom = Math.min(2.5 * DEG, this.bloom + w.bloom);
  }

  _applyHit(tg, e) {
    const killed = tg.sys.damage(tg, e.dmg, e.dist);
    this.audio?.hit();
    e.point.y += 0.25;
    this.fx.number(e.point, String(Math.round(e.dmg)), e.head ? 'crit' : '');
    this.ui.hitmarker(killed ? 'kill' : e.head ? 'head' : 'hit');
    this.ui.showTarget(tg.name, tg.hp / tg.maxHp);
  }

  _punch(cam) {
    const p = this.player;
    this.cd = FISTS.rate; p.punchT = 0.3; this.use = null; this.sinceShot = 0; this.audio?.punch();
    const origin = this._o.set(p.pos.x, p.headY - 0.25, p.pos.z);
    const hit = this.trace(origin, cam.look, FISTS.range);
    if (!hit) return;
    const end = this._e.copy(origin).addScaledVector(cam.look, hit.t);
    if (hit.target) {
      this.fx.impact(end, this._n.copy(cam.look).negate(), 'hit', 5);
      this._applyHit(hit.target, { dmg: FISTS.dmg, head: false, point: end.clone(), dist: hit.t });
    } else this.fx.impact(end, this._n.set(hit.nx, hit.ny, hit.nz), hit.kind === 'ground' ? 'dirt' : 'stone', 4);
  }
}
