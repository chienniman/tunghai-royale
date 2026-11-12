// Weapons, shooting, reloading, healing and the player's inventory.
import * as THREE from 'three';
import { WEAPONS, AMMO, HEALS, ITEMS, gunMesh } from './items.js';
import { castWorld } from './raycast.js';

const WALK = 3.6;
const _dir = new THREE.Vector3(), _o = new THREE.Vector3(), _aim = new THREE.Vector3(), _muzzle = new THREE.Vector3();
const _d2 = new THREE.Vector3(), _end = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();
const _hit = {}, _hit2 = {};

export class Combat {
  constructor({ camera, rig, player, terrain, world, loot, targets, fx, sfx, input }) {
    Object.assign(this, { camera, rig, player, terrain, world, loot, targets, fx, sfx, input });
    this.slots = [null, null, null];        // two main weapons + sidearm: { id, loaded }
    this.cur = -1;                          // slot in hand, -1 = unarmed
    this.ammo = { '9mm': 0, '556': 0, '762': 0, '12g': 0 };
    this.heals = { bandage: 0, medkit: 0, drink: 0 };
    this.cooldown = 0; this.swap = 0;
    this.reload = null;                     // { t, total }
    this.cast = null;                       // { id, t, total }
    this.bloom = 0; this.ads = 0; this.recoil = 0;
    this.view = { ads: 0, fov: 60, scope: false };
    this.nearby = null;                     // loot item in reach
    this.spread = 0;
    this.feed = [];                         // { text, t }
    this.hitT = 0; this.hitHead = false; this.hitKill = false;
    this.shots = 0; this.hits = 0;
    this.ghosts = null;                     // set by the game; tools act on these
    this.swing = null;                      // { t, dur, hit, w, def } while a tool is being swung or thrown
    this.flying = [];                       // thrown things in the air
    this.puddles = [];                      // { x, z, r, t, slow, mesh } left by throwables
  }

  get weapon() { return this.cur >= 0 ? this.slots[this.cur] : null; }
  get def() { const w = this.weapon; return w ? WEAPONS[w.id] : null; }
  say(text) { this.feed.push({ text, t: 5 }); if (this.feed.length > 5) this.feed.shift(); }

  // ------------------------------------------------------------ inventory
  equip(i) {
    if (i === this.cur || (i >= 0 && !this.slots[i])) return;
    this.cur = i; this.swap = 0.45; this.reload = null; this.cast = null; this.bloom = 0;
    this._syncModels();
    if (i >= 0) this.sfx.equip();
  }

  _syncModels() {
    const p = this.player;
    p.setWeapon(this.weapon ? this.weapon.id : null);
    // show a main weapon that is not in hand on the back
    const other = [0, 1].find((i) => i !== this.cur && this.slots[i]);
    p.setBack(other !== undefined ? this.slots[other].id : null);
  }

  give(id, count = 1, loaded = 0) {
    const it = ITEMS[id];
    if (it.kind === 'ammo') {
      this.ammo[it.ammo] += count;
      const w = this.weapon;
      if (w && w.loaded === 0 && WEAPONS[w.id].ammo === it.ammo) this.startReload();
    } else if (it.kind === 'heal') {
      this.heals[id] += count;
    } else {
      const def = WEAPONS[id];
      if (def.kind && !loaded) loaded = def.charges;
      const same = def.kind === 'throw' ? this.slots.find((s) => s && s.id === id) : null;
      if (same) { same.loaded += loaded; return; }
      let slot;
      if (def.slot === 'side') slot = 2;
      else if (!this.slots[0]) slot = 0;
      else if (!this.slots[1]) slot = 1;
      else slot = this.cur === 1 ? 1 : 0;
      if (this.slots[slot]) this.dropSlot(slot, true);
      this.slots[slot] = { id, loaded };
      if (this.cur === -1 || this.cur === slot) { this.cur = -1; this.equip(slot); }
      else this._syncModels();
      if (!def.kind && this.cur === slot && loaded === 0 && this.ammo[def.ammo] > 0) this.startReload();
    }
  }

