/*
 * Derive a stellation's cell selection from the star polyhedron itself.
 *
 * The problem this solves: the Brückner grid, and the history page, can only
 * link a figure to the app if somebody has worked out which cells of which
 * arrangement make that figure up. Doing that by hand takes an evening per
 * solid and is exactly the sort of thing that goes quietly wrong.
 *
 * But it is decidable. A star polyhedron whose faces lie in the face planes of
 * a convex solid B *is* a selection of cells from B's plane arrangement — the
 * arrangement is a partition of space, so every cell is either wholly inside
 * the star or wholly outside it, and which one is answered by the winding
 * number of the star's own surface about the cell's centre.
 *
 *   w(p) = (1/4π) · Σ_triangles Ω(p; a, b, c)
 *
 * with Ω the signed solid angle (Van Oosterom & Strackee). For a closed
 * oriented surface this is an integer everywhere off the surface, and it is the
 * *density* of the star, not merely 0/1 — the small stellated dodecahedron has
 * w = 3 in its core. Any non-zero value means "material here".
 *
 * REFUSING BAD INPUT is half the point. A winding number is only defined for a
 * closed, consistently oriented surface, and if you hand this a mesh that is
 * not one it will still return numbers — plausible, wrong numbers. So every
 * candidate is checked first: each directed edge must appear exactly once and
 * its reverse exactly once. A solid that fails is reported and skipped, never
 * guessed at.
 *
 * Self-intersecting faces are fine and are the normal case here. A pentagram
 * fanned from its first vertex is a valid 2-chain whose boundary is the
 * pentagram, so the signed solid angles still sum to the right density.
 *
 * Usage:  node tools/derive-stellation.mjs [--out FILE] [--only u34,u35]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  facePlanes, buildStellation, selectedSubCells, extractMesh, formatCells, selKey,
} from '../web/js/core.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const WEB = path.join(HERE, '..', 'web');
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const OUT = arg('--out', path.join(HERE, '..', 'notes', 'derived-stellations.json'));
const ONLY = arg('--only', '')?.split(',').filter(Boolean);

const geometry = JSON.parse(fs.readFileSync(path.join(WEB, 'data/geometry.json')));
const catalog = JSON.parse(fs.readFileSync(path.join(WEB, 'data/catalog.json')));
const symmetry = JSON.parse(fs.readFileSync(path.join(WEB, 'data/symmetry.json')));

const meta = {};
for (const cat of catalog) for (const it of cat.items) meta[it.file] = { ...it, category: cat.category };

const toPoly = (g) => {
  const vertices = [];
  for (let i = 0; i < g.v.length; i += 3) vertices.push({ x: g.v[i], y: g.v[i + 1], z: g.v[i + 2] });
  return { vertices, faces: g.f };
};

// ------------------------------------------------------------------ topology

/**
 * Make the surface consistently oriented, or refuse.
 *
 * The catalog lists each face's vertices in *some* order, and nothing in the
 * file format promises those orders agree with one another. They mostly do not:
 * taken as given, a majority of these solids have some directed edge appearing
 * twice, which reads as "not a surface" when it is only "not yet oriented".
 *
 * Orientation is recoverable, and uniquely so on a connected orientable
 * surface: walk the face adjacency, and whenever a neighbour traverses the
 * shared edge the *same* way round, flip it. Two things can go wrong, and both
 * are fatal rather than repairable, so both are refused:
 *
 *   - an undirected edge used by other than two faces — not a closed surface;
 *   - a flip that contradicts one already made — the surface is non-orientable,
 *     a Möbius band or Klein bottle, and has no inside for a winding number to
 *     count.
 */
