// Keyboard + pointer-lock mouse input.
export class Input {
  constructor(element) {
    this.el = element;
    this.keys = new Set();
    this.dx = 0; this.dy = 0;
    this.locked = false;
    this.pressed = new Set(); // keys pressed since last frame
    addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.pressed.add(e.code);
      this.keys.add(e.code);
      if (['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code) && this.locked) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.dx += e.movementX; this.dy += e.movementY;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.el;
      this.onLockChange?.(this.locked);
    });
  }
  lock() { this.el.requestPointerLock?.(); }
  down(code) { return this.keys.has(code); }
  consumeMouse() { const r = [this.dx, this.dy]; this.dx = this.dy = 0; return r; }
  consumePressed(code) { const had = this.pressed.has(code); this.pressed.delete(code); return had; }
  endFrame() { this.pressed.clear(); }
}
