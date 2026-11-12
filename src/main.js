import * as THREE from 'three';
import { buildSky } from './world/sky.js';
import { Terrain } from './world/terrain.js';
import { buildWorld } from './world/world.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { HUD } from './hud.js';
import { Inventory } from './inventory.js';
import { Loot } from './loot.js';
import { FX } from './fx.js';
import { Targets } from './targets.js';
import { Combat, BASE_FOV } from './combat.js';
import { CombatHUD } from './hud-combat.js';

const $ = (id) => document.getElementById(id);
const setLoading = (t) => { $('loading-text').textContent = t; };

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
  renderer.toneMappingExposure = 0.82;
  $('game').appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(BASE_FOV, innerWidth / innerHeight, 0.1, 4000);

  const sky = buildSky(scene, renderer);
  const sunDir = sky.sunDir;

  const hemi = new THREE.HemisphereLight(0xc3dbff, 0x56603a, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe6c4, 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const S = 70; Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 800 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);

  setLoading('計算地形…'); await new Promise((r) => setTimeout(r, 0));
  const terrain = new Terrain(elev, map.origin);
  const world = await buildWorld(scene, terrain, map, setLoading);

  setLoading('擺放物資…'); await new Promise((r) => setTimeout(r, 0));
  const input = new Input(renderer.domElement);
  const inv = new Inventory();
  const player = new Player(scene, terrain, world.colliders, inv);
  const loot = new Loot(scene, terrain, world.colliders);
  const lootClusters = loot.spawnWorld(map);
  const fx = new FX(scene, camera);
  const targets = new Targets(scene, terrain, world, loot, fx);
  const ui = new CombatHUD(inv, player); ui.loot = loot;
  const combat = new Combat({ player, inv, world, targets, loot, fx, ui });

  // Spawn in front of Luce Chapel, looking at it.
  const spawn = { x: 0, z: 0, yaw: 0, dx: 0, dz: -1 };
  if (world.chapel) {
    const { center, axis, length } = world.chapel;
    spawn.x = center.x - axis.x * (length / 2 + 28); spawn.z = center.z - axis.z * (length / 2 + 28);
    const l = Math.hypot(center.x - spawn.x, center.z - spawn.z);
    spawn.dx = (center.x - spawn.x) / l; spawn.dz = (center.z - spawn.z) / l;
    spawn.yaw = Math.atan2(-spawn.dx, -spawn.dz);
  }
  player.spawn(spawn.x, spawn.z, spawn.yaw);
  const placed = targets.placeAll(spawn, spawn.dx, spawn.dz);
  // Starter gear a few steps ahead so the practice range is usable straight away.
  loot.scatter([{ id: 'pistol', n: 1, ammo: 15 }, { id: 'ammo_9mm', n: 30 }, { id: 'bandage', n: 3 }],
    spawn.x + spawn.dx * 3, spawn.z + spawn.dz * 3, 0.8);
  loot.scatter([{ id: 'ar', n: 1, ammo: 30 }, { id: 'ammo_556', n: 60 }, { id: 'vest1', n: 1, dur: 200 }, { id: 'milk', n: 1 }],
    spawn.x + spawn.dx * 7 + spawn.dz * 2.5, spawn.z + spawn.dz * 7 - spawn.dx * 2.5, 0.9);

  const hud = new HUD(world, terrain);
  hud.markers = () => targets.alerted();

  targets.onKill = (tg, dist) => ui.kill(`${tg.kind === 'sentry' ? '擊毀' : '擊倒'} ${tg.name} · ${dist.toFixed(0)} m`);
  player.onDamage = (amount, info) => ui.damaged(amount, info);
  player.onDeath = (info) => {
    combat.onPlayerDeath();
    const acc = combat.stats.shots ? Math.round(100 * combat.stats.hits / combat.stats.shots) : 0;
    ui.showDeath(`死因：${info.source || '不明'}<br>擊毀哨戒機槍 ${targets.stats.sentries} · 擊倒標靶 ${targets.stats.dummies} · 命中率 ${acc}%<br>身上的物資掉在原地了`);
  };
  const respawn = () => {
    player.spawn(spawn.x, spawn.z, spawn.yaw);
    ui.hideDeath();
  };

  // Third-person camera (first-person through the scope)
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), target = new THREE.Vector3(), right = new THREE.Vector3();
  const cam = { pos: camPos, look, dist: 3.4 };
  let camDist = 3.4;
  function updateCamera(dt) {
    const cp = Math.cos(player.pitch);
    look.set(-Math.sin(player.yaw) * cp, Math.sin(player.pitch), -Math.cos(player.yaw) * cp);
    if (camera.fov !== combat.fov) { camera.fov = combat.fov; camera.updateProjectionMatrix(); }
    const scoped = combat.scoped && !player.dead;
    player.rig.root.visible = !scoped;
    if (scoped) {
      camPos.set(player.pos.x, player.headY, player.pos.z).addScaledVector(look, 0.25);
      cam.dist = 0;
    } else {
      // pivot sits above and to the right of the head so the character frames the lower-left of the view
      right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
      target.set(player.pos.x, player.headY + THREE.MathUtils.lerp(0.3, 0.2, combat.ads), player.pos.z)
        .addScaledVector(right, THREE.MathUtils.lerp(0.6, 0.8, combat.ads));
      // pull the camera in if a wall/tree is between it and the player; closer over the shoulder when aiming
      const far = player.dead ? 5 : THREE.MathUtils.lerp(3.3, 1.9, combat.ads);
      let want = far;
      for (let d = 0.6; d <= far; d += 0.2) {
        const x = target.x - look.x * d, y = target.y - look.y * d, z = target.z - look.z * d;
        if (world.colliders.blocked(x, y, z) || y < terrain.heightAt(x, z) + 0.25) { want = Math.max(0.6, d - 0.3); break; }
      }
      camDist += (want - camDist) * (want < camDist ? 1 : 1 - Math.exp(-6 * dt));
      camPos.copy(target).addScaledVector(look, -camDist);
      camPos.y = Math.max(camPos.y, terrain.heightAt(camPos.x, camPos.z) + 0.25);
      cam.dist = camDist;
    }
    camera.position.copy(camPos);
    camera.lookAt(camPos.x + look.x, camPos.y + look.y, camPos.z + look.z);
  }

  function updateSun() {
    const p = player.pos;
    // snap to shadow texels to avoid shimmering
    const texel = (2 * S) / sun.shadow.mapSize.x;
    const sx = Math.round(p.x / texel) * texel, sz = Math.round(p.z / texel) * texel;
    sun.target.position.set(sx, p.y, sz);
    sun.position.set(sx, p.y, sz).addScaledVector(sunDir, 400);
  }

  // UI flow. state: 'menu' (start / paused) · 'play' · 'inv' (backpack open, game keeps running) · 'closing'
  const overlay = $('overlay'), startBtn = $('start-btn');
  let state = 'menu';
  const showMenu = () => {
    state = 'menu'; ui.setInventoryOpen(false);
    overlay.classList.remove('hidden'); $('hud').classList.add('hidden');
    setLoading('已暫停'); startBtn.textContent = '繼續';
  };
  setLoading(`完成：${map.buildings.length} 棟建築、${world.treeCount} 棵樹、${loot.count} 件物資、${placed.sentries} 座哨戒機槍`);
  startBtn.classList.remove('hidden');
  startBtn.textContent = '點擊開始';
  startBtn.onclick = () => input.lock();
  input.onLockChange = (locked) => {
    if (locked) {
      state = 'play'; ui.setInventoryOpen(false);
      overlay.classList.add('hidden'); $('hud').classList.remove('hidden');
    } else if (state !== 'inv') showMenu();
  };
  input.onLockError = () => { if (state === 'closing') showMenu(); };
  const openInventory = () => { state = 'inv'; ui.setInventoryOpen(true); input.unlock(); };
  const closeInventory = () => {
    state = 'closing'; ui.setInventoryOpen(false); input.lock();
    setTimeout(() => { if (state === 'closing' && !input.locked) showMenu(); }, 700);
  };
  ui.onInvAction = (act, arg) => {
    if (act === 'take') combat.pickup(ui._near?.[+arg]);
    else if (act === 'drop') combat.drop(arg);
    else if (act === 'drop1') combat.drop(arg, 1);
    else if (act === 'use') combat.startUse(arg);
  };
  addEventListener('keydown', (e) => {
    if (e.repeat) return;
    if (e.code === 'KeyM' && input.locked) hud.toggleBig();
    else if (e.code === 'Tab') {
      if (state === 'play' && input.locked && !player.dead) openInventory();
      else if (state === 'inv') closeInventory();
    } else if (e.code === 'Escape' && state === 'inv') closeInventory();
    else if (e.code === 'Enter' && player.dead && player.deadT > 0.8 && state !== 'menu') respawn();
  });
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  let time = 0;
  // One frame of the game. dt is the clamped simulation step, raw the real elapsed time (for the FPS counter).
  function frame(dt, raw, render = true) {
    const running = (state === 'play' && input.locked) || state === 'inv';
    if (running) {
      combat.pre(dt, input);
      player.update(dt, input);
      updateCamera(dt);
      combat.post(dt, input, cam);
      targets.update(dt, player);
      loot.update(dt, player.pos.x, player.pos.z);
      fx.update(dt);
      loot.animate(time += dt);
      hud.extra = `哨戒 ${targets.stats.sentries} · 標靶 ${targets.stats.dummies}`;
    } else {
      input.consumeMouse();
      player.animate(0);
      updateCamera(dt);
      loot.update(dt, player.pos.x, player.pos.z);
    }
    updateSun();
    hud.update(dt, player, raw);
    ui.update(running ? dt : 0, combat, camera);
    input.endFrame();
    sky.update(dt, camera);
    world.grass.update(player.pos.x, player.pos.z);
    if (render) renderer.render(scene, camera);
  }

  const clock = new THREE.Clock();
  // Debug handle. step() advances the simulation without waiting for the browser's frame clock.
  window.game = {
    scene, camera, renderer, player, world, terrain, input, hud, inv, loot, targets, combat, ui, fx, spawn, lootClusters,
    step(dt = 1 / 60, n = 1, render = false) { for (let i = 0; i < n; i++) frame(dt, dt, render && i === n - 1); },
  };
  renderer.setAnimationLoop(() => {
    const raw = clock.getDelta();
    frame(Math.min(raw, 0.05), raw);
  });
}

main().catch((e) => {
  console.error(e);
  setLoading('載入失敗：' + e.message);
});
