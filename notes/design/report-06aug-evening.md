# Report — evening session of 6 August 2026

Source: the timestamped transcript `06aug26 vladimir bulatov (home, stellation
feedback)` and the annotated screenshot document, plus the three fable-report
items marked for action at 14:04.

Deployed at **https://stellation.mathornament.workers.dev** — every item in
part 1 can be checked there. The help panel (`?`) prints which build is loaded.

---

## 1. What was done

Each item gives the check to run, then a comment on what was actually wrong.

### Bugs

**1.1 — Resizing the 3-D pane changed the perspective.**
*Check:* drag the splitter between the 3-D view and the diagram, slowly, while
watching a long straight edge. It stays straight.
*Comment:* the camera distance was computed from the *narrower* of the two
field-of-view angles, so that a tall thin canvas would not clip the solid
sideways. But that angle depends on the aspect ratio, so the camera moved
whenever the canvas was reshaped, and moving a camera is exactly what changes
foreshortening. The distance is now fixed to a constant multiple of the solid's
radius; a narrow canvas is framed by scaling the projection instead, which is a
flat 2-D magnification and cannot bend a line. Measured: distance ÷ radius is
now bit-identical (3.303898972) at 1600×600, 900×900 and 300×1200.
*Raised:* 13:35, 13:36 — "changing size of canvas changes perspective, this is a
bug, неприемлимо".

**1.2 — Toggling the core changed the perspective, on Windows only.**
*Check:* click cell 0 on and off repeatedly. Nothing but the cell changes.
*Comment:* same root cause from the other side. The radius used for the camera
was floored at 1, so any selection smaller than the first one left the camera too
far back and the picture flattened. The Windows-only symptom was the Cells panel
gaining a classic scrollbar as its contents changed, which resized the canvas —
macOS overlay scrollbars take no width, which is why it never appeared on the
Mac. The floor is gone; perspective is now invariant under every selection, from
R = 0.4 to R = 6.
*Raised:* 13:33 — "clicking zero here changes perspective on Windows, but on my
MacBook it doesn't".

**1.3 — Releasing shift left the highlight on.**
*Check:* hover a face with shift held, then let go without moving the mouse. The
outline disappears.
*Comment:* the highlight only ever updated on pointer motion, and letting go of a
key is not motion. Key events now replay the last pointer position with the new
modifier state, in all three views.
*Raised:* 13:41 — "bug: releasing shift, doesn't kill highlighting".

**1.4 — The highlight claimed a click would work when it would not.**
*Check:* press *all*, then hover the outside of the solid with shift. The outline
is dim and the caption reads "nothing further out on this face". With ctrl it is
bright.
*Comment:* dimmed rather than dropped — you still want to see where you are
pointing, you just want to know the click is spent before spending it.
*Raised:* 13:42 — "highlighting should be dimmed if it's impossible to add or
removed".

### Features

**1.5 — Undo and redo.**
*Check:* build something, press *clear*, then <kbd>ctrl</kbd>+<kbd>Z</kbd>.
Buttons sit beside *core / + layer / all / clear*;
<kbd>ctrl</kbd>+<kbd>shift</kbd>+<kbd>Z</kbd> and <kbd>ctrl</kbd>+<kbd>Y</kbd>
redo, and <kbd>cmd</kbd> works too, so the same keys work on both machines.
*Comment:* snapshots, not deltas — a selection is a few thousand short strings,
so a hundred of them cost less than one rebuild, and a snapshot cannot drift out
of step with what it describes. History is cleared when the arrangement changes,
because nothing before that applies. This is the fix for the *actual* complaint
at 14:00: carving from a high cell takes its whole supporting set, which reaches
the core, and there is no way to reconstruct what was there from what is left.
*Raised:* 13:37, 14:00.

**1.6 — Green adds, red removes, in all three views.**
*Check:* hold shift and move over the solid, the diagram and the Cells table in
turn; then ctrl. Same two colours everywhere, including the captions under each
view and the key list in the panel.
*Comment:* one exported palette, used by the WebGL outline, the 2-D diagram and
the canvas table, so they cannot drift apart.
*Raised:* 13:40 — "shift and control should have different colors … removing is
red, adding is green"; 13:40:47 — "consistent across all 3 views".

**1.7 — Symmetry elements are solid geometry and are occluded.**
*Check:* View → symmetry elements → rotation axes. Press *home*. An axis running
behind the solid is hidden by it. Two further toggles add mirror planes and
rotoreflection (Sₙ) axes.
*Comment:* the axes were flat lines painted over the finished picture, so you
could not tell which side of the solid one came out of. They are now capped
cylinders drawn into the same depth buffer as the stellation — Vladimir's own
suggestion of representing them as convex segments so the existing viewer can
handle them. Verified against group theory: I_h → 31 rotation axes (6+10+15), 15
mirrors, 16 Sₙ axes; O_h → 13, 9, 7; E, Cs, Ci → none.
*Judgement call:* mirror planes are drawn as a solid rim with the faintest wash
inside, not as fully translucent discs. Fifteen translucent discs compound into
an opaque ball that hides the solid — I built that first and it was unusable.
*Raised:* 13:03, 13:06, 13:26, 13:54.

