/*
 * The Stellation app: pick a polyhedron, watch its face planes cut space into
 * cells, choose cells, get a stellated solid.
 */

import { Renderer3D } from './render3d.js';
import { DiagramView } from './diagram.js';
import { CellsPanel } from './cells.js';
import { labelKeys } from './platform.js';
import { toOFF, toOBJ, toSTL, writeStel, facePlanes, suggestDepth } from './core.js';
import { writePreset, readDocument, newDocumentName } from './preset.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const state = {
  catalog: null, symmetry: null, geometry: null,
  current: null,
  polySym: 'Ih', stellSym: 'I',
  depth: 20,
  depthAuto: true,          // until the user moves the slider
  outline: null,
  selected: new Set(),
  planeIndex: 0,
  building: false,
};

// ------------------------------------------------------------------ worker

let worker = null, msgId = 0;
const pending = new Map();

function startWorker() {
  worker?.terminate();
  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const { id, ok, data, error, progress } = e.data;
    const p = pending.get(id);
    if (!p) return;
    if (progress) { p.onProgress?.(progress); return; }
    pending.delete(id);
    ok ? p.resolve(data) : p.reject(new Error(error));
  };
  worker.onerror = (e) => {
    for (const [, p] of pending) p.reject(new Error(e.message || 'worker failed'));
    pending.clear();
  };
}

function call(type, payload, onProgress) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    worker.postMessage({ id, type, payload });
  });
}

// ------------------------------------------------------------------ boot

let renderer, diagram, cells;

async function boot() {
  const [catalog, symmetry, geometry] = await Promise.all([
    fetch('data/catalog.json').then(r => r.json()),
    fetch('data/symmetry.json').then(r => r.json()),
    fetch('data/geometry.json').then(r => r.json()),
  ]);
  Object.assign(state, { catalog, symmetry, geometry });

  try {
    renderer = new Renderer3D($('#view3d'));
    renderer.autoRotate = false;             // still by default; spin is opt-in
    const savedEdge = Number(localStorage.getItem('edgeWidth'));
    if (savedEdge > 0) {
      renderer.edgeWidth = savedEdge;
      $('#edgeWidth').value = savedEdge;
      $('#edgeWidthLabel').textContent = savedEdge.toFixed(1);
    }
    renderer.start();
    renderer.onPick = onPick3D;
    renderer.onPickHover = onHover3D;
  } catch (err) {
    $('#view3d').replaceWith(Object.assign(document.createElement('div'), {
      className: 'nogl', textContent: '3D view needs WebGL2, which this browser did not provide.',
    }));
  }

  diagram = new DiagramView($('#diagram'), {
    onToggle: (facet, mod) => applyToFacet(facet, mod),
    onHover: (facet) => {
      $('#hover2d').textContent = facet
        ? `layer ${facet.layer}${facet.ref ? ` · cell ${facet.ref[1]}${facet.ref[2] ? '[' + facet.ref[2] + ']' : ''}` : ''}`
        : '';
    },
  });

  cells = new CellsPanel($('#cells'), {
    onChange: () => refresh(),
    onHover: (hit) => { $('#cellInfo').textContent = cells.describe(hit); },
  });

  labelKeys();          // name the carve modifier for this platform

  wireControls();
  startWorker();
  applyTheme(localStorage.getItem('theme') || 'auto');   // now that the views exist

  // handy from the console, and what the browser tests drive
  window.stellation = { state, cells, diagram, renderer, call, select, refresh, applyToCell, openDocument };

  const hash = decodeURIComponent(location.hash.slice(1));
  const m = hash.match(/^([\w]+)(?:\/([\w()]+))?(?:\/([\w()]+))?(?:\/d(\d+))?(?:\/(\{.*\}))?$/);
  if (m && geometry[m[1]]) {
    await select(findItem(m[1]) || { file: m[1], name: m[1], symmetry: m[2] || 'Ih' },
                 { polySym: m[2], stellSym: m[3], cells: m[5],
                   depth: m[4] ? Number(m[4]) : undefined });
  } else {
    await select(findItem('u27'));
  }
}

