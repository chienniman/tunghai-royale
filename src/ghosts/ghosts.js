// Ghost runtime: spawns apparitions, moves them, tells each type what the player is doing
// (looking at it, lighting it, standing under a lamp), and turns their presence into dread
// (torch flicker, silence, heartbeat). Each legend is a small "type" object registered here.
import * as THREE from 'three';
import { createGhostFigure } from './figure.js';
import { castWorld } from '../game/raycast.js';

const _a = new THREE.Vector3(), _d = new THREE.Vector3(), _hit = {};
const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (a - b) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };

export class Ghosts {
  constructor({ scene, terrain, world, player, rig, camera, torch, spooks }) {
    Object.assign(this, { scene, terrain, world, player, rig, camera, torch, spooks });
    this.types = {};
    this.list = [];
    this.dread = 0;            // 0..1, how close the nearest threat is; drives heartbeat and hush
    this.beat = 0;
    this.onSay = null;         // (text) => void
    this.onScare = null;       // (ghost, strength) => void, when one strikes
    this.api = this._makeApi();
  }

  register(id, def) { this.types[id] = { id, speed: 2.4, radius: 0.45, hover: 0, phase: true, touch: 1.1, ...def }; return this; }

  spawn(id, x, z, data = {}) {
    const type = this.types[id]; if (!type) throw new Error('unknown ghost type ' + id);
    const fig = type.build ? type.build(data) : createGhostFigure({ seed: this.list.length * 7 + 1, ...(type.figure || {}), ...(data.figure || {}) });
    const g = {
      type, id, fig, data, pos: new THREE.Vector3(x, this.terrain.heightAt(x, z), z), yaw: 0, speed: 0,
      state: 'idle', t: 0, stateT: 0, alive: true, fade: 1, fadeTo: 0, stun: 0, see: { t: 0, seen: false, lit: false, los: true },
      em: null, voiceT: 2 + Math.random() * 4, drone: null,
    };
    fig.setDissolve(1);                       // starts invisible and fades in
    this.scene.add(fig.group);
    this.list.push(g);
    type.init?.(g, this.api);
    return g;
  }

  remove(g) {
    g.alive = false;
    this.scene.remove(g.fig.group);
    g.drone?.stop(); g.em?.dispose();
    const i = this.list.indexOf(g); if (i >= 0) this.list.splice(i, 1);
  }

  clear() { for (const g of [...this.list]) this.remove(g); }

  _makeApi() {
    const self = this;
    return {
      get player() { return self.player; },
      get torch() { return self.torch; },
      terrain: this.terrain, world: this.world, spooks: this.spooks,
      say: (text) => self.onSay?.(text),
      dist: (g) => Math.hypot(g.pos.x - self.player.pos.x, g.pos.z - self.player.pos.z),
      // is the ghost inside the player's view and not hidden behind a building or a hill?
      seen: (g) => g.see.seen,
      // is the torch beam on it?
      lit: (g) => g.see.lit,
      // is it standing in the light of a working street lamp?
      underLamp: (g) => !!self.world.lamps.litAt(g.pos.x, g.pos.z, 6.5),
      playerUnderLamp: () => !!self.world.lamps.litAt(self.player.pos.x, self.player.pos.z, 6.5),
      // signed angle (rad) from where the player is looking to where the ghost is: 0 = dead ahead, ±π = directly behind
      bearing: (g) => angDiff(Math.atan2(-(g.pos.x - self.player.pos.x), -(g.pos.z - self.player.pos.z)), self.player.yaw),
      // glide toward a point; returns the distance left
      moveTo: (g, x, z, speed, dt) => self._move(g, x, z, speed, dt),
      face: (g, x, z, dt, rate = 6) => { g.yaw += angDiff(Math.atan2(-(x - g.pos.x), -(z - g.pos.z)), g.yaw) * (1 - Math.exp(-rate * dt)); },
      // put it somewhere else at once (fade out first for a clean vanish)
      place: (g, x, z) => { g.pos.set(x, self.terrain.heightAt(x, z), z); },
      // a point `dist` metres from the player at `bearing` radians from their view direction
      around: (dist, bearing) => {
        const a = self.player.yaw + bearing;
        return [self.player.pos.x - Math.sin(a) * dist, self.player.pos.z - Math.cos(a) * dist];
      },
      appear: (g) => { g.fadeTo = 0; },
      vanish: (g) => { g.fadeTo = 1; },
      setState: (g, s) => { if (g.state !== s) { g.state = s; g.stateT = 0; } },
      hurt: (g, amount, strength = 1) => {
        self.player.damage(amount);
        self.onScare?.(g, strength);
      },
      stun: (g, seconds) => { g.stun = Math.max(g.stun, seconds); },
      remove: (g) => self.remove(g),
      rand: Math.random,
    };
  }

