// Horror audio, all synthesised: night ambience, 3D-positioned ghost voices, heartbeat, stings and a bell.
// Built on the Sfx context so everything shares one compressor and master volume.
export class Spooks {
  constructor(sfx) { this.sfx = sfx; this.ready = false; this.emitters = new Set(); }

  // Call after sfx.resume() (needs the AudioContext, which needs a user gesture).
  init() {
    const ctx = this.sfx.ctx; if (!ctx || this.ready) return;
    this.ctx = ctx; this.ready = true;
    // shared reverb: a noise burst with an exponential tail stands in for a big empty campus
    const len = Math.floor(ctx.sampleRate * 2.4), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb = ctx.createConvolver(); this.reverb.buffer = ir;
    this.wet = ctx.createGain(); this.wet.gain.value = 0.5;
    this.reverb.connect(this.wet).connect(this.sfx.out);
    this._night();
  }

  // Keep the listener on the camera so panned voices come from the right place.
  setListener(camera) {
    if (!this.ready) return;
    const L = this.ctx.listener, p = camera.position, e = camera.matrixWorld.elements;
    const fx = -e[8], fy = -e[9], fz = -e[10], ux = e[4], uy = e[5], uz = e[6];
    if (L.positionX) {
      const t = this.ctx.currentTime;
      L.positionX.setValueAtTime(p.x, t); L.positionY.setValueAtTime(p.y, t); L.positionZ.setValueAtTime(p.z, t);
      L.forwardX.setValueAtTime(fx, t); L.forwardY.setValueAtTime(fy, t); L.forwardZ.setValueAtTime(fz, t);
      L.upX.setValueAtTime(ux, t); L.upY.setValueAtTime(uy, t); L.upZ.setValueAtTime(uz, t);
    } else { L.setPosition(p.x, p.y, p.z); L.setOrientation(fx, fy, fz, ux, uy, uz); }
  }

  // A point in the world that sounds can be played from. Returns null until audio is running.
  emitter(maxDistance = 70) {
    if (!this.ready) return null;
    const ctx = this.ctx, pan = ctx.createPanner();
    pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 2.5; pan.maxDistance = maxDistance; pan.rolloffFactor = 1.4;
    const input = ctx.createGain();
    input.connect(pan); pan.connect(this.sfx.out);
    const send = ctx.createGain(); send.gain.value = 0.35; pan.connect(send).connect(this.reverb);
    const em = {
      input, pan,
      set: (x, y, z) => {
        if (pan.positionX) { const t = ctx.currentTime; pan.positionX.setValueAtTime(x, t); pan.positionY.setValueAtTime(y, t); pan.positionZ.setValueAtTime(z, t); }
        else pan.setPosition(x, y, z);
      },
      dispose: () => { try { input.disconnect(); pan.disconnect(); send.disconnect(); } catch { /* already gone */ } this.emitters.delete(em); },
    };
    this.emitters.add(em);
    return em;
  }

