# The Stellation Diagram

Research note for the "Cells" tutorial. Focus: the 2D **stellation diagram** — one face
plane of a polyhedron with the traces of every other face plane drawn across it — its
history, how to read it, how its regions relate to the 3D cells our program lists, and the
dual construction (faceting) that mirrors it.

Two kinds of statement appear below and are always labelled:

* **[LIT]** — taken from published literature, with a citation.
* **[COMP]** — computed from scratch for this note (scripts in `figures/`). These are
  independent arithmetic, not quotations; where a published number exists I say whether it
  agrees.

---

## 1. What a stellation diagram is

Take a polyhedron. Pick one face. That face lies in a plane. Now extend *every* face plane
of the polyhedron indefinitely — they are infinite planes, not just the bounded faces. Each
of the other planes either is parallel to your chosen plane (and never meets it) or cuts it
in a straight line. Draw all those lines on your chosen plane.

The result is the **stellation diagram** (also called the *stellation pattern*, or, in the
1938 monograph discussed below, the *face diagram*). It is a picture of an arrangement of
lines. Those lines chop the plane into pieces; the smallest pieces — the ones no further
line passes through — are the **elementary regions**. [LIT: Wikipedia, *Stellation diagram*,
https://en.wikipedia.org/wiki/Stellation_diagram]

Why is this useful? Because a **stellation** of the polyhedron is, by definition, a new
solid whose faces lie in exactly those same planes. So whatever the new solid's face
happens to be, it is some union of elementary regions of the diagram. Shade a set of
regions, and you have specified a face. Do that consistently in all twenty (or twelve, or
thirty…) planes and you have specified a stellation. That is the whole idea: **a 3D
enumeration problem is converted into a 2D colouring problem.**

Jargon, defined once:

* **Stellation** — extending a polyhedron's faces (or a polygon's edges) until they meet
  again, producing a larger, usually star-like figure. From Latin *stella*, star. Kepler
  gave the first systematic account in *Harmonices Mundi* (1619), where he distinguished
  edge-extension (*echinus*) from face-extension (*ostrea*). [LIT: Wikipedia, *Stellation*,
  https://en.wikipedia.org/wiki/Stellation]
* **Cell** — a bounded three-dimensional region cut out of space by the full arrangement of
  face planes. Term due to Du Val (1938). Our program's "cells" are exactly these.
* **Shell / layer** — the set of cells at a given distance "outwards" from the core solid.
  Du Val's measure is the **power** of a cell: the number of face planes you cross going
  from the polyhedron's centre out to that cell. [LIT: HandWiki, *The Fifty-Nine
  Icosahedra*, https://handwiki.org/wiki/The_Fifty-Nine_Icosahedra]
* **Faceting** (also spelled *facetting*) — the reverse operation: removing material from a
  polyhedron without adding any new vertices, so new faces appear along diagonals. §7.

---

## 2. Who invented it, and when

The short answer: **Edmund Hess, 1876**, with the technique reaching maturity in **Max
Brückner's 1900 book**, being turned into an enumeration *method* by **A. H. Wheeler in
1924**, and being made canonical by **Coxeter, Du Val, Flather and Petrie in 1938**.

### 2.1 Before the diagram (1619–1859)

* **Kepler, 1619** — *Harmonices Mundi*. Defines stellation; constructs the small and great
  stellated dodecahedra, and the *stella octangula* (the compound of two tetrahedra).
* **Poinsot, 1809** — rediscovers Kepler's two stars and finds the great dodecahedron and
  great icosahedron. Together these four are the **Kepler–Poinsot polyhedra**.
* **Cauchy, 1813** — proves the list of four is complete, by treating them as stellations of
  the dodecahedron and icosahedron.
* **Bertrand, 1858** — derives the same four by *faceting* instead. See §7.
  [LIT for this paragraph: Wikipedia, *Stellation*; G. Inchbald, "Stellating and Facetting —
  a Brief History", https://www.steelpillow.com/polyhedra/StelFacet/history.html]

None of these authors needed a general diagram: they were dealing with a handful of highly
symmetric forms that can be described in words.

### 2.2 Hess, 1876 — the first stellation diagrams

**[LIT]** Edmund Hess (1843–1903) used stellation diagrams in 1876 and with them found the
remaining "main-line" stellated icosahedra. He also first described the compound of five
cubes, the compound of five octahedra (which is the second stellation of the icosahedron)
and the compound of ten tetrahedra in the same year.
[Wikipedia, *Stellation* and *The Fifty-Nine Icosahedra*; Wikipedia, *Compound of five
octahedra*, https://en.wikipedia.org/wiki/Compound_of_five_octahedra]

The publication usually cited is Hess, *Über die zugleich gleicheckigen und gleichflächigen
Polyeder*, Sitzungsberichte der Gesellschaft zur Beförderung der gesamten
Naturwissenschaften zu Marburg (1876).
**UNCERTAIN:** I could not open the 1876 paper itself, so I cannot confirm at first hand
what his figures look like or whether he drew the full plane arrangement or only the parts
he needed. Secondary sources are consistent that the technique is his.

### 2.3 Brückner, 1900 — the diagram in a standard reference

**[LIT]** Max Brückner (1860–1934), *Vielecke und Vielflache: Theorie und Geschichte*
(Leipzig: B. G. Teubner, 1900) — "Polygons and Polyhedra: Theory and History". It gathered
essentially everything then known about polyhedra, with hundreds of engraved figures and
ten photographic plates showing 146 paper models. Brückner extended stellation theory beyond
the regular star forms and identified ten stellations of the icosahedron, among them the
*final* (complete) stellation. [Wikipedia, *Stellation*; Wikipedia, *Final stellation of the
icosahedron*, https://en.wikipedia.org/wiki/Final_stellation_of_the_icosahedron; G. W. Hart,
"Max Brückner's Wunderkammer of Paper Polyhedra", *Bridges 2019*, pp. 59–66; Public Domain
Review, "Max Brückner's Collection of Polyhedral Models (1900)",
https://publicdomainreview.org/collection/max-bruckner-s-collection-of-polyhedral-models-1900/]

Brückner's book is where later authors — including Coxeter's group — got their picture of
the state of the art. Its scanned text is online (University of Michigan Historical Math
Collection, https://quod.lib.umich.edu/u/umhistmath/ABN8316.0001.001).

**UNCERTAIN:** sources credit *Hess*, not Brückner, with introducing the diagram. Brückner's
book certainly contains plane construction figures and nets, and it is the standard
19th-century reference for stellations, but I found no source asserting that the stellation
diagram *originates* with him. Treat "Brückner introduced it" as unsupported; "Brückner
documented and popularised the subject" is well supported.

### 2.4 Wheeler, 1924 — the diagram becomes a method

**[LIT]** Albert Harry Wheeler (1873–1950), an American schoolteacher and prolific
model-maker, was an invited speaker at the International Congress of Mathematicians in
Toronto in 1924. His paper — "Certain forms of the icosahedron and a method for deriving
and designating higher polyhedra", *Proceedings of the International Mathematical Congress,
Toronto* (1924), vol. 1, pp. 701–708 — set out the procedure of **selecting regions of the
stellation diagram and combining the corresponding cells into new polyhedra**. He published
a list of twenty stellation forms (twenty-two if reflections are counted separately),
including the complete stellation. [Wikipedia, *The Fifty-Nine Icosahedra*; Wikipedia,
*Final stellation of the icosahedron*; Wikipedia, *A. Harry Wheeler*,
https://en.wikipedia.org/wiki/A._Harry_Wheeler]

Two things about Wheeler matter for how the diagram is used today.

1. **He worked with the *visible* regions of a face.** Lines crossing the interior of a face
   were treated as artefacts — "false edges" — rather than as real structure. This is the
   convention that survives in Miller's rules and hence in the 1938 book. Inchbald calls
   this the controversial step, because it quietly discards the internal geometry that the
   cell picture keeps. [LIT: Inchbald, "Stellating and Facetting — a Brief History"]
2. **He fell out with Coxeter.** Wheeler was originally to be a co-author of the 1938
   monograph but objected to Coxeter's treatment; the frequently quoted remark is that
   Coxeter had a way of tying a subject into knots that Wheeler found hard to follow.
   [LIT: HandWiki, *The Fifty-Nine Icosahedra*]

### 2.5 Miller's rules, late 1920s

**[LIT]** J. C. P. Miller proposed five conditions for a stellation to count as "properly
significant and distinct". Paraphrased (the wording below is mine):

1. Faces must lie in the twenty bounding planes of the icosahedron.
2. Within any one plane, the shaded part must be the same for every face — though it may be
   in several disconnected pieces.
3. That part must have three-fold symmetry, with or without mirrors.
4. Only parts visible from outside count; buried interior structure does not.
5. The result must not fall apart into two or more symmetric solids that already occur
   separately (i.e. no compounds of simpler stellations).

[HandWiki / Wikipedia, *The Fifty-Nine Icosahedra*]

Rules 1–3 are conditions on the *shaded diagram*. Rule 4 is what lets you ignore the cell
structure hidden inside. Rule 5 rules out duplicates.

### 2.6 The Fifty-Nine Icosahedra, 1938

**[LIT]** H. S. M. Coxeter, P. Du Val, H. T. Flather and J. F. Petrie, *The Fifty-Nine
Icosahedra*, University of Toronto Studies, Mathematical Series 6 (1938), pp. 1–26. Second
edition Springer-Verlag 1982; third edition Tarquin 1999, ISBN 978-1-899618-32-3.
[Wikipedia, *The Fifty-Nine Icosahedra*]

Division of labour:

* **Coxeter** — the analytic enumeration, working from the face diagram.
* **Du Val** — the *cell* approach: he observed that the extended planes cut space into
  finite regions he named **cells**, that cells of equal power form **shells**, and he built
  a letter notation for them (§5). He then tested all admissible combinations against
  Miller's rules and got the same 59, confirming Coxeter.
* **Petrie** — the isometric (3D) drawings.
* **Flather** — built card models of all 59; they survive in the mathematics library at
  Cambridge.
[Wikipedia / HandWiki, *The Fifty-Nine Icosahedra*]

This is the moment the stellation diagram becomes standard equipment. The book is also the
origin of the practice of *numbering* the region classes in the diagram so a stellation can
be written down as a list of numbers.

### 2.7 After 1938

* **Coxeter, *Regular Polytopes* (1947)** — notes, in passing, that stellation and faceting
  are reciprocal processes. Inchbald describes this remark as the key that later unlocked a
  consistent theory. **UNCERTAIN:** I could not verify a page number for the remark.
  [LIT: Inchbald, "Stellating and Facetting — a Brief History"]
* **c. 1970, Conway** — proposes finer terminology: *stellation* for extending edges,
  *greatening* for extending faces. First published in Coxeter, *Regular Complex Polytopes*
  (1974). [LIT: same source]
* **Bridge, 1974** — "Facetting the dodecahedron", *Acta Crystallographica* A30, 548–552.
  Enumerates 22 faceted dodecahedra and explicitly correlates them with stellations of the
  icosahedron. [LIT: IUCr, https://journals.iucr.org/paper?S0567739474001306]
* **Pawley, 1973** — applies Miller-style rules to the rhombic triacontahedron and gets
  358,833,098 stellations (84,959 reflexible, 358,748,139 chiral), which shows how fast the
  region-colouring problem explodes once the diagram gets complicated.
  [LIT: HandWiki, *Rhombic triacontahedron*, https://handwiki.org/wiki/Rhombic_triacontahedron]
* **Hudson & Kingston, 1988** — "Stellating polyhedra", *Mathematical Intelligencer* 10,
  50–61. A cell-based treatment with a much weaker main rule: the chosen cell set need only
  have no interior cavity. [LIT: Inchbald, "Stellating and Facetting — a Brief History"]
* **Messer, 1995** — "Stellations of the rhombic triacontahedron and beyond", *Structural
  Topology* 21, 25–46. Enumerates the *fully supported* stellations (no undercuts) of the
  rhombic triacontahedron. **Sources disagree on the count**: 226, 227 and 228 all appear,
  the differences apparently coming from whether the original solid is counted and how
  "fully supported" is defined. [LIT: Messer 1995 via ResearchGate,
  https://www.researchgate.net/publication/265206552; HandWiki, *Rhombic triacontahedron*;
  Inchbald, "Stellating and Facetting — a Brief History"]
* **Inchbald, 2002–2006** — "In search of the lost icosahedra", *The Mathematical Gazette*
  86 (July 2002), 208–215, found extra icosahedron stellations by computer and criticised
  Miller's rules; "Facetting diagrams", *The Mathematical Gazette* 90 (July 2006), 253–261,
  introduced the dual diagram (§7).
  [LIT: https://www.steelpillow.com/polyhedra/icosa/searchlost/searchlost.html;
  https://www.steelpillow.com/polyhedra/FacetingDiagrams/FacetingDiags.html]

---

## 3. How to read a stellation diagram

1. **Find the central region.** It is the polyhedron's own face — for the icosahedron, a
   small triangle at the centre. Everything else radiates outward from it.
2. **Every line is another face plane, seen edge-on.** The three lines forming the edges of
   the central triangle are the three faces adjacent to yours; lines further out come from
   faces further away.
3. **Shade a set of regions.** That shaded figure is one face of a candidate stellation.
   Because the whole polyhedron is symmetric, the same shading is copied into all the other
   face planes.
4. **Symmetry constrains what you may shade.** The subgroup of the polyhedron's symmetry
   group that maps a face to itself acts on the diagram. For an icosahedron face under full
   icosahedral symmetry that subgroup is *C3v* of order 6 — a three-fold rotation plus three
   mirrors. So regions come in classes of 1, 3 or 6, and a symmetric shading must take whole
   classes. **[COMP + LIT: this is Miller's rule 3 restated.]**
5. **In the 1938 book the classes are numbered**, and a "region seen from underneath" is
   marked with a prime (e.g. `3'`), because a face can be approached from either side.
   [LIT: HandWiki, *The Fifty-Nine Icosahedra*]
6. **For a solid with more than one kind of face you need more than one diagram** — one per
   face type. Face-transitive solids (Platonic, Catalan) need only one; Archimedean solids
   need several. [LIT: Wikipedia, *Stellation diagram*]

There is one practical wrinkle: the diagram runs off the page. For the icosahedron the
useful part extends to about fourteen times the radius of the central triangle **[COMP]**,
so printed versions are often drawn at reduced scale or with the long spikes truncated.

---

## 4. The icosahedron's diagram, concretely

All numbers in this section are **[COMP]** — derived from the geometry with
`figures/diag.py`, `figures/orbits2.py`, `figures/layers.py` — with published cross-checks
noted. Figures: `figures/icosa-stellation-diagram-core.png` (the middle of the diagram) and
`figures/icosa-stellation-diagram-outline.png` (the whole thing).

### 4.1 The lines

The icosahedron has 20 faces. Take one. Its own plane does not cut it, and exactly one other
face is parallel to it (icosahedron faces come in 10 antipodal pairs), so **18 planes cut
your plane in 18 distinct lines**. [LIT agrees: MathWorld, *Icosahedron Stellations*,
https://mathworld.wolfram.com/IcosahedronStellations.html]

Those 18 lines fall into **9 directions, two parallel lines each**. The directions are *not*
equally spaced: measured as the angle of each line's normal, they sit at roughly
7.76°, 30°, 52.24°, 67.76°, 90°, 112.24°, 127.76°, 150°, 172.24° — a repeating
22.24° / 22.24° / 15.52° pattern, three-fold symmetric as it must be. Three of the nine
directions (30°, 90°, 150°) carry the mirror-symmetric lines, including the two lines
parallel to each edge of the central triangle.

The 18 lines meet in **48 distinct points**, which sit at exactly 8 distances from the face
centre. In units where the icosahedron's circumradius is 1 those distances are
0.607 (×3), 0.711 (×3), 1.124 (×6), 1.214 (×9), 1.422 (×9), 2.248 (×6), 4.161 (×3),
8.322 (×9). The central triangle's own vertices are the innermost three.

### 4.2 The regions

The arrangement has **67 bounded elementary regions**. Under the diagram's own symmetry
(*C3v*, order 6) they fall into **15 classes**: one class of 1 (the central triangle), six
classes of 3, eight classes of 6 — total 1 + 18 + 48 = 67.

**UNCERTAIN / discrepancy:** the Wikipedia article on *The Fifty-Nine Icosahedra* describes
its illustration as having **13** numbered sets of regions that must occur together for full
icosahedral symmetry, and the article on the *final stellation* says the outermost set is
labelled **13**. That does not match my 15 classes. The most likely explanation is that the
published/illustrated numbering groups regions by *which cell shell they bound* rather than
strictly by symmetry class — the nine outermost regions, for instance, form the outer skin
of one single shell of cells but split into a class of 3 and a class of 6 under *C3v*. I
could not confirm this from a primary source. If the tutorial quotes a region numbering,
take it from a specific published diagram and say which one.

### 4.3 What the diagram looks like — it is a NINE-pointed star

Shade all 67 bounded regions and their union is a **nine-pointed star** with three-fold
symmetry (see `figures/icosa-stellation-diagram-outline.png`). This is not an accident: that
union *is* the face of the **final stellation of the icosahedron** (the "complete
icosahedron" / echidnahedron), the stellation that uses every cell. **[LIT confirms
independently:** Wikipedia, *Final stellation of the icosahedron*, states that each of its
20 faces is an irregular **9/4 star polygon, or enneagram**, and is 2-isogonal — i.e. its
nine points fall into two symmetry classes. My computation gives exactly that: 9 outer
regions = one class of 3 + one class of 6.**]**

All nine points reach the same radius, 8.32; what makes the star visibly irregular is the
*notches* between them, which alternate in depth — six deep notches bottoming out at radius
2.25 and three shallow ones at 4.16. In star-polygon terms those notch bottoms are where the
enneagram's edges cross each other, not extra points. The star has nine points, full stop.

> **Correction to the brief.** The brief describes the icosahedron's diagram as a
> "ten-pointed star pattern". It is a **nine**-pointed star ({9/4} enneagram) — confirmed
> both by my own computation and by the published description of the final stellation's
> faces. A plausible source of the slip: the **dodecahedron's** stellation diagram is built
> from exactly **ten** trace lines (§6). I would not describe the icosahedron's diagram as
> ten-pointed in the tutorial.

Zooming in on the middle (`figures/icosa-stellation-diagram-core.png`) the eye sees the
small central triangle, then a hexagram-like ring, then successively larger triangular and
star-shaped rings — this inner part is the region of the diagram used by the small, familiar
stellations (the triakis/small triambic icosahedron, the compound of five octahedra, the
great icosahedron), while the long spikes belong to the outer shells.

### 4.4 The cells behind it

Extending all 20 planes cuts space into **473 bounded cells** **[COMP]**. Sorting them by
*power* — the number of planes crossed going out from the centre — gives eight layers:

| layer | count | Du Val shell |
|---|---|---|
| 0 | 1 | **A** (the icosahedron itself) |
| 1 | 20 | **b** |
| 2 | 30 | **c** |
| 3 | 60 | **d** |
| 4 | 20 + 60 | **e₁**, **e₂** |
| 5 | 12 + 120 | **f₂**, **f₁** |
| 6 | 30 + 60 | **g₁**, **g₂** |
| 7 | 60 | **h** |

**This is exactly the table the program produces.** Cross-checks:

* MathWorld's *Icosahedron Stellations* page lists the cells as
  20+30+60+20+60+120+12+30+60+60 — the same 472 non-core cells in ten shapes.
  [LIT: https://mathworld.wolfram.com/IcosahedronStellations.html]
* Inchbald ("In search of the lost icosahedra") gives 473 finite cells in **12** shapes
  arranged in layers. [LIT:
  https://www.steelpillow.com/polyhedra/icosa/searchlost/searchlost.html]
* HandWiki records Du Val's letters as a, b, c, d, e = e₁+e₂, f = f₁+f₂ = (f₁₁+f₁₂)+f₂,
  g = g₁+g₂, h — twelve sets. [LIT: https://handwiki.org/wiki/The_Fifty-Nine_Icosahedra]

The 10-vs-11-vs-12 count is not a real disagreement, and it is precisely the *sub-cell* idea
in our program:

* Under the **full** icosahedral group *Ih* (order 120, rotations *and* mirrors) there are
  **11 orbits** of cells: the core plus the 10 shapes MathWorld lists. **[COMP]**
* Under the **rotation-only** group *I* (order 60) there are **12 orbits**: the single orbit
  of 120 cells (**f₁**) splits into two mirror-image halves of 60. Every other orbit is
  unchanged, because every other cell shape lies on a mirror plane. **[COMP]**
* Du Val wrote the two halves in roman and italic (f₁ and *f₁*); HandWiki renders them
  f₁₁ and f₁₂. Counting them separately, plus the core, gives Inchbald's 12.

So: **the program's "orbit splits into a chiral pair when the stellation symmetry is I" is
Du Val's roman/italic distinction, and it happens for exactly one orbit in the icosahedron.**

**UNCERTAIN:** which of e₁/e₂ and g₁/g₂ is the 20-cell and which the 60-cell class. The
ordering in MathWorld's list implies e₁ = 20, e₂ = 60, g₁ = 30, g₂ = 60, and f₁ = 120 is
forced (it is the one that splits), but I have not seen Du Val's own definitions.

---

## 5. Regions and cells are not the same thing

This is the part most worth getting right in the tutorial, because the two pictures are
easy to conflate and the 1938 book deliberately used both.

**A region is 2D. A cell is 3D.** The diagram lives in one plane; the cells live in space.

**The precise relationship.** Take any cell. Take any of its flat faces. That face lies in
some face plane, and — this is the key fact — it is **exactly one elementary region** of
that plane's diagram, never part of one and never two of them joined. The argument is short:
a cell is the intersection of half-spaces, one per plane; intersect that with a face plane
and you get the intersection of the corresponding half-planes, which is by definition an
elementary region. If some other plane's trace ran through the middle of the cell's face,
that plane would slice the cell in two and it would not have been a cell. **[COMP —
verified: all 473 cells' faces land on elementary regions, and all 67 regions occur.]**

**But the correspondence is many-to-many, not one-to-one:**

* Every elementary region has *two* sides. In the icosahedron's diagram, **58 of the 67
  regions have a cell on both sides**, and **9 have a cell on only the inner side** — those
  nine are the outer skin of the final stellation, with open space beyond. **[COMP]**
  (Wikipedia's summary that an elementary region is "the top face of one cell and the bottom
  face of another" is true for the interior ones and fails for the outermost nine.)
* Every cell has *several* faces, spread over *several different* planes. Across the
  icosahedron there are 2,500 (cell, face) incidences among 473 cells — an average of about
  **5.3 faces per cell**. **[COMP]** So you cannot read a cell off a single diagram; you
  read one *slice* of it.
* Counting instances: 67 regions × 20 planes = 1,340 region instances, versus 473 cells.
  Neither number divides the other. There is no bijection.

**Why both pictures were needed in 1938.** Coxeter worked with shaded regions (a *face*
specification); Du Val worked with sets of cells (a *solid* specification). They are not
equivalent:

* Two different cell sets can present the *same* shaded regions — for example a solid and
  the same solid with an interior cell hollowed out. Miller's rule 4 ("only accessible parts
  count") exists precisely to collapse these to one entry, i.e. to make the face
  specification the definition.
* Conversely, a shaded region set does not by itself say which cells are solid; you have to
  reconstruct them.

Getting the same 59 by both routes is the reason the 1938 result was believed. For our
program, which selects **cells**, the cell picture is primary — which is a legitimate choice
and closer to Du Val, Hudson & Kingston (1988) and Inchbald than to Coxeter's face-based
enumeration. It also means our program can naturally represent things Miller's rules exclude
(cavities, cell sets that only touch along edges), which later authors argued was the more
honest position. [LIT: Inchbald 2002; Hudson & Kingston 1988, via
https://www.steelpillow.com/polyhedra/StelFacet/history.html]

**Layers vs. the diagram.** The layer number of a cell (its power) is *not* the same as "how
far out the region is in the diagram". A layer-5 cell can have faces sitting in regions that
are geometrically close to the centre of some *other* face's diagram. The two indexings
answer different questions: "how deep is this cell?" versus "where does this cell show up on
this particular face?"

---

## 6. Diagrams for other solids

All **[COMP]** (`figures/general.py`, `figures/cells_gen.py`), with published cross-checks
noted. "Lines" = distinct traces in one face plane; "regions" = bounded elementary regions;
"cells" = bounded 3D regions, by layer.

| solid | faces | lines | regions | cells by layer | stellations (Miller) |
|---|---|---|---|---|---|
| tetrahedron | 4 | 3 | 1 | 1 | 0 |
| cube | 6 | 4 | 1 | 1 | 0 |
| octahedron | 8 | 6 | 4 | 1 + 8 | 1 |
| dodecahedron | 12 | 10 | 16 | 1 + 12 + 30 + 20 | 3 |
| icosahedron | 20 | 18 | 67 | 1+20+30+60+80+132+90+60 | 58 (+ the core = 59) |
| rhombic dodecahedron | 12 | 10 | 17 | 1 + 12 + 24 + 24 | — |

Stellation counts are **[LIT: Wikipedia, *Stellation*]**; the geometry columns are mine.

Reading the table:

* **Tetrahedron and cube have no stellations**, and the diagram shows why in one glance:
  there is only one bounded region, the face itself, so there is nothing to shade. For the
  tetrahedron all faces are mutually adjacent; for the cube the non-adjacent faces are
  parallel and never produce a trace inside the useful area.
* **Octahedron**: the diagram is a triangle divided into four — the central face plus three
  corner triangles. Shade all four and you get the face of the *stella octangula*, the
  compound of two tetrahedra, which is the octahedron's only stellation.
* **Dodecahedron**: **exactly ten** trace lines, five-fold symmetric, giving a central
  pentagon plus three concentric rings of five regions (1 + 5 + 5 + 5 = 16). Adding the
  rings one at a time gives the three stellations: small stellated dodecahedron, great
  dodecahedron, great stellated dodecahedron — the three Kepler–Poinsot solids other than
  the great icosahedron. [LIT for the three names: Wikipedia, *Stellation*; MathWorld,
  *Dodecahedron Stellations*, https://mathworld.wolfram.com/DodecahedronStellations.html]
  **UNCERTAIN:** I verified the 1+5+5+5 region structure and the three shells of cells
  (12, 30, 20) computationally, but did not verify from a source which shell corresponds to
  which named solid; the standard reading is shell 1 → small stellated dodecahedron,
  shells 1–2 → great dodecahedron, shells 1–3 → great stellated dodecahedron.
* **Non-regular solids.** Stellation diagrams are used routinely for the Catalan solids
  (duals of the Archimedeans), above all the **rhombic triacontahedron**, whose diagram is
  the basis of Pawley's and Messer's enumerations (§2.7), and for quasi-regular solids like
  the **icosidodecahedron**. Wikimedia Commons has a "Stellation diagrams" category with
  diagrams for the icosahedron (42 files), dodecahedron, icosidodecahedron and rhombic
  triacontahedron. [LIT:
  https://commons.wikimedia.org/wiki/Category:Stellation_diagrams]
* **Archimedean solids need several diagrams** — one per face type — and a stellation must
  be specified by shading all of them consistently. [LIT: Wikipedia, *Stellation diagram*]

**Practical aside.** Stellation diagrams double as **construction templates**. Magnus
Wenninger's *Polyhedron Models* (Cambridge University Press, 1971; the 1983 companion is
*Dual Models*) gives face-plane patterns from which the paper parts of each model are cut —
which is why a generation of model-builders met the diagram before they met the theory.
[LIT: https://archive.org/details/polyhedronmodels0000wenn_x4t8]

---

## 7. Faceting, Bertrand's construction, and the duality

### 7.1 Faceting

**Faceting** removes material from a polyhedron **without creating any new vertices**. New
edges appear along face diagonals or space diagonals; each new face is a polygon whose
corners are existing vertices. [LIT: Wikipedia, *Faceting*,
https://en.wikipedia.org/wiki/Faceting]

Stellation adds material outside the original; faceting carves material out of the original.
They are opposites in an exact, technical sense.

### 7.2 Bertrand, 1858

**[LIT]** Joseph Bertrand, "Note sur la théorie des polyèdres réguliers", *Comptes rendus
des séances de l'Académie des Sciences* **46** (1858), pp. 79–82, with further remarks on
p. 117. English translation and commentary by G. Inchbald at
http://steelpillow.com/polyhedra/StelFacet/Bertrand1858EngTrans.html

**Bertrand's construction**, in one sentence: pick a vertex of a Platonic solid, and look
for other vertices that together with it form a regular polygon; make that polygon a face.
Every face of the new solid is such a polygon, so the new solid has exactly the same
vertices as the old one. Running this over all five Platonic solids produces precisely the
four Kepler–Poinsot star polyhedra and nothing else — a much cleaner derivation than
Cauchy's, and the earliest treatment of what we now call faceting. Bertrand also introduced
the term *étoilé* ("starry"). [LIT: Inchbald's translation and commentary; Inchbald,
"Stellating and Facetting — a Brief History"]

### 7.3 The duality

**[LIT]** The theorem, as usually stated: *for every stellation of a polytope there is a
dual (reciprocal) faceting of the dual polytope, and vice versa.* Coxeter noted the
reciprocity in *Regular Polytopes* (1947). Inchbald calls it a deep result of projective
geometry, and observes that most twentieth-century work on stellation ignored it — which is
where the inconsistencies in Miller's rules come from. [Wikipedia, *Stellation*; Wikipedia,
*Faceting*; Inchbald, "Stellating and Facetting — a Brief History"]

The concrete pairing that matters here:

* **Stellating the icosahedron ↔ faceting the dodecahedron** (they are dual solids).
* **Stellating the dodecahedron ↔ faceting the icosahedron.**
* Bridge (1974) enumerated 22 faceted dodecahedra and matched them one-for-one with
  stellations of the icosahedron. [LIT: *Acta Cryst.* A30, 548–552]

### 7.4 The faceting diagram, and how it mirrors the stellation diagram

**[LIT]** G. Inchbald, "Facetting diagrams", *The Mathematical Gazette* **90** (July 2006),
pp. 253–261; web version at
https://www.steelpillow.com/polyhedra/FacetingDiagrams/FacetingDiags.html

Construction. Where a stellation diagram is drawn **in the plane of a face**, a faceting
diagram is drawn **around a vertex**. Slice the corner off the polyhedron and you get its
**vertex figure**, a small polygon (for the dodecahedron, a triangle; for the icosahedron, a
pentagon). Onto that, mark every *other* vertex reachable from your vertex by a candidate
new edge, and every candidate new face through it. Inchbald labels faces with lower-case
letter sets and edges with upper-case ones.

Reading it. Instead of shading regions, you **trace closed circuits** through the marked
edges and faces. Any set of facets that closes up into one or more complete circuits has no
free edges, and therefore defines a genuine faceted polyhedron.

The dictionary between the two diagrams:

| stellation diagram of *P* | faceting diagram of the dual *P\** |
|---|---|
| drawn in a face plane | drawn on a vertex figure |
| trace of another face plane | a possible new edge |
| an elementary **region** | a **vertex** of the faceting diagram |
| shaded set of regions = a face | traced circuit = a face (facet) |
| cell / shell structure | connectivity of the traced circuits |

Inchbald's summary: the two diagram types are dual to one another, so each illuminates the
other, and every faceting you find is dual to some stellation of the base solid's dual, with
the traced vertex figure dual to that stellation's face diagram. [LIT: FacetingDiags.html]

**UNCERTAIN:** the row "elementary region ↔ vertex" is my compression of Inchbald's
statement that the diagrams are dual; he states the correspondence at the level of the whole
diagram rather than as an itemised table. Worth checking against the 2006 *Gazette* paper if
the tutorial leans on it.

---

## 8. What to say in the tutorial

Suggested framing, all supported above:

1. The diagram is a 90-year-old-plus device (Hess 1876, standard since 1938) for turning
   "which stellation?" into "which regions do I shade?".
2. Our program answers the same question with **cells** instead — Du Val's half of the 1938
   book, and the approach later authors (Hudson & Kingston 1988, Inchbald 2002) argued is
   the sounder one.
3. The two are linked by one clean fact: **every face of every cell is exactly one
   elementary region of the diagram of the plane it lies in** — but a cell has ~5 faces
   scattered over several planes, and a region has a cell on each side, so there is no
   one-to-one correspondence.
4. The layer numbers in our Cells table are Du Val's **power** and his shells **A, b, c, d,
   e, f, g, h**.
5. The chiral split of the 120-cell orbit into 60 + 60 is Du Val's roman/italic pair f₁ / *f₁*,
   and it is the *only* orbit of the icosahedron that splits when the stellation symmetry
   drops from *Ih* to *I*.
6. The whole diagram, fully shaded, is the face of the final stellation — an irregular
   nine-pointed {9/4} star.

---

## 9. Sources

Primary / historical

* J. Kepler, *Harmonices Mundi* (1619).
* L. Poinsot, "Mémoire sur les polygones et les polyèdres", *J. de l'École Polytechnique* 9 (1810; presented 1809).
* J. Bertrand, "Note sur la théorie des polyèdres réguliers", *C. R. Acad. Sci.* 46 (1858), 79–82 (and p. 117). English translation: http://steelpillow.com/polyhedra/StelFacet/Bertrand1858EngTrans.html
* E. Hess, *Über die zugleich gleicheckigen und gleichflächigen Polyeder*, Sitzungsber. Ges. Beförd. gesamten Naturwiss. Marburg (1876).
* M. Brückner, *Vielecke und Vielflache: Theorie und Geschichte* (Leipzig: Teubner, 1900). Scan: https://quod.lib.umich.edu/u/umhistmath/ABN8316.0001.001
* A. H. Wheeler, "Certain forms of the icosahedron and a method for deriving and designating higher polyhedra", *Proc. Int. Math. Congress, Toronto* (1924), vol. 1, 701–708.
* H. S. M. Coxeter, P. Du Val, H. T. Flather, J. F. Petrie, *The Fifty-Nine Icosahedra*, Univ. of Toronto Studies, Math. Series 6 (1938), 1–26; 2nd ed. Springer 1982; 3rd ed. Tarquin 1999.
* H. S. M. Coxeter, *Regular Polytopes* (1947; 3rd ed. Dover 1973).

Later work

* N. J. Bridge, "Facetting the dodecahedron", *Acta Cryst.* A30 (1974), 548–552. https://journals.iucr.org/paper?S0567739474001306
* G. S. Pawley, "The 227 triacontahedra", *Geometriae Dedicata* 1 (1973), 221–232. (Count cited via HandWiki; **UNCERTAIN** — I did not open the paper.)
* J. L. Hudson & J. G. Kingston, "Stellating polyhedra", *Math. Intelligencer* 10 (1988), 50–61.
* P. Messer, "Stellations of the rhombic triacontahedron and beyond", *Structural Topology* 21 (1995), 25–46. https://www.researchgate.net/publication/265206552
* G. Inchbald, "In search of the lost icosahedra", *Math. Gazette* 86 (2002), 208–215. https://www.steelpillow.com/polyhedra/icosa/searchlost/searchlost.html
* G. Inchbald, "Facetting diagrams", *Math. Gazette* 90 (2006), 253–261. https://www.steelpillow.com/polyhedra/FacetingDiagrams/FacetingDiags.html
* G. Inchbald, "Stellating and Facetting — a Brief History". https://www.steelpillow.com/polyhedra/StelFacet/history.html
* G. Inchbald, "Stellating the Icosahedron and Facetting the Dodecahedron" (2000, updated 2025). https://www.steelpillow.com/polyhedra/icosa/stelfacet/StelFacet.html
* M. J. Wenninger, *Polyhedron Models* (CUP, 1971). https://archive.org/details/polyhedronmodels0000wenn_x4t8
* P. R. Cromwell, *Polyhedra* (CUP, 1997).
* G. W. Hart, "Max Brückner's Wunderkammer of Paper Polyhedra", *Bridges 2019*, 59–66.

Reference pages consulted

* Wikipedia, *Stellation* — https://en.wikipedia.org/wiki/Stellation
* Wikipedia, *Stellation diagram* — https://en.wikipedia.org/wiki/Stellation_diagram
* Wikipedia, *The Fifty-Nine Icosahedra* — https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra
* Wikipedia, *Final stellation of the icosahedron* — https://en.wikipedia.org/wiki/Final_stellation_of_the_icosahedron
* Wikipedia, *Faceting* — https://en.wikipedia.org/wiki/Faceting
* Wikipedia, *A. Harry Wheeler* — https://en.wikipedia.org/wiki/A._Harry_Wheeler
* HandWiki, *The Fifty-Nine Icosahedra* — https://handwiki.org/wiki/The_Fifty-Nine_Icosahedra
* HandWiki, *Rhombic triacontahedron* — https://handwiki.org/wiki/Rhombic_triacontahedron
* MathWorld, *Icosahedron Stellations* — https://mathworld.wolfram.com/IcosahedronStellations.html
* MathWorld, *Dodecahedron Stellations* — https://mathworld.wolfram.com/DodecahedronStellations.html
* Wikimedia Commons, *Category:Stellation diagrams* — https://commons.wikimedia.org/wiki/Category:Stellation_diagrams

---

## 10. Open questions / things I could not confirm

1. **What Hess's 1876 figures actually look like.** Secondary sources agree he introduced
   the diagram; the paper itself was not accessible.
2. **Whether Brückner drew stellation diagrams.** He is credited with documenting and
   extending stellation, not with inventing the diagram. Do not claim otherwise without a
   primary check.
3. **The 13-vs-15 numbering of region classes** in the icosahedron's diagram (§4.2).
4. **Which Du Val letter attaches to which cell shape** for e₁/e₂ and g₁/g₂ (§4.4).
5. **Messer's rhombic-triacontahedron count** — 226, 227 or 228 depending on source (§2.7).
6. **A page reference for Coxeter's 1947 reciprocity remark.**
7. **The dodecahedron shell ↔ named stellation mapping** (§6) — verified geometrically, not
   against a source.
8. **The itemised stellation/faceting diagram dictionary** in §7.4 is my compression of
   Inchbald's prose.