**1.8 — Turning the solid is smoothed, and a flick coasts.**
*Check:* drag slowly with small mouse movements — no stutter. Flick and let go —
it carries on and settles without wobbling back.
*Comment:* motion is banked in a buffer and a fixed fraction of the remainder is
spent each frame; on release the recent pointer speed is added to the buffer. A
first-order filter rather than the spring-and-friction model described on the
recording — same smoothing, but it cannot overshoot, so there is no damping ratio
to tune and no ringing to tune out. Nothing is lost: the whole buffer is
eventually spent, so a drag turns the solid by exactly as much as was asked.
*Raised:* 13:12, 13:14.

**1.9 — Diagram face is a dropdown of the faces that actually differ.**
*Check:* cuboctahedron, both symmetries O_h. The dropdown has exactly two
entries: *triangle · 8 planes* and *square · 6 planes*. Lower the stellation
symmetry to T and the eight triangles split into 4 + 4, as they should.
*Comment:* it was a number field with no upper bound, so most values silently did
nothing. The list is the orbits of the face planes under the chosen symmetry,
found by pushing each plane's closest point through every matrix of the group and
seeing which plane it lands on — the same interning trick that groups the cells,
so the two agree by construction. Each entry is named after the polygon at the
centre of its diagram, which for a convex solid is the solid's own face there.
*Raised:* 13:17, 13:20.

**1.10 — The collapse arrow points back the way it opened.**
*Check:* a solid with sub-cells, e.g. icosahedron at I_h/T. ▸ opens a group, ◂
closes it. The arrow and the hidden-part count are larger and heavier.
*Raised:* 13:28 — "it should be < instead of down"; "arrows and numbers … should
be more prominent, more bold (can use more horizontal space)".

**1.11 — The view is kept in the URL and in saved documents.**
*Check:* turn the solid, reload. Same angle. Copy the URL to another browser:
same picture. Save JSON and reopen it: same picture.
*Comment:* the hash gains a `/v` segment carrying the orientation quaternion and
the zoom, to four decimals; the JSON gains a `camera` block. Every segment stays
optional, so links written before today still open. Written with `replaceState`,
so turning the solid does not fill the back button.
*Raised:* 13:31.

**1.12 — A stale build can no longer be served silently.**
*Check:* the help panel prints the build. Response headers on `/js/*`, `/css/*`
and `*.html` are `Cache-Control: no-cache`.
*Comment:* a good part of the session went on a bug that had been fixed an hour
earlier — the browser had an old `app.js`, and neither
<kbd>ctrl</kbd>+<kbd>shift</kbd>+<kbd>R</kbd> nor <kbd>ctrl</kbd>+<kbd>F5</kbd>
shifted it reliably. `no-cache` does not mean "do not cache"; it means
"revalidate before use", so repeat visits still cost one conditional request and
get a bodyless 304. GitHub Pages sends `max-age=600` and gives you no way to
change it, which is one more reason the site now lives on Cloudflare.
*Raised:* 13:57 — "collapsing isn't working for some reason". It was working. The
tab was old.

### The three fable-report items

**1.13 — Bow-tie normals (item 1).**
*Check:* the small rhombihexacron, great rhombidodecacron and five others now
build from correct planes. Measured off-plane error before 0.73, after 5×10⁻¹⁵.
*Comment:* Newell's method sums a **signed** area, and a crossed quadrilateral —
a bow tie — has two lobes wound opposite ways whose contributions cancel. The sum
collapses to rounding error and normalising it gives a direction made of noise.
**413 faces across 15 solids** are affected. Where the sum collapses, the plane is
now fitted to the vertices instead, taking the two spokes from vertex 0 whose
cross product is largest. Result: solids whose faces do not, in the catalog data,
lie in a plane at all — the ten hemi-duals — are unaffected, because for a
genuinely non-planar polygon Newell's area-weighted average is the right answer
and is not degenerate. The seven whose faces *are* planar go from wrong to
correct at machine precision: **d23, d26, d44, d55, d61, d68, d78**. That is
exactly the "7 catalog solids" the fable report predicted, arrived at
independently.

**1.14 — Declare the skipped planes (item 2).**
*Check:* open `#u09/Oh/O/d20`. The status line reads **⚠ 4 of 7 planes** and the
tooltip explains that three pass exactly through the centre.
*Comment:* this is the one failure mode that looks perfectly healthy — you get a
stellation, it is just a stellation of a *different solid*. `facePlanes` now
counts what it drops and why (central, degenerate, duplicate) and the counts ride
up to the status line. Note that the ten affected solids are not in the picker —
they are the ones commented out of `PolyNames.java` — so today this fires only
for a URL naming one directly. It is instrumentation for when the plane work in
`plane-representation.md` is done, and a guard against the same thing happening
quietly to something else.

