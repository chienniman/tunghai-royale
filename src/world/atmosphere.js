// Night-time sky, moonlight and fog for the campus.
import * as THREE from 'three';

const skyVertex = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * p;
    gl_Position.z = gl_Position.w;          // always at the far plane
  }`;

const skyFragment = /* glsl */`
  uniform vec3 uMoonDir, uGlowDir, uZenith, uHorizon, uGlow;
  uniform float uTime, uStars;
  varying vec3 vDir;
  float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  void main() {
    vec3 d = normalize(vDir);
    float up = max(d.y, 0.0);
    vec3 col = mix(uHorizon, uZenith, pow(up, 0.45));
    // the city of Taichung glows beyond the hill
    float toward = max(dot(normalize(d.xz + 1e-5), normalize(uGlowDir.xz)), 0.0);
    col += uGlow * pow(toward, 2.5) * exp(-up * 7.0);
    col += uGlow * 0.25 * exp(-up * 12.0);
    // stars: one possible star per cell, drawn as a small round point
    vec3 sp = d * 150.0, id = floor(sp), fr = fract(sp) - 0.5;
    float s = hash(id);
    vec3 off = (vec3(hash(id + 7.1), hash(id + 13.7), hash(id + 29.3)) - 0.5) * 0.6;
    float point = smoothstep(0.16, 0.0, length(fr - off));
    float tw = 0.75 + 0.25 * sin(uTime * (1.0 + s * 3.0) + s * 40.0);
    col += vec3(0.85, 0.9, 1.0) * point * step(0.93, s) * (0.4 + 0.6 * hash(id + 3.3)) * tw * smoothstep(0.03, 0.3, d.y) * uStars;
    // moon with a soft halo
    float m = dot(d, normalize(uMoonDir));
    col += vec3(0.92, 0.95, 1.0) * smoothstep(0.99935, 0.99965, m);
    col += vec3(0.35, 0.42, 0.55) * (pow(max(m, 0.0), 350.0) * 0.6 + pow(max(m, 0.0), 24.0) * 0.07);
    gl_FragColor = vec4(col, 1.0);
  }`;

export function createNight(scene, renderer) {
  const moonDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - 38), THREE.MathUtils.degToRad(215));
  const horizon = new THREE.Color(0x121824), zenith = new THREE.Color(0x04060b);
  const uniforms = {
    uMoonDir: { value: moonDir }, uGlowDir: { value: new THREE.Vector3(0.9, 0, 0.42) },
    uZenith: { value: zenith }, uHorizon: { value: horizon }, uGlow: { value: new THREE.Color(0.30, 0.17, 0.07) },
    uTime: { value: 0 }, uStars: { value: 1 },
  };
  const makeDome = (r) => new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16),
    new THREE.ShaderMaterial({ uniforms, vertexShader: skyVertex, fragmentShader: skyFragment, side: THREE.BackSide, depthWrite: false, fog: false }));
  const dome = makeDome(3000); dome.frustumCulled = false; dome.renderOrder = -10;
  scene.add(dome);

  // dim reflections from the same sky
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene(); envScene.add(makeDome(100));
  scene.environment = pmrem.fromScene(envScene).texture;
  scene.environmentIntensity = 0.35;
  pmrem.dispose();

  scene.fog = new THREE.FogExp2(horizon.getHex(), 0.014);

  const hemi = new THREE.HemisphereLight(0x33425f, 0x0d1012, 1.5); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0x9fb6e6, 0.95);
  moon.castShadow = true;
  moon.shadow.mapSize.set(2048, 2048);
  const S = 60; Object.assign(moon.shadow.camera, { left: -S, right: S, top: S, bottom: -S, near: 1, far: 800 });
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.04;
  scene.add(moon, moon.target);

  return {
    moon, hemi, dome, uniforms, moonDir, fog: scene.fog,
    // keep the dome on the camera and the shadow box on the player
    update(dt, camera, focus) {
      uniforms.uTime.value += dt;
      dome.position.copy(camera.position);
      const texel = (2 * S) / moon.shadow.mapSize.x;      // snap to shadow texels to avoid shimmering
      const sx = Math.round(focus.x / texel) * texel, sz = Math.round(focus.z / texel) * texel;
      moon.target.position.set(sx, focus.y, sz);
      moon.position.set(sx, focus.y, sz).addScaledVector(moonDir, 400);
    },
  };
}