function orient(poly) {
  const faces = poly.faces.map(f => f.slice());
  const edgeFaces = new Map();                     // undirected edge -> [faceIdx…]
  const ek = (a, b) => (a < b ? `${a}_${b}` : `${b}_${a}`);
  faces.forEach((f, fi) => {
    for (let i = 0; i < f.length; i++) {
      const a = f[i], b = f[(i + 1) % f.length];
      if (a === b) return;
      const k = ek(a, b);
      if (!edgeFaces.has(k)) edgeFaces.set(k, []);
      edgeFaces.get(k).push(fi);
    }
  });
  for (const [k, fs] of edgeFaces) {
    if (fs.length !== 2) return { ok: false, why: `edge ${k} borders ${fs.length} faces, not 2 — not a closed surface` };
  }

  const hasDirected = (f, a, b) => {
    for (let i = 0; i < f.length; i++) if (f[i] === a && f[(i + 1) % f.length] === b) return true;
    return false;
  };

  const done = new Array(faces.length).fill(false);
  let flips = 0;
  for (let seed = 0; seed < faces.length; seed++) {
    if (done[seed]) continue;
    done[seed] = true;
    const queue = [seed];
    while (queue.length) {
      const fi = queue.pop();
      const f = faces[fi];
      for (let i = 0; i < f.length; i++) {
        const a = f[i], b = f[(i + 1) % f.length];
        const [x, y] = edgeFaces.get(ek(a, b));
        const gi = x === fi ? y : x;
        // a face can meet itself along an edge only in a degenerate listing
        if (gi === fi) return { ok: false, why: 'a face borders itself across an edge' };
        const g = faces[gi];
        const agrees = hasDirected(g, b, a);        // opposite traversal = consistent
        if (done[gi]) {
          if (!agrees) return { ok: false, why: 'orientation is contradictory — the surface is non-orientable' };
          continue;
        }
        if (!agrees) { g.reverse(); flips++; }
        done[gi] = true;
        queue.push(gi);
      }
    }
  }
  return { ok: true, faces, flips };
}

/** every vertex on or inside every face plane */
function isConvex(poly, planes) {
  for (const p of planes) {
    for (const v of poly.vertices) {
      if (p.n.x * v.x + p.n.y * v.y + p.n.z * v.z > p.d + 1e-7) return false;
    }
  }
  return true;
}

// ------------------------------------------------------------------ winding

/** the triangle fan chain of every face, in the surface's own orientation */
function triangulate(poly) {
  const tris = [];
  for (const face of poly.faces) {
    const p0 = poly.vertices[face[0]];
    for (let i = 1; i < face.length - 1; i++) {
      tris.push([p0, poly.vertices[face[i]], poly.vertices[face[i + 1]]]);
    }
  }
  return tris;
}

/**
 * Winding number of a closed oriented surface about `p`.
 * Van Oosterom–Strackee: tan(Ω/2) = a·(b×c) / (|a||b||c| + (a·b)|c| + (a·c)|b| + (b·c)|a|),
 * summed with atan2 so the branch is handled and the total is exact modulo 4π.
 */
function winding(tris, p) {
  let sum = 0;
  for (const [A, B, C] of tris) {
    const ax = A.x - p.x, ay = A.y - p.y, az = A.z - p.z;
    const bx = B.x - p.x, by = B.y - p.y, bz = B.z - p.z;
    const cx = C.x - p.x, cy = C.y - p.y, cz = C.z - p.z;
    const la = Math.hypot(ax, ay, az), lb = Math.hypot(bx, by, bz), lc = Math.hypot(cx, cy, cz);
    if (la < 1e-12 || lb < 1e-12 || lc < 1e-12) return null;      // p sits on a vertex
    const num = ax * (by * cz - bz * cy) + ay * (bz * cx - bx * cz) + az * (bx * cy - by * cx);
    const den = la * lb * lc
      + (ax * bx + ay * by + az * bz) * lc
      + (ax * cx + ay * cy + az * cz) * lb
      + (bx * cx + by * cy + bz * cz) * la;
    sum += 2 * Math.atan2(num, den);
  }
  return sum / (4 * Math.PI);
}

// ------------------------------------------------------------------ matching

/** a scale-free signature of a solid's plane directions, for pairing star with base */
function planeSignature(planes) {
  return planes
    .map(p => [p.n.x, p.n.y, p.n.z].map(v => (Math.round(v * 1e4) / 1e4 + 0).toFixed(4)).join(','))
    .sort().join(';');
}

