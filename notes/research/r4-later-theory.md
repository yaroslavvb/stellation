# r4 — Stellation theory after 1938

Research notes for the "Cells" tutorial. Everything here is about what happened *after*
Coxeter, Du Val, Flather and Petrie published *The Fifty-Nine Icosahedra* (1938) — the
criteria people invented to decide which cell-sets count as stellations, who counted what,
and how a program should list them systematically.

Written for a reader who has never met this material. Jargon is explained on first use.
Claims I could not verify are marked **UNCERTAIN**.

---

## 0. One-paragraph orientation

Extend a polyhedron's face planes. They cut space into bounded regions — **cells**. Choose
a set of cells; you get a stellation. That is the whole idea, and it is far too generous:
for a polyhedron with 30 cell types there are 2^30 subsets, and for the pentagonal
hexecontahedron the count of *reasonable* stellations alone runs past 30 trillion. So from
1938 onwards the subject has really been about **selection criteria**: extra rules that cut
the flood down to a list a human can look at. Two rules dominate practice — **Miller's
rules** (1938, from the icosahedron book) and the **fully supported** criterion (Pawley
1975, named by Messer 1995). Almost every stellation program, including Bulatov's, offers
one or both.

---

## 1. Timeline of the post-1938 literature

Compiled from Guy Inchbald's history page (which is the only connected narrative of this
material I could find), cross-checked against the individual papers where I could reach
them. Inchbald's page is opinionated — he is a partisan in several of these disputes — so
I flag where his gloss is editorial rather than factual.

| Year | Who | What |
|---|---|---|
| 1947 | Coxeter, *Regular Polytopes* | Remarks in passing that stellating and faceting are reciprocal (dual) processes. Ignored for ~50 years; Inchbald later calls this the key to a consistent theory. |
| 1957 | Dorman Luke | Stellations of the **rhombic dodecahedron**, *Math. Gazette* **41**, 189–194. Inchbald says Luke quietly relaxed Miller's rule (v). |
| 1958 | J. D. Ede | "Rhombic Triacontahedra", *Math. Gazette* **42**, 98–100. Enumerates the **main-line** stellations of the rhombic triacontahedron — 12 of them per Messer. |
| mid-1960s | Bruce Chilton | Unpublished: searches the dodecahedron's *faceting* diagram, finds 100+ facetings; fails to convince Coxeter that there can be more than 59 icosahedra. |
| c. 1970 | J. H. Conway | Distinguishes *stellation* (extend edges), *greatening* (extend faces), *aggrandizement* (extend cells). First in print via Coxeter, *Regular Complex Polytopes* (1974). |
| 1974 | N. J. Bridge | "Facetting the dodecahedron", *Acta Crystallographica* **A30**, 548–552. |
| 1975 | G. S. Pawley | "The 227 Triacontahedra", *Geometriae Dedicata* **4**, 221–232. The **non-reentrant** (= fully supported) enumeration. |
| 1980 | McKeown & Badler | "Creating polyhedral stellations", *ACM SIGGRAPH Computer Graphics* **14**(3), 19–24. Earliest published *computer program* for stellating a solid that I found. |
| 1980 | Wenninger | "Avenues for Polyhedronal Research", *Structural Topology* **5**. Reciprocation theory for uniform polyhedra and their stellations. |
| 1983 | Wenninger, *Dual Models* (CUP) | Practical reciprocation, including the hemi solids whose duals have vertices at infinity. |
| 1988 | J. L. Hudson & J. G. Kingston | "Stellating polyhedra", *Mathematical Intelligencer* **10**(3), 50–61. A readable cell-based account with *relaxed* rules: the principal condition is only that the cell set have no cavities. |
| 1989 | G. M. Fleurent | "Symmetry and polyhedral stellation — I", *Computers & Math. with Applications* **17**, 167–193. |
| 1989 | P. W. Messer & M. J. Wenninger | "Symmetry and polyhedral stellation — II", same volume, 195–201. Defines **primary** stellations. |
| 1989 | John A. Gingrich | First computer enumeration of the rhombic triacontahedron under Miller's rules (private communication, reported by Messer). |
| 1995 | P. W. Messer | "Stellations of the rhombic triacontahedron and beyond", *Structural Topology* **21**, 25–46. Updated as *Symmetry: Culture and Science* **11**(1–4), 201–230 (dated 2000, actually out 2003). |
| c. 2000–01 | Robert Webb | *Great Stella* software; cell-diagram-driven stellation, reciprocation, and later faceting tools. |
| c. 2001 | Bulatov | Java **Polyhedra Stellations Applet**; Bridges 2001 paper on stellations with *sub-symmetries*. (This is the program being documented.) |
| 2002 | Guy Inchbald | "In search of the lost icosahedra", *Math. Gazette* **86**(506), 208–215. |
| 2003 | Inchbald | "Towards stellating the icosahedron and facetting the dodecahedron", *Symmetry: Culture and Science* **11**(1–4), 269–291 (dated 2000, published 2003). |
| 2005 | Inchbald | "Some lost stellations of the icosahedron" (web). Rediscovers two non-Miller models at Cambridge, tentatively attributed to Flather. |
| 2006 | Inchbald | "Facetting diagrams", *Math. Gazette* **90**(518 or 519), 253–261. |
| 2009 | J. Hudson | "Further Stellations of the Uniform Polyhedra", *Math. Intelligencer* **31**(4), 18–26. Introduces "external" vs "internal" stellation. |
| 2025 | Inchbald | Web essays giving dual definitions of stellation/faceting and *infinite* regular stellations of the cube. |

