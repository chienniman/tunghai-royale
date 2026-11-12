// Keyboard + pointer-lock mouse input, plus a touch mode (phones / tablets) where the
// on-screen controls in touch.js write into the same state and there is no pointer lock.
const GAME_KEYS = ['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Tab', 'KeyF', 'KeyR', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'KeyE', 'KeyJ'];

export class Input {
  constructor(element, { touch = false } = {}) {
    this.el = element;
    this.touch = touch;
    this.axis = { x: 0, y: 0 }; // analogue move from the virtual stick: x = right, y = forward
    this.sprint = false;
    this.keys = new Set();
    this.dx = 0; this.dy = 0;
    this.locked = false;
    this.pressed = new Set(); // keys pressed since last frame
    this.buttons = new Set(); // mouse buttons held (0 = left, 2 = right)
    this.clicked = new Set(); // mouse buttons pressed since last frame
    this.wheel = 0;
    addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (e.code === 'Tab' || (GAME_KEYS.includes(e.code) && this.locked)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.buttons.clear(); });
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.dx += e.movementX; this.dy += e.movementY;
    });
    addEventListener('mousedown', (e) => {
      if (!this.locked) return;
      this.buttons.add(e.button); this.clicked.add(e.button);
    });
    addEventListener('mouseup', (e) => this.buttons.delete(e.button));
    addEventListener('wheel', (e) => { if (this.locked) this.wheel += Math.sign(e.deltaY); }, { passive: true });
    addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.el;
      if (!this.locked) { this.buttons.clear(); this.clicked.clear(); }
      this.onLockChange?.(this.locked);
    });
    document.addEventListener('pointerlockerror', () => this.onLockError?.());
  }
  lock() {
    if (this.touch) { // "locked" just means the game has the controls; also go full screen in landscape
      this.locked = true; this.onLockChange?.(true); this.fullscreen();
      return;
    }
    // Promise form exists in newer browsers; swallow rejections (handled via pointerlockerror).
    try { this.el.requestPointerLock?.()?.catch?.(() => {}); } catch { /* ignore */ }
  }
  unlock() {
    if (this.touch) {
      this.locked = false; this.buttons.clear(); this.clicked.clear(); this.axis.x = this.axis.y = 0; this.sprint = false;
      this.onLockChange?.(false);
      return;
    }
    document.exitPointerLock?.();
  }
  // Best effort: not every browser allows either call (iPhone Safari has no element full screen).
  async fullscreen() {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) await (el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen?.());
      await screen.orientation?.lock?.('landscape');
    } catch { /* stay windowed */ }
  }
  press(code) { this.pressed.add(code); }
  down(code) { return this.keys.has(code); }
  button(b) { return this.buttons.has(b); }
  consumeMouse() { const r = [this.dx, this.dy]; this.dx = this.dy = 0; return r; }
  consumePressed(code) { const had = this.pressed.has(code); this.pressed.delete(code); return had; }
  consumeClick(b) { const had = this.clicked.has(b); this.clicked.delete(b); return had; }
  consumeWheel() { const w = this.wheel; this.wheel = 0; return w; }
  endFrame() { this.pressed.clear(); this.clicked.clear(); }
}