  dropSlot(i, silent = false) {
    const s = this.slots[i]; if (!s) return;
    const p = this.player, a = p.yaw + (Math.random() - 0.5);
    this.loot.add(s.id, p.pos.x - Math.sin(a) * 0.9, p.pos.z - Math.cos(a) * 0.9, { loaded: s.loaded });
    this.slots[i] = null;
    if (this.cur === i) {
      this.cur = -1; this.reload = null;
      if (!silent) { const next = [0, 1, 2].find((j) => this.slots[j]); if (next !== undefined) this.equip(next); }
    }
    this._syncModels();
  }

  pickup() {
    const it = this.nearby; if (!it || !this.loot.take(it)) return;
    this.give(it.id, it.count, it.loaded);
    this.sfx.pickup();
    const n = ITEMS[it.id];
    this.say(`撿起 ${n.name}${n.kind !== 'weapon' && it.count > 1 ? ' ×' + it.count : ''}`);
    this.nearby = null;
  }

  // ------------------------------------------------------------ reload / heal
  startReload() {
    const w = this.weapon, def = this.def;
    if (!w || def.kind || this.reload || w.loaded >= def.mag || this.ammo[def.ammo] <= 0) return;
    this.cast = null;
    this.reload = { t: 0, total: def.reload };
    this.sfx.reload(!!def.shellReload);
  }

  _finishReload() {
    const w = this.weapon, def = this.def;
    if (def.shellReload) {
      w.loaded++; this.ammo[def.ammo]--;
      if (w.loaded < def.mag && this.ammo[def.ammo] > 0) { this.reload = { t: 0, total: def.reload }; this.sfx.reload(true); return; }
      this.sfx.chamber();
    } else {
      const n = Math.min(def.mag - w.loaded, this.ammo[def.ammo]);
      w.loaded += n; this.ammo[def.ammo] -= n;
    }
    this.reload = null;
  }

  useHeal(id) {
    const h = HEALS[id], p = this.player;
    if (this.cast || this.heals[id] <= 0) return;
    if (h.boost ? p.boost >= 100 : p.hp >= h.cap) { this.say(h.boost ? '能量已滿' : `生命超過 ${h.cap}，不能用${h.name}`); return; }
    this.reload = null;
    this.cast = { id, t: 0, total: h.time };
  }

  _finishCast() {
    const { id } = this.cast, h = HEALS[id], p = this.player;
    this.heals[id]--;
    if (h.boost) p.boost = Math.min(100, p.boost + h.boost);
    else p.hp = Math.min(h.cap, Math.max(p.hp, Math.min(h.cap, p.hp + h.heal)));
    this.cast = null;
    this.sfx.heal();
  }

