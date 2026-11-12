import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Terrain } from './world/terrain.js';
import { buildWorld } from './world/world.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { CameraRig } from './camera.js';
import { Sfx } from './audio.js';
import { Loot } from './game/loot.js';
import { Targets } from './game/targets.js';
import { Effects } from './game/effects.js';
import { Combat } from './game/combat.js';
import { Zone } from './game/zone.js';

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
  renderer.toneMappingExposure = 0.9;
  $('game').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 4000);

  // Sky + sun (late-morning Taichung light)
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 42), THREE.MathUtils.degToRad(155));
  const sky = new Sky(); sky.scale.setScalar(20000);
  const su = sky.material.uniforms;
  su.turbidity.value = 7; su.rayleigh.value = 1.4; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.8;
  su.sunPosition.value.copy(sunDir);
  scene.add(sky);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); const sky2 = new Sky(); sky2.scale.setScalar(1000);
  Object.assign(sky2.material.uniforms.sunPosition.value, sunDir); envScene.add(sky2);
  for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) sky2.material.uniforms[k].value = su[k].value;
  scene.environment = pmrem.fromScene(envScene).texture;
  scene.environmentIntensity = 0.45;
  scene.fog = new THREE.Fog(0xbfcad3, 180, 1500);

  const hemi = new THREE.HemisphereLight(0xd6e6ff, 0x4d5a33, 0.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const S = 70; Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 800 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  setLoading('計算地形…'); await tick();
  const terrain = new Terrain(elev, map.origin);
  const world = await buildWorld(scene, terrain, map, setLoading);

  setLoading('擺放物資…'); await tick();
  const loot = new Loot(scene, terrain, world).generate();
  const targets = new Targets(scene, terrain, world);
  const fx = new Effects(scene);
  const sfx = new Sfx();
  const zone = new Zone(scene, terrain, world);

  const input = new Input(renderer.domElement);
  const player = new Player(scene, terrain, world.colliders);
  const rig = new CameraRig(camera, terrain, world.colliders);
  const combat = new Combat({ camera, rig, player, terrain, world, loot, targets, fx, sfx, input });

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

  function updateSun() {
    const p = player.pos;
    // snap to shadow texels to avoid shimmering
    const texel = (2 * S) / sun.shadow.mapSize.x;
    const sx = Math.round(p.x / texel) * texel, sz = Math.round(p.z / texel) * texel;
    sun.target.position.set(sx, p.y, sz);
    sun.position.set(sx, p.y, sz).addScaledVector(sunDir, 400);
  }

  // UI flow
  const overlay = $('overlay'), startBtn = $('start-btn');
  setLoading(`完成：${map.buildings.length} 棟建築、${world.treeCount} 棵樹、${loot.count} 件物資`);
  startBtn.classList.remove('hidden');
  startBtn.textContent = '點擊開始';
  startBtn.onclick = () => { sfx.resume(); input.lock(); };
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
    rig.update(dt, player, combat.view);
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
    updateSun();
    hud.update(dt, player, raw);
    hud.updateCombat(dt, combat, player, rig, input);
    hud.updateZone(zone, player);
    input.endFrame();
    renderer.render(scene, camera);
  }

  const clock = new THREE.Clock();
  // game.step(dt) advances one frame by hand (used for automated testing).
  window.game = { scene, camera, renderer, player, world, terrain, input, hud, rig, combat, loot, targets, fx, sfx, zone, step: (dt = 1 / 60) => frame(dt, dt) };
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