**UNCERTAIN:** the issue number of the 2006 *Gazette* paper — Inchbald's own publication list
says No. 518, one page of his site says No. 519. Everything else about it agrees.

---

## 2. The vocabulary the programs use

These definitions come mostly from Robert Webb's *Stella* glossary and from Bulatov's own
Bridges 2001 paper, which is the direct source for the program you are documenting. They
agree almost word for word, which is convenient.

- **Cell.** A convex region of space bounded by some of the face planes and cut by none of
  them. Only *finite* cells are used; far enough out, everything is unbounded.
- **Cell type** (Webb) / **complete stellation cell** (Bulatov). The orbit of one cell under
  the polyhedron's symmetry group — i.e. one cell together with all its symmetric copies.
  Because a stellation is normally required to keep the core's symmetry, you take a whole
  orbit or none of it, so people say "cell" when they mean "cell type".
- **Sub-cell** (Bulatov's term). If you demand only the symmetry of a *subgroup* H of the
  core's group G, an orbit under G can break into several orbits under H. Bulatov's worked
  example: under the tetrahedral subgroup T_h, the icosahedron's 20-cell orbit splits 8 + 12.
  For a rotation-only subgroup like I inside I_h, a 120-cell orbit splits into two chiral
  halves of 60 — exactly the split your layer 5 shows.
- **Layer.** Bulatov's definition: the layer number of a cell is *the number of face planes
  crossed by a ray from the centre of the core to a point inside the cell*. Layer 0 is the
  core. Webb's equivalent phrasing: each layer is the minimal set of cells needed to cover
  the previous layer (or to cover as much of it as can be covered, out where the shells get
  holes). Du Val used exactly this quantity in 1938 and called it the cell's **power**.
- **Top and bottom facets.** A cell's *bottom* facets face the centre; its *top* facets face
  away. Every elementary region of the 2-D stellation diagram is the top of one cell and the
  bottom of another.
- **Supported.** A cell is supported when every one of its bottom facets is covered by a cell
  in the layer below that is also included. The core has no bottom facets, so it is
  automatically supported.
- **Cell diagram.** A graph: nodes are cell types, arranged in rows by layer; an edge joins a
  node to a node in the layer below when the two cell types share a facet — i.e. when the
  lower one *supports* the upper one. This is the object Miller's rules 4 and 5 are really
  talking about (see §4).
- **Aggregate.** Webb's term (credited to George Olshevsky) for a stellation described only
  by its outward-visible faces, with no internal faces. This is what *Great Stella* — and
  any cell-selection program — actually produces. Two aggregates that look identical from
  outside are the same object here even if, as full face-polyhedra, they are topologically
  different. Inchbald's central complaint (§5) is precisely that this throws away real
  information.

### The icosahedron, concretely

The 20 face planes of the regular icosahedron cut space into **473 finite cells**
(Inchbald; also the English Wikipedia article on *The Fifty-Nine Icosahedra*). Du Val
labelled the shells outward as a (the core), b, c, d, e, f, g, h; shells that contain more
than one shape get numeric suffixes — e1/e2, f1/f2, g1/g2 — and f1 is the chiral one, whose
left and right forms Du Val distinguished by italics.

That gives **8 layers** and **10 non-core cell types** (9 mirror-symmetric + 1 chiral), which
is exactly what your program reports, and exactly what two independent sources report:

- Messer 1995, in his table of isohedral cores, gives the regular icosahedron **7 layers,
  10 cell types (9 reflexible, 1 chiral)** — he does not count the core as a layer or a type.
- Webb's *Great Stella* enumeration page gives the icosahedron **8 layers, 11 cell types
  (10 reflexible, 1 chiral), max 3 cell types in any one layer** — he *does* count the core,
  and he counts a chiral pair as two when computing the "max per layer" figure.

Your layer 5 holds a 12-cell orbit plus a 120-cell chiral orbit; counting the chiral orbit
as two gives 3, matching Webb's "max cells per layer = 3". The +1 offsets everywhere else are
just the core. **Your cell table agrees with both published enumerations.**

Reconstructed mapping from your per-layer counts onto Du Val's letters (see the evidence
column; I have not seen a single source that prints the whole table, so treat this as a
reconstruction, **UNCERTAIN** in the two places noted):

| Layer | Cells | Du Val | Evidence |
|---|---|---|---|
| 0 | 1 | a (core) | Du Val's a is the core (Wikipedia). |
| 1 | 20 | b | 20 triangular pyramids on the faces; Bulatov, Fig. 6. |
| 2 | 30 | c | by elimination |
| 3 | 60 | d | by elimination |
| 4 | 20 | e1 | Bulatov explicitly identifies his layer-4, 20-cell type with Du Val's **e1**. |
| 4 | 60 | e2 | by elimination |
| 5 | 120 (chiral) | f1 | Du Val's f1 is the enantiomorphous one (Wikipedia); your 120 is the one that splits 60/60. |
| 5 | 12 | f2 | Inchbald describes **f2** as "twelve isolated trapezohedra". |
| 6 | 30 | g1 | Inchbald describes **g1** as "thirty disconnected bipyramids". |
| 6 | 60 | g2 | by elimination |
| 7 | 60 | h | outermost shell; the final stellation is Du Val's **H**. |

Total 1+20+30+60+20+60+120+12+30+60+60 = **473** ✔, which is a genuine cross-check: the
counts are forced once you fix e1 = 20, f2 = 12, g1 = 30.

**UNCERTAIN:** whether e1 is the 20 and e2 the 60, or vice versa, rests on a single sentence
in Bulatov's Bridges paper. Likewise which of the 30/60 pair in layer 6 is g1 rests on
Inchbald's "thirty bipyramids" remark.

