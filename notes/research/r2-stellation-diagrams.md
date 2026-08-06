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
  defined the operation in *Harmonices Mundi* (1619), distinguishing edge-extension
  (*echinus*, "sea urchin") from face-extension (*ostrea*, "oyster"). [LIT: Wikipedia,
  *Stellation*, https://en.wikipedia.org/wiki/Stellation, §"Kepler's definition"]
  (Not "the first systematic account": Inchbald's timeline puts the first known systematic
  treatment of star polygons at Bradwardine, 14th century.)
* **Cell** — a bounded three-dimensional region cut out of space by the full arrangement of
  face planes. Term due to Du Val (1938). Our program's "cells" are exactly these.
* **Shell / layer** — the set of cells at a given distance "outwards" from the core solid.
  Du Val's measure is the **power** of a cell: the number of face planes you cross going
  from the polyhedron's centre out to that cell. [LIT: HandWiki, *The Fifty-Nine
  Icosahedra*, https://handwiki.org/wiki/The_Fifty-Nine_Icosahedra]
* **Faceting** (also spelled *facetting*) — the reverse operation: removing material from a
  polyhedron without adding any new vertices, so new faces appear along diagonals. §7.

---

## 2. Where it comes from

**UNCERTAIN — none of the sources I could reach names an inventor.** What they support is a
sequence of *uses*: the earliest documented one is **Edmund Hess, 1876**; the subject is
consolidated in **Max Brückner's 1900 book**; the diagram becomes an enumeration *method*
with **A. H. Wheeler in 1924**; and it becomes canonical with **Coxeter, Du Val, Flather and
Petrie in 1938**. Wikipedia's *Stellation diagram* article attributes the invention to
nobody, and Inchbald's history does not credit Hess with it either. Do not write "Hess
invented the stellation diagram" in the tutorial.

### 2.1 Before the diagram (1619–1859)

* **Kepler, 1619** — *Harmonices Mundi*. Defines stellation; constructs the small and great
  stellated dodecahedra, and the *stella octangula* (the compound of two tetrahedra).
* **Poinsot, 1809** — rediscovers Kepler's two stars and finds the great dodecahedron and
  great icosahedron. Together these four are the **Kepler–Poinsot polyhedra**.
* **Cauchy, 1813** — proves the list of four is complete, by treating them as stellations of
  the dodecahedron and icosahedron.
* **Bertrand, 1858** — derives the same four by *faceting* instead. See §7.
  [LIT for this paragraph: G. Inchbald, "Stellating and Facetting — a Brief History",
  https://www.steelpillow.com/polyhedra/StelFacet/history.html; HandWiki, *The Fifty-Nine
  Icosahedra*. **Note:** Wikipedia's *Stellation* article, cited here in an earlier draft,
  does **not** mention Poinsot, Cauchy or Bertrand — do not cite it for them.]

None of these authors needed a general diagram: they were dealing with a handful of highly
symmetric forms that can be described in words.

### 2.2 Hess, 1876 — the earliest documented use

**[LIT]** Edmund Hess (1843–1903) is recorded as having worked with stellation diagrams in
1876, completing the "main-line" series of stellated icosahedra with their help. The same
year he gave the first descriptions of three regular compounds — five cubes, five octahedra
(which is also the icosahedron's second stellation) and ten tetrahedra.
[Wikipedia and HandWiki, *The Fifty-Nine Icosahedra*; Wikipedia, *Compound of five
octahedra*, https://en.wikipedia.org/wiki/Compound_of_five_octahedra; Wikipedia, *Compound
of five cubes*; Wikipedia, *Compound of ten tetrahedra*]

**UNCERTAIN — "used", not "invented".** Both sources say Hess *used* stellation diagrams;
neither says he originated them. Wikipedia's *Stellation* article does not mention Hess at
all (it was cited here in an earlier draft — wrongly). Inchbald's timeline has no 1876 Hess
entry at all; his Hess entry is **1883**, for a later search for uniform polyhedra. So even
the 1876 date rests on the Wikipedia/HandWiki line alone.

The publication usually cited is Hess, *Über die zugleich gleicheckigen und gleichflächigen
Polyeder*, Sitzungsberichte der Gesellschaft zur Beförderung der gesamten
Naturwissenschaften zu Marburg (1876).
**UNCERTAIN:** I could not open the 1876 paper itself, so I cannot confirm at first hand
what his figures look like or whether he drew the full plane arrangement or only the parts
he needed. Secondary sources are consistent that the technique is his.

### 2.3 Brückner, 1900 — the diagram in a standard reference

**[LIT]** Max Brückner (1860–1934), *Vielecke und Vielflache: Theorie und Geschichte*
(Leipzig: B. G. Teubner, 1900) — "Polygons and Polyhedra: Theory and History". It is the
turn-of-the-century survey of the subject: several hundred line engravings, plus ten sheets
of photographs recording a collection of 146 card models. Brückner also carried stellation
past the regular star forms — though how far is not agreed. Wikipedia credits him with ten
stellations of the icosahedron including the *final* (complete) one; Inchbald instead counts
six that were *new* with him. **UNCERTAIN:** treat "ten" as one source's tally, not a
settled figure. [Wikipedia, *Final stellation of the
icosahedron*, https://en.wikipedia.org/wiki/Final_stellation_of_the_icosahedron; G. W. Hart,
"Max Brückner's Wunderkammer of Paper Polyhedra", *Bridges 2019*, pp. 59–66; Public Domain
Review, "Max Brückner's Collection of Polyhedral Models (1900)",
https://publicdomainreview.org/collection/max-bruckner-s-collection-of-polyhedral-models-1900/]

Brückner's book is where later authors — including Coxeter's group — got their picture of
the state of the art. Its scanned text is online (University of Michigan Historical Math
Collection, https://quod.lib.umich.edu/u/umhistmath/ABN8316.0001.001).

**UNCERTAIN:** no source asserts that the stellation diagram *originates* with Brückner —
but, per §2.2, none asserts it originates with Hess either, so this is not a case of the
credit going elsewhere; it is a case of the credit being unassigned. Brückner's book
certainly contains plane construction figures and nets, and it is the standard 19th-century
reference for stellations. Wikipedia's *Stellation diagram* article does cite Brückner's
1900 drawings as its only historical reference, which is the closest thing to an attribution
I found anywhere. "Brückner documented and popularised the subject" is well supported;
"Brückner introduced the diagram" is not.

### 2.4 Wheeler, 1924 — the diagram becomes a method

**[LIT]** Albert Harry Wheeler (1873–1950), an American schoolteacher and prolific
model-maker, was an invited speaker at the International Congress of Mathematicians in
Toronto in 1924. His paper — "Certain forms of the icosahedron and a method for deriving
and designating higher polyhedra", *Proceedings of the International Mathematical Congress,
Toronto* (1924), vol. 1, pp. 701–708 — described how to build new figures by **marking out
areas of the stellation diagram and taking the cells that sit behind them**, hollow forms
and disconnected sets of cells included. He published a list of twenty stellation forms
(twenty-two if reflections are counted separately), the complete stellation among them.
[Wikipedia, *The Fifty-Nine Icosahedra*; Wikipedia, *Final stellation of the icosahedron*;
Wikipedia, *A. Harry Wheeler*, https://en.wikipedia.org/wiki/A._Harry_Wheeler]

Two things about Wheeler matter for how the diagram is used today.

1. **He worked with the *visible* regions of a face.** Inchbald marks this as the turn:
   Wheeler "introduces the idea of describing only the visible regions of a face — it is not
   clear why", and Miller's rules inherit the habit, so the 1938 enumeration ignores internal
   structure. **UNCERTAIN:** the phrase "false edges" is Inchbald's, and it belongs to his
   criticism of *Miller's rules* (they fail "to recognise crossing lines as false edges") —
   I found no evidence Wheeler used the term, and Inchbald does not call the step
   "controversial"; he says its motivation is unclear. Do not attribute "false edges" to
   Wheeler. [LIT: Inchbald, "Stellating and Facetting — a Brief History"]
2. **He fell out with Coxeter.** Wheeler was originally to be a co-author of the 1938
   monograph but objected to Coxeter's expository style; Coxeter then replaced his name on
   the title page. HandWiki quotes Wheeler complaining that Coxeter "has a way of taking a
   subject and tying it up into knots" that he found hard to follow.
   [LIT: HandWiki, *The Fifty-Nine Icosahedra*; Wikipedia, *A. Harry Wheeler*]

### 2.5 Miller's rules (date uncertain — Inchbald guesses "ca. late 1920s?")

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
Icosahedra*, University of Toronto Studies, Mathematical Series, No. 6 (1938) — 26 pp. plus
20 plates. Second edition Springer-Verlag 1982; third edition Tarquin 1999 (with new
reference material and photographs by K. and D. Crennell), ISBN 978-1-899618-32-3.
[Wikipedia and HandWiki, *The Fifty-Nine Icosahedra*; contemporary review in *The
Mathematical Gazette*, which gives the collation]

Division of labour:

* **Coxeter** — the enumeration, working from the face diagram, using combinatorics and
  graph theory (novel in a geometric setting at the time).
* **Du Val** — the *cell* approach: he observed that the extended planes cut space into
  finite regions he named **cells**, that cells of equal power form **shells**, and he built
  a letter notation for them (§4.4). He then tested all admissible combinations against
  Miller's rules and got the same 59, confirming Coxeter.
* **Petrie** — the three-dimensional drawings.
* **Flather** — built card models of all 59; they survive in the mathematics library at
  Cambridge University. (The same library holds some "non-Miller" models whose maker is not
  established — Inchbald tentatively attributes them to Flather.)
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
  *greatening* for extending faces, *aggrandizement* for extending the cells of a 4-polytope.
  Inchbald says the first published reference to the scheme "seems to be" Coxeter, *Regular
  Complex Polytopes* (1974) — hedged in the source, so hedge it here too. [LIT: same source;
  Wikipedia, *Stellation*]
* **Bridge, 1974** — "Facetting the dodecahedron", *Acta Crystallographica* A30, 548–552.
  Enumerates 22 faceted dodecahedra and reciprocates them into stellated icosahedra.
  [LIT: IUCr, https://journals.iucr.org/paper?S0567739474001306; Inchbald, "Stellating and
  Facetting — a Brief History"]
* **Pawley, 1975** — enumerates the "non-reentrant" stellations of the rhombic
  triacontahedron (those with no undercut regions; nowadays called *fully supported*). His
  paper is titled "The 227 Triacontahedra". Note the year: **1975, not 1973**, and
  *Geometriae Dedicata* **4**, not 1.
  [LIT: Inchbald, "Stellating and Facetting — a Brief History"; Wikipedia, *Rhombic
  triacontahedron*]
* **The full Miller-rule count for the rhombic triacontahedron** is where the diagram's
  combinatorial explosion actually shows. MathWorld and Robert Webb's *Great Stella* give
  **358,833,098** (84,959 reflexible, 358,748,139 chiral); Wikipedia and HandWiki give
  **358,833,097**. **UNCERTAIN:** the totals differ by one — presumably a convention about
  the core solid — and I could not settle it. This count is **not Pawley's**; his was the
  227. [LIT: MathWorld, *Rhombic Triacontahedron Stellations*,
  https://mathworld.wolfram.com/RhombicTriacontahedronStellations.html; Wikipedia and
  HandWiki, *Rhombic triacontahedron*]
* **Hudson & Kingston, 1988** — "Stellating polyhedra", *Mathematical Intelligencer* 10,
  50–61. A cell-based treatment with a much weaker main rule: the chosen cell set need only
  have no interior cavity. [LIT: Inchbald, "Stellating and Facetting — a Brief History"]
* **Messer, 1995** — "Stellations of the rhombic triacontahedron and beyond", *Structural
  Topology* 21, 25–46 (updated version reprinted in *Symmetry: Culture and Science* 11
  (2000), 201–230). Enumerates the *fully supported* stellations (no undercuts) of the
  rhombic triacontahedron. **Sources disagree on the count**: Wikipedia, HandWiki and
  *Great Stella* say **227**, matching the title of Pawley's paper; Messer's own text is
  reported as **226** excluding the core solid; Inchbald's history says **228**. The 226/227
  gap is just whether the original solid is counted; the 228 I could not reconcile.
  [LIT: Messer 1995 via ResearchGate,
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
20 faces is an irregular **9/4 star polygon, or enneagram**. The same article's diagram
caption calls the faces "2-isogonal 9/4" — i.e. their nine points fall into two symmetry
classes — and my computation gives exactly that: 9 outer regions = one class of 3 + one
class of 6. Note the "2-isogonal" wording is a caption, not body text.**]**

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
stellations (the small triambic icosahedron, the compound of five octahedra, the great
icosahedron), while the long spikes belong to the outer shells. *Not* "the triakis/small
triambic icosahedron": the first stellation is the **small triambic icosahedron**, whose 20
faces are triambi. Split each triambus into its three coplanar triangles and you get *one
form of* a triakis icosahedron, but that is not the Catalan triakis icosahedron (dual of the
truncated dodecahedron), which has shallower pyramids. Keep the two names apart.
[LIT: Wikipedia, *Small triambic icosahedron*]

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
* HandWiki spells out Du Val's scheme: the core icosahedron (power 0) is **A**, the power-1
  shell **b**, power-2 **c**, and so on to **h**; where a shell holds non-congruent cells
  they are numbered (e₁, e₂); where it holds an enantiomorphic pair, one is set in roman and
  the other in italic. So shell **f** (power 5) holds three kinds: f₁, *f₁* and f₂. Counting
  the enantiomorphs separately gives twelve sets.
  [LIT: https://handwiki.org/wiki/The_Fifty-Nine_Icosahedra]
  (Careful with the case: HandWiki uses capitals for *stellations* named after their outer
  shell — B = A + b, De₁ = A + b + c + d + e₁ — and lower case for the shells themselves.)

The 10-vs-11-vs-12 count is not a real disagreement, and it is precisely the *sub-cell* idea
in our program:

* Under the **full** icosahedral group *Ih* (order 120, rotations *and* mirrors) there are
  **11 orbits** of cells: the core plus the 10 shapes MathWorld lists. **[COMP]**
* Under the **rotation-only** group *I* (order 60) there are **12 orbits**: the single orbit
  of 120 cells (**f₁**) splits into two mirror-image halves of 60. Every other orbit is
  unchanged, because every other cell shape lies on a mirror plane. **[COMP]**
* Du Val wrote the two halves in roman and italic, f₁ and *f₁* — HandWiki reproduces exactly
  that convention, and Inchbald's paper uses it too (his lost stellation De₁f₁f₂ has the
  enantiomorph De₁*f₁f₂*). Counting the two halves separately, plus the core, gives the 12.
  (An earlier draft here said HandWiki renders them "f₁₁ and f₁₂"; it does not — there is no
  double-subscript notation in the source.)

So: **the program's "orbit splits into a chiral pair when the stellation symmetry is I" is
Du Val's roman/italic distinction, and it happens for exactly one orbit in the icosahedron.**

**UNCERTAIN:** which of e₁/e₂ and g₁/g₂ is the 20-cell and which the 60-cell class. The
ordering in MathWorld's list implies e₁ = 20, e₂ = 60, g₁ = 30, g₂ = 60, but I have not seen
Du Val's own definitions. The **f** labels are *not* uncertain: HandWiki states that shell f
holds f₁, *f₁* and f₂ with f₁ the enantiomorphic pair, so f₁ = the 120 that splits 60 + 60
and f₂ = the 12.

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
vertices as the old one. Bertrand applied it to the **icosahedron and the dodecahedron** and
recovered the four Kepler–Poinsot star polyhedra — a cleaner derivation than Cauchy's, and
the earliest treatment of what we now call faceting. (Inchbald's history says "by facetting
the icosahedron and dodecahedron"; an earlier draft here said "all five Platonic solids",
which no source supports.)

Bertrand did **not** coin *étoilé*: Inchbald says he uses the term "in a manner which
suggests that the term was already familiar to his audience." The English "stellated" comes
from Cayley, who in 1859 translated *étoilé* and gave the four stars their accepted English
names. [LIT: Inchbald's translation and commentary; Inchbald, "Stellating and Facetting —
a Brief History"]

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
* Bridge (1974) enumerated 22 faceted dodecahedra and reciprocated them into stellated
  icosahedra — but **not** one-for-one with the 59. Inchbald's account is that Bridge's
  reciprocals include isomorphs of known stellations *and* a stellated icosahedron `Df₂`
  which is a uniform dual yet is absent from the 59, being forbidden by Miller's rules;
  Bridge also discarded two of his own facetings because their reciprocals run to infinity.
  This mismatch is the point of the example, so do not describe it as a clean bijection.
  [LIT: *Acta Cryst.* A30, 548–552; Inchbald, "Stellating and Facetting — a Brief History"]

### 7.4 The faceting diagram, and how it mirrors the stellation diagram

**[LIT]** G. Inchbald, "Facetting diagrams", *The Mathematical Gazette* **90** (July 2006),
pp. 253–261; web version at
https://www.steelpillow.com/polyhedra/FacetingDiagrams/FacetingDiags.html

Construction. Where a stellation diagram is drawn **in the plane of a face**, a faceting
diagram is drawn **around a vertex**. Slice the corner off the polyhedron and you get its
**vertex figure**, a small polygon (for the dodecahedron, a triangle; for the icosahedron, a
pentagon). Onto that, mark every *other* vertex reachable from your vertex by a candidate
new edge, and every candidate new face through it — Inchbald calls the result "a kind of
'complete vertex figure'". His lettering does **not** split faces from edges by case: an
upper-case letter names a whole symmetry-orbit (of faces, or of edges), and the matching
lower-case letter names an individual section of it — "sides ***a*** are sections of the
three congruent faces ***A***". An earlier draft here had this backwards.

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

1. The diagram is a device of at least 150 years' standing — in documented use by 1876, and
   standard equipment since 1938 — for turning "which stellation?" into "which regions do I
   shade?". Say "in use by 1876", not "invented by Hess in 1876"; see §2.2.
2. Our program answers the same question with **cells** instead — Du Val's half of the 1938
   book, and the approach later authors (Hudson & Kingston 1988, Inchbald 2002) argued is
   the sounder one.
3. The two are linked by one clean fact: **every face of every cell is exactly one
   elementary region of the diagram of the plane it lies in** — but a cell has ~5 faces
   scattered over several planes, and a region has a cell on each side, so there is no
   one-to-one correspondence.
4. The layer numbers in our Cells table are Du Val's **power**, and the layers are his
   shells: core **A**, then **b, c, d, e, f, g, h**. (Capital letters elsewhere in Du Val's
   notation name whole *stellations* — B = A + b — so say "shell b", not "shell B".)
5. The chiral split of the 120-cell orbit into 60 + 60 is Du Val's roman/italic pair f₁ / *f₁*,
   and it is the *only* orbit of the icosahedron that splits when the stellation symmetry
   drops from *Ih* to *I*.
6. The whole diagram, fully shaded, is the face of the final stellation — an irregular
   nine-pointed {9/4} star.

---

## 9. Sources

Primary / historical

* J. Kepler, *Harmonices Mundi* (1619).
* L. Poinsot, "Mémoire sur les polygones et les polyèdres", *J. de l'École Polytechnique* (1810; work of 1809). **UNCERTAIN:** volume/pages vary by source — Inchbald gives 4, pp. 16–49; other references give 9, pp. 16–48 (probably tome vs. *cahier*). Check before printing.
* A. L. Cauchy, "Recherches sur les polyèdres", *J. de l'École Polytechnique* 16 (1813), 68–86 (work of 1811–12).
* J. Bertrand, "Note sur la théorie des polyèdres réguliers", *C. R. Acad. Sci.* 46 (1858), 79–82 (and p. 117). English translation: http://steelpillow.com/polyhedra/StelFacet/Bertrand1858EngTrans.html
* A. Cayley, "On Poinsot's Four New Regular Solids", *Phil. Mag.* 17 (1859), 123–128 — the source of the English word "stellated", translating Bertrand's *étoilé*.
* E. Hess, *Über die zugleich gleicheckigen und gleichflächigen Polyeder*, Sitzungsber. Ges. Beförd. gesamten Naturwiss. Marburg (1876).
* M. Brückner, *Vielecke und Vielflache: Theorie und Geschichte* (Leipzig: Teubner, 1900). Scan: https://quod.lib.umich.edu/u/umhistmath/ABN8316.0001.001
* A. H. Wheeler, "Certain forms of the icosahedron and a method for deriving and designating higher polyhedra", *Proc. Int. Math. Congress, Toronto* (1924), vol. 1, 701–708.
* H. S. M. Coxeter, P. Du Val, H. T. Flather, J. F. Petrie, *The Fifty-Nine Icosahedra*, Univ. of Toronto Studies, Math. Series 6 (1938), 1–26; 2nd ed. Springer 1982; 3rd ed. Tarquin 1999.
* H. S. M. Coxeter, *Regular Polytopes* (1947; 3rd ed. Dover 1973).

Later work

* N. J. Bridge, "Facetting the dodecahedron", *Acta Cryst.* A30 (1974), 548–552. https://journals.iucr.org/paper?S0567739474001306
* G. S. Pawley, "The 227 Triacontahedra", *Geometriae Dedicata* **4** (1975), 221–232. (Corrected: an earlier draft said vol. 1, 1973. Year and volume confirmed against Wikipedia, *Rhombic triacontahedron*, and Inchbald's history. I did not open the paper itself.)
* J. L. Hudson & J. G. Kingston, "Stellating polyhedra", *Math. Intelligencer* 10 (1988), 50–61.
* P. Messer, "Stellations of the rhombic triacontahedron and beyond", *Structural Topology* 21 (1995), 25–46. https://www.researchgate.net/publication/265206552 — updated version reprinted as *Symmetry: Culture and Science* 11 (2000), 201–230.
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
* Wikipedia, *Small triambic icosahedron* — https://en.wikipedia.org/wiki/Small_triambic_icosahedron
* Wikipedia, *Compound of five cubes*, *Compound of ten tetrahedra*
* Wikipedia, *Rhombic triacontahedron* — https://en.wikipedia.org/wiki/Rhombic_triacontahedron
* MathWorld, *Rhombic Triacontahedron Stellations* — https://mathworld.wolfram.com/RhombicTriacontahedronStellations.html
* HandWiki, *The Fifty-Nine Icosahedra* — https://handwiki.org/wiki/The_Fifty-Nine_Icosahedra
* HandWiki, *Rhombic triacontahedron* — https://handwiki.org/wiki/Rhombic_triacontahedron
* MathWorld, *Icosahedron Stellations* — https://mathworld.wolfram.com/IcosahedronStellations.html
* MathWorld, *Dodecahedron Stellations* — https://mathworld.wolfram.com/DodecahedronStellations.html
* Wikimedia Commons, *Category:Stellation diagrams* — https://commons.wikimedia.org/wiki/Category:Stellation_diagrams

---

## 10. Open questions / things I could not confirm

1. **What Hess's 1876 figures actually look like, and whether 1876 is even the right year.**
   Secondary sources say he *used* stellation diagrams — none says he introduced them, and
   Inchbald's timeline dates Hess's work to 1883 instead. The paper itself was not
   accessible. Do not upgrade "used" to "invented".
2. **Whether Brückner drew stellation diagrams.** He is credited with documenting and
   extending stellation, not with inventing the diagram. Do not claim otherwise without a
   primary check.
3. **The 13-vs-15 numbering of region classes** in the icosahedron's diagram (§4.2).
4. **Which Du Val letter attaches to which cell shape** for e₁/e₂ and g₁/g₂ (§4.4). The
   f-labels are now settled (f₁ = the 120 that splits, f₂ = the 12).
5. **Messer's rhombic-triacontahedron count** — 226, 227 or 228 depending on source (§2.7).
6. **A page reference for Coxeter's 1947 reciprocity remark.**
7. **The dodecahedron shell ↔ named stellation mapping** (§6) — verified geometrically, not
   against a source.
8. **The itemised stellation/faceting diagram dictionary** in §7.4 is my compression of
   Inchbald's prose.
9. **The two rhombic-triacontahedron totals**, 358,833,097 vs 358,833,098 (§2.7).
10. **Brückner's icosahedron-stellation count** — ten (Wikipedia) vs six new ones
    (Inchbald) (§2.3).
11. **Poinsot's volume number** (§9).

### Verification note (this pass)

Every **[COMP]** number in §§3–6 was recomputed from scratch in an independent script
(plane arrangement built from the convex hull, cells and regions enumerated by sign vector,
symmetry group found by brute force over the vertex set). All of them reproduced: 18 trace
lines; 48 intersection points at 8 radii with multiplicities 3, 3, 6, 9, 9, 6, 3, 9; the nine
line-normal angles and their 22.24°/22.24°/15.52° spacing; 67 bounded regions in 15 classes
(1 + 6×3 + 8×6); an 18-vertex outline with nine points at 8.32 and notches at 2.25 (×6) and
4.16 (×3); 473 cells in layers 1, 20, 30, 60, 80, 132, 90, 60; 11 orbits under *Ih* and 12
under *I* with exactly one orbit (the 120) splitting; 2,500 cell–facet incidences (5.285 per
cell); 58 regions with cells on both sides and 9 with one. The §6 table for the tetrahedron,
cube, octahedron, dodecahedron and rhombic dodecahedron also reproduced exactly, including
the dodecahedron's 1 + 5 + 5 + 5 region classes. **The arithmetic in this note is sound; the
errors found in this pass were all in the history and the citations.**
