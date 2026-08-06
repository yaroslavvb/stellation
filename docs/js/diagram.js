/*
 * The stellation diagram: one face plane with every other face plane's trace
 * drawn on it. This is the classic picture from Coxeter's "The Fifty-Nine
 * Icosahedra", and it is how you actually choose a stellation — each little
 * region is a cell, and clicking one adds or removes it.
 */

import { layerColor } from './render3d.js';

export class DiagramView {
  constructor(canvas, { onToggle, onHover } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.data = null;
    this.onToggle = onToggle;
    this.onHover = onHover;
    this.hover = -1;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.showAll = true;

    canvas.addEventListener('pointermove', (e) => {
      const i = this.hitTest(e);
      if (i !== this.hover) {
        this.hover = i;
        this.canvas.style.cursor = i >= 0 ? 'pointer' : 'default';
        this.draw();
        this.onHover?.(i >= 0 ? this.data.facets[i] : null);
      }
    });
    canvas.addEventListener('pointerleave', () => {
      if (this.hover !== -1) { this.hover = -1; this.draw(); this.onHover?.(null); }
    });
    canvas.addEventListener('click', (e) => {
      const i = this.hitTest(e);
      if (i >= 0) {
        this.onToggle?.(this.data.facets[i],
          { shift: e.shiftKey, ctrl: e.ctrlKey || e.metaKey, alt: e.altKey });
      }
    });
    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const f = Math.exp(-e.deltaY * 0.0015);
      this.zoom = Math.min(40, Math.max(0.4, this.zoom * f));
      this.draw();
    }, { passive: false });

    new ResizeObserver(() => this.draw()).observe(canvas);
  }

  setData(data) {
    this.data = data;
    this.hover = -1;
    this.draw();
  }

  /** device-pixel transform from diagram coords to canvas coords */
  _frame() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    const extent = (this.data?.extent || 1);
    const scale = (Math.min(w, h) * 0.46 / extent) * this.zoom;
    return { w, h, dpr, scale, cx: w / 2 + this.pan.x, cy: h / 2 + this.pan.y };
  }

  _path(ctx, poly, f) {
    ctx.beginPath();
    poly.forEach(([x, y], i) => {
      const px = f.cx + x * f.scale, py = f.cy - y * f.scale;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    });
    ctx.closePath();
  }

  draw() {
    const ctx = this.ctx;
    const f = this._frame();
    const dark = matchMedia('(prefers-color-scheme: dark)').matches ||
                 document.documentElement.dataset.theme === 'dark';

    ctx.clearRect(0, 0, f.w, f.h);
    ctx.fillStyle = dark ? '#0e1014' : '#ffffff';
    ctx.fillRect(0, 0, f.w, f.h);
    if (!this.data) return;

    const facets = this.data.facets;

    // 1. every facet, filled faintly by layer, so the arrangement reads as depth
    if (this.showAll) {
      for (const facet of facets) {
        const c = layerColor(facet.layer);
        ctx.fillStyle = `rgba(${c.map(v => Math.round(v * 255)).join(',')},${dark ? 0.17 : 0.13})`;
        this._path(ctx, facet.poly, f);
        ctx.fill();
      }
    }

    // 2. selected facets, solid
    for (const facet of facets) {
      if (!facet.selected) continue;
      const c = layerColor(facet.layer);
      ctx.fillStyle = `rgb(${c.map(v => Math.round(v * 255)).join(',')})`;
      this._path(ctx, facet.poly, f);
      ctx.fill();
    }

    // 3. the plane traces — every facet outline drawn thin
    ctx.strokeStyle = dark ? 'rgba(190,205,235,0.45)' : 'rgba(20,25,40,0.42)';
    ctx.lineWidth = Math.max(0.6, f.dpr * 0.6);
    for (const facet of facets) { this._path(ctx, facet.poly, f); ctx.stroke(); }

    // 4. selected outlines, heavier
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)';
    ctx.lineWidth = Math.max(1, f.dpr * 1.1);
    for (const facet of facets) {
      if (!facet.selected) continue;
      this._path(ctx, facet.poly, f);
      ctx.stroke();
    }

    // 5. hover highlight
    if (this.hover >= 0 && facets[this.hover]) {
      ctx.fillStyle = dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.14)';
      this._path(ctx, facets[this.hover].poly, f);
      ctx.fill();
      ctx.strokeStyle = dark ? '#fff' : '#000';
      ctx.lineWidth = Math.max(1.5, f.dpr * 1.6);
      ctx.stroke();
    }
  }

  hitTest(e) {
    if (!this.data) return -1;
    const f = this._frame();
    const r = this.canvas.getBoundingClientRect();
    const px = (e.clientX - r.left) * (f.w / r.width);
    const py = (e.clientY - r.top) * (f.h / r.height);
    const x = (px - f.cx) / f.scale;
    const y = -(py - f.cy) / f.scale;

    // smallest containing facet wins — inner cells are drawn on top of outer ones
    let best = -1, bestArea = Infinity;
    this.data.facets.forEach((facet, i) => {
      if (!pointInPoly(x, y, facet.poly)) return;
      const a = Math.abs(polyArea(facet.poly));
      if (a < bestArea) { bestArea = a; best = i; }
    });
    return best;
  }

  /** PNG data URL of the diagram as drawn */
  snapshot() { this.draw(); return this.canvas.toDataURL('image/png'); }

  /** standalone SVG of the diagram, for printing or laser cutting */
  toSVG() {
    if (!this.data) return '';
    const e = this.data.extent * 1.05;
    const S = 1000, k = S / (2 * e);
    const X = x => (S / 2 + x * k).toFixed(2);
    const Y = y => (S / 2 - y * k).toFixed(2);
    const path = p => 'M' + p.map(([x, y]) => `${X(x)},${Y(y)}`).join('L') + 'Z';
    const out = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}">`,
      `<rect width="${S}" height="${S}" fill="white"/>`];
    for (const f of this.data.facets) {
      if (!f.selected) continue;
      const c = layerColor(f.layer).map(v => Math.round(v * 255));
      out.push(`<path d="${path(f.poly)}" fill="rgb(${c})" stroke="none"/>`);
    }
    for (const f of this.data.facets) {
      out.push(`<path d="${path(f.poly)}" fill="none" stroke="#222" stroke-width="0.7"/>`);
    }
    out.push('</svg>');
    return out.join('\n');
  }
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function polyArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += (poly[j][0] + poly[i][0]) * (poly[j][1] - poly[i][1]);
  }
  return a / 2;
}
