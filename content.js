(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     GLSL Shaders
  ═══════════════════════════════════════════════════════════════ */
  const VERT_SRC = `
    attribute vec3 aPos;
    attribute vec3 aNorm;
    uniform mat4 uMVP;
    uniform mat4 uModel;
    varying vec3 vNorm;
    void main() {
      vNorm = normalize(vec3(uModel * vec4(aNorm, 0.0)));
      gl_Position = uMVP * vec4(aPos, 1.0);
    }
  `;

  const FRAG_SRC = `
    precision mediump float;
    varying vec3 vNorm;
    void main() {
      vec3 n   = normalize(vNorm);
      float d1 = max(dot(n, normalize(vec3( 1.0,  2.0,  1.5))), 0.0);
      float d2 = max(dot(n, normalize(vec3(-0.5, -0.5, -1.0))), 0.0) * 0.30;
      float lit = 0.22 + d1 * 0.68 + d2;
      gl_FragColor = vec4(vec3(0.28, 0.57, 0.94) * lit, 1.0);
    }
  `;

  // Flat-color shader used for the grid lines (no normals needed)
  const GRID_VERT_SRC = `
    attribute vec3 aPos;
    uniform mat4 uMVP;
    void main() { gl_Position = uMVP * vec4(aPos, 1.0); }
  `;
  const GRID_FRAG_SRC = `
    precision mediump float;
    uniform vec3 uColor;
    void main() { gl_FragColor = vec4(uColor, 1.0); }
  `;

  /* ═══════════════════════════════════════════════════════════════
     Matrix Math  —  column-major to match WebGL convention
     Storage order: col0 (indices 0-3), col1 (4-7), col2 (8-11), col3 (12-15)
  ═══════════════════════════════════════════════════════════════ */
  const m4 = {
    mul(a, b) {
      const o = new Float32Array(16);
      for (let col = 0; col < 4; col++)
        for (let row = 0; row < 4; row++)
          for (let k = 0; k < 4; k++)
            o[col * 4 + row] += a[k * 4 + row] * b[col * 4 + k];
      return o;
    },
    perspective(fov, ar, n, f) {
      const t = Math.tan(fov / 2);
      return new Float32Array([
        1 / (ar * t), 0, 0,  0,
        0, 1 / t,     0,  0,
        0, 0, (f + n) / (n - f), -1,
        0, 0, (2 * f * n) / (n - f), 0,
      ]);
    },
    translate: (x, y, z) =>
      new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]),
    rotX(a) {
      const c = Math.cos(a), s = Math.sin(a);
      return new Float32Array([1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1]);
    },
    rotY(a) {
      const c = Math.cos(a), s = Math.sin(a);
      return new Float32Array([c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]);
    },
    rotZ(a) {
      const c = Math.cos(a), s = Math.sin(a);
      return new Float32Array([c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]);
    },
  };

  /* ═══════════════════════════════════════════════════════════════
     STL Parser  —  handles both binary and ASCII formats
  ═══════════════════════════════════════════════════════════════ */
  function computeFaceNormals(verts, nTri) {
    const norms = new Float32Array(verts.length);
    for (let i = 0; i < nTri; i++) {
      const b = i * 9;
      const ax = verts[b+3]-verts[b],   ay = verts[b+4]-verts[b+1], az = verts[b+5]-verts[b+2];
      const bx = verts[b+6]-verts[b],   by = verts[b+7]-verts[b+1], bz = verts[b+8]-verts[b+2];
      const nx = ay*bz - az*by,         ny = az*bx - ax*bz,         nz = ax*by - ay*bx;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      for (let v = 0; v < 3; v++) {
        norms[b + v*3]     = nx / len;
        norms[b + v*3 + 1] = ny / len;
        norms[b + v*3 + 2] = nz / len;
      }
    }
    return norms;
  }

  function parseBinary(buffer, nTri) {
    const view  = new DataView(buffer);
    const verts = new Float32Array(nTri * 9);
    const norms = new Float32Array(nTri * 9);
    let o = 84, vi = 0, ni = 0;
    let hasNormals = false;

    for (let i = 0; i < nTri; i++) {
      const nx = view.getFloat32(o,     true);
      const ny = view.getFloat32(o + 4, true);
      const nz = view.getFloat32(o + 8, true);
      o += 12;
      if (nx !== 0 || ny !== 0 || nz !== 0) hasNormals = true;
      for (let j = 0; j < 3; j++) {
        verts[vi++] = view.getFloat32(o,     true);
        verts[vi++] = view.getFloat32(o + 4, true);
        verts[vi++] = view.getFloat32(o + 8, true);
        norms[ni++] = nx; norms[ni++] = ny; norms[ni++] = nz;
        o += 12;
      }
      o += 2; // attribute byte count
    }

    return {
      verts,
      norms: hasNormals ? norms : computeFaceNormals(verts, nTri),
      count: nTri,
    };
  }

  function parseASCII(text) {
    const verts = [], norms = [];
    const fRe = /facet\s+normal\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)/gi;
    const vRe = /vertex\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)\s+([\d.eE+\-]+)/gi;
    let fm;
    while ((fm = fRe.exec(text)) !== null) {
      const [, nx, ny, nz] = fm;
      for (let j = 0; j < 3; j++) {
        const vm = vRe.exec(text);
        if (!vm) break;
        verts.push(+vm[1], +vm[2], +vm[3]);
        norms.push(+nx, +ny, +nz);
      }
    }
    const count    = Math.floor(verts.length / 9);
    const vertsF32 = new Float32Array(verts);
    const normsF32 = new Float32Array(norms);
    const hasNorms = normsF32.some(v => v !== 0);
    return { verts: vertsF32, norms: hasNorms ? normsF32 : computeFaceNormals(vertsF32, count), count };
  }

  function parseSTL(buffer) {
    const view = new DataView(buffer);
    const nTri = view.getUint32(80, true);
    const binaryExpectedSize = 84 + nTri * 50;

    // Binary: exact byte-size match is a strong signal
    if (buffer.byteLength === binaryExpectedSize && nTri > 0 && nTri < 5_000_000) {
      return parseBinary(buffer, nTri);
    }

    // ASCII: look for STL keywords in the decoded text
    const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
    if (/facet\s+normal/i.test(text) && /vertex/i.test(text)) {
      return parseASCII(text);
    }

    // Binary fallback: accept if size is at least large enough
    if (nTri > 0 && nTri < 5_000_000 && buffer.byteLength >= binaryExpectedSize) {
      return parseBinary(buffer, nTri);
    }

    throw new Error('Could not parse file as STL. Is this the correct file type?');
  }

  /* ═══════════════════════════════════════════════════════════════
     Bounding Box
  ═══════════════════════════════════════════════════════════════ */
  // Determine which raw mesh axis should become "up" (Y) in the viewer.
  // Tinkercad's own editor treats Z as vertical height, and exports STL in
  // that same convention (matching standard 3D-printing/slicer convention,
  // where Z is always the vertical "layer" axis) — so Z is the default "up"
  // axis regardless of the model's proportions, tall or not.
  //
  // The one exception is a flat plaque (a keychain) whose physical thickness
  // was authored along a *different* axis — detectable because that axis is
  // clearly, dramatically thinner than the other two (here, less than half
  // the next-smallest), not just marginally the smallest of the three. That
  // thin axis becomes "up" instead, since it's the actual print-bed normal.
  // Returns 0 (X), 1 (Y), or 2 (Z).
  function determineUpAxis(dx, dy, dz) {
    const dims = [dx, dy, dz];
    const order = [0, 1, 2].sort((a, b) => dims[a] - dims[b]);
    const [thinIdx, midIdx] = order;
    if (dims[thinIdx] <= dims[midIdx] * 0.5) return thinIdx; // clearly a flat plaque
    return 2; // no clear plaque axis — assume Tinkercad's Z-up export convention
  }

  // Volume in mm³ via the divergence theorem: the sum of signed tetrahedron
  // volumes (origin, v0, v1, v2) over every triangle. The sign depends on
  // winding, so take the absolute value. Only meaningful for a watertight
  // mesh. Measured from the first vertex rather than (0,0,0) so models that
  // sit far from the origin don't lose precision to cancellation.
  function meshVolume(verts) {
    const ox = verts[0], oy = verts[1], oz = verts[2];
    let sum = 0;
    for (let i = 0; i < verts.length; i += 9) {
      const ax = verts[i]   - ox, ay = verts[i+1] - oy, az = verts[i+2] - oz;
      const bx = verts[i+3] - ox, by = verts[i+4] - oy, bz = verts[i+5] - oz;
      const cx = verts[i+6] - ox, cy = verts[i+7] - oy, cz = verts[i+8] - oz;
      sum += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
    }
    return Math.abs(sum) / 6;
  }

  // Surface area in mm²: half the cross-product magnitude of each triangle.
  function meshSurfaceArea(verts) {
    let sum = 0;
    for (let i = 0; i < verts.length; i += 9) {
      const ux = verts[i+3] - verts[i],   uy = verts[i+4] - verts[i+1], uz = verts[i+5] - verts[i+2];
      const vx = verts[i+6] - verts[i],   vy = verts[i+7] - verts[i+1], vz = verts[i+8] - verts[i+2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      sum += Math.sqrt(nx * nx + ny * ny + nz * nz);
    }
    return sum / 2;
  }

  // Filament densities in g/cm³ — typical values, they vary a little by brand.
  // Adding a material is one line here; the dropdown is built from this table.
  const MATERIALS = { PLA: 1.24, PETG: 1.27 };

  // Roughly 3 walls plus top/bottom layers, in mm. Slicers print this shell
  // solid regardless of the infill setting, so thin parts (a keychain) weigh
  // close to their full volume even at 10% infill.
  const SHELL_MM = 1.2;

  // Filament weight in grams: a solid shell around the surface (capped at the
  // whole volume for very thin parts) plus the infill fraction of the interior.
  function estimateGrams(volMm3, areaMm2, infill, density) {
    const shell = Math.min(volMm3, areaMm2 * SHELL_MM);
    return (shell + (volMm3 - shell) * infill) / 1000 * density;
  }

  // Material and infill choices carry over between models viewed in the same
  // page session.
  let lastMaterial = 'PLA';
  let lastInfill   = 20;

  function boundingBox(verts) {
    let x0=Infinity, y0=Infinity, z0=Infinity;
    let x1=-Infinity, y1=-Infinity, z1=-Infinity;
    for (let i = 0; i < verts.length; i += 3) {
      if (verts[i]   < x0) x0 = verts[i];   if (verts[i]   > x1) x1 = verts[i];
      if (verts[i+1] < y0) y0 = verts[i+1]; if (verts[i+1] > y1) y1 = verts[i+1];
      if (verts[i+2] < z0) z0 = verts[i+2]; if (verts[i+2] > z1) z1 = verts[i+2];
    }
    return {
      cx: (x0+x1)/2, cy: (y0+y1)/2, cz: (z0+z1)/2,
      size: Math.max(x1-x0, y1-y0, z1-z0) || 1,
      dx: x1-x0, dy: y1-y0, dz: z1-z0,
      minY: y0,
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     WebGL 3-D Viewer
  ═══════════════════════════════════════════════════════════════ */
  /* Build a flat grid of GL_LINES on the XZ plane at the given Y level.
     floorY is in centered-model space (i.e. minY - cy).
     Any part of the model that doesn't touch this plane is floating. */
  function buildGridLines(floorY, size, divisions) {
    const half = size * 0.75;
    const step = (half * 2) / divisions;
    const pts  = [];
    for (let i = 0; i <= divisions; i++) {
      const p = -half + i * step;
      pts.push(-half, floorY, p,   half, floorY, p);  // line along X
      pts.push(p, floorY, -half,   p, floorY,  half);  // line along Z
    }
    return new Float32Array(pts);
  }

  // Above this the check is skipped. Measured at about 0.25 ms per 1,000
  // triangles (864,500 triangles took ~200 ms), so this caps it near a quarter
  // of a second, and bounds the memory the vertex map can use.
  const MAX_FLOAT_CHECK_TRIS = 1000000;

  // The overlap test compares pieces pairwise, so it's skipped (falling back to
  // "any piece off the bed is floating") for a mesh shattered into thousands of
  // shells, to keep the worst case bounded.
  const MAX_PIECES_FOR_OVERLAP_TEST = 5000;

  /* Detects parts of the model that hang in the air. Uses union-find on triangles
     connected by shared vertex positions to split the mesh into separate pieces,
     then reports any piece that neither reaches the print floor nor overlaps a
     piece that does (see the support logic below). The overlap test is by
     bounding box, so a part floating inside a hollow body, or in the empty corner
     of an L-shaped one, isn't caught.
     Returns true/false, or null when the model is too large to check. */
  function detectFloating(verts) {
    const nTri = Math.floor(verts.length / 9);
    if (nTri > MAX_FLOAT_CHECK_TRIS) return null;

    // Find per-axis ranges to determine which axis is the floor
    let mnX=Infinity, mnY=Infinity, mnZ=Infinity;
    let mxX=-Infinity, mxY=-Infinity, mxZ=-Infinity;
    for (let i = 0; i < verts.length; i += 3) {
      if (verts[i]   < mnX) mnX=verts[i];   if (verts[i]   > mxX) mxX=verts[i];
      if (verts[i+1] < mnY) mnY=verts[i+1]; if (verts[i+1] > mxY) mxY=verts[i+1];
      if (verts[i+2] < mnZ) mnZ=verts[i+2]; if (verts[i+2] > mxZ) mxZ=verts[i+2];
    }
    const dx=mxX-mnX, dy=mxY-mnY, dz=mxZ-mnZ;
    const size = Math.max(dx, dy, dz) || 1;
    const tol  = size * 0.015; // 1.5% tolerance — small gaps don't count as floating

    // Floor axis matches the auto-orient logic — see determineUpAxis().
    const upAxis = determineUpAxis(dx, dy, dz);
    let floorOff, globalFloorMin;
    if (upAxis === 2)      { floorOff = 2; globalFloorMin = mnZ; }
    else if (upAxis === 0) { floorOff = 0; globalFloorMin = mnX; }
    else                   { floorOff = 1; globalFloorMin = mnY; }

    // Union-Find: connect triangles that share a vertex (within tolerance)
    const parent = new Int32Array(nTri);
    for (let i = 0; i < nTri; i++) parent[i] = i;
    function find(x) {
      while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
      return x;
    }

    const vtxMap = new Map();
    const scale  = 2 / tol; // vertices within tol/2 hash to the same cell
    for (let t = 0; t < nTri; t++) {
      for (let v = 0; v < 3; v++) {
        const b   = t * 9 + v * 3;
        const key = `${Math.round(verts[b]*scale)},${Math.round(verts[b+1]*scale)},${Math.round(verts[b+2]*scale)}`;
        if (vtxMap.has(key)) {
          const pa = find(t), pb = find(vtxMap.get(key));
          if (pa !== pb) parent[pa] = pb;
        } else {
          vtxMap.set(key, t);
        }
      }
    }

    // Bounding box of each component, [minX, minY, minZ, maxX, maxY, maxZ]
    const boxes = new Map();
    for (let t = 0; t < nTri; t++) {
      const root = find(t);
      let box = boxes.get(root);
      if (!box) {
        box = new Float64Array([Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity]);
        boxes.set(root, box);
      }
      for (let v = 0; v < 3; v++) {
        const b = t * 9 + v * 3;
        for (let a = 0; a < 3; a++) {
          const val = verts[b + a];
          if (val < box[a])     box[a]     = val;
          if (val > box[a + 3]) box[a + 3] = val;
        }
      }
    }
    const pieces = [...boxes.values()];
    const n      = pieces.length;

    // A piece is supported if it reaches the print floor, or (below) if it
    // overlaps a supported piece — a letter inlaid in a plate, a layer of
    // artwork in a disc, a part nested inside a larger body. Those print fine
    // even though they're separate shells that never touch the bed. Support
    // spreads through chains of overlapping pieces. Only a piece that hangs
    // clear of everything beneath it is floating.
    const supported = new Uint8Array(n);
    const queue = [];
    for (let i = 0; i < n; i++) {
      if (pieces[i][floorOff] <= globalFloorMin + tol) { supported[i] = 1; queue.push(i); }
    }
    // Bounding boxes overlap, allowing the same tolerance used for the floor
    const overlaps = (a, b) => {
      for (let k = 0; k < 3; k++) if (a[k] > b[k + 3] + tol || b[k] > a[k + 3] + tol) return false;
      return true;
    };
    if (n <= MAX_PIECES_FOR_OVERLAP_TEST) {
      for (let q = 0; q < queue.length; q++) {
        const s = pieces[queue[q]];
        for (let i = 0; i < n; i++) {
          if (!supported[i] && overlaps(pieces[i], s)) { supported[i] = 1; queue.push(i); }
        }
      }
    }
    return queue.length < n;
  }

  // "Cool Boat.stl" -> "Cool Boat"; strips the extension and any characters that
  // are illegal in file names. Falls back to "stl-preview" when no name is known.
  function screenshotBase(fileName) {
    const base = (fileName || '')
      .replace(/^.*[\\/]/, '')
      .replace(/\.stl$/i, '')
      .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
      .trim();
    return base || 'stl-preview';
  }

  // Best-effort guess at the submitted file's name when the download response
  // doesn't carry one: an .stl link's path, else any "name.stl" text on the page.
  function guessFileName(url) {
    try {
      const m = new URL(url).pathname.match(/([^/]+\.stl)$/i);
      if (m) return decodeURIComponent(m[1]);
    } catch { /* not a parseable URL */ }
    const t = (document.body.innerText || '').match(/[^\s\n\/\\]+(?: [^\s\n\/\\]+)*?\.stl\b/i);
    return t ? t[0] : null;
  }

  function openViewer(stl, fileName) {
    const { cx, cy, cz, size, dx, dy, dz, minY } = boundingBox(stl.verts);

    // Auto-orient: pre-rotate the model's "up" axis (see determineUpAxis) to map
    // to Y in the viewer — by default that's Z (Tinkercad's own export
    // convention), unless a clearly-thinner plaque axis says otherwise.
    //
    // rotX(-90°): (x,y,z)→(x, z,-y)  — old Z becomes new Y  (face was in XY plane)
    // rotZ(+90°): (x,y,z)→(-y, x, z) — old X becomes new Y  (face was in YZ plane)
    const upAxis = determineUpAxis(dx, dy, dz);
    let autoRot = null;
    let floorY  = (minY - cy) - size * 0.002;   // default: already Y-up

    if (upAxis === 2) {
      autoRot = m4.rotX(-Math.PI / 2);            // Z becomes up
      floorY  = -(dz / 2) - size * 0.002;
    } else if (upAxis === 0) {
      autoRot = m4.rotZ( Math.PI / 2);            // X becomes up
      floorY  = -(dx / 2) - size * 0.002;
    }

    // Dimensions in print orientation: W × D × H where H is always the thickness
    let dimW, dimD, dimH;
    if (upAxis === 2)      { dimW = Math.max(dx,dy); dimD = Math.min(dx,dy); dimH = dz; }
    else if (upAxis === 0) { dimW = Math.max(dy,dz); dimD = Math.min(dy,dz); dimH = dx; }
    else                   { dimW = Math.max(dx,dz); dimD = Math.min(dx,dz); dimH = dy; }
    const dimStr = `${dimW.toFixed(1)} × ${dimD.toFixed(1)} × ${dimH.toFixed(1)} mm`;

    // Volume + estimated weight at the chosen material and infill. Hidden when
    // the volume is ~0, e.g. an open surface mesh or a file exported in meters.
    const volMm3  = meshVolume(stl.verts);
    const volCm3  = volMm3 / 1000;
    const areaMm2 = meshSurfaceArea(stl.verts);
    const showVol = volCm3 >= 0.005;
    let infill    = lastInfill;
    let material  = lastMaterial;
    const volText = () => {
      const g = estimateGrams(volMm3, areaMm2, infill / 100, MATERIALS[material]);
      return `${volCm3.toFixed(volCm3 < 10 ? 2 : 1)} cm³ · ~${g.toFixed(g < 100 ? 1 : 0)} g`;
    };
    const volTip  = () =>
      `Volume of the mesh, and its estimated weight in ${material} (${MATERIALS[material]} g/cm³) at the ` +
      'chosen infill, counting about 1.2 mm of solid shell around the surface, so thin parts barely change ' +
      'with infill. A rough guide — a slicer\'s number will differ. Assumes millimetre units and a ' +
      'watertight mesh.';

    /* ── Overlay container ── */
    const overlay = document.createElement('div');
    overlay.style.cssText = [
      'position:fixed;inset:0;z-index:2147483647',
      'display:flex;flex-direction:column',
      'background:#0f1117',
      'font-family:"Google Sans",Roboto,Arial,sans-serif',
    ].join(';');

    /* ── Toolbar ── */
    const bar = document.createElement('div');
    bar.style.cssText = [
      // Wraps to a second row in a narrow window rather than pushing Save/Close
      // off-screen; identical to a fixed 52px bar when everything fits.
      'min-height:52px;box-sizing:border-box;background:#0a0b10;flex-shrink:0',
      'display:flex;flex-wrap:wrap;align-items:center;padding:6px 18px;gap:6px 12px',
      'border-bottom:1px solid #1e2133',
    ].join(';');

    const icon = Object.assign(document.createElement('span'), { textContent: '🖨️' });
    icon.style.cssText = 'font-size:20px;line-height:1;flex-shrink:0';

    const title = Object.assign(document.createElement('span'), { textContent: 'STL Preview' });
    title.style.cssText = 'color:#dde1f5;font-size:15px;font-weight:500;flex-shrink:0';

    const triCount = Object.assign(document.createElement('span'),
      { textContent: `${stl.count.toLocaleString()} ▲` });
    triCount.style.cssText = 'color:#5565b0;font-size:12px;flex-shrink:0';

    const dims = Object.assign(document.createElement('span'), { textContent: dimStr });
    dims.style.cssText = 'color:#7986b8;font-size:12px;flex-shrink:0;';
    dims.title = 'Width × Depth × Height (print orientation)';

    const vol = Object.assign(document.createElement('span'),
      { textContent: showVol ? volText() : '', title: volTip() });
    vol.style.cssText = 'color:#7986b8;font-size:12px;flex-shrink:0;' + (showVol ? '' : 'display:none');

    const selStyle = [
      'background:#1e2133;color:#8892c8;border:1px solid #2d3154',
      'border-radius:5px;padding:3px 4px;font-size:12px;cursor:pointer;flex-shrink:0',
      showVol ? '' : 'display:none',
    ].join(';');

    const materialSel = document.createElement('select');
    materialSel.style.cssText = selStyle;
    for (const name of Object.keys(MATERIALS)) {
      materialSel.append(new Option(name, name, false, name === material));
    }

    const infillSel = document.createElement('select');
    infillSel.style.cssText = selStyle;
    for (let pct = 10; pct <= 100; pct += 10) {
      infillSel.append(new Option(`${pct}% infill`, pct, false, pct === infill));
    }

    const refreshWeight = () => {
      vol.textContent = volText();
      vol.title = materialSel.title = infillSel.title = volTip();
    };
    materialSel.onchange = () => { material = lastMaterial = materialSel.value; refreshWeight(); };
    infillSel.onchange   = () => { infill   = lastInfill   = +infillSel.value;  refreshWeight(); };
    materialSel.title = infillSel.title = volTip();

    // Floating-geometry check. It runs just after the viewer's first paint (see
    // the end of openViewer), so the pill starts as "checking" and settles into
    // one of the other states — including an explicit "clear", so a missing
    // warning always means the check passed, never that it didn't run.
    const FLOAT_STATES = {
      checking: { text: '⏳ Checking for floating geometry…', bg: '#1e2133', fg: '#8892c8',
                  tip: 'Checking whether any part of the model is disconnected from the print bed…' },
      floating: { text: '⚠️ Floating geometry detected', bg: '#7a3800', fg: '#ffab40',
                  tip: 'One or more parts of this model hang above the print bed without touching or overlapping the rest of it, and will not print correctly.' },
      clear:    { text: '✓ No floating geometry', bg: '#12331f', fg: '#6fcf97',
                  tip: 'No part of this model is floating above the print bed.' },
      skipped:  { text: 'Floating check skipped (model too large)', bg: '#1e2133', fg: '#8892c8',
                  tip: 'This model has too many triangles to check for floating geometry.' },
      failed:   { text: 'Floating check failed', bg: '#1e2133', fg: '#8892c8',
                  tip: 'The floating-geometry check hit an error. See the browser console for details.' },
    };
    let floatState = 'checking';
    const floatWarn = document.createElement('span');
    floatWarn.style.cssText = 'font-size:12px;padding:3px 9px;border-radius:4px;font-weight:500;flex-shrink:0';
    const setFloatState = (state) => {
      floatState = state;
      const s = FLOAT_STATES[state];
      floatWarn.textContent = s.text;
      floatWarn.title       = s.tip;
      floatWarn.style.background = s.bg;
      floatWarn.style.color      = s.fg;
    };
    setFloatState('checking');

    const hint = Object.assign(document.createElement('span'),
      { textContent: 'Drag · rotate   Shift+drag · pan   Scroll · zoom' });
    // Zero flex-basis so the hint soaks up leftover space and shrinks away before
    // the toolbar has to wrap, rather than its full width forcing an early wrap.
    hint.style.cssText = 'color:#8892c8;font-size:11px;flex:1 1 0;min-width:0;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';

    const resetBtn = Object.assign(document.createElement('button'), { textContent: '↺ Reset View' });
    resetBtn.style.cssText = [
      'background:#1e2133;color:#8892c8;border:1px solid #2d3154',
      'border-radius:5px;padding:5px 12px;font-size:12px;cursor:pointer;flex-shrink:0',
    ].join(';');

    const saveBtn = Object.assign(document.createElement('button'), { textContent: '📷 Save PNG' });
    saveBtn.style.cssText = [
      'background:#1e2133;color:#8892c8;border:1px solid #2d3154',
      'border-radius:5px;padding:5px 12px;font-size:12px;cursor:pointer;flex-shrink:0',
    ].join(';');
    saveBtn.onclick = () => {
      const BAR_H = 52;
      const comp  = document.createElement('canvas');
      comp.width  = canvas.width;
      comp.height = canvas.height + BAR_H;

      const ctx = comp.getContext('2d');

      // ── Toolbar background + separator ──
      ctx.fillStyle = '#0a0b10';
      ctx.fillRect(0, 0, comp.width, BAR_H);
      ctx.strokeStyle = '#1e2133';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, BAR_H - 0.5);
      ctx.lineTo(comp.width, BAR_H - 0.5);
      ctx.stroke();

      // ── Toolbar text ──
      const mid  = BAR_H / 2;
      const font = 'px "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'middle';
      let x = 16;

      ctx.font      = `500 15${font}`;
      ctx.fillStyle = '#dde1f5';
      ctx.fillText('STL Preview', x, mid);
      x += ctx.measureText('STL Preview').width + 14;

      ctx.font      = `12${font}`;
      ctx.fillStyle = '#5565b0';
      const triTxt = `${stl.count.toLocaleString()} \u25b2`;
      ctx.fillText(triTxt, x, mid);
      x += ctx.measureText(triTxt).width + 14;

      ctx.fillStyle = '#7986b8';
      ctx.fillText(dimStr, x, mid);
      x += ctx.measureText(dimStr).width + 14;

      if (showVol) {
        const volTxt = `${volText()} of ${material} at ${infill}% infill`;
        ctx.fillText(volTxt, x, mid);
        x += ctx.measureText(volTxt).width + 14;
      }

      // Floating-check pill, in whatever state it's in when the PNG is saved
      const pill = FLOAT_STATES[floatState];
      const tw   = ctx.measureText(pill.text).width + 20;
      const ph   = 24;
      ctx.fillStyle = pill.bg;
      ctx.beginPath();
      ctx.roundRect(x, mid - ph / 2, tw, ph, 4);
      ctx.fill();
      ctx.fillStyle = pill.fg;
      ctx.fillText(pill.text, x + 10, mid);

      // ── 3-D view ──
      ctx.drawImage(canvas, 0, BAR_H);

      const link    = document.createElement('a');
      link.download = `${screenshotBase(fileName)}-screenshot.png`;
      link.href     = comp.toDataURL('image/png');
      link.click();
    };

    const closeBtn = Object.assign(document.createElement('button'), { textContent: '✕ Close' });
    closeBtn.style.cssText = [
      'background:#c62828;color:#fff;border:none',
      'border-radius:5px;padding:6px 16px;font-size:13px;cursor:pointer;flex-shrink:0',
    ].join(';');
    closeBtn.onclick = () => {
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      overlay.remove();
    };

    // The buttons wrap together, right-aligned, if the toolbar runs out of room
    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;align-items:center;gap:12px;margin-left:auto;flex-shrink:0';
    actions.append(resetBtn, saveBtn, closeBtn);

    bar.append(icon, title, triCount, dims, vol, materialSel, infillSel, floatWarn, hint, actions);

    /* ── Canvas ── */
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'flex:1;display:block;min-height:0;touch-action:none;';

    overlay.append(bar, canvas);
    document.body.appendChild(overlay);

    // Declared early as let so the resize callback can safely reference it
    // before WebGL is initialised (avoids "Cannot access 'gl' before initialisation")
    let gl = null;

    const resize = () => {
      canvas.width  = canvas.clientWidth  || canvas.offsetWidth;
      canvas.height = canvas.clientHeight || canvas.offsetHeight;
      if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    };
    // Don't call resize() yet — the overlay just entered the DOM and layout
    // may not have settled. We call it after gl is ready instead.
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    /* ── WebGL setup ── */
    gl = canvas.getContext('webgl', { preserveDrawingBuffer: true }) ||
         canvas.getContext('experimental-webgl', { preserveDrawingBuffer: true });
    if (!gl) {
      bar.insertAdjacentHTML('beforeend',
        '<span style="color:#f44336;margin-left:12px">WebGL not available in this browser</span>');
      return;
    }
    // Now that gl exists and layout has run, set real canvas dimensions + viewport
    resize();

    function mkShader(src, type) {
      const sh = gl.createShader(type);
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
        console.error('[STL Viewer] Shader error:', gl.getShaderInfoLog(sh));
      return sh;
    }

    // ── Model program ──
    const prog = gl.createProgram();
    gl.attachShader(prog, mkShader(VERT_SRC, gl.VERTEX_SHADER));
    gl.attachShader(prog, mkShader(FRAG_SRC, gl.FRAGMENT_SHADER));
    gl.linkProgram(prog);

    // ── Grid program ──
    const gridProg = gl.createProgram();
    gl.attachShader(gridProg, mkShader(GRID_VERT_SRC, gl.VERTEX_SHADER));
    gl.attachShader(gridProg, mkShader(GRID_FRAG_SRC, gl.FRAGMENT_SHADER));
    gl.linkProgram(gridProg);

    const upload = (data) => {
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return buf;
    };
    const vBuf = upload(stl.verts);
    const nBuf = upload(stl.norms);

    // Grid sits just a hair below the lowest vertex so it's never z-fighting the model bottom
    const GRID_DIVISIONS = 20;
    const gridData  = buildGridLines(floorY, size, GRID_DIVISIONS);
    const gBuf      = upload(gridData);
    const gridVerts = gridData.length / 3;   // 3 floats per vertex

    gl.useProgram(prog);
    const aPos    = gl.getAttribLocation(prog, 'aPos');
    const aNorm   = gl.getAttribLocation(prog, 'aNorm');
    const uMVPLoc = gl.getUniformLocation(prog, 'uMVP');
    const uModLoc = gl.getUniformLocation(prog, 'uModel');

    gl.useProgram(gridProg);
    const gAPos    = gl.getAttribLocation(gridProg, 'aPos');
    const gUMVPLoc = gl.getUniformLocation(gridProg, 'uMVP');
    const gUColor  = gl.getUniformLocation(gridProg, 'uColor');

    /* ── Camera state ── */
    let rotX = 0.45, rotY = 0.40;
    let zoom = size * 2.5;
    let panX = 0, panY = 0;
    const initRotX = rotX, initRotY = rotY, initZoom = zoom;
    resetBtn.onclick = () => { rotX = initRotX; rotY = initRotY; zoom = initZoom; panX = 0; panY = 0; };

    let dragging = false, last = null;

    // Named so they can be removed when the viewer closes (prevents listener accumulation
    // if a teacher opens the viewer many times in one session)
    const onMouseUp = () => { dragging = false; };
    const onMouseMove = e => {
      if (!dragging || !last) return;
      const mdx = e.clientX - last[0], mdy = e.clientY - last[1]; // mdx/mdy avoids shadowing bbox dx/dy
      if (e.shiftKey) {
        panX += mdx * zoom * 0.0013;
        panY -= mdy * zoom * 0.0013;
      } else {
        rotY += mdx * 0.012;
        rotX += mdy * 0.012;
      }
      last = [e.clientX, e.clientY];
    };

    canvas.addEventListener('mousedown', e => {
      dragging = true;
      last = [e.clientX, e.clientY];
      e.preventDefault();
    });
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('wheel', e => {
      zoom = Math.max(size * 0.08, Math.min(size * 20, zoom * (1 + e.deltaY * 0.001)));
      e.preventDefault();
    }, { passive: false });

    /* ── Render loop ── */
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0.06, 0.07, 0.09, 1.0);

    const render = () => {
      if (!overlay.isConnected) { ro.disconnect(); return; }
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect  = (canvas.width / canvas.height) || 1;
      const proj    = m4.perspective(Math.PI / 4, aspect, size * 0.001, size * 60);
      const view    = m4.translate(0, 0, -zoom);
      const userRot = m4.mul(m4.rotX(rotX), m4.rotY(rotY));

      // Grid uses only user-drag rotation — its geometry is already in post-autoRot space,
      // so including autoRot again would double-rotate it and push it through the model.
      const mvpGrid = m4.mul(proj, m4.mul(view, userRot));

      // Model: center → autoRot → user-drag rotation
      const centered = m4.translate(-cx + panX, -cy + panY, -cz);
      const aligned  = autoRot ? m4.mul(autoRot, centered) : centered;
      const model    = m4.mul(userRot, aligned);
      const mvp      = m4.mul(proj, m4.mul(view, model));

      // ── Grid lines (drawn first so model renders on top) ──
      gl.useProgram(gridProg);
      gl.uniformMatrix4fv(gUMVPLoc, false, mvpGrid);
      gl.uniform3fv(gUColor, [0.20, 0.26, 0.42]);   // muted blue-gray
      gl.bindBuffer(gl.ARRAY_BUFFER, gBuf);
      gl.enableVertexAttribArray(gAPos);
      gl.vertexAttribPointer(gAPos, 3, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINES, 0, gridVerts);
      gl.disableVertexAttribArray(gAPos);

      // ── Model ──
      gl.useProgram(prog);
      gl.uniformMatrix4fv(uMVPLoc, false, mvp);
      gl.uniformMatrix4fv(uModLoc, false, model);

      gl.bindBuffer(gl.ARRAY_BUFFER, vBuf);
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, nBuf);
      gl.enableVertexAttribArray(aNorm);
      gl.vertexAttribPointer(aNorm, 3, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLES, 0, stl.count * 3);
      requestAnimationFrame(render);
    };
    render();

    // Floating-geometry check, deferred so the model paints first; the toolbar
    // pill shows the result when ready. A short timer rather than
    // requestAnimationFrame, which is paused in a hidden tab and would leave the
    // check waiting if the user switched away right after opening the viewer.
    setTimeout(() => {
      if (!overlay.isConnected) return; // closed before it ran
      try {
        const floating = detectFloating(stl.verts);
        if (!overlay.isConnected) return;
        setFloatState(floating === null ? 'skipped' : floating ? 'floating' : 'clear');
      } catch (err) {
        console.warn('[STL Viewer] floating check failed:', err);
        setFloatState('failed');
      }
    }, 50);
  }

  /* ═══════════════════════════════════════════════════════════════
     DOM Detection — find "No preview available" + download URL
  ═══════════════════════════════════════════════════════════════ */
  function findNoPreviewEl() {
    const root = document.body || document.documentElement;

    // Strategy 1: exact text node match
    const iter = document.createNodeIterator(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = iter.nextNode())) {
      if (node.textContent.trim() === 'No preview available') return node.parentElement;
    }

    // Strategy 2: case-insensitive substring on leaf elements (catches icon+text combos)
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length === 0 && /no preview available/i.test(el.textContent)) return el;
    }

    return null;
  }

  // Extract a Google Drive file ID from any URL string
  function driveIdFromUrl(url) {
    if (!url) return null;
    // /file/d/FILE_ID/  or  id=FILE_ID  or  /d/FILE_ID
    const patterns = [
      /\/file\/d\/([a-zA-Z0-9_-]{20,})/,
      /[?&]id=([a-zA-Z0-9_-]{20,})/,
      /\/d\/([a-zA-Z0-9_-]{20,})/,
      /open\?id=([a-zA-Z0-9_-]{20,})/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  }

  // Google's own help/account pages sometimes contain links with "download" in
  // their text (e.g. "make sure you are signed in" help articles) — never
  // treat those as the file's download URL.
  const NON_FILE_HOSTS = /^(support|myaccount|accounts|policies|about)\.google\.com$/i;

  function findDownloadUrl() {
    // 1. Any anchor whose href explicitly contains ".stl"
    for (const a of document.querySelectorAll('a[href]')) {
      if (/\.stl(\?|#|$)/i.test(a.href)) return a.href;
    }

    // 2. Any anchor whose href is a Google Drive export/download URL
    for (const a of document.querySelectorAll('a[href]')) {
      if (/export=download/i.test(a.href) || /drive\.google\.com\/uc/i.test(a.href)) return a.href;
    }

    // 3. Extract Drive file ID from any iframe src on the page
    for (const iframe of document.querySelectorAll('iframe[src]')) {
      const id = driveIdFromUrl(iframe.src);
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }

    // 4. Extract Drive file ID from the current page URL itself
    const id = driveIdFromUrl(location.href);
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;

    // 5. Check data attributes on any element (some viewers store the ID there).
    //    Prefer one explicitly marked as the selected/active file if present.
    const candidates = [...document.querySelectorAll('[data-id],[data-fileid],[data-file-id],[data-docid]')];
    const selected = candidates.find(el => el.getAttribute('aria-selected') === 'true');
    for (const el of selected ? [selected, ...candidates] : candidates) {
      const raw = el.dataset.id || el.dataset.fileid || el.dataset.fileId || el.dataset.docid;
      if (raw && /^[a-zA-Z0-9_-]{20,}$/.test(raw)) {
        return `https://drive.google.com/uc?export=download&id=${raw}`;
      }
    }

    // 6. Last resort: any anchor whose visible text contains "download"
    //    (catches "↓ Download" with icons) — excluding Google's own
    //    help/support pages, which are never the actual file.
    for (const a of document.querySelectorAll('a[href]')) {
      if (!/download/i.test(a.textContent) || !/^https:/i.test(a.href)) continue;
      try {
        if (NON_FILE_HOSTS.test(new URL(a.href).hostname)) continue;
      } catch {
        continue;
      }
      return a.href;
    }

    return null;
  }

  /* ═══════════════════════════════════════════════════════════════
     Inject Preview Button
  ═══════════════════════════════════════════════════════════════ */
  let injected = false;
  let lastUrl  = location.href;

  function tryInject() {
    // Reset if the user navigated to a different submission (SPA navigation)
    if (location.href !== lastUrl) {
      lastUrl  = location.href;
      injected = false;
    }
    if (injected) return;

    const noPreviewEl = findNoPreviewEl();
    if (!noPreviewEl) return;
    console.log('[STL Viewer] "No preview available" detected, looking for a download URL…');

    const downloadUrl = findDownloadUrl();
    if (!downloadUrl) {
      console.log('[STL Viewer] no download URL found yet — will keep watching');
      return;
    }
    console.log('[STL Viewer] download URL found, injecting button:', downloadUrl);

    injected = true;

    // Find the best container to append our button to
    const container = noPreviewEl.closest('div') || noPreviewEl.parentElement;

    /* Button */
    const btn = document.createElement('button');
    btn.textContent = '🖨️ View in 3D';
    const setStyle = (bg) => {
      btn.style.cssText = [
        `background:${bg};color:#fff;border:none`,
        'display:block;margin:14px auto 0;padding:9px 22px',
        'border-radius:6px;font-size:14px;cursor:pointer',
        'font-family:"Google Sans",Roboto,Arial,sans-serif',
        'box-shadow:0 1px 4px rgba(0,0,0,.4);transition:background .15s',
      ].join(';');
    };
    setStyle('#1a73e8');
    btn.addEventListener('mouseenter', () => !btn.disabled && setStyle('#1558a8'));
    btn.addEventListener('mouseleave', () => !btn.disabled && setStyle('#1a73e8'));

    /* Status message */
    const msg = document.createElement('div');
    msg.style.cssText = [
      'text-align:center;font-size:12px;color:#888;margin-top:6px',
      'font-family:"Google Sans",Roboto,Arial,sans-serif',
    ].join(';');

    btn.onclick = async () => {
      btn.disabled = true;
      btn.textContent = '⏳ Loading…';
      msg.textContent = '';

      try {
        // Re-resolve the URL on every click (not just at injection time) so a
        // "Try Again" after a failed guess re-scans the DOM instead of
        // retrying the exact same wrong URL.
        const fetchUrl = findDownloadUrl() || downloadUrl;
        console.log('[STL Viewer] fetching', fetchUrl);

        // Route the fetch through the background service worker, which runs
        // outside any web page and is not subject to CORS restrictions.
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'FETCH_STL', url: fetchUrl }, res => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(res);
            }
          });
        });

        if (!response.ok) throw new Error(response.error);

        btn.textContent = '⏳ Building preview…';

        // Decode the base64 payload back to an ArrayBuffer
        const binary = atob(response.b64);
        const buf    = new ArrayBuffer(binary.length);
        const view   = new Uint8Array(buf);
        for (let i = 0; i < binary.length; i++) view[i] = binary.charCodeAt(i);

        const stl = parseSTL(buf);
        if (stl.count === 0) throw new Error('No triangles found — is this actually an STL file?');

        openViewer(stl, response.filename || guessFileName(fetchUrl));

        // Reset button so it's ready to use again after the viewer is closed
        btn.disabled = false;
        btn.textContent = '🖨️ View in 3D';
        setStyle('#1a73e8');

      } catch (err) {
        setStyle('#c62828');
        btn.textContent = '❌ Preview failed';
        msg.textContent = err.message;
        setTimeout(() => {
          btn.disabled = false;
          btn.textContent = '🖨️ Try Again';
          setStyle('#1a73e8');
        }, 4500);
      }
    };

    container.append(btn, msg);
  }

  /* ═══════════════════════════════════════════════════════════════
     Boot  —  handle initial load + SPA navigation
  ═══════════════════════════════════════════════════════════════ */
  function boot() {
    console.log('[STL Viewer] content script loaded on', location.href);
    tryInject();
    if (document.body) {
      new MutationObserver(tryInject).observe(document.body, { childList: true, subtree: true });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        tryInject();
        new MutationObserver(tryInject).observe(document.body, { childList: true, subtree: true });
      });
    }
    // Safety-net polling for slow SPA renders (stops after 30 seconds)
    let ticks = 0;
    const t = setInterval(() => { tryInject(); if (++ticks >= 30) clearInterval(t); }, 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
