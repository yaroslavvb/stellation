# R1 — *The Fifty-Nine Icosahedra* (Coxeter, Du Val, Flather, Petrie, 1938)

Research note for the "Cells" tutorial. Everything here is sourced; my own derivations are
marked as such. Direct quotation is kept to a few words at a time.

**Headline result for us:** the eight layers and eleven cell orbits our program computes for
the icosahedron (`1 / 20 / 30 / 60 / 20+60 / 12+120 / 30+60 / 60`, with the 120 splitting
chirally) are **exactly** Du Val's shells **a…h** and cell types **a, b, c, d, e₁, e₂, f₁, f₂,
g₁, g₂, h**. The correspondence is not merely plausible — it is forced by published data (§6).

---

## 1. Who did what

| Person | Dates | Contribution |
|---|---|---|
| **H. S. M. Coxeter** | 1907–2003 | The driving force. Did the original enumeration from Miller's rules, using combinatorics and graph theory — then a novel move in a geometry paper. He drew a *connectivity graph* of the face-plane regions and enumerated the legal combinations from it. |
| **Patrick Du Val** | 1903–1987 | Invented the **cell / shell notation** (the `A`, `b`, `c`, … `e₁`, `f₁`, `g₂` symbols this note is about) and independently re-derived the same 59 by testing every combination of cell sets against Miller's rules. |
| **H. T. Flather** | died ca. 1950 | Made card models of all 59. He had been building stellated icosahedra independently since the late 1920s, and had already made several "non-Miller" ones before he met Coxeter (1932). His set is kept in the mathematics library at Cambridge. |
| **J. F. Petrie** | 1903–1972 | The three-dimensional drawings — the plates that make the book famous. (Son of the Egyptologist Flinders Petrie; killed by a car in 1972.) |
| **J. C. P. Miller** | 1906–1981 | **Not an author.** He was a fellow Cambridge man and proposed the five rules, probably in the late 1920s, that define what counts as an admissible stellation. Jeffrey Charles Percy Miller, later a Cambridge computing pioneer. |
| **Kate & David Crennell** | — | For the 1999 third edition: reset the text, redrew every diagram, added the now-standard index numbers 1–59, plus reference tables and photographs of the Cambridge models. |