**UNCERTAIN / minor conflict:** several sources (Inchbald; English Wikipedia) say the 473
cells "come in just **12** shapes". Ten non-core orbits plus the core is 11. The extra one is
probably the left/right pair of f1 being counted as two *shapes* (they are mirror images, so
one orbit but two congruence classes if reflection is disallowed). I could not confirm this
reading anywhere.

---

## 3. The "fully supported" criterion

### Statement

Three equivalent phrasings, all in circulation:

1. **Cell-local (Messer 1995, Bulatov 2001):** every included cell has all of its *bottom*
   facets covered by included cells from the layer below. Messer's own wording of the rule
   is that no cell may leave any of its bottom surface uncovered, and his image for it is a
   stack of balls in which the top ball rests on all the balls beneath it.
2. **Ray test (Webb):** any ray from the centre of the core outwards crosses the model's
   surface exactly once. Webb also calls this **radially convex** — in ordinary maths
   language the solid is a *star domain* about its centre.
3. **Face-side test (Pawley's original "non-reentrant", 1975):** every visible part of every
   face is seen from the same side; there are no *undercut* or *overhang* regions where you
   see the underside of a face from outside.

The opposite is **reentrant** (Pawley/Messer) or **not fully supported** (Webb).

### Provenance of the term

- Pawley (1975) enumerated the **non-reentrant** stellations of the rhombic triacontahedron;
  this is the first systematic use of the idea.
- Messer (1995) explicitly says he prefers the "more positive designation *fully supported*"
  to "non-reentrant". So: **concept Pawley 1975, name Messer 1995.**
- Webb made it the *default* criterion in *Great Stella*.
- Bulatov's Bridges 2001 paper defines it in the same cell-local way and gives the practical
  reason: fully supported stellations "look more like traditional polyhedra — solid shapes
  without voids."

### How it relates to Miller's rules

They are different in kind. Support is a *geometric* condition about undersides; Miller's
rules are mostly *combinatorial* conditions on the cell diagram plus a symmetry requirement.
Empirically the fully supported set is always the smaller of the two:

- Icosahedron: **18** fully supported (16 reflexible + 2 chiral) versus **59** under Miller's
  rules (32 + 27). MathWorld states these as "18 of the 59", i.e. as a subset.
- Rhombic triacontahedron: **227** versus ~358.8 **million**.
- Truncated dodecahedron: **1141** versus **2,645,087,084,526**. Webb uses this pair to make
  the point that the two criteria are not remotely comparable in size.

English Wikipedia asserts flatly that main-line, fully supported, monoacral and primary
stellations "are all subsets of the Miller stellations". Every published pair of counts I
found is consistent with that, and MathWorld's phrasing for the icosahedron ("18 of the 59")
asserts it directly for that case. **UNCERTAIN:** I found no proof, and no source that
addresses whether it holds for every core. It is not obviously forced — Miller's rule 5 in
particular constrains the *unused* cells, which support says nothing about.

### Why programs enforce it

Five reasons, all attested:

1. **Model-building.** Messer's motivation throughout is paper models; a reentrant solid has
   overhanging faces whose undersides show, which is awkward to describe with a net and
   awkward to build. Ede's main-line and Pawley's non-reentrant lists were both compiled by
   and for model makers.
2. **It matches naive intuition of "solid".** A fully supported stellation has no hidden
   voids: the surface bounds a star-shaped body, and George Hart glosses it as "no hollows
   between any point in the solid and its centre."
3. **Size.** It reduces astronomically. See the truncated dodecahedron numbers above.
4. **It makes the surface well defined.** If every outward ray hits the surface once, the set
   of externally visible facelets is unambiguous — which is what a renderer and a net
   printer both need.
5. **It is cheap to enforce incrementally.** Support is a purely local, downward condition,
   so a UI can maintain it while the user clicks (see §9).

### The one genuine surprise: unsupportable cells

Webb reports a discovery he made writing *Great Stella*: for a few Archimedean-family solids,
some *finite* cells cannot be supported by finite cells at all — part of their underside is
covered only by *infinite* cells. Equivalently, the final stellation (all finite cells) of
those solids is itself reentrant. He lists the **snub cube**, the **snub dodecahedron** and
the **pentagonal hexecontahedron**, plus various non-convex uniform solids, and says as far
as he can tell nobody had noticed before. Webb's glossary consequently defines "supported"
with an escape clause: *"unless the cell is unsupportable"*.

This matters for an implementation: a naive "a cell is legal only if all its lower
neighbours are present" rule silently makes some cells unselectable forever.

---

## 4. Miller's rules, and the fight over rule 5

### The rules

J. C. P. Miller proposed five conditions, printed in *The Fifty-Nine Icosahedra*. Paraphrased
(the original wording is icosahedron-specific):

1. Faces must lie in the core's face planes.
2. The parts of the faces lying in each plane must be the same in every plane — but they may
   be disconnected.
3. Those parts must have the rotational symmetry of the core's face (trigonal for the
   icosahedron), with or without reflection. Rules 2–3 together force the whole figure to
   have at least the core's rotational symmetry.
4. Every part must be *accessible* — on the outside of the finished solid. Miller's own
   gloss is memorable: on a big enough model, some of the "outside" could only be explored by
   a crawling insect.
5. Cases are excluded where the parts split into two sets, each of which already has as much
   symmetry as the whole — **but** a pair of enantiomorphs (mirror twins) with no part in
   common is allowed, which happens exactly once among the 59.