function findItem(file) {
  for (const cat of state.catalog)
    for (const it of cat.items) if (it.file === file) return { ...it, category: cat.category };
  return null;
}

// ------------------------------------------------------------------ picking

/**
 * A click on a diagram region or on a face of the solid.
 *   plain  toggle this cell
 *   shift  add it and everything supporting it — the result always holds together
 *   ctrl   remove it and everything resting on it, for the same reason
 * `outward` is set when the gesture means "grow here": on the solid, shift-click
 * adds the cell sitting on the far side of the face you clicked.
 */
function applyToCell(key, mod) {
  if (!key) return;
  const sel = state.selected;
  if (mod.shift) {
    for (const k of cells.supportKeys(key)) sel.add(k);
  } else if (mod.ctrl) {
    for (const k of dependentKeys(key)) sel.delete(k);
  } else {
    sel.has(key) ? sel.delete(key) : sel.add(key);
  }
  refresh();
}

/** add or remove a set of keys, returning exactly what changed, so it can be undone */
function applyChange(keys, add) {
  const sel = state.selected, changed = new Set();
  for (const k of keys) {
    if (add ? !sel.has(k) : sel.has(k)) { add ? sel.add(k) : sel.delete(k); changed.add(k); }
  }
  return changed;
}

/** everything resting on `key`, transitively — mirror of CellsPanel.supportKeys */
function dependentKeys(key) {
  const out = new Set([key]);
  const stack = [key];
  while (stack.length) {
    const k = stack.pop();
    for (const t of (cells.byKey.get(k)?.sub.top || [])) {
      if (!out.has(t)) { out.add(t); stack.push(t); }
    }
  }
  return out;
}

function applyToFacet(facet, mod) {
  if (!facet?.ref) return;
  applyToCell(facet.ref.join('.'), mod);
}

/*
 * Clicking a cell means the same thing in all three views.
 *
 *   shift  add this cell and everything holding it up
 *   ctrl   remove this cell and everything resting on it
 *
 * They are inverses, so "click again to change your mind" is shift then ctrl
 * rather than a second click of the same kind. An earlier version made a
 * repeated shift-click undo itself, which read as shift-click sometimes
 * removing — the operation you asked for depended on what you had done last.
 * Two explicit gestures are worth more than one clever one.
 */

function onPick3D(hit, mod) {
  const mesh = state.mesh;
  if (!mesh) return;
  const inside = mesh.faceInside[hit.face];
  const outside = mesh.faceOutside[hit.face];

  if (mod.shift) {
    if (!outside) { setStatus('nothing further out on that face — raise the build depth', false); return; }
    applyChange(cells.supportKeys(outside), true);
  } else if (mod.ctrl) {
    if (!inside) { setStatus('no cell inside that face', false); return; }
    applyChange(dependentKeys(inside), false);
  } else {
    return;
  }
  refresh();
}

function onHover3D(hit, mod) {
  const mesh = state.mesh;
  if (!hit || !mesh) { $('#hover3d').textContent = ''; return; }
  const key = mod?.shift ? mesh.faceOutside[hit.face] : mesh.faceInside[hit.face];
  $('#hover3d').textContent = key
    ? `${mod?.shift ? 'grow' : 'carve'} ${key}`
    : (mod?.shift ? 'nothing further out' : '');
}

// ------------------------------------------------------------------ catalog

/*
 * The catalog is a specimen sheet: nothing but thumbnails, densely packed, with
 * the name of whatever you are pointing at spelled out along the bottom. Names
 * under every tile would triple the height and turn 121 solids into a scroll.
 *
 * It is built the first time the picker opens rather than at start-up — 121
 * thumbnails is about half a megabyte, which has no business delaying the first
 * render of the solid. Built that late, the images can load eagerly, so the
 * sheet never shows the half-filled grid lazy loading gives you inside a dialog.
 */
let catalogBuilt = false;
function ensureCatalog() {
  if (!catalogBuilt) { buildCatalog(); catalogBuilt = true; }
  $$('.poly').forEach(b => b.classList.toggle('active', b.dataset.file === state.current?.file));
}

