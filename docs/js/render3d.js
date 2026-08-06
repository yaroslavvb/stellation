/*
 * A small self-contained WebGL renderer for stellated polyhedra.
 *
 * Deliberately dependency-free: the shapes are flat-shaded polygon soups, which
 * needs far less than a general 3D engine, and a static page with no build step
 * loads instantly.
 *
 * Faces are given per-face flat normals and a per-face colour keyed to the
 * stellation layer, so you can read the structure of a stellation by eye.
 */

const VERT = `#version 300 es
precision highp float;
in vec3 aPos;
in vec3 aNormal;
in vec3 aColor;
uniform mat4 uProj;
uniform mat4 uView;
out vec3 vNormal;
out vec3 vColor;
out vec3 vEye;
void main() {
  vec4 p = uView * vec4(aPos, 1.0);
  vEye = p.xyz;
  vNormal = mat3(uView) * aNormal;
  vColor = aColor;
  gl_Position = uProj * p;
}`;

const FRAG = `#version 300 es
precision highp float;
in vec3 vNormal;
in vec3 vColor;
in vec3 vEye;
uniform float uEdgeDark;
out vec4 fragColor;
void main() {
  vec3 n = normalize(vNormal);
  // two-sided: stellation cells are open shells seen from both sides
  if (!gl_FrontFacing) n = -n;
  vec3 L1 = normalize(vec3(-0.35, 0.55, 0.9));
  vec3 L2 = normalize(vec3(0.6, -0.3, 0.4));
  float d = max(dot(n, L1), 0.0) * 0.85 + max(dot(n, L2), 0.0) * 0.25;
  vec3 V = normalize(-vEye);
  vec3 H = normalize(L1 + V);
  float spec = pow(max(dot(n, H), 0.0), 48.0) * 0.35;
  vec3 c = vColor * (0.34 + d) + spec;   // keep shadowed faces light enough that black edges still read
  // slight rim to separate touching facets
  float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.12;
  fragColor = vec4(c + rim, 1.0);
}`;

/*
 * Edges are drawn as screen-space quads, not GL_LINES.
 *
 * gl.lineWidth() is a lie on essentially every desktop GL implementation: the
 * core profile only has to support a width of 1.0, and ANGLE clamps it there,
 * so asking for thicker lines silently changes nothing. The fix is to expand
 * each edge into a quad in clip space, offsetting the corners along the screen
 * normal of the segment, which gives real, controllable thickness everywhere.
 */
const LINE_VERT = `#version 300 es
precision highp float;
in vec3 aA;          // segment start, model space
in vec3 aB;          // segment end
in float aSide;      // -1 / +1, which side of the segment this corner sits on
in float aEnd;       // 0 at A, 1 at B
uniform mat4 uProj;
uniform mat4 uView;
uniform vec2 uViewport;
uniform float uWidth;   // half-width, device pixels
void main() {
  vec4 ca = uProj * uView * vec4(aA, 1.0);
  vec4 cb = uProj * uView * vec4(aB, 1.0);
  vec2 sa = ca.xy / max(ca.w, 1e-6) * uViewport;
  vec2 sb = cb.xy / max(cb.w, 1e-6) * uViewport;
  vec2 dir = sb - sa;
  dir = length(dir) < 1e-6 ? vec2(1.0, 0.0) : normalize(dir);
  vec2 nrm = vec2(-dir.y, dir.x) * aSide * uWidth / uViewport;
  vec4 c = mix(ca, cb, aEnd);
  c.xy += nrm * c.w;
  gl_Position = c;
}`;

const LINE_FRAG = `#version 300 es
precision highp float;
uniform vec4 uColor;
out vec4 fragColor;
void main() { fragColor = uColor; }`;

// layer palette — warm at the core, cool further out
export const LAYER_COLORS = [
  [0.98, 0.76, 0.32], [0.95, 0.55, 0.30], [0.88, 0.38, 0.38],
  [0.78, 0.35, 0.55], [0.58, 0.40, 0.72], [0.38, 0.50, 0.80],
  [0.30, 0.65, 0.78], [0.32, 0.72, 0.62], [0.45, 0.75, 0.45],
  [0.68, 0.75, 0.35], [0.85, 0.70, 0.35], [0.70, 0.55, 0.45],
];
export const layerColor = i => LAYER_COLORS[i % LAYER_COLORS.length];

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error('shader: ' + gl.getShaderInfoLog(s));
  }
  return s;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error('link: ' + gl.getProgramInfoLog(p));
  }
  return p;
}

