import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mulberry32 } from '../util.js';

export const DAY_SECONDS = 600;        // real seconds for a full 24 h
const START_HOUR = 15.5;               // mid-afternoon: about a minute of daylight before dusk
const lerp = THREE.MathUtils.lerp, smooth = THREE.MathUtils.smoothstep;

// Tileable fractal noise -> soft cumulus alpha.
function cloudTexture(size = 512) {
  const rng = mulberry32(77);
  const octave = (n) => { const a = new Float32Array(n * n); for (let i = 0; i < a.length; i++) a[i] = rng(); return { n, a }; };
  const layers = [octave(4), octave(8), octave(16), octave(32), octave(64)];
  const sample = ({ n, a }, u, v) => {
    const x = u * n, y = v * n, x0 = Math.floor(x), y0 = Math.floor(y);
    let tx = x - x0, ty = y - y0; tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty);
    const i0 = x0 % n, i1 = (x0 + 1) % n, j0 = y0 % n, j1 = (y0 + 1) % n;
    return (a[j0 * n + i0] * (1 - tx) + a[j0 * n + i1] * tx) * (1 - ty) + (a[j1 * n + i0] * (1 - tx) + a[j1 * n + i1] * tx) * ty;
  };
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'), img = ctx.createImageData(size, size), d = img.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const u = x / size, v = y / size;
    let f = 0, w = 0.5;
    for (const l of layers) { f += sample(l, u, v) * w; w *= 0.5; }
    const cover = smooth(f, 0.5, 0.72);      // how much cloud
    const shade = smooth(f, 0.55, 0.9);      // thicker = slightly greyer underside
    const i = (y * size + x) * 4;
    d[i] = 255 - shade * 38; d[i + 1] = 255 - shade * 34; d[i + 2] = 255 - shade * 26; d[i + 3] = cover * 235;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

