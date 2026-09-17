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

  /* Detects whether any disconnected mesh component fails to touch the print floor.
     Uses union-find on triangles connected by shared vertex positions, then checks
     which components have no vertex within tolerance of the global floor-axis minimum. */
  function detectFloating(verts) {
    const nTri = Math.floor(verts.length / 9);
    if (nTri > 200000) return false; // skip for huge models — would be too slow

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

    // Floor axis = thinnest dimension (matches the auto-orient logic)
    let floorOff, globalFloorMin;
    if (dy <= dx && dy <= dz)      { floorOff = 1; globalFloorMin = mnY; }
    else if (dz <= dx && dz <= dy) { floorOff = 2; globalFloorMin = mnZ; }
    else                           { floorOff = 0; globalFloorMin = mnX; }

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

    // Find the minimum floor-axis value for each component
    const compMin = new Map();
    for (let t = 0; t < nTri; t++) {
      const root = find(t);
      for (let v = 0; v < 3; v++) {
        const val = verts[t * 9 + v * 3 + floorOff];
        const cur = compMin.get(root);
        if (cur === undefined || val < cur) compMin.set(root, val);
      }
    }

    // Any component whose closest point to the floor is significantly above it = floating
    for (const minVal of compMin.values()) {
      if (minVal > globalFloorMin + tol) return true;
    }
    return false;
  }

  function openViewer(stl) {
    const { cx, cy, cz, size, dx, dy, dz, minY } = boundingBox(stl.verts);

    // Auto-orient: find the thinnest axis — that's the print-bed normal for a flat model.
    // We pre-rotate so it always maps to Y in the viewer, so the model lies flat on the grid
    // regardless of how the student exported it from Tinkercad.
    //
    // rotX(-90°): (x,y,z)→(x, z,-y)  — old Z becomes new Y  (face was in XY plane)
    // rotZ(+90°): (x,y,z)→(-y, x, z) — old X becomes new Y  (face was in YZ plane)
    // no rotation needed if Y is already thin   (face was in XZ plane, Tinkercad default)
    let autoRot = null;
    let floorY  = (minY - cy) - size * 0.002;   // default: Y is thin

    if (dz < dx && dz < dy) {
      autoRot = m4.rotX(-Math.PI / 2);            // Z is thin
      floorY  = -(dz / 2) - size * 0.002;
    } else if (dx < dy && dx < dz) {
      autoRot = m4.rotZ( Math.PI / 2);            // X is thin
      floorY  = -(dx / 2) - size * 0.002;
    }

    // Dimensions in print orientation: W × D × H where H is always the thickness
    let dimW, dimD, dimH;
    if (!autoRot)                { dimW = Math.max(dx,dz); dimD = Math.min(dx,dz); dimH = dy; }
    else if (dz < dx && dz < dy){ dimW = Math.max(dx,dy); dimD = Math.min(dx,dy); dimH = dz; }
    else                        { dimW = Math.max(dy,dz); dimD = Math.min(dy,dz); dimH = dx; }
    const dimStr = `${dimW.toFixed(1)} × ${dimD.toFixed(1)} × ${dimH.toFixed(1)} mm`;

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
      'height:52px;background:#0a0b10;flex-shrink:0',
      'display:flex;align-items:center;padding:0 18px;gap:12px',
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

    // Floating geometry warning — only shown when detected
    const floatWarn = Object.assign(document.createElement('span'),
      { textContent: '⚠️ Floating geometry detected' });
    floatWarn.style.cssText = [
      'background:#7a3800;color:#ffab40;font-size:12px',
      'padding:3px 9px;border-radius:4px;font-weight:500;flex-shrink:0',
      stl.isFloating ? '' : 'display:none',
    ].join(';');
    floatWarn.title = 'One or more parts of this model are not connected to the print bed and will not print correctly.';

    const hint = Object.assign(document.createElement('span'),
      { textContent: 'Drag · rotate   Shift+drag · pan   Scroll · zoom' });
    hint.style.cssText = 'color:#2d3154;font-size:11px;margin-left:auto;flex-shrink:1;overflow:hidden;white-space:nowrap;';

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

      if (stl.isFloating) {
        const warn = '\u26a0  Floating geometry detected';
        const tw   = ctx.measureText(warn).width + 20;
        const ph   = 24;
        ctx.fillStyle = '#7a3800';
        ctx.beginPath();
        ctx.roundRect(x, mid - ph / 2, tw, ph, 4);
        ctx.fill();
        ctx.fillStyle = '#ffab40';
        ctx.fillText(warn, x + 10, mid);
      }

      // ── 3-D view ──
      ctx.drawImage(canvas, 0, BAR_H);

      const link    = document.createElement('a');
      link.download = 'stl-preview.png';
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

    bar.append(icon, title, triCount, dims, floatWarn, hint, resetBtn, saveBtn, closeBtn);

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

  function findDownloadUrl() {
    // 1. Any anchor whose href explicitly contains ".stl"
    for (const a of document.querySelectorAll('a[href]')) {
      if (/\.stl(\?|#|$)/i.test(a.href)) return a.href;
    }

    // 2. Any anchor whose href is a Google Drive export/download URL
    for (const a of document.querySelectorAll('a[href]')) {
      if (/export=download/i.test(a.href) || /drive\.google\.com\/uc/i.test(a.href)) return a.href;
    }

    // 3. Any anchor whose visible text contains "download" (catches "↓ Download" with icons)
    for (const a of document.querySelectorAll('a[href]')) {
      if (/download/i.test(a.textContent) && /^https:/i.test(a.href)) return a.href;
    }

    // 4. Extract Drive file ID from any iframe src on the page
    for (const iframe of document.querySelectorAll('iframe[src]')) {
      const id = driveIdFromUrl(iframe.src);
      if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
    }

    // 5. Extract Drive file ID from the current page URL itself
    const id = driveIdFromUrl(location.href);
    if (id) return `https://drive.google.com/uc?export=download&id=${id}`;

    // 6. Check data attributes on any element (some viewers store the ID there)
    for (const el of document.querySelectorAll('[data-id],[data-fileid],[data-file-id],[data-docid]')) {
      const raw = el.dataset.id || el.dataset.fileid || el.dataset.fileId || el.dataset.docid;
      if (raw && /^[a-zA-Z0-9_-]{20,}$/.test(raw)) {
        return `https://drive.google.com/uc?export=download&id=${raw}`;
      }
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
        // Route the fetch through the background service worker, which runs
        // outside any web page and is not subject to CORS restrictions.
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage({ type: 'FETCH_STL', url: downloadUrl }, res => {
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

        btn.textContent = '⏳ Analysing…';
        stl.isFloating = detectFloating(stl.verts);

        openViewer(stl);

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
