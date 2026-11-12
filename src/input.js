// Keyboard + pointer-lock mouse input.
export class Input {
  constructor(element) {
    this.el = element;
    this.keys = new Set();
    this.pressed = new Set();   // keys pressed since last frame
    this.buttons = new Set();   // mouse buttons held
    this.clicked = new Set();   // mouse buttons pressed since last frame
    this.dx = 0; this.dy = 0; this.wheel = 0;
    this.locked = false;

    addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      // Keep the browser from scrolling / tabbing away while playing (leave F-keys and shortcuts alone).
      if (this.locked && !e.ctrlKey && !e.metaKey && !e.altKey &&
          (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Key') || e.code.startsWith('Digit'))) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this._release());
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.dx += e.movementX; this.dy += e.movementY;
    });
    addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      this.buttons.add(e.button); this.clicked.add(e.button);
      e.preventDefault();
    });
    addEventListener('mouseup', (e) => this.buttons.delete(e.button));
    addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.el;
      if (!this.locked) this._release();
      this.onLockChange?.(this.locked);
    });
  }
  _release() { this.keys.clear(); this.buttons.clear(); this.clicked.clear(); this.pressed.clear(); }
  lock() { this.el.requestPointerLock?.(); }
  down(code) { return this.keys.has(code); }
  hit(code) { return this.pressed.has(code); }            // pressed this frame (does not consume)
  mouse(button) { return this.buttons.has(button); }
  mouseHit(button) { return this.clicked.has(button); }
  consumeMouse() { const r = [this.dx, this.dy]; this.dx = this.dy = 0; return r; }
  consumeWheel() { const w = this.wheel; this.wheel = 0; return w; }
  consumePressed(code) { const had = this.pressed.has(code); this.pressed.delete(code); return had; }
  endFrame() { this.pressed.clear(); this.clicked.clear(); }
}