Sources: Wikipedia, *The Fifty-Nine Icosahedra*
(<https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra>); Guy Inchbald, *Stellating and
Facetting — a Brief History* (<https://www.steelpillow.com/polyhedra/StelFacet/history.html>);
Wikipedia, *J. C. P. Miller* (<https://en.wikipedia.org/wiki/J._C._P._Miller>); Fortran
Friends (Crennells), *The Fifty-Nine Icosahedra*
(<https://fortran.orpheusweb.co.uk/Poly/59icos.htm>).

**A prehistory worth one line in the tutorial.** Poinsot found the great icosahedron in 1809;
Edmund Hess (1876) found the remaining "main-line" ones with stellation diagrams; Max Brückner
photographed models of several in *Vielecke und Vielflache* (1900); and **A. H. Wheeler**, in an
invited ICM talk at Toronto in 1924, introduced the very idea of selecting *regions of the
stellation diagram* and gluing their cells into new figures. Wheeler was originally to be a
co-author of *The 59* but withdrew, complaining that Coxeter's treatment was tangled and hard
to follow (quoted in David L. Roberts, "Albert Harry Wheeler (1873–1950)", *Historia
Mathematica* **23** (1996) 269–287, <https://core.ac.uk/download/pdf/82517182.pdf>).

*(Sources disagree on the pre-1938 tallies: Wikipedia's "Final stellation" article credits
Brückner with ten stellations and Wheeler with twenty forms, while Inchbald's history says
Brückner added six new ones and Wheeler nine. Both are counting different things — total
described vs. newly discovered.)*

---

## 2. Miller's five rules, restated

The rules appear in *The 59* (3rd edn., pp. 15–16). Restated in my own words, with the intent
of each:

1. **Twenty planes only.** Every face must lie in one of the twenty planes that carry the faces
   of the regular icosahedron. Nothing else is allowed to become a face plane.
2. **Same picture in every plane.** Whatever pattern of area you fill in inside one face plane
   must be repeated identically in all twenty. The pattern is allowed to be several separate
   pieces.
3. **Trigonal symmetry inside each plane.** The pattern within a plane must be symmetric under
   the 3-fold rotation of that face — with or without the mirrors. Rules 1–3 together are what
   guarantee the finished solid has icosahedral symmetry.
4. **Everything must be visible from outside.** No part of a face may be sealed inside the
   solid. Coxeter's gloss is charming and important: "outside" is generous — a region deep in a
   crevice still counts if an insect could crawl to it on a big enough model. The effect is to
   forbid buried cavities, so that no two of the 59 look identical from outside.
5. **No concentric compounds.** Reject any figure whose parts split into two sets, each of
   which is itself a solid with the full symmetry. One exception is allowed: a **left-handed
   and a right-handed copy** with no part in common may be combined (this happens exactly once
   — that is the compound of ten tetrahedra, `Ef₁`).

Verbatim text of all five is reproduced by Wikipedia
(<https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra#Miller's_rules>) and by Inchbald,
*In Search of the Lost Icosahedra*
(<https://www.steelpillow.com/polyhedra/icosa/searchlost/searchlost.html>), which is the web
version of his *Mathematical Gazette* **86** (July 2002) 208–215 paper. **Minor textual
divergence:** rule (iii) reads "without or with reflection" in Wikipedia and "with or without
reflection" in Inchbald; rule (v)'s parenthesis is "which actually occurs in just one case" in
both, whereas HandWiki paraphrases it as "which therefore possesses no plane of symmetry".
Same content either way.

**Why the answer is 59.** Applying (i)–(v) to the 4 095 non-empty combinations of cell sets
(see §5) leaves 58 stellations, plus the icosahedron itself = **59**. Of those, 32 are
reflexible (mirror-symmetric) and 27 are chiral, listed only in right-handed form. If you
counted both hands of the chiral ones you would get 32 + 2×27 = **86** figures.

---

## 3. What the count would be under different rules

| Rule set | Count | Source |
|---|---|---|
| Any non-empty set of the 12 cell sets | **4 095** = 2¹² − 1 | Inchbald 2002 |
| Miller's rules | **59** (58 + the core) | Coxeter et al. 1938 |
| …counting both enantiomorphs separately | **86** | derived from 32 + 27 chiral pairs |
| **Main-line** only — whole shells, nothing partial | **8** (A, B, C, D, E, F, G, H) | Wikipedia / Wolfram |
| **Fully supported** — no overhangs; every visible piece of a face seen from the same side | **18** (16 reflexible + 2 chiral) | MathWorld, crediting Robert Webb |
| Inchbald's trial rule "faces must be continuous through the body" replacing rule (v) | **36** | Inchbald 2002 |
| Hudson & Kingston (1988): relaxed rule — the *complement* of the cell set must be connected (i.e. only cavities are banned; edge-connected figures allowed) | **UNCERTAIN:** I could not find their total | Hudson & Kingston, *Math. Intelligencer* **10**:3 (1988) 50–61 |
| Bridge (1974): dualise the "tidy" facettings of the dodecahedron | finds extra figures Miller excludes, notably `Df₂` (a uniform dual), and several with the same outer shape but different insides | Bridge, *Acta Cryst.* **A30** (1974) 548–552 |
| Inchbald's catalogue of "lost" stellations | **10** unarguable + **7** borderline, none of them among the 59 | <https://www.steelpillow.com/polyhedra/icosa/lost/lost.html> |

Wolfram MathWorld, *Icosahedron Stellations*:
<https://mathworld.wolfram.com/IcosahedronStellations.html>.

The critique in one sentence (Inchbald 2002, and Wikipedia's *Stellation* article): Miller's
rules operate on *solid blocks of space* and on *externally visible regions*, so they cannot
see a polyhedron's internal structure, cannot distinguish true edges from accidental crossing
lines, and let in oddities such as `f₂` — twelve solids floating unconnected in space — while
excluding perfectly good figures whose faces run continuously across two shells.

---

## 4. Cells versus face-plane regions — the two different pictures

This distinction matters for the tutorial because the program is a **cell** program, while most
published pictures of stellations are **region** pictures.

**Cells (3-D).** Extend all twenty face planes indefinitely. They chop space into unbounded
pieces and into **473 bounded pieces — the cells** (Inchbald 2002). A stellation, in this
picture, is a chosen *set of cells*: a lump of solid space.

**Face-plane regions (2-D).** Take one face plane and draw its lines of intersection with the
other 19 planes. Two planes are parallel, so there are **18 lines**; the picture they make is
the **stellation diagram**. A stellation, in this picture, is a chosen *set of shaded regions*
in that diagram, repeated identically in all twenty planes — that is Miller's rules (i)–(iii)
literally.

The two pictures are not equivalent, and that is the source of the whole 60-year argument:

- A set of cells determines a set of regions (the ones on the outside of the solid), but not
  vice versa — several different cell sets can present the same outer surface while differing
  inside. Bridge and Inchbald both exploited this.
- Coxeter's book gives, for each of the 59, **both** descriptions: a Du Val cell symbol *and* a
  list of region numbers. In the third edition's tables (and Wikipedia's transcription), a
  region number with an apostrophe, e.g. **3′**, means that region is seen from *underneath* —
  from the direction of the centre.

**How many regions.** The regions of the diagram fall into sets that must be used together to
keep icosahedral symmetry. Coxeter's numbering runs **0 … 13**, where 0 is the icosahedron's
own face; Wikipedia describes this as 13 sets (i.e. counting 1–13 and treating 0 as the core
face). MathWorld records that this is already a *simplified* numbering: Coxeter first
distinguished more types and then merged 2 with 2̄, 4 with 4̄, 11 with 1̄1, and 13, 1̄3, 14 all
into "13" (Coxeter et al. 1999, pp. 18–19). Some of the sets 5, 6, 9, 10 further split into
mirror-image halves, written in italics, and those are what make the 27 chiral stellations
possible.

**Coxeter's graph.** His enumeration ran on a graph whose nodes are these region sets and whose
edges record which may adjoin which; in the published figure some nodes are alternatives —
λ ∈ {3, 4}, μ ∈ {7, 8}, ν ∈ {11, 12}. This is the direct ancestor of the connectivity graph our
program builds.

---

## 5. Du Val's cell notation

From Wikipedia's summary of the book and Inchbald's exposition:

- Draw a segment from a point inside a cell to the centre of the icosahedron and count how many
  (extended) face planes it crosses. That number is the **power** of the cell. *This is
  precisely our `layer`.*
- All cells of the same power form a **shell** (= our **layer**). The core icosahedron has
  power 0 and is called **A** (or **a**); the shells outward are **b, c, d, e, f, g, h** —
  eight in all.
- If a shell contains cells of more than one shape, they get numeric subscripts: **e₁** and
  **e₂**, **f₁** and **f₂**, **g₁** and **g₂**.
- If a shape occurs in left- and right-handed versions, upright type is the right-handed
  (dextro) half and *italic* the left-handed (laevo) half; **bold f₁** means both halves
  together. Only **f₁** does this.
- A stellation containing a complete shell together with everything inside it is named after
  the outermost complete shell, capitalised, with the inner ones omitted: **B** = a + b;
  **Ce₁** = a + b + c + e₁; **De₁f₁g₁**, etc.

So there are **8 shells**, **11 congruence classes** of cell (a, b, c, d, e₁, e₂, f₁, f₂, g₁,
g₂, h), and **12 selectable sets** once f₁ is split by handedness. Inchbald's Table 2 assigns
them bit positions 0–11 (a = 1, b = 2, c = 4, d = 8, e₁ = 16, e₂ = 32, f₁ = 64, *f₁* = 128,
f₂ = 256, g₁ = 512, g₂ = 1024, h = 2048), giving each stellation a code number in 1…4095
(<https://www.steelpillow.com/polyhedra/icosa/stelfacet/StelFacet.html>).

Note the three different "how many kinds of cell" numbers you will meet in the literature, all
correct:

- **10** — distinct *shapes* excluding the core and counting a mirror pair once
  (Wenninger, via MathWorld).
- **11** — cell types under the full symmetry group Iₕ, including the core.
- **12** — sets under the rotation group I, i.e. with f₁ split into its two hands
  (Inchbald; also what the program offers when the stellation symmetry is I).

---

## 6. The cell counts — and the exact match with our program

### 6.1 The published numbers

Wolfram MathWorld, *Icosahedron Stellations*, citing **Wenninger, *Polyhedron Models*, p. 41**:
stellating the regular icosahedron yields

> 20 + 30 + 60 + 20 + 60 + 120 + 12 + 30 + 60 + 60 cells of 10 different shapes and sizes

(<https://mathworld.wolfram.com/IcosahedronStellations.html>; MathWorld's citation is to the
1989 printing of Wenninger, *Polyhedron Models*, CUP, first published 1971.)

That sums to 472; adding the core icosahedron gives **473**, which is exactly the figure
Inchbald states ("473 are finite cells… these cells come in just 12 shapes",
*Math. Gazette* 2002) and which the Polyhedra World site repeats ("473 bounded cells of 12
types", <https://www.polyhedra-world.nc/stell_dod_.htm>).

Vladimir Bulatov — the author of the program we are resurrecting — states in his own paper that
for the icosahedron layer 1 is a single complete cell of **20 elementary triangular pyramids**
and layer 4 contains **two types, 20 and 60** ("An Interactive Creation of Polyhedra Stellations
with Various Symmetries", *VisMath* **3**:2, 2001,
<http://www.mi.sanu.ac.rs/vismath/bulatov/index.html>).

### 6.2 The correspondence

| Layer / power | Du Val | Cells | Our program | Cell shape (derived, §6.3) |
|---|---|---|---|---|
| 0 | **a** (= A) | 1 | 1 | the icosahedron itself, 20 faces |
| 1 | **b** | 20 | 20 | triangular pyramid, 4 faces — one per icosahedron face |
| 2 | **c** | 30 | 30 | 6 faces — one per icosahedron edge (2-fold axes) |
| 3 | **d** | 60 | 60 | 5 faces |
| 4 | **e₁** | 20 | 20 ⎫ | 9 faces — on the 3-fold (face) axes |
| 4 | **e₂** | 60 | 60 ⎭ | 5 faces |
| 5 | **f₁** | 120 | 120 ⎫ | irregular **tetrahedron**, 4 faces, **no symmetry → chiral**; splits 60 + 60 |
| 5 | **f₂** | 12 | 12 ⎭ | pentagonal **trapezohedron**, 10 faces — on the 5-fold (vertex) axes |
| 6 | **g₁** | 30 | 30 ⎫ | **bipyramid**, 6 faces — on the 2-fold axes |
| 6 | **g₂** | 60 | 60 ⎭ | 5 faces |
| 7 | **h** | 60 | 60 | the outer spike, 6 faces (3 outward) |
| | **total** | **473** | 473 | |

**They agree completely.** Layer for layer, orbit for orbit, including the fact that in layer 5
the 120-cell orbit — and only that one — splits into a chiral pair of 60 when the stellation
symmetry is the rotation group I. Du Val had exactly the same phenomenon: f₁ is the only cell
set with a roman/italic distinction. That is not a coincidence: under Iₕ (order 120) an orbit
of size 120 has trivial stabiliser, so its cells have no symmetry of their own, and under the
rotation subgroup I (order 60) it must break into two mirror-image halves. Orbits of size 12,
20, 30 and 60 have stabilisers containing a rotation and stay whole.

### 6.3 Why the letters map that way — a proof, not a guess

The order of Wenninger's sum already implies the mapping, but it can be pinned down from
independent published facts. The argument uses two published data sets:

**(a)** The "faces" column of the book's table (transcribed on Wikipedia), which for a
single-cell-set stellation lists the regions bounding it — an apostrophe meaning "seen from
below". Reading off: e₁ lies between region 3 (below) and 5 (above); e₂ between 4 and {6, 7};
f₁ between {5, 6} and {9, 10}; f₂ between 7 and 8; g₁ between 10 and 12; g₂ between {8, 9} and
11; h between {11, 12} and 13. Main-line stellations confirm the chain: A→0, B→1, C→2, D→{3,4},
E→{5,6,7}, F→{8,9,10}, G→{11,12}, H→13.

**(b)** The **multiplicity of each region per face plane**, counted off the standard numbered
stellation diagram (Wikimedia Commons, *Icosahedron stellation diagram center.svg*):

| region | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| per face plane | 1 | 3 | 6 | 3 | 6 | 6 | 6 | 3 | 3 | 6 | 6 | 6 | 3 | 9 |
| over 20 planes | 20 | 60 | 120 | 60 | 120 | 120 | 120 | 60 | 60 | 120 | 120 | 120 | 60 | 180 |

(Independently corroborated: Inchbald's erratum to his 2002 paper states that the great
icosahedron's face diagram "11 12" has **nine** parts — and 6 + 3 = 9.)

Every bounded region has exactly one cell immediately below it and one immediately above
(except region 13, the outermost, which has open space above). So for each region set:

    20 × (regions per plane) = (number of cells below) × (facets per such cell)
                              = (number of cells above) × (facets per such cell)

Feeding in the layer sizes our program computes gives a **unique** integer solution, and it
reproduces the Wenninger sequence:

    region  0: 20  = a  1×20   = b  20×1        →  b = 20
    region  1: 60  = b  20×3   = c  30×2        →  c = 30
    region  2: 120 = c  30×4   = d  60×2        →  d = 60
    region  3: 60  = d  60×1   = e₁ 20×3        →  e₁ = 20
    region  4: 120 = d  60×2   = e₂ 60×2        →  e₂ = 60
    region  5: 120 = e₁ 20×6   = f₁ 120×1       →  f₁ = 120
    region  6: 120 = e₂ 60×2   = f₁ 120×1
    region  7: 60  = e₂ 60×1   = f₂ 12×5        →  f₂ = 12
    region  8: 60  = f₂ 12×5   = g₂ 60×1        →  g₂ = 60
    region  9: 120 = f₁ 120×1  = g₂ 60×2
    region 10: 120 = f₁ 120×1  = g₁ 30×4        →  g₁ = 30
    region 11: 120 = g₂ 60×2   = h  60×2
    region 12: 60  = g₁ 30×2   = h  60×1
    region 13: 180 = h  60×3   = (open space)   →  h = 60

The only genuinely ambiguous choice is which of layer 6's two orbits is g₁ and which is g₂.
**It is settled by contradiction:** if g₁ were the 60-orbit it would have 120/60 = 2 facets in
region 10 and 60/60 = 1 in region 12 — three faces in total, impossible for a bounded solid.
Hence **g₁ = 30 and g₂ = 60**. The same argument forces **e₁ = 20** (were e₁ the 60-orbit it
would have 1 + 2 = 3 faces).

Five independent checks confirm the result:

1. **b = 20 four-faced pyramids** — Bulatov's own paper says layer 1 is 20 triangular pyramids;
   and stellation **B** (the small triambic icosahedron) is visibly the icosahedron with one
   pyramid on each face.
2. **c = 30** — stellation **C** is the compound of five octahedra, whose 5 × 6 = 30 vertices
   are its outer points, one per cell, sitting on the 2-fold axes.
3. **f₂ = 12 ten-faced trapezohedra** — Inchbald 2002 describes `f₂` as "twelve quite
   disconnected trapezohedra"; a pentagonal trapezohedron has 10 faces, matching 5 + 5 above.
   This is also the stellation everyone calls "the only disconnected one" (George Hart,
   <https://www.georgehart.com/virtual-polyhedra/stellations-icosahedron-index.html>), and
   Wheeler's name for it was a discrete twelve-pointed group.
4. **g₁ = 30 six-faced bipyramids** — Inchbald's erratum says exactly this: "g₁ comprises,
   specifically, 30 bipyramids". Wheeler called it a discrete skeleton.
5. **h = 60 spikes with 3 outward faces each** — 60 × 3 = 180, and the final stellation
   (echidnahedron) is documented as having 180 triangular faces, 270 edges and 92 vertices,
   the outermost 60 of which are the spine tips
   (<https://en.wikipedia.org/wiki/Final_stellation_of_the_icosahedron>). Independently,
   Inchbald's dual analysis gives the reciprocal facetting of the dodecahedron 60 faces.

Global consistency check: summing facets over all cells gives
20 + 80 + 180 + 300 + 180 + 300 + 480 + 120 + 180 + 300 + 360 = **2 500**, which equals
2 × 1 340 − 180 (twice the number of bounded regions, less the 180 outermost ones that have no
cell above them). It balances exactly.

*(Caveat, flagged honestly: **UNCERTAIN** whether Coxeter's book itself prints a table of "how
many cells per shell". The counts above are Wenninger's, reported by MathWorld, plus Inchbald's
473/12; the letter-to-count assignment in the table of §6.2 is my derivation from published
region data as set out here, not a quotation of a table in *The 59*.)*

### 6.4 Suggested wording for the tutorial

> Coxeter's collaborator Patrick Du Val gave these layers letters: **a** for the icosahedron
> itself, then **b**, **c**, **d**, **e**, **f**, **g**, **h** working outwards. Where a layer
> holds two different shapes of cell he added a subscript. Our eight layers and eleven cell
> types are his, one for one:
>
> | layer | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
> |---|---|---|---|---|---|---|---|---|
> | Du Val | a | b | c | d | e₁ · e₂ | f₁ · f₂ | g₁ · g₂ | h |
> | cells | 1 | 20 | 30 | 60 | 20 · 60 | 120 · 12 | 30 · 60 | 60 |
>
> The 120-cell set **f₁** is the one that has no symmetry of its own, so it is the one that
> falls into a left-handed and a right-handed half of 60 — exactly the sub-cells the program
> shows when the stellation symmetry is the rotation group **I**. Du Val wrote the two halves
> in upright and *italic* type.

---

## 7. Landmarks in Du Val notation (for "identify famous stellations")

From the book's table as transcribed by Wikipedia and by George Hart. Index = Crennell number;
[n] = Wenninger model number.

| # | Du Val | Regions | What it is |
|---|---|---|---|
| 1 | **A** | 0 | the regular icosahedron [4] |
| 2 | **B** | 1 | first stellation / small triambic icosahedron / triakis icosahedron [26] |
| 3 | **C** | 2 | compound of five octahedra [23] |
| 4 | **D** | 3 4 | — |
| 5 | **E** | 5 6 7 | — |
| 6 | **F** | 8 9 10 | second stellation [27] |
| 7 | **G** | 11 12 | **great icosahedron** — the only Kepler–Poinsot solid in the list [41] |
| 8 | **H** | 13 | final / complete stellation, "echidnahedron" [42] |
| 11 | **g₁** | 10′ 12 | fourth stellation [29] — 30 bipyramids, vertex-connected only |
| 16 | **f₂** | 7′ 8 | the only disconnected one: 12 trapezohedra floating in space |
| 22 | **Ef₁** | 7 9 10 | regular compound of ten tetrahedra [25] — the one enantiomorphic pair rule (v) permits |
| 26 | **Ef₁g₁** | 7 9 12 | excavated dodecahedron [28] |
| 30 | **De₂f₂** | 3 6 8 | medial (great) triambic icosahedron [34] |
| 47 | **E**f₁ | 5 6 **7** 9 10 | regular compound of five tetrahedra (right-handed) [24] |

The great stellated dodecahedron is *not* in the list: it is an **edge**-stellation of the
icosahedron, and the book covers only face-plane stellations.

---

## 8. The editions

| Edition | Year | Publisher | Notes |
|---|---|---|---|
| 1st | **1938** | University of Toronto Press / Humphrey Milford | *University of Toronto Studies, Mathematical Series* No. 6, pp. 1–26 plus 20 plates. Reviewed in *The Mathematical Gazette* (paper covers, 4s. 6d.). |
| 2nd | **1982** | Springer-Verlag, New York | A reprint. ISBN 0-387-90770-X. New foreword: by then only Coxeter and Du Val were living — Flather had died around 1950, Petrie in a road accident in 1972 — and it notes that the surviving authors were still in their twenties when the book was written. **UNCERTAIN:** I could not confirm any change to the mathematical content. DOI 10.1007/978-1-4613-8216-4. |
| 3rd | **1999** | Tarquin Publications | ISBN 978-1-899618-32-3 (later reprint ISBN 978-1-907-55008-9). Text reset and every diagram redrawn by Kate and David Crennell using their *!Stellate* software, because neither earlier edition photographed well enough to reprint. Added: the **index numbers 1–59** now used everywhere (1–32 reflexible, 33–59 chiral in right-handed form), a reference section of tables and diagrams, and an appendix of photographs of Flather's Cambridge models. |

The Crennells publish an errata list for the third edition, with corrections found between 2000
and 2023 — including that on p. 67 the symbols are Du Val's rather than Coxeter's, and that
Flather's model 3 is **D**, not **C**
(<https://fortran.orpheusweb.co.uk/Poly/59icos.htm>; a PDF of corrected pages is linked there).
Guy Inchbald and Mark Barry are credited with finding most of them.

---

## 9. Sources

- H. S. M. Coxeter, P. Du Val, H. T. Flather, J. F. Petrie, *The Fifty-Nine Icosahedra*,
  University of Toronto Studies, Mathematical Series 6 (1938); 2nd edn. Springer-Verlag (1982);
  3rd edn. Tarquin (1999).
- Wikipedia, *The Fifty-Nine Icosahedra* — <https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra>
- Wikipedia, *Stellation* — <https://en.wikipedia.org/wiki/Stellation>
- Wikipedia, *Final stellation of the icosahedron* — <https://en.wikipedia.org/wiki/Final_stellation_of_the_icosahedron>
- Eric W. Weisstein, *Icosahedron Stellations*, Wolfram MathWorld — <https://mathworld.wolfram.com/IcosahedronStellations.html>
- Guy Inchbald, *In Search of the Lost Icosahedra*, *The Mathematical Gazette* **86** (2002) 208–215; web version <https://www.steelpillow.com/polyhedra/icosa/searchlost/searchlost.html>
- Guy Inchbald, *Towards Stellating the Icosahedron and Facetting the Dodecahedron*, *Symmetry: Culture and Science* **11** (2000) 269–291; web version <https://www.steelpillow.com/polyhedra/icosa/stelfacet/StelFacet.html>
- Guy Inchbald, *Some Lost Stellations of the Icosahedron* — <https://www.steelpillow.com/polyhedra/icosa/lost/lost.html>
- Guy Inchbald, *Stellating and Facetting — a Brief History* — <https://www.steelpillow.com/polyhedra/StelFacet/history.html>
- K. and D. Crennell (Fortran Friends), *The Fifty-Nine Icosahedra* errata — <https://fortran.orpheusweb.co.uk/Poly/59icos.htm>
- Vladimir Bulatov, *An Interactive Creation of Polyhedra Stellations with Various Symmetries*, *VisMath* **3**:2 (2001) — <http://www.mi.sanu.ac.rs/vismath/bulatov/index.html>
- George W. Hart, *59 Stellations of the Icosahedron* — <https://www.georgehart.com/virtual-polyhedra/stellations-icosahedron-index.html>
- Maurice Starck, *Theory of the stellation* — <https://www.polyhedra-world.nc/stell_dod_.htm>
- Wikimedia Commons, *Icosahedron stellation diagram center.svg* (numbered region diagram)
- J. Bridge, "Facetting the Dodecahedron", *Acta Crystallographica* **A30** (1974) 548–552.
- J. L. Hudson and J. G. Kingston, "Stellating Polyhedra", *The Mathematical Intelligencer* **10**:3 (1988) 50–61.
- A. H. Wheeler, "Certain forms of the icosahedron…", *Proc. ICM Toronto 1924*, vol. 1, 701–708.
- M. J. Wenninger, *Polyhedron Models*, CUP (1971; MathWorld cites the 1989 printing, p. 41).
