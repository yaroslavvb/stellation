/*
 * The Stellation app: pick a polyhedron, watch its face planes cut space into
 * cells, choose cells, get a stellated solid.
 */

import { Renderer3D, layerColor } from './render3d.js';
import { DiagramView } from './diagram.js';
import { toOFF, toOBJ, toSTL, writeStel } from './core.js';

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

const state = {
  catalog: null,
  symmetry: null,
  geometry: null,
  current: null,        // {file, name, symmetry, category}
  polySym: 'Ih',
  stellSym: 'I',
  depth: 12,
  outline: null,
  selected: new Set(),
  planeIndex: 0,
  building: false,
};

// ------------------------------------------------------------------ worker

let worker = null;
let msgId = 0;
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

let renderer, diagram;

async function boot() {
  const [catalog, symmetry, geometry] = await Promise.all([
    fetch('data/catalog.json').then(r => r.json()),
    fetch('data/symmetry.json').then(r => r.json()),
    fetch('data/geometry.json').then(r => r.json()),
  ]);
  state.catalog = catalog;
  state.symmetry = symmetry;
  state.geometry = geometry;

  try {
    renderer = new Renderer3D($('#view3d'));
    renderer.start();
  } catch (err) {
    $('#view3d').replaceWith(Object.assign(document.createElement('div'), {
      className: 'nogl', textContent: '3D view needs WebGL2, which this browser did not provide.',
    }));
  }

  diagram = new DiagramView($('#diagram'), {
    onToggle: (facet) => {
      if (!facet.ref) return;
      const key = facet.ref.join('.');
      state.selected.has(key) ? state.selected.delete(key) : state.selected.add(key);
      refresh();
    },
    onHover: (facet) => {
      $('#hover').textContent = facet
        ? `layer ${facet.layer}${facet.ref ? ` · cell ${facet.ref[1]}${facet.ref[2] ? '[' + facet.ref[2] + ']' : ''}` : ''}`
        : '';
    },
  });

  buildCatalog();
  wireControls();
  startWorker();

  // deep link: #u27/Ih/I/{0,1}
  const hash = decodeURIComponent(location.hash.slice(1));
  const m = hash.match(/^([\w]+)(?:\/([\w()]+))?(?:\/([\w()]+))?(?:\/(\{.*\}))?$/);
  if (m && geometry[m[1]]) {
    await select(findItem(m[1]) || { file: m[1], name: m[1], symmetry: m[2] || 'Ih' },
                 { polySym: m[2], stellSym: m[3], cells: m[4] });
  } else {
    await select(findItem('u27'));
  }
}

function findItem(file) {
  for (const cat of state.catalog)
    for (const it of cat.items) if (it.file === file) return { ...it, category: cat.category };
  return null;
}

// ------------------------------------------------------------------ catalog UI

function buildCatalog() {
  const host = $('#catalog');
  host.innerHTML = '';
  for (const cat of state.catalog) {
    const section = document.createElement('section');
    section.className = 'cat';
    const h = document.createElement('h3');
    h.innerHTML = `<span>${cat.category}</span><em>${cat.items.length}</em>`;
    h.onclick = () => section.classList.toggle('collapsed');
    section.appendChild(h);

    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const item of cat.items) {
      const b = document.createElement('button');
      b.className = 'poly';
      b.dataset.file = item.file;
      b.title = `${item.name} (${item.file}, ${item.symmetry})`;
      b.innerHTML =
        `<img src="img/poly/${item.file}_tmb.gif" alt="" loading="lazy" width="48" height="48">` +
        `<span>${item.name}</span>`;
      b.onclick = () => select({ ...item, category: cat.category });
      grid.appendChild(b);
    }
    section.appendChild(grid);
    // the exotic categories start collapsed; the classics are what people want
    if (cat.category.includes('nonconvex') || cat.category.includes('duals to')) {
      section.classList.add('collapsed');
    }
    host.appendChild(section);
  }
}

// ------------------------------------------------------------------ selection