  // ------------------------------------------------------------ per frame
  update(dt) {
    const { input, player: p } = this;
    for (const f of this.feed) f.t -= dt;
    while (this.feed.length && this.feed[0].t <= 0) this.feed.shift();
    this.hitT = Math.max(0, this.hitT - dt);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.swap = Math.max(0, this.swap - dt);
    this.recoil *= Math.exp(-16 * dt);
    this.bloom *= Math.exp(-5 * dt);

    this.nearby = p.alive ? this.loot.nearest(p.pos, p.yaw) : null;
    if (!p.alive) { this.reload = this.cast = null; this._pose(dt, false); return; }

    // weapon selection
    if (input.hit('Digit1')) this.equip(0);
    if (input.hit('Digit2')) this.equip(1);
    if (input.hit('Digit3')) this.equip(2);
    if (input.hit('KeyX')) this.equip(-1);
    const wheel = input.consumeWheel();
    if (wheel) {
      const have = [0, 1, 2].filter((i) => this.slots[i]);
      if (have.length) {
        const at = have.indexOf(this.cur);
        this.equip(have[((at < 0 ? 0 : at + Math.sign(wheel)) + have.length) % have.length]);
      }
    }
    if (input.hit('KeyE')) this.pickup();
    if (input.hit('KeyG') && this.cur >= 0) { this.say(`丟下 ${this.def.name}`); this.dropSlot(this.cur); }
    if (input.hit('KeyR')) this.startReload();
    for (const id in HEALS) if (input.hit(HEALS[id].key)) this.useHeal(id);

    const w = this.weapon, def = this.def;
    const tool = !!(def && def.kind);
    const trigger = w && (tool ? (input.mouseHit(0) || (def.kind === 'melee' && input.mouse(0))) : (def.auto ? input.mouse(0) : input.mouseHit(0)));

    // healing: interrupted by shooting
    if (this.cast) {
      if (input.mouseHit(0)) this.cast = null;
      else { this.cast.t += dt; if (this.cast.t >= this.cast.total) this._finishCast(); }
    }
    // reloading
    if (this.reload && this.swap <= 0) {
      if (def.shellReload && input.mouseHit(0) && w.loaded > 0) this.reload = null;   // fire to interrupt
      else { this.reload.t += dt; if (this.reload.t >= this.reload.total) this._finishReload(); }
    }

    const busy = this.swap > 0 || !!this.reload || !!this.cast;
    const wantAds = !!w && !tool && input.mouse(2) && !busy && !p.sprinting;
    this.ads += ((wantAds ? 1 : 0) - this.ads) * (1 - Math.exp(-(wantAds ? 13 : 16) * dt));
    if (this.ads < 0.002) this.ads = 0;

    // movement penalties
    p.moveScale = this.cast ? 0.5 : this.ads > 0.5 ? 0.6 : 1;
    p.canSprint = !this.cast && this.cooldown <= 0 && !(w && (input.mouse(0) || input.mouse(2)));

    // current cone of fire (also drives the crosshair)
    if (def && !tool) {
      const base = THREE.MathUtils.lerp(def.hip, def.ads, this.ads);
      let move = 1 + Math.min(1.6, p.speed2d / WALK) * (1.1 - 0.75 * this.ads);
      if (!p.onGround) move *= 2.2;
      if (p.crouch) move *= 0.7;
      this.spread = base * move + this.bloom;
    } else this.spread = 0;

    if (trigger && !busy && this.cooldown <= 0 && !p.sprinting) {
      if (tool) this._useTool(w, def);
      else if (w.loaded > 0) this._fire(w, def);
      else if (input.mouseHit(0)) { this.sfx.dry(); this.startReload(); }
    }

    this._tools(dt);
    this._pose(dt, busy);
  }

  _pose(dt, busy) {
    const p = this.player, def = this.def;
    p.pose.raise = !def ? 0 : (p.sprinting || this.swap > 0.2 || this.cast) ? 0 : 1;
    p.pose.ads = this.ads;
    p.pose.reload = this.reload ? this.reload.t / this.reload.total : -1;
    p.pose.recoil = this.recoil;
    p.pose.swing = this.swing ? Math.min(1, this.swing.t / this.swing.dur) : -1;
    this.view.ads = def && !def.kind ? this.ads : 0;
    this.view.fov = def && !def.kind ? def.adsFov : 60;
    this.view.scope = !!(def && def.scope);
  }

  // ------------------------------------------------------------ tools against ghosts
  _useTool(w, def) {
    this.cooldown = def.cooldown;
    this.cast = null;
    this.swing = { t: 0, dur: def.kind === 'melee' ? def.swing : 0.5, hit: false, w, def };
    this.sfx.swish?.();
  }

  // Take one charge off the tool in hand; when it runs out it is gone.
  _spend(w, def, gone) {
    w.loaded--;
    if (w.loaded > 0) return;
    const i = this.slots.indexOf(w);
    if (i < 0) return;
    this.slots[i] = null;
    if (gone) this.say(gone);
    if (this.cur === i) { this.cur = -1; const next = [0, 1, 2].find((j) => this.slots[j]); if (next !== undefined) this.equip(next); }
    this._syncModels();
  }