function buildCatalog() {
  const host = $('#catalog');
  const chips = $('#catChips');
  host.innerHTML = '';
  chips.innerHTML = '';

  for (const cat of state.catalog) {
    const slug = cat.category.replace(/\W+/g, '-');

    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = cat.category;
    chip.onclick = () => host.querySelector(`#sec-${slug}`)
      .scrollIntoView({ behavior: 'smooth', block: 'start' });
    chips.appendChild(chip);

    const section = document.createElement('section');
    section.className = 'cat';
    section.id = `sec-${slug}`;
    section.innerHTML = `<h3><span>${cat.category}</span><em>${cat.items.length}</em></h3>`;

    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const item of cat.items) {
      const b = document.createElement('button');
      b.className = 'poly';
      b.dataset.file = item.file;
      b.dataset.name = item.name;
      b.dataset.sym = item.symmetry;
      b.dataset.cat = cat.category;
      b.setAttribute('aria-label', item.name);
      b.innerHTML = `<img src="img/poly/${item.file}_tmb.gif" alt="" width="46" height="46">`;
      b.onmouseenter = () => showFoot(item, cat.category);
      b.onfocus = () => showFoot(item, cat.category);
      b.onclick = () => {
        $('#catalogDialog').close();
        state.depthAuto = true;          // a new solid gets its own suggested depth
        select({ ...item, category: cat.category });
      };
      grid.appendChild(b);
    }
    section.appendChild(grid);
    host.appendChild(section);
  }

  host.onmouseleave = () => showFoot(state.current, state.current?.category);
  updateCatCount();
}

function showFoot(item, category) {
  if (!item) return;
  $('#footThumb').src = `img/poly/${item.file}_tmb.gif`;
  $('#footName').textContent = item.name;
  $('#footMeta').textContent = `${item.file} · ${item.symmetry} · ${category || ''}`;
}

function updateCatCount() {
  const vis = $$('.poly').filter(b => b.style.display !== 'none').length;
  $('#footCount').textContent = vis === 121 ? '121 solids' : `${vis} of 121`;
}

// ------------------------------------------------------------------ selection

async function select(item, opts = {}) {
  if (!item) return;
  state.current = item;
  state.polySym = opts.polySym || item.symmetry || 'Ih';
  state.stellSym = opts.stellSym || defaultStellSym(state.polySym);

  $$('.poly').forEach(b => b.classList.toggle('active', b.dataset.file === item.file));
  $('#pickName').textContent = item.name;
  $('#pickThumb').src = `img/poly/${item.file}_tmb.gif`;

  if (opts.depth != null) {
    setDepth(opts.depth, false);           // an opened document or a link fixes it
  } else if (state.depthAuto) {
    setDepth(suggestDepth(facePlanes(toPoly(state.geometry[item.file]))), true);
  }

  syncSymmetrySelects();
  await build(opts.cells);
}

const NO_LIMIT = 60;   // slider top = build every layer there is

function toPoly(g) {
  const vertices = [];
  for (let i = 0; i < g.v.length; i += 3) vertices.push({ x: g.v[i], y: g.v[i + 1], z: g.v[i + 2] });
  return { vertices, faces: g.f };
}

function setDepth(depth, auto) {
  state.depth = depth < 0 ? NO_LIMIT : depth;
  state.depthAuto = !!auto;
  $('#depth').value = state.depth;
  $('#depthLabel').textContent = state.depth >= NO_LIMIT ? 'every' : state.depth;
}

/** the rotation-only subgroup is the usual choice for building stellations */
function defaultStellSym(poly) {
  const map = { Ih: 'I', Oh: 'O', Td: 'T', Th: 'T', I: 'I', O: 'O', T: 'T' };
  return map[poly] || poly;
}