async function select(item, opts = {}) {
  if (!item) return;
  state.current = item;
  state.polySym = opts.polySym || item.symmetry || 'Ih';
  state.stellSym = opts.stellSym || defaultStellSym(state.polySym);

  $$('.poly').forEach(b => b.classList.toggle('active', b.dataset.file === item.file));
  $('#title').textContent = item.name;
  $('#subtitle').textContent = `${item.file} · ${item.category || ''}`;

  syncSymmetrySelects();
  await build(opts.cells);
}

/** the rotation-only subgroup is the usual choice for building stellations */
function defaultStellSym(poly) {
  const map = { Ih: 'I', Oh: 'O', Td: 'T', Th: 'T', I: 'I', O: 'O', T: 'T' };
  return map[poly] || poly;
}

function syncSymmetrySelects() {
  // Symmetry.getMatrices returns nothing for a handful of names in the original
  // (C8..C12 and friends were never filled in) — offering them would only break.
  const names = Object.keys(state.symmetry)
    .filter(n => state.symmetry[n].order > 0)
    .sort((a, b) => state.symmetry[b].order - state.symmetry[a].order || a.localeCompare(b));
  for (const [id, val] of [['#polySym', state.polySym], ['#stellSym', state.stellSym]]) {
    const sel = $(id);
    sel.innerHTML = names.map(n =>
      `<option value="${n}"${n === val ? ' selected' : ''}>${n} (order ${state.symmetry[n].order})</option>`
    ).join('');
  }
}

// ------------------------------------------------------------------ build

async function build(cellsString) {
  if (state.building) return;
  state.building = true;
  setStatus('building the plane arrangement…', true);

  const g = state.geometry[state.current.file];
  const polyM = state.symmetry[state.polySym]?.matrices || state.symmetry.E.matrices;
  const subM = state.symmetry[state.stellSym]?.matrices || null;

  try {
    const info = await call('build', {
      geometry: g,
      matrices: polyM,
      subMatrices: subM,
      maxIntersection: state.depth,
      maxLayer: 1000,
    }, ({ done, total }) => setStatus(`intersecting plane ${done} of ${total}…`, true, done / total));

    state.outline = info.outline;
    state.info = info;

    if (cellsString) {
      const { selected } = await call('parseCells', { cells: cellsString });
      state.selected = new Set(selected);
    } else {
      // start on the core cell: the original polyhedron itself
      const { keys } = await call('layerKeys', { n: 1 });
      state.selected = new Set(keys);
    }

    renderLayers();
    await refresh();
    setStatus(`${info.planes} planes · ${info.facets.toLocaleString()} facets · ` +
              `${info.layers} layers · built in ${info.ms} ms`, false);
  } catch (err) {
    setStatus('failed: ' + err.message, false);
    startWorker();   // a crashed worker cannot be reused
  } finally {
    state.building = false;
  }
}

async function refresh() {
  if (!state.outline) return;
  const selected = [...state.selected];
  const { mesh, diagram: dia } = await call('both', { selected, planeIndex: state.planeIndex });

  renderer?.setMesh(mesh, mesh.faceLayers);
  diagram.setData(dia);
  state.mesh = mesh;

  $('#stats').innerHTML =
    `<b>${mesh.stats.vertices}</b> vertices · <b>${mesh.stats.faces}</b> faces · ` +
    `<b>${mesh.stats.cells}</b> cells · volume <b>${mesh.stats.volume.toFixed(4)}</b>`;

  const { cells } = await call('formatCells', { selected });
  state.cellsString = cells;
  $('#cellsString').value = cells;
  location.hash = `${state.current.file}/${state.polySym}/${state.stellSym}/${cells}`;

  $$('#layers input').forEach(cb => {
    cb.checked = state.selected.has(cb.dataset.key);
  });
  $$('#layers .layer').forEach(row => {
    const boxes = [...row.querySelectorAll('input')];
    const on = boxes.filter(b => b.checked).length;
    row.classList.toggle('partial', on > 0 && on < boxes.length);
    row.classList.toggle('full', on === boxes.length && on > 0);
  });
}

// ------------------------------------------------------------------ layer list

