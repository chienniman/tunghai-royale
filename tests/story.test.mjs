import test from 'node:test';
import assert from 'node:assert/strict';
import { Story, FRAGMENTS, ENDINGS, FORTUNES, RUMORS, LINES } from '../src/story.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('fragments are collected strictly in order', () => {
  const s = new Story();
  assert.equal(s.objective.id, FRAGMENTS[0].id);
  assert.equal(s.collect(FRAGMENTS[2].id), null, 'cannot skip ahead');
  assert.equal(s.collect(FRAGMENTS[0].id).id, 'photo');
  assert.equal(s.collect(FRAGMENTS[0].id), null, 'cannot collect twice');
  assert.equal(s.stage, 1);
  assert.equal(s.objective.id, FRAGMENTS[1].id);
});

test('the bridge only opens once everything is found, and only one ending can be chosen', () => {
  const s = new Story();
  assert.equal(s.choose('release'), null);
  for (const f of FRAGMENTS) s.collect(f.id, '21:00');
  assert.ok(s.complete);
  assert.equal(s.objective.id, 'bridge');
  assert.equal(s.choose('nonsense'), null);
  assert.equal(s.choose('stay').name, ENDINGS.stay.name);
  assert.equal(s.choose('release'), null, 'the choice is final');
  assert.equal(s.objective, null);
  assert.ok(s.log.length >= FRAGMENTS.length + 1);
});

test('progress survives a reload, and a damaged save falls back safely', () => {
  const store = memory();
  const a = new Story(store);
  a.collect('photo'); a.collect('diary'); a.readRumor('jiangshi'); a.drawFortune(() => 0);
  const b = new Story(store);
  assert.deepEqual(b.found, ['photo', 'diary']);
  assert.deepEqual(b.rumors, ['jiangshi']);
  assert.equal(b.fortunes.length, 1);
  store.setItem('tunghai-royale-story-v1', JSON.stringify({ found: ['diary', 'photo'], ending: 'release' }));
  const c = new Story(store);
  assert.deepEqual(c.found, [], 'out-of-order saves are not trusted');
  assert.equal(c.ending, null, 'no ending without the full story');
  store.setItem('tunghai-royale-story-v1', '{not json');
  assert.equal(new Story(store).stage, 0);
  b.reset();
  assert.equal(new Story(store).stage, 0);
});

test('fortunes do not repeat until all are drawn', () => {
  const s = new Story();
  const seen = new Set();
  for (let i = 0; i < FORTUNES.length; i++) seen.add(s.drawFortune(Math.random).no);
  assert.equal(seen.size, FORTUNES.length);
});

test('she has something to say at every stage of the story', () => {
  const s = new Story();
  for (let i = 0; i <= FRAGMENTS.length; i++) {
    for (const kind of Object.keys(LINES)) assert.ok(s.line(kind, () => 0).length > 0, `${kind} @ ${i}`);
    if (FRAGMENTS[i]) s.collect(FRAGMENTS[i].id);
  }
  assert.equal(s.line('nope'), '');
});

test('story data is complete', () => {
  for (const f of FRAGMENTS) for (const k of ['id', 'title', 'where', 'place', 'date', 'hint', 'body', 'next']) assert.ok(f[k], `${f.id}.${k}`);
  for (const e of Object.values(ENDINGS)) for (const k of ['choice', 'name', 'now', 'future', 'effect']) assert.ok(e[k]);
  assert.equal(new Set(RUMORS.map((r) => r.id)).size, RUMORS.length);
});

test('the fourth ending is only offered once 伍伯 has confessed', () => {
  const s = new Story();
  for (const f of FRAGMENTS) s.collect(f.id);
  assert.deepEqual(s.choices, ['release', 'burn', 'stay']);
  assert.equal(s.choose('deliver'), null);
  assert.equal(s.talk(4), true);
  assert.equal(s.talk(4), false, 'each conversation counts once');
  assert.ok(s.choices.includes('deliver'));
  assert.equal(s.choose('deliver').name, ENDINGS.deliver.name);
});

test('the opening, conversations, phone and one-off beats survive a reload', () => {
  const store = memory();
  const a = new Story(store);
  a.introSeen = true; a.talk(0); a.talk(1); a.receive({ from: '阿哲', text: '在嗎', stamp: '14:00' });
  assert.equal(a.flag('ph:start'), true);
  assert.equal(a.flag('ph:start'), false, 'a beat fires once');
  const b = new Story(store);
  assert.equal(b.introSeen, true);
  assert.deepEqual(b.talked, [0, 1]);
  assert.equal(b.phone.length, 1);
  assert.equal(b.flag('ph:start'), false, 'and stays fired after reloading');
  for (let i = 0; i < 60; i++) b.receive({ from: 'x', text: String(i), stamp: '' });
  assert.ok(b.phone.length <= 40, 'the phone log is capped');
});
