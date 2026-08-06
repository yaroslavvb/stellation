/*
 * The historical page — live figures for a chronological tour.
 *
 * Unlike the walkthrough, which lives on the icosahedron alone, this page moves
 * between solids: the octahedron for Kepler's stella octangula, the dodecahedron
 * for the three star polyhedra, the rhombic dodecahedron for Escher's, and so
 * on. Each arrangement is built once, on demand, the first time a figure that
 * needs it scrolls into view — building all of them up front would cost a second
 * or so for solids most readers will never reach.
 */

import {
  buildStellation, extractMesh, createDiagram, selectedSubCells,
  parseCells, formatCells, selKey, subCellForFacet, facePlanes, suggestDepth,
} from './core.js';
import { Renderer3D } from './render3d.js';
import { DiagramView } from './diagram.js';
import { CellsPanel } from './cells.js';

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let geometry = null, symmetry = null, catalog = null;
const built = new Map();          // file -> {stel, outline}

function toPoly(g) {
  const vertices = [];
  for (let i = 0; i < g.v.length; i += 3) vertices.push({ x: g.v[i], y: g.v[i + 1], z: g.v[i + 2] });
  return { vertices, faces: g.f };
}

function itemFor(file) {
  for (const cat of catalog) for (const it of cat.items) if (it.file === file) return it;
  return null;
}

/** the rotation-only subgroup, which is what lets a chiral cell split */
const SUBGROUP = { Ih: 'I', Oh: 'O', Td: 'T', Th: 'T' };

function build(file, symName) {
  if (built.has(file)) return built.get(file);
  const poly = toPoly(geometry[file]);
  const sym = symName || itemFor(file)?.symmetry || 'Ih';
  const sub = SUBGROUP[sym] || sym;
  const stel = buildStellation(poly, symmetry[sym].matrices, {
    subMatrices: symmetry[sub]?.matrices,
    maxIntersection: suggestDepth(facePlanes(poly)),
  });
  const key = s => `${s.layer}.${s.cellIndex}.${s.index}`;
  const outline = stel.cellLayers.map((layer, l) => ({
    layer: l,
    cells: layer.map((o, c) => ({
      index: c, primitives: o.cells.length, facets: o.nFacets,
      vertices: o.nVertices, volume: o.volume,
      subCells: o.subCells.map(s => ({
        index: s.index, primitives: s.cells.length, volume: s.volume,
        bottom: [...(s.bottom || [])].map(key), top: [...(s.top || [])].map(key),
      })),
    })),
  }));
  const rec = { stel, outline, sym, sub };
  built.set(file, rec);
  return rec;
}

// ---------------------------------------------------------------- figure

/*
 * <div class="hfig" data-poly="u10" data-cells="{0,1}" data-parts="cells solid"
 *      data-goal="{0,1}" data-goal-name="the stella octangula">
 *
 * With data-goal, the figure becomes a puzzle: the reader has to reach that
 * selection themselves, and the figure says so when they do.
 */
class HFigure {
  constructor(el) {
    this.el = el;
    this.file = el.dataset.poly;
    this.parts = (el.dataset.parts || 'cells solid').split(/\s+/);
    this.goal = el.dataset.goal || null;
    this.goalName = el.dataset.goalName || 'it';
    this.started = false;
  }

  /** built lazily — see the note at the top of the file */
  start() {
    if (this.started) return;
    this.started = true;
    const rec = build(this.file, this.el.dataset.sym);
    this.stel = rec.stel;
    this.outline = rec.outline;
    this.selected = parseCells(this.stel, this.el.dataset.cells ?? (this.goal ? '{0}' : '{0}'));
    this.render();
    this.refresh();
  }

  render() {
    const el = this.el;
    el.innerHTML = '';

    if (this.goal) {
      const banner = document.createElement('div');
      banner.className = 'goal';
      banner.innerHTML =
        `<span class="goal-tag">Build it</span>` +
        `<span class="goal-text">Make <b>${this.goalName}</b> from the ${itemFor(this.file)?.name ?? this.file}.</span>` +
        `<button class="goal-hint">hint</button>` +
        `<button class="goal-solve">show me</button>`;
      el.appendChild(banner);
      this.banner = banner;
      banner.querySelector('.goal-hint').onclick = () => this.hint();
      banner.querySelector('.goal-solve').onclick = () => { this.setCells(this.goal); };
    }

    const grid = document.createElement('div');
    grid.className = 'fig-grid parts-' + this.parts.length;
    el.appendChild(grid);

    if (this.parts.includes('cells')) {
      const box = pane(grid, 'Cells');
      const wrap = document.createElement('div');
      wrap.className = 'fig-cells';
      const cv = document.createElement('canvas');
      wrap.appendChild(cv);
      box.appendChild(wrap);
      this.cells = new CellsPanel(cv, {
        onChange: () => this.refresh(),
        onHover: (h) => { this.info.textContent = h ? this.cells.describe(h) : ''; },
      });
      this.cells.setOutline(this.outline);
    }

    if (this.parts.includes('solid')) {
      const box = pane(grid, 'The solid');
      const wrap = document.createElement('div');
      wrap.className = 'fig-view';
      const cv = document.createElement('canvas');
      wrap.appendChild(cv);
      box.appendChild(wrap);
      try {
        this.renderer = new Renderer3D(cv);
        this.renderer.autoRotate = this.el.dataset.spin !== 'false';
        this.renderer.edgeWidth = 1;
        this.renderer.start();
      } catch { wrap.textContent = 'WebGL2 unavailable'; }
    }

    if (this.parts.includes('diagram')) {
      const box = pane(grid, 'The face plane');
      const wrap = document.createElement('div');
      wrap.className = 'fig-view';
      const cv = document.createElement('canvas');
      wrap.appendChild(cv);
      box.appendChild(wrap);
      this.diagram = new DiagramView(cv, {
        onToggle: (facet, mod) => {
          if (!facet.ref) return;
          const k = facet.ref.join('.');
          if (mod.shift) for (const s of this.cells?.supportKeys(k) || [k]) this.selected.add(s);
          else this.selected.has(k) ? this.selected.delete(k) : this.selected.add(k);
          this.refresh();
        },
      });
    }

    const foot = document.createElement('div');
    foot.className = 'fig-foot';
    this.readout = document.createElement('code');
    this.stats = document.createElement('span');
    this.stats.className = 'fig-stats';
    foot.append(this.readout, this.stats);
    el.appendChild(foot);

    this.info = document.createElement('div');
    this.info.className = 'fig-info';
    el.appendChild(this.info);
  }