  _tools(dt) {
    const { player: p, ghosts, fx } = this;
    const s = this.swing;
    if (s) {
      s.t += dt;
      const def = s.def, at = def.kind === 'melee' ? 0.45 : 0.4;
      if (!s.hit && s.t >= s.dur * at) {
        s.hit = true;
        if (def.kind === 'melee') {
          const n = ghosts ? ghosts.strike({ x: p.pos.x, z: p.pos.z, yaw: p.yaw, range: def.range, arc: def.arc, stun: def.stun, push: def.push, banish: def.banish, tag: def.tag }) : 0;
          if (n) {
            this.hits++; this.hitT = 0.22; this.hitHead = false; this.hitKill = false;
            this.sfx.thwack?.(); this.rig.shake = Math.min(0.05, this.rig.shake + 0.025);
            this._spend(s.w, def, `${def.name}壞掉了`);
          }
          this.shots++;
        } else if (def.kind === 'throw') {
          // leave the hand along the view direction with a little lift
          const mesh = gunMesh(s.w.id); mesh.castShadow = false;
          p.getMuzzle(_muzzle); mesh.position.copy(_muzzle);
          p.rig.root.parent.add(mesh);
          const look = this.rig.look;
          this.flying.push({ def, mesh, vel: new THREE.Vector3(look.x * def.speed, look.y * def.speed + 3.2, look.z * def.speed), spin: 6 + Math.random() * 6, t: 0 });
          this._spend(s.w, def);
          this.shots++;
        }
      }
      if (s.t >= s.dur) this.swing = null;
    }

    // things in the air
    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i], m = f.mesh;
      f.t += dt; f.vel.y -= 18 * dt;
      m.position.addScaledVector(f.vel, dt); m.rotation.x += f.spin * dt; m.rotation.z += f.spin * 0.6 * dt;
      const ground = this.terrain.heightAt(m.position.x, m.position.z);
      const wall = this.world.colliders.hit(m.position.x, m.position.y, m.position.z);
      const direct = ghosts ? ghosts.nearestWithin(m.position.x, m.position.z, 0.9, m.position.y) : null;
      if (m.position.y <= ground + 0.05 || wall || direct || f.t > 6) {
        m.parent.remove(m);
        this.flying.splice(i, 1);
        if (wall) { m.position.x -= f.vel.x * dt * 1.5; m.position.z -= f.vel.z * dt * 1.5; }   // splash at the foot of the wall
        this._splash(f.def, m.position.x, m.position.z, direct);
      }
    }

    // puddles fade out
    for (let i = this.puddles.length - 1; i >= 0; i--) {
      const q = this.puddles[i]; q.t -= dt;
      q.mesh.material.opacity = 0.55 * Math.min(1, q.t / 2);
      if (q.t <= 0) { q.mesh.parent.remove(q.mesh); q.mesh.geometry.dispose(); q.mesh.material.dispose(); this.puddles.splice(i, 1); }
    }
    if (ghosts) ghosts.hazards = this.puddles;
  }

  _splash(def, x, z, direct) {
    const { ghosts, fx, terrain } = this, y = terrain.heightAt(x, z);
    for (let k = 0; k < 3; k++) fx.impact(x, y + 0.1, z, (Math.random() - 0.5) * 0.6, 1, (Math.random() - 0.5) * 0.6, 'milk');
    this.sfx.splash?.();
    // a slick on the ground that ghosts slip on
    const geo = new THREE.CircleGeometry(def.radius, 28).rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) pos.setY(i, terrain.heightAt(x + pos.getX(i), z + pos.getZ(i)) - y + 0.05);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xf2efe6, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }));
    mesh.position.set(x, y, z);
    this.player.rig.root.parent.add(mesh);
    this.puddles.push({ x, z, r: def.radius, t: def.duration, slow: def.slow, mesh });
    if (!ghosts) return;
    const n = ghosts.strike({ x, z, yaw: 0, range: def.radius, arc: 7, stun: def.stun, push: 0, banish: def.banish, tag: def.tag });
    if (direct) ghosts.hitGhost(direct, { stun: def.stun * 2, push: 2, banish: def.banish * 2, tag: def.tag }, 0, 0);
    if (n || direct) { this.hits++; this.hitT = 0.22; this.hitHead = false; this.hitKill = false; }
  }

  // ------------------------------------------------------------ shooting
  _fire(w, def) {
    const { player: p, rig, camera, fx, sfx } = this;
    w.loaded--;
    this.cooldown = 60 / def.rpm;
    const scoped = rig.scoped;
    if (scoped) _muzzle.copy(camera.position).addScaledVector(rig.look, 0.6);
    else p.getMuzzle(_muzzle);

    const pellets = def.pellets || 1;
    for (let i = 0; i < pellets; i++) this._bullet(def, scoped, pellets > 1);
    this.shots++;

    // recoil: part of the climb stays, part settles back
    const stance = (p.crouch ? 0.75 : 1) * (1 - 0.25 * this.ads);
    const v = def.recoilV * stance * (0.85 + Math.random() * 0.3);
    p.pitch = Math.min(0.95, p.pitch + v * 0.4);
    p.kickP += v * 0.6;
    const h = (Math.random() - 0.5) * 2 * def.recoilH * stance;
    p.yaw += h * 0.5; p.kickY += h * 0.5;
    this.bloom = Math.min(def.bloom * 9, this.bloom + def.bloom);
    this.recoil = Math.min(1.6, this.recoil + 0.6 + def.recoilV * 8);
    rig.shake = Math.min(0.05, rig.shake + def.recoilV * 0.5);

    if (!scoped) fx.muzzle(_muzzle, rig.look, def.pellets ? 1.5 : def.scope ? 1.4 : 1);
    sfx.shot(def.sound);
    if (def.scope || def.shellReload) setTimeout(() => sfx.chamber(), 420);   // work the bolt / pump
    if (w.loaded === 0 && this.ammo[def.ammo] > 0) setTimeout(() => { if (this.weapon === w) this.startReload(); }, 350);
  }

  // Nearest thing along a ray: the world or a target.
  _cast(o, d, maxT, out) {
    const world = castWorld(this.terrain, this.world.colliders, o, d, maxT, out);
    const tg = this.targets.raycast(o, d, world.kind ? world.t : maxT);
    if (tg) return { t: tg.t, target: tg };
    return world.kind ? { t: world.t, world } : null;
  }

  _bullet(def, scoped, pellet) {
    const { camera, rig, fx } = this;
    // random direction inside the cone of fire
    const look = rig.look, s = this.spread;
    const r = Math.sqrt(Math.random()) * s, a = Math.random() * Math.PI * 2;
    _a.crossVectors(look, camera.up).normalize(); _b.crossVectors(_a, look);
    _dir.copy(look).addScaledVector(_a, Math.cos(a) * r).addScaledVector(_b, Math.sin(a) * r).normalize();

    // 1) where the crosshair is pointing (start just past the player so the camera can't hit things behind them)
    const skip = scoped ? 0.3 : rig.dist + 0.35;
    _o.copy(camera.position).addScaledVector(_dir, skip);
    let hit = this._cast(_o, _dir, def.range, _hit);
    _aim.copy(_o).addScaledVector(_dir, hit ? hit.t : def.range);
    let origin = _o, dir = _dir;

    // 2) the bullet really leaves from the muzzle: anything between the gun and that point stops it
    if (!scoped) {
      _d2.subVectors(_aim, _muzzle);
      const len = _d2.length();
      if (len > 0.3 && _d2.dot(look) / len > 0.25) {
        _d2.divideScalar(len);
        const h2 = this._cast(_muzzle, _d2, len + 0.25, _hit2);
        if (h2) { hit = h2; origin = _muzzle; dir = _d2; }
      }
    }
    if (hit) _end.copy(origin).addScaledVector(dir, hit.t); else _end.copy(_aim);
    if (!pellet || Math.random() < 0.4) fx.tracer(_muzzle, _end);
    if (!hit) return;

    const dist = _end.distanceTo(_muzzle);
    if (hit.target) {
      const [d0, d1, min] = def.falloff;
      const fall = dist <= d0 ? 1 : dist >= d1 ? min : 1 - (1 - min) * (dist - d0) / (d1 - d0);
      const head = hit.target.zone === 'head';
      const dmg = def.dmg * fall * (head ? def.head : 1);
      const down = this.targets.damage(hit.target, dmg);
      fx.impact(_end.x, _end.y, _end.z, -dir.x, -dir.y, -dir.z, 'target');
      this.hits++;
      this.hitT = 0.22; this.hitHead = head; this.hitKill = down;
      if (down) { this.sfx.down(); this.say(`擊倒靶子${head ? '（爆頭）' : ''} · ${Math.round(dist)} m`); }
      else this.sfx.hit(head);
    } else {
      const h = hit.world;
      fx.impact(h.x, h.y, h.z, h.nx, h.ny, h.nz, h.kind);
      if (h.decal) fx.hole(h.x, h.y, h.z, h.nx, h.ny, h.nz);
    }
  }
}
