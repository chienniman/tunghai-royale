import test from 'node:test';
import assert from 'node:assert/strict';
import { Inventory } from '../src/inventory.js';
import { ITEMS, BASE_CAPACITY, falloff, rollCluster, tierOf } from '../src/items.js';
import { mulberry32 } from '../src/util.js';

test('first weapon is equipped, third swaps with the active one', () => {
  const inv = new Inventory();
  assert.equal(inv.weapon.id, 'fists');
  inv.add({ id: 'pistol', n: 1, ammo: 15 });
  assert.equal(inv.active, 0);
  inv.add({ id: 'ar', n: 1, ammo: 30 });
  assert.equal(inv.active, 0, 'picking up a second weapon does not switch');
  const r = inv.add({ id: 'sniper', n: 1, ammo: 5 });
  assert.deepEqual(r.dropped, [{ id: 'pistol', n: 1, ammo: 15 }]);
  assert.equal(inv.slots[0].id, 'sniper');
  assert.equal(inv.slots[1].id, 'ar');
});

test('capacity limits ammo, a backpack raises it', () => {
  const inv = new Inventory();
  const room = Math.floor(BASE_CAPACITY / ITEMS.ammo_556.w);
  let r = inv.add({ id: 'ammo_556', n: 500 });
  assert.equal(r.taken, room);
  assert.equal(inv.add({ id: 'guabao', n: 1 }).taken, 0, 'full');
  assert.equal(inv.add({ id: 'pack2', n: 1 }).taken, 1);
  assert.equal(inv.capacity, BASE_CAPACITY + ITEMS.pack2.cap);
  r = inv.add({ id: 'ammo_556', n: 500 });
  assert.ok(r.taken > 0 && inv.weight <= inv.capacity);
  assert.equal(inv.drop('pack'), null, 'cannot take the pack off while it is needed');
  assert.equal(inv.add({ id: 'pack1', n: 1 }).taken, 0, 'cannot swap to a pack that is too small');
});

test('reload moves rounds from the reserve', () => {
  const inv = new Inventory();
  inv.add({ id: 'smg', n: 1, ammo: 4 });
  assert.equal(inv.canReload(), false);
  inv.add({ id: 'ammo_9mm', n: 10 });
  assert.equal(inv.reload(), 10);
  assert.equal(inv.weaponSlot.ammo, 14);
  assert.equal(inv.ammo['9mm'], 0);
});

test('armour absorbs by zone and breaks', () => {
  const inv = new Inventory();
  inv.add({ id: 'vest1', n: 1, dur: 5 });
  assert.equal(inv.absorb(10, 'head'), 10, 'no helmet');
  assert.equal(inv.absorb(10, 'body'), 7);
  assert.equal(inv.vest.dur, 2);
  inv.absorb(10, 'body');
  assert.equal(inv.vest, null, 'vest destroyed');
});

test('dropping the held weapon falls back to the other slot, then fists', () => {
  const inv = new Inventory();
  inv.add({ id: 'pistol', n: 1, ammo: 3 });
  inv.add({ id: 'shotgun', n: 1, ammo: 5 });
  assert.deepEqual(inv.drop('slot0'), { id: 'pistol', n: 1, ammo: 3 });
  assert.equal(inv.active, 1);
  inv.drop('slot1');
  assert.equal(inv.active, -1);
  assert.equal(inv.cycle(1), false, 'nothing to cycle to');
});

test('dropAll returns everything and empties the inventory', () => {
  const inv = new Inventory();
  for (const s of [{ id: 'ar', n: 1, ammo: 30 }, { id: 'ammo_556', n: 40 }, { id: 'chickenfeet', n: 2 }, { id: 'helmet2', n: 1 }, { id: 'pack1', n: 1 }]) inv.add(s);
  const out = inv.dropAll();
  assert.deepEqual(out.map((s) => s.id).sort(), ['ammo_556', 'ar', 'chickenfeet', 'helmet2', 'pack1']);
  assert.equal(inv.weight, 0);
  assert.equal(inv.weapon.id, 'fists');
});

test('damage falloff and loot table sanity', () => {
  assert.equal(falloff(ITEMS.ar, 10), 1);
  assert.equal(falloff(ITEMS.ar, 1000), ITEMS.ar.minMul);
  assert.ok(falloff(ITEMS.ar, 140) < 1 && falloff(ITEMS.ar, 140) > ITEMS.ar.minMul);
  const rng = mulberry32(1);
  for (let i = 0; i < 2000; i++) {
    for (const s of rollCluster(rng)) {
      assert.ok(ITEMS[s.id], s.id);
      assert.ok(s.n >= 1);
      assert.ok(tierOf(s.id) >= 0 && tierOf(s.id) <= 4);
    }
  }
});
