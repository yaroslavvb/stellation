# Open questions after the 6 August reviews

Now four rounds deep. What was fixed is on `changes.html`; each round's
itemised report is in `notes/design/` (`report-06aug-evening.md`,
`report-06aug-night.md`). This file is the standing list: what is still open,
what was decided and how, and what the next stretch of work should be.

---

## Settled this round (night session)

1. **What the modifiers mean, per view.** The "same gestures in all three
   views" of round 3 was the port's invention, and the night session replaced
   it with the actual design: the solid adds/removes one cell (green/red), the
   diagram toggles the cell on either side of its plane (gold/blue — toggles
   must not wear add/remove colours), and the group operation lives only in the
   Cells table, as a toggle of a box with its whole supporting set.
2. **The "polyhedron symmetry" control stays as it is.** Discussed twice more;
   the last word (15:56) was «можешь оставить это как есть» — it regroups the
   cells under a lower initial symmetry, the second dropdown then offers that
   group's subgroups. The grand version of the idea — apply arbitrary groups to
   arbitrary plane sets — now lives where Vladimir said it belongs: the
   **Make planes** dialog.
3. **Mirror planes**: thin tori of axis thickness, faint fill kept, class
   colours, legend, grey-out when absent. **Axes**: coloured by inequivalence
   class. Also marked on the 2-D diagram, matching the Java applet.
4. **The elements rescale with the selection** — looked at once more and left:
   «давай это не будем трогать». Sizing them to the fixed arrangement frame was
   tried during development and looks worse (they dwarf a small selection).
5. **The inversion centre is not drawn** — «never mind, don't draw inversion
   center». It is nearly always present and it is a point.
6. **Cell numbering**: the all-zeros display was a bug (boxes drew their
   sub-index), fixed; Du Val letters now appear for the icosahedron under
   I_h, indices elsewhere — "use Du Val's notation when possible" done to the
   extent a lettering exists.

---

## Still open

### 7. A 3-D view that shows faces instead of cells

Unchanged from the last note, and still the largest UI piece. Vladimir's
sketch: pick one plane, draw that face in space, add cells to either side of
it. He expects it needs real WebGL treatment (the Java one draws visible faces
of convex cells in painter's order and cannot do this). Roughly a day; the
night session explicitly deferred it — «one day у меня не хватит квоты».

### 8. The two-dimensional clone (new, and worth doing)

A full design conversation at 16:13–16:27: build the same app one dimension
down. A polygon's edges extend to lines; the lines cut the plane into cells;
layers, symmetry groups (C_n and D_n only), a 1-D "diagram" (a line divided
into segments, each with a cell above and below). Everything corresponds —
core, shells, support, the below/above toggles — and all of it is visible at
once, which is precisely what makes the 3-D case hard to teach. «Для
понимания соответствия … чтобы обучиться и понять этому.» A teaching page,
not an engine change: the arrangement math in 2-D is elementary.

### 9. The support-graph view (Messner-style)

Peter Messner's pages draw the cell adjacency as a layered graph with lines
between cells that rest on each other. Vladimir's verdict: probably useful
mainly as feedback — you would *see* which cells light up on a group toggle.
The connectivity graph already exists in the engine. Low priority.

### 10. The Java app itself

Two items from the doc's last line are **not done and out of scope for this
port session**: fixing "make planes" in the Java app (on the Mac the dialog
did not open — though the menu itself was found in the macOS system menu bar,
and Vladimir suspects the jar is simply not the latest build: «jar-файл не
самый последний, наверное»), and the rotation issue there. Both need a Java
build environment and the newest source; the `src/` tree is in the repository.
The *functionality* — make planes — is now ported to the JS app, which was the
third item, and done.

### 11. The essay, and finishing

«Надо поработать над тем эссе … и надо заканчивать с этим — этот последний
заход, и нужно перерыв сделать, переварить.» The history essay wants an
editing pass; then a merge-back: fixes cleaned up and merged into Vladimir's
own repository, with `notes/github-pages-howto.md` (written this round) so he
can serve it from his own GitHub Pages.

### 12. Where the plane work stands

Unchanged: not started, per instruction. Three threads still converge on it —
the twenty commented-out hemipolyhedra, the face-mode renderer (§7), and the
ten unfixable duals now documented in `notes/data-quality.md`. The Make planes
dialog adds a fourth: entering a plane through the origin is now something a
user can *do*, and it is skipped with a declared count rather than held.

### 13. Small and known

- Diagram zoom is about the pointer, 3-D zoom about the centre; no pan in 3-D
  — reviewed again at 16:03 and left («не надо пэн сделать»; zoom-at-pointer
  substitutes for pan in the diagram).
- The zoomed-out diagram still shimmers a little; strokes now thin and fade
  below 1× zoom, which reduces it. Full fix would need supersampling;
  Vladimir's own verdict was that the fight costs more than it pays.
- Catalog thumbnails still have no edges (needs a re-render decision).
- Depth is not auto-suggested for custom plane sets; the previous solid's
  setting carries over.
- A custom-planes session cannot be restored from the URL hash (the sheet does
  not fit); it restores from a saved JSON document instead.