**1.15 — Winding-number derivation tool (item 3).**
*Where:* `tools/derive-stellation.mjs`; output `notes/derived-stellations.json`.
*Result:* **22 selections derived, 20 verified**, 25 solids refused, 61 with no
usable base.
*Comment:* a star polyhedron whose faces lie in a convex solid's face planes *is*
a selection of cells from that solid's arrangement, and which cells is decided by
the winding number of the star's own surface about each cell's centre (signed
solid angles, Van Oosterom–Strackee). The requirement to refuse non-orientable
input is the important half: a winding number is only defined for a closed
oriented surface, and given anything else the arithmetic still returns
plausible, wrong numbers. The tool first repairs orientation where it can — the
catalog does not promise consistent face winding — and refuses where it cannot.

*Independent check of the whole pipeline:* it re-derived the four Kepler–Poinsot
solids from scratch, and the dodecahedron's three stellations came out as exactly
{0,1}, {0,1,2}, {0,1,2,3} — small stellated dodecahedron, great dodecahedron,
great stellated dodecahedron — which is the textbook result. Each selection is
also checked against a Monte-Carlo measure of {winding ≠ 0} taken from the
surface alone, agreeing to better than 1%.

*Honest shortfall:* the fable report estimated 16 → ~55 clickable figures. This
gives 20. The 61 unreachable solids have no convex solid in the catalog sharing
their face planes, and are precisely what Vladimir's custom-plane-set proposal at
14:06 would unlock.

*Deliberately not done:* the results are **not** written into
`docs/bruckner-grid.html`. That page belongs to a parallel session and the
standing instruction is not to touch it. The JSON is the hand-off.

---

## 2. Outstanding questions, problems and next steps

The full version is `notes/design/open-questions.md`. In brief:

### Needs a decision from you, not more code

1. **The "polyhedron" symmetry control.** Vladimir confirmed what it does — apply
   a chosen group to the solid's plane set. But the dropdown is restricted to
   subgroups of the solid's own group, and a subgroup can never add planes, so
   the control is inert by construction. Widening it back restores his
   icosahedron-under-cubic-symmetry experiment; it also re-opens the confusion
   that restriction was added to fix. Three options are laid out; I have not
   picked one.
2. **The cell numbers.** They are positions in a sorted list, not names. Should
   the boxes show Du Val's letters where we know them (the icosahedron) and fall
   back to indices elsewhere? Inconsistent, but far more meaningful for the one
   solid everybody studies.
3. **The catalog thumbnails.** Re-rendering all 121 from our own engine would
   give real edges and consistent lighting, and would lose the character of the
   POV-Ray originals. Vladimir noted the source data is not to hand.

### The largest piece of remaining work

4. **A face-mode 3-D view.** Vladimir described it precisely at 13:47–13:50: the
   present renderer is specialised for convex cells and draws outward faces only;
   a face viewer must draw both sides, and then a face through the origin has no
   outer side at all. His sketch — pick one plane, draw that face in space, add
   cells to one side or the other — is the missing bridge between the diagram and
   the solid, and the most likely cure for the volumes-versus-surfaces confusion
   that has now come up in three consecutive sessions. A second renderer, not a
   toggle. Roughly a day.

5. **Custom plane sets.** By Vladimir's own count this adds about **71 further
   Brückner figures**, and it is the same 61 solids the derivation tool cannot
   reach today. Engine work: the arrangement builder already takes a plane list,
   so the missing parts are a way to specify one and a UI for it.

6. **Planes through the origin.** Unchanged, still not started, per instruction.
   `notes/design/plane-representation.md` has the finding, two prototypes and an
   acceptance test. Three separate threads now converge on it: the twenty
   commented-out solids, the face-mode renderer above, and the 25 solids the
   winding tool refuses as non-orientable.

### Smaller, known, unfixed

7. **Zoom centres differently in the two panes** — on the view centre in 3-D, on
   the pointer in the diagram. Set aside at 11:53 as an unnecessary improvement.
8. **The Cells table pans but does not advertise it.** No drawn scrollbar;
   Vladimir found the panning only after being told.
9. **Diagram orientation for a triangular face** has no canonical answer.
   Explicitly parked by Vladimir at 13:25. The Java launcher's *Face* and *Vertex
   Up* selectors are where to start if it is revived.
10. **The inversion centre is not drawn** with the other symmetry elements — it
    is a point, not a line or a plane. Left out rather than faked.

### Two things worth knowing about the codebase

11. **The catalog data is not consistently wound.** The derivation tool has to
    repair face orientation before it can do anything, and a majority of solids
    need it. Nothing in the app depends on winding today, but anything that ever
    does — any renderer that culls back faces, any volume by divergence theorem —
    will need the same repair. It is 40 lines and it lives in
    `tools/derive-stellation.mjs`; it probably belongs in `core.js`.
12. **Ten solids have genuinely non-planar face data**, by up to 1.15 units — the
    hemi-duals, whose true faces have vertices at infinity and are approximated in
    the file. No plane-fitting method can fix that; it is a property of the data.
    Worth stating before someone spends a day trying.
