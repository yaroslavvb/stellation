# Open questions after the 6 August reviews

What was fixed is listed on `changes.html`, and itemised for checking in
`notes/design/report-06aug-evening.md`. This is the other half: the things that
are still confusing, the decisions I made where the instruction was ambiguous,
and the questions I could not answer from the transcripts.

Updated after the evening session at home. Items settled during that session are
marked **settled**; the rest carry forward.

---

## 1. "polyhedron" versus "stellation" symmetry — **settled, in principle**

> **12:03** — «А просто тут еще polyhedron confusion. Что это такое?»
> **13:45** — «к полиэдрону приложено … к набору его этих самых плоскостей
> применить все операции симметрии вот эти выбранные. А можно меньше.»

Vladimir confirmed the reading in the previous note: the first group multiplies
the face planes, the second groups the resulting cells into orbits. His own
guess was right, and he said so.

**Still open:** the dropdown is restricted to subgroups of the solid's own point
group, so it can never *add* planes, which is the one thing it exists for. The
control remains inert by construction. The three options from the last note are
unchanged, and I still have not chosen:

1. hide it and pin it to the solid's own symmetry;
2. widen it back to allow supergroups, label it "plane group", and constrain the
   second dropdown to subgroups of whatever it is set to;
3. rename both to "plane group" and "cell group".

Option 2 restores his 13:22 experiment — icosahedron under cubic symmetry, where
two faces that were equivalent stop being equivalent — and the new diagram-face
dropdown now shows that split correctly, so the pieces are in place. It needs a
decision, not more code.

---

## 2. shift and ctrl: "compensate completely" — **settled**

Both walk inward; ctrl on a cell removes exactly what shift on that cell would
add. The asymmetry noted last time — ctrl on a high cell takes the core with it,
because the core is in that cell's supporting set — is now survivable, because
**undo exists**. That was the actual complaint at 14:00 («удалил центральную
ячейку. Думаю: что случилось?»), and undo answers it better than changing what
the modifier means.

---

## 3. Cells are volumes, the diagram is a surface — **still the largest gap**

> **13:47–13:50** — «этот viewer в одном случае показывает ячейки, а в другом
> случае он должен показывать грани только»
> Doc, 13:50 — "future design idea — 3D that shows faces instead of cells, add
> toggle to 3D view"

Vladimir explained the mechanism precisely on the recording: the current renderer
is specialised for convex cells, so it draws outward faces only, sorts them by
distance and discards the rest. A face viewer would have to draw both sides of
every face, and then a face lying in the plane through the origin has no "outer"
side at all — the Möbius case he raised at 13:48.

His sketch of what it would be for: select a single face plane, draw *that face*
in three dimensions, and add cells to one side of it or the other. That is the
missing bridge between the diagram and the solid, and it is the one change most
likely to dissolve the volumes-versus-surfaces confusion for good.

**Not attempted.** It is a second renderer, not a toggle. Estimated a day.

---

## 4. Zoom and perspective — **settled**

Perspective is now invariant: the camera distance depends on the solid's radius
and on nothing else. Canvas shape is handled by scaling the projection, which is
a flat magnification and cannot bend a line. Measured bit-identical from 1600×600
to 300×1200 and across selections from R=0.4 to R=6.

**Still not done:** zoom is about the centre of the 3-D view, while in the
diagram it is about the pointer. The two panes still differ. Set aside at 11:53
as «лишнее улучшение»; it stays set aside until someone asks.

---

## 5. The cell numbers

Unchanged from the last note, and still open. The bold number is the orbit index
within its layer; the small one is the sub-cell index. Neither is Du Val's
notation, which is what a reader of the literature expects. Mapping our indices
onto Du Val's letters is possible for the icosahedron and has no general rule for
the other 120 solids.

**Open question, unchanged:** show Du Val letters where we know them and indices
elsewhere? Inconsistent, but far more meaningful for the one solid everyone
studies.

---

## 6. Orientation — **partly settled, one piece explicitly parked**

