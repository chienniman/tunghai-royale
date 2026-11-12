import * as THREE from 'three';

// Height field built from the SRTM grid in data/elevation.json.
// World axes: x = east (m), z = south (m), y = elevation above sea level (m).
export class Terrain {
  constructor(elev, origin, step = 5) {
    const MX = 111320 * Math.cos(origin.lat * Math.PI / 180);
    const MZ = 110574;
    this.minX = (elev.lon0 - origin.lon) * MX;
    this.maxX = (elev.lon1 - origin.lon) * MX;
    this.minZ = -(elev.lat1 - origin.lat) * MZ; // north edge
    this.maxZ = -(elev.lat0 - origin.lat) * MZ; // south edge
    this.width = this.maxX - this.minX;
    this.depth = this.maxZ - this.minZ;
    this.src = elev;

    this.step = step;
    this.cols = Math.floor(this.width / step) + 1;
    this.rows = Math.floor(this.depth / step) + 1;
    this.h = new Float32Array(this.cols * this.rows);
    let lo = Infinity, hi = -Infinity;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const v = this.sampleSource(this.minX + c * step, this.minZ + r * step);
        this.h[r * this.cols + c] = v;
        if (v < lo) lo = v; if (v > hi) hi = v;
      }
    }
    this.minH = lo; this.maxH = hi;
  }

  // Catmull-Rom bicubic sample of the coarse SRTM grid (row 0 = south).
  sampleSource(x, z) {
    const { nx, ny, elev } = this.src;
    const gx = (x - this.minX) / this.width * (nx - 1);
    const gy = (this.maxZ - z) / this.depth * (ny - 1);
    const ix = Math.floor(gx), iy = Math.floor(gy);
    const tx = gx - ix, ty = gy - iy;
    const at = (i, j) => {
      i = Math.min(nx - 1, Math.max(0, i)); j = Math.min(ny - 1, Math.max(0, j));
      return elev[j * nx + i];
    };
    const cubic = (p0, p1, p2, p3, t) =>
      p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
    const rowv = [];
    for (let j = -1; j <= 2; j++) rowv.push(cubic(at(ix - 1, iy + j), at(ix, iy + j), at(ix + 1, iy + j), at(ix + 2, iy + j), tx));
    return cubic(rowv[0], rowv[1], rowv[2], rowv[3], ty);
  }

  // Height that matches the rendered mesh (same triangulation).
  heightAt(x, z) {
    const fx = (x - this.minX) / this.step, fz = (z - this.minZ) / this.step;
    const c = Math.min(this.cols - 2, Math.max(0, Math.floor(fx)));
    const r = Math.min(this.rows - 2, Math.max(0, Math.floor(fz)));
    const tx = Math.min(1, Math.max(0, fx - c)), tz = Math.min(1, Math.max(0, fz - r));
    const i = r * this.cols + c;
    const a = this.h[i], b = this.h[i + this.cols], cc = this.h[i + this.cols + 1], d = this.h[i + 1];
    // quad split a-b-d / b-c-d (a=top-left, b=bottom-left, c=bottom-right, d=top-right)
    if (tx + tz <= 1) return a + (d - a) * tx + (b - a) * tz;
    return cc + (b - cc) * (1 - tx) + (d - cc) * (1 - tz);
  }

  // First t in [0,maxT] where the ray (unit direction) dips below the ground, or -1.
  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    if (oy < this.heightAt(ox, oz)) return 0;
    let t = 0, prev = 0;
    while (t < maxT) {
      // step proportional to clearance, so long shots stay cheap but nothing thin is skipped
      const clear = oy + dy * t - this.heightAt(ox + dx * t, oz + dz * t);
      prev = t;
      t = Math.min(maxT, t + Math.min(6, Math.max(0.5, clear * 0.5)));
      if (oy + dy * t < this.heightAt(ox + dx * t, oz + dz * t)) {
        let lo = prev, hi = t;
        for (let i = 0; i < 8; i++) {
          const m = (lo + hi) / 2;
          if (oy + dy * m < this.heightAt(ox + dx * m, oz + dz * m)) hi = m; else lo = m;
        }
        return hi;
      }
    }
    return -1;
  }

  inBounds(x, z, margin = 0) {
    return x > this.minX + margin && x < this.maxX - margin && z > this.minZ + margin && z < this.maxZ - margin;
  }

  buildMesh(material) {
    const { cols, rows, step } = this;
    const pos = new Float32Array(cols * rows * 3);
    const uv = new Float32Array(cols * rows * 2);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const x = this.minX + c * step, z = this.minZ + r * step;
        pos[i * 3] = x; pos[i * 3 + 1] = this.h[i]; pos[i * 3 + 2] = z;
        uv[i * 2] = (x - this.minX) / this.width;
        uv[i * 2 + 1] = 1 - (z - this.minZ) / this.depth;
      }
    }
    const idx = new Uint32Array((cols - 1) * (rows - 1) * 6);
    let k = 0;
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = r * cols + c, b = a + cols, cc = b + 1, d = a + 1;
        idx[k++] = a; idx[k++] = b; idx[k++] = d;
        idx[k++] = b; idx[k++] = cc; idx[k++] = d;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.computeVertexNormals();
    const mesh = new THREE.Mesh(g, material);
    mesh.receiveShadow = true;
    return mesh;
  }
}
