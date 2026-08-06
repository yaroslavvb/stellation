/*
 * The Cells panel — a close port of the Java "Cells" window
 * (pvs.polyhedra.stellation.ui.Selection).
 *
 * One row per layer, numbered on the left. Along each row sit the symmetric
 * cells of that layer. A cell that splits into several sub-cells (a chiral pair,
 * say) is drawn as a shaded header box carrying the cell number, followed by one
 * small box per sub-cell.
 *
 * The coloured bars are the original's cleverest touch: every bar colour stands
 * for one particular number of congruent pieces, so cells that are the "same
 * kind of thing" read alike at a glance across the whole table.
 *
 * Mouse, as in the original:
 *   click              toggle this cell (a header toggles all its sub-cells)
 *   shift-click        add it AND everything holding it up
 *   ctrl / cmd-click   remove it and its supporting set
 *   click layer number act on the whole layer
 */

const FONT_H = 15;
const Y_SPACE = 8, X_SPACE = 8;
const Y_PAD = 3, X_PAD = 2;
const BAR = 3;

export class CellsPanel {
  constructor(canvas, { onChange, onHover } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onChange = onChange;
    this.onHover = onHover;

    this.outline = null;      // [layer][cell] = {index, subCells:[...], ...}
    this.selected = new Set();
    this.hit = [];            // hit rectangles in CSS pixels
    this.hover = null;
    this.scroll = 0;

    canvas.addEventListener('pointermove', (e) => {
      const h = this.hitTest(e);
      const same = (a, b) => a === b || (a && b && a.key === b.key && a.kind === b.kind);
      if (!same(h, this.hover)) {
        this.hover = h;
        canvas.style.cursor = h ? 'pointer' : 'default';
        // a real hover tooltip, as the Java window has: hold still and the
        // details appear, so the boxes themselves can stay bare numbers
        canvas.title = h ? this.describe(h) : '';
        this.draw();
        this.onHover?.(h);
      }
    });
    canvas.addEventListener('pointerleave', () => {
      if (this.hover) { this.hover = null; this.draw(); this.onHover?.(null); }
    });
    canvas.addEventListener('click', (e) => {
      const h = this.hitTest(e);
      if (!h) return;
      this.apply(h, modifiersOf(e));
    });
    // macOS turns ctrl-click into the secondary click, so the page is handed a
    // contextmenu event and never a ctrl-click. Take that event as "carve", the
    // same as a right-click, which is what a user reaching for ctrl meant.
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const h = this.hitTest(e);
      if (h) this.apply(h, { shift: e.shiftKey, ctrl: !e.shiftKey });
    });
    canvas.addEventListener('wheel', (e) => {
      const max = Math.max(0, this.contentHeight - canvas.clientHeight);
      if (max <= 0) return;
      e.preventDefault();
      this.scroll = Math.min(max, Math.max(0, this.scroll + e.deltaY));
      this.draw();
    }, { passive: false });

    new ResizeObserver(() => this.draw()).observe(canvas);
  }

  /**
   * outline: [{layer, cells:[{index, primitives, facets, vertices, volume,
   *                           subCells:[{index, primitives, volume, bottom:[key]}]}]}]
   */
  setOutline(outline) {
    this.outline = outline;
    this.scroll = 0;
    this.palette = buildPalette(outline);
    this.byKey = new Map();
    for (const layer of outline)
      for (const cell of layer.cells)
        for (const sub of cell.subCells)
          this.byKey.set(`${layer.layer}.${cell.index}.${sub.index}`, { layer, cell, sub });
    this.draw();
    this.fit();
  }

  /** shrink the frame to the table, up to a sensible ceiling, then scroll */
  fit() {
    const wrap = this.canvas.parentElement;
    if (!wrap || !this.contentHeight) return;
    wrap.style.height = Math.min(this.contentHeight + 6, 460) + 'px';
    this.draw();
  }

  setSelected(selected) { this.selected = selected; this.draw(); }

  // ---------------------------------------------------------------- selection

  /** every sub-cell key holding `key` up, transitively (the graph came from the worker) */
  supportKeys(key) {
    return this._closure(key, 'bottom');
  }

  /** everything resting on `key`, transitively */
  dependentKeys(key) {
    return this._closure(key, 'top');
  }

  _closure(key, dir) {
    const out = new Set([key]);
    const stack = [key];
    while (stack.length) {
      const k = stack.pop();
      for (const n of (this.byKey.get(k)?.sub[dir] || [])) {
        if (!out.has(n)) { out.add(n); stack.push(n); }
      }
    }
    return out;
  }

  apply(hit, mod) {
    const sel = this.selected;
    const keys = hit.keys;                       // the sub-cells this hit covers

    if (mod.shift || mod.ctrl) {
      // Grow pulls in what holds the cell up; carve takes away what rests on it.
      // The original's carve cleared the supporting set instead — downward — which
      // leaves the cells above it floating in mid-air. Both directions here keep
      // the selection a solid that holds together.
      const all = new Set();
      for (const k of keys) {
        for (const s of (mod.shift ? this.supportKeys(k) : this.dependentKeys(k))) all.add(s);
      }
      for (const k of all) mod.shift ? sel.add(k) : sel.delete(k);
    } else {
      const anyOff = keys.some(k => !sel.has(k));
      for (const k of keys) anyOff ? sel.add(k) : sel.delete(k);
    }
    this.onChange?.(sel);
  }

  // ---------------------------------------------------------------- layout

  _metrics() {
    const ctx = this.ctx;
    ctx.font = `600 ${FONT_H}px ui-sans-serif, system-ui, sans-serif`;
    const gridX = Math.ceil(ctx.measureText('W').width) + X_SPACE;
    return { gridX, gridY: FONT_H + Y_SPACE };
  }

  /** walk the table, calling back with the rect for every drawable box */
  _walk(cb) {
    if (!this.outline) return;
    const { gridX, gridY } = this._metrics();
    let y = 1 - this.scroll;

    for (const layer of this.outline) {
      let x = 1;
      cb({ kind: 'layer', layer, x, y, w: 2 * gridX - 3, h: gridY });
      x += 2 * gridX;

      for (const cell of layer.cells) {
        const n = cell.subCells.length;
        if (n > 1) {
          cb({ kind: 'header', layer, cell, x, y, w: gridX, h: gridY });
          let sx = x + gridX;
          for (const sub of cell.subCells) {
            cb({ kind: 'sub', layer, cell, sub, x: sx, y, w: gridX, h: gridY });
            sx += gridX;
          }
          cb({ kind: 'groupbar', layer, cell, x: x + gridX, y, w: gridX * n, h: gridY });
          x += (n + 1) * gridX;
        } else {
          cb({ kind: 'cell', layer, cell, sub: cell.subCells[0], x, y, w: gridX, h: gridY });
          x += gridX;
        }
      }
      y += gridY;
    }
    this.contentHeight = y + this.scroll + 4;
  }

  hitTest(e) {
    const r = this.canvas.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    let found = null;
    this._walk((b) => {
      if (b.kind === 'groupbar') return;
      if (px < b.x || px > b.x + b.w || py < b.y || py > b.y + b.h) return;
      found = this._toHit(b);
    });
    return found;
  }

  _toHit(b) {
    const L = b.layer.layer;
    if (b.kind === 'layer') {
      const keys = [];
      for (const c of b.layer.cells) for (const s of c.subCells) keys.push(`${L}.${c.index}.${s.index}`);
      return { kind: 'layer', key: `L${L}`, keys, layer: b.layer };
    }
    if (b.kind === 'header') {
      const keys = b.cell.subCells.map(s => `${L}.${b.cell.index}.${s.index}`);
      return { kind: 'header', key: `${L}.${b.cell.index}`, keys, layer: b.layer, cell: b.cell };
    }
    const key = `${L}.${b.cell.index}.${b.sub.index}`;
    return { kind: b.kind, key, keys: [key], layer: b.layer, cell: b.cell, sub: b.sub };
  }

  // ---------------------------------------------------------------- painting

  draw() {
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const S = themeColors();
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = S.bg;
    ctx.fillRect(0, 0, w / dpr, h / dpr);
    if (!this.outline) return;

    const sel = this.selected;
    const hoverKey = this.hover?.key;

    this._walk((b) => {
      const L = b.layer.layer;

      if (b.kind === 'layer') {
        // an empty layer (the depth limit cut it off) must not read as "all on":
        // `every` over nothing is true, which would light the whole row up
        const any = b.layer.cells.length > 0;
        const on = any && b.layer.cells.every(c => c.subCells.every(s => sel.has(`${L}.${c.index}.${s.index}`)));
        const some = any && b.layer.cells.some(c => c.subCells.some(s => sel.has(`${L}.${c.index}.${s.index}`)));
        ctx.fillStyle = on ? S.layerOn : some ? S.layerSome : S.bg;
        ctx.fillRect(b.x + 1, b.y, b.w, b.h);
        ctx.strokeStyle = hoverKey === `L${L}` ? S.hover : S.line;
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x + 1.5, b.y + 0.5, b.w, b.h);
        ctx.fillStyle = any ? S.text : S.dim;
        ctx.font = `700 ${FONT_H}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(L), b.x + 1 + b.w / 2, b.y + b.h / 2 + 0.5);
        if (!any) {
          ctx.fillStyle = S.dim;
          ctx.font = `400 10px ui-sans-serif, system-ui, sans-serif`;
          ctx.textAlign = 'left';
          ctx.fillText('— beyond the depth limit', b.x + b.w + 8, b.y + b.h / 2 + 0.5);
        }
        return;
      }

      if (b.kind === 'groupbar') {
        // the bar under a whole group: colour of the parent cell
        ctx.fillStyle = this.palette(b.cell.primitives);
        ctx.fillRect(b.x + X_PAD - 2, b.y + b.h - Y_PAD - BAR, b.w - 2 * X_PAD + 1, BAR);
        return;
      }

      if (b.kind === 'header') {
        ctx.fillStyle = S.headerFill;
        ctx.fillRect(b.x + X_PAD - 1, b.y + Y_PAD - 1, b.w - 2 * X_PAD - 1, b.h - 2 * Y_PAD - 1);
        ctx.strokeStyle = hoverKey === `${L}.${b.cell.index}` ? S.hover : S.lineSoft;
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x + X_PAD - 1.5, b.y + Y_PAD - 1.5, b.w - 2 * X_PAD, b.h - 2 * Y_PAD);
        ctx.fillStyle = S.text;
        ctx.font = `700 ${FONT_H}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(b.cell.index), b.x + b.w / 2 - 1, b.y + b.h / 2 + 0.5);
        // the two dots the original draws to say "this one expands to the right"
        ctx.fillStyle = S.dim;
        ctx.fillRect(b.x + b.w - 3, b.y + b.h / 2 - 4, 2, 2);
        ctx.fillRect(b.x + b.w - 3, b.y + b.h / 2 + 2, 2, 2);
        return;
      }

      // a selectable box: a lone cell, or one sub-cell of a group
      const key = `${L}.${b.cell.index}.${b.sub.index}`;
      const on = sel.has(key);
      const isSub = b.kind === 'sub';

      ctx.fillStyle = on ? S.cellOn : S.cellOff;
      ctx.fillRect(b.x + X_PAD - 1, b.y + Y_PAD - 1, b.w - 2 * X_PAD - 1, b.h - 2 * Y_PAD - 1);
      ctx.strokeStyle = hoverKey === key ? S.hover : (on ? S.cellOnLine : S.lineSoft);
      ctx.lineWidth = hoverKey === key ? 1.5 : 1;
      ctx.strokeRect(b.x + X_PAD - 1.5, b.y + Y_PAD - 1.5, b.w - 2 * X_PAD, b.h - 2 * Y_PAD);

      if (isSub) {
        // sub-cells carry their own bar on top; the group's bar runs underneath
        ctx.fillStyle = this.palette(b.sub.primitives);
        ctx.fillRect(b.x + X_PAD - 1, b.y + Y_PAD - 2, b.w - 2 * X_PAD + 1, BAR);
      } else {
        ctx.fillStyle = this.palette(b.cell.primitives);
        ctx.fillRect(b.x + X_PAD - 2, b.y + b.h - Y_PAD - BAR, b.w - 2 * X_PAD + 1, BAR);
      }

      ctx.fillStyle = on ? S.textOn : S.text;
      const label = isSub ? String(b.sub.index) : String(b.cell.index);
      ctx.font = isSub
        ? `400 ${label.length > 2 ? 10 : 12}px ui-sans-serif, system-ui, sans-serif`
        : `700 ${FONT_H}px ui-sans-serif, system-ui, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, b.x + b.w / 2 - 1, b.y + b.h / 2 + 1);
    });
  }

  /** the info line the original shows while hovering */
  describe(hit) {
    if (!hit) return '';
    if (hit.kind === 'layer') {
      const n = hit.layer.cells.reduce((a, c) => a + c.subCells.length, 0);
      const v = hit.layer.cells.reduce((a, c) => a + c.volume, 0);
      return `layer ${hit.layer.layer} · ${hit.layer.cells.length} cells, ${n} selectable · volume ${v.toFixed(5)}`;
    }
    const L = hit.layer.layer, c = hit.cell;
    if (hit.kind === 'header') {
      return `${L}(${c.index}) · ${c.subCells.length} sub-cells · ${c.primitives} elem. cells ` +
             `[${c.facets}, ${c.vertices}, ${c.volume.toFixed(5)}]`;
    }
    const s = hit.sub;
    const name = c.subCells.length > 1 ? `${L}(${c.index}[${s.index}])` : `${L}(${c.index})`;
    return `${name} · ${s.primitives} elem. cells [${c.facets}, ${c.vertices}, ${s.volume.toFixed(5)}]`;
  }
}

/**
 * "Carve" has to be reachable on every platform. ctrl is the obvious key but on
 * macOS it is the secondary-click gesture and never arrives, so alt/option and
 * cmd both mean the same thing, and a right-click does too (see the contextmenu
 * handlers). shift always wins, so shift-alt is still "add".
 */
function modifiersOf(e) {
  const shift = e.shiftKey;
  return { shift, ctrl: !shift && (e.ctrlKey || e.metaKey || e.altKey), alt: e.altKey };
}

/**
 * One hue per distinct "number of congruent pieces", spread around the wheel in
 * increasing order — Selection.makeColors, which used HSB(hue, 0.8, 0.9).
 */
function buildPalette(outline) {
  const counts = new Set();
  for (const layer of outline)
    for (const cell of layer.cells) {
      counts.add(cell.primitives);
      for (const s of cell.subCells) counts.add(s.primitives);
    }
  const sorted = [...counts].sort((a, b) => a - b);
  const map = new Map();
  sorted.forEach((c, i) => map.set(c, hsb(i / sorted.length, 0.8, 0.9)));
  return (n) => map.get(n) || '#888';
}

function hsb(h, s, v) {
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    default: r = v; g = p; b = q;
  }
  return `rgb(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)})`;
}

function themeColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n, fallback) => (cs.getPropertyValue(n).trim() || fallback);
  const dark = document.documentElement.dataset.theme !== 'light';
  return {
    bg: v('--panel', dark ? '#12151c' : '#fff'),
    text: v('--text', dark ? '#e6e9f0' : '#12151c'),
    textOn: dark ? '#0b0d11' : '#12151c',
    dim: v('--dim', '#8b93a7'),
    line: v('--line', dark ? '#242a36' : '#dde1e8'),
    lineSoft: dark ? 'rgba(160,172,196,0.35)' : 'rgba(60,70,90,0.30)',
    cellOff: dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
    cellOn: v('--accent', '#f5b942'),
    cellOnLine: dark ? '#fff' : '#000',
    headerFill: dark ? 'rgba(120,140,200,0.22)' : 'rgb(230,230,255)',
    layerOn: dark ? 'rgba(245,185,66,0.22)' : 'rgba(245,185,66,0.30)',
    layerSome: dark ? 'rgba(245,185,66,0.09)' : 'rgba(245,185,66,0.13)',
    hover: v('--accent', '#f5b942'),
  };
}
