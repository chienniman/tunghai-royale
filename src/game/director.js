// The director paces the night. It never changes how much a ghost hurts, only how often trouble arrives:
//   build  -> pressure rises, roaming ghosts may spawn and are told roughly where the player is
//   peak   -> a few seconds at the top
//   fade   -> nothing new starts; what is already hunting finishes or loses interest
//   relax  -> a real breather (ghosts withdraw), then build again, a little harder as the night goes on
// It knows exactly where the player is, but only ever gives ghosts a rough idea.
export class Director {
  constructor({ ghosts, player, terrain, world, camera, rig }) {
    Object.assign(this, { ghosts, player, terrain, world, camera, rig });
    this.t = 0;                      // seconds since the night began
    this.nightLength = 900;          // how long until the pressure is at its highest
    this.phase = 'relax'; this.phaseT = 0; this.relaxFor = 25;   // the first half-minute is safe
    this.stress = 0;                 // 0..1: how hard the last minute has been on the player
    this.table = [];                 // [{ type, weight, from (seconds), max }] roaming ghosts the director may send
    this.spawnT = 6; this.hintT = 0;
    this.lastHp = player.hp;
    this.enabled = false;
    this.onPhase = null;             // (phase) => void
  }

  start() { this.t = 0; this.phase = 'relax'; this.phaseT = 0; this.relaxFor = 25; this.stress = 0; this.spawnT = 6; this.enabled = true; this.lastHp = this.player.hp; }
  stop() { this.enabled = false; }

  get progress() { return Math.min(1, this.t / this.nightLength); }
  // how many roaming ghosts may be out at once: one early on, up to four late in the night
  get budget() { return 1 + Math.floor(this.progress * 3.2); }
  roaming() { return this.ghosts.list.filter((g) => g.data.roamer); }

  _set(phase) { this.phase = phase; this.phaseT = 0; this.onPhase?.(phase); }

  // Somewhere the player cannot currently see, 35-60 m away, on open ground inside the campus.
  spawnPoint(minD = 35, maxD = 60) {
    const p = this.player, look = this.rig.look;
    for (let i = 0; i < 24; i++) {
      // favour the half-circle behind the player
      const a = p.yaw + Math.PI + (Math.random() - 0.5) * (i < 12 ? 2.2 : 5.5), d = minD + Math.random() * (maxD - minD);
      const x = p.pos.x - Math.sin(a) * d, z = p.pos.z - Math.cos(a) * d;
      if (!this.terrain.inBounds(x, z, 30) || !this.world.inCampus(x, z)) continue;
      const y = this.terrain.heightAt(x, z);
      if (this.world.colliders.blocked(x, y + 1, z)) continue;
      const dx = x - this.camera.position.x, dz = z - this.camera.position.z, l = Math.hypot(dx, dz) || 1;
      if ((dx * look.x + dz * look.z) / l > 0.45) continue;        // in front of the camera: skip
      return [x, z];
    }
    return null;
  }

  update(dt) {
    if (!this.enabled) return;
    const p = this.player, g = this.ghosts;
    this.t += dt; this.phaseT += dt;

    // stress: rises with dread and with every hit, drains slowly
    const hurt = Math.max(0, this.lastHp - p.hp); this.lastHp = p.hp;
    this.stress = Math.min(1, Math.max(0, this.stress + g.dread * 0.22 * dt + hurt * 0.02 - 0.035 * dt));

    const roamers = this.roaming();
    if (this.phase === 'build') {
      if (this.stress > 0.78) this._set('peak');
      else {
        this.spawnT -= dt;
        if (this.spawnT <= 0 && roamers.length < this.budget) {
          const options = this.table.filter((e) => this.t >= (e.from || 0) && roamers.filter((r) => r.id === e.type).length < (e.max || 1));
          const total = options.reduce((s, e) => s + e.weight, 0);
          const at = total > 0 ? this.spawnPoint() : null;
          if (at) {
            let r = Math.random() * total, pick = options[0];
            for (const e of options) { if ((r -= e.weight) <= 0) { pick = e; break; } }
            g.spawn(pick.type, at[0], at[1], { roamer: true });
          }
          this.spawnT = (22 - 12 * this.progress) * (0.7 + Math.random() * 0.6);
        }
      }
    } else if (this.phase === 'peak') {
      if (this.phaseT > 4) this._set('fade');
    } else if (this.phase === 'fade') {
      if (this.stress < 0.4 || this.phaseT > 25) { this.relaxFor = 30 + Math.random() * 15 - 12 * this.progress; this._set('relax'); for (const r of roamers) r.data.recall = true; }
    } else if (this.phase === 'relax') {
      if (this.phaseT > this.relaxFor) { this._set('build'); this.spawnT = 3 + Math.random() * 5; for (const r of this.roaming()) r.data.recall = false; }
    }

    // rough directions for roamers: near the player, never exactly on them (and nothing while relaxing)
    this.hintT -= dt;
    if (this.hintT <= 0) {
      this.hintT = 7 + Math.random() * 5;
      for (const r of roamers) {
        if (this.phase === 'relax') { r.data.hint = null; continue; }
        const a = Math.random() * Math.PI * 2, d = 12 + Math.random() * 14;
        r.data.hint = { x: p.pos.x + Math.cos(a) * d, z: p.pos.z + Math.sin(a) * d };
      }
    }
  }
}