/*
 * Which symmetry groups may be offered.
 *
 * Not every group makes sense for every solid: asking for I (order 60) as the
 * stellation symmetry of a T-symmetric arrangement is not a lower symmetry at
 * all, and the result is meaningless. The Java applet lists, for a given solid,
 * only the subgroups of its own point group, and this reproduces that — but by
 * testing actual matrix containment rather than by carrying a hand-written
 * subgroup lattice, so it stays correct for the oriented variants (the "(O)"
 * groups are cubic-frame copies and belong to the octahedral families only).
 *
 * Cached: 85 groups against 5 parents is a few hundred thousand comparisons,
 * worth doing once rather than on every rebuild.
 */
const subgroupCache = new Map();

function matrixKey(m) {
  // quantised so that 0.9999999 and 1.0 are the same rotation
  let k = '';
  for (const v of m) k += (Math.round(v * 1e4) / 1e4 + 0) + ',';
  return k;
}

function subgroupsOf(parent) {
  if (subgroupCache.has(parent)) return subgroupCache.get(parent);
  const P = state.symmetry[parent];
  const names = Object.keys(state.symmetry).filter(n => state.symmetry[n].order > 0);
  let out;
  if (!P?.matrices?.length) {
    out = names;
  } else {
    const inParent = new Set(P.matrices.map(matrixKey));
    out = names.filter(n => {
      const G = state.symmetry[n];
      if (G.order > P.order) return false;
      return (G.matrices || []).every(m => inParent.has(matrixKey(m)));
    });
  }
  out.sort((a, b) => state.symmetry[b].order - state.symmetry[a].order || a.localeCompare(b));
  subgroupCache.set(parent, out);
  return out;
}

function fillSelect(id, names, value) {
  $(id).innerHTML = names.map(n =>
    `<option value="${n}"${n === value ? ' selected' : ''}>${n} (${state.symmetry[n].order})</option>`
  ).join('');
}

function syncSymmetrySelects() {
  // the solid's own point group bounds the polyhedron symmetry; that in turn
  // bounds the stellation symmetry, which must be a subgroup of it
  const own = state.current?.symmetry || 'Ih';
  const polyNames = subgroupsOf(own);
  if (!polyNames.includes(state.polySym)) state.polySym = polyNames[0] || own;
  fillSelect('#polySym', polyNames, state.polySym);

  const stellNames = subgroupsOf(state.polySym);
  if (!stellNames.includes(state.stellSym)) state.stellSym = state.polySym;
  fillSelect('#stellSym', stellNames, state.stellSym);
}

/*
 * Draggable splitters.
 *
 * The three panes are fixed fractions of the window, which is fine until a
 * deep arrangement makes the Cells table wider than its column — with C3
 * symmetry a row can run to twenty sub-cells. Rather than guess a width that
 * suits every solid, let the panes be resized, and remember where they were put.
 */
function installSplitters() {
  const root = document.documentElement;
  for (const [id, apply] of [
    ['#splitPanel', (e) => {
      const w = Math.min(720, Math.max(240, window.innerWidth - e.clientX));
      root.style.setProperty('--panel-w', w + 'px');
      localStorage.setItem('panelW', w);
    }],
    ['#splitViews', (e) => {
      const box = $('.views').getBoundingClientRect();
      const frac = Math.min(0.85, Math.max(0.15, (e.clientX - box.left) / box.width));
      root.style.setProperty('--views-a', frac + 'fr');
      root.style.setProperty('--views-b', (1 - frac) + 'fr');
      localStorage.setItem('viewsFrac', frac);
    }],
  ]) {
    const el = $(id);
    if (!el) continue;
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      el.classList.add('dragging');
      // capture throws for a pointer the browser is not tracking; it is an
      // optimisation for dragging past the splitter, never a precondition
      try { el.setPointerCapture?.(e.pointerId); } catch { /* nothing to capture */ }
      const move = (ev) => { apply(ev); renderer?.resize(); diagram?.draw(); cells?.draw(); };
      const up = () => {
        el.classList.remove('dragging');
        el.removeEventListener('pointermove', move);
        el.removeEventListener('pointerup', up);
      };
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    });
  }
  const w = Number(localStorage.getItem('panelW'));
  if (w >= 240) root.style.setProperty('--panel-w', w + 'px');
  const f = Number(localStorage.getItem('viewsFrac'));
  if (f > 0.1 && f < 0.9) {
    root.style.setProperty('--views-a', f + 'fr');
    root.style.setProperty('--views-b', (1 - f) + 'fr');
  }
}

