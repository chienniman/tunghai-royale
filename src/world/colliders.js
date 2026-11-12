// 2D (x,z) collision: building footprints as polygons, tree trunks as circles.
// Stored in a uniform spatial hash so lookups only touch nearby shapes.
export class Colliders {
  constructor(cell = 20) {
    this.cell = cell;
    this.grid = new Map();
    this.shapes = [];
    this._seen = 0;
  }

  _cells(minX, minZ, maxX, maxZ, fn) {
    const c = this.cell;
    for (let i = Math.floor(minX / c); i <= Math.floor(maxX / c); i++)
      for (let j = Math.floor(minZ / c); j <= Math.floor(maxZ / c); j++) fn(i + ',' + j);
  }

  _insert(s) {
    s.id = this.shapes.length; s.mark = -1;
    this.shapes.push(s);
    this._cells(s.minX, s.minZ, s.maxX, s.maxZ, (k) => {
      let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(s);
    });
  }

  // pts: flat [x0,z0,x1,z1,...] without repeated closing point. top: roof height (m).
  addPolygon(pts, top, data) {
    let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < pts.length; i += 2) {
      minX = Math.min(minX, pts[i]); maxX = Math.max(maxX, pts[i]);
      minZ = Math.min(minZ, pts[i + 1]); maxZ = Math.max(maxZ, pts[i + 1]);
    }
    this._insert({ kind: 'poly', pts, top, minX, minZ, maxX, maxZ, data });
  }

  addCircle(x, z, r, top) {
    this._insert({ kind: 'circle', x, z, r, top, minX: x - r, minZ: z - r, maxX: x + r, maxZ: z + r });
  }

  query(minX, minZ, maxX, maxZ) {
    const out = []; const stamp = ++this._seen;
    this._cells(minX, minZ, maxX, maxZ, (k) => {
      const a = this.grid.get(k); if (!a) return;
      for (const s of a) if (s.mark !== stamp) { s.mark = stamp; out.push(s); }
    });
    return out;
  }

  static pointInPoly(pts, x, z) {
    let inside = false;
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      const xi = pts[i], zi = pts[i + 1], xj = pts[j], zj = pts[j + 1];
      if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) inside = !inside;
    }
    return inside;
  }

  static closestOnPoly(pts, x, z, out) {
    let best = Infinity;
    for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
      const ax = pts[j], az = pts[j + 1], bx = pts[i], bz = pts[i + 1];
      const dx = bx - ax, dz = bz - az;
      const len2 = dx * dx + dz * dz || 1e-9;
      let t = ((x - ax) * dx + (z - az) * dz) / len2; t = Math.max(0, Math.min(1, t));
      const cx = ax + dx * t, cz = az + dz * t;
      const d2 = (x - cx) ** 2 + (z - cz) ** 2;
      if (d2 < best) { best = d2; out.x = cx; out.z = cz; }
    }
    return Math.sqrt(best);
  }

  // Push a circle (pos.x,pos.z,radius) out of every shape whose top is above footY.
  resolve(pos, radius, footY = -Infinity) {
    const c = { x: 0, z: 0 };
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const s of this.query(pos.x - radius, pos.z - radius, pos.x + radius, pos.z + radius)) {
        if (s.top !== undefined && footY > s.top - 0.05) continue;
        if (s.kind === 'circle') {
          const dx = pos.x - s.x, dz = pos.z - s.z, d = Math.hypot(dx, dz), m = s.r + radius;
          if (d < m) {
            if (d < 1e-6) pos.x += m;
            else { const k = (m - d) / d; pos.x += dx * k; pos.z += dz * k; }
            moved = true;
          }
        } else {
          const inside = Colliders.pointInPoly(s.pts, pos.x, pos.z);
          const d = Colliders.closestOnPoly(s.pts, pos.x, pos.z, c);
          if (inside) {
            const nx = (c.x - pos.x) / (d || 1), nz = (c.z - pos.z) / (d || 1);
            pos.x = c.x + nx * radius; pos.z = c.z + nz * radius; moved = true;
          } else if (d < radius) {
            pos.x = c.x + (pos.x - c.x) / d * radius; pos.z = c.z + (pos.z - c.z) / d * radius; moved = true;
          }
        }
      }
      if (!moved) break;
    }
  }

  // Ray vs. every shape (shapes are vertical prisms from -inf up to `top`).
  // Direction need not be normalised; t is in units of it. Returns the nearest
  // { t, nx, ny, nz, shape } with 0 <= t <= maxT, or null.
  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    const h = Math.hypot(dx, dz);
    const stepT = h > 1e-6 ? this.cell / h : maxT;
    let best = null;
    for (let t0 = 0; t0 < maxT; t0 += stepT) {
      const t1 = Math.min(maxT, t0 + stepT);
      const ax = ox + dx * t0, az = oz + dz * t0, bx = ox + dx * t1, bz = oz + dz * t1;
      for (const s of this.query(Math.min(ax, bx), Math.min(az, bz), Math.max(ax, bx), Math.max(az, bz))) {
        const hit = Colliders.rayShape(s, ox, oy, oz, dx, dy, dz, best ? best.t : maxT);
        if (hit) { hit.shape = s; best = hit; }
      }
      if (best && best.t <= t1) break;
    }
    return best;
  }

  static rayShape(s, ox, oy, oz, dx, dy, dz, maxT) {
    const top = s.top ?? Infinity;
    let bt = maxT, nx = 0, ny = 0, nz = 0, found = false;
    const inside = s.kind === 'circle'
      ? (ox - s.x) ** 2 + (oz - s.z) ** 2 < s.r * s.r
      : Colliders.pointInPoly(s.pts, ox, oz);
    if (inside) {
      if (oy <= top) return { t: 0, nx: 0, ny: 1, nz: 0 };
      if (dy < 0) { // coming down onto the roof
        const t = (top - oy) / dy, x = ox + dx * t, z = oz + dz * t;
        const on = s.kind === 'circle' ? (x - s.x) ** 2 + (z - s.z) ** 2 < s.r * s.r : Colliders.pointInPoly(s.pts, x, z);
        if (on && t <= maxT) return { t, nx: 0, ny: 1, nz: 0 };
      }
      return null;
    }
    if (s.kind === 'circle') {
      const fx = ox - s.x, fz = oz - s.z;
      const a = dx * dx + dz * dz; if (a < 1e-12) return null;
      const b = fx * dx + fz * dz, c = fx * fx + fz * fz - s.r * s.r;
      const disc = b * b - a * c; if (disc < 0) return null;
      const t = (-b - Math.sqrt(disc)) / a;
      if (t >= 0 && t < bt && oy + dy * t <= top) {
        bt = t; found = true;
        nx = (fx + dx * t) / s.r; nz = (fz + dz * t) / s.r;
      }
    } else {
      const p = s.pts;
      for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
        const ex = p[i] - p[j], ez = p[i + 1] - p[j + 1];
        const den = dx * ez - dz * ex; if (Math.abs(den) < 1e-12) continue;
        const qx = p[j] - ox, qz = p[j + 1] - oz;
        const t = (qx * ez - qz * ex) / den, u = (qx * dz - qz * dx) / den;
        if (t < 0 || t >= bt || u < 0 || u > 1) continue;
        if (oy + dy * t > top) continue;
        bt = t; found = true;
        const l = Math.hypot(ex, ez) || 1;
        nx = ez / l; nz = -ex / l;
        if (nx * dx + nz * dz > 0) { nx = -nx; nz = -nz; }
      }
    }
    if (dy < 0 && oy > top) { // roof cap
      const t = (top - oy) / dy;
      if (t >= 0 && t < bt) {
        const x = ox + dx * t, z = oz + dz * t;
        const on = s.kind === 'circle' ? (x - s.x) ** 2 + (z - s.z) ** 2 < s.r * s.r : Colliders.pointInPoly(s.pts, x, z);
        if (on) return { t, nx: 0, ny: 1, nz: 0 };
      }
    }
    return found ? { t: bt, nx, ny, nz } : null;
  }

  // True if point (x,y,z) is inside a solid shape (used to keep the camera out of walls).
  blocked(x, y, z) {
    for (const s of this.query(x, z, x, z)) {
      if (s.top !== undefined && y > s.top) continue;
      if (s.kind === 'circle') { if ((x - s.x) ** 2 + (z - s.z) ** 2 < s.r * s.r) return true; }
      else if (Colliders.pointInPoly(s.pts, x, z)) return true;
    }
    return false;
  }
}
