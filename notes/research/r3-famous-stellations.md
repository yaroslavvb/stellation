# R3 — The famous stellations of the icosahedron

Research note for the "Cells" tutorial. Written for a reader who has never met a
stellation before. Everything here is sourced; where I checked a claim by direct
computation I say so explicitly, and where sources disagree I say that too.

> Adversarially fact-checked 2026-08-05 against Wikipedia, MathWorld, Polytope
> Wiki, steelpillow.com, IUCr/ADS and Cambridge Core. Corrections applied in
> place; see **§11** for the log of what survived and what did not. Anything
> marked **UNCERTAIN** is an inference of mine, not a sourced fact — do not
> promote it to prose in the tutorial without a citation.

---

## 0. Two-minute orientation

**Stellation.** Take a polyhedron and extend each of its face planes out to
infinity. Twenty planes (the icosahedron's twenty faces) chop space into pieces.
The pieces that are *finite* are called **cells**. Pick a set of cells, glue them
together, and you get a new solid whose faces all still lie in those same twenty
planes. That new solid is a **stellation** of the icosahedron.

**Shell / layer.** Draw a segment from the centre of the icosahedron to a point
inside some cell, and count how many face planes it crosses. That count is the
cell's **power** (Du Val's term). All cells with the same power form one
concentric **shell**, also called a layer. Power 0 is the core icosahedron
itself.

**Orbit.** Cells that the icosahedron's symmetry group can carry onto one another
are congruent and are always chosen together — one "selectable unit".

**Why "famous".** Several cell-sets are not just pretty solids: they turn out to
be objects that were already famous for entirely different reasons — a
Kepler–Poinsot regular star polyhedron, three of the five regular *compounds*,
a uniform-polyhedron dual, a noble self-dual polyhedron. That coincidence is
the hook for the tutorial.

---

## 1. The cell / shell scheme this program is reproducing

Patrick Du Val's notation, from *The Fifty-Nine Icosahedra* (Coxeter, Du Val,
Flather & Petrie, University of Toronto Press, 1938; 3rd edn Tarquin, 1999),
is exactly the scheme the program computes. Shells are named with bold lower-case
letters outward from the core: **a**, **b**, **c**, **d**, **e**, **f**, **g**,
**h** — eight shells, matching the program's eight layers. Where a shell contains
more than one shape of cell the shapes are numbered, e.g. **e₁** and **e₂**.

| Program layer | Du Val | cells | cell shape (computed) | first reaches radius |
|---|---|---|---|---|
| 0 | **a** (or **A**) | 1 | the icosahedron itself | 1.902 |
| 1 | **b** | 20 | tetrahedron (a shallow pyramid on each face) | 2.028 |
| 2 | **c** | 30 | triangular bipyramid | 2.618 |
| 3 | **d** | 60 | quadrilateral pyramid | 2.760 |
| 4 | **e₁** | 20 | 8 vertices / 9 faces | 4.535 |
| 4 | **e₂** | 60 | quadrilateral pyramid | 3.098 |
| 5 | **f₁** | **120** — splits into two mirror-image sets of 60 | tetrahedron | 4.535 |
| 5 | **f₂** | 12 | pentagonal trapezohedron | 8.057 |
| 6 | **g₁** | 30 | triangular bipyramid | 4.535 |
| 6 | **g₂** | 60 | quadrilateral pyramid | 8.057 |
| 7 | **h** | 60 | triangular bipyramid | 15.901 |

Total **473 finite cells**, in **12 distinct shapes** (11 congruence classes under
full symmetry, but **f₁** is chiral so it counts as two shapes). Guy Inchbald
states both figures — 473 cells, 12 shapes — in *In search of the lost icosahedra*
(*The Mathematical Gazette* **86**, July 2002, pp. 208–215; web version at
steelpillow.com). MathWorld, citing Wenninger (1989, p. 41), gives the same
breakdown as the sum 20+30+60+20+60+120+12+30+60+60 "of 10 different shapes and
sizes" (that count excludes the core and merges the two hands of **f₁**).

**These are exactly the program's numbers.** 1 / 20 / 30 / 60 / (20+60) /
(12+120) / (30+60) / 60, summing to 473, with the 120 splitting into 60+60 under
rotation-only symmetry. I re-derived the whole arrangement from scratch
(20 planes, 274 arrangement vertices, orbit computation under the 120-element
group I<sub>h</sub> and the 60-element rotation group I) and got 11 orbits under
I<sub>h</sub>, 12 under I, layer sizes identical to the program's. See §8.

**Trap for the tutorial:** Du Val's subscripts are *not* ordered by orbit size the
same way in every shell. In shell **e**, e₁ = 20 and e₂ = 60. In shell **f**,
f₁ = **120** and f₂ = **12** — the bigger set has the smaller subscript. In shell
**g**, g₁ = 30 and g₂ = 60. If the program lists a layer's orbits by size, its
"first" orbit in layer 5 is Du Val's **f₂**, not **f₁**. Independent
confirmations of these assignments: Inchbald describes **g₁** as "a collection of
thirty bipyramids" and **f₂** as "twelve quite disconnected trapezohedra floating
in space"; in Wikipedia's table Wheeler's descriptive names are "Discrete
twelve-pointed, crown-rimmed group" for **f₂** (Crennell 16) and "Twenty-pointed,
six-edged" for **De₁** (Crennell 21), which pins e₁ = 20; and the compound of
ten tetrahedra, which needs all 120 shell-**f** cells, is written **Ef₁**.