// ------------------------------------------------------------------ build

async function build(cellsString) {
  if (state.building) return;
  state.building = true;
  setStatus('building the plane arrangement…', true);

  const g = state.geometry[state.current.file];
  renderer?.resetScale();      // a new arrangement re-frames; edits within one do not
  const polyM = state.symmetry[state.polySym]?.matrices || state.symmetry.E.matrices;
  const subM = state.symmetry[state.stellSym]?.matrices || null;

  try {
    const info = await call('build', {
      geometry: g, matrices: polyM, subMatrices: subM,
      maxIntersection: state.depth >= NO_LIMIT ? -1 : state.depth, maxLayer: 1000,
    }, ({ done, total }) => setStatus(`intersecting plane ${done} of ${total}…`, true, done / total));

    state.outline = info.outline;
    cells.setOutline(info.outline);
    renderLegend();

    if (cellsString) {
      const { selected } = await call('parseCells', { cells: cellsString });
      state.selected = new Set(selected);
    } else {
      const { keys } = await call('layerKeys', { n: 1 });
      state.selected = new Set(keys);
    }

    await refresh();
    const slow = info.ms > 5000 && !state.depthAuto;
    setStatus(`${info.planes} planes · ${info.facets.toLocaleString()} facets · ` +
              `${info.layers} layers · ${(info.ms / 1000).toFixed(info.ms > 5000 ? 1 : 3)} s` +
              (slow ? ' — lower the depth for a quicker rebuild' : ''), false);
  } catch (err) {
    setStatus('failed: ' + err.message, false);
    startWorker();
  } finally {
    state.building = false;
  }
}

async function refresh() {
  if (!state.outline) return;
  const selected = [...state.selected];
  const { mesh, diagram: dia } = await call('both', { selected, planeIndex: state.planeIndex });

  state.mesh = mesh;
  renderer?.setMesh(mesh, mesh.faceLayers);
  diagram.setData(dia);
  cells.setSelected(state.selected);

  $('#stats').innerHTML =
    `<b>${mesh.stats.vertices}</b> v · <b>${mesh.stats.faces}</b> f · ` +
    `<b>${mesh.stats.cells}</b> cells · vol <b>${mesh.stats.volume.toFixed(4)}</b>`;

  const { cells: str } = await call('formatCells', { selected });
  state.cellsString = str;
  $('#cellsString').value = str;
  location.hash = `${state.current.file}/${state.polySym}/${state.stellSym}/d${state.depth}/${str}`;
}

/** the key to the bar colours: one swatch per distinct number of congruent pieces */
function renderLegend() {
  const host = $('#cellsLegend');
  if (!host) return;
  const entries = cells.legend();
  host.innerHTML = '<span class="legend-label">pieces per cell</span>' + entries.map(e =>
    `<span class="legend-item"><i style="background:${e.color}"></i>${e.count}</span>`).join('');
}

// ------------------------------------------------------------------ controls

