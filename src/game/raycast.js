// Bullet ray vs. the static world (terrain height field + extruded collider shapes).
import { Colliders } from '../world/colliders.js';

const _n = { x: 0, z: 0 };

// o, d: THREE.Vector3 (d normalised). Returns out = { t, kind, x, y, z, nx, ny, nz, decal }.
// kind: null (nothing within maxT) | 'ground' | 'wall' | 'roof' | 'tree'
export function castWorld(terrain, colliders, o, d, maxT, out = {}) {
  out.kind = null; out.t = maxT; out.decal = false;
  let prev = 0, t = 0;
  // A ray that starts inside something solid hits it immediately.
  let shape = colliders.hit(o.x, o.y, o.z);
  if (shape) return finish(out, colliders, shape, o, d, 0, 0, terrain);

  while (t < maxT) {
    t = Math.min(maxT, t + (t < 150 ? 0.5 : 1));
    const x = o.x + d.x * t, y = o.y + d.y * t, z = o.z + d.z * t;
    if (!terrain.inBounds(x, z, 0)) { out.t = t; return out; }
    if (y < terrain.heightAt(x, z)) {
      let a = prev, b = t;
      for (let i = 0; i < 8; i++) {
        const m = (a + b) / 2;
        if (o.y + d.y * m < terrain.heightAt(o.x + d.x * m, o.z + d.z * m)) b = m; else a = m;
      }
      out.kind = 'ground'; out.t = a; out.decal = true;
      out.x = o.x + d.x * a; out.y = o.y + d.y * a; out.z = o.z + d.z * a;
      const e = 0.5, hx = terrain.heightAt(out.x - e, out.z) - terrain.heightAt(out.x + e, out.z);
      const hz = terrain.heightAt(out.x, out.z - e) - terrain.heightAt(out.x, out.z + e);
      const l = Math.hypot(hx, 2 * e, hz);
      out.nx = hx / l; out.ny = 2 * e / l; out.nz = hz / l;
      return out;
    }
    shape = colliders.hit(x, y, z);
    if (shape) {
      let a = prev, b = t;
      for (let i = 0; i < 9; i++) {
        const m = (a + b) / 2;
        if (colliders.hit(o.x + d.x * m, o.y + d.y * m, o.z + d.z * m)) b = m; else a = m;
      }
      return finish(out, colliders, shape, o, d, a, b, terrain);
    }
    prev = t;
  }
  return out;
}

function finish(out, colliders, shape, o, d, a, b, terrain) {
  out.t = a;
  out.x = o.x + d.x * a; out.y = o.y + d.y * a; out.z = o.z + d.z * a;
  const inX = o.x + d.x * b, inZ = o.z + d.z * b;
  out.kind = shape.kind === 'circle' ? 'tree' : 'wall';
  // Came down through the top face?
  const insideFootprint = shape.kind === 'circle'
    ? (out.x - shape.x) ** 2 + (out.z - shape.z) ** 2 < shape.r * shape.r
    : Colliders.pointInPoly(shape.pts, out.x, out.z);
  if (insideFootprint && d.y < 0 && out.y >= shape.top - 0.3) {
    out.kind = shape.kind === 'circle' ? 'tree' : 'roof';
    out.nx = 0; out.ny = 1; out.nz = 0;
    return out;
  }
  Colliders.surfaceNormal(shape, inX, inZ, out.x - d.x, out.z - d.z, _n);
  out.nx = _n.x; out.ny = 0; out.nz = _n.z;
  // Bullet holes only on real wall faces (roof shapes differ from the collision prism).
  out.decal = out.kind === 'wall' && !(shape.data && shape.data.noDecal) && out.y < shape.top - 1.6 && out.y > terrain.heightAt(out.x, out.z) + 0.05;
  return out;
}
