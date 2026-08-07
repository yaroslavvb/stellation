# Report — night session of 6 August 2026 (round 4)

Sources: the "more feedback" transcript (15:07–16:27), the addendum transcript
(16:38–16:58), and the Feedback 4 document. Deployed at
**https://stellation.mathornament.workers.dev**; the help panel (`?`) prints
the build, which should read *night-session fixes (round 4)*.

---

## 1. What was done — check each on the deployed app

### The regression you caught

**1.1 — Perspective changed when toggling a cell. Fixed at the root this time.**
*Check:* icosahedron, stellation symmetry C2v, expand a group in a high layer,
toggle sub-cells on and off. Nothing moves but the cells. Same on Windows.
*Comment:* round 3 pinned the ratio distance ÷ bounding-radius, which holds
foreshortening constant *for the bounding sphere* — but the camera still
travelled as the bound changed, and a moving camera changes the perspective of
everything that didn't change. The camera distance is now set **once per
arrangement**, from the radius of everything buildable, and selection changes
alter it by exactly nothing. Measured: distance identical to the last bit
across core-only, all, and empty selections.
*Raised:* 15:08 — "perspective changes when toggling cell".

### The modifier rework

**1.2 — Group operations only in the Cells table.**
*Check:* in the table, click toggles a box; <kbd>ctrl</kbd>-click (or shift)
toggles it **with its whole supporting set** — off if it was on, on if it was
off, and pressing again reverses it. Verified: ctrl on layer-3 from empty gives
{0,1,2,3}; again gives {}.
*Raised:* 15:22 — "multiple cell operation only in cell view"; 15:23 — "regular
click (toggle) and click + modifier (toggle supported cells)".

**1.3 — The 3-D view adds and removes exactly one cell.**
*Check:* shift-click a face — the single cell sitting on it appears (green).
ctrl-click — the single cell behind it goes (red). No cascade.
*Comment:* verified as a round trip: {0} + shift = {0,1}, then ctrl on the new
face = {0} again.
*Raised:* 15:10, 15:34 — "on 3d view, no toggle, just add or remove".

**1.4 — The diagram toggles the cell on either side of its plane.**
*Check:* shift-click a region — the cell *beneath* it toggles (gold); ctrl —
the cell *on top* (blue). The caption under the diagram names both neighbours
as you hover.
*Comment:* gold and blue, not green and red, per the instruction — these are
toggles, and in the 3-D view green and red mean add and remove. Verified as
double-toggle identities in both directions.
*Raised:* 15:32 — "one modifier toggles below, another above; don't use the red
and green because it's confusing".

### Cells table

**1.5 — The zeros are gone.**
*Check:* icosahedron, polyhedron symmetry C2v: rows of boxes now read 0 1 2 3…
*Comment:* every single-sub-cell box drew its sub-cell index, which is always
zero; multi-cell rows made it visible. Verified: a 7-orbit row labels 0–6.
*Raised:* 15:28 — "everything is 0's, but it should be 0, 1, etc".

**1.6 — Du Val letters where a lettering exists.**
*Check:* icosahedron under I<sub>h</sub>: the boxes read a b c d e₁ e₂ f₂ f₁
g₁ g₂ h. Lower the *stellation* symmetry — letters stay (they name the
orbits); change the *polyhedron* symmetry away from I<sub>h</sub> — they
correctly fall back to indices.
*Comment:* the orbit↔letter identification is the derivation in
`notes/research/r1` (e₁=20, e₂=60, f₂=12, f₁=120, g₁=30, g₂=60), the same one
the walkthrough's verified Ef₁ preset uses. Orbit primitive counts confirmed
live: L4=[20,60], L5=[12,120], L6=[30,60].
*Raised:* 15:59 — "use Du Val's notation when possible".

**1.7 — Scrollbars, and scroll reset.**
*Check:* open a wide table (low symmetry, expand groups): thin draggable bars
appear along the bottom and right. Switch back to a small solid: the table is
back at the left, not cropped where the wide one left it.
*Raised:* 15:26, 15:28, 16:06.

### Symmetry elements

**1.8 — Class colours and a legend.**
*Check:* icosahedron, elements on: the legend reads C₅ ×6 · C₃ ×10 · C₂ ×15 ·
m ×15 (and with rotoreflections, S₁₀ ×6 · S₆ ×10) — each class its own colour,
matching the geometry. D2-type groups give each of their inequivalent
half-turn axes its own colour, as asked.
*Comment:* two elements share a class iff some operation of the group carries
one onto the other — computed from the matrices, not a table.
*Raised:* 15:37, 15:38, 16:08.