function renderLayers() {
  const host = $('#layers');
  host.innerHTML = '';
  state.outline.forEach((layer, l) => {
    const row = document.createElement('div');
    row.className = 'layer';
    const c = layerColor(l).map(v => Math.round(v * 255));

    const head = document.createElement('div');
    head.className = 'layer-head';
    head.innerHTML = `<i style="background:rgb(${c})"></i><b>layer ${l}</b>` +
                     `<em>${layer.cells.length} cell${layer.cells.length === 1 ? '' : 's'}</em>`;
    head.onclick = () => {
      const boxes = [...row.querySelectorAll('input')];
      const turnOn = boxes.some(b => !b.checked);
      boxes.forEach(b => {
        turnOn ? state.selected.add(b.dataset.key) : state.selected.delete(b.dataset.key);
      });
      refresh();
    };
    row.appendChild(head);

    const cells = document.createElement('div');
    cells.className = 'cells';
    layer.cells.forEach((cell) => {
      cell.subCells.forEach((sub) => {
        const key = `${l}.${cell.index}.${sub.index}`;
        const label = document.createElement('label');
        label.className = 'cell';
        const chiral = cell.subCells.length > 1;
        label.title = `${sub.primitives} congruent pieces · ${cell.facets} facets each · volume ${sub.volume.toFixed(5)}` +
                      (chiral ? `\nchiral half ${sub.index + 1} of ${cell.subCells.length}` : '');
        label.innerHTML =
          `<input type="checkbox" data-key="${key}">` +
          `<span>${cell.index}${chiral ? `<sup>${sub.index ? 'R' : 'L'}</sup>` : ''}</span>` +
          `<em>×${sub.primitives}</em>`;
        label.querySelector('input').onchange = (e) => {
          e.target.checked ? state.selected.add(key) : state.selected.delete(key);
          refresh();
        };
        cells.appendChild(label);
      });
    });
    row.appendChild(cells);
    host.appendChild(row);
  });
}

// ------------------------------------------------------------------ controls

function wireControls() {
  $('#polySym').onchange = (e) => { state.polySym = e.target.value; build(); };
  $('#stellSym').onchange = (e) => { state.stellSym = e.target.value; build(); };
  $('#depth').oninput = (e) => {
    state.depth = Number(e.target.value);
    $('#depthLabel').textContent = state.depth;
  };
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
  $('#exportStel').onclick = () => download(`${name()}.stel`, writeStel({
    polyhedron: state.current.name,
    polySymmetry: state.polySym,
    stellSymmetry: state.stellSym,
    cells: state.cellsString,
  }));
  $('#exportSvg').onclick = () => download(`${name()}-diagram.svg`, diagram.toSVG(), 'image/svg+xml');
  $('#exportPng').onclick = () => {
    const a = document.createElement('a');
    a.download = `${name()}.png`;
    a.href = renderer.snapshot();
    a.click();
  };

  $('#loadStel').onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await loadStelText(text);
    e.target.value = '';
  };

  $$('.sample').forEach(b => {
    b.onclick = async () => {
      const text = await fetch(`samples/${b.dataset.file}`).then(r => r.text());
      await loadStelText(text);
    };
  });

  $('#help').onclick = () => $('#helpDialog').showModal();
  $('#helpClose').onclick = () => $('#helpDialog').close();

  $('#search').oninput = (e) => {
    const q = e.target.value.trim().toLowerCase();
    $$('.poly').forEach(b => {
      const hit = !q || b.title.toLowerCase().includes(q);
      b.style.display = hit ? '' : 'none';
    });
    $$('.cat').forEach(sec => {
      const any = [...sec.querySelectorAll('.poly')].some(b => b.style.display !== 'none');
      sec.style.display = any ? '' : 'none';
      if (q && any) sec.classList.remove('collapsed');
    });
  };
}

async function loadStelText(text) {
  const { parseStel } = await import('./core.js');
  const spec = parseStel(text);
  let item = null;
  if (spec.polyhedron) {
    for (const cat of state.catalog)
      for (const it of cat.items)
        if (it.name.toLowerCase() === spec.polyhedron.toLowerCase()) item = { ...it, category: cat.category };
  }
  if (!item) { setStatus(`the file names "${spec.polyhedron}", which is not in the catalog`, false); return; }
  await select(item, { polySym: spec.polySymmetry, stellSym: spec.stellSymmetry, cells: spec.cells });
}

const name = () => `${state.current.file}-${state.polySym}-${state.stellSym}`;

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

boot();
