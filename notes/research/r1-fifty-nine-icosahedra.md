# R1 — *The Fifty-Nine Icosahedra* (Coxeter, Du Val, Flather, Petrie, 1938)

Research note for the "Cells" tutorial. Claims are sourced; my own derivations are marked as
such, and anything I could not verify against a source is flagged **UNCERTAIN**. Direct
quotation is kept to a few words at a time. A hostile fact-check pass has been run over this
file — see §10 for what it changed, so the same errors don't creep back in.

**Headline result for us:** the eight layers and eleven cell orbits our program computes for
the icosahedron (`1 / 20 / 30 / 60 / 20+60 / 12+120 / 30+60 / 60`, with the 120 splitting
chirally) match Du Val's shells **a…h** and cell types **a, b, c, d, e₁, e₂, f₁, f₂, g₁, g₂,
h**. Two different strengths of claim are involved, and §6 keeps them apart:

- the *layer structure* (how many cells at each power) is corroborated by published data —
  Wenninger's ordered sum via MathWorld, and Bulatov's own description of layers 1 and 4;
- **UNCERTAIN:** which of the two orbits inside layers 4, 5 and 6 carries subscript 1 and
  which carries subscript 2 is **my derivation** (§6.3) from region-adjacency arithmetic, not
  something I found stated in any source. It is self-consistent and I believe it, but no
  published table asserts it.

---

## 1. Who did what