Webb's translation of 4 and 5 into cell-diagram language is the one a program can use:
**rule 4** requires the *selected* nodes of the cell diagram to form a connected subgraph;
**rule 5** requires the *unselected* nodes to be connected too, with the one exception. Note
that rule 4 being satisfied does *not* mean the physical model is connected — individual
cells within one cell type may still be floating apart.

Counts under Miller's rules: no stellations of the tetrahedron or the cube; 1 of the
octahedron (the stella octangula); 3 of the dodecahedron (all three are Kepler–Poinsot
solids); 58 of the icosahedron, 59 counting the icosahedron itself.

### The rule-5 debate

The exception clause at the end of rule 5 is ambiguous, and it only bites when the core is
more complicated than the icosahedron (for the icosahedron all readings give the same 59).
Webb documents **three** interpretations:

- **John Gingrich:** the exception licenses a single chiral pair on its own, and nothing more.
- **Vince Matsko:** whenever either member of a chiral pair could be used, both may be.
- **Webb:** if an otherwise-valid stellation consists only of chiral cells without their
  partners, then that stellation combined with its mirror image is also valid.

Webb also relays a fourth angle from Peter Messer: read "as much symmetry as the whole
figure" in the *first* sentence as including reflection, and the second sentence becomes
redundant rather than exceptional.

Coxeter was asked directly. His reply to Gingrich, dated **24 February 2001**, was that he
could not remember what Miller intended and left the choice to the correspondent. That is
the closest thing to an authoritative resolution that exists.

### The resulting number salad for the rhombic triacontahedron

Watch out for these — they differ for three separate reasons (core counted or not,
rule-5 reading, and an outright bug):

| Figure | Source | What it is |
|---|---|---|
| 358,833,072 | J. A. Gingrich, 1989, reported by Messer (1995) and by George Hart | Miller's rules, Gingrich's rule-5 reading, RTC core included |
| 358,833,106 | Webb, *Miller's Fifth Rule* page | Gingrich's total corrected by +34 under Webb's rule-5 reading |
| 358,833,098 | Webb, *Enumeration of Stellations* page, computed by *Great Stella*; Webb says he and Gingrich now agree this is right | the figure Webb currently stands behind |
| 358,833,097 | English Wikipedia | = 358,833,098 − 1, i.e. Webb's figure with the core not counted |
| 155,014,690 | Gingrich team, reported by Messer (1995) | "rigid" triacontahedra: Miller's rules **plus** the requirement that cells interconnect face-to-face into one continuous solid |

The 358,833,106 and 358,833,098 figures are both on Webb's own site and contradict each
other; the Enumeration page reads as the later and definitive one. Webb's glossary calls the
extra face-connectivity condition the **Gingrich rules**, or "fully connected", and notes
that although they are the most "sensible" rules — they always give a model you could
actually build — they are also the hardest to compute with.

---

## 5. Guy Inchbald: the standing critique

Inchbald (b. Cambridge MA, an independent researcher; site *steelpillow.com*) is the most
persistent modern critic of the 1938 settlement. His argument, developed across four
publications and a long-running website, runs roughly:

**(a) Miller's rules have no theory behind them.** They were, he says, proposed by a student
to colleagues without a rigorous background, nobody knew what they would yield, and they
were then "followed slavishly" for sixty years. He traces their real ancestry not to Kepler
but to A. H. Wheeler's 1924 method of looking only at visible face regions — which means they
deliberately ignore internal structure and do not recognise crossing lines as false edges.

**(b) Cell sets are the wrong primitive.** Different internal structures can give the same
outward appearance; the cell-set view calls these one object, when mathematically they are
several. He puts it sharply in his "Defining stellation and facetting" essay: cell sets are
an emergent consequence of stellation, not fundamental to it, and Miller's rules "suffer from
having no relation whatsoever to facetting."

**(c) The right foundation is duality.** Coxeter noticed in 1947 that stellating and
faceting are reciprocal. Every stellation of a polyhedron corresponds to a faceting of its
dual. Inchbald says he stumbled on this remark just as the 2002 paper was going to press and
realised it was the key. The 2003 *Symmetry* paper and the 2006 *Gazette* paper build it out;
the 2006 paper introduces the **faceting diagram** — a diagram of all edges and facets that
can meet at a vertex — as the exact dual of the stellation diagram.

