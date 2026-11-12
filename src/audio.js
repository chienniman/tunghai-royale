// Procedural sound effects (Web Audio, no files). Everything is a no-op until
// unlock() has been called from a user gesture, and failures are swallowed:
// sound is a nicety, never a reason to break the game.
const SHOT = { // [noise seconds, low-pass Hz, thump Hz, gain]
  pistol: [0.12, 2600, 150, 0.5], smg: [0.09, 3200, 170, 0.42], ar: [0.14, 2200, 120, 0.55],
  shotgun: [0.3, 1400, 80, 0.8], sniper: [0.45, 1700, 70, 0.9], sentry: [0.1, 2000, 140, 0.3],
};

export class Sfx {
  constructor() { this.ctx = null; this.out = null; this.noiseBuf = null; this.amb = null; }

  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
        this.ctx = new AC();
        this.out = this.ctx.createGain(); this.out.gain.value = 0.55; this.out.connect(this.ctx.destination);
        const n = this.ctx.sampleRate, b = this.ctx.createBuffer(1, n, n), d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = b;
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch { this.ctx = null; }
  }

  _run(fn) { if (!this.ctx) return; try { fn(this.ctx, this.ctx.currentTime); } catch { /* ignore */ } }

  _noise(t, dur, freq, gain, type = 'lowpass', q = 0.7) {
    const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noiseBuf; src.loop = true;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random()); src.stop(t + dur + 0.02);
    return { f, g };
  }

  _tone(t, dur, f0, f1, gain, type = 'sine') {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.02);
    return { o, g };
  }

  shot(kind) {
    this._run((c, t) => {
      const [dur, lp, thump, gain] = SHOT[kind] || SHOT.pistol;
      this._noise(t, dur, lp, gain);
      this._tone(t, dur * 0.8, thump * 1.6, thump * 0.5, gain * 0.9);
    });
  }
  punch() { this._run((c, t) => { this._noise(t, 0.08, 500, 0.35); }); }
  dry() { this._run((c, t) => { this._tone(t, 0.04, 1800, 900, 0.12, 'square'); }); }
  reload() { this._run((c, t) => { this._tone(t, 0.04, 900, 500, 0.12, 'square'); this._tone(t + 0.12, 0.05, 1400, 700, 0.14, 'square'); }); }
  pickup() { this._run((c, t) => { this._tone(t, 0.07, 620, 880, 0.14, 'triangle'); this._tone(t + 0.06, 0.09, 880, 1320, 0.12, 'triangle'); }); }
  eat() { this._run((c, t) => { for (let i = 0; i < 3; i++) this._noise(t + i * 0.16, 0.07, 900, 0.16, 'bandpass', 2); }); }
  hit() { this._run((c, t) => { this._tone(t, 0.05, 1500, 1100, 0.1, 'square'); }); }
  hurt() { this._run((c, t) => { this._tone(t, 0.16, 190, 70, 0.4, 'sawtooth'); this._noise(t, 0.1, 700, 0.2); }); }

  // 女鬼: two detuned saws wailing up and tearing back down, with breath noise on top
  scream() {
    this._run((c, t) => {
      for (const det of [1, 1.013, 0.5]) {
        const o = c.createOscillator(), g = c.createGain(), f = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(420 * det, t); o.frequency.exponentialRampToValueAtTime(1350 * det, t + 0.35);
        o.frequency.exponentialRampToValueAtTime(900 * det, t + 0.9); o.frequency.exponentialRampToValueAtTime(260 * det, t + 1.5);
        lfo.frequency.value = 9; lg.gain.value = 45; lfo.connect(lg).connect(o.frequency);
        f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 1.2;
        g.gain.setValueAtTime(0.0008, t); g.gain.exponentialRampToValueAtTime(0.42, t + 0.12); g.gain.setValueAtTime(0.42, t + 0.8); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.55);
        o.connect(f).connect(g).connect(this.out);
        o.start(t); lfo.start(t); o.stop(t + 1.6); lfo.stop(t + 1.6);
      }
      this._noise(t, 1.3, 3200, 0.22, 'bandpass', 0.8);
    });
  }
  // jump scare: a slam of low noise under the scream
  scare() { this._run((c, t) => { this._noise(t, 0.5, 220, 0.9); this._tone(t, 0.5, 90, 35, 0.8, 'sawtooth'); }); }
  wisp() { this._run((c, t) => { const { o } = this._tone(t, 0.9, 980, 520, 0.09, 'sine'); o.frequency.setValueAtTime(980, t); }); }
  ghostDie() { this._run((c, t) => { this._tone(t, 0.6, 700, 90, 0.2, 'sine'); this._noise(t, 0.5, 2400, 0.15, 'highpass'); }); }

  // Night ambience: a low drone and wind that swell as it gets dark (v = 0..1).
  setNight(v) {
    if (!this.ctx) return;
    try {
      if (!this.amb) {
        const c = this.ctx, g = c.createGain(); g.gain.value = 0; g.connect(this.out);
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 52; const og = c.createGain(); og.gain.value = 0.35; o.connect(og).connect(g); o.start();
        const n = c.createBufferSource(); n.buffer = this.noiseBuf; n.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 380; f.Q.value = 0.6;
        const ng = c.createGain(); ng.gain.value = 0.12; n.connect(f).connect(ng).connect(g); n.start();
        this.amb = g;
      }
      this.amb.gain.setTargetAtTime(v * 0.5, this.ctx.currentTime, 0.8);
    } catch { /* ignore */ }
  }
}