  _env(node, t, peak, attack, hold, release) {
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + attack);
    node.gain.setValueAtTime(peak, t + attack + hold);
    node.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + release);
  }

  _noiseInto(dest, t, dur, type, freq, q, peak) {
    const ctx = this.ctx, src = ctx.createBufferSource(); src.buffer = this.sfx.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); this._env(g, t, peak, dur * 0.3, dur * 0.2, dur * 0.5);
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 1.5, dur + 0.05);
  }

  // Breathy syllables: sounds like someone speaking just out of earshot.
  whisper(em, loud = 1) {
    if (!em) return;
    let t = this.ctx.currentTime + 0.02;
    const n = 4 + Math.floor(Math.random() * 6);
    for (let i = 0; i < n; i++) {
      const dur = 0.07 + Math.random() * 0.16;
      this._noiseInto(em.input, t, dur, 'bandpass', 1400 + Math.random() * 2600, 2.5 + Math.random() * 3, 0.5 * loud);
      t += dur * (0.8 + Math.random() * 0.9);
    }
  }

  // A thin, wavering voice humming a few falling notes.
  hum(em, loud = 1) {
    if (!em) return;
    const ctx = this.ctx, scale = [523, 466, 392, 349, 311, 262];
    let t = ctx.currentTime + 0.05, i = Math.floor(Math.random() * 2);
    for (let k = 0; k < 4 + Math.floor(Math.random() * 3); k++) {
      const f0 = scale[Math.min(scale.length - 1, i)], dur = 0.55 + Math.random() * 0.5;
      const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(f0 * 1.02, t); o.frequency.linearRampToValueAtTime(f0, t + 0.12);
      const vib = ctx.createOscillator(); vib.frequency.value = 5.5; const vg = ctx.createGain(); vg.gain.value = f0 * 0.012;
      vib.connect(vg).connect(o.frequency);
      const form = ctx.createBiquadFilter(); form.type = 'bandpass'; form.frequency.value = 900; form.Q.value = 1.2;
      const g = ctx.createGain(); this._env(g, t, 0.22 * loud, 0.12, dur * 0.5, dur * 0.5);
      o.connect(form).connect(g).connect(em.input);
      o.start(t); vib.start(t); o.stop(t + dur + 0.3); vib.stop(t + dur + 0.3);
      t += dur * 0.95; i += Math.random() < 0.75 ? 1 : -1; if (i < 0) i = 0;
    }
  }

  // Short broken sobs.
  sob(em, loud = 1) {
    if (!em) return;
    const ctx = this.ctx; let t = ctx.currentTime + 0.03;
    for (let k = 0; k < 3 + Math.floor(Math.random() * 3); k++) {
      const f0 = 420 + Math.random() * 140, dur = 0.16 + Math.random() * 0.14;
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0 * 1.15, t); o.frequency.exponentialRampToValueAtTime(f0 * 0.8, t + dur);
      const form = ctx.createBiquadFilter(); form.type = 'bandpass'; form.frequency.value = 1000; form.Q.value = 2;
      const g = ctx.createGain(); this._env(g, t, 0.16 * loud, 0.03, dur * 0.3, dur * 0.7);
      o.connect(form).connect(g).connect(em.input); o.start(t); o.stop(t + dur + 0.2);
      this._noiseInto(em.input, t + dur * 0.6, 0.12, 'bandpass', 2200, 1.5, 0.12 * loud);      // intake of breath
      t += dur + 0.12 + Math.random() * 0.2;
    }
  }

  // A low presence that is felt more than heard. Returns a handle: level(0..1), stop().
  drone(em) {
    if (!em) return null;
    const ctx = this.ctx, g = ctx.createGain(); g.gain.value = 0.0001; g.connect(em.input);
    const oscs = [47, 49.3, 94.6].map((f, i) => { const o = ctx.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f; o.connect(g); o.start(); return o; });
    return {
      level: (v) => g.gain.setTargetAtTime(Math.max(0.0001, v * 0.5), ctx.currentTime, 0.4),
      stop: () => { g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.2); setTimeout(() => { oscs.forEach((o) => { try { o.stop(); } catch { /* stopped */ } }); g.disconnect(); }, 900); },
    };
  }

  // Not positioned: the scare itself.
  sting(strength = 1) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime, out = this.sfx.out;
    for (const f of [311, 329.6, 466, 622, 933]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.exponentialRampToValueAtTime(f * 1.06, t + 0.9);
      const g = ctx.createGain(); this._env(g, t, 0.09 * strength, 0.01, 0.15, 0.9);
      o.connect(g).connect(out); o.start(t); o.stop(t + 1.3);
    }
    this._noiseInto(out, t, 0.5, 'highpass', 1800, 0.7, 0.35 * strength);
    const sub = ctx.createOscillator(); sub.frequency.setValueAtTime(80, t); sub.frequency.exponentialRampToValueAtTime(34, t + 0.8);
    const sg = ctx.createGain(); this._env(sg, t, 0.6 * strength, 0.01, 0.1, 0.9); sub.connect(sg).connect(out); sub.start(t); sub.stop(t + 1.2);
  }

  heartbeat(strength = 1) {
    if (!this.ready) return;
    const ctx = this.ctx, out = this.sfx.out;
    for (const [dt, v] of [[0, 1], [0.17, 0.7]]) {
      const t = ctx.currentTime + dt, o = ctx.createOscillator();
      o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.12);
      const g = ctx.createGain(); this._env(g, t, 0.5 * v * strength, 0.008, 0.02, 0.14);
      o.connect(g).connect(out); o.start(t); o.stop(t + 0.25);
    }
  }

  // A cast bell: inharmonic partials with long, uneven decays. em optional (played at the listener if omitted).
  bell(em, loud = 1, pitch = 196) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime, dest = em ? em.input : this.sfx.out;
    const parts = [[0.5, 1, 4.5], [1, 0.9, 3.6], [1.19, 0.5, 2.8], [1.5, 0.35, 2.2], [2, 0.5, 2.6], [2.5, 0.2, 1.6], [3, 0.25, 1.4], [4.07, 0.14, 1.0]];
    for (const [ratio, amp, decay] of parts) {
      const o = ctx.createOscillator(); o.frequency.value = pitch * ratio;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * amp * loud, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g).connect(dest); if (!em) g.connect(this.reverb);
      o.start(t); o.stop(t + decay + 0.1);
    }
    this._noiseInto(dest, t, 0.05, 'bandpass', 2400, 1, 0.3 * loud);      // clapper strike
  }

  // Crickets and the odd owl, on top of the wind bed that Sfx already plays.
  _night() {
    const ctx = this.ctx, bus = ctx.createGain(); bus.gain.value = 0.5; bus.connect(this.sfx.master);
    this.nightBus = bus;
    for (const [f, rate, pan, vol] of [[4300, 13.5, -0.6, 0.012], [4750, 16.2, 0.5, 0.010], [5600, 11.1, 0.1, 0.007]]) {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f;
      const chirp = ctx.createGain(); chirp.gain.value = vol * 0.5;
      const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = rate;
      const depth = ctx.createGain(); depth.gain.value = vol * 0.5; lfo.connect(depth).connect(chirp.gain);
      // the insect stops and starts
      const breath = ctx.createOscillator(); breath.frequency.value = 0.07 + Math.random() * 0.06;
      const bg = ctx.createGain(); bg.gain.value = 0; const bd = ctx.createGain(); bd.gain.value = 0.6; breath.connect(bd).connect(bg.gain);
      const base = ctx.createConstantSource ? ctx.createConstantSource() : null;
      if (base) { base.offset.value = 0.5; base.connect(bg.gain); base.start(); }
      const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) p.pan.value = pan;
      o.connect(chirp).connect(bg); if (p) bg.connect(p).connect(bus); else bg.connect(bus);
      o.start(); lfo.start(); breath.start();
    }
    const hoot = () => {
      if (!this.ready) return;
      const t = ctx.currentTime + 0.1, p = ctx.createStereoPanner ? ctx.createStereoPanner() : null; if (p) { p.pan.value = Math.random() * 1.6 - 0.8; p.connect(bus); }
      for (const [dt, dur] of [[0, 0.32], [0.5, 0.2], [0.75, 0.45]]) {
        const o = ctx.createOscillator(); o.frequency.setValueAtTime(410, t + dt); o.frequency.exponentialRampToValueAtTime(360, t + dt + dur);
        const g = ctx.createGain(); this._env(g, t + dt, 0.035, 0.05, dur * 0.4, dur * 0.6);
        o.connect(g).connect(p || bus); o.start(t + dt); o.stop(t + dt + dur + 0.2);
      }
      this._hootTimer = setTimeout(hoot, 25000 + Math.random() * 50000);
    };
    this._hootTimer = setTimeout(hoot, 12000 + Math.random() * 20000);
  }

  // 0 = normal night, 1 = dead silence (insects stop when something is near)
  hush(v) { if (this.ready) this.nightBus.gain.setTargetAtTime(0.5 * (1 - v), this.ctx.currentTime, 0.6); }
}
