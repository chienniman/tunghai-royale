// Hand torch: one shadow-casting spotlight with a cookie, a little sway, a battery and a flicker hook.
import * as THREE from 'three';

function cookieTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'), h = S / 2;
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const rad = g.createRadialGradient(h, h, 0, h, h, h);
  rad.addColorStop(0, '#ffffff'); rad.addColorStop(0.28, '#e8e8e8'); rad.addColorStop(0.55, '#9a9a9a');
  rad.addColorStop(0.8, '#5c5c5c'); rad.addColorStop(0.93, '#3a3a3a'); rad.addColorStop(1, '#000000');
  g.fillStyle = rad; g.fillRect(0, 0, S, S);
  // faint rings from the reflector, plus a slightly off-centre hot spot
  g.globalCompositeOperation = 'lighter';
  for (const [r, a] of [[0.36, 0.10], [0.62, 0.07], [0.86, 0.09]]) {
    g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = 5; g.beginPath(); g.arc(h, h, h * r, 0, Math.PI * 2); g.stroke();
  }
  const hot = g.createRadialGradient(h * 1.04, h * 0.97, 0, h * 1.04, h * 0.97, h * 0.2);
  hot.addColorStop(0, 'rgba(255,255,255,.5)'); hot.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hot; g.fillRect(0, 0, S, S);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const _pos = new THREE.Vector3(), _right = new THREE.Vector3(), _aim = new THREE.Vector3();

export class Flashlight {
  constructor(scene) {
    this.on = true;
    this.battery = 1;                 // 0..1
    this.drain = 1 / 420;             // per second while on (seven minutes on a full battery)
    this.flicker = 0;                 // 0..1, raised by ghosts nearby
    this.power = 150;
    this.dir = new THREE.Vector3(0, 0, -1);
    this.light = new THREE.SpotLight(0xfff0d2, this.power, 55, 0.40, 0.6, 1.35);
    this.light.castShadow = true;
    this.light.shadow.mapSize.set(1024, 1024);
    this.light.shadow.camera.near = 0.4; this.light.shadow.camera.far = 55;
    this.light.shadow.bias = -0.0006; this.light.shadow.normalBias = 0.03;
    this.light.map = cookieTexture();
    scene.add(this.light, this.light.target);
    // a little spill so the holder is not a black silhouette
    this.spill = new THREE.PointLight(0xffe8c0, 0.5, 4.5, 2);
    scene.add(this.spill);
    this.t = 0;
  }

  toggle() { if (this.battery > 0 || this.on) this.on = !this.on; return this.on; }

  // look: unit view direction; origin: where the torch is held (world space)
  update(dt, origin, look, yaw) {
    this.t += dt;
    if (this.on) {
      this.battery = Math.max(0, this.battery - this.drain * dt);
      if (this.battery <= 0) this.on = false;
    }
    // the beam lags slightly behind the view, which gives it weight
    this.dir.lerp(look, 1 - Math.exp(-14 * dt)).normalize();
    _right.set(Math.cos(yaw), 0, -Math.sin(yaw));
    _pos.copy(origin).addScaledVector(_right, 0.22).addScaledVector(this.dir, 0.25);
    this.light.position.copy(_pos);
    this.light.target.position.copy(_pos).addScaledVector(this.dir, 10);
    this.spill.position.copy(origin);

    let k = this.on ? 1 : 0;
    if (k) {
      // weak battery dims the beam; ghosts make it stutter
      k *= 0.35 + 0.65 * Math.min(1, this.battery * 5);
      const f = Math.max(this.flicker, this.battery < 0.08 ? 0.5 : 0);
      if (f > 0) {
        const n = Math.sin(this.t * 37.0) * Math.sin(this.t * 13.7 + 1.3) * Math.sin(this.t * 71.3);
        if (n > 1 - f * 1.4) k *= 0.08;
        k *= 1 - 0.25 * f * (0.5 + 0.5 * Math.sin(this.t * 51.0));
      }
    }
    this.light.intensity = this.power * k;
    this.spill.intensity = 0.5 * k;
    return _aim.copy(this.dir);
  }
}
