import * as THREE from 'three';
import { createNight } from './world/atmosphere.js';
import { buildingUniforms } from './world/buildings.js';
import { Flashlight } from './flashlight.js';
import { createGhostFigure, ghostClock } from './ghosts/figure.js';
import { Ghosts, WANDERER } from './ghosts/ghosts.js';
import { Terrain } from './world/terrain.js';
import { buildWorld } from './world/world.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { CameraRig } from './camera.js';
import { Sfx } from './audio.js';
import { Spooks } from './spooks.js';
import { Loot } from './game/loot.js';
import { Targets } from './game/targets.js';
import { Effects } from './game/effects.js';
import { Combat } from './game/combat.js';
import { Zone } from './game/zone.js';
import { Exits } from './game/exits.js';

const $ = (id) => document.getElementById(id);
const setLoading = (t) => { $('loading-text').textContent = t; };
const tick = () => new Promise((r) => setTimeout(r, 0));

async function loadJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json();
}

async function main() {
  setLoading('下載地圖資料…');
  const [map, elev] = await Promise.all([loadJSON('data/map.json'), loadJSON('data/elevation.json')]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  $('game').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 4000);

  // Night: moonlight, a dark sky with the city's glow on the horizon, and fog that swallows the distance.
  const night = createNight(scene, renderer);

  setLoading('計算地形…'); await tick();
  const terrain = new Terrain(elev, map.origin);
  const world = await buildWorld(scene, terrain, map, setLoading);

  setLoading('擺放物資…'); await tick();
  const loot = new Loot(scene, terrain, world).generate();
  const targets = new Targets(scene, terrain, world);
  const fx = new Effects(scene);
  const sfx = new Sfx();
  const zone = new Zone(scene, terrain, world);
  const spooks = new Spooks(sfx);
  const exits = new Exits(scene, terrain, world);

  const input = new Input(renderer.domElement);
  const player = new Player(scene, terrain, world.colliders);
  const rig = new CameraRig(camera, terrain, world.colliders);
  const combat = new Combat({ camera, rig, player, terrain, world, loot, targets, fx, sfx, input });
  const torch = new Flashlight(scene);
  const torchOrigin = new THREE.Vector3();
  const ghosts = new Ghosts({ scene, terrain, world, player, rig, camera, torch, spooks }).register('wanderer', WANDERER);
  ghosts.onSay = (text) => combat.say(text);
  combat.ghosts = ghosts;
  ghosts.onScare = (g, strength) => { spooks.sting(strength); rig.shake = Math.min(0.12, rig.shake + 0.08 * strength); };

  // Spawn in front of Luce Chapel, looking at it, with a starter kit and a small firing range on the lawn.
  const spawn = { x: 0, z: 0, yaw: 0 };
  if (world.chapel) {
    const { center, axis, length } = world.chapel;
    spawn.x = center.x - axis.x * (length / 2 + 28); spawn.z = center.z - axis.z * (length / 2 + 28);
    spawn.yaw = Math.atan2(-(center.x - spawn.x), -(center.z - spawn.z));
  }
  player.spawn(spawn.x, spawn.z, spawn.yaw);
  {
    const fx0 = -Math.sin(spawn.yaw), fz0 = -Math.cos(spawn.yaw), rx = Math.cos(spawn.yaw), rz = -Math.sin(spawn.yaw);
    const at = (f, r) => [player.pos.x + fx0 * f + rx * r, player.pos.z + fz0 * f + rz * r];
    loot.spot(...at(3.5, -1.2), ['ar', 'ammo_556', 'ammo_556', 'ammo_556']);
    loot.spot(...at(3.5, 1.4), ['pistol', 'ammo_9mm', 'bandage']);
    loot.spot(...at(5.5, 0.2), ['medkit', 'drink']);
    // targets off to both sides (the chapel is straight ahead), facing the spawn point
    for (const [f, r] of [[6, 16], [2, 28], [10, 42], [-4, 60], [6, -18], [0, -32], [12, -48], [-6, -70]]) {
      const [x, z] = at(f, r);
      targets.add(x, z, Math.atan2(player.pos.x - x, player.pos.z - z));
    }
  }
  targets.scatter(70);

  const hud = new HUD(world, terrain);
  hud.targets = targets;
  player.onStep = (run) => sfx.step(run);
  player.onHurt = () => { hud.hurtT = 0.5; sfx.hurt(); };
  let respawnT = 0;
  player.onDeath = () => { respawnT = 3; combat.say('你倒下了…'); };

  // The zone starts with the match (first click) and restarts when the player respawns.
  const newMatch = () => zone.start((Math.random() * 0xffffffff) >>> 0);
  zone.onEvent = (kind, phase) => {
    if (kind === 'new') combat.say(`第 ${phase + 1} 圈：新的安全區已標在地圖上（白圈）`);
    else if (kind === 'shrink') { combat.say('毒圈開始縮小！'); sfx.alarm(); }
    else { combat.say('最後一圈'); sfx.alarm(); }
  };
  let zoneTick = 0;


  // UI flow
  const overlay = $('overlay'), startBtn = $('start-btn');
  setLoading(`完成：${map.buildings.length} 棟建築、${world.treeCount} 棵樹、${loot.count} 件物資`);
  startBtn.classList.remove('hidden');
  startBtn.textContent = '點擊開始';
  startBtn.onclick = () => { sfx.resume(); spooks.init(); input.lock(); };
  let started = false;
  input.onLockChange = (locked) => {
    overlay.classList.toggle('hidden', locked);
    $('hud').classList.toggle('hidden', !locked);
    if (!locked) { setLoading('已暫停'); startBtn.textContent = '繼續'; }
    else if (!started) { started = true; newMatch(); combat.say('安全區已標在地圖上，待在白圈內'); }
  };
  addEventListener('keydown', (e) => { if (e.code === 'KeyM' && input.locked) hud.toggleBig(); });
  // Keep the canvas matched to the window (also covers a page that was loaded in a background tab at size 0).
  let vw = 0, vh = 0;
  function fit() {
    if (innerWidth === vw && innerHeight === vh) return;
    vw = innerWidth; vh = innerHeight;
    if (!vw || !vh) return;
    camera.aspect = vw / vh; camera.updateProjectionMatrix();
    renderer.setSize(vw, vh);
  }

  function frame(dt, raw) {
    fit();
    const live = input.locked;
    if (live) {
      player.update(dt, input);
      if (!player.alive && (respawnT -= dt) <= 0) {
        player.spawn(spawn.x, spawn.z, spawn.yaw);
        combat.say('已在路思義教堂前重生，新的一局開始');
        newMatch();
      }
    } else { input.consumeMouse(); player.animate(0); }
    if (live) {
      if (input.hit('KeyF')) { torch.toggle(); sfx.dry(); }
      if (input.hit('KeyV')) rig.firstPerson = !rig.firstPerson;
    }
    rig.update(dt, player, combat.view);
    // the torch is held at chest height in third person, at the eye in first person
    if (rig.firstPerson || rig.scoped) torchOrigin.copy(camera.position).addScaledVector(rig.look, 0.1); else torchOrigin.set(player.pos.x, player.pos.y + (player.crouch ? 0.95 : 1.32), player.pos.z);
    torch.update(dt, torchOrigin, rig.look, player.yaw);
    if (live) ghosts.update(dt);
    if (live) {
      combat.update(dt);
      zone.update(dt, camera);
      // outside the wall: lose health once a second
      if (player.alive && zone.outside(player.pos.x, player.pos.z) > 0) {
        zoneTick += dt;
        if (zoneTick >= 1) { zoneTick -= 1; player.damage(zone.dps); }
      } else zoneTick = 0;
    }
    loot.update(player.pos);
    targets.update(dt);
    fx.update(dt, camera);
    night.update(dt, camera, player.pos);
    buildingUniforms.uTime.value += dt;
    world.lamps.update(dt, player.pos);
    ghostClock.value += dt;
    spooks.setListener(camera);
    hud.update(dt, player, raw);
    hud.updateCombat(dt, combat, player, rig, input);
    hud.updateZone(zone, player);
    input.endFrame();
    renderer.render(scene, camera);
  }

  const clock = new THREE.Clock();
  // game.step(dt) advances one frame by hand (used for automated testing).
  window.game = { scene, camera, renderer, player, world, terrain, input, hud, rig, combat, loot, targets, fx, sfx, zone, night, torch, spooks, ghosts, exits, debug: { createGhostFigure }, step: (dt = 1 / 60) => frame(dt, dt) };
  renderer.setAnimationLoop(() => {
    if (window.game.freeze) { clock.getDelta(); renderer.render(scene, camera); return; }   // debug: hold the simulation still
    const raw = clock.getDelta();
    frame(Math.min(raw, 0.05), raw);
  });
}

main().catch((e) => {
  console.error(e);
  setLoading('載入失敗：' + e.message);
});
