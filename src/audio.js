// All sound is synthesised with WebAudio, so the game ships no audio files.
const SHOTS = {
  pistol: { gain: 0.55, lp: 3400, decay: 0.08, thump: 150, thumpGain: 0.5, tail: 0.35, tailGain: 0.10 },
  smg: { gain: 0.5, lp: 3000, decay: 0.07, thump: 170, thumpGain: 0.4, tail: 0.3, tailGain: 0.09 },
  rifle: { gain: 0.7, lp: 2600, decay: 0.11, thump: 120, thumpGain: 0.7, tail: 0.7, tailGain: 0.16 },
  shotgun: { gain: 0.9, lp: 1900, decay: 0.2, thump: 85, thumpGain: 1.0, tail: 0.9, tailGain: 0.2 },
  sniper: { gain: 0.95, lp: 2300, decay: 0.22, thump: 70, thumpGain: 1.1, tail: 1.4, tailGain: 0.26 },
};

export class Sfx {
  constructor() { this.ctx = null; }

  // Must be called from a user gesture (the start button).
  resume() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.out = ctx.createDynamicsCompressor();
      this.out.threshold.value = -14; this.out.ratio.value = 6; this.out.attack.value = 0.002; this.out.release.value = 0.15;
      this.master = ctx.createGain(); this.master.gain.value = 0.8;
      this.out.connect(this.master).connect(ctx.destination);
      const n = ctx.sampleRate * 2, buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = buf;
      this._ambience();
    }
    this.ctx.resume?.();
  }

  _noise(dur, type, f0, f1, gain, decay, when = 0, q = 0.7) {
    const ctx = this.ctx, t = ctx.currentTime + when;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.01, decay));
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random() * 1.2, dur + 0.05);
  }

  _tone(type, f0, f1, gain, decay, when = 0) {
    const ctx = this.ctx, t = ctx.currentTime + when;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(this.out);
    o.start(t); o.stop(t + decay + 0.05);
  }

  // Quiet wind bed so the campus is never dead silent.
  _ambience() {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.4;
    const g = ctx.createGain(); g.gain.value = 0.035;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09;
    const lg = ctx.createGain(); lg.gain.value = 0.018;
    lfo.connect(lg).connect(g.gain);
    src.connect(f).connect(g).connect(this.master);
    src.start(); lfo.start();
  }

  shot(kind) {
    if (!this.ctx) return;
    const s = SHOTS[kind] || SHOTS.rifle;
    this._noise(0.03, 'highpass', 2500, 6000, s.gain * 0.6, 0.025);                 // crack
    this._noise(s.decay, 'lowpass', s.lp * 2.2, s.lp * 0.35, s.gain, s.decay);      // blast
    this._tone('sine', s.thump * 1.6, s.thump * 0.45, s.thumpGain * 0.6, s.decay * 1.1); // body
    this._noise(s.tail, 'lowpass', 900, 220, s.tailGain, s.tail, 0.03);             // outdoor echo
  }

  dry() { if (this.ctx) this._noise(0.03, 'bandpass', 3200, 2400, 0.25, 0.03, 0, 4); }

  reload(shell = false) {
    if (!this.ctx) return;
    if (shell) { this._noise(0.05, 'bandpass', 1500, 900, 0.3, 0.05, 0, 3); return; }
    this._noise(0.05, 'bandpass', 1800, 1200, 0.3, 0.05, 0, 3);        // mag out
    this._noise(0.06, 'bandpass', 1300, 900, 0.35, 0.06, 0.45, 3);     // mag in
  }

  chamber() {
    if (!this.ctx) return;
    this._noise(0.04, 'bandpass', 2600, 1800, 0.3, 0.04, 0, 5);
    this._noise(0.05, 'bandpass', 2000, 1400, 0.32, 0.05, 0.11, 5);
  }

  pickup() { if (this.ctx) { this._noise(0.06, 'bandpass', 1100, 700, 0.22, 0.06, 0, 2); this._tone('triangle', 520, 780, 0.06, 0.08, 0.02); } }
  equip() { if (this.ctx) this._noise(0.09, 'bandpass', 900, 1600, 0.2, 0.09, 0, 1.5); }

  hit(head) {
    if (!this.ctx) return;
    this._tone('square', head ? 1500 : 950, head ? 1100 : 700, 0.07, 0.05);
    this._noise(0.05, 'bandpass', 1400, 700, 0.18, 0.05, 0, 2);            // thunk on plywood
  }

  down() { if (this.ctx) { this._tone('sine', 660, 990, 0.1, 0.16); this._tone('sine', 990, 1320, 0.08, 0.2, 0.09); } }

  step(run) {
    if (!this.ctx) return;
    this._noise(0.07, 'lowpass', run ? 900 : 650, 200, run ? 0.13 : 0.08, 0.07);
  }

  swish() { if (this.ctx) this._noise(0.18, "bandpass", 500, 1800, 0.2, 0.18, 0, 0.8); }
  thwack() { if (this.ctx) { this._noise(0.09, "lowpass", 1400, 300, 0.5, 0.09); this._tone("triangle", 180, 90, 0.25, 0.1); } }
  splash() { if (this.ctx) { this._noise(0.05, "highpass", 3000, 5000, 0.35, 0.05); this._noise(0.3, "bandpass", 1800, 500, 0.3, 0.3, 0.02, 0.8); } }
  alarm() { if (this.ctx) { this._tone("square", 620, 620, 0.06, 0.18); this._tone("square", 470, 470, 0.06, 0.22, 0.2); this._tone("square", 620, 620, 0.06, 0.18, 0.45); } }
  hurt() { if (this.ctx) { this._tone('sawtooth', 190, 90, 0.2, 0.22); this._noise(0.1, 'lowpass', 700, 200, 0.25, 0.1); } }
  heal() { if (this.ctx) { this._tone('sine', 440, 660, 0.08, 0.2); this._tone('sine', 660, 880, 0.06, 0.25, 0.1); } }
}
