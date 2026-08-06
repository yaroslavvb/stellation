# Open questions after the 6 August afternoon review

What was fixed is listed on `changes.html`. This is the other half: the things
that are still confusing, the decisions I made where the instruction was
ambiguous, and the questions I could not answer from the transcript.

---

## 1. "polyhedron" versus "stellation" symmetry — still unexplained

Raised twice, and neither of you could say what the first one does:

> **12:03** — «А просто тут еще polyhedron confusion. Что это такое?»
> «Это не знаю. Это симметрия полиэдрона, но это автоматически выбирается. Но
> если я ее меняю, что происходит, я вообще не знаю, что произойдет.»
>
> **12:19** — "still confused about the *polyhedron* sub-selection of the Symmetry"

**What the code actually does.** `buildStellation(poly, polyMatrices, {subMatrices})`
uses them for two different jobs:

- **`polyhedron`** multiplies the face planes. Every plane of the solid is
  copied under every matrix of this group, and the union is the arrangement that
  gets cut up. For a solid already symmetric under that group this adds nothing
  — an icosahedron under I_h gives back the same twenty planes. It matters only
  when the group is *larger* than the solid's own symmetry, where it genuinely
  invents new planes.
- **`stellation`** groups the resulting cells into orbits. This is the one that
  splits a cell into sub-cells when you lower it.

Vladimir's guess at 12:03 was right: *«взял его набор плоскостей … применю к нему
симметрию»*. His 12:18 test — apply icosahedral symmetry to a cube — is exactly
the case where it should do something visible.

**Why it looks inert.** The dropdown is now restricted to subgroups of the
solid's own point group (this was the fix for the T+I nonsense). A subgroup can
never add planes, so within the offered choices the control does nothing except
change how cells are grouped — which is the *other* dropdown's job. It is inert
by construction.

**Three options, none obviously right:**

1. **Hide it.** Set it to the solid's own symmetry always and drop it from the
   panel. Loses the ability to build an arrangement from a solid's planes under a
   *larger* group — which is the one thing it is for.
2. **Widen it back and label it honestly** — "multiply the face planes by this
   group" — allowing supergroups again, and let the stellation dropdown be
   restricted to subgroups of *that*. Restores the cube-under-icosahedral-symmetry
   experiment. Risks returning the all-zeros confusion unless the second dropdown
   is properly constrained.
3. **Rename and reframe:** call it "plane group" and "cell group", so the two
   jobs are named after what they do rather than both being "symmetry".

I have not chosen. Option 2 with a corrected constraint is probably what the
original intended, but it re-opens a bug you just had fixed, so it needs your
call.

---

## 2. shift and ctrl: what "compensate completely" means

> **11:57** — «Shift и Control, они противоположны друг друга … они друг друга
> компенсируют. Полностью … они обе должны действовать вниз к центру.»

Implemented as: **both walk inward.** shift adds the clicked cell together with
everything supporting it down to the core; ctrl removes exactly that same set.

**The consequence to be aware of:** ctrl on a high cell removes the core too,
because the core is part of that cell's supporting set. From an empty selection
shift-then-ctrl returns exactly to empty — I verified that. But from a
*non-empty* selection they do not cancel: if the core was already there before
the shift, ctrl still takes it away.

A true undo would need to remember what the last shift added. You explicitly
rejected history-based behaviour this morning — that was the bug where a second
shift-click sometimes removed — so I did not reintroduce it. If "compensate
completely" was meant in the stronger sense, say so and it becomes an undo stack
rather than a modifier.

---

## 3. Cells are volumes, the diagram is a surface

This came up three times across two sessions and is still the largest source of
confusion:

> **11:59** — «Ячейки — это объемы, а это поверхности … У тебя может быть две
> ячейки рядом друг с другом, они обе включены, а поверхности между ними нет,
> потому что они не контактируют. И это confusing.»

Done so far: inward-facing faces are drawn pale and dashed, and the pale was
made stronger after «слишком слабо видно». The three views are described on
`controls.html`.

**Not done, and worth considering:** the 3-D view could have a mode that shows
*faces* rather than *solid cells* — Vladimir's own suggestion at 12:16, «viewer
специальный нужен, потому что этот viewer в одном случае показывает ячейки, а в
другом случае он должен показывать грани только». That is a real second
renderer, not a toggle, and I have not attempted it.

---

## 4. Zoom: changed, but not to the model described