function wireControls() {
  $('#pickPoly').onclick = () => {
    ensureCatalog();
    $('#catalogDialog').showModal();
    showFoot(state.current, state.current?.category);
    $('#search').focus();
    document.querySelector('.poly.active')?.scrollIntoView({ block: 'center' });
  };
  $('#catalogClose').onclick = () => $('#catalogDialog').close();

  $('#polySym').onchange = (e) => {
    state.polySym = e.target.value;
    const allowed = subgroupsOf(state.polySym);
    if (!allowed.includes(state.stellSym)) state.stellSym = state.polySym;
    syncSymmetrySelects();
    build();
  };
  $('#stellSym').onchange = (e) => { state.stellSym = e.target.value; build(); };
  $('#depth').oninput = (e) => setDepth(Number(e.target.value), false);
  $('#depth').onchange = () => build();
  $('#planeIndex').onchange = (e) => { state.planeIndex = Number(e.target.value) || 0; refresh(); };

  $('#selectCore').onclick = async () => {
      const { keys } = await call('layerKeys', { n: 1 });
    state.selected = new Set(keys); refresh();
  };
  $('#selectNone').onclick = () => { state.selected.clear(); refresh(); };
  $('#selectAll').onclick = async () => {
      const { keys } = await call('layerKeys', { n: state.outline.length });
    state.selected = new Set(keys); refresh();
  };
  $('#growLayer').onclick = async () => {
      let n = 0;
    state.outline.forEach((layer, l) => {
      if (layer.cells.some(c => c.subCells.some(s => state.selected.has(`${l}.${c.index}.${s.index}`)))) n = l + 1;
    });
    const { keys } = await call('layerKeys', { n: Math.min(n + 1, state.outline.length) });
    state.selected = new Set(keys); refresh();
  };

  $('#autoRotate').onchange = (e) => { if (renderer) renderer.autoRotate = e.target.checked; };
  $('#showEdges').onchange = (e) => { if (renderer) { renderer.showEdges = e.target.checked; renderer.draw(); } };
  $('#fitView').onclick = () => { renderer?.fit(); setStatus('rescaled to fit', false); };

  installSplitters();

  $('#edgeWidth').oninput = (e) => {
    const w = Number(e.target.value);
    $('#edgeWidthLabel').textContent = w.toFixed(1);
    localStorage.setItem('edgeWidth', w);
    if (renderer) { renderer.edgeWidth = w; renderer.draw(); }
  };
  $('#showAllFacets').onchange = (e) => { diagram.showAll = e.target.checked; diagram.draw(); };

  $('#cellsString').onchange = async (e) => {
    try {
      const { selected } = await call('parseCells', { cells: e.target.value });
          state.selected = new Set(selected);
      refresh();
    } catch (err) { setStatus('could not read that cell string: ' + err.message, false); }
  };

  $('#exportOff').onclick = () => download(`${name()}.off`, toOFF(state.mesh));
  $('#exportObj').onclick = () => download(`${name()}.obj`, toOBJ(state.mesh));
  $('#exportStl').onclick = () => download(`${name()}.stl`, toSTL(state.mesh, name()));
  $('#saveJson').onclick = () => {
    const docName = newDocumentName();
    download(`${docName}.json`, writePreset({
      name: docName,
      polyhedron: state.current.name, file: state.current.file,
      polySymmetry: state.polySym, stellSymmetry: state.stellSym,
      planeDepth: state.depth, cells: state.cellsString,
      diagramFace: state.planeIndex,
      showEdges: $('#showEdges').checked,
      showAllFacets: $('#showAllFacets').checked,
      spin: $('#autoRotate').checked,
    }), 'application/json');
  };
  $('#exportStel').onclick = () => download(`${name()}.stel`, writeStel({
    polyhedron: state.current.name, polySymmetry: state.polySym,
    stellSymmetry: state.stellSym, cells: state.cellsString,
  }));
  $('#exportSvg').onclick = () => download(`${name()}-diagram.svg`, diagram.toSVG(), 'image/svg+xml');
  $('#exportPng').onclick = () => {
    const a = document.createElement('a');
    a.download = `${name()}.png`;
    a.href = renderer.snapshot();
    a.click();
  };

  $('#loadDoc').onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await openDocument(await file.text(), file.name);
    e.target.value = '';
  };

  $$('.sample').forEach(b => {
    b.onclick = async () => openDocument(await fetch(`samples/${b.dataset.file}`).then(r => r.text()), b.dataset.file);
  });

  $('#help').onclick = () => $('#helpDialog').showModal();
  $('#helpClose').onclick = () => $('#helpDialog').close();

  $('#themeBtn').onclick = cycleTheme;

  const runSearch = () => {
    const q = $('#search').value.trim().toLowerCase();
    $$('.poly').forEach(b => {
      const hay = `${b.dataset.name} ${b.dataset.file} ${b.dataset.sym} ${b.dataset.cat}`.toLowerCase();
      b.style.display = (!q || hay.includes(q)) ? '' : 'none';
    });
    $$('.cat').forEach(sec => {
      const any = [...sec.querySelectorAll('.poly')].some(b => b.style.display !== 'none');
      sec.style.display = any ? '' : 'none';
    });
    updateCatCount();
    const first = $$('.poly').find(b => b.style.display !== 'none');
    if (q && first) {
      showFoot({ name: first.dataset.name, file: first.dataset.file, symmetry: first.dataset.sym },
               first.dataset.cat);
    } else if (q && !first) {
      $('#footThumb').removeAttribute('src');
      $('#footName').textContent = 'nothing matches';
      $('#footMeta').textContent = `no solid named, filed or symmetric as “${$('#search').value.trim()}”`;
    }
  };
  $('#search').oninput = runSearch;
  $('#search').onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    const first = $$('.poly').find(b => b.style.display !== 'none');
    first?.click();
  };

  $('#catalogDialog').addEventListener('close', () => { $('#search').value = ''; runSearch(); });
  $('#catalogDialog').addEventListener('cancel', () => { $('#search').value = ''; });
}