/**
 * The factor that carries B's planes onto X's, or null if they are not the same
 * arrangement at a different size. Same directions AND one common ratio: a solid
 * whose planes merely point the same way is a different beast.
 */
function scaleBetween(px, pb) {
  if (px.length !== pb.length) return null;
  const key = p => [p.n.x, p.n.y, p.n.z].map(v => (Math.round(v * 1e4) / 1e4 + 0).toFixed(4)).join(',');
  const byDir = new Map(pb.map(p => [key(p), p]));
  let s = null;
  for (const p of px) {
    const q = byDir.get(key(p));
    if (!q) return null;
    const r = p.d / q.d;
    if (s === null) s = r;
    else if (Math.abs(r - s) > 1e-6 * Math.max(1, s)) return null;
  }
  return s;
}

// ------------------------------------------------------------------ the run

const solids = Object.keys(geometry).filter(f => !ONLY.length || ONLY.includes(f));
const planesOf = new Map();
for (const f of Object.keys(geometry)) planesOf.set(f, facePlanes(toPoly(geometry[f])));

const sigOf = new Map();
for (const [f, p] of planesOf) sigOf.set(f, planeSignature(p));

// candidate bases: solids sharing a plane-direction signature
const bySig = new Map();
for (const [f, s] of sigOf) { if (!bySig.has(s)) bySig.set(s, []); bySig.get(s).push(f); }

const convex = new Map();
for (const f of Object.keys(geometry)) convex.set(f, isConvex(toPoly(geometry[f]), planesOf.get(f)));

const results = [];
const refused = [];
const unmatched = [];

for (const star of solids) {
  // a convex solid is not a stellation of anything: it *is* the core
  if (convex.get(star)) continue;

  const raw = toPoly(geometry[star]);
  const o = orient(raw);
  if (!o.ok) { refused.push({ file: star, name: meta[star]?.name, why: o.why }); continue; }
  const P = { vertices: raw.vertices, faces: o.faces };

  const px = planesOf.get(star);
  /*
   * Every solid sharing this plane set shares one arrangement — the arrangement
   * depends on the planes and nothing else, and scaleBetween has already
   * insisted the distances are proportional. So there is exactly one base worth
   * naming, and it is the convex one: the core whose faces are the layer-0
   * facets, which is what somebody opening the app would pick from the catalog.
   */
  const peers = (bySig.get(sigOf.get(star)) || [])
    .filter(f => f !== star && convex.get(f))
    // the geometry file carries more solids than the picker offers, and a base
    // nobody can select is no use to anyone: prefer one that is in the catalog
    .sort((a, b) => (meta[b] ? 1 : 0) - (meta[a] ? 1 : 0)
                 || geometry[a].f.length - geometry[b].f.length
                 || a.localeCompare(b));
  if (!peers.length) { unmatched.push({ file: star, name: meta[star]?.name, why: 'no convex solid shares its face planes' }); continue; }

  const sym = meta[star]?.symmetry || 'Ih';
  const stellSym = { Ih: 'I', Oh: 'O', Td: 'T', Th: 'T' }[sym] || sym;
  const M = symmetry[sym]?.matrices;
  const S = symmetry[stellSym]?.matrices;
  if (!M) continue;

  let got = false;
  for (const base of peers.slice(0, 1)) {
    const s = scaleBetween(px, planesOf.get(base));
    if (s === null) continue;

    // put the star into the base's frame, so cell centres and surface agree
    const scaled = { vertices: P.vertices.map(v => ({ x: v.x / s, y: v.y / s, z: v.z / s })),
                     faces: P.faces };
    const T = triangulate(scaled);

    let stel;
    try {
      stel = buildStellation(toPoly(geometry[base]), M, { subMatrices: S, maxIntersection: -1 });
    } catch (err) { continue; }

    // one verdict per sub-cell, and every primitive cell in it must agree —
    // a sub-cell is the smallest thing the UI can select, so a split verdict
    // means this star is not expressible in this arrangement
    const selected = new Set();
    let split = 0, ambiguous = 0;
    for (let l = 0; l < stel.cellLayers.length; l++) {
      for (const orbit of stel.cellLayers[l]) {
        for (const sub of orbit.subCells) {
          let vote = null;
          for (const cell of sub.cells) {
            const w = winding(T, cell.center);
            if (w === null) { ambiguous++; continue; }
            const nearInt = Math.abs(w - Math.round(w));
            if (nearInt > 0.02) { ambiguous++; continue; }   // centre lies on the surface
            const inside = Math.round(w) !== 0;
            if (vote === null) vote = inside;
            else if (vote !== inside) { split++; vote = null; break; }
          }
          if (vote) selected.add(selKey(l, orbit.index ?? stel.cellLayers[l].indexOf(orbit), sub.index));
        }
      }
    }
    if (!selected.size) continue;

    // independent check: the volume of the cells we chose against a Monte-Carlo
    // measure of {winding != 0} taken from the star's surface alone
    const subs = selectedSubCells(stel, selected);
    const vol = subs.reduce((a, x) => a + x.volume, 0);
    const mc = monteCarloVolume(T, scaled, 60000);
    const err = mc.vol > 0 ? Math.abs(vol - mc.vol) / mc.vol : 1;

    results.push({
      star, starName: meta[star]?.name || star,
      base, baseName: meta[base]?.name || base,
      polySymmetry: sym, stellSymmetry: stellSym,
      scale: Number(s.toFixed(9)),
      cells: formatCells(stel, selected),
      subCells: selected.size,
      volume: Number(vol.toFixed(6)),
      monteCarloVolume: Number(mc.vol.toFixed(6)),
      volumeError: Number(err.toFixed(4)),
      verified: err < 0.03 && !split,
      splitSubCells: split,
      ambiguousCells: ambiguous,
    });
    got = true;
  }
  if (!got) unmatched.push({ file: star, name: meta[star]?.name });
}