**(d) Concrete casualties.** "In search of the lost icosahedra" (2002) presents figures that
are perfectly good stellations by any Keplerian reading but are excluded by Miller's rules:
he names **De1f1f2** and its enantiomorph, and discusses **De1f1f2g1**. Conversely he argues
that some of the accepted 59 are dubious — index 16 is Du Val's **f2**, twelve trapezohedra
floating in space with no icosahedron present at all ("how can one stellate an icosahedron
that is not there?"). He suggests calling such figures **coronae** rather than stellations.
In 2005 he rediscovered two non-Miller models physically present in the Cambridge Department
of Pure Mathematics next to Flather's famous set of 59 — **Ce2** (Crennell index 39) and
**De1g1** — and tentatively attributes them to Flather, made around 1930 before he met
Coxeter.

**(e) His trial replacement rules also fail.** This is the part most relevant to a program.
He tried three alternative criteria by computer (results self-described as unvalidated):

- *All cells connected, plus the core must be present.* Gives only limited subsets; rejected.
- *Faces must be continuous through the body of the solid.* This finds the two lost
  icosahedra and yields a total of **36** icosahedra.
- *All edges must be continuous.* Finds two further figures (**acdf2g1**, **be2**) which
  nevertheless violate Miller's rules (iv)–(v).

He concludes that the real unsolved problem is prior: nobody has said what counts as a valid
*polygon* inside a stellation, once you admit star polygons with regions of different density.

**Editorial caution.** Inchbald's history page is where most of the dates in §1 come from and
it is a genuinely valuable resource, but it also contains sentences like the claim that
Coxeter "piles one inconsistency on top of another". Use it for facts, not for consensus.

Note also that Inchbald's history page says Messer enumerated **228** fully supported RTC
stellations, whereas Messer's own abstract and text say **226**. See §6.

---

## 6. Peter Messer and the rhombic triacontahedron

The rhombic triacontahedron (RTC) is the dual of the icosidodecahedron: 30 identical rhombic
faces, icosahedral symmetry. It is the standard "next hard case" after the icosahedron, and
it is where the fully supported criterion was invented.

**Pawley 1975.** "The 227 Triacontahedra". Enumerated the non-reentrant stellations.
Messer records that Pawley catalogued the fully supported, *reflexible* ones — without face
descriptions — and listed, for each, how many chiral pairs could be derived from it by
deleting chiral cells while keeping rotational symmetry and full support.

**Messer 1995.** *Structural Topology* **21**, 25–46 (the journal's last issue; the paper is
bilingual English/French). Messer's own summary: **226** fully supported stellations, of
which **114** have the full icosahedral symmetry of the core and the remaining **112** are
each one member of a chiral pair. He verified Pawley's total independently by inspection, and
Paul A. Gingrich verified it by computer. The paper's substance is a systematic *notation*:
lines of the stellation diagram labelled A, B, C, … outward along a symmetry line; three
kinds of line (primary, secondary, and symmetry lines — the last are not real plane
intersections and do not cut the diagram); elementary regions labelled by layer number plus a
lowercase letter running round the diagram; and from those, names for stellations and for
their exposed facets. He states explicitly that the method is meant to generalise to "the
largely unexplored stellations of other convex isohedra, for example, the duals of the
Archimedean polyhedra."

Reconciling 226 / 227 / 228:

- 226 = Messer's and Pawley's stellation count, core **not** counted.
- 227 = Pawley's title, and Webb's *Great Stella* figure (115 reflexible, 112 chiral) — core
  **counted**.
- 228 = Inchbald's history page. Probably an error; I could not reproduce it. **UNCERTAIN.**
- George Hart's page independently gives 226 fully supported.

**Messer's table of isohedral cores** (1995) is the single most useful published cross-check
for a program like yours: for each of a dozen isohedra it lists layers, cell types (split
reflexible / chiral), and fully supported stellations (same split). Every entry I compared
matches Webb's *Great Stella* enumeration exactly after adding 1 for the core — icosahedron,
triakis tetrahedron, tetrakis hexahedron, triakis octahedron, deltoidal hexecontahedron,
pentagonal icositetrahedron. The one exception is the **deltoidal (trapezoidal)
icositetrahedron**, where Messer's scan reads 1076 (385 reflexible, 691 chiral) against
Webb's 1201 (386, 815). **UNCERTAIN:** the Messer PDF is a scan and the OCR of that row is
not fully trustworthy, so this may be an artefact rather than a real disagreement — worth
checking against a clean copy before repeating it.

**Named subsets, all due to this circle:**

- **Main-line** — include every cell of some layer and every layer below. There are exactly
  as many as there are layers. Ede (1958) gave the RTC's 12; the last one is the *final
  stellation*.
- **Primary** (Messer & Wenninger 1989) — a line of the stellation diagram lying in a mirror
  plane of the core is a *primary line*; a stellation all of whose edges lie on primary lines
  is primary. Implies the stellation is isohedral (all faces alike), so the notion only
  exists for cores with mirror symmetry. All primary stellations are fully supported.
- **Monoacral** (Messer, c. 2001; first published use by Webb in *Great Stella*) —
  literally "single-peaked": only one kind of vertex, i.e. all peaks congruent within one
  symmetry orbit. Webb's operational restatement: for a given cell type, the *minimal fully
  supported stellation containing it* — that cell plus its supporters, plus their supporters,
  and so on. So there are about as many monoacral stellations as cell types. All are fully
  supported. **This is exactly the operation behind Bulatov's one-click "make a fully
  supported stellation with this cell on top"** — his paper's example switches on 73 subcells
  from a single click on the topmost cell of a strombic hexecontahedron.
- **Fully connected / Gingrich rules** (Webb's names) — Miller's rules plus face-to-face
  connectivity into one solid piece.

Ordering by restrictiveness, least to most (Webb): Miller's rules ⊃ fully connected ⊃ fully
supported ⊃ monoacral ⊃ primary ⊃ main-line. **UNCERTAIN:** Webb presents this as a rough
ordering by how many stellations each admits, not as a chain of set inclusions, and "fully
connected ⊃ fully supported" in particular I would not assume.

---

## 7. N. J. Bridge and faceting the dodecahedron

**Faceting** is the dual operation to stellation: keep the vertices, choose new faces
(*facets*) joining them. Faceting a dodecahedron produces figures dual to stellations of an
icosahedron, and vice versa — that is the reciprocity Coxeter noted in 1947.

Bridge, "Facetting the dodecahedron", *Acta Crystallographica* **A30** (1974), 548–552.
He enumerated what Inchbald calls the **tidy** facetings of the regular dodecahedron, then
reciprocated them to get stellated icosahedra. Inchbald's count of Bridge's result: **22**
tidy facetings, plus the dodecahedron itself, plus two hemi facetings that Bridge rejected —
24 figures in all; and Inchbald's own breakdown agrees, 8 regular/quasiregular plus 14
further tidy ones. Bridge's tidiness conditions were stricter than Inchbald's: no coincident
edges or vertices, no collinear edges, and no edges passing through the centre — chosen so
that the reciprocal figures would also be acceptable.

The headline result: reciprocating the facetings turned up a stellated icosahedron,
**Df2**, which is a proper uniform dual but is *not* among the 59, because Miller's rules
forbid it. Inchbald calls it "a perfect counter-example to the use of Miller's rules in
defining stellations". Coxeter, per Inchbald, was uninterested.

Inchbald also computes, in the other direction, that only **16** of the 59 Miller icosahedra
can be built as *tidy* polyhedra; the other 43 are untidy in one way or another. His own
verdict on the whole tidiness business is that it is subjective, whereas polar reciprocity
is a mathematical principle.

Terminological trivia from the same source: Bridge, working in isolation, introduced the
double-t spelling "facetting" and the noun "facetion".

**UNCERTAIN:** the author's given name. The paper is by *N. J. Bridge*; English Wikipedia
calls him "James Bridge". I did not resolve this.

---

## 8. Other solids, and how many stellations things have

### Rhombic dodecahedron

Dorman Luke, "Stellations of the rhombic dodecahedron", *Math. Gazette* **41** (1957),
189–194. Modern counts: **4** fully supported stellations including the solid itself (Wells
1991; Webb), and **5** under Miller's rules, all mirror-symmetric (Webb). Messer's table
gives 3 layers, 3 cell types, 3 stellations excluding the core — consistent.

Inchbald's reading of Luke: he relaxed Miller's rule (v) to allow concentric cell sets
meeting only at points, and a postscript signed H.M.C. (Martyn Cundy) wrongly claimed Luke's
list obeyed the same rules as the 59 icosahedra. Inchbald also thinks Luke missed at least
one figure.

### Archimedean solids and their duals

The general practice (English Wikipedia) is to add a rule when stellating non-regular cores:
*every* original face plane must appear in the stellation, so that "partial" stellations are
excluded — for example, the cube is not counted as a stellation of the cuboctahedron. Webb's
enumerations deliberately do *not* impose this and he flags it as something he ought to fix.
That is the main reason his figures and Wikipedia's differ by more than one.

Representative figures (all from Webb's *Great Stella* enumeration page unless noted; his
convention counts the core):

- Triakis tetrahedron (dual of the truncated tetrahedron): 21 fully supported, 188 Miller.
  Wikipedia's 187 is the same minus the core.
- Cuboctahedron: 13 fully supported, 21 Miller. Wikipedia says 17. **My reconstruction,
  UNCERTAIN:** 21 − 1 core − 3 partial stellations (cube; octahedron; stella octangula) = 17.
- Icosidodecahedron: 847 fully supported; 70,841,855,109 Miller, of which 7,071,672 are
  reflexible. Wikipedia's "7,071,671 non-chiral" is that minus the core; it says the chiral
  count is unknown, whereas Webb's page gives it.
- Truncated dodecahedron: 1141 fully supported versus 2,645,087,084,526 Miller — Webb's
  favourite illustration of the gap.
- Pentagonal icositetrahedron (dual of the snub cube): 72,621 fully supported, all chiral.
  Webb notes this was the highest *previously published* fully-supported count, due to Messer.
- Pentagonal hexecontahedron (dual of the snub dodecahedron): **30,049,378,413,796** fully
  supported. Webb says this took several months on a 2.5 GHz Intel i5, counting over a
  million stellations per second — the largest fully-supported figure computed to date.
- Rhombicuboctahedron (4.4.3.4): the Miller's-rules total is unknown; even the reflexible
  part alone is 128,723,453,647.

Also worth knowing: **seventeen** of the non-convex uniform polyhedra are stellations of
Archimedean solids (Wikipedia), and Wenninger's *Polyhedron Models* (1971) presents models
W19–W66 as stellations, including four stellations of the cuboctahedron and about twenty of
the icosidodecahedron.

Please do not copy Webb's table wholesale into the tutorial — it is his data and his
several-months-of-CPU result. Cite the two or three figures you actually need and link to
<https://www.software3d.com/Enumerate.php>.

---

## 9. Enumeration algorithms

There is much less published here than one might hope. What exists:

**McKeown & Badler (1980)**, "Creating polyhedral stellations", *ACM SIGGRAPH Computer
Graphics* **14**(3), 19–24 (Univ. of Pennsylvania). The earliest published program: it
takes a polyhedral solid, performs the stellation process, and renders the result; the paper
shows icosahedron and rhombic triacontahedron stellations. I could not read the full text
(ACM DL blocks automated fetch), so **UNCERTAIN**: whether they enumerate or merely
construct.

**Gingrich (1989)**, the first Miller's-rules enumeration of the rhombic triacontahedron.
Webb records that Gingrich designed a **circuit board specifically for the job** — this is a
pre-FPGA hardware accelerator for counting stellations, which is a wonderful detail. The
arithmetic was right; only the rule-5 interpretation was contested. Inchbald's timeline dates
the program to 1989 and adds that "the algorithm is not quite right yet".

**Webb / *Great Stella* (c. 2000– ).** The practical state of the art. From his papers and
manual, the pipeline is:
1. Collect the face planes of the core.
2. Compute the arrangement of those planes; keep the bounded cells.
3. Group cells into **cell types** by the symmetry group; assign **layers**.
4. Build the **cell diagram**: nodes = cell types by layer, edges = shared facets (support).
5. Choose a criterion — fully supported (the default), Miller's rules, monoacral, primary,
   main-line, fully connected — and either walk the valid stellations one at a time
   (Next/Previous Stellation) or count them all (Enumerate).
He reports the whole stellation step takes under a second for any uniform polyhedron or dual;
the expensive part is the *counting*, not the geometry.

**Bulatov's applet (1998–2001).** Same first four steps, with two differences that matter
for your port: (i) the definition of stellation is deliberately maximally loose — *any*
combination of finite cells is a stellation, with fully supported treated as an important
special case rather than a requirement; and (ii) cells may be split into **sub-cells** under
any subgroup H of the core's symmetry group, so the selection unit is the H-orbit rather than
the G-orbit. Selection is offered two ways: a hierarchical list grouped layer → cell →
sub-cell, and direct clicking on the stellation diagram, where facets are coloured red if
you would be selecting the cell above and yellow if the cell below. He notes that clicking a
facet may force a whole cascade of other facets in or out, and that the program resolves this
automatically.

**Antiprism** (Adrian Rossiter, open source) has a `stellate` program that works from the
stellation diagram: you name a face of the input and then the diagram faces you want, with a
`-s` option for a symmetry subgroup in Schoenflies notation. It has no notion of layers,
support, or enumeration — it is a constructor, not an enumerator.

### The combinatorial shape of the problem (my own framing — not from a source)

The support relation makes the cell types a **partially ordered set**: c ≤ c′ when c is
needed (directly or transitively) to support c′. Then:

> A cell set is fully supported **iff** it is a downward-closed subset (an *order ideal*, or
> *down-set*) of that poset.

That is a clean, implementable characterisation, and it has consequences:

- **Enumeration** = enumerating the down-sets of a poset. Standard techniques apply: DFS over
  cell types in a topological (layer) order, with the invariant "a cell may be added only if
  all its supporters are already in"; or, since down-sets correspond bijectively to
  antichains (their maximal elements), enumerate antichains.
- **Counting** down-sets of a general poset is #P-complete (Provan & Ball 1983), which
  explains why Webb's numbers behave the way they do — cheap for the icosahedron, hopeless
  for the rhombicuboctahedron, and only tractable for the pentagonal hexecontahedron because
  the poset is layered and a layer-by-layer dynamic program keeps the state small.
- **The UI operations fall out for free.** "Select this cell and everything it needs" is the
  *principal down-set* generated by that cell — which is exactly Webb's operational
  definition of a **monoacral** stellation, and exactly Bulatov's one-click button.
  "Deselect this cell" must remove its principal *up-set*.
- **Sub-cells just refine the poset.** Splitting an orbit into H-orbits replaces one node by
  several; the support edges are inherited from facet adjacency. Nothing else changes.
- Miller's rules do **not** have this structure: rules 4 and 5 are connectivity conditions on
  the selected set *and* its complement, which are neither monotone nor local. That is why
  Miller's-rules counts are so much more expensive, and why Webb calls the still-stricter
  Gingrich rules "the hardest rules to use".

I found no source that states the order-ideal characterisation explicitly, so present it as
the tutorial's own observation, not as received theory.

---

## 10. Direct implications for the "Cells" table tutorial

1. Your 8 layers / 10 non-core orbits / 473 cells for the icosahedron are **independently
   confirmed** by Messer (1995) and Webb (*Great Stella*). Say so; it is a real validation of
   the port.
2. The chiral split of the 120-cell orbit into 60+60 under **I** rather than **I_h** is
   Bulatov's sub-symmetry idea from the Bridges 2001 paper, and it is the feature that
   distinguishes his program from *Great Stella* and from every pre-1990s treatment. The
   ancestry of "stellations with less than full symmetry" is: Alan Holden, *Shapes, Space and
   Symmetry* (Dover, 1971), p. 90 — the earliest known, on the dodecahedron — then Olshevsky
   (1996), Hart (1996), Matsko (1997), Bulatov's own *270 Dodecahedra* (1997), and Verheyen's
   *Symmetry Orbits* (Birkhäuser, 1996) for compounds.
3. "Supported" in the tutorial should be defined cell-locally (bottom facets covered) and
   then given the ray test as the memorable equivalent. Messer's stack-of-balls image is the
   best one-line intuition and is safe to paraphrase.
4. Mention **unsupportable cells** if the program handles the snub solids; otherwise mention
   them as a known trap.
5. When you quote counts, always say whether the core is counted. Nearly every published
   discrepancy in this literature is that ±1, and the rest are rule-5 readings.

---

## 11. Things I could not confirm

- Whether "fully supported ⊆ Miller's rules" is a theorem or merely an empirical observation.
- The 226 vs 228 fully-supported RTC discrepancy between Messer's paper and Inchbald's
  history page.
- The deltoidal icositetrahedron row disagreement between Messer's table and Webb's
  (possible OCR artefact).
- Whether Du Val's e1 is the 20-cell or the 60-cell orbit, beyond Bulatov's single sentence.
- Why Inchbald and Wikipedia say the icosahedron's cells come in 12 shapes when the orbit
  count is 11 including the core.
- N. J. Bridge's given name.
- The exact content of the McKeown & Badler algorithm (paywalled).
- Whether Hudson & Kingston (1988) or Hudson (2009) give an algorithm; I only have secondary
  descriptions of their *rules*.
- Details of Fleurent's "Symmetry and polyhedral stellation — I" (1989) beyond the citation.

---

## 12. Sources

Primary / near-primary, in order of usefulness for this note:

- Peter W. Messer, "Stellations of the rhombic triacontahedron and beyond", *Structural
  Topology* **21** (1995), 25–46. Full scan:
  <https://upcommons.upc.edu/handle/2099/1097>
  (direct PDF: <https://upcommons.upc.edu/server/api/core/bitstreams/397d68a7-f46c-4ca7-b3f3-47acde81af58/content>).
  Updated version: *Symmetry: Culture and Science* **11**(1–4) (2000), 201–230.
- Vladimir Bulatov, "An Interactive Creation of Polyhedra Stellations with Various
  Symmetries", Bridges 2001 (Wichita).
  <http://bulatov.org/polyhedra/StellationWithVariousSymmetries/> — the program's own paper.
- Robert Webb, "Enumeration of Stellations". <https://www.software3d.com/Enumerate.php>
- Robert Webb, "Miller's Fifth Rule". <https://www.software3d.com/Millers5th.php>
- Robert Webb, "Unsupportable Finite Cells". <https://www.software3d.com/Unsupported.php>
- Robert Webb, "Stella's Polyhedral Glossary". <https://www.software3d.com/Glossary.php>
  (entries: cell, cell diagram, cell type, layer, support, fully supported, reentrant,
  radially convex, Miller's rules, main-line, monoacral, primary, fully connected, aggregate)
- Robert Webb, "Stella: Polyhedron Navigator", *Symmetry: Culture and Science* **11**(1–4)
  (2000, published 2003), 231–268. <https://www.software3d.com/PolyNav/PolyNavigator.php>
  (note: that page truncates part-way through §3 when fetched programmatically)
- Guy Inchbald, "Stellating and Facetting — a Brief History".
  <https://www.steelpillow.com/polyhedra/StelFacet/history.html> — the timeline in §1.
- Guy Inchbald, "In Search of the Lost Icosahedra".
  <https://www.steelpillow.com/polyhedra/icosa/searchlost/searchlost.html>
  (= *The Mathematical Gazette* **86**(506), July 2002, 208–215)
- Guy Inchbald, "Stellating the Icosahedron and Facetting the Dodecahedron".
  <https://www.steelpillow.com/polyhedra/icosa/stelfacet/StelFacet.html>
  (= *Symmetry: Culture and Science* **11**(1–4), 269–291)
- Guy Inchbald, "Defining Stellation and Facetting".
  <https://www.steelpillow.com/polyhedra/StelFacet/stel-facet.html>
- Guy Inchbald, "Some Lost Stellations of the Icosahedron".
  <https://www.steelpillow.com/polyhedra/icosa/lost/lost.html>
- Guy Inchbald, "Tidy Dodecahedra and Icosahedra" (Bridge's enumeration).
  <https://www.steelpillow.com/polyhedra/icosa/tidystelfacet/TidyStelFacet.html>
- Guy Inchbald, "Facetting Diagrams".
  <https://www.steelpillow.com/polyhedra/FacetingDiagrams/FacetingDiags.html>
  (= *The Mathematical Gazette* **90**, July 2006, 253–261)
- Guy Inchbald, publication list. <https://steelpillow.com/guy/published/index.html>
- Vincent J. Matsko, "Stellations of Two Cores".
  <https://vincematsko.com/resources/StellationsOfTwoCores.pdf> — cell adjacency diagrams for
  a two-core generalisation; also the source for the Hudson & Kingston citation.
- MathWorld: "Fully Supported Stellation", "Miller's Rules", "Stellation", "Icosahedron
  Stellations", "Rhombic Triacontahedron Stellations", "Rhombic Dodecahedron Stellations".
  <https://mathworld.wolfram.com/FullySupportedStellation.html> etc.
- English Wikipedia, "Stellation" and "The Fifty-Nine Icosahedra".
- George W. Hart, "Stellations of the Rhombic Triacontahedron".
  <https://www.georgehart.com/virtual-polyhedra/srtc-info.html>
- Adrian Rossiter, Antiprism `stellate` documentation.
  <https://www.antiprism.com/programs/stellate.html>

Cited but not read directly (paywalled or offline):

- G. S. Pawley, "The 227 triacontahedra", *Geometriae Dedicata* **4** (1975), 221–232.
  <https://link.springer.com/article/10.1007/BF00148756>
- N. J. Bridge, "Facetting the dodecahedron", *Acta Crystallographica* **A30** (1974),
  548–552.
- D. Luke, "Stellations of the rhombic dodecahedron", *Math. Gazette* **41** (1957), 189–194.
- J. D. Ede, "Rhombic Triacontahedra", *Math. Gazette* **42** (1958), 98–100.
- J. L. Hudson & J. G. Kingston, "Stellating polyhedra", *Mathematical Intelligencer*
  **10**(3) (1988), 50–61.
- J. Hudson, "Further Stellations of the Uniform Polyhedra", *Mathematical Intelligencer*
  **31**(4) (2009), 18–26. <https://doi.org/10.1007/s00283-009-9061-y>
- G. M. Fleurent, "Symmetry and polyhedral stellation — I", *Comput. Math. Applic.* **17**
  (1989), 167–193.
- P. W. Messer & M. J. Wenninger, "Symmetry and polyhedral stellation — II", *Comput. Math.
  Applic.* **17** (1989), 195–201.
- K. R. McKeown & N. I. Badler, "Creating polyhedral stellations", *ACM SIGGRAPH Computer
  Graphics* **14**(3) (1980), 19–24. <https://doi.org/10.1145/965105.807463>
- H. S. M. Coxeter, P. Du Val, H. T. Flather & J. F. Petrie, *The Fifty-Nine Icosahedra*,
  Univ. of Toronto Press 1938; Springer 1982; Tarquin 3rd edn (Crennell) 1999.
- M. J. Wenninger, *Polyhedron Models* (CUP 1971), *Spherical Models* (CUP 1979),
  *Dual Models* (CUP 1983).
- A. Holden, *Shapes, Space and Symmetry*, Dover 1971, p. 90.
- H. F. Verheyen, *Symmetry Orbits*, Birkhäuser 1996.
