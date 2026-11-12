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