**Capital-letter shorthand.** If a stellation contains *every* cell out to and
including some shell, it is named after that shell in capitals. So
**A** = a; **B** = a+b; **C** = a+b+c; **D** = through d; **E** = through e;
**F** = through f; **G** = through g; **H** = everything. These eight are
commonly called the **mainline** stellations (the term is used in Wikipedia's
article without attribution). **UNCERTAIN** whether "mainline" is Coxeter's or
Du Val's own word — I found no source that attributes it to either of them, so do
not put it in Coxeter's mouth in the tutorial. Mixed names concatenate: **Ef₁g₁** means
"everything through shell e, plus the f₁ cells, plus the g₁ cells".

**Chirality notation.** Because **f₁** is an enantiomorphic (mirror-image) pair of
60-cell sets, Du Val writes bold upright **f₁** when *both* hands are present, and
uses upright vs *italic* f₁ to distinguish one hand from the other when only one
is taken. This is the single most important notational fact for our tutorial.

---

## 2. Miller's rules (what makes the count 59)

J. C. P. Miller — described by Wikipedia as a close colleague of Coxeter and
Petrie who did not contribute to the book directly — proposed five criteria for a
"properly significant and distinct" stellation. Paraphrased (the wording below is
mine; see §9 for the source text):

1. **(i)** All faces lie in the icosahedron's twenty face planes.
2. **(ii)** Every plane carries the same figure, though that figure may be in
   several disconnected pieces.
3. **(iii)** The figure in each plane is symmetric under a three-fold rotation
   (reflection optional). (i)–(iii) together force icosahedral symmetry on the
   whole solid.
4. **(iv)** Every part of every face must be *accessible* from outside — no
   sealed internal cavities. This stops two stellations from looking identical
   from the outside.
5. **(v)** Reject anything that splits into two sets each of which already has the
   full symmetry — i.e. no disconnected compounds of simpler stellations. One
   exception is stated: a compound of two enantiomorphous solids with no common
   part is allowed. **UNCERTAIN:** the rule as quoted does not say how many
   figures actually invoke this exception; the "exactly one case" reading is mine,
   not the book's (see §7).

Applying them gives 58 stellations plus the icosahedron itself = **59**. Of the
59, **32 are reflexible** (mirror-symmetric) and **27 are chiral**, listed only in
their right-handed form. Since there are 12 cell shapes, the *unrestricted*
number of non-empty cell selections is 2¹² − 1 = **4095** (Inchbald 2002) — so
Miller's rules throw away the overwhelming majority.

Numbering 1–59 was **not** in the 1938 or 1982 editions. Kate and David Crennell
added it for Tarquin's 1999 third edition. The ordering is *not* simply the plate
order: indices 1–32 are the reflexible forms and 33–59 the chiral ones, with only
the right-handed member of each chiral pair listed. Everyone (Wikipedia, George
Hart, MathWorld) now cites the Crennell numbers.

**Fully supported** stellations are those with no "overhang" — every visible part
of every face is seen from the same side, which makes them the pleasant ones to
build in card. There are **18**: 16 reflexible and 2 chiral (Robert Webb's *Stella*
documentation, via MathWorld — MathWorld's exact words are "18 of the 59
stellations are fully supported. Of these, 16 are reflexible and 2 are chiral").
The *total* 18/16/2 is sourced; the membership list below is **not**.
**UNCERTAIN:** I re-derived a list from the face-region data in Wikipedia's table
and got 18 — the eight mainline forms A–H, plus De₁, Ef₁ (ten tetrahedra), Fg₁,
Ef₁g₁ (excavated dodecahedron), De₂, Ef₂, Fg₂, De₂f₂, and, as the two chiral
ones, **Ef₁ (compound of five tetrahedra)** and **Ef₁f₂** — but I found no
published list to check it against, and the count matching 18 is weak evidence
that each individual entry is right. Verify against *Stella* before publishing
any of these names.

---

## 3. The cast, one by one

Cell counts below are the number of Du Val cells in each figure. I computed them
directly (§8); they are arithmetic consequences of the Du Val symbols, which come
from the literature.

### 3.1 The first stellation — small triambic icosahedron / triakis icosahedron

* **Du Val symbol:** **B** = a + b. **21 cells** (core + the 20 face-pyramids).
* **Crennell no.** 2 of 59. **Wenninger** model 26, where it is called
  *triakis icosahedron*. As a uniform dual it is **DU₃₀**.
* **Elements (as a star polyhedron):** 20 faces, 60 edges, 32 vertices,
  Euler characteristic χ = −8. The faces are *equilateral* convex hexagons; most
  of each hexagon is buried inside the solid.
* **Face angles** alternate arccos(−1/4) ≈ 104.4775° and arccos(1/4)+60° ≈
  135.5225°. I reproduced both angles exactly from the plane arrangement, which
  is a good check that the "first stellation" and the "small triambic
  icosahedron" really are the same point-set.
* **Dual:** the small ditrigonal icosidodecahedron (a uniform polyhedron), which
  makes the small triambic icosahedron a **uniform dual**.
* **Who/when:** the *shape* is very old — a non-convex triakis icosahedron was
  drawn by Leonardo da Vinci for Pacioli's *Divina proportione* (written 1498,
  printed 1509) as the *icosahedron elevatum*, though that version has a different
  pyramid height (see §4). Wikipedia's *Triakis icosahedron* article confirms the
  attribution: the icosahedron elevatum was "first depicted in a non-convex form
  with equilateral triangle faces by Leonardo da Vinci in Luca Pacioli's *Divina
  proportione*". Brückner photographed it in *Vielecke und Vielflache* (1900, Taf. VIII
  Fig. 2). Wheeler listed it in 1924 ("hexagonal", his no. 2).
