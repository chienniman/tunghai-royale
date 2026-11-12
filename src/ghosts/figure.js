// Procedural apparition: a long-haired figure in a dress that floats, sways, and dissolves into grain.
import * as THREE from 'three';

// One clock shared by every ghost material.
export const ghostClock = { value: 0 };

// A lit material with ghost extras injected: cloth sway, a hem that fades to nothing, grainy dissolve, rim glow.
export function ghostMaterial({ color = 0xe6e9ee, emissive = 0x0, roughness = 0.9, rim = 0x7f9cc4, rimPower = 2.2,
  hem = [-10, -9], sway = 0, edge = 0xbfd8ff, seed = 0 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, emissive, roughness, metalness: 0, side: THREE.DoubleSide });
  const u = mat.userData.u = {
    uTime: ghostClock, uDissolve: { value: 0 }, uOpacity: { value: 1 }, uHem: { value: new THREE.Vector2(hem[0], hem[1]) },
    uSway: { value: sway }, uSeed: { value: seed }, uRim: { value: new THREE.Color(rim) }, uRimPower: { value: rimPower },
    uEdge: { value: new THREE.Color(edge) }, uGlitch: { value: 0 },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = `uniform float uTime, uSway, uSeed, uGlitch;\nvarying float vGhostY; varying vec3 vGhostWorld;\n` + shader.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vGhostY = position.y;
        float gsw = uSway * smoothstep(1.35, 0.0, position.y);
        transformed.x += sin(uTime * 1.7 + position.y * 4.0 + uSeed) * 0.06 * gsw;
        transformed.z += cos(uTime * 1.3 + position.y * 3.1 + uSeed * 1.7) * 0.05 * gsw;
        // glitch: horizontal bands of the body jump sideways
        float band = floor(position.y * 9.0 + uTime * 23.0);
        transformed.x += (fract(sin(band * 12.9898 + uSeed) * 43758.5453) - 0.5) * 0.5 * uGlitch;
        vGhostWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = `uniform float uTime, uDissolve, uOpacity, uRimPower; uniform vec2 uHem; uniform vec3 uRim, uEdge;
      varying float vGhostY; varying vec3 vGhostWorld;
      float gHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      float gNoise(vec3 x) {
        vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(gHash(i), gHash(i + vec3(1, 0, 0)), f.x), mix(gHash(i + vec3(0, 1, 0)), gHash(i + vec3(1, 1, 0)), f.x), f.y),
                   mix(mix(gHash(i + vec3(0, 0, 1)), gHash(i + vec3(1, 0, 1)), f.x), mix(gHash(i + vec3(0, 1, 1)), gHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
      }
      float gIgn(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
      ` + shader.fragmentShader
      .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
        float gN = gNoise(vGhostWorld * 5.0 + vec3(0.0, -uTime * 0.35, 0.0)) * 0.7 + gNoise(vGhostWorld * 17.0) * 0.3;
        float gAlpha = uOpacity * smoothstep(uHem.x, uHem.y, vGhostY) * smoothstep(uDissolve - 0.001, uDissolve + 0.06, gN * 0.98 + 0.01);
        if (gAlpha < gIgn(gl_FragCoord.xy + fract(uTime) * 61.0) * 0.999 + 0.001) discard;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float gFres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), uRimPower);
        totalEmissiveRadiance += uRim * gFres;
        totalEmissiveRadiance += uEdge * smoothstep(0.14, 0.0, gN - uDissolve) * step(0.002, uDissolve) * 1.5;`);
  };
  return mat;
}

// Jitter a geometry's vertices so shapes look hand-made rather than lathe-perfect.
function roughen(geo, amount, seed = 1) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = Math.sin(x * 31.7 + y * 17.3 + z * 23.1 + seed) * 43758.5453; const r = (n - Math.floor(n)) - 0.5;
    const l = Math.hypot(x, z) || 1;
    p.setXYZ(i, x + (x / l) * r * amount, y, z + (z / l) * r * amount);
  }
  geo.computeVertexNormals();
  return geo;
}

// opts: { dress, hair, skin, height, glow, hairLength, seed }
export function createGhostFigure(opts = {}) {
  const { dress = 0xe9ebee, hair = 0x08080a, skin = 0xcfd6dc, height = 1.66, glow = 0.16, hairLength = 0.9, seed = 1 } = opts;
  const group = new THREE.Group();
  const body = new THREE.Group(); group.add(body);          // bobs and leans
  const mats = [];
  const M = (o) => { const m = ghostMaterial({ seed, ...o }); mats.push(m); return m; };
  const dressCol = new THREE.Color(dress);
  const glowCol = dressCol.clone().multiplyScalar(glow);

  // dress: narrow shoulders, long skirt whose hem fades away so she never touches the ground
  const profile = [[0.001, 1.43], [0.07, 1.42], [0.165, 1.37], [0.185, 1.26], [0.165, 1.08], [0.15, 0.98], [0.19, 0.78], [0.25, 0.5], [0.31, 0.24], [0.36, 0.0]]
    .map(([r, y]) => new THREE.Vector2(r, y));
  const dressGeo = roughen(new THREE.LatheGeometry(profile, 18), 0.012, seed);
  dressGeo.scale(1, 1, 0.72);
  const dressMesh = new THREE.Mesh(dressGeo, M({ color: dress, emissive: glowCol, hem: [0.02, 0.6], sway: 1 }));
  body.add(dressMesh);

  // head and neck
  const head = new THREE.Group(); head.position.y = 1.44; body.add(head);
  const skinMat = M({ color: skin, emissive: new THREE.Color(skin).multiplyScalar(glow * 0.8), rimPower: 3 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.05, 0.1, 8).translate(0, 0.04, 0), skinMat); head.add(neck);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10).scale(0.92, 1.12, 1).translate(0, 0.17, 0), skinMat); head.add(skull);
  // eye sockets and a mouth, only seen when the hair parts or she is very close
  const dark = M({ color: 0x050505, rim: 0x000000 });
  for (const sx of [-1, 1]) head.add(new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 6).translate(sx * 0.04, 0.185, -0.088), dark));
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6).scale(0.8, 1.5, 0.6).translate(0, 0.105, -0.09), dark); head.add(mouth);

  // hair: a ragged curtain over the face and down the back
  const hairMat = M({ color: hair, emissive: 0x000000, rim: 0x30384a, rimPower: 3.2, hem: [1.62 - hairLength - 0.75, 1.62 - hairLength - 0.4], sway: 0.6 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.122, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(0.95, 1.1, 1.02), hairMat);
  cap.position.y = 0.175; head.add(cap);
  const curtain = roughen(new THREE.CylinderGeometry(0.118, 0.19, hairLength, 16, 7, true).translate(0, -hairLength / 2 + 0.06, 0), 0.03, seed + 3);
  // hair hangs in figure space: bake the head offset in so the hem fade uses real heights
  const hairMesh = new THREE.Mesh(curtain, hairMat); hairMesh.position.y = 0.2; head.add(hairMesh);
  hairMat.userData.u.uHem.value.set(-hairLength + 0.05, -hairLength * 0.45);   // local to the curtain

  // arms: thin, with wide sleeves; pivot at the shoulder so she can reach
  const arms = [];
  for (const sx of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * 0.165, 1.36, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.085, 0.56, 8, 1, true).translate(0, -0.28, 0),
      M({ color: dress, emissive: glowCol, hem: [-0.62, -0.5] }));
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6).scale(0.8, 1.6, 0.6).translate(0, -0.61, 0), skinMat);
    pivot.add(sleeve, hand); pivot.rotation.z = sx * 0.07;
    body.add(pivot); arms.push(pivot);
  }

  group.scale.setScalar(height / 1.66);
  group.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });

  const st = { t: seed * 3.1, reach: 0, reachTo: 0, tilt: 0, dissolve: 0, glitch: 0 };
  return {
    group, body, head, arms, mats,
    // 0 = solid, 1 = gone
    setDissolve(v) { st.dissolve = v; for (const m of mats) m.userData.u.uDissolve.value = v; group.visible = v < 0.995; },
    setGlitch(v) { st.glitch = v; for (const m of mats) m.userData.u.uGlitch.value = v; },
    setOpacity(v) { for (const m of mats) m.userData.u.uOpacity.value = v; },
    reach(v) { st.reachTo = v; },                       // 0 arms down, 1 arms stretched toward the victim
    update(dt, speed = 0) {
      st.t += dt;
      st.reach += (st.reachTo - st.reach) * (1 - Math.exp(-6 * dt));
      body.position.y = 0.1 + Math.sin(st.t * 1.1) * 0.035;                 // hover
      body.rotation.x = -Math.min(0.35, speed * 0.05) - st.reach * 0.12;    // lean into movement
      body.rotation.z = Math.sin(st.t * 0.7) * 0.02;
      // head hangs, with an occasional twitch
      const tw = Math.sin(st.t * 0.9) > 0.985 ? Math.sin(st.t * 60) * 0.25 : 0;
      head.rotation.set(-0.22 + st.reach * 0.5, tw, 0.12 + Math.sin(st.t * 0.5) * 0.05 + tw * 0.5);
      arms[0].rotation.x = arms[1].rotation.x = st.reach * 1.45 + Math.sin(st.t * 1.3) * 0.04;
      arms[0].rotation.z = -0.07 - st.reach * 0.1; arms[1].rotation.z = 0.07 + st.reach * 0.1;
    },
  };
}
