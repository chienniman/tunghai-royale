import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { Terrain } from './world/terrain.js';
import { buildWorld } from './world/world.js';
import { Player } from './player.js';
import { Input } from './input.js';
import { HUD } from './hud.js';

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

  setLoading('計算地形…'); await new Promise((r) => setTimeout(r, 0));
  const terrain = new Terrain(elev, map.origin);
  const world = await buildWorld(scene, terrain, map, setLoading);

  const input = new Input(renderer.domElement);
  const player = new Player(scene, terrain, world.colliders);
  // Spawn in front of Luce Chapel, looking at it.
  if (world.chapel) {
    const { center, axis, length } = world.chapel;
    const sx = center.x - axis.x * (length / 2 + 28), sz = center.z - axis.z * (length / 2 + 28);
    player.spawn(sx, sz, Math.atan2(-(center.x - sx), -(center.z - sz)));
  } else player.spawn(0, 0, 0);

  const hud = new HUD(world, terrain);

  // Third-person camera
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(), target = new THREE.Vector3();
  let camDist = 3.4;
  function updateCamera(dt) {
    const cp = Math.cos(player.pitch);
    look.set(-Math.sin(player.yaw) * cp, Math.sin(player.pitch), -Math.cos(player.yaw) * cp);
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    target.set(player.pos.x, player.headY + 0.1, player.pos.z).addScaledVector(right, 0.55);
    // pull the camera in if a wall/tree is between it and the player
    let want = 3.4;
    for (let d = 0.6; d <= 3.4; d += 0.2) {
      const x = target.x - look.x * d, y = target.y - look.y * d, z = target.z - look.z * d;
      if (world.colliders.blocked(x, y, z) || y < terrain.heightAt(x, z) + 0.25) { want = Math.max(0.6, d - 0.3); break; }
    }
    camDist += (want - camDist) * (want < camDist ? 1 : 1 - Math.exp(-6 * dt));
    camPos.copy(target).addScaledVector(look, -camDist);
    camPos.y = Math.max(camPos.y, terrain.heightAt(camPos.x, camPos.z) + 0.25);
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

  // UI flow
  const overlay = $('overlay'), startBtn = $('start-btn');
  setLoading(`完成：${map.buildings.length} 棟建築、${world.treeCount} 棵樹`);
  startBtn.classList.remove('hidden');
  startBtn.textContent = '點擊開始';
  startBtn.onclick = () => input.lock();
  input.onLockChange = (locked) => {
    overlay.classList.toggle('hidden', locked);
    $('hud').classList.toggle('hidden', !locked);
    if (!locked) { setLoading('已暫停'); startBtn.textContent = '繼續'; }
  };
  addEventListener('keydown', (e) => { if (e.code === 'KeyM' && input.locked) hud.toggleBig(); });
  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  const clock = new THREE.Clock();
  window.game = { scene, camera, renderer, player, world, terrain, input, hud };
  renderer.setAnimationLoop(() => {
    const raw = clock.getDelta();
    const dt = Math.min(raw, 0.05);
    if (input.locked) player.update(dt, input);
    else input.consumeMouse();
    player.animate(0, false);
    updateCamera(dt);
    updateSun();
    hud.update(dt, player, raw);
    input.endFrame();
    renderer.render(scene, camera);
  });
}

main().catch((e) => {
  console.error(e);
  setLoading('載入失敗：' + e.message);
});
