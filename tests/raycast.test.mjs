import test from 'node:test';
import assert from 'node:assert/strict';
import { Colliders } from '../src/world/colliders.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

function world() {
  const c = new Colliders();
  c.addPolygon([10, -5, 20, -5, 20, 5, 10, 5], 8);   // 10 m box, 8 m tall, starting 10 m east
  c.addCircle(0, 30, 0.5, 6);                         // tree trunk 30 m south
  return c;
}

test('ray hits the near wall with an outward normal', () => {
  const h = world().raycast(0, 1, 0, 1, 0, 0, 100);
  near(h.t, 10); near(h.nx, -1); near(h.nz, 0);
});

test('ray over the roof misses, ray down onto the roof hits the cap', () => {
  const c = world();
  assert.equal(c.raycast(0, 9, 0, 1, 0, 0, 100), null);
  const h = c.raycast(15, 20, 0, 0, -1, 0, 100);
  near(h.t, 12); near(h.ny, 1);
});

test('ray stops at maxT and finds shapes many cells away', () => {
  const c = world();
  assert.equal(c.raycast(0, 1, 0, 1, 0, 0, 9.5), null);
  const far = new Colliders();
  far.addPolygon([500, -5, 510, -5, 510, 5, 500, 5], 8);
  near(far.raycast(0, 1, 0, 1, 0, 0, 800).t, 500);
});

test('ray vs. tree trunk, including its height', () => {
  const c = world();
  near(c.raycast(0, 1, 0, 0, 0, 1, 100).t, 29.5);
  assert.equal(c.raycast(0, 7, 0, 0, 0, 1, 100), null, 'above the trunk');
  assert.equal(c.raycast(2, 1, 0, 0, 0, 1, 100), null, 'beside the trunk');
});

test('origin inside a solid reports an immediate hit', () => {
  near(world().raycast(15, 1, 0, 1, 0, 0, 100).t, 0);
});

test('resolve pushes a circle out of a wall', () => {
  const p = { x: 9.8, z: 0 };
  world().resolve(p, 0.4);
  near(p.x, 9.6);
});