* **Outer form:** 32 outer vertices — the icosahedron's 12, plus 20 pyramid
  apexes at radius 2.028 (core circumradius 1.902), so the spikes are shallow.

### 3.2 Compound of five octahedra

* **Du Val symbol:** **C** = a + b + c. **51 cells**.
* **Crennell no.** 3 of 59. **Wenninger** 23. **UC₁₇**. Coxeter symbol
  [5{3,4}]2{3,5}. Also called the *small icosicosahedron*.
* **Elements (as a compound):** 5 octahedra → 40 faces, 60 edges, 30 vertices.
  The 30 vertices are the vertices of an **icosidodecahedron** — I confirmed that
  the outermost 30 vertices of the cell-union sit on the 2-fold axes at radius
  2.618 = φ².
* **Symmetry:** full icosahedral **I<sub>h</sub>**. It is *not* chiral. Reason: the
  subgroup of I<sub>h</sub> that fixes one constituent octahedron is the
  pyritohedral group T<sub>h</sub>, of order 24, so the orbit has 120/24 = 5
  members and the whole compound is already mirror-symmetric.
* **Who/when:** Wikipedia and most modern sources credit **Edmund Hess, 1876**.
  Inchbald's history page argues that **Cauchy** already knew the compounds of
  five octahedra and of five and ten tetrahedra as stellations of the icosahedron
  in his 1813 memoir *Recherches sur les polyèdres* (work of 1812). **Sources
  disagree; report both.** Brückner (1900, Taf. IX Fig. 6) modelled it.
* **Fun fact:** it is the only one of the five regular compounds whose convex hull
  is not regular; its dual compound is the compound of five cubes (which is *not*
  a stellation of the icosahedron — it is a stellation of the rhombic
  triacontahedron).

### 3.3 Compound of five tetrahedra — **the chiral one**

* **Du Val symbol:** **E**f₁ with f₁ in upright type = everything through shell e,
  **plus one of the two 60-cell hands of shell f₁**. **251 cells**
  (1+20+30+60+20+60 = 191, plus 60). The mirror image is **E**​*f₁*.
* **Crennell no.** 47 of 59 (right-handed form listed; the left-handed twin is
  the same entry). **Wenninger** 24. **UC₅**. Coxeter symbol {5,3}[5{3,3}]{3,5}.
  Also called the *chiricosahedron*.
* **Elements (as a compound):** 5 tetrahedra → 20 faces, 30 edges, 20 vertices.
  The 20 vertices are the vertices of a regular **dodecahedron** — confirmed: the
  outermost 20 vertices of the cell union lie on the 3-fold axes at radius 4.535.
* **Symmetry:** **chiral icosahedral I** (rotations only, order 60). This is one
  of only two chiral **fully supported** stellations (the other is Ef₁f₂), which
  is why it is such a popular paper model.
* **Wheeler (1924)** numbered the two hands separately: 7 right-handed,
  6 left-handed. **Brückner** 1900, Taf. IX Fig. 11.
* **Who/when:** Hess 1876 per Wikipedia; Cauchy 1812/13 per Inchbald. Same
  disagreement as above.
* **Oddity worth mentioning in the tutorial:** reciprocating it returns the
  opposite hand rather than the same figure, so the compound's dual is its own
  mirror image. Wikipedia calls this behaviour extremely rare among polyhedra.

### 3.4 Compound of ten tetrahedra

* **Du Val symbol:** **Ef₁** with f₁ in bold = everything through shell e plus
  **all 120** shell-f₁ cells. **311 cells**.
* **Crennell no.** 22 of 59. **Wenninger** 25. **UC₆**. Coxeter symbol
  2{5,3}[10{3,3}]2{3,5}. Also called the *icosicosahedron*.
* **Elements (as a compound):** 10 tetrahedra → 40 faces, 60 edges, 20 vertices
  (vertex positions coincide in pairs at the 20 dodecahedron vertices).
  Treated instead as a plain non-self-intersecting solid, its surface has 180
  faces (120 triangles + 60 concave quadrilaterals), 300 edges, 122 vertices.
* **Symmetry:** full **I<sub>h</sub>**. It is literally the union of the two
  enantiomorphic five-tetrahedra compounds; equivalently, it is the orbit of one
  tetrahedron under the full group, since a tetrahedron's stabiliser in
  I<sub>h</sub> is the rotation group T of order 12 and 120/12 = 10.
* **Wheeler** 8. **Brückner** Taf. IX Fig. 3.
* **Miller's rule (v) note:** you might expect rule (v) to kill this, since it
  divides into two figures each with full rotational symmetry. It survives because
  the two halves share the whole inner core **E** — they are not disjoint — so it
  is not a "compound of two separate stellations" in the rule's sense.

### 3.5 Great icosahedron — the Kepler–Poinsot solid

* **Du Val symbol:** **G** = every cell out to and including shell g.
  **413 cells** (473 − the 60 cells of shell h).
* **Crennell no.** 7 of 59. **Wenninger** 41. (Wenninger's seventeen icosahedron
  stellations run W26–W42, so W41 is the sixteenth of them — that is my arithmetic
  from his numbering, consistent with W29 = "fourth stellation", W34 = "ninth" and
  W37 = "twelfth"; Wenninger himself labels W41 simply *great icosahedron*.)
  Uniform polyhedron U53.
* **Elements:** Schläfli symbol {3, 5/2}; **20 triangular faces, 30 edges,
  12 vertices**, density 7. Its 12 vertices sit on the 5-fold axes; I measured
  them at φ³ ≈ 4.236 times the core icosahedron's circumradius, from which the
  edge length works out to φ⁴ ≈ 6.854 times the core edge — matching the standard
  figure (7+3√5)/2.
