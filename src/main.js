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
import { Ghosts } from './ghosts.js';
import { Monsters } from './monsters.js';
import { Events } from './events.js';
import { Sfx } from './audio.js';
import { TouchControls } from './touch.js';

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

  // Touch devices get on-screen controls, full screen landscape and lighter graphics. `?touch=1` forces it.
  const q = new URLSearchParams(location.search);
  const touch = q.has('touch') ? q.get('touch') !== '0' : matchMedia('(pointer: coarse)').matches;
  document.body.classList.toggle('touch', touch);

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

  // Lights: one directional light is the sun by day and the moon by night (see sky.js),
  // plus a torch on the player that comes on when it gets dark.
  const hemi = new THREE.HemisphereLight(0xc3dbff, 0x56603a, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe6c4, 3.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(touch ? 1024 : 2048, touch ? 1024 : 2048);
  const S = 70; Object.assign(sun.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 800 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
  scene.add(sun, sun.target);
  const torch = new THREE.SpotLight(0xfff1d6, 0, 60, 0.5, 0.55, 1.0);
  scene.add(torch, torch.target);
  const sky = buildSky(scene, renderer, { sun, hemi });
  const sfx = new Sfx();

  setLoading('計算地形…'); await new Promise((r) => setTimeout(r, 0));
  const terrain = new Terrain(elev, map.origin);
  const world = await buildWorld(scene, terrain, map, setLoading);

  setLoading('擺放物資…'); await new Promise((r) => setTimeout(r, 0));
  const input = new Input(renderer.domElement, { touch });
  const inv = new Inventory();
  const player = new Player(scene, terrain, world.colliders, inv);
  const loot = new Loot(scene, terrain, world.colliders);
  const lootClusters = loot.spawnWorld(map);
  const fx = new FX(scene, camera);
  const targets = new Targets(scene, terrain, world, loot, fx); targets.audio = sfx;
  const ghosts = new Ghosts(scene, terrain, world, loot, fx, sfx);
  const monsters = new Monsters(scene, terrain, world, loot, fx, sfx);
  const ui = new CombatHUD(inv, player); ui.loot = loot;
  const combat = new Combat({ player, inv, world, enemies: [targets, ghosts, monsters], loot, fx, ui, audio: sfx });

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
  loot.scatter([{ id: 'pistol', n: 1, ammo: 15 }, { id: 'ammo_9mm', n: 30 }, { id: 'chickenfeet', n: 3 }],
    spawn.x + spawn.dx * 3, spawn.z + spawn.dz * 3, 0.8);
  loot.scatter([{ id: 'ar', n: 1, ammo: 30 }, { id: 'ammo_556', n: 60 }, { id: 'vest1', n: 1, dur: 200 }, { id: 'icecream', n: 1 }],
    spawn.x + spawn.dx * 7 + spawn.dz * 2.5, spawn.z + spawn.dz * 7 - spawn.dx * 2.5, 0.9);

  const hud = new HUD(world, terrain); ui.hud = hud;
  const events = new Events({ scene, terrain, world, loot, fx, audio: sfx, ui, sky, ghosts, monsters, player });
  hud.markers = () => [...targets.alerted(), ...events.markers];

  targets.onKill = (tg, dist) => ui.kill(`${tg.kind === 'sentry' ? '擊毀' : '擊倒'} ${tg.name} · ${dist.toFixed(0)} m`);
  ghosts.onKill = (g, dist) => { ui.kill(`驅散 ${g.name} · ${dist.toFixed(0)} m`); sfx.ghostDie(); };
  monsters.onKill = (m, dist) => { ui.kill(`消滅 ${m.name} · ${dist.toFixed(0)} m`); sfx.ghostDie(); };
  monsters.onTaken = () => events.takeAway();
  combat.onShot = (w) => monsters.hear(player.pos.x, player.pos.z, w.id === 'sniper' || w.id === 'shotgun' ? 110 : 75);
  let shake = 0;
  ghosts.onScare = () => { ui.scare(); sfx.scare(); shake = 1.6; };
  sky.onDusk = () => ui.toast('天黑了……有東西在校園裡遊蕩');
  sky.onDawn = () => { ui.toast('天亮了，阿飄都散了'); ghosts.banish(); };
  player.onDamage = (amount, info) => { ui.damaged(amount, info); sfx.hurt(); shake = Math.max(shake, Math.min(0.6, amount / 40)); };
  player.onDeath = (info) => {
    combat.onPlayerDeath(); ghosts.banish(); monsters.banish();
    const acc = combat.stats.shots ? Math.round(100 * combat.stats.hits / combat.stats.shots) : 0;
    ui.showDeath(`死因：${info.source || '不明'}<br>驅散鬼怪 ${ghosts.stats.ghosts + monsters.stats.kills} · 擊毀哨戒機槍 ${targets.stats.sentries} · 擊倒標靶 ${targets.stats.dummies} · 命中率 ${acc}%<br>身上的物資掉在原地了`);
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
    if (shake > 0.001) { // getting hit / scared rattles the view
      shake *= Math.exp(-6 * dt);
      camera.rotation.z += (Math.random() - 0.5) * 0.09 * shake;
      camera.position.x += (Math.random() - 0.5) * 0.1 * shake; camera.position.y += (Math.random() - 0.5) * 0.1 * shake;
    }
    // torch: from the head, along the view, only once it is dark
    // ...and it stutters and dies back whenever she is close
    torch.intensity = events.torchOut ? 0 : 42 * sky.night * (player.dead ? 0.2 : 1) * (1 - 0.93 * ghosts.flicker);
    torch.position.set(player.pos.x, player.headY + 0.1, player.pos.z).addScaledVector(look, 0.3);
    torch.target.position.copy(torch.position).addScaledVector(look, 10);
  }

  function updateSun() {
    const p = player.pos;
    // snap to shadow texels to avoid shimmering
    const texel = (2 * S) / sun.shadow.mapSize.x;
    const sx = Math.round(p.x / texel) * texel, sz = Math.round(p.z / texel) * texel;
    sun.target.position.set(sx, p.y, sz);
    sun.position.set(sx, p.y, sz).addScaledVector(sky.lightDir, 400);
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
  startBtn.onclick = () => { sfx.unlock(); input.lock(); };
  input.onLockChange = (locked) => {
    if (locked) {
      state = 'play'; ui.setInventoryOpen(false);
      overlay.classList.add('hidden'); $('hud').classList.remove('hidden');
    } else if (state !== 'inv') showMenu();
    touchUI?.show(locked);
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
  $('inv-close').onclick = () => { if (state === 'inv') closeInventory(); };
  $('respawn-btn').onclick = () => { if (player.dead && player.deadT > 0.8) respawn(); };
  const touchUI = touch ? new TouchControls(input, {
    pause: () => input.unlock(),
    bag: () => { if (state === 'play' && !player.dead) openInventory(); },
    map: () => hud.toggleBig(),
    slot: (i) => { if (!player.dead) combat._switch(inv.select(i)); },
    use: (id) => combat.startUse(id),
    pick: (i) => combat.pickup(combat.near[i]),
  }) : null;
  document.addEventListener('visibilitychange', () => { if (document.hidden && touch && input.locked) input.unlock(); });
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

  let time = 0, beatT = 0;
  // One frame of the game. dt is the clamped simulation step, raw the real elapsed time (for the FPS counter).
  function frame(dt, raw, render = true) {
    const running = (state === 'play' && input.locked) || state === 'inv';
    if (running) {
      combat.pre(dt, input);
      player.update(dt, input);
      updateCamera(dt);
      combat.post(dt, input, cam);
      sky.update(dt, camera);
      targets.update(dt, player);
      ghosts.update(dt, player, cam, sky);
      monsters.update(dt, player, cam, sky);
      events.update(dt, cam);
      loot.update(dt, player.pos.x, player.pos.z);
      fx.update(dt);
      loot.animate(time += dt);
      hud.extra = `驅鬼 ${ghosts.stats.ghosts + monsters.stats.kills} · 哨戒 ${targets.stats.sentries} · 標靶 ${targets.stats.dummies}`;
    } else {
      input.consumeMouse();
      player.animate(0);
      updateCamera(dt);
      loot.update(dt, player.pos.x, player.pos.z);
      sky.update(0, camera);
    }
    world.setNight(events.blackout > 0 ? 0 : sky.night); sfx.setNight(running ? sky.night : 0);
    // dread: grain and darkness creep in from the edges, the heart speeds up
    const dread = Math.max(ghosts.dread, monsters.dread);
    ui.setDread(ghosts.scaring ? 0.3 : dread);
    if (running && dread > 0.22 && (beatT -= dt) <= 0) { beatT = THREE.MathUtils.lerp(1.15, 0.42, dread); sfx.heartbeat(0.4 + 0.6 * dread); }
    ui.setClock(sky.clock, sky.night > 0.5);
    updateSun();
    hud.update(dt, player, raw);
    ui.update(running ? dt : 0, combat, camera);
    input.endFrame();
    world.grass.update(player.pos.x, player.pos.z);
    if (render) renderer.render(scene, camera);
  }

  const clock = new THREE.Clock();
  // Debug handle. step() advances the simulation without waiting for the browser's frame clock.
  window.game = {
    scene, camera, renderer, player, world, terrain, input, hud, inv, loot, targets, ghosts, monsters, events, sky, combat, ui, fx, sfx, spawn, lootClusters,
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