| Person | Dates | Contribution |
|---|---|---|
| **H. S. M. Coxeter** | 1907–2003 | The driving force. Did the original enumeration from Miller's rules, using combinatorics and graph theory — then a novel move in a geometry paper. He drew a *connectivity graph* of the face-plane regions and enumerated the legal combinations from it. |
| **Patrick Du Val** | 1903–1987 | Invented the **cell / shell notation** (the `A`, `b`, `c`, … `e₁`, `f₁`, `g₂` symbols this note is about) and tested every combination of cell sets against Miller's rules, **corroborating** Coxeter's enumeration. (Wikipedia and Inchbald both word it as corroboration/confirmation of Coxeter's result, so don't claim he worked in ignorance of it.) |
| **H. T. Flather** | died ca. 1950 | Made card models of all 59. He had been building stellated icosahedra independently since the late 1920s, and had already made several "non-Miller" ones before he met Coxeter (1932). His set is kept in the mathematics library at Cambridge. The death date is only as good as Coxeter's 1982 preface, which says Flather "died about 1950"; I found no birth date and no independent obituary. |
| **J. F. Petrie** | 1907–1972 | The three-dimensional drawings — the plates that make the book famous. (Son of the Egyptologist Flinders Petrie; born 26 April 1907, the same year as Coxeter, whom he met as a schoolboy; killed by a car in 1972, weeks after his wife's death.) |
| **J. C. P. Miller** | 1906–1981 | **Not an author.** Jeffrey Charles Percy Miller (31 Aug 1906 – 24 Apr 1981), Trinity College Cambridge, a *fellow student* of Coxeter and Petrie — not their tutor, a point Inchbald corrected in his own paper. He proposed the five rules, probably in the late 1920s, that define what counts as an admissible stellation. Later an early member of the Cambridge Computing Laboratory. |
| **Kate & David Crennell** | — | For the 1999 third edition: reset the text, redrew every diagram, added the now-standard index numbers 1–59, plus reference tables and photographs of the Cambridge models. |

Sources: Wikipedia, *The Fifty-Nine Icosahedra*
(<https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra>); Guy Inchbald, *Stellating and
Facetting — a Brief History* (<https://www.steelpillow.com/polyhedra/StelFacet/history.html>);
Wikipedia, *J. C. P. Miller* (<https://en.wikipedia.org/wiki/J._C._P._Miller>); Fortran
Friends (Crennells), *The Fifty-Nine Icosahedra*
(<https://fortran.orpheusweb.co.uk/Poly/59icos.htm>).

**A prehistory worth one line in the tutorial.** Poinsot found the great icosahedron in 1809.
Edmund Hess is credited with the remaining "main-line" ones (**B**–**F** and **H**), worked out
from stellation diagrams — **UNCERTAIN: the date.** Wikipedia says 1876 and cites Hess's 1876
Marburg paper, but its own editors have left "was he first?" queries beside both the date and
the credit; Inchbald's timeline instead puts Hess's stellation/facetting work at 1883 (the
*Kugelteilung* book). Don't state a year in the tutorial without checking Hess directly. Max
Brückner then described and photographed models of several in *Vielecke und Vielflache* (1900),
and **A. H. Wheeler**, in an invited ICM talk at Toronto in 1924, was the first to build new
figures by picking out sets of face-plane regions and taking the solid pieces they bound —
Wheeler was explicitly willing to accept hollow figures and loose collections of separated
pieces, which is where `f₂` and `g₁` come from. Wheeler was originally to be a co-author of
*The 59* but withdrew: he found Coxeter's presentation "involved and clumsy" and said Coxeter
had a way of tying a subject "into knots" (quoted in David L. Roberts, "Albert Harry Wheeler
(1873–1950): A Case Study in the Stratification of American Mathematical Activity", *Historia
Mathematica* **23**:3 (1996) 269–287, <https://core.ac.uk/download/pdf/82517182.pdf>).

*(Sources disagree on the pre-1938 tallies: Wikipedia's "Final stellation" article credits
Brückner with ten stellations (including the complete one) and Wheeler with twenty forms
(twenty-two counting reflections), while Inchbald's history says Brückner described the known
ones "together with six more" and Wheeler discovered "nine more". The wording on each side
suggests they are counting different things — total described vs. newly added — but that
reconciliation is mine, not something either source states.)*

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
4. **Everything must be visible from outside** — the rule's word is "accessible". No part of a
   face may be sealed inside the solid. The charming gloss about "outside" being generous — a
   region deep in a crevice still counts, because on a model of ordinary size some of the
   outside "could only be explored by a crawling insect" — is not an editor's aside but part of
   the printed parenthesis of rule (iv) itself. The effect is to forbid buried cavities, so
   that no two of the 59 look identical from outside.
5. **No concentric compounds.** Reject any figure whose parts split into two sets, each of
   which is itself a solid with the full symmetry. One exception is allowed: a **left-handed
   and a right-handed copy** with no part in common may be combined, and the rule's own
   parenthesis says this "actually occurs in just one case". (The rule as printed does not name
   the case; the universal identification is the compound of ten tetrahedra, `Ef₁` = Crennell
   22, which is exactly the pair of enantiomorphs of Crennell 47.)

Verbatim text of all five is reproduced by Wikipedia
(<https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra#Miller's_rules>) and by Inchbald,
*In Search of the Lost Icosahedra*
(<https://www.steelpillow.com/polyhedra/icosa/searchlost/searchlost.html>), which is the web
version of his *Mathematical Gazette* **86** (July 2002) 208–215 paper. **Minor textual
divergence:** rule (iii) reads "without or with reflection" in Wikipedia and "with or without
reflection" in Inchbald — same content either way. (An earlier draft of this note claimed
HandWiki paraphrases rule (v)'s parenthesis as "which therefore possesses no plane of
symmetry". **That was wrong:** HandWiki reproduces rule (v) word for word as Wikipedia and
Inchbald do, "(which actually occurs in just one case)". I could not find that alternative
wording anywhere; treat it as non-existent unless the 1938 first edition turns it up.)

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
| Hudson & Kingston (1988): relaxed rule — the *complement* of the cell set must be connected (i.e. only cavities are banned; edge-connected figures allowed) | **UNCERTAIN:** I could not find their total | Hudson & Kingston, *Math. Intelligencer* **10** (1988) 50–61 (rule as summarised by Inchbald's history; issue number unverified) |
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
keep icosahedral symmetry. The labels used in the book's tables run **0 … 13**, where 0 is the
icosahedron's own face. Wikipedia's caption says the diagram has **13** such sets, which is one
fewer than the number of labels; **UNCERTAIN:** my reconciliation is that it counts 1–13 and
treats 0 as the core face rather than a stellation region, but no source says so and it may
simply be a slip. MathWorld records that the numbering is already a *simplified* one: Coxeter
first distinguished more types and then wrote "2 for both 2 and 2̄, 4 for 4 and 4̄, 11 for 11
and 11̄, and 13 for all of 13, 13̄, and 14" (Coxeter et al. 1999, pp. 18–19). Some of the sets
further split into mirror-image halves, written in italics, and those are what make the 27
chiral stellations possible. **UNCERTAIN:** that the splitting sets are specifically 5, 6, 9,
10 is not stated in the sources I could reach — Wikipedia only says "some of these subdivide
into chiral pairs (not shown)".

**Coxeter's graph.** His enumeration ran on a graph whose nodes are these region sets and whose
edges record which may adjoin which; in the published figure some nodes are alternatives —
λ ∈ {3, 4}, μ ∈ {7, 8}, ν ∈ {11, 12}. Our program's connectivity graph is the same idea applied
to cells rather than regions; calling Coxeter's graph its ancestor is a rhetorical flourish,
not a documented lineage.

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

## 6. The cell counts — and how they line up with our program

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

Vladimir Bulatov — the author of the program we are resurrecting — describes in his own paper
an "array of 20 elementary cells — triangular pyramids attached to every face of the core" for
layer 1, and says layer 4 has **20 elementary cells of one type and 60 of another** ("An
Interactive Creation of Polyhedra Stellations with Various Symmetries", *VisMath* **3**:2
(2001), a Bridges 2001 paper, <http://www.mi.sanu.ac.rs/vismath/bulatov/index.html>). Note his
"cell" means the whole orbit and "elementary cell" the individual piece — the opposite of the
way this note and Du Val use the word.

### 6.2 The correspondence

Columns 3 and 4 (the counts per layer) are published data; **columns 2 and 5 — which subscript
goes with which orbit, and the face counts — are my derivation** (§6.3). `f₂`'s trapezohedra
and `g₁`'s bipyramids are the two shapes a source names outright (Inchbald).

| Layer / power | Du Val (derived) | Cells | Our program | Cell shape (derived, §6.3) |
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

**The layer sizes agree completely.** Layer for layer, orbit for orbit, including the fact that
in layer 5 the 120-cell orbit — and only that one — splits into a chiral pair of 60 when the
stellation symmetry is the rotation group I. Du Val had exactly the same phenomenon: f₁ is the
only cell set with a roman/italic distinction. That is not a coincidence: under Iₕ (order 120)
an orbit of size 120 has trivial stabiliser, so its cells have no symmetry of their own, and
under the rotation subgroup I (order 60) it must break into two mirror-image halves.

The general criterion (an earlier draft of this note got it backwards): an Iₕ-orbit stays a
single orbit under I exactly when its stabiliser **contains a reflection**; it splits in two
exactly when the stabiliser lies wholly inside I. So it is the *mirror* symmetry of a cell, not
the presence of some rotation, that keeps its orbit whole. The orbits of size 12, 20 and 30
have stabilisers C₅ᵥ, C₃ᵥ, C₂ᵥ, all containing reflections; the orbits of size 60 have
stabiliser of order 2, and since they are observed not to split, that order-2 stabiliser must
be a mirror {e, σ} rather than a 2-fold rotation — had it been a rotation, each 60 would have
broken into two orbits of 30.

### 6.3 Why the letters map that way — my derivation, not a published result

**Read this section as an argument I constructed, not as something any source states.** The
order of Wenninger's sum suggests the mapping, and the arithmetic below pins it down given its
inputs — but one of those inputs (the region multiplicities in (b)) is my own count off a
diagram, so the conclusion is only as good as that count. The argument uses two data sets:

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

**UNCERTAIN — this row is my own count, not a published table.** I have found outside
corroboration for four of the fourteen entries and none for the other ten:

- region 1 = 3: stellation **B** shows only region 1 and is the triakis icosahedron, which has
  60 faces, and 20 × 3 = 60;
- region 2 = 6: stellation **C** shows only region 2 and is the compound of five octahedra,
  whose 40 triangles lie 2 per plane and are each cut into 3 pieces, giving 6;
- regions 11 + 12 = 9: the corrections note at the head of the web version of Inchbald's 2002
  paper says the great icosahedron's face diagram "11 12" comprises **nine** parts (correcting
  "six" in the printed *Gazette* text) — and 6 + 3 = 9;
- region 13 = 9: the final stellation has 180 triangular faces, and 180 / 20 = 9.

The remaining entries (0, 3, 4, 5, 6, 7, 8, 9, 10) rest on my reading of the diagram alone.

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

Five cross-checks agree with the result. They are **not** five independent confirmations —
checks 1 and 2 reuse the same two stellations that fixed two of the region multiplicities
above, so at best they show the scheme does not contradict itself:

1. **b = 20 four-faced pyramids** — Bulatov's paper describes layer 1 as 20 triangular pyramids
   attached to the faces of the core; and stellation **B** (the small triambic icosahedron) is
   visibly the icosahedron with one pyramid on each face.
2. **c = 30** — stellation **C** is the compound of five octahedra, whose 5 × 6 = 30 vertices
   are its outer points, one per cell, sitting on the 2-fold axes.
3. **f₂ = 12 ten-faced trapezohedra** — Inchbald 2002 calls `f₂` twelve "quite disconnected"
   trapezohedra; a pentagonal trapezohedron has 10 faces, matching 5 + 5 above. It is also the
   one everybody singles out as the disconnected stellation (George Hart labels it "the only
   disconnected one",
   <https://www.georgehart.com/virtual-polyhedra/stellations-icosahedron-index.html>). Wheeler's
   own name for it, per the book's table, was "discrete twelve-pointed, crown-rimmed group".
4. **g₁ = 30 six-faced bipyramids** — the corrections note at the head of the web version of
   Inchbald's 2002 paper says exactly this: "g₁ comprises, specifically, 30 bipyramids". (It is
   a correction list on his own web version, not a published *Gazette* erratum.) Wheeler's name
   for it was "discrete skeleton".
5. **h = 60 spikes with 3 outward faces each** — 60 × 3 = 180, and the final stellation
   (echidnahedron) is documented as having 180 triangular faces, 270 edges and 92 vertices
   (<https://en.wikipedia.org/wiki/Final_stellation_of_the_icosahedron>). **UNCERTAIN:** that
   exactly 60 of those 92 vertices are the spine tips is my inference from 92 = 60 + 20 + 12,
   not a sourced statement; likewise I could not confirm the claim, made in an earlier draft,
   that Inchbald's dual analysis gives the reciprocal facetting of the dodecahedron 60 faces —
   treat it as unsupported.

Internal consistency check (**circular, not evidence**): summing facets over all cells gives
20 + 80 + 180 + 300 + 180 + 300 + 480 + 120 + 180 + 300 + 360 = **2 500**, which equals
2 × 1 340 − 180 (twice the number of bounded regions, less the 180 outermost ones that have no
cell above them). It has to balance — both sides are computed from the same region table — so
it catches arithmetic slips only, not a wrong reading of the diagram.

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

Before this goes into the tutorial: the row of layer sizes is safe, and so is the sentence
about f₁ (Wikipedia states outright that f₁ is the only set that subdivides into handed
forms). The one thing to keep vague, or to verify against the book first, is the *order* within
each pair — writing "e₁ · e₂" over "20 · 60" asserts my §6.3 derivation. If a reader with the
book to hand can check one plate, this stops being a guess.

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
| 8 | **H** | 13 | final / complete stellation [42]; the nickname "echidnahedron" is modern — coined by Andrew Hume of the Netlib polyhedral database in 1995, not by Coxeter |
| 11 | **g₁** | 10′ 12 | fourth stellation [29] — a set of 30 separate bipyramids, touching only at vertices |
| 16 | **f₂** | 7′ 8 | no Wenninger number; twelve separate trapezohedra with nothing joining them — the disconnected one |
| 22 | **Ef₁** | 7 9 10 | regular compound of ten tetrahedra [25] — the one enantiomorphic pair rule (v) permits |
| 26 | **Ef₁g₁** | 7 9 12 | excavated dodecahedron [28] — Wenninger's "third stellation" |
| 30 | **De₂f₂** | 3 6 8 | medial (great) triambic icosahedron [34] — Wenninger's "ninth stellation" |
| 47 | **E**f₁ | 5 6 **7** 9 10 | regular compound of five tetrahedra (right-handed) [24] |

The great stellated dodecahedron is *not* in the list: it is an **edge**-stellation of the
icosahedron, and the book covers only face-plane stellations. (Wikipedia states this outright;
Inchbald's history says the same and traces it to Kepler, adding the barbed remark that
Coxeter's introduction to *The 59* misreads Kepler on exactly this point.)

---

## 8. The editions

| Edition | Year | Publisher | Notes |
|---|---|---|---|
| 1st | **1938** | University of Toronto Press | *University of Toronto Studies, Mathematical Series* No. 6; 26 pp. plus 20 leaves of plates (confirmed from the 1982 reprint's catalogue record). **UNCERTAIN:** the co-imprint "Humphrey Milford" and the *Mathematical Gazette* review details (paper covers, 4s. 6d.) in an earlier draft — I could not verify either. |
| 2nd | **1982** | Springer-Verlag, New York | A reprint (26 pp. + 20 leaves of plates), ISBN 0-387-90770-X = 978-0-387-90770-3, DOI 10.1007/978-1-4613-8216-4. New preface by Coxeter: only he and Du Val were still living — it says Flather "died about 1950" and that Petrie died in a road accident in 1972 — and it remarks that "both of us were still in our twenties when it was written" (the *writing*, early 1930s; Coxeter was 31 at publication). It also says Coxeter and Du Val wrote the whole text, neither of the other two being a professional mathematician. **UNCERTAIN:** I could not confirm any change to the mathematical content. |
| 3rd | **1999** | Tarquin Publications | ISBN 978-1-899618-32-3 (later reprint ISBN 978-1-907-55008-9). Text reset and every diagram redrawn by Kate and David Crennell using *Techwriter* and their *!Stellate* program, because — in Fortran Friends' words — neither earlier edition was clear enough for a successful reprint by copying. Added: the **index numbers 1–59** now used everywhere (1–32 reflexible, 33–59 chiral in right-handed form), a reference section of tables and diagrams, and an appendix of photographs of some of Flather's card models taken in Cambridge. |

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
- N. J. Bridge, "Facetting the dodecahedron", *Acta Crystallographica* **A30** (1974) 548–552, doi:10.1107/S0567739474001306.
- J. L. Hudson and J. G. Kingston, "Stellating polyhedra", *The Mathematical Intelligencer* **10** (1988) 50–61.
- A. H. Wheeler, "Certain forms of the icosahedron and a method for deriving and designating higher polyhedra", *Proc. Internat. Math. Congress, Toronto, 1924*, vol. 1, 701–708.
- M. J. Wenninger, *Polyhedron Models*, CUP (1971; MathWorld cites the 1989 printing, p. 41).
- David L. Roberts, "Albert Harry Wheeler (1873–1950): A Case Study in the Stratification of American Mathematical Activity", *Historia Mathematica* **23**:3 (1996) 269–287.
- HandWiki, *The Fifty-Nine Icosahedra* — <https://handwiki.org/wiki/The_Fifty-Nine_Icosahedra> (checked only to test a claim about its wording of rule (v); it matches Wikipedia)

---

## 10. Fact-check log (adversarial pass)

Errors found and fixed, so they don't get reintroduced:

1. **Petrie's dates were wrong.** The note said 1903–1972; he was born 26 April 1907 (1903 is Du
   Val's birth year, which looks like where it came from). Fixed in §1.
2. **The HandWiki variant of rule (v) does not exist.** The note claimed HandWiki paraphrases
   the parenthesis as "which therefore possesses no plane of symmetry". HandWiki in fact prints
   the same text as Wikipedia and Inchbald. Removed, with a note in §2.
3. **The orbit-splitting criterion was backwards.** §6.2 said orbits of size 12/20/30/60 "have
   stabilisers containing a rotation and stay whole". Under I ⊂ Iₕ an orbit splits precisely
   when its stabiliser lies *inside* I — i.e. a purely rotational stabiliser makes it split. It
   is the presence of a *reflection* in the stabiliser that keeps an orbit whole. Rewritten.
4. **"Coxeter's gloss" about the crawling insect** is not a gloss — it is inside the printed
   parenthesis of Miller's rule (iv). Re-attributed in §2.
5. **Hess's date is not settled.** Wikipedia's 1876 carries its own editors' "was he first?"
   queries; Inchbald's timeline says 1883. Downgraded to UNCERTAIN in §1.
6. **Du Val did not work "independently".** Both Wikipedia and Inchbald describe him as
   corroborating/confirming Coxeter's enumeration. Softened in §1.
7. **Two overclaims downgraded.** The headline "forced by published data" and the §6.3 heading
   "a proof, not a guess": the layer *sizes* are published, but the subscript assignment inside
   layers 4/5/6 is derived here from region multiplicities that are my own count off a diagram
   (only 4 of the 14 have outside corroboration). The "global consistency check" is circular and
   is now labelled as such.
8. **Two passages sat too close to their sources and were rewritten:** the Wheeler sentence in
   §1 (was close to Wikipedia's "selecting regions of the stellation diagram and combining their
   cells to form new polyhedral figures") and the `f₂` line in §7 (was close to Inchbald's
   "twelve quite disconnected trapezohedra floating in space").
9. **Smaller repairs:** Inchbald's "erratum" is a corrections note on his own web version, not a
   published erratum; Bridge's initials are N. J.; Wheeler's names for `f₂`/`g₁` given in full;
   MathWorld's overbars written the way MathWorld writes them; the Hudson & Kingston issue
   number dropped (unverified); the 1938 co-imprint and *Gazette* review details flagged as
   unverified; "13 sets vs. labels 0–13" and the identity of the chirally-splitting region sets
   flagged UNCERTAIN.

Verified and left standing (spot-checked against sources this pass): Coxeter/Du Val/Miller
dates; Miller's five rules verbatim; 59 = 58 + core; 32 reflexible / 27 chiral; 4 095 = 2¹² − 1;
473 cells in 12 types; 18 lines in the stellation diagram; the apostrophe convention; 8 mainline
stellations; 18 fully supported (16 + 2, credited to Webb); Inchbald's 36; his 10 + 7 lost
stellations; Bridge's `Df₂`; Hudson & Kingston's connected-complement rule; Wenninger's
"20+30+60+20+60+120+12+30+60+60 … 10 different shapes"; Bulatov on layers 1 and 4; Inchbald's
bit codes a = 1 … h = 2048; every row of the §7 landmark table (Du Val symbols, region lists and
Wenninger numbers); the final stellation's 180/270/92; the great stellated dodecahedron being an
edge-stellation; all three editions' years, publishers and ISBNs; and the Crennell errata items.