> **11:53** — "zoom should not change perspective (2d zoom) instead of moving
> camera in. Pointer should stay in one place"

**Done:** zoom now scales the projection instead of dollying the camera, so the
viewpoint no longer shifts as you magnify, and the range is wide enough to frame
the largest arrangements. There is a **fit** button and a **home** button.

**Not done:** the pointer does not stay fixed. Zoom is about the centre of the
view, not about the cursor. In the diagram, zoom *is* about the pointer — so the
two panes still differ here, which is the sort of inconsistency the morning
session was about. The 2-D navigation model Vladimir described (drag = up/down,
shift-drag = left/right, ctrl = zoom at the pointer) was set aside at 11:53
as «лишнее улучшение», so I have not built it. Say the word and it is a small
change.

---

## 5. The cell numbers

> **12:05** — "numbers are confusing" / «Эти номера ещё что означают?»

The bold number in a box is the **orbit index within its layer**, ordered by the
strict comparison the Java original uses (primitive count, then facets, then
vertices, then volume). The small number in a sub-cell box is the **sub-cell
index within that orbit**. Neither is a name anyone would recognise; they are
positions in a sorted list.

They are now hidden by default behind the collapse arrow, which removes most of
the noise. What they are *not* is Du Val's notation — a,b,c…,e₁,f₁ and so on —
which is what a reader of the literature would expect. Mapping our indices onto
Du Val's letters is possible for the icosahedron (the walkthrough already does
it by hand) but there is no general rule for the other 120 solids.

**Open question:** should the boxes show Du Val letters where we know them, and
fall back to indices elsewhere? That is inconsistent but far more meaningful for
the one solid everybody actually studies.

---

## 6. Cube orientation

> **12:18** — «У куба, мне казалось, ориентация должна быть как квадрат.»

The geometry files fix each solid's orientation; we display what is in the file.
The cube arrives rotated so that a body diagonal, not a face, faces the viewer.
The new **home** button gives a canonical *camera* orientation but does not
re-orient the *solid*.

Two different things could be wanted:
- a per-solid canonical orientation stored alongside the geometry, or
- home choosing a view aligned to the solid's highest-order axis.

The second is automatic and probably what you want; it needs a rule for which
axis counts as "up", which is precisely what the Java applet's *Face* and
*Vertex Up* selectors were for. Those exist in the original launcher and have no
equivalent here.

---

## 7. Symmetry axes — done, with a caveat

Added: a **show symmetry axes** toggle drawing the rotation axes of the current
stellation group through the origin, meant to be used with **home**.

Verified against group theory: E, Cs, Ci give none; C2 one; D2 three mutually
perpendicular; T seven; O and O_h thirteen; I and I_h thirty-one — that last is
the textbook 6 + 10 + 15. My first implementation returned twelve for O_h; the
half-turn case needs the largest column of R + I rather than square roots of the
diagonal, because a zero component leaves its sign undetermined and two distinct
axes then collapse onto each other.

**Caveat:** only *rotation* axes are drawn. Cs, Ci and the improper operations
have mirror planes and inversion centres, which are not lines and are not shown —
so selecting Cs shows nothing at all, which is correct but looks broken. Mirror
planes could be drawn as translucent discs if that would help.

---

## 8. Smaller things noted but not acted on

- **12:09** — a subgroup *visualiser* beyond bare axes (which operations, in what
  order). The axes are a first step, not the thing you described.
- **11:49** — the misaligned yellow outline is fixed. It was a regression from
  making the model scale sticky: the highlight was still computing its own scale,
  so it floated off the face it marked.
- **12:02** — the Cells table not fitting under low symmetry is improved by the
  collapse-by-default change, but there is still no visible scrollbar; it pans by
  dragging and by wheel. A drawn scrollbar would make that discoverable.

---

## 9. Where the plane work stands

Unchanged from this morning and still not started, per your instruction. The
finding, both prototypes and an acceptance test are in
`notes/design/plane-representation.md`. The short version is that the port
already stores four numbers, the blocker is a single guard line, and that guard
is doing a second job — dropping faces whose normal is undefined — so it cannot
simply be deleted. Face planarity separates the two cases by sixteen orders of
magnitude.

Vladimir's read at 12:15 — «подтвердила мои опасения … плоскости, проходящие
через ноль, я их избегал» — matches: the twenty commented-out hemipolyhedra are
excluded for exactly this reason, and the reason is written in the source in his
own hand.