/** Lebesgue measure of {winding != 0}, from the surface only — nothing to do with cells */
function monteCarloVolume(tris, poly, n) {
  let R = 0;
  for (const v of poly.vertices) R = Math.max(R, Math.hypot(v.x, v.y, v.z));
  R *= 1.001;
  const box = (2 * R) ** 3;
  let hit = 0, used = 0;
  /*
   * mulberry32, seeded fixed so the number is reproducible run to run.
   * A plain linear congruential generator is the wrong tool here: consecutive
   * triples from one fall on a small family of planes, and this samples points
   * in triples, so the estimate picks up a bias of its own instead of measuring
   * the solid's.
   */
  let seed = 0x9e3779b9;
  const rnd = () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < n; i++) {
    const p = { x: (rnd() * 2 - 1) * R, y: (rnd() * 2 - 1) * R, z: (rnd() * 2 - 1) * R };
    const w = winding(tris, p);
    if (w === null) continue;
    used++;
    if (Math.round(w) !== 0) hit++;
  }
  return { vol: used ? box * hit / used : 0, samples: used };
}

results.sort((a, b) => a.star.localeCompare(b.star));
const out = {
  generatedBy: 'tools/derive-stellation.mjs',
  method: 'winding number (Van Oosterom-Strackee solid angle) of the star surface at every primitive cell centre',
  note: 'verified = the chosen cells\' volume agrees with a Monte-Carlo measure of {winding != 0} to 3%',
  counts: {
    derived: results.length,
    verified: results.filter(r => r.verified).length,
    refusedNotClosedOrOriented: refused.length,
    noMatchingBase: unmatched.length,
  },
  derived: results,
  refused,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');

console.log(`derived ${results.length} selections, ${out.counts.verified} verified`);
console.log(`refused ${refused.length} solids (not a closed oriented surface)`);
for (const r of refused.slice(0, 12)) console.log(`  ${r.file.padEnd(5)} ${r.why}  ${r.name || ''}`);
console.log(`wrote ${OUT}`);
