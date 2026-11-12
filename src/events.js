import * as THREE from 'three';
import { mulberry32 } from './util.js';
import { ammoStack } from './items.js';
import { boxes } from './models.js';

// Things that happen to you. A director rolls a new disturbance every so often
// (different pools for day and night) so no two sessions play out the same way.
//
//   day    空投補給 · 午後雷陣雨
//   night  停電 · 鬼打牆 · 百鬼夜行 · 紅衣小女孩 · 鬼火引路 · 空投補給 · 雷雨
//   fixed  子時鐘聲 at midnight · 血月 on some nights
const POOL = {
  day: [['supply', 5], ['storm', 3]],
  night: [['blackout', 4], ['wall', 3], ['parade', 3], ['girl', 4], ['wisp', 4], ['supply', 2], ['storm', 2]],
};

export class Events {
  // deps: { scene, terrain, world, loot, fx, audio, ui, sky, ghosts, monsters, player }
  constructor(deps) {
    Object.assign(this, deps);
    this.rng = mulberry32((Date.now() & 0xffff) + 7); // events are meant to differ between sessions
    this.next = 22;            // seconds until the next roll
    this.cool = {};            // per-event cooldowns
    this.blackout = 0;         // seconds of darkness left
    this.wall = 0;             // seconds of 鬼打牆 left
    this.storm = 0;            // seconds of rain left
    this.stormK = 0;           // 0..1 smoothed, for visuals
    this.parade = 0;
    this.blood = false;
    this.flash = 0;            // lightning, 0..1
    this.crates = [];          // supply crates in the air or on the ground
    this.fire = null;          // 鬼火 leading to a cache
    this._wasNight = false; this._lastHour = this.sky.hour; this._bolt = 4;
    this._v = new THREE.Vector3(); this._n = new THREE.Vector3(0, 1, 0);

    // rain: short streaks in a box that follows the camera
    const N = 1400, pos = new Float32Array(N * 6);
    this.rainSeed = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) this.rainSeed[i] = Math.random();
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.rain = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xb9cbe0, transparent: true, opacity: 0, depthWrite: false }));
    this.rain.frustumCulled = false; this.rain.visible = false; this.scene.add(this.rain);
    this._rt = 0;

    // 鬼火: a cold blue flame
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), gr = x.createRadialGradient(32, 38, 0, 32, 34, 30);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(140,220,255,.9)'); gr.addColorStop(1, 'rgba(40,90,255,0)');
    x.fillStyle = gr; x.beginPath(); x.moveTo(32, 2); x.bezierCurveTo(52, 26, 56, 44, 32, 62); x.bezierCurveTo(8, 44, 12, 26, 32, 2); x.fill();
    this.flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), color: 0x7fc4ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    this.flame.visible = false; this.scene.add(this.flame);
    this.flameLight = new THREE.PointLight(0x6fb8ff, 0, 9, 1.6); this.scene.add(this.flameLight);

    this.crateGeo = boxes([
      { s: [1.1, 0.8, 1.1], p: [0, 0.4, 0], c: 0x4d5a3a },
      { s: [1.14, 0.1, 1.14], p: [0, 0.78, 0], c: 0x2f3824 }, { s: [1.14, 0.1, 1.14], p: [0, 0.06, 0], c: 0x2f3824 },
      { s: [0.12, 0.84, 1.16], p: [0, 0.4, 0], c: 0xc9a43a }, { s: [1.16, 0.84, 0.12], p: [0, 0.4, 0], c: 0xc9a43a },
    ]);
    this.crateMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
    this.chuteGeo = new THREE.SphereGeometry(2.2, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5).scale(1, 0.62, 1).translate(0, 3.6, 0);
    this.chuteMat = new THREE.MeshStandardMaterial({ color: 0xd8572a, roughness: 0.9, side: THREE.DoubleSide });
    this.beamMat = new THREE.MeshBasicMaterial({ color: 0xffc84a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide });
    this.beamGeo = new THREE.CylinderGeometry(0.25, 0.5, 60, 10, 1, true).translate(0, 30, 0);
  }

  // Map pins: crates the player has not reached yet.
  get markers() { return this.crates.filter((c) => !c.looted).map((c) => ({ x: c.x, z: c.z, color: '#ffc84a' })); }
  get torchOut() { return this.blackout > 0 || this.taken > 0; }

  _spot(minD, maxD, ahead = false) {
    const p = this.player.pos;
    for (let i = 0; i < 20; i++) {
      const a = ahead ? this.player.yaw + (this.rng() - 0.5) * 1.6 : this.rng() * 6.283, d = minD + this.rng() * (maxD - minD);
      const x = p.x - Math.sin(a) * d, z = p.z - Math.cos(a) * d;
      if (this.terrain.inBounds(x, z, 12) && !this.world.colliders.blocked(x, this.terrain.heightAt(x, z) + 1, z)) return { x, z };
    }
    return null;
  }

  _goodLoot() {
    const r = this.rng, w = r() < 0.45 ? 'sniper' : r() < 0.6 ? 'ar' : 'shotgun';
    const ammo = { sniper: 'ammo_762', ar: 'ammo_556', shotgun: 'ammo_12g' }[w];
    const mag = { sniper: 5, ar: 30, shotgun: 5 }[w];
    return [{ id: w, n: 1, ammo: mag }, ammoStack(ammo, r), ammoStack(ammo, r), { id: r() < 0.5 ? 'vest3' : 'helmet3', n: 1, dur: r() < 0.5 ? 250 : 230 },
      { id: 'guabao', n: 1 }, { id: 'friedchicken', n: 2 }, { id: r() < 0.5 ? 'pack3' : 'icecream', n: 1 }];
  }

  // --- the events themselves -------------------------------------------------
  start(name) {
    const { ui, audio } = this;
    switch (name) {
      case 'supply': {
        const s = this._spot(55, 120); if (!s) return false;
        const g = new THREE.Group();
        const box = new THREE.Mesh(this.crateGeo, this.crateMat); box.castShadow = true; g.add(box);
        const chute = new THREE.Mesh(this.chuteGeo, this.chuteMat); g.add(chute);
        const beam = new THREE.Mesh(this.beamGeo, this.beamMat); g.add(beam);
        const y0 = this.terrain.heightAt(s.x, s.z);
        g.position.set(s.x, y0 + 110, s.z); this.scene.add(g);
        this.crates.push({ x: s.x, z: s.z, ground: y0, g, chute, beam, landed: false, looted: false, life: 240 });
        ui.banner('空投補給', '補給箱正在降落，地圖上有標記', 'gold'); audio?.plane?.();
        return true;
      }
      case 'storm': if (this.storm > 0) return false; this.storm = 55 + this.rng() * 35; this._bolt = 5; ui.banner('午後雷陣雨', '視線變差，雨聲會蓋掉腳步聲', 'blue'); return true;
      case 'blackout':
        this.blackout = 11; this.ghosts.spawnT.wisp = 0; this.ghosts._pulse = 1;
        ui.banner('停電', '全校燈光熄滅，手電筒也沒了反應', 'red'); audio?.powerDown?.();
        return true;
      case 'wall': this.wall = 26; ui.banner('鬼打牆', '起霧了。羅盤亂轉，怎麼走都像在原地', 'red'); audio?.whisper(); return true;
      case 'parade':
        this.parade = 34;
        for (let i = 0; i < 6; i++) this.ghosts._spawn('wisp', this.player);
        this.monsters.spawnJiangshi(this.player, true); this.monsters.spawnJiangshi(this.player, true);
        ui.banner('百鬼夜行', '撐過去就有補給', 'red'); audio?.bell?.(2);
        return true;
      case 'girl': if (!this.monsters.spawnGirl(this.player)) return false; ui.banner('紅衣小女孩', '前面有人在笑……不要跟上去', 'red'); return true;
      case 'wisp': {
        if (this.fire) return false;
        const from = this._spot(7, 10, true), to = this._spot(60, 95); if (!from || !to) return false;
        this.fire = { x: from.x, z: from.z, tx: to.x, tz: to.z, t: 0 };
        this.flame.visible = true;
        ui.banner('鬼火引路', '一團藍火在前面晃。跟著它，也許有好東西', 'blue'); audio?.wisp();
        return true;
      }
      case 'midnight':
        this.ghosts.spawnT.banshee = 0; this.ghosts.spawnT.wisp = 0; this.monsters.spawnT.jiangshi = 0; this.monsters.spawnT.hanged = 0;
        ui.banner('子時', '鐘聲響了。它們都醒了', 'red'); audio?.bell?.(3);
        return true;
      case 'blood': this.blood = true; ui.banner('血月', '今晚的東西更快、更兇，掉的也更好', 'red'); audio?.bell?.(1); return true;
    }
    return false;
  }

  update(dt, cam) {
    const { sky, player, ui } = this, night = sky.night > 0.6;
    // fixed events: blood moon is decided at dusk, the bell at midnight
    if (night && !this._wasNight && this.rng() < 0.3) this.start('blood');
    if (!night && this._wasNight) this.blood = false;
    this._wasNight = night;
    if (this._lastHour > 20 && sky.hour < 4 && night) this.start('midnight');
    this._lastHour = sky.hour;
    this.monsters.speedMul = this.blood ? 1.25 : 1;
    sky.blood += ((this.blood && night ? 1 : 0) - sky.blood) * (1 - Math.exp(-0.8 * dt));

    // the director
    for (const k of Object.keys(this.cool)) this.cool[k] = Math.max(0, this.cool[k] - dt);
    if (!player.dead && (this.next -= dt) <= 0) {
      const pool = POOL[night ? 'night' : 'day'].filter(([n]) => !(this.cool[n] > 0));
      let total = 0; for (const [, w] of pool) total += w;
      let r = this.rng() * total, pick = null;
      for (const [n, w] of pool) { if ((r -= w) <= 0) { pick = n; break; } }
      if (pick && this.start(pick)) { this.cool[pick] = 90; this.next = night ? 28 + this.rng() * 26 : 45 + this.rng() * 40; }
      else this.next = 6;
    }

    // --- running effects ---
    this.blackout = Math.max(0, this.blackout - dt);
    this.taken = Math.max(0, (this.taken || 0) - dt);
    this.wall = Math.max(0, this.wall - dt);
    sky.fogMul += ((this.wall > 0 ? 0.11 : 1) - sky.fogMul) * (1 - Math.exp(-1.5 * dt));
    ui.hud.jam = this.wall > 0 ? 1 : 0;
    if (this.parade > 0 && (this.parade -= dt) <= 0 && !player.dead) { this.start('supply'); ui.toast('百鬼夜行結束了'); }

    // storm: rain, gloom, lightning
    this.storm = Math.max(0, this.storm - dt);
    this.stormK += ((this.storm > 0 ? 1 : 0) - this.stormK) * (1 - Math.exp(-0.9 * dt));
    sky.overcast = this.stormK;
    this.audio?.setRain?.(this.stormK);
    this.flash = Math.max(0, this.flash - dt * 5);
    if (this.storm > 0 && (this._bolt -= dt) <= 0) {
      this._bolt = 4 + this.rng() * 9; this.flash = 1;
      const delay = 300 + this.rng() * 1600; setTimeout(() => this.audio?.thunder?.(), delay);
    }
    sky.flash = this.flash > 0 ? this.flash * (Math.sin(this.flash * 40) > -0.3 ? 1 : 0.2) : 0;
    this._rain(dt, cam);

    // supply crates
    for (const c of this.crates) {
      if (!c.landed) {
        c.g.position.y -= 6.5 * dt; c.g.rotation.y += 0.25 * dt;
        if (c.g.position.y <= c.ground) {
          c.g.position.y = c.ground; c.landed = true; c.chute.visible = false;
          this._v.set(c.x, c.ground + 0.3, c.z);
          for (let i = 0; i < 5; i++) this.fx.puff(this._v, this._n, 'dirt');
          this.loot.scatter(this._goodLoot(), c.x, c.z, 1.9);
          this.audio?.thud?.(1);
        }
      } else {
        c.life -= dt;
        if (!c.looted && Math.hypot(player.pos.x - c.x, player.pos.z - c.z) < 4) { c.looted = true; c.beam.visible = false; }
        if (c.life <= 0) { this.scene.remove(c.g); c.dead = true; }
      }
    }
    if (this.crates.some((c) => c.dead)) this.crates = this.crates.filter((c) => !c.dead);

    // 鬼火: stays a little ahead of you, waits if you fall behind, burns out over the cache
    const f = this.fire;
    if (f) {
      f.t += dt;
      const dx = f.tx - f.x, dz = f.tz - f.z, d = Math.hypot(dx, dz), pd = Math.hypot(player.pos.x - f.x, player.pos.z - f.z);
      if (d > 0.6) { const sp = pd < 13 ? 4.6 : 0; f.x += dx / d * sp * dt; f.z += dz / d * sp * dt; }
      const y = this.terrain.heightAt(f.x, f.z) + 1.3 + Math.sin(f.t * 3) * 0.2;
      this.flame.position.set(f.x, y, f.z); this.flame.scale.set(0.8 + Math.sin(f.t * 13) * 0.08, 1.2 + Math.sin(f.t * 9) * 0.15, 1);
      this.flameLight.position.set(f.x, y, f.z); this.flameLight.intensity = 5 + Math.sin(f.t * 17) * 1.5;
      if (d <= 0.6 && pd < 6) {
        this.loot.scatter(this._goodLoot().slice(0, 5), f.tx, f.tz, 1.4);
        this._v.set(f.x, y, f.z); this.fx.impact(this._v, this._n, 'ghost', 24);
        ui.toast('鬼火熄了，地上留著東西'); this.fire = null;
      } else if (f.t > 150 || !this.sky || sky.night < 0.4) { this.fire = null; }
      if (!this.fire) { this.flame.visible = false; this.flameLight.intensity = 0; }
    }
  }

  // The girl caught you: wake up somewhere else, in the dark.
  takeAway() {
    const s = this._spot(140, 240) || this._spot(60, 140); if (!s) return;
    const p = this.player;
    p.pos.set(s.x, this.terrain.heightAt(s.x, s.z), s.z); p.vel.set(0, 0, 0); p.yaw = this.rng() * 6.283;
    this.taken = 9;
    this.ui.blackoutFade(1.6); this.ui.banner('你被牽走了', '這是哪裡？手電筒打不開', 'red');
    this.ghosts.spawnT.banshee = 2;
  }

  _rain(dt, cam) {
    const k = this.stormK;
    this.rain.visible = k > 0.02;
    if (!this.rain.visible || !cam) return;
    this.rain.material.opacity = 0.42 * k;
    this._rt += dt;
    const a = this.rain.geometry.attributes.position, p = a.array, s = this.rainSeed, n = s.length / 3;
    const c = cam.pos, R = 16, Hh = 14;
    for (let i = 0; i < n; i++) {
      const x = c.x + (s[i * 3] - 0.5) * 2 * R, z = c.z + (s[i * 3 + 2] - 0.5) * 2 * R;
      const y = c.y + Hh * 0.6 - ((s[i * 3 + 1] * Hh + this._rt * 24) % Hh);
      p[i * 6] = x; p[i * 6 + 1] = y; p[i * 6 + 2] = z;
      p[i * 6 + 3] = x + 0.05; p[i * 6 + 4] = y - 0.55; p[i * 6 + 5] = z;
    }
    a.needsUpdate = true;
  }
}