export class Renderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = this.gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
    if (!gl) throw new Error('WebGL2 is not available in this browser');

    this.prog = program(gl, VERT, FRAG);
    this.lineProg = program(gl, LINE_VERT, LINE_FRAG);

    this.vao = gl.createVertexArray();
    this.posBuf = gl.createBuffer();
    this.normBuf = gl.createBuffer();
    this.colBuf = gl.createBuffer();
    this.count = 0;

    this.lineVao = gl.createVertexArray();
    this.lineBufs = { a: gl.createBuffer(), b: gl.createBuffer(), side: gl.createBuffer(), end: gl.createBuffer() };
    this.lineCount = 0;
    this.edgeWidth = 3.0;   // CSS pixels of total line width, scaled by dpr at draw

    this.rotation = quatFromEuler(-0.42, 0.6, 0);
    this.distance = 1.0;   // relative zoom; the fit distance is computed per frame
    this.autoRotate = true;
    this.showEdges = true;
    this.background = [0.055, 0.06, 0.078];
    this.edgeColor = [0.0, 0.0, 0.0, 1.0];

    this._installControls();
    this._raf = null;
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas);
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    this.draw();
  }

  /** upload a mesh: {vertices:[{x,y,z}], faces:[[i,...]]} plus a layer per face */
  setMesh(mesh, faceLayers) {
    const gl = this.gl;
    const pos = [], norm = [], col = [], lines = [];
    this.pickTris = [];      // {a,b,c, face} in model space, for ray picking
    this.mesh = mesh;
    const seenEdges = new Set();

    // normalise scale so every solid frames the same way
    let maxR = 1e-9;
    for (const v of mesh.vertices) maxR = Math.max(maxR, Math.hypot(v.x, v.y, v.z));
    const s = 1 / maxR;

    mesh.faces.forEach((face, fi) => {
      const c = layerColor(faceLayers ? faceLayers[fi] : 0);
      const p = face.map(i => mesh.vertices[i]);
      // flat normal from the first non-degenerate corner
      let nx = 0, ny = 0, nz = 0;
      for (let i = 0; i < p.length; i++) {
        const a = p[i], b = p[(i + 1) % p.length];
        nx += (a.y - b.y) * (a.z + b.z);
        ny += (a.z - b.z) * (a.x + b.x);
        nz += (a.x - b.x) * (a.y + b.y);
      }
      const nl = Math.hypot(nx, ny, nz) || 1;
      nx /= nl; ny /= nl; nz /= nl;

      for (let i = 1; i < p.length - 1; i++) {
        const tri = [p[0], p[i], p[i + 1]];
        for (const v of tri) {
          pos.push(v.x * s, v.y * s, v.z * s);
          norm.push(nx, ny, nz);
          col.push(c[0], c[1], c[2]);
        }
        this.pickTris.push({
          a: [tri[0].x * s, tri[0].y * s, tri[0].z * s],
          b: [tri[1].x * s, tri[1].y * s, tri[1].z * s],
          c: [tri[2].x * s, tri[2].y * s, tri[2].z * s],
          face: fi,
        });
      }
      for (let i = 0; i < p.length; i++) {
        const ia = face[i], ib = face[(i + 1) % face.length];
        const key = ia < ib ? `${ia}_${ib}` : `${ib}_${ia}`;
        if (seenEdges.has(key)) continue;      // interior edges are shared by two faces
        seenEdges.add(key);
        const a = p[i], b = p[(i + 1) % p.length];
        lines.push([a.x * s, a.y * s, a.z * s], [b.x * s, b.y * s, b.z * s]);
      }
    });

    const upload = (vao, buf, loc, data, size, prog) => {
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
      const l = gl.getAttribLocation(prog, loc);
      if (l >= 0) { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); }
    };

    upload(this.vao, this.posBuf, 'aPos', pos, 3, this.prog);
    upload(this.vao, this.normBuf, 'aNormal', norm, 3, this.prog);
    upload(this.vao, this.colBuf, 'aColor', col, 3, this.prog);
    this.count = pos.length / 3;

    this.lineCount = this._uploadSegments(this.lineVao, this.lineBufs, lines);

    gl.bindVertexArray(null);
    this.draw();
  }

  /** expand [[x,y,z],[x,y,z], …] segment pairs into two triangles each */
  _uploadSegments(vao, bufs, segs) {
    const gl = this.gl;
    const n = segs.length / 2;
    const A = new Float32Array(n * 6 * 3);
    const B = new Float32Array(n * 6 * 3);
    const S = new Float32Array(n * 6);
    const E = new Float32Array(n * 6);
    //  corners:  (A,-1) (A,+1) (B,-1)   (B,-1) (A,+1) (B,+1)
    const SIDE = [-1, 1, -1, -1, 1, 1];
    const END  = [0, 0, 1, 1, 0, 1];
    for (let i = 0; i < n; i++) {
      const a = segs[i * 2], b = segs[i * 2 + 1];
      for (let k = 0; k < 6; k++) {
        const o = (i * 6 + k) * 3;
        A[o] = a[0]; A[o + 1] = a[1]; A[o + 2] = a[2];
        B[o] = b[0]; B[o + 1] = b[1]; B[o + 2] = b[2];
        S[i * 6 + k] = SIDE[k];
        E[i * 6 + k] = END[k];
      }
    }
    gl.bindVertexArray(vao);
    const bind = (buf, data, name, size) => {
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const l = gl.getAttribLocation(this.lineProg, name);
      if (l >= 0) { gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, 0, 0); }
    };
    bind(bufs.a, A, 'aA', 3);
    bind(bufs.b, B, 'aB', 3);
    bind(bufs.side, S, 'aSide', 1);
    bind(bufs.end, E, 'aEnd', 1);
    gl.bindVertexArray(null);
    return n * 6;
  }

  draw() {
    const gl = this.gl;
    const W = this.canvas.width, H = this.canvas.height;
    gl.viewport(0, 0, W, H);
    gl.clearColor(...this.background, 1);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.CULL_FACE);          // shells are visible from both sides
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    if (!this.count) return;

    const cam = this._camera(W, H);
    const proj = perspective(cam.fovy, cam.aspect, 0.05, 100);
    const view = mat4mul(translation(0, 0, -cam.dist), quatToMat4(this.rotation));

    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.prog, 'uProj'), false, proj);
    gl.uniformMatrix4fv(gl.getUniformLocation(this.prog, 'uView'), false, view);
    gl.bindVertexArray(this.vao);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(1.2, 1.2);      // sink the faces so edges sit cleanly on top
    gl.drawArrays(gl.TRIANGLES, 0, this.count);
    gl.disable(gl.POLYGON_OFFSET_FILL);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const drawLines = (vao, count, rgba, cssWidth) => {
      gl.useProgram(this.lineProg);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.lineProg, 'uProj'), false, proj);
      gl.uniformMatrix4fv(gl.getUniformLocation(this.lineProg, 'uView'), false, view);
      gl.uniform4f(gl.getUniformLocation(this.lineProg, 'uColor'), ...rgba);
      gl.uniform2f(gl.getUniformLocation(this.lineProg, 'uViewport'), W, H);
      gl.uniform1f(gl.getUniformLocation(this.lineProg, 'uWidth'), cssWidth * dpr);
      gl.bindVertexArray(vao);
      gl.drawArrays(gl.TRIANGLES, 0, count);
    };

    if (this.showEdges && this.lineCount) {
      drawLines(this.lineVao, this.lineCount, this.edgeColor, this.edgeWidth);
    }
    if (this.hlCount) {
      gl.disable(gl.DEPTH_TEST);
      drawLines(this.hlVao, this.hlCount, [1.0, 0.93, 0.3, 1.0], 3.2);
      gl.enable(gl.DEPTH_TEST);
    }
    gl.bindVertexArray(null);
  }

  /**
   * The model is normalised to radius 1, so the camera must sit far enough back
   * that a unit sphere fits the NARROWER of the two field-of-view angles —
   * otherwise a tall thin canvas clips the solid left and right.
   */
  _camera(W, H) {
    const fovy = Math.PI / 4.5;
    const aspect = W / H;
    const fovx = 2 * Math.atan(Math.tan(fovy / 2) * aspect);
    const fit = 1.13 / Math.sin(Math.min(fovy, fovx) / 2);
    return { fovy, aspect, fit, dist: fit * this.distance };
  }

  // ---------------------------------------------------------------- picking

  /**
   * Which face of the solid is under the pointer.
   *
   * The camera sits at the origin of view space looking down -Z, so the ray
   * through a pixel is trivial there; we push it back into model space with the
   * inverse of the view transform (a rotation, so its transpose) and hit-test
   * the triangles directly. A few thousand triangles is nothing per click, and
   * this keeps picking exact rather than reading back pixel ids.
   */
  pick(e) {
    if (!this.pickTris?.length) return null;
    const r = this.canvas.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = 1 - ((e.clientY - r.top) / r.height) * 2;

    const cam = this._camera(this.canvas.width, this.canvas.height);
    const t = Math.tan(cam.fovy / 2);
    const dirView = [nx * cam.aspect * t, ny * t, -1];

    const R = quatToMat4(this.rotation);
    const origin = rotT(R, [0, 0, cam.dist]);
    const dir = rotT(R, dirView);

    let best = null;
    for (const tri of this.pickTris) {
      const hit = rayTriangle(origin, dir, tri.a, tri.b, tri.c);
      if (hit !== null && (best === null || hit < best.t)) best = { t: hit, face: tri.face };
    }
    return best;
  }

  /** outline one face in the accent colour, or clear with -1 */
  setHighlight(faceIndex) {
    if (this._hl === faceIndex) return;
    this._hl = faceIndex;
    const gl = this.gl;
    const pts = [];
    if (faceIndex >= 0 && this.mesh) {
      let maxR = 1e-9;
      for (const v of this.mesh.vertices) maxR = Math.max(maxR, Math.hypot(v.x, v.y, v.z));
      const s = 1 / maxR;
      const face = this.mesh.faces[faceIndex];
      if (face) {
        for (let i = 0; i < face.length; i++) {
          const a = this.mesh.vertices[face[i]], b = this.mesh.vertices[face[(i + 1) % face.length]];
          pts.push([a.x * s, a.y * s, a.z * s], [b.x * s, b.y * s, b.z * s]);
        }
      }
    }
    if (!this.hlVao) {
      this.hlVao = gl.createVertexArray();
      this.hlBufs = { a: gl.createBuffer(), b: gl.createBuffer(), side: gl.createBuffer(), end: gl.createBuffer() };
    }
    this.hlCount = this._uploadSegments(this.hlVao, this.hlBufs, pts);
    gl.bindVertexArray(null);
    this.draw();
  }

  start() {
    if (this._raf) return;
    let last = performance.now();
    const tick = (t) => {
      const dt = Math.min((t - last) / 1000, 0.05); last = t;
      if (this.autoRotate && !this.dragging) {
        this.rotation = quatMul(quatFromAxis([0, 1, 0], dt * 0.35), this.rotation);
      }
      this.draw();
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  stop() { if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; } }

  _installControls() {
    const c = this.canvas;
    let px = 0, py = 0;

    // A modifier means "I am pointing at a cell", not "turn the model" — that is
    // what keeps picking and orbiting out of each other's way. alt counts too,
    // because on macOS ctrl-click is the secondary click and never reaches us.
    const picking = (e) => e.shiftKey || e.ctrlKey || e.metaKey || e.altKey;
    const mods = (e) => {
      const shift = e.shiftKey;
      return { shift, ctrl: !shift && (e.ctrlKey || e.metaKey || e.altKey), alt: e.altKey };
    };

    const down = (e) => {
      if (picking(e) || e.button === 2) return;
      this.dragging = true;
      const p = point(e, c); px = p.x; py = p.y;
      c.setPointerCapture?.(e.pointerId);
    };
    const move = (e) => {
      if (!this.dragging) {
        if (this.onPickHover) {
          const hit = picking(e) ? this.pick(e) : null;
          c.style.cursor = hit ? 'crosshair' : 'grab';
          this.setHighlight(hit ? hit.face : -1);
          this.onPickHover(hit, mods(e));
        }
        return;
      }
      const p = point(e, c);
      const dx = (p.x - px), dy = (p.y - py);
      px = p.x; py = p.y;
      // trackball: drag direction maps to rotation about the perpendicular axis
      const q = quatMul(quatFromAxis([0, 1, 0], dx * 0.008), quatFromAxis([1, 0, 0], dy * 0.008));
      this.rotation = quatMul(q, this.rotation);
      this.draw();
    };
    const up = (e) => { this.dragging = false; c.releasePointerCapture?.(e.pointerId); };

    c.addEventListener('pointerdown', down);
    c.addEventListener('pointermove', move);
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('pointerleave', () => { this.setHighlight(-1); this.onPickHover?.(null); });

    c.addEventListener('click', (e) => {
      if (!picking(e) || !this.onPick) return;
      const hit = this.pick(e);
      if (hit) this.onPick(hit, mods(e));
    });

    // ctrl-click on macOS arrives only as this; treat it, and a right-click, as carve
    c.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (!this.onPick) return;
      const hit = this.pick(e);
      if (hit) this.onPick(hit, { shift: e.shiftKey, ctrl: !e.shiftKey });
    });

    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.distance = Math.min(4, Math.max(0.35, this.distance * Math.exp(e.deltaY * 0.0012)));
      this.draw();
    }, { passive: false });
  }

  /** a PNG data URL of the current view */
  snapshot() {
    this.draw();
    return this.canvas.toDataURL('image/png');
  }
}

