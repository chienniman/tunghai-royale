import { ITEMS, BASE_CAPACITY, FISTS, AMMO_ITEM, CONSUMABLES } from './items.js';

// Player inventory: two weapon slots, ammo + consumables limited by backpack
// capacity, and three gear slots (vest / helmet / pack). Pure logic, no three.js.
export class Inventory {
  constructor() { this.reset(); }

  reset() {
    this.slots = [null, null];   // { id, ammo }
    this.active = -1;            // -1 = fists
    this.ammo = { '9mm': 0, '556': 0, '762': 0, '12g': 0 };
    this.items = Object.fromEntries(CONSUMABLES.map((id) => [id, 0]));
    this.vest = null;            // { id, dur }
    this.helmet = null;
    this.pack = null;            // { id }
  }

  get capacity() { return BASE_CAPACITY + (this.pack ? ITEMS[this.pack.id].cap : 0); }

  get weight() {
    let w = 0;
    for (const [t, n] of Object.entries(this.ammo)) w += n * ITEMS[AMMO_ITEM[t]].w;
    for (const [id, n] of Object.entries(this.items)) w += n * ITEMS[id].w;
    return Math.round(w * 10) / 10;
  }

  get weaponSlot() { return this.active >= 0 ? this.slots[this.active] : null; }
  get weapon() { const s = this.weaponSlot; return s ? ITEMS[s.id] : FISTS; }

  select(i) {
    if (i === this.active) return false;
    if (i >= 0 && !this.slots[i]) return false;
    this.active = i; return true;
  }

  // Next occupied slot in direction dir (+1 / -1), cycling through fists (-1).
  cycle(dir) {
    const order = [-1, 0, 1];
    let k = order.indexOf(this.active);
    for (let n = 0; n < 3; n++) {
      k = (k + dir + 3) % 3;
      if (order[k] === -1 || this.slots[order[k]]) return this.select(order[k]);
    }
    return false;
  }

  // Try to take a stack. Returns { taken, dropped: [stacks], msg }.
  // `taken` is how many units of the stack were absorbed (the caller keeps the rest in the world).
  add(stack) {
    const d = ITEMS[stack.id];
    if (!d) return { taken: 0, dropped: [], msg: '' };
    switch (d.kind) {
      case 'weapon': {
        let i = this.slots.indexOf(null);
        const dropped = [];
        if (i < 0) {
          i = this.active >= 0 ? this.active : 0;
          const old = this.slots[i];
          dropped.push({ id: old.id, n: 1, ammo: old.ammo });
        }
        this.slots[i] = { id: stack.id, ammo: stack.ammo ?? 0 };
        if (this.active < 0 || dropped.length) this.active = i;
        return { taken: 1, dropped, msg: `裝備 ${d.name}` };
      }
      case 'ammo':
      case 'heal':
      case 'boost': {
        const room = Math.floor((this.capacity - this.weight + 1e-6) / d.w);
        const take = Math.min(stack.n, room);
        if (take <= 0) return { taken: 0, dropped: [], msg: '背包已滿' };
        if (d.kind === 'ammo') this.ammo[d.ammoType] += take; else this.items[stack.id] += take;
        return { taken: take, dropped: [], msg: take < stack.n ? `背包已滿，只拿了 ${take}` : `${d.name} ×${take}` };
      }
      case 'vest':
      case 'helmet': {
        const dropped = [];
        const cur = this[d.kind];
        if (cur) dropped.push({ id: cur.id, n: 1, dur: cur.dur });
        this[d.kind] = { id: stack.id, dur: stack.dur ?? d.dur };
        return { taken: 1, dropped, msg: `穿上 ${d.name}` };
      }
      case 'pack': {
        const newCap = BASE_CAPACITY + d.cap;
        if (this.weight > newCap) return { taken: 0, dropped: [], msg: '東西太多，換不了較小的背包' };
        const dropped = [];
        if (this.pack) dropped.push({ id: this.pack.id, n: 1 });
        this.pack = { id: stack.id };
        return { taken: 1, dropped, msg: `背上 ${d.name}` };
      }
    }
    return { taken: 0, dropped: [], msg: '' };
  }

  // Remove something and return it as a world stack (or null).
  // what: 'slot0' | 'slot1' | 'vest' | 'helmet' | 'pack' | ammo type | consumable id
  drop(what, n = Infinity) {
    if (what === 'slot0' || what === 'slot1') {
      const i = what === 'slot0' ? 0 : 1, s = this.slots[i];
      if (!s) return null;
      this.slots[i] = null;
      if (this.active === i) this.active = this.slots[1 - i] ? 1 - i : -1;
      return { id: s.id, n: 1, ammo: s.ammo };
    }
    if (what === 'vest' || what === 'helmet') {
      const g = this[what]; if (!g) return null;
      this[what] = null;
      return { id: g.id, n: 1, dur: g.dur };
    }
    if (what === 'pack') {
      if (!this.pack || this.weight > BASE_CAPACITY) return null; // would overflow
      const id = this.pack.id; this.pack = null;
      return { id, n: 1 };
    }
    if (what in this.ammo) {
      const k = Math.min(n, this.ammo[what]); if (k <= 0) return null;
      this.ammo[what] -= k;
      return { id: AMMO_ITEM[what], n: k };
    }
    if (what in this.items) {
      const k = Math.min(n, this.items[what]); if (k <= 0) return null;
      this.items[what] -= k;
      return { id: what, n: k };
    }
    return null;
  }

  // Everything as world stacks (used when the player is eliminated). Empties the inventory.
  dropAll() {
    const out = [];
    for (const s of this.slots) if (s) out.push({ id: s.id, n: 1, ammo: s.ammo });
    for (const [t, n] of Object.entries(this.ammo)) if (n > 0) out.push({ id: AMMO_ITEM[t], n });
    for (const [id, n] of Object.entries(this.items)) if (n > 0) out.push({ id, n });
    if (this.vest) out.push({ id: this.vest.id, n: 1, dur: this.vest.dur });
    if (this.helmet) out.push({ id: this.helmet.id, n: 1, dur: this.helmet.dur });
    if (this.pack) out.push({ id: this.pack.id, n: 1 });
    this.reset();
    return out;
  }

  // Move rounds from the reserve into the active weapon. Returns rounds loaded.
  reload() {
    const s = this.weaponSlot; if (!s) return 0;
    const w = ITEMS[s.id];
    const n = Math.min(w.mag - s.ammo, this.ammo[w.ammoType]);
    if (n <= 0) return 0;
    s.ammo += n; this.ammo[w.ammoType] -= n;
    return n;
  }

  canReload() {
    const s = this.weaponSlot; if (!s) return false;
    const w = ITEMS[s.id];
    return s.ammo < w.mag && this.ammo[w.ammoType] > 0;
  }

  // Apply armour to incoming damage. zone: 'head' | 'body'. Returns damage that reaches health.
  absorb(amount, zone) {
    const key = zone === 'head' ? 'helmet' : 'vest';
    const g = this[key];
    if (!g) return amount;
    const d = ITEMS[g.id];
    const blocked = amount * d.reduce;
    g.dur -= blocked;
    if (g.dur <= 0) this[key] = null;
    return amount - blocked;
  }
}