**Settled: the solids' own orientation.** Vladimir confirmed at 13:52 that the
catalog is in his canonical orientation and that this is deliberate — the
icosahedron stands on an edge with its edges inscribed in the faces of a cube, so
that its 3-fold and 2-fold axes coincide with the cube's and the coordinates stay
memorable (side 1, diagonal φ). The cube looked odd because its own 3-fold axis
points at a vertex, not up the z axis — which is what the "(O)" in his group
names records, and which he says he once tried to get Conway to name properly.

**Parked by him:** the orientation of the *diagram*. For a triangular face of a
cuboctahedron there is no canonical way to spin the drawing plane, and he said so
plainly — «правильной ориентации здесь не очевидно… это можно оставить и не
решать этот вопрос» (13:25). The Java launcher's *Face* and *Vertex Up*
selectors have no equivalent here, and are the obvious place to start if it is
ever picked up.

---

## 7. Symmetry elements — **settled**

Axes are drawn as depth-tested cylinders, so the solid hides what is behind them
— the fix for «symmetry axes are kind of useless, because of occlusions». Three
separate toggles, as asked for at 13:54: rotation axes, mirror planes,
rotoreflection (Sₙ) axes.

Verified against group theory: I_h gives 31 rotation axes (6+10+15), 15 mirror
planes and 16 Sₙ axes (6 S₁₀ + 10 S₆); O_h gives 13, 9 and 7. E, Cs and Ci give
no rotation axes, correctly.

**One judgement call:** mirror planes are drawn as a solid rim with only the
faintest wash inside, not as the translucent discs literally asked for. Fifteen
translucent discs compound to an opaque ball that hides the solid they are meant
to explain — I tried it first and it was unusable. The rim is what carries the
information. Say the word if the filled disc is wanted at low symmetry.

**Still not drawn:** the inversion centre, which is a point rather than a line or
a plane. It is left out rather than faked.

---

## 8. Things noted and still not acted on

- **13:03 / 14:01 — black edges on the catalog thumbnails.** The 121 picker
  images are pre-rendered and, as Vladimir said, the data to re-render them is
  not to hand — «для них нету данных… по-моему, я их делал на Pov-Ray». We could
  re-render all 121 from our own engine, which would give consistent lighting and
  real edges but would lose the character of the originals. Not started; wants a
  decision first.
- **13:59 — the Cells table pans but does not say so.** Improved by collapsing
  groups by default, and it scrolls by wheel and by drag, but there is still no
  drawn scrollbar. Vladimir found the panning only after being told.
- **12:09 — a subgroup *visualiser* beyond bare elements**: which operations, in
  what order. The three element toggles are a first step, not the thing he
  described.

---

## 9. Where the plane work stands

Unchanged and still not started, per instruction. The finding, both prototypes
and an acceptance test are in `notes/design/plane-representation.md`.

Two things from this session bear on it:

- The status line now **declares** the loss: a solid with faces through the
  centre reads «⚠ 4 of 7 planes» instead of «4 planes». That does not fix
  anything, but it stops the wrong answer looking like a right one.
- The winding-number tool refuses 25 solids as non-orientable, and they are the
  hemipolyhedra and rhombihedra — the same family. Vladimir's read at 12:15
  («плоскости, проходящие через ноль, я их избегал») and his account at 13:48 of
  why a face through the origin has no outer side are two views of one problem,
  and it is the same problem that blocks the face-mode renderer in §3.

---

## 10. New, from the evening session

**Custom plane sets.** Raised by Vladimir at 14:06 and the largest single unlock
in view: the engine can only stellate the uniform polyhedra in the catalog, and
allowing an arbitrary plane set — «можно их формы менять, не обязательно из
этих» — would add, by his own count, about **71 further Brückner figures**. This
also bounds what the derivation tool in §11 can reach: of the non-convex solids
it examined, 61 have no convex solid in the catalog sharing their face planes,
and those are exactly the ones custom plane sets would rescue.

**How many figures the winding tool actually reaches.** The fable report
estimated 16 → ~55 clickable figures. The tool derives **20 verified
selections**, not 55. The shortfall is the 61 solids above: they need plane sets
the catalog does not contain. What it does deliver is machine-checked rather than
hand-derived, and it re-derived the four Kepler–Poinsot solids from scratch as an
independent check on the whole pipeline.