**1.9 — Mirror planes are tori.**
*Check:* turn a mirror-bearing group edge-on: the rim reads as a bar, not a
vanishing line. Same thickness as the axis cylinders; the faint translucent
fill is still there (noticed, questioned, kept — «пусть будет, хорошо
выглядит»).
*Raised:* 15:38 — "should look like a torus, same thickness as axes".

**1.10 — Grey-out.**
*Check:* stellation symmetry I: the mirror-planes and rotoreflection
checkboxes disable (I has neither).
*Raised:* 15:40.

**1.11 — Marked on the diagram.**
*Check:* *mark on the diagram*: dots where axes pierce the drawing plane,
dashed lines where mirror planes cross it, in the class colours — the Java
applet's diagram overlay, restored.
*Raised:* addendum 16:56 and the doc's "addendum pass" item.

### Motion

**1.12 — A flick keeps it spinning.**
*Check:* drag briskly and release mid-motion: the solid spins on at that rate
until you catch it with the pointer. A slow release still just coasts to a
stop; fit/home also stop it.
*Raised:* 17:13 — "if I release early enough, it starts spinning".

### Make planes

**1.13 — The plane editor, ported.**
*Check:* Symmetry &amp; depth → **Make planes…** One plane per line:
`nx ny nz d [group]`. *Seed from current solid* fills the sheet from the
current solid's own planes (the Java dialog's starting values). Entering the
single line `0 0 1 1 Ih` builds a 30-plane arrangement — the rhombic
triacontahedron's, 13 layers — because the I<sub>h</sub> orbit of a 2-fold
axis direction has exactly 30 members. The symmetry dropdowns then offer every
group (nothing bounds a custom set); the sheet saves into and reopens from the
JSON document.
*Comment:* the engine was plane-based all along; this is the front door it
lacked. **Not done, deliberately:** fixing the Java app's own make-planes
dialog and its rotation issue — those need a Java build of the newest source
(Vladimir's own read: the jar is probably just old), and this session's scope
was the port. Listed in open questions.
*Raised:* 15:53, 16:42, and the doc's final line.

### Engine and records

**1.14 — Winding repair moved into core.js** (`orientFaces`), used by the
derivation tool; re-verified after the move (u39 → dodecahedron {0,1}).
*Raised:* 16:09 — "add consistent winding as suggested".

**1.15 — The ten vertices-at-infinity solids are documented** in
`notes/data-quality.md`, with the exact per-solid non-planarity (worst 1.155
at circumradius 1) and Vladimir's account of the clamping («я просто их сделал
на 100 или на 110»). The note's job is to stop anyone spending a day on an
unfixable fit.
*Raised:* 16:11.

**1.16 — GitHub Pages how-to** in `notes/github-pages-howto.md`: fork or push,
Settings → Pages → main /docs, plus the three gotchas (.nojekyll, the
uncontrollable 10-minute cache, relative paths).
*Raised:* 16:11:52.

**1.17 — Diagram crowding at far zoom-out** is reduced (strokes thin and fade
below 1×). Mitigation, not elimination: at that scale there are more lines
than pixels, and Vladimir's own verdict was that this fight costs more than it
pays. The doc still said "want no aliasing", so it is called out honestly here.
*Raised:* 16:05.

### Confirmed working during the session (no change needed)

Diagram-face dropdown (counts per symmetry — «шикарно»), collapse arrows
(«шикарно»), view-in-URL on reload («вот это я понимаю»), smoothing
(«приятно вращается … супер»), undo from the 3-D view («где отду? Шикарно»),
release-clears-highlight, translucent mirror wash (kept).

---

## 2. Outstanding — the short version

Full standing list in `notes/design/open-questions.md` (updated this round).

1. **Face-mode 3-D renderer** — the largest UI piece, deferred by quota;
   Vladimir expects it needs real WebGL treatment. ~a day.
2. **The 2-D clone** (new): the same app one dimension down — polygon, line
   arrangement, 1-D diagram with above/below — as the teaching bridge for
   exactly the below/above confusion this round's diagram semantics addressed.
   Design conversation at 16:13–16:27 was detailed and enthusiastic.
3. **Java app fixes** (make-planes dialog, rotation): need a Java build of the
   newest source; the jar in use is likely stale. Out of this session's scope.
4. **The essay** wants an editing pass, then the **merge-back**: clean the fork,
   merge into Vladimir's repository, hand over with the Pages how-to. His own
   closing instruction: finish this round, then a digestion break.
5. **Planes through the origin** — unchanged, three (now four) threads converge
   on it; still gated on the decision in `plane-representation.md`.
6. Small: no auto depth suggestion for custom plane sets; custom sessions
   restore from JSON, not from the URL; thumbnails still have no edges;
   Messner-style support-graph view noted as a possible feedback aid.