  setCells(str) {
    this.start();
    this.selected = parseCells(this.stel, str);
    this.refresh();
  }

  /** nudge without solving: name the next layer that is still missing */
  hint() {
    const goalSet = parseCells(this.stel, this.goal);
    for (const k of goalSet) if (!this.selected.has(k)) {
      const [l, c] = k.split('.');
      this.info.textContent = `try layer ${l}, cell ${c}`;
      return;
    }
    for (const k of this.selected) if (!goalSet.has(k)) {
      const [l, c] = k.split('.');
      this.info.textContent = `layer ${l}, cell ${c} should not be there`;
      return;
    }
    this.info.textContent = 'that is already it';
  }

  refresh() {
    const subs = selectedSubCells(this.stel, this.selected);
    const mesh = extractMesh(subs, this.stel.pool);
    this.renderer?.setMesh(mesh, mesh.facetRefs.map(f => f.layer));
    this.cells?.setSelected(this.selected);

    if (this.diagram) {
      const d = createDiagram(this.stel, 0, subs, 0);
      if (d) this.diagram.setData({
        planeIndex: 0, extent: d.extent,
        facets: d.facets.map(f => {
          const sc = subCellForFacet(f.facet);
          return { poly: f.poly, layer: f.layer, selected: f.selected,
                   ref: sc ? [sc.layer, sc.cellIndex, sc.index] : null };
        }),
      });
    }

    const str = formatCells(this.stel, this.selected);
    this.readout.textContent = str;
    const vol = subs.reduce((a, s) => a + s.volume, 0);
    this.stats.innerHTML = mesh.faces.length
      ? `<b>${mesh.vertices.length}</b> v · <b>${mesh.faces.length}</b> f · vol <b>${vol.toFixed(3)}</b>`
      : 'nothing selected';

    if (this.goal) {
      const won = str === this.goal;
      this.banner.classList.toggle('won', won);
      this.banner.querySelector('.goal-text').innerHTML = won
        ? `<b>That's it — ${this.goalName}.</b>`
        : `Make <b>${this.goalName}</b> from the ${itemFor(this.file)?.name ?? this.file}.`;
    }
  }
}

function pane(parent, title) {
  const box = document.createElement('div');
  box.className = 'fig-pane';
  const h = document.createElement('h4');
  h.textContent = title;
  box.appendChild(h);
  parent.appendChild(box);
  return box;
}

// ---------------------------------------------------------------- boot

async function boot() {
  [geometry, symmetry, catalog] = await Promise.all([
    fetch('data/geometry.json').then(r => r.json()),
    fetch('data/symmetry.json').then(r => r.json()),
    fetch('data/catalog.json').then(r => r.json()),
  ]);

  const figs = new Map();
  $$('.hfig').forEach(el => figs.set(el.id, new HFigure(el)));

  // build a figure the first time it comes near the viewport
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) {
      figs.get(e.target.id)?.start();
      io.unobserve(e.target);
    }
  }, { rootMargin: '300px 0px' });
  figs.forEach((f, id) => io.observe(document.getElementById(id)));

  $$('[data-target]').forEach(btn => {
    btn.onclick = () => {
      const f = figs.get(btn.dataset.target);
      if (!f) return;
      f.start();
      if (btn.dataset.cells) f.setCells(btn.dataset.cells);
      $$(`[data-target="${btn.dataset.target}"]`).forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
    };
  });

  const applyTheme = (pref) => {
    const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.themePref = pref;
    $('#themeBtn').textContent = pref === 'auto' ? '◐' : pref === 'dark' ? '●' : '○';
    for (const f of figs.values()) {
      if (f.renderer) { f.renderer.background = dark ? [0.055, 0.06, 0.078] : [0.965, 0.97, 0.977]; f.renderer.draw(); }
      f.cells?.draw(); f.diagram?.draw();
    }
  };
  $('#themeBtn').onclick = () => {
    const order = ['auto', 'light', 'dark'];
    const cur = document.documentElement.dataset.themePref || 'auto';
    const next = order[(order.indexOf(cur) + 1) % order.length];
    localStorage.setItem('theme', next);
    applyTheme(next);
  };
  applyTheme(localStorage.getItem('theme') || 'auto');

  // the timeline rail
  const rail = $('#rail');
  const secs = $$('section[id]');
  if (rail) {
    secs.forEach(s => {
      const a = document.createElement('a');
      a.href = '#' + s.id;
      a.innerHTML = `<em>${s.dataset.year || ''}</em>${s.dataset.short || s.id}`;
      rail.appendChild(a);
    });
    const obs = new IntersectionObserver(es => {
      for (const e of es) if (e.isIntersecting) {
        rail.querySelectorAll('a').forEach(a =>
          a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id));
      }
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(s => obs.observe(s));
  }

  $('#loading')?.remove();
  window.historical = { figs, built, build };
}

boot();