// ------------------------------------------------------------------ theme

function cycleTheme() {
  const order = ['auto', 'light', 'dark'];
  const cur = document.documentElement.dataset.themePref || 'auto';
  const next = order[(order.indexOf(cur) + 1) % order.length];
  localStorage.setItem('theme', next);
  applyTheme(next);
}

function applyTheme(pref) {
  const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.documentElement.dataset.themePref = pref;
  $('#themeBtn').textContent = pref === 'auto' ? '◐' : pref === 'dark' ? '●' : '○';
  $('#themeBtn').title = `Theme: ${pref}`;
  if (renderer) {
    renderer.background = dark ? [0.055, 0.06, 0.078] : [0.965, 0.97, 0.977];
    renderer.draw();
  }
  cells?.draw();
  diagram?.draw();
}
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((document.documentElement.dataset.themePref || 'auto') === 'auto') applyTheme('auto');
});

// ------------------------------------------------------------------ misc

const name = () => `${state.current.file}-${state.polySym}-${state.stellSym}`;

/** open either our JSON preset or an original .stel file */
async function openDocument(text, filename = '') {
  let doc;
  try {
    doc = readDocument(text);
  } catch (err) {
    setStatus(`could not read ${filename || 'that file'}: ${err.message}`, false);
    return;
  }

  // JSON records the catalog file id; .stel only has the human name
  let item = doc.file ? findItem(doc.file) : null;
  if (!item && doc.polyhedron) {
    for (const cat of state.catalog)
      for (const it of cat.items)
        if (it.name.toLowerCase() === doc.polyhedron.toLowerCase()) item = { ...it, category: cat.category };
  }
  if (!item) {
    setStatus(`${filename || 'that file'} names "${doc.polyhedron}", which is not in the catalog`, false);
    return;
  }

  state.planeIndex = doc.diagramFace || 0;
  $('#planeIndex').value = state.planeIndex;

  if (doc.source === 'json') {
    for (const [id, val] of [['#showEdges', doc.showEdges], ['#showAllFacets', doc.showAllFacets], ['#autoRotate', doc.spin]]) {
      $(id).checked = !!val;
      $(id).dispatchEvent(new Event('change'));
    }
  }

  await select(item, { polySym: doc.polySymmetry, stellSym: doc.stellSymmetry, cells: doc.cells, depth: doc.planeDepth ?? undefined });
  setStatus(`opened ${doc.name || filename} (${doc.source === 'json' ? 'JSON' : '.stel'})`, false);
}

function download(filename, text, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function setStatus(text, busy, frac) {
  $('#status').textContent = text;
  $('#status').classList.toggle('busy', !!busy);
  const bar = $('#progress');
  bar.style.display = busy ? '' : 'none';
  bar.style.setProperty('--frac', frac == null ? 0 : frac);
}

applyTheme(localStorage.getItem('theme') || 'auto');
boot();