* **Who/when:** **Louis Poinsot, 1809** ("Mémoire sur les polygones et les
  polyèdres", *Journal de l'École Polytechnique* **4**, 1810, pp. 16–49);
  Cauchy proved in 1812/13 that Poinsot's list of four regular star polyhedra is
  complete. Brückner 1900 (Taf. XI Fig. 24). Wheeler 11.
* **It is the only Kepler–Poinsot polyhedron among the 59.** The great stellated
  dodecahedron is *not* in the list: it is an **edge**-stellation of the
  icosahedron (Kepler's original construction), so its pentagram faces do not lie
  in the icosahedron's face planes. The other two, the small stellated
  dodecahedron and the great dodecahedron, are stellations of the dodecahedron.
* **Nice structural fact for the tutorial:** the great icosahedron's twelve spikes
  are each one **f₂** trapezohedron capped by five **g₂** pyramids
  (12 + 60 cells), which is why the spike tips of shells f and g land at the same
  radius, 8.057.

### 3.6 Excavated dodecahedron

* **Du Val symbol:** **Ef₁g₁** (f₁ bold — both hands). **341 cells**.
* **Crennell no.** 26 of 59. **Wenninger** 28, where it is the
  *third stellation of the icosahedron*.
* **Elements:** 20 faces (self-intersecting "star hexagons" / tripods), 60 edges,
  20 vertices, χ = −20.
* **Properties:** a **noble** polyhedron (face-transitive *and* vertex-transitive)
  and **self-dual**. It is also a faceting of the dodecahedron, and is one of ten
  abstract regular polyhedra of index two with vertices in a single orbit
  (Cutler & Schulte, 2010).
* **Shape:** picture a dodecahedron whose twelve faces have each been replaced by
  a pentagonal pyramid pointing inwards. Its edges come in two lengths: half of the
  60 are ordinary dodecahedron edges (and its 20 vertices are the dodecahedron's),
  while the remaining 30 are the longer edges of a great stellated dodecahedron.
  *(Wikipedia states the vertex/edge split; the extra observation that each long
  edge contains one edge of the icosahedral core is my own computation.)*
  That description is a neat cross-check on the
  cell content: **g₁** is exactly 30 cells (triangular bipyramids) reaching the
  dodecahedron's vertex radius, i.e. one per dodecahedron edge.
* **Who/when:** Brückner 1900 (Taf. VIII Fig. 26); Wheeler 9, who called it
  "Möbius (concave)". I could not confirm who coined the name "excavated
  dodecahedron". **UNCERTAIN.**

### 3.7 Final stellation / echidnahedron / complete icosahedron

* **Du Val symbol:** **H** — all 473 cells, everything out to shell h.
* **Crennell no.** 8 of 59. **Wenninger** 42, *final stellation*.
* **Elements:** as a star polyhedron, 20 faces, 90 edges, 60 vertices (χ = −10);
  as a plain visible-surface solid, **180 triangular faces, 270 edges,
  92 vertices** (χ = 2). I confirmed the 92: 60 outermost spike tips at radius
  15.901, plus 12 valley points on the 5-fold axes at 8.057, plus 20 deeper
  valley points on the 3-fold axes at 4.535.
* **Why "final":** every triple of face planes meets either at one of its vertices
  or strictly inside it, so there is nothing further out to add.
* **Who/when:** described and modelled by **Max Brückner, 1900** (Taf. XI Fig. 14);
  listed by **Wheeler 1924** (his no. 12, "complete"); Coxeter et al. 1938 make it
  the eighth figure. The name **echidnahedron** was coined in **1995 by Andrew
  Hume**, developer of the Netlib polyhedron database, after the spiny anteater.

### 3.8 Bonus: the medial / great triambic icosahedron

Worth a line in the tutorial because it is the other uniform-dual coincidence:
**De₂f₂** (Crennell 30, Wenninger 34, "ninth stellation") is simultaneously the
outer form of the **medial triambic icosahedron** (dual of the ditrigonal
dodecadodecahedron) and of the **great triambic icosahedron** (dual of the great
ditrigonal icosidodecahedron). The two are *different* polyhedra with the same
exterior — they differ in which edge crossings count as real vertices (medial:
24 vertices, 12 outside; great: 32 vertices, 12 outside). A cell-based analysis
cannot tell them apart, which is one of the standard criticisms of Miller's rules.

---

## 4. Small triambic icosahedron vs. first stellation vs. triakis icosahedron

Short answer: **same solid region, three different readings of its surface —
except for the Catalan solid, which is a genuinely different shape.**

The solid is always "icosahedron + a triangular pyramid on each of the 20 faces".
What differs is the pyramid height and how you count faces.

| Reading | Faces | E | V | Same solid as the stellation? |
|---|---|---|---|---|
| First stellation of the icosahedron (Coxeter **B**) | 20 (each = three coplanar isosceles triangles, disconnected) | — | 32 | yes, by definition |
| Small triambic icosahedron (star polyhedron, DU₃₀) | 20 equilateral convex hexagons | 60 | 32 | yes — same point set |
| Triakis icosahedron as a Kleetope (Wenninger's name for W26) | 60 isosceles triangles | 90 | 32 | yes |
| **Triakis icosahedron, the Catalan solid** (dual of the truncated dodecahedron) | 60 isosceles triangles | 90 | 32 | **no** — convex, shallower pyramids |
| Leonardo's *icosaedron elevatum* (1509), the equilateral deltahedron | 60 equilateral triangles | 90 | 32 | **no** — taller pyramids |

The stellation's pyramid height is pinned down by a coplanarity condition: the
apex sits exactly where the three neighbouring face planes meet, so each pyramid's
three lateral faces lie *in* the three neighbouring icosahedron face planes. That
is what makes the whole thing a stellation.

I computed the numbers (core edge 2): apex at 1.264911 from each base vertex,
pyramid height 0.5164, apex radius 2.02792 versus core circumradius 1.90211.
So the lateral triangles are **isosceles, not equilateral** (base 2, legs 1.2649),
and the resulting hexagon has sides 1.2649 with the alternating angles 104.4775°
and 135.5225° quoted for the small triambic icosahedron. Leonardo's version has
legs of length 2 (equilateral) — a strictly taller, spikier solid — and the Catalan
solid is strictly shallower, since it must stay convex. Sources that say the first
stellation "is" the triakis icosahedron are being loose about which one.

Practical rule for the tutorial: *first stellation* names the cell set,
*small triambic icosahedron* names the star polyhedron whose exterior it is, and
*triakis icosahedron* is ambiguous — say which one you mean.

---

## 5. Why the compound of five tetrahedra comes in two hands

This is the point the tutorial most needs to get right, so here it is three ways.

**(a) Cell-level statement.** Shell **f** contains a set of **120 congruent
tetrahedral cells** (Du Val's **f₁**). Under the *full* icosahedral group
I<sub>h</sub> (order 120, rotations plus reflections) these 120 cells form a single
orbit: no cell is fixed by any symmetry, so the orbit is as large as the group.
Under the *rotation-only* group I (order 60) that orbit necessarily splits into
**two orbits of 60**, which are mirror images of one another. Take the inner core
**E** plus one 60-cell half → compound of five tetrahedra. Take **E** plus the
other half → its mirror image. Take **E** plus all 120 → compound of ten
tetrahedra. Nothing else in the whole 473-cell arrangement splits like this:
every other orbit has a stabiliser containing a reflection or the central
inversion, so it stays whole when you drop to I.

**(b) Group-theoretic statement.** A regular tetrahedron inscribed in the
icosahedron's face planes has rotational stabiliser T (order 12) inside
I<sub>h</sub>. Its full symmetry group T<sub>d</sub> (order 24) is *not* a subgroup
of I<sub>h</sub> — I<sub>h</sub> ≅ A₅ × C₂, and its only order-24 subgroup is the
pyritohedral T<sub>h</sub> ≅ A₄ × C₂. Consequently the orbit of one tetrahedron
under the full group has 120/12 = **10** members, and under the rotation group only
60/12 = **5**. The five-compound therefore only exists as an I-symmetric figure;
apply any reflection (equivalently, the central inversion, which maps each
tetrahedron to the "dual" tetrahedron of the set) and you land on the other five.
Ten tetrahedra = five tetrahedra ∪ their central inversions = five stellae
octangulae. Contrast the octahedron, whose stabiliser T<sub>h</sub> *is* a
subgroup of I<sub>h</sub>: 120/24 = 5, so the five-octahedra compound is achiral.

**(c) Verified by direct computation.** From the 20 planes I found exactly **10**
sets of 4 planes forming a tetrahedron, and exactly **2** ways to split them into
5 tetrahedra using all 20 planes once. Testing which cells lie inside each union
gave:

```
5 tetrahedra (hand A)  251 cells = a1 b20 c30 d60 e1:20 e2:60  f1(R):60
5 tetrahedra (hand B)  251 cells = a1 b20 c30 d60 e1:20 e2:60  f1(L):60
10 tetrahedra          311 cells = a1 b20 c30 d60 e1:20 e2:60  f1(R):60 f1(L):60
5 octahedra             51 cells = a1 b20 c30
```

The two pentads use **complementary** halves of the 120-cell f₁ orbit and agree
on everything else. That is the whole story of the chirality, and it is exactly
the situation the program models when the stellation symmetry is set to the
rotation-only subgroup I.

---

## 6. Cell counts — quick reference

| Figure | Du Val | Crennell | Wenninger | cells |
|---|---|---|---|---|
| Regular icosahedron | **A** | 1 | 4 | 1 |
| First stellation / small triambic icosahedron | **B** | 2 | 26 | 21 |
| Compound of five octahedra | **C** | 3 | 23 | 51 |
| (fourth mainline) | **D** | 4 | — | 111 |
| (fifth mainline) | **E** | 5 | — | 191 |
| Compound of five tetrahedra (one hand) | **E**f₁ | 47 | 24 | 251 |
| Compound of ten tetrahedra | **Ef₁** | 22 | 25 | 311 |
| Second stellation | **F** | 6 | 27 | 323 |
| Excavated dodecahedron | **Ef₁g₁** | 26 | 28 | 341 |
| Great icosahedron | **G** | 7 | 41 | 413 |
| Final stellation / echidnahedron | **H** | 8 | 42 | 473 |

(Cell counts are my computation; the Du Val symbols and index numbers are from
the literature. The counts follow directly from the symbols and the shell sizes,
so they are not an independent claim — but they were verified geometrically for
A, B, C, the two tetrahedra compounds, G and H.)

---

## 7. In the 59, and out of it

**All eight** figures the tutorial asks about are **inside** Coxeter's 59. None of
them is excluded by Miller's rules. The interesting exclusions are elsewhere:

* **Great stellated dodecahedron** — excluded by rule (i). It *is* obtainable from
  the icosahedron, but by extending **edges** (Kepler's 1619 construction), which
  produces new face planes; the book only allows the icosahedron's own twenty
  planes. Inchbald notes that Coxeter's introduction misreads Kepler on precisely
  this point.
* **Compound of five cubes** — not a stellation of the icosahedron at all (it is a
  stellation of the rhombic triacontahedron). It is the *dual* of the compound of
  five octahedra.
* **Df₂** — D plus the twelve **f₂** trapezohedra. N. J. Bridge found it in 1974
  while reciprocating "tidy" facetings of the dodecahedron ("Faceting the
  dodecahedron", *Acta Crystallographica* **A30**, 1974, pp. 548–552 — note the
  journal spells it *Faceting*; Inchbald's bibliography spells it *Facetting*).
  Miller's rule (v) reads it as a compound of the two separate stellations D and
  f₂ and throws it out, but Inchbald treats it as a single polyhedron: in *Tidy
  Dodecahedra and Icosahedra* he writes that "each face is a tidy dodecagon".
  Inchbald's history page calls it "a uniform dual but nevertheless not present
  among the 59"; the *Tidy* essay does not repeat that description, deriving the
  figure instead by reciprocating a vertex figure. **UNCERTAIN — I could not
  reconcile the two pages; treat "uniform dual" as the history page's claim only.**
* **De₁f₁f₂ and its enantiomorph** — Inchbald's two "lost icosahedra" (2002).
  Genuine single stellations with no cavities, excluded only because rule (v)
  divides them into De₁f₁ plus f₂, joined along edges. He also flags
  De₁f₁f₂g₁ and its mirror as similar cases.
* **Non-Miller Flather models.** Inchbald's *Some lost stellations of the
  icosahedron* covers two figures, **Ce₂** and **De₁g₁**, that break Miller's
  rules. Dates, corrected: he says he rediscovered the stellation on 1 January
  2005, but "did not come across the Cambridge model until July 2006" — he and
  Vince Matsko visited the Department of Pure Mathematics & Mathematical
  Statistics on 7 July 2006. He attributes the models to Flather tentatively,
  made "around 1930, before he met Coxeter" — the page gives no year for that
  meeting, so **do not write "1932"**. **UNCERTAIN:** the page does not mention
  Hudson & Kingston, so the claim that these models satisfy their looser rules
  (*Mathematical Intelligencer* **10**, 1988, pp. 50–61 — citation itself
  verified) is unsourced and should not be asserted.
* **Wheeler's hollow forms.** Wheeler (1924) allowed hollow figures and sets of
  discrete pieces; Miller's rule (iv) removes those with sealed cavities. Note
  though that two of Wheeler's fully discrete figures *did* survive into the 59:
  **f₂** (twelve free-floating trapezohedra, Crennell 16) and **g₁** (thirty
  bipyramids, Crennell 11). Inchbald questions their inclusion: of **f₂** he
  writes that "as a loose collection of polyhedra it would appear to go against
  the spirit, if not the letter, of rule (v)", and says the same criticism applies
  to **g₁**, whose pieces are "at least vertex-connected". (He floats calling such
  figures *coronae* instead. The stronger gloss "you cannot call a figure a
  stellation of an icosahedron that isn't there" was mine, not his — dropped.)

**The rule-(v) exception.** Miller's rule (v) permits a compound of two
enantiomorphous solids with no common part. **UNCERTAIN** on two counts: no
source I found says the rule is invoked *exactly once*, and none names the case.
My reasoning: it is Crennell **10**, the stellation **f₁** on its own — nothing
but the 120 shell-f₁ cells, which fall into two disjoint mirror-image 60-cell
figures. That is at least consistent with the table, where Crennell **33** (the
"tenth stellation") is the single-handed f₁, i.e. exactly half of Crennell 10.
Every other stellation containing bold **f₁** also contains achiral cells, so it
does not split. Present this as an inference, not as the book's statement.

---

## 8. What I verified myself (method, so it can be re-checked)

Built the 20 face planes of a regular icosahedron with edge 2 (plane distance
1.51152, circumradius 1.90211), enumerated the 274 vertices of the plane
arrangement, and identified cells by their sign vectors in {inside, outside}²⁰.
Symmetries were handled exactly, as permutations of the 20 planes induced by the
120 matrices of I<sub>h</sub>.

Results, all matching the program and the literature:

* 473 bounded cells, in layers 1 / 20 / 30 / 60 / 80 / 132 / 90 / 60.
* 11 orbits under I<sub>h</sub>; **12** under the rotation group I — the only
  refinement being 120 → 60 + 60 in layer 5.
* Cell shapes per orbit (vertices/faces) as tabulated in §1.
* Exactly 10 tetrahedra and 5 octahedra can be formed from the 20 planes; exactly
  2 pentads of tetrahedra, using complementary halves of the 120-cell orbit.
* Cell contents 51 / 251 / 311 for the five-octahedra, five-tetrahedra and
  ten-tetrahedra compounds.
* Outer vertex sets: A → 12 on 5-fold axes; B → 32; C → outer 30 on 2-fold axes
  (icosidodecahedron); five and ten tetrahedra and excavated dodecahedron → outer
  20 on 3-fold axes (dodecahedron); F and G → outer 12 on 5-fold axes at φ³ × core
  radius; H → outer 60 at radius 15.901, with 92 surface vertices in all.
* First-stellation pyramid geometry and the 104.4775° / 135.5225° hexagon angles.

Scripts live in the session scratchpad —
`/private/tmp/claude-501/-Users-yaroslavvb-Library-CloudStorage-Dropbox-git0-stellation-resurrect/3d285e63-fa4a-4bf7-be4a-5e53bbea5e6c/scratchpad/`
(`cells.py`, `orbits.py`, `famous.py`, `check3.py`, `shapes.py`; numpy only, no
scipy) — worth copying into the repo if the tutorial wants to regenerate any of
this.

---

## 9. Sources

Primary / book-length

* H. S. M. Coxeter, P. Du Val, H. T. Flather & J. F. Petrie, *The Fifty-Nine
  Icosahedra*, University of Toronto Press, 1938; 2nd edn Springer-Verlag, 1982;
  3rd edn Tarquin, 1999 (Crennell numbering, ISBN 978-1-899618-32-3).
  <https://link.springer.com/book/10.1007/978-1-4613-8216-4>
* H. S. M. Coxeter, *Regular Polytopes*, 3rd edn, Dover 1973 — §3.6 the five
  regular compounds, §6.2 stellating the Platonic solids.
* Max Brückner, *Vielecke und Vielflache: Theorie und Geschichte*, Teubner,
  Leipzig, 1900. <https://archive.org/details/vieleckeundvielf00bruoft>
* A. H. Wheeler, "Certain forms of the icosahedron and a method for deriving and
  designating higher polyhedra", *Proc. International Mathematical Congress,
  Toronto 1924*, vol. 1, pp. 701–708.
* L. Poinsot, "Mémoire sur les polygones et les polyèdres", *Journal de l'École
  Polytechnique* **4** (1810), pp. 16–49.
* A. L. Cauchy, "Recherches sur les polyèdres" (premier mémoire), *Journal de
  l'École Polytechnique* tome **9**, XVI<sup>e</sup> cahier (1813), pp. 68–86.
  (Often cited as "16 (1813), 68–86", using the cahier number in place of the
  volume — the earlier draft of this note did that; both refer to the same paper.)
* Magnus Wenninger, *Polyhedron Models*, Cambridge University Press, 1971
  (models 23–25 the compounds, 26–42 the stellations); *Dual Models*, CUP, 1983.
* N. J. Bridge, "Faceting the dodecahedron", *Acta Crystallographica* **A30**
  (1974), pp. 548–552. (IUCr and ADS both give the title with one "t"; Inchbald
  cites it as "Facetting".)
* J. L. Hudson & J. G. Kingston, "Stellating polyhedra", *Mathematical
  Intelligencer* **10** (1988), pp. 50–61.
* G. Inchbald, "In search of the lost icosahedra", *The Mathematical Gazette*
  **86**, no. 506 (July 2002), pp. 208–215, doi:10.2307/3621842.

Web

* Wikipedia, *The Fifty-Nine Icosahedra* — Miller's rules, Du Val notation, the
  full table of 59 with cells, face regions, Wenninger/Wheeler/Brückner
  cross-references. <https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra>
* Wikipedia articles: *Small triambic icosahedron*, *Triakis icosahedron*,
  *Compound of five octahedra*, *Compound of five tetrahedra*, *Compound of ten
  tetrahedra*, *Great icosahedron*, *Excavated dodecahedron*, *Final stellation of
  the icosahedron*, *Great triambic icosahedron*.
* Guy Inchbald (steelpillow.com):
  *In search of the lost icosahedra* <https://www.steelpillow.com/polyhedra/icosa/searchlost/searchlost.html>;
  *Some lost stellations of the icosahedron* <https://www.steelpillow.com/polyhedra/icosa/lost/lost.html>;
  *Tidy Dodecahedra and Icosahedra* <https://www.steelpillow.com/polyhedra/icosa/tidystelfacet/TidyStelFacet.html>;
  *Stellating and Facetting — a Brief History* <https://www.steelpillow.com/polyhedra/StelFacet/history.html>
* Eric W. Weisstein, "Icosahedron Stellations", MathWorld
  <https://mathworld.wolfram.com/IcosahedronStellations.html> (cell counts after
  Wenninger 1989 p. 41; 18 fully supported after Robert Webb) and
  "Great Icosahedron" <https://mathworld.wolfram.com/GreatIcosahedron.html>
* George W. Hart, "59 Stellations of the Icosahedron"
  <https://www.georgehart.com/virtual-polyhedra/stellations-icosahedron-index.html>
* K. & D. Crennell, corrections to the 3rd edition, Fortran Friends
  <http://fortran.orpheusweb.co.uk/Poly/59icos.htm> — checked, live, last updated
  1 September 2023; it is an errata list for the 3rd edition (2000–2023) and
  offers a PDF of corrected pages.
* Robert Webb, *Stella* software <https://www.software3d.com/> — source of the
  "18 fully supported (16 reflexible, 2 chiral)" figure.
* A. M. Cutler & E. Schulte, "Regular polyhedra of index two, I", 2010
  <https://arxiv.org/abs/1005.4911> (excavated dodecahedron as an abstract
  regular polyhedron of index two).

---

## 10. Open questions / unresolved

* **UNCERTAIN — attribution of the regular compounds.** Hess 1876 (Wikipedia's
  articles on the compounds of five octahedra, five tetrahedra and ten tetrahedra
  all say "first described by Edmund Hess in 1876") vs Cauchy (Inchbald's history
  page: "Cauchy is also aware of the regular compounds, of five and ten tetrahedra
  and of five octahedra, as stellations of the regular icosahedron", placed at
  1812). Note that Inchbald's own timeline has **no 1876 Hess entry** — his Hess
  entry is 1883, and his 1876 entry is Hugel — so the two sources are not even
  using the same Hess publication. Phrase as "first systematically described by
  Hess in 1876, though Cauchy appears to have known them", and do not cite
  Inchbald for the 1876 date.
* **UNCERTAIN — Cauchy's date.** 1812 (work) vs 1813 (publication) vs "1812" as
  given by Wikipedia's final-stellation article. Use "1812/13".
* **UNCERTAIN — Wheeler numbers for f₂ and g₁.** Re-checked, and the conflict is
  real. Wikipedia's table: Crennell 11 = **g₁**, Wheeler "21, Discrete skeleton";
  Crennell 16 = **f₂**, Wheeler "22, Discrete twelve-pointed, crown-rimmed group".
  Inchbald's web version of the Gazette article: "Wheeler had earlier discovered
  **f₂** and **g₁**, listing them as 21 and 22 respectively" — i.e. f₂ = 21,
  g₁ = 22, the opposite. Unresolved; the descriptive names in Wikipedia's table
  are at least internally consistent with its own assignment.
* **UNCERTAIN — the single rule-(v) exception.** My reasoning says it is
  stellation **f₁** (Crennell 10); no source found that states it.
* **UNCERTAIN — origin of the name "excavated dodecahedron".**
* **UNCERTAIN — the "noble and self-dual" remark** in *Tidy Dodecahedra and
  Icosahedra*. On re-reading, the page mentions "one both noble and self-dual" in
  a list of categories but does not attach that to a named symbol, so the earlier
  reading of it as an **Ef₁g₂** claim is not supported by the text and may have
  been a mis-transcription on my part. What *is* solid: Wikipedia gives the noble,
  self-dual excavated dodecahedron as **Ef₁g₁** (Crennell 26 / W28), and the
  geometry agrees (its outer points reach only the dodecahedron's vertex radius,
  which **g₂** cells overshoot by a factor of ~1.8). Do not repeat any Ef₁g₂
  claim.
* **Not chased:** the exact face-region ("stellation diagram") numbering 0–13 and
  which regions belong to which famous stellation. Wikipedia's table has it, and
  the four entries quoted here were spot-checked against it and match: five
  tetrahedra (47) = regions 5 6 7 9 10, ten tetrahedra (22) = 7 9 10, great
  icosahedron (7) = 11 12, final (8) = 13. Use it if the tutorial wants face
  diagrams next to cell diagrams.

---

## 11. Fact-check pass (2026-08-05)

An adversarial re-check against primary web sources. **Confirmed unchanged:**
473 cells / 12 shapes and 2¹² − 1 = 4095 (Inchbald, *Gazette* 86 no. 506,
208–215); MathWorld's 20+30+60+20+60+120+12+30+60+60 "of 10 different shapes and
sizes" after Wenninger 1989 p. 41; 18 fully supported = 16 reflexible + 2 chiral;
32 reflexible / 27 chiral among the 59; Crennell numbers 2, 3, 6, 7, 8, 10, 11,
16, 21, 22, 23, 26, 30, 33, 47 with their Wenninger numbers, Brückner plates and
Wheeler numbers; W26 triakis / W27 second / W28 third / W29 fourth / W34 ninth /
W37 twelfth / W41 great icosahedron / W42 final; small triambic icosahedron
20/60/32 with 104.48°/135.52° hexagon angles, DU30, dual = small ditrigonal
icosidodecahedron; five octahedra UC17, W23, [5{3,4}]2{3,5}, hull =
icosidodecahedron, "small icosicosahedron", the only regular compound without a
regular hull; five tetrahedra UC5, W24, {5,3}[5{3,3}]{3,5}, "chiricosahedron",
chiral group I, dual = own enantiomorph; ten tetrahedra UC6, W25,
2{5,3}[10{3,3}]2{3,5}, "icosicosahedron", 180 faces (120 triangles + 60 concave
quads) / 300 edges / 122 vertices as a plain solid; great icosahedron {3,5/2},
20/30/12, density 7, U53, edge ratio (7+3√5)/2 = φ⁴; excavated dodecahedron
20/60/20, χ = −20, noble and self-dual, Ef₁g₁, W28, one of ten abstract regular
polyhedra of index two with vertices on one orbit (Cutler & Schulte 2010); final
stellation 20/90/60 as a star polyhedron and 180/270/92 as a simple solid,
"echidnahedron" coined by Andrew Hume in 1995; medial triambic 24 vertices (12
outside) vs great triambic 32 vertices (12 outside), both with exterior De₂f₂;
Poinsot's memoir (presented 1809, *J. École Polytechnique* **4**, 1810, 16–49);
Wheeler's 1924 Toronto congress paper, vol. 1, 701–708; Hudson & Kingston,
*Math. Intelligencer* **10** (1988), 50–61; Bridge's 22 faceted dodecahedra
(1974); Kepler edge-stellating the icosahedron to get the great stellated
dodecahedron, and Inchbald's charge that Coxeter's introduction misses this.

**Corrected or downgraded in this pass:** the "mainline" term is no longer
attributed to Coxeter; the Crennell ordering is reflexible-then-chiral, not plate
order; the "exactly one case" gloss on rule (v) is now marked as an inference; the
fully-supported membership list is now marked UNCERTAIN; the Flather-model dates
moved from "2005 / met Coxeter in 1932" to "rediscovered 1 Jan 2005, Cambridge
models seen 7 July 2006, models made around 1930"; the Hudson & Kingston link to
those models is now flagged as unsourced; Cauchy's citation now gives tome 9,
cahier 16; Bridge's title is "Faceting", not "Facetting"; the Fortran Friends
errata page is live (last updated 1 Sept 2023); the *Tidy Dodecahedra* "noble and
self-dual" remark is not attached to Ef₁g₂ in the source. Three passages that ran
close to their sources' wording — Miller's rule (iii), the excavated
dodecahedron's edge description, and the five-tetrahedra dual/enantiomorph
paragraph — were rewritten, and two paraphrases of Inchbald (on g₁, and on his
objection to f₂ and g₁) were replaced with his actual words.
