import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { mulberry32 } from '../util.js';

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
    const cover = THREE.MathUtils.smoothstep(f, 0.5, 0.72);      // how much cloud
    const shade = THREE.MathUtils.smoothstep(f, 0.55, 0.9);      // thicker = slightly greyer underside
    const i = (y * size + x) * 4;
    d[i] = 255 - shade * 38; d[i + 1] = 255 - shade * 34; d[i + 2] = 255 - shade * 26; d[i + 3] = cover * 235;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// Sky dome, sun direction, image-based ambient light and a drifting cloud layer.
export function buildSky(scene, renderer) {
  // mid-afternoon: sun low enough for long warm shadows across 文理大道
  const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 34), THREE.MathUtils.degToRad(295)); // WSW
  const params = { turbidity: 3.2, rayleigh: 1.55, mieCoefficient: 0.0045, mieDirectionalG: 0.82 };
  const mk = (scale) => {
    const s = new Sky(); s.scale.setScalar(scale);
    for (const [k, v] of Object.entries(params)) s.material.uniforms[k].value = v;
    s.material.uniforms.sunPosition.value.copy(sunDir);
    return s;
  };
  scene.add(mk(20000));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene(); env.add(mk(1000));
  scene.environment = pmrem.fromScene(env).texture;
  scene.environmentIntensity = 0.5;
  scene.fog = new THREE.Fog(0xc4d3e2, 220, 1700);

  // Cloud layer: a shallow dome with planar UVs so clouds recede towards the horizon, faded out at the rim.
  const R = 5200;
  const g = new THREE.SphereGeometry(R, 48, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.16, 1);
  const pos = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(pos.count * 4);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = Math.hypot(x, z) / R;
    uv.setXY(i, x / 2600, z / 2600);
    col[i * 4] = col[i * 4 + 1] = col[i * 4 + 2] = 1;
    col[i * 4 + 3] = 1 - THREE.MathUtils.smoothstep(r, 0.45, 0.95);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const tex = cloudTexture();
  const clouds = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
    map: tex, vertexColors: true, transparent: true, depthWrite: false, fog: false, side: THREE.BackSide, toneMapped: true,
  }));
  clouds.renderOrder = -1; clouds.frustumCulled = false;
  scene.add(clouds);

  return {
    sunDir,
    // keep the dome centred on the viewer and let the clouds drift
    update(dt, camera) {
      clouds.position.set(camera.position.x, camera.position.y - 60, camera.position.z);
      tex.offset.x += dt * 0.0016; tex.offset.y += dt * 0.0006;
    },
  };
}