  _move(g, x, z, speed, dt) {
    const dx = x - g.pos.x, dz = z - g.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.02) { g.speed = 0; return d; }
    const step = Math.min(d, speed * dt);
    g.pos.x += dx / d * step; g.pos.z += dz / d * step;
    if (!g.type.phase) this.world.colliders.resolve(g.pos, g.type.radius, g.pos.y);
    g.pos.y = this.terrain.heightAt(g.pos.x, g.pos.z);
    g.speed = speed;
    this.api.face(g, x, z, dt);
    return d - step;
  }

  // What the player can see / light, refreshed a few times a second per ghost (the line-of-sight ray is the cost).
  _perceive(g, dt) {
    const s = g.see; s.t -= dt;
    if (s.t > 0) return;
    s.t = 0.12 + Math.random() * 0.06;
    const cam = this.camera.position, look = this.rig.look;
    _d.set(g.pos.x - cam.x, g.pos.y + 1.2 - cam.y, g.pos.z - cam.z);
    const dist = _d.length(); _d.divideScalar(dist || 1);
    const cos = _d.dot(look);
    // line of sight: nothing solid between the eye and the ghost's chest
    s.los = true;
    if (dist > 1 && dist < 140) {
      _a.copy(cam).addScaledVector(_d, 0.4);
      const w = castWorld(this.terrain, this.world.colliders, _a, _d, dist - 0.8, _hit);
      s.los = !w.kind;
    } else if (dist >= 140) s.los = false;
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov) * 0.5 * Math.max(1, this.camera.aspect) * 0.9;
    s.seen = s.los && cos > Math.cos(Math.min(1.3, halfFov)) && g.fade < 0.9;
    const L = this.torch.light;
    if (this.torch.on && L.intensity > 1) {
      _a.set(g.pos.x - L.position.x, g.pos.y + 1.2 - L.position.y, g.pos.z - L.position.z);
      const ld = _a.length(); _a.divideScalar(ld || 1);
      s.lit = s.los && ld < L.distance * 0.8 && _a.dot(this.torch.dir) > Math.cos(L.angle * 0.9);
    } else s.lit = false;
  }

  update(dt) {
    const p = this.player;
    let dread = 0, flicker = 0;
    for (const g of [...this.list]) {
      if (!g.alive) continue;
      g.t += dt; g.stateT += dt;
      this._perceive(g, dt);
      if (g.stun > 0) { g.stun -= dt; g.speed = 0; g.fig.setGlitch(Math.min(1, g.stun) * 0.6); }
      else { g.fig.setGlitch(0); g.type.update?.(g, dt, this.api); }
      if (!g.alive) continue;

      // fade in / out
      if (g.fade !== g.fadeTo) {
        const rate = g.type.fadeRate ?? 1.6;
        g.fade += Math.sign(g.fadeTo - g.fade) * Math.min(Math.abs(g.fadeTo - g.fade), rate * dt);
        g.fig.setDissolve(g.fade);
      }
      g.fig.group.position.set(g.pos.x, g.pos.y + g.type.hover, g.pos.z);
      g.fig.group.rotation.y = g.yaw;
      g.fig.update(dt, g.speed);

      // presence
      const d = Math.hypot(g.pos.x - p.pos.x, g.pos.z - p.pos.z);
      const present = 1 - g.fade;
      const near = Math.max(0, 1 - d / (g.type.dreadRange ?? 28)) * present * (g.type.menace ?? 1);
      if (near > dread) dread = near;
      const fl = Math.max(0, 1 - d / (g.type.flickerRange ?? 14)) * present;
      if (fl > flicker) flicker = fl;

      // voice
      if (this.spooks.ready) {
        if (!g.em) { g.em = this.spooks.emitter(); if (g.type.drone !== false) g.drone = this.spooks.drone(g.em); }
        g.em.set(g.pos.x, g.pos.y + 1.4, g.pos.z);
        g.drone?.level(present * Math.max(0, 1 - d / 22));
        g.voiceT -= dt;
        if (g.voiceT <= 0 && present > 0.5 && d < 45) {
          const v = g.type.voice ?? 'whisper';
          if (v && this.spooks[v]) this.spooks[v](g.em, g.type.voiceGain ?? 1);
          g.voiceT = (g.type.voiceEvery ?? 7) * (0.6 + Math.random() * 0.8);
        }
      }
    }

    // dread -> torch flicker, insects falling silent, heartbeat
    this.dread += (dread - this.dread) * (1 - Math.exp(-(dread > this.dread ? 4 : 1.2) * dt));
    this.torch.flicker = flicker * 0.85;
    this.spooks.hush(Math.min(1, this.dread * 1.6));
    if (this.dread > 0.12 && p.alive) {
      this.beat -= dt;
      if (this.beat <= 0) { this.spooks.heartbeat(0.35 + this.dread * 0.9); this.beat = 1.15 - this.dread * 0.72; }
    }
  }
}

// A generic restless spirit used to exercise the system: it drifts toward you when you are not looking,
// freezes and shies away in torchlight, and drains you if it reaches you.
export const WANDERER = {
  name: '遊魂', figure: {}, speed: 2.6, voice: 'whisper',
  init(g) { g.state = 'stalk'; },
  update(g, dt, api) {
    const p = api.player, d = api.dist(g);
    if (g.state === 'stalk') {
      api.appear(g);
      if (api.lit(g)) { api.setState(g, 'recoil'); return; }
      // creeps while watched, rushes when the player looks away
      const speed = api.seen(g) ? 0.5 : g.type.speed * (d > 25 ? 1.6 : 1);
      api.moveTo(g, p.pos.x, p.pos.z, speed, dt);
      g.fig.reach(d < 5 ? 1 : 0);
      if (d < g.type.touch) { api.hurt(g, 18, 1); api.setState(g, 'fled'); api.vanish(g); }
    } else if (g.state === 'recoil') {
      // back away from the beam, then melt
      const [x, z] = [g.pos.x + (g.pos.x - p.pos.x) / (d || 1) * 6, g.pos.z + (g.pos.z - p.pos.z) / (d || 1) * 6];
      api.moveTo(g, x, z, 1.4, dt); api.face(g, p.pos.x, p.pos.z, dt, 20);
      g.fig.reach(0);
      if (g.stateT > 1.2) { api.vanish(g); api.setState(g, 'fled'); }
    } else if (g.state === 'fled') {
      g.speed = 0;
      if (g.fade >= 1 && g.stateT > 6) {      // come back from somewhere behind the player
        const [x, z] = api.around(22 + api.rand() * 12, Math.PI + (api.rand() - 0.5) * 1.6);
        api.place(g, x, z); api.setState(g, 'stalk');
      }
    }
  },
};