function point(e, el) {
  const r = el.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}

// ---------------------------------------------------------------- tiny math

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}

function translation(x, y, z) {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1]);
}

function mat4mul(a, b) {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
      o[i * 4 + j] = s;
    }
  return o;
}

function quatFromAxis(axis, angle) {
  const l = Math.hypot(...axis) || 1;
  const s = Math.sin(angle / 2);
  return [axis[0] / l * s, axis[1] / l * s, axis[2] / l * s, Math.cos(angle / 2)];
}

function quatFromEuler(x, y, z) {
  let q = quatFromAxis([1, 0, 0], x);
  q = quatMul(quatFromAxis([0, 1, 0], y), q);
  return quatMul(quatFromAxis([0, 0, 1], z), q);
}

function quatMul(a, b) {
  return [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];
}

/** apply the transpose (= inverse, for a rotation) of a column-major mat4's 3x3 part */
function rotT(m, v) {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[4] * v[0] + m[5] * v[1] + m[6] * v[2],
    m[8] * v[0] + m[9] * v[1] + m[10] * v[2],
  ];
}

/** Möller–Trumbore; returns the ray parameter of the hit, or null. Two-sided. */
function rayTriangle(o, d, a, b, c) {
  const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const e2 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
  const p = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
  const det = e1[0] * p[0] + e1[1] * p[1] + e1[2] * p[2];
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det;
  const t0 = [o[0] - a[0], o[1] - a[1], o[2] - a[2]];
  const u = (t0[0] * p[0] + t0[1] * p[1] + t0[2] * p[2]) * inv;
  if (u < -1e-6 || u > 1 + 1e-6) return null;
  const q = [t0[1] * e1[2] - t0[2] * e1[1], t0[2] * e1[0] - t0[0] * e1[2], t0[0] * e1[1] - t0[1] * e1[0]];
  const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) * inv;
  if (v < -1e-6 || u + v > 1 + 1e-6) return null;
  const t = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) * inv;
  return t > 1e-6 ? t : null;
}

function quatToMat4(q) {
  const [x, y, z, w] = q;
  return new Float32Array([
    1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 0,
    2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 0,
    2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y), 0,
    0, 0, 0, 1,
  ]);
}