function moonTexture() {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d');
  let g = ctx.createRadialGradient(s / 2, s / 2, s * 0.16, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(190,210,255,.5)'); g.addColorStop(1, 'rgba(120,150,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
  ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.17, 0, Math.PI * 2);
  g = ctx.createRadialGradient(s * 0.45, s * 0.44, 4, s / 2, s / 2, s * 0.18);
  g.addColorStop(0, '#fdfdf4'); g.addColorStop(1, '#cfd8e6');
  ctx.fillStyle = g; ctx.fill();
  ctx.fillStyle = 'rgba(150,165,190,.45)';
  for (const [x, y, r] of [[0.46, 0.45, 0.03], [0.55, 0.53, 0.022], [0.5, 0.58, 0.016], [0.56, 0.44, 0.012]]) { ctx.beginPath(); ctx.arc(s * x, s * y, s * r, 0, Math.PI * 2); ctx.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const C = (hex) => new THREE.Color(hex);
const PAL = {
  sunNoon: C(0xfff0dc), sunLow: C(0xff9a52), moon: C(0x8fb2ff),
  hemiSkyDay: C(0xc3dbff), hemiSkyNight: C(0x33456e), hemiGndDay: C(0x56603a), hemiGndNight: C(0x0c1016),
  fogDay: C(0xc4d3e2), fogDusk: C(0xd89a78), fogNight: C(0x060a13),
  cloudDay: C(0xffffff), cloudDusk: C(0xffb28a), cloudNight: C(0x1b2233),
};

// Sky dome, day/night cycle, sun + moon light, stars, clouds and fog.
// lights: { sun (DirectionalLight, also used as the moon), hemi (HemisphereLight) }
export function buildSky(scene, renderer, lights) {
  const sunDir = new THREE.Vector3(), moonDir = new THREE.Vector3(), lightDir = new THREE.Vector3(0, 1, 0);
  const params = { turbidity: 3.2, rayleigh: 1.55, mieCoefficient: 0.0045, mieDirectionalG: 0.82 };
  const mk = (scale) => {
    const s = new Sky(); s.scale.setScalar(scale);
    for (const [k, v] of Object.entries(params)) s.material.uniforms[k].value = v;
    return s;
  };
  const sky = mk(20000); scene.add(sky);
  // image-based ambient light, captured once from an afternoon sky and dimmed at night
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene(), envSky = mk(1000);
  envSky.material.uniforms.sunPosition.value.setFromSphericalCoords(1, THREE.MathUtils.degToRad(50), THREE.MathUtils.degToRad(295));
  env.add(envSky);
  scene.environment = pmrem.fromScene(env).texture;
  scene.fog = new THREE.Fog(0xc4d3e2, 220, 1700);

  // Night dome: fades in over the daytime sky; fog-coloured at the horizon, deep blue overhead.
  const R = 3600;
  const ng = new THREE.SphereGeometry(R, 32, 16);
  { const p = ng.attributes.position, col = new Float32Array(p.count * 3), a = C(0x060a13), b = C(0x0d1730), t = new THREE.Color();
    for (let i = 0; i < p.count; i++) { t.copy(a).lerp(b, smooth(p.getY(i) / R, 0.02, 0.7)); col[i * 3] = t.r; col[i * 3 + 1] = t.g; col[i * 3 + 2] = t.b; }
    ng.setAttribute('color', new THREE.BufferAttribute(col, 3)); }
  const nightDome = new THREE.Mesh(ng, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  nightDome.renderOrder = -4; nightDome.frustumCulled = false; scene.add(nightDome);

  // Stars
  const rng = mulberry32(5);
  const sp = new Float32Array(1400 * 3);
  for (let i = 0; i < 1400; i++) {
    const u = rng() * Math.PI * 2, y = 0.03 + rng() * 0.97, r = Math.sqrt(1 - y * y);
    sp[i * 3] = Math.cos(u) * r * (R - 150); sp[i * 3 + 1] = y * (R - 150); sp[i * 3 + 2] = Math.sin(u) * r * (R - 150);
  }
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sgeo, new THREE.PointsMaterial({ color: 0xdfe8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
  stars.renderOrder = -3; stars.frustumCulled = false; scene.add(stars);

  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTexture(), transparent: true, opacity: 0, depthWrite: false, fog: false }));
  moon.scale.setScalar(620); moon.renderOrder = -2; scene.add(moon);

  // Cloud layer: a shallow dome with planar UVs so clouds recede towards the horizon, faded out at the rim.
  const g = new THREE.SphereGeometry(R, 48, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.2, 1);
  const pos = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z) / R;
    uv.setXY(i, x / 2600, z / 2600);
    col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = 1;
    col[i * 4 + 3] = 1 - smooth(r, 0.4, 0.92);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const tex = cloudTexture();
  const clouds = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.BackSide }));
  clouds.renderOrder = -1; clouds.frustumCulled = false;
  scene.add(clouds);

  const q = new URLSearchParams(location.search);
  const state = {
    hour: q.has('time') ? +q.get('time') : START_HOUR,
    speed: q.has('timescale') ? +q.get('timescale') : 1,
    day: 1, night: 0,        // day: 1 = full daylight · night: 1 = properly dark (when things come out)
    sunDir, lightDir,
    onDusk: null, onDawn: null,
    setHour(h) { this.hour = ((h % 24) + 24) % 24; apply(0, null); },
    get clock() { const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; },
    update(dt, camera) { this.hour = (this.hour + dt * this.speed * 24 / DAY_SECONDS) % 24; apply(dt, camera); },
  };
  let wasNight = false;
  const tmp = new THREE.Color();

  function apply(dt, camera) {
    const h = state.hour;
    // sun: rises due east at 06:00, due south at noon, sets due west at 18:00
    const e = Math.sin((h - 6) / 12 * Math.PI), el = e * THREE.MathUtils.degToRad(62), az = (h - 6) / 12 * Math.PI + Math.PI / 2;
    sunDir.set(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    const me = -e, mel = me * THREE.MathUtils.degToRad(48);
    moonDir.set(-Math.sin(az) * Math.cos(mel), Math.sin(mel), Math.cos(az) * Math.cos(mel));

    const day = state.day = smooth(e, -0.06, 0.2);
    const night = state.night = smooth(-e, 0.04, 0.2);
    const dusk = Math.max(0, 1 - Math.abs(e - 0.03) / 0.22) * 0.8;   // warm band around sunrise / sunset
    sky.material.uniforms.sunPosition.value.copy(sunDir);

    // one directional light plays both sun and moon; it is dark at the hand-over so the swap is invisible
    const { sun, hemi } = lights;
    if (e > -0.02) {
      lightDir.copy(sunDir).setY(Math.max(sunDir.y, 0.06)).normalize();
      sun.color.copy(PAL.sunLow).lerp(PAL.sunNoon, smooth(e, 0.05, 0.55));
      sun.intensity = 3.6 * smooth(e, -0.02, 0.22);
    } else {
      lightDir.copy(moonDir).setY(Math.max(moonDir.y, 0.12)).normalize();
      sun.color.copy(PAL.moon);
      sun.intensity = 0.5 * smooth(me, 0.03, 0.25);
    }
    hemi.color.copy(PAL.hemiSkyNight).lerp(PAL.hemiSkyDay, day);
    hemi.groundColor.copy(PAL.hemiGndNight).lerp(PAL.hemiGndDay, day);
    hemi.intensity = lerp(0.2, 0.6, day);
    scene.environmentIntensity = lerp(0.035, 0.5, day);
    renderer.toneMappingExposure = lerp(1.0, 0.82, day);
    scene.fog.color.copy(PAL.fogNight).lerp(PAL.fogDay, day).lerp(PAL.fogDusk, dusk * 0.55);
    scene.fog.near = lerp(14, 220, day); scene.fog.far = lerp(210, 1700, day * day);

    nightDome.material.opacity = 1 - day;
    stars.material.opacity = night * 0.9;
    moon.material.opacity = smooth(me, -0.02, 0.12);
    tmp.copy(PAL.cloudNight).lerp(PAL.cloudDay, day).lerp(PAL.cloudDusk, dusk * 0.6);
    clouds.material.color.copy(tmp);
    clouds.material.opacity = lerp(0.5, 1, day);

    if (camera) {
      const c = camera.position;
      nightDome.position.copy(c); stars.position.copy(c);
      moon.position.copy(c).addScaledVector(moonDir, R - 300);
      clouds.position.set(c.x, c.y - 60, c.z);
      tex.offset.x += dt * 0.0016; tex.offset.y += dt * 0.0006;
    }
    const isNight = night > 0.5;
    if (isNight !== wasNight) { wasNight = isNight; (isNight ? state.onDusk : state.onDawn)?.(); }
  }
  apply(0, null);
  wasNight = state.night > 0.5;
  return state;
}
