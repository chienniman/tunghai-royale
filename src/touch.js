// On-screen controls for phones and tablets (landscape). They write straight into
// the Input state, so the rest of the game does not know the difference.
const LOOK_SPEED = 2.6;   // touch pixels -> "mouse" pixels
const STICK_RADIUS = 56;
// Keep receiving a finger's events after it slides off the element (not every browser / pointer allows it).
const capture = (el, id) => { try { el.setPointerCapture(id); } catch { /* fine without */ } };

export class TouchControls {
  // actions: { pause, bag, notes, map, slot(i), use(id), pick(i) }
  constructor(input, actions) {
    this.input = input;
    const root = this.root = document.getElementById('touch');
    root.innerHTML = `
      <div id="t-move"><div id="t-base"><div id="t-knob"></div></div></div>
      <div id="t-look"></div>
      <div class="t-top">
        <button class="t-sm" data-act="pause" aria-label="暫停">II</button>
        <button class="t-sm" data-act="map">地圖</button>
        <button class="t-sm" data-act="notes">筆記</button>
        <button class="t-sm" data-act="bag">背包</button>
      </div>
      <button class="t-btn" id="t-fire" aria-label="射擊"><i></i></button>
      <button class="t-btn" id="t-ads">瞄準</button>
      <button class="t-btn" id="t-jump">跳</button>
      <button class="t-btn" id="t-crouch">蹲</button>
      <button class="t-btn" id="t-reload">換彈</button>`;
    const $ = (id) => document.getElementById(id);
    const base = $('t-base'), knob = $('t-knob');

    // --- move stick: appears where the thumb lands; pushing it to the rim sprints ---
    let moveId = null, ox = 0, oy = 0;
    const moveEnd = () => { moveId = null; input.axis.x = input.axis.y = 0; input.sprint = false; base.classList.remove('on'); knob.style.transform = ''; base.style.left = base.style.top = ''; };
    const zone = $('t-move');
    zone.addEventListener('pointerdown', (e) => {
      if (moveId !== null) return;
      moveId = e.pointerId; ox = e.clientX; oy = e.clientY;
      const r = zone.getBoundingClientRect();
      base.style.left = (ox - r.left) + 'px'; base.style.top = (oy - r.top) + 'px'; base.classList.add('on');
      capture(zone, e.pointerId);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== moveId) return;
      let dx = e.clientX - ox, dy = e.clientY - oy; const d = Math.hypot(dx, dy);
      input.sprint = d > STICK_RADIUS * 1.35 && dy < 0;
      if (d > STICK_RADIUS) { dx *= STICK_RADIUS / d; dy *= STICK_RADIUS / d; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const dead = 0.18, ax = dx / STICK_RADIUS, ay = -dy / STICK_RADIUS;
      input.axis.x = Math.abs(ax) < dead ? 0 : ax; input.axis.y = Math.abs(ay) < dead ? 0 : ay;
    });
    for (const ev of ['pointerup', 'pointercancel']) zone.addEventListener(ev, (e) => { if (e.pointerId === moveId) moveEnd(); });

    // --- look: drag anywhere on the right side (the fire button doubles as a look pad so you can track while shooting) ---
    const look = (el, onDown, onUp) => {
      let id = null, lx = 0, ly = 0;
      el.addEventListener('pointerdown', (e) => { if (id !== null) return; id = e.pointerId; lx = e.clientX; ly = e.clientY; onDown?.(); e.preventDefault(); capture(el, e.pointerId); });
      el.addEventListener('pointermove', (e) => {
        if (e.pointerId !== id) return;
        input.dx += (e.clientX - lx) * LOOK_SPEED; input.dy += (e.clientY - ly) * LOOK_SPEED; lx = e.clientX; ly = e.clientY;
      });
      for (const ev of ['pointerup', 'pointercancel']) el.addEventListener(ev, (e) => { if (e.pointerId === id) { id = null; onUp?.(); } });
    };
    look($('t-look'));
    const fire = $('t-fire');
    look(fire, () => { input.buttons.add(0); input.clicked.add(0); fire.classList.add('on'); }, () => { input.buttons.delete(0); fire.classList.remove('on'); });

    // --- buttons ---
    const tap = (el, fn) => el.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); fn(e); });
    const ads = $('t-ads');
    tap(ads, () => { const on = !input.buttons.has(2); on ? input.buttons.add(2) : input.buttons.delete(2); ads.classList.toggle('on', on); });
    this.resetAds = () => { input.buttons.delete(2); ads.classList.remove('on'); };
    const jump = $('t-jump');
    tap(jump, () => input.keys.add('Space'));
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) jump.addEventListener(ev, () => input.keys.delete('Space'));
    tap($('t-crouch'), () => input.press('KeyC'));
    tap($('t-reload'), () => input.press('KeyR'));
    for (const b of root.querySelectorAll('.t-sm')) tap(b, () => actions[b.dataset.act]?.());

    // --- HUD elements that double as buttons on touch screens ---
    const delegate = (id, attr, fn) => document.getElementById(id).addEventListener('pointerdown', (e) => {
      const el = e.target.closest(`[data-${attr}]`); if (!el) return;
      e.preventDefault(); fn(el.dataset[attr]);
    });
    delegate('weapons', 'slot', (v) => actions.slot(+v));
    delegate('quick', 'use', (v) => actions.use(v));
    delegate('pickup', 'pick', (v) => actions.pick(+v));
    // the "E" prompt is the interact button: tap to use, hold to search
    const use = document.getElementById('interact');
    use.addEventListener('pointerdown', (e) => { e.preventDefault(); input.keys.add('KeyE'); input.press('KeyE'); });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) use.addEventListener(ev, () => input.keys.delete('KeyE'));
    document.getElementById('dialog').addEventListener('pointerdown', (e) => { e.preventDefault(); input.press('KeyE'); }); // tap the box to go on
  }

  show(on) { this.root.classList.toggle('hidden', !on); if (!on) this.resetAds(); }
}
