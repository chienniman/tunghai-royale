import test from 'node:test';
import assert from 'node:assert/strict';
import { FRAGMENTS, ENDINGS } from '../src/story.js';
import { INTRO, CHAPTERS, PHONE, GUARD_TALK, GUARD_AFTER, PHONE_CALL, STELES, LOOK, BEATS, BROADCAST } from '../src/script.js';

test('there is a chapter card and a conversation with 伍伯 for every stage', () => {
  assert.equal(CHAPTERS.length, FRAGMENTS.length + 1);
  assert.equal(GUARD_TALK.length, FRAGMENTS.length + 1);
  for (const t of GUARD_TALK) { assert.ok(t.lines.length >= 3); assert.ok(t.again); }
  assert.equal(GUARD_TALK.filter((t) => t.confession).length, 1);
  assert.ok(GUARD_TALK[4].confession, 'he confesses after you have read the clipping');
});

test('every ending has an afterword from 伍伯', () => {
  for (const id of Object.keys(ENDINGS)) assert.ok(GUARD_AFTER[id], id);
});

test('phone messages hang off moments that exist', () => {
  const ok = new Set(['start', 'night', ...FRAGMENTS.map((_, i) => `stage:${i + 1}`), ...Object.keys(ENDINGS).map((e) => `end:${e}`)]);
  for (const m of PHONE) { assert.ok(ok.has(m.when), m.when); assert.ok(m.from && m.text && m.delay >= 0); }
  for (let i = 1; i <= FRAGMENTS.length; i++) assert.ok(PHONE.some((m) => m.when === `stage:${i}`), `stage ${i} has a message`);
});

test('the rest of the script is filled in', () => {
  assert.ok(INTRO.length >= 2 && INTRO.every((p) => p.title && p.body));
  assert.ok(PHONE_CALL.length >= 5 && PHONE_CALL.every((l) => l.length === 2 && l[1]));
  assert.ok(STELES.length >= 5 && STELES.every((s) => s.label && s.text));
  assert.ok(BROADCAST.length >= 3);
  for (const [k, v] of Object.entries(LOOK)) assert.ok(Array.isArray(v) && v.length && v.every((t) => t), k);
  for (const k of ['nightfall', 'bridgeDay', 'ringing', 'storm', 'lead']) assert.ok(BEATS[k], k);
});
