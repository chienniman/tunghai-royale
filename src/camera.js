// Over-the-shoulder third-person camera with aim-down-sights zoom and a first-person scope view.
import * as THREE from 'three';

const BASE_FOV = 72;
const _right = new THREE.Vector3(), _target = new THREE.Vector3();

export class CameraRig {
  constructor(camera, terrain, colliders) {
    this.camera = camera; this.terrain = terrain; this.colliders = colliders;
    this.look = new THREE.Vector3(0, 0, -1);
    this.pos = new THREE.Vector3();
    this.dist = 3.4;
    this.fov = BASE_FOV;
    this.shake = 0;
    this.scoped = false;
    this.firstPerson = false;
    this.sprintFov = 0;
  }

  // view: { ads: 0..1, fov: zoomed FOV, scope: bool }
  update(dt, player, view) {
    const { camera, terrain, colliders, look } = this;
    const ads = view.ads;
    const pitch = THREE.MathUtils.clamp(player.pitch + player.kickP, -1.35, 1.2), yaw = player.yaw + player.kickY;
    const cp = Math.cos(pitch);
    look.set(-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp);
    this.scoped = !!view.scope && ads > 0.8;

    // field of view
    this.sprintFov += ((player.sprinting ? 5 : 0) - this.sprintFov) * (1 - Math.exp(-6 * dt));
    const e = ads * ads * (3 - 2 * ads);
    const fov = this.scoped ? view.fov : THREE.MathUtils.lerp(BASE_FOV + this.sprintFov, view.scope ? 46 : view.fov, e);
    if (Math.abs(fov - this.fov) > 0.01) { this.fov = fov; camera.fov = fov; camera.updateProjectionMatrix(); }
    // keep the same on-screen turn rate when zoomed
    player.sens = Math.tan(fov * Math.PI / 360) / Math.tan(BASE_FOV * Math.PI / 360);

    const fp = this.firstPerson || this.scoped;
    player.rig.root.visible = !fp;
    if (fp) {
      this.dist = 0;
      this.pos.set(player.pos.x, player.headY + 0.04, player.pos.z).addScaledVector(look, 0.15);
    } else {
      _right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      let shoulder = THREE.MathUtils.lerp(0.55, 0.62, e);
      const maxDist = THREE.MathUtils.lerp(3.4, 1.9, e);
      _target.set(player.pos.x, player.headY + THREE.MathUtils.lerp(0.1, 0.22, e), player.pos.z);
      // slide the shoulder pivot back toward the head if it would sit inside a wall
      while (shoulder > 0.05 && colliders.blocked(_target.x + _right.x * shoulder, _target.y, _target.z + _right.z * shoulder)) shoulder -= 0.1;
      _target.addScaledVector(_right, Math.max(0, shoulder));
      // pull the camera in if a wall or tree is between it and the player (over slopes it is lifted instead, below)
      let want = maxDist;
      for (let d = 0.4; d <= maxDist; d += 0.15) {
        const x = _target.x - look.x * d, y = _target.y - look.y * d, z = _target.z - look.z * d;
        if (colliders.blocked(x, y, z)) { want = Math.max(0.35, d - 0.3); break; }
      }
      if (this.dist < 0.3) this.dist = want;      // coming out of the scope
      this.dist += (want - this.dist) * (want < this.dist ? 1 : 1 - Math.exp(-7 * dt));
      this.pos.copy(_target).addScaledVector(look, -this.dist);
      this.pos.y = Math.max(this.pos.y, terrain.heightAt(this.pos.x, this.pos.z) + 0.25);
    }

    camera.position.copy(this.pos);
    camera.lookAt(this.pos.x + look.x, this.pos.y + look.y, this.pos.z + look.z);
    if (this.shake > 0.0005) {
      camera.rotateZ((Math.random() - 0.5) * this.shake);
      camera.rotateX((Math.random() - 0.5) * this.shake * 0.6);
      this.shake *= Math.exp(-18 * dt);
    }
  }
}
