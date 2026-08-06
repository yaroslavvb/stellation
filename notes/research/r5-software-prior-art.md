# R5 — Software prior art: how stellation programs let you choose cells

**Research note for the "Cells" tutorial.** Compiled 2026-08-05 from primary sources
(program manuals, author websites, conference papers) plus the Internet Archive.
Everything below is about *software*: what exists, when it was written, and — the
question that matters for the tutorial — **what the user actually clicks on to pick
cells.**

---

## 0. The one-paragraph answer

Every serious stellation program eventually needs the user to answer the same question:
*which of the bounded regions carved out by the face planes are in, and which are out?*
Historically there have been **five** answers, and they are not equivalent:

| # | Interaction | Who does it | What you point at |
|---|---|---|---|
| 1 | **Shade the 2D stellation diagram** | Great Stella, Antiprism `stellate`, Fortran Friends `!Stellate`, monman53's web explorer, (Bulatov's Diagram window) | a flat *region* of one face plane |
| 2 | **Click the 3D solid** | Great Stella ("3D stellation diagram"), vZome's *59 Icosahedra*, (Bulatov's 3D window) | a facet of the model in space |
| 3 | **Click nodes of a support graph** ("cell diagram") | Great Stella only | an abstract *cell type*, positioned by layer |
| 4 | **Click a table/grid of layers × cells × sub-cells** | **Bulatov's applet and its descendants — essentially alone** | an abstract *symmetry orbit* |
| 5 | **Don't choose at all — iterate** (next/previous valid stellation under some rule set) | Great Stella; Maeder's Mathematica demo; monman53's presets | nothing; you browse a pre-filtered list |

Routes 1 and 2 are *geometric*: intuitive, but they answer "which cell is behind this
facet?" indirectly, and one click can cascade into many cells. Routes 3 and 4 are
*combinatorial*: they show you the whole state space at once, at the price of abstraction.

**A layers × cells × sub-cells table (route 4) is genuinely unusual.** In the whole
survey below, only Vladimir Bulatov's programs offer it. The nearest relative is Great
Stella's *cell diagram*, which is the same information (layers of cell types) drawn as a
graph with support edges instead of as a grid — and Robert Webb himself warns in his own
manual that it is "usually not an intuitive way to create stellations." The reason
Bulatov can make the grid work where Webb could not is that Bulatov's grid carries an
extra dimension nobody else has: **the sub-cell split induced by choosing a stellation
symmetry smaller than the polyhedron's own symmetry.**

---

## 1. Vocabulary (as used across the literature)

These terms are not standardised; the same word means slightly different things in
different programs. This matters when you compare them.

- **Elementary cell** (Bulatov) / **cell** (Webb): one convex bounded region of space cut
  out by the extended face planes. Bulatov: only finite regions are "used as building
  blocks"; infinite ones are discarded.
- **Complete stellation cell** (Bulatov) / **cell type** (Webb): the whole *orbit* of an
  elementary cell under the symmetry group — i.e. one elementary cell plus every copy of
  it that symmetry produces. Both authors note that in practice you say "cell" when you
  mean "cell type", because you almost never want a single loose region.
  - Webb is explicit that he groups by the **rotational** group only, so a chiral cell
    appears as a left/right *pair* of types. Bulatov instead makes the grouping symmetry a
    user choice (see §2.3).
- **Sub-cell** (Bulatov's term): if you ask for a stellation symmetry `H` that is a
  *subgroup* of the polyhedron's symmetry `G`, one `G`-orbit breaks into several
  `H`-orbits. Those pieces are sub-cells. The commonest case is `Ih → I` (drop the
  mirrors), which splits a chiral 120-cell orbit into two 60-cell mirror halves.
- **Layer** (both) / **shell** (Du Val): cells at the same "depth". Bulatov's formal
  definition: the layer number of a cell is the number of stellation planes a ray from the
  centre crosses before reaching a point inside it; layer 0 is the core. Webb's glossary
  gives the equivalent constructive definition: each layer is the minimal set of cells
  needed to completely cover the previous layer.
- **Support**: a cell is *supported* if every one of its bottom facets is covered by an
  adjacent cell below. A *fully supported* stellation is one where every included cell is
  supported — informally, a solid with no overhangs or voids; a ray from the centre
  crosses the surface exactly once.
- **Stellation diagram**: the 2D picture in the plane of one face, showing where all the
  other face planes cut it. The bounded areas are **elementary regions**. Each elementary
  region is the top face of one cell *and* the bottom face of another — which is exactly
  why clicking a diagram region is ambiguous and every program needs two different clicks.
- **Cell diagram** (Webb/Messer): a graph whose nodes are cell types, drawn in rows by
  layer, with an edge whenever two cell types share a face (i.e. the lower supports the
  upper). Webb credits the idea to **Peter Messer (1995)**, building on **G. S. Pawley
  (1975)**.

---

## 2. Vladimir Bulatov's own work

### 2.1 Who he is

Vladimir Bulatov is a mathematical artist and former physicist. At the time of the
stellation applet he was in the **Department of Physics, Oregon State University**,
Corvallis, "on leave from the Department of Theoretical Physics, St. Petersburg State
University" (his own footnote on the 2001 Bridges paper). Today bulatov.org is primarily
a sculpture-and-jewellery site ("Bulatov Abstract Creations", Corvallis, Oregon), with the
mathematics kept under a *Math Projects & Publications* section. His polyhedra collection
dates itself to 1996.

**Papers in the Bridges archive** (the annual mathematics-and-art conference), from
`archive.bridgesmathart.org`:

| Year | Title | Pages |
|---|---|---|
| 2001 | An Interactive Creation of Polyhedra Stellations with Various Symmetries | 201–212 |
| 2002 | About Enumeration of Isogonal Polyhedral Families (abstract) | 320 |
| 2009 | Using Polyhedral Stellations for Creation of Organic Geometric Sculptures | 193–198 |
| 2011 | Bending Hyperbolic Kaleidoscopes | 479–482 |
| 2013 | Bending Circle Limits | 167–174 |
| 2014 | Inversive Kaleidoscopes and their Visualization | 329–332 |
| 2018 | Horosphere, Cyclide and 3d Hyperbolic Tilings | 531–534 |

Only two of these are about stellation. The 2001 paper is the software paper; the 2009
one is the *sculpture* paper — it takes the first stellation of the icosahedron, re-reads
it as 20 intersecting hexagons rather than 20 pyramids on a core, cuts holes in each
hexagon, thickens the surface, and runs Catmull–Clark / Loop subdivision with crease edges
to get an organic metal sculpture (fabricated by selective laser sintering and direct
metal printing in bronze-infiltrated stainless steel). Its reference list cites exactly
two pieces of software: his own Stellations Applet and Webb's Great Stella. That is a
useful signal about who the two players were in 2009.

The same 2001 text was also published on the VisMath web journal
(`mi.sanu.ac.rs/vismath/bulatov/`). **UNCERTAIN:** the VisMath copy is dated 2000 there
and 2001 in the Bridges archive; treat "Bridges 2001, Wichita/Winfield, Kansas, pp.
201–212" as the citable version. (Bulatov's own 2009 reference list says "Winfield,
Kansas"; the 2001 Bridges conference is generally listed as Wichita/Southwestern College,
Winfield.)

### 2.2 The lineage of the software

1. **1996–1997 — static VRML galleries.** `bulatov.org/polyhedra/icosahedron/` shows the
   59 icosahedra as images and VRML, © 1996, with POV-Ray data credited to John Cranmer.
2. **1997–1998 — the first interactive stellation pages** (`bulatov.org/polyhedra/stellation/`,
   © 1997, VRML 2.0, tested against WorldView 2.0 and CosmoPlayer 2.0). *This is where the
   Cells table is born.* The page describes a column of red/blue buttons beside the model:
   red = cell visible, click to toggle; **"Every row of buttons corresponds to one layer of
   cells"**, and within a layer the cells are ordered by decreasing volume. Six polyhedra
   are offered, with cell counts running from 11 to 369 symmetric cells. So the
   layer-per-row grid predates the Java applet by ~3 years and predates Great Stella by ~4.
3. **2000–2001 — the Java Stellation Applet** (`bulatov.org/polyhedra/stellation_applet/`),
   © 2000, 2001. This is the version the Bridges paper documents.
4. **Later — a standalone desktop Java program.** The application this project resurrects
   is a descendant of the applet (its `.stel` sample files are stamped
   "exported from Stellation Program by Vladimir.Bulatov@gmail.com", and the symmetry line
   reads e.g. `symmetry "Ih / I"`). **UNCERTAIN:** I found no published paper, release
   note or dated announcement for this later standalone program — the 2001 applet is the
   last version Bulatov wrote about.

### 2.3 What the applet actually is

From Bulatov's own help page (`stellation_applet/stellation.html`, © 2000, 2001), the
applet is five frames in a browser, Java 1.1, tested on IE 5.0 and Netscape 4.7:

- **Control frame** — pick the polyhedron; pick the **symmetry group of the stellation
  from a drop-down, explicitly noting it need not equal the polyhedron's own symmetry**;
  press Start. Export to POV-Ray, DXF or VRML (in-browser this dumps to the Java console
  to be copy-pasted; run locally and it writes files).
- **Cells frame** — the table. Bulatov's description: it "displays the stellation cells
  for every layer"; each rectangle with a **bold** number is a complete stellation cell;
  when the chosen stellation symmetry is smaller, a complete cell is a union of
  **sub-cells, numbered in a smaller font**; cells and sub-cells of different symmetry are
  colour-coded. Below the grid is a **text field holding the stellation's notation**, with
  a Set button — so a stellation can be copied to the clipboard as a string and pasted back
  later.
- **Diagram frame** — the 2D stellation diagram with the facets of the currently selected
  cells. Top facets yellow, bottom facets red, "keep in mind that most facets are top for
  cells below and bottom for cells above". Right-click gives a popup of operations.
- **3D view frame** — trackball rotation; **Ctrl+click adds the cell adjacent to the
  clicked facet, Shift+click removes the clicked cell.**
- **Output frame** — per-layer counts of facets, elementary cells and symmetrical cells.

The Cells-frame mouse grammar is worth reproducing because it is the richest of any
program surveyed:

| Gesture | Effect |
|---|---|
| click a cell | toggle that cell |
| click a **layer number** | invert every cell in that layer |
| Shift + click layer number | select every cell in that layer |
| Shift + click a cell | select all cells that **support** that cell |
| Ctrl + click a cell | invert the selection of all its supporting cells |
| Shift + Ctrl + click a cell | clear the selection of all its supporting cells |

Bulatov's paper highlights the Shift-click case as the killer feature: one click on a top
cell can pull in the entire supporting cone. His example (Fig. 21–22 of the paper) is a
stellation of the strombic hexecontahedron in which a single mouse click brought in **73
stellation cells** and several hundred elementary cells.

Documented limitations, in his own words: some cells in the top few layers of the
disdyakis triacontahedron and the snub cube come out wrong. Downloads on the page are
`stellation_010914.zip` (the runnable jar, 14 Sep 2001) and `stellation_src_010907.zip`
(source, 7 Sep 2001); both still return HTTP 200 as of Aug 2026. The applet class is
`PVS.polyhedra.stellation.StellationApplet`.

**The applet no longer runs in a browser, and hasn't for a decade.** Chrome removed NPAPI
plugin support in version 45 (Sept 2015); the Applet API was deprecated in JDK 9 (2017),
the plug-in / Web Start / appletviewer were removed in JDK 11 (2018), and JEP 504 removed
the `java.applet` package entirely in JDK 26 (2026). Only the downloadable jar survives.

### 2.4 The mathematics the paper states (and the notation)

The 2001 paper is the closest thing to a specification of the Cells window:

- Definition of stellation used is deliberately **permissive**: *any* combination of
  elementary cells. He contrasts this with *The Fifty-Nine Icosahedra*, whose rules
  demand at least the rotational symmetry of the core.
- Orbit size must divide the group order. For `Ih` (order 120) he lists the possible
  complete-cell sizes as **120, 60, 30, 20, 12, 1**.
- Sub-cells come from a subgroup `H ≤ G`. His worked example: choosing central tetrahedral
  symmetry `Th` (the symmetry of a cube inscribed in the icosahedron) splits the 20-cell
  orbit of layer 4 into sub-cells of **8 and 12**. He warns that the 8-piece "is easy to
  mistake … for the octahedral symmetry Oh" but has no 4-fold axes.
- **Notation.** The paper writes cells as `layer(type)`, sub-cells as
  `H:layer(type[sub])`, and the fully supported closure of a cell as `S{...}`. Concrete
  examples in the paper: cell `0(0)` is the core, `1(0)` is layer 1, `4(0)` and `4(1)` are
  the two orbits of layer 4, `Th:4(0[0])` and `Th:4(0[1])` are the 8- and 12-piece
  sub-cells, and `S{I:16(2[1])}` is a supported stellation of the strombic hexecontahedron.
  This is recognisably the ancestor of the modern program's cells string, e.g.
  `cells "{0,1,2,3,4,5(1[1])}"`.
- He also names the historical thread that motivates sub-symmetry: Alan Holden (*Shapes,
  Space and Symmetry*, 1971) as the earliest author he knows of to consider stellations
  with symmetry lower than the core's; then George Hart's tetrahedral stellations (1996),
  George Olshevsky's "36 dodecahedra" (1996, private communication), Vincent Matsko (1997),
  and his own "270 Dodecahedra" (1997).
- Acknowledgements name Norman Johnson, George Olshevsky, George Hart, Vincent Matsko,
  Peter Messer and especially Magnus Wenninger — i.e. the applet was built in dialogue with
  essentially the whole polyhedron community of the late 1990s.

### 2.5 Cross-check: the icosahedron numbers in the brief are right

The tutorial's table (Ih symmetry, I stellation symmetry) is

```
layer 0: 1     layer 4: 20 + 60
layer 1: 20    layer 5: 12 + 120   (120 splits into 60 + 60)
layer 2: 30    layer 6: 30 + 60
layer 3: 60    layer 7: 60
```

Three independent sources agree:

1. **MathWorld** (*Icosahedron Stellations*) lists the icosahedron's cells as
   20+30+60+20+60+120+12+30+60+60 — the *same multiset* as the table above minus the core
   — and calls that 10 different shapes.
2. **Guy Inchbald** (steelpillow.com, *In Search of the Lost Icosahedra*) states that the
   face planes dissect space into **473 finite cells** in **12 shapes**, forming layers
   around the icosahedron as innermost cell, giving 2¹² − 1 = 4095 combinations. The
   table above sums to exactly 473 (1+20+30+60+80+132+90+60).
3. **Robert Webb's enumeration page** (results computed with Great Stella) gives, for the
   icosahedron: **8 layers, 11 cell types (10 reflexible + 1 chiral), max 3 cell types in
   any one layer, 18 fully supported stellations, 59 under Miller's rules.**

The three "cell type" counts (10 / 11 / 12) are not a contradiction — they are three
different conventions:

- **10** = non-core orbits under full `Ih` (MathWorld isn't counting the core).
- **11** = orbits under `Ih` including the core — exactly the 11 entries of the tutorial
  table (1+1+1+1+2+2+2+1). This is also Webb's count, since he lists the chiral pair once
  and tags it "chiral".
- **12** = orbits under the rotation group `I` including the core — the chiral 120 has
  split into 60+60. This is Inchbald's count, and it is the count the tutorial's program
  produces in `Ih / I` mode.

Webb's "max 3 cells per layer" is the same fact seen from the other side: his footnote
says a chiral pair counts as two, and layer 5 is 12 + 60L + 60R = 3. Likewise, Webb's
*mainline* stellations (add one whole layer at a time) number "eight in the case of the
icosahedron" — an independent confirmation of the 8-layer count. Du Val's classical shell
letters in *The Fifty-Nine Icosahedra* run A (the core) then b…h — also eight.

---

## 3. Robert Webb — Small Stella / Great Stella / Stella4D

### 3.1 The product

Robert Webb, of Melbourne, Australia. Three Windows products sharing one engine:

- **Stella 1.0, 20 August 2001** — first release (from Webb's own version history).
- **Stella 2.0, 12 September 2002**; the *Stella: Polyhedron Navigator* paper describes
  Great Stella 2.0 as of 2003.
- **Stella 4.0, 13 March 2007** — the release where **Stella4D** (four-dimensional
  polytopes) first appears alongside Small Stella and Great Stella.
- **Stella 5.4, 10 May 2014** — still the current version as of Aug 2026; the site's
  copyright line reads "© 2001-2026, Robert Webb".

The reference paper is **Webb, R., "Stella: Polyhedron Navigator", *Symmetry: Culture and
Science*, Vol. 11, Nos. 1–4, pp. 231–268, 2000**. Webb notes on his site that the journal
issue was actually released in 2003 but backdated to 2000. The full text is online at
software3d.com. **Note for anyone fetching it:** the live PHP page is currently truncated
after §3.2; a complete copy is in the Internet Archive
(`web.archive.org/web/20180710203623id_/https://www.software3d.com/PolyNav/PolyNavigator.php`).

### 3.2 How Stella lets you pick cells — four routes plus an escape hatch

From the Great Stella manual (§ *Stellated Polyhedra*) and §3.3–3.5 of the paper:

1. **Cell diagram view.** Shift+Left-click a node. Selected nodes get a white border.
   Webb's own manual: the cell diagram "is an abstract representation of the relationship
   between cells, and is usually not an intuitive way to create stellations."
   Construction (from §3.4 of the paper): nodes are cell types, drawn at a height given by
   their layer, core at the bottom; a line joins two cells that share a face; because each
   layer entirely covers the one below, edges only ever join consecutive layers. Because he
   groups cells by *rotational* symmetry, enantiomorphic pairs appear as **two nodes drawn
   side by side joined by a dashed line** — and he remarks that other authors usually draw
   such a pair as a single node, but he finds splitting them more useful. (That is Stella's
   nearest approach to Bulatov's sub-cell column, and it is hard-wired to the chiral case
   rather than to an arbitrary subgroup.)
2. **2D stellation diagram.** Shift+Left-click selects the cell *below* a region;
   Shift+Right-click selects the cell *above*. Regions are coloured by four states:
   accessible from above, accessible from below, internal, outside. Webb calls this "more
   intuitive than using the cell diagram."
3. **3D stellation diagram.** The same diagram pasted onto a face of the live 3D model, so
   you click regions in situ. Webb calls this "the most intuitive way to create your own
   stellations."
4. **Modifier combinations, available wherever a cell can be clicked:**
   - `Ctrl+Left-click` — select/deselect a cell **together with all its supporting cells,
     recursively down to the core**; when deselecting, the recursion stops at any cell still
     needed to support something else, "so you can deselect a whole peak without creating a
     hole right through to the centre".
   - `Ctrl+Right-click` — select/deselect a **whole layer**.
   - `Stellation → Fill All Inaccessible Cells` — fill hidden internal bubbles (which
     otherwise generate useless extra nets when printing).

   These are essentially the same three operations Bulatov binds to Shift/Ctrl on the Cells
   grid; the two programs converged on the same primitives independently.
5. **The escape hatch: don't select at all.** Choose a rule set from
   `Stellation → Stellation Criteria`, then walk the whole valid series with the Up/Down
   arrow keys — "hold the keys down to see all the different stellations racing past". Five
   criteria are supported, from loosest to tightest (paper §3.6):
   - **Miller's rules** (Coxeter et al. 1938) — 59 for the icosahedron. Webb notes you can
     literally press Up 59 times to see all of them.
   - **Fully supported** (Pawley's 1975 "non-reentrant", renamed by Messer) — 18 for the
     icosahedron.
   - **Mainline** — add one entire layer at a time; count = number of layers = 8 for the
     icosahedron.
   - **Primary** (Messer 1989) — faces are single "primary regions" bounded by lines lying
     in reflection planes; well defined only for reflexible isohedral cores; 7 for the
     icosahedron.
   - **Monoacral / "single peak"** (Messer, unpublished, credited in Webb's paper) — the
     minimal fully supported stellation containing a chosen seed cell; the count equals the
     number of cell types. This is *exactly* Bulatov's Shift-click-a-cell operation
     promoted to an enumeration criterion.

Sub-symmetry is supported: the toolbar carries drop-downs of every sub-symmetry group, and
picking one changes stellation, faceting, augmentation and colouring. Webb cites Ounsted's
tetrahedrally-symmetric dodecahedron stellation as the motivating example.
**UNCERTAIN:** I could not confirm from the documentation whether choosing a sub-symmetry
group visibly *splits nodes* in the cell diagram the way Bulatov's grid splits a cell into
sub-cells; the manual only says sub-symmetry "affects how stellation … operate[s]".

### 3.3 Scale, and why the choice of UI matters

Webb's enumeration page (results from Great Stella) makes the case for criteria-driven
browsing over hand-picking. Selected results:

- Icosahedron: 8 layers, 11 cell types, 18 fully supported, 59 by Miller's rules.
- Rhombic triacontahedron (dual of the icosidodecahedron): 13 layers, 29 cell types,
  **227** fully supported (matching Messer's 1995 published catalogue and Pawley's 1975
  paper title "The 227 Triacontahedra"), but **358,833,098** under Miller's rules.
  Webb notes John Gingrich had enumerated this by building a purpose-made circuit board,
  and that he and Gingrich agree the Stella figure is the correct one after a
  misinterpretation of Miller's fifth rule was resolved.
- Truncated dodecahedron: 1,141 fully supported vs 2,645,087,084,526 by Miller's rules.
- Pentagonal hexecontahedron: over 30 trillion fully supported, taking months to count.

With numbers like these, "pick cells by hand" and "step through a filtered series" are
answers to different questions. A cells table is a *design* tool; the arrow keys are a
*survey* tool.

Two side findings from Webb's research pages, useful for a tutorial's footnotes:
- **Unsupportable finite cells**: for the snub cube, snub dodecahedron and pentagonal
  hexecontahedron, some finite cells can never be fully supported by other *finite* cells —
  the final stellation is re-entrant. He believes this was previously unnoticed.
- **Miller's fifth rule** has at least three published interpretations (Gingrich's,
  Matsko's, Webb's); they agree for the icosahedron (all admit exactly one extra model) but
  diverge for more complex cores.

---

## 4. Older and adjacent software

### 4.1 The earliest program I could find: McKeown & Badler, 1980

**Kathleen R. McKeown and Norman I. Badler, "Creating polyhedral stellations", *ACM
SIGGRAPH Computer Graphics* Vol. 14, No. 3 (SIGGRAPH '80), University of Pennsylvania.**
A program that performs the stellation process on an input solid and renders the result on
a graphics display; the paper shows icosahedron and rhombic triacontahedron stellations.
**UNCERTAIN:** the ACM full text is paywalled/403 to automated fetch, so I could not verify
whether the user selected regions interactively or the program enumerated them — from the
abstract it reads as batch generation, not interactive picking.

Earlier still, and non-interactive: **A. C. Norman and A. Smith, "Computer Drawings of
Compounds of Star Polyhedra", *Mathematical Gazette* 57, pp. 303–306, 1973** (cited by
Webb) — computer *drawing*, not computer *design*.

### 4.2 Fortran Friends `!Stellate` (RISC OS)

A UK RISC OS user group (Dave Crennell is the name that recurs) sells four polyhedra
programs; the relevant one is **`!Stellate`, current version 2.23, 7 Feb 2016** — the
version numbering implies a long life before that. It does "interactive creation of uniform
polyhedra their stellations, duals and other polyhedra … using stellation diagrams and
stored inter-planar angles", ships >120 pre-stored models, and can save a Draw file of the
stellation diagram. Its explanatory page describes the workflow as **selecting areas of the
stellation diagram to form the faces of a new polyhedron** — i.e. route 1, pure 2D, no cell
list at all.

Its historical claim to fame: when Tarquin Publications reissued *The Fifty-Nine
Icosahedra* as a third edition in **January 1999**, Fortran Friends re-typeset it and
**redrew every diagram with `!Stellate`**; they still publish a running errata list of
plates that needed correcting (dates from 2000 to 2023). So a 2D-diagram-shading program
is literally responsible for the canonical modern printing of the canonical stellation
book.

**UNCERTAIN:** I could not pin down which individual wrote `!Stellate`.

### 4.3 "Jenkins"

This is a books-not-software thread. **Gerald Jenkins** (with Magdalen Bear / Anne Wild),
via **Tarquin Publications**, produced the cut-out-and-glue polyhedron model books —
including *The Sixth Stellation of the Icosahedron* (1985) and *Stellated Polyhedra* — and
Tarquin is the publisher of the 1999 *Fifty-Nine Icosahedra*. I found **no** Jenkins
stellation *program*. If your notes carry "Jenkins" as software prior art, it is most
likely a mis-attribution of the Tarquin/Fortran-Friends connection.

### 4.4 George Hart, *Virtual Polyhedra* (1996–2000)

Hart's *Virtual Polyhedra: The Encyclopedia of Polyhedra* (georgehart.com, © 1996 ff.) is
the reference web encyclopedia of the era. Its stellation coverage is a **static catalogue**:
prose pages plus numbered links to pre-computed VRML models — the 59 icosahedra in two
colour schemes, stellations of the rhombic triacontahedron, and so on. There is no
interactive cell selection whatsoever; you click a number, you get a model.

Relevant to the sub-symmetry story: Hart's *Tetrahedral Stellations of the Icosahedron*
(1996) presents "several thousand" possible forms of which he shows 32, numbered 1–32,
each a VRML link. He says he made them "with a general-purpose stellation program I have
written, which generates many kinds of stellations of all polyhedra" — **UNCERTAIN:** that
program was, as far as I can tell, never named or released. Bulatov cites these pages as
[5] in the 2001 paper.

### 4.5 Kaleido (Zvi Har'El) and Poly (Pedagoguery) — *not* stellation programs

Worth listing precisely because they are often name-checked together with the above.

- **Kaleido**, Zvi Har'El (Department of Mathematics, Technion, Haifa), 1993, C source,
  still online at `harel.org.il/zvi/kaleido/`. It computes the 80 uniform polyhedra and
  their duals from their kaleidoscopic (Wythoff) construction, per his paper "Uniform
  Solution for Uniform Polyhedra", *Geometriae Dedicata*, 1993. **It does not stellate.**
  Its role in this story is as a *source of input polyhedra*, and as the ancestor of
  Antiprism's bundled `kaleido`. (Roman Mäder ported the same solution to Mathematica in
  1993 with slightly different indexing.)
- **Poly**, Pedagoguery Software (peda.com), shareware for classic Mac and Windows: a
  polyhedron browser with 3D, Schlegel-diagram and net views, translated into a dozen
  languages. Platonic/Archimedean/Johnson/Catalan/prisms. **No stellation cells.**
- **Hedron**, Jim McNeill (orchidpalms.com) — a widely used VRML model builder for
  polyhedra, cited in Webb's paper reference list and used by Richard Klitzing for faceting
  studies. **UNCERTAIN:** it appears to be a construction/modelling tool (vertex labelling,
  wireframes, texturing) rather than a cell-selection stellation tool; I found no
  description of a stellation cell UI.

### 4.6 Antiprism `stellate` (Roger Kaufman / Adrian Rossiter) — the command-line answer

Antiprism is Adrian Rossiter's open-source polyhedron toolkit; the `stellate` program was
written by **Roger Kaufman** (docs page last modified 27 Mar 2019). It is the purest
example of "select regions of the 2D diagram", reduced to text:

```
stellate ico -f 0 -s I | antiview            # just show the diagram for face 0
off_trans -y D5 ico | stellate -f 0,18 -f 3,4,47 -s D5v | antiview
```

`-f <fnos>` takes a base-polyhedron face number followed by a comma-separated list of
**stellation-diagram face indices**; repeat `-f` for other base faces. `-s` sets the
symmetry subgroup in Schoenflies notation (here `D5v`), which is the same sub-symmetry idea
as Bulatov's Symmetry drop-down. Colouring can be driven "from stellation diagram" (`-F q`),
and `-O d` renders the diagram itself with used faces highlighted.

Trade-off in the clearest possible form: perfectly scriptable and reproducible, zero
discoverability. You cannot see the layer structure at all, and you must already know which
diagram region index you want.

### 4.7 Mathematica / Wolfram

- **Roman E. Maeder**, "Fifty-Nine Icosahedra", Wolfram Demonstrations Project. The code
  originates in his book *The Mathematica Programmer* (AP Professional, 1994). Interaction
  = pick one of the 59 from an index and rotate it. The "Maeder numbering" of the 59
  (ordered by increasing circumradius) is a separate contribution that shows up in later
  literature.
- **Michael Rogers** (Oxford College / Emory University), "Playing with Stellations of the
  Icosahedron", Wolfram Demonstrations Project; adapted from his own Mathematica code
  written for a talk at Colby College in **1993**. This one is explicitly about *cells and
  facets*: colour schemes that distinguish cells from facets, and cut-away segments along a
  vertex/edge/face axis so you can see inside. Its detail text explicitly frames the design
  question the tutorial cares about — whether a symmetric selection of cells "deserves to be
  called a stellation is, to some extent, a matter of taste" — and cites Inchbald's *In
  Search of the Lost Icosahedra* (*Mathematical Gazette* 86 (506), July 2002, pp. 208–215).

---

## 5. Modern web implementations

The web has been thin here for twenty years — Bulatov's applet was *the* web stellation
tool from 2000 until it stopped running, and nothing replaced it for a long time. Two
current things exist:

### 5.1 vZome "The 59 Icosahedra" — `vzome.com/app/59icosahedra/`

By **Scott Vorthmann** (author of vZome), announced around **October 2024**, built on the
`vzome-viewer` web component. Interaction: you **click or touch the shapes in the 3D view**
to toggle subsets of the stellation — route 2, and only route 2. It is explicitly inspired
by **Bob Hearn's physical magnetic model** of the 59 icosahedra, and it is a
guided-exploration piece rather than a general stellation engine (one polyhedron, the 59
known forms). Vorthmann presented "The Virtual Fifty-Nine Icosahedra" at Gathering for
Gardner 15 (February 2024).

### 5.2 `monman53/stellated-polyhedra-explorer` — the closest thing to a modern general tool

MIT-licensed, TypeScript + Vue 3 + Vite + raw WebGL 1 (no 3D library), live at
`monman53.github.io/stellated-polyhedra-explorer/`. **Caveat: the GitHub repo was created
2026-06-11 and last pushed 2026-06-15, with 0 stars — this is brand new and effectively
unknown; treat it as a data point, not an established tool.** What it does that is relevant:

- **Editable stellation diagram side by side with the 3D model** — click or *drag-paint*
  regions to add/remove cells. Painting (drag across many regions) is an interaction no
  desktop program offers.
- **All 59 as preset buttons**, using the Du Val region numbering from the Wikipedia list;
  you can drag across the preset strip to animate through the series (route 5, made tactile).
- **Chiral orbits selectable as left or right halves independently** — the sub-cell idea,
  but hard-coded to the four chiral icosahedral regions rather than derived from a symmetry
  subgroup.
- **Explode view** — facets separate along the 3D cells, "revealing how each stellation is
  layered out of shells". This is the layer concept expressed *spatially* instead of as a
  table, and it is the most interesting alternative to a Cells grid I found.
- Nine solids: icosahedron, dodecahedron, octahedron, cuboctahedron, icosidodecahedron,
  rhombic dodecahedron, rhombic triacontahedron, truncated icosahedron, truncated
  dodecahedron. Its README quotes its own computed figures — e.g. icosidodecahedron 463
  diagram cells in 76 symmetry types; rhombic triacontahedron 193 cells in 54 types;
  truncated icosahedron/dodecahedron 515 cells in 85 types each. (These are 2D
  diagram-region counts, not 3D cell counts — don't confuse them with the 473 figure.)

### 5.3 What is *not* a stellation tool on the web

`polyhedronisme` (Anselm Levskaya) does Conway operators, `KaleidoTile` (Jeff Weeks) does
kaleidoscopic tilings, `polyjs` (Matthew Arcus) animates polyhedra and compounds — none
select stellation cells. Great Stella has no web version.

---

## 6. So: is a layers × cells × sub-cells table unusual?

**Yes.** Of the eleven programs surveyed, exactly one family (Bulatov's) exposes the cell
structure as a table indexed by layer. Here is the whole landscape at a glance:

| Program | Year | Platform | Cell selection UI | Layers visible? | Sub-symmetry? |
|---|---|---|---|---|---|
| McKeown & Badler | 1980 | mainframe/graphics terminal | batch (UNCERTAIN) | – | – |
| Fortran Friends `!Stellate` | ≤1999–2016 | RISC OS | shade 2D diagram regions | no | UNCERTAIN |
| Hart, *Virtual Polyhedra* | 1996 | web (VRML) | none — numbered catalogue | no | yes, as pre-made sets |
| **Bulatov, VRML stellation pages** | **1997** | **web (VRML)** | **row of toggle buttons per layer** | **yes** | no |
| **Bulatov, Stellation Applet** | **2000–01** | **Java applet** | **layer × cell × sub-cell grid**, + 2D diagram, + 3D picking, + text notation | **yes, primary** | **yes, arbitrary subgroup** |
| Great Stella / Stella4D | 2001– | Windows | cell-diagram graph, 2D diagram, 3D diagram, criteria stepping | yes, as graph rows | yes |
| Antiprism `stellate` | ≤2019 | CLI | `-f` list of diagram face indices | no | yes (`-s`) |
| Maeder demo | 1994/2007 | Mathematica | index into the 59 | no | no |
| Rogers demo | 1993/2011 | Mathematica | colour-by-cell + cutaway (viewing, not building) | partly | no |
| vZome *59 Icosahedra* | 2024 | web | click 3D shapes | no | no |
| monman53 explorer | 2026 | web | paint 2D diagram + presets | via explode view | chiral halves only |

### Trade-offs, stated plainly (this is the part the tutorial should use)

**The 2D stellation diagram** (the most common choice)
- *For*: it is the artefact model-makers actually need — you print it and cut the pieces
  out. It is the historical language of the field (Wenninger, Coxeter et al.). It shows
  exactly which pieces of paper you'll be gluing.
- *Against*: every region is ambiguous (a top face of one cell, a bottom face of another),
  so you need two different clicks and a colour code just to disambiguate. Bulatov's warning
  is blunt: adding a facet may force adding or removing "a whole bunch of other facets" in
  ways that are not obvious. And a diagram tells you nothing about *depth* — you cannot see
  that a cell is in layer 6 unless you already know the diagram.

**Clicking the 3D model**
- *For*: maximal intuition; Webb calls the 3D-attached diagram "the most intuitive way".
  You are pointing at the thing you are making.
- *Against*: you can only reach what is visible. Cells buried under other cells are
  unreachable, and internal voids are invisible by definition (hence Stella's and Bulatov's
  "fill inaccessible cells" commands). No overview.

**The cell diagram (support graph)**
- *For*: it makes support relations — the thing that decides whether a stellation is
  *fully supported* — into visible edges. Miller's rules 4 and 5 are literally statements
  about connectivity of this graph, so the graph is the right picture for reasoning about
  criteria. It comes with pedigree: Messer 1995, after Pawley 1975.
- *Against*: Webb's own verdict, in his own manual — not an intuitive way to build. The
  layout gets unreadable fast (the rhombic triacontahedron already has 29 cell types over 13
  layers; the icosidodecahedron's dual family runs to hundreds).

**The layer × cell × sub-cell table (Bulatov)**
- *For*: it is the only view that shows the *entire* state space compactly and at constant
  visual cost per cell — 473 cells collapse to 11 boxes. Rows give you depth for free, so
  "add the next shell" is one click on a row number. It is the only place the **sub-cell
  decomposition under a chosen symmetry subgroup** can be displayed at all — that is the
  feature Bulatov's whole 2001 paper exists to justify, and no other program shows it. It
  supports a text serialisation trivially (`{0,1,2,3,4,5(1[1])}`), which is how you
  save/share a stellation. And support-closure operations (Shift/Ctrl-click) have somewhere
  natural to live.
- *Against*: it is the most abstract of the four. A box labelled "60" is not a picture of
  anything; you need the 3D view and the diagram beside it to know what you just turned on
  (which is precisely why the applet has five frames, not one). It also discards the support
  edges that the cell diagram makes explicit — you can *invoke* support closure but you
  cannot *see* the support structure.

**Criteria-stepping (no selection at all)**
- *For*: the only tractable way to meet the classical sets — the 59, the 18 fully
  supported, the 7 primary. With trillions of combinations, browsing beats designing.
- *Against*: you can only find what the rule set admits. Bulatov's entire contribution is
  the shapes that Miller's rules *exclude* — the sub-symmetric ones. A stepper cannot get
  you there.

**Practical conclusion for the tutorial:** the Cells table is not a quirky alternative to
the stellation diagram — it is the *complement* of it, and it is the only widget in the
history of this software genre that can express "this orbit of 120 cells has split into a
left-handed 60 and a right-handed 60 because you asked for rotation-only symmetry". That is
worth saying out loud, because a reader arriving from Great Stella will be looking for a
cell diagram and won't find one.

---

## 7. Open questions / things I could not confirm

- **UNCERTAIN:** No published description, release note or date for Bulatov's later
  *standalone* Stellation Program (the one being resurrected). The 2001 applet is the last
  documented version.
- **UNCERTAIN:** McKeown & Badler (1980) — whether their program had any interactive
  region/cell selection. ACM full text is 403 to automated fetch.
- **UNCERTAIN:** Author of Fortran Friends' `!Stellate`.
- **UNCERTAIN:** Whether Great Stella's cell diagram visually splits nodes when a
  sub-symmetry group is chosen (it definitely splits *chiral* pairs by default).
- **UNCERTAIN:** Whether Jim McNeill's *Hedron* has any stellation-cell interface at all.
- **UNCERTAIN:** Whether George Hart's unnamed general-purpose stellation program was ever
  released or described.
- **Minor source disagreement:** Fleurent's "Symmetry and Polyhedral Stellation" is cited
  by Webb as "Ia & Ib", *Computers and Mathematics with Applications* 17(1–3), pp. 167–193,
  1989; ScienceDirect indexes part Ia alone at pp. 167–175, with a separate Part II by
  Messer & Wenninger at pp. 195–201. Webb's page range covers Ia+Ib.
- **Minor source disagreement:** "cell shapes" of the icosahedron counted as 10 (MathWorld),
  11 (Webb) or 12 (Inchbald) — resolved in §2.5; all three are the same structure under
  different conventions.
- The monman53 web explorer is days-to-weeks old with no community uptake; do not present
  it as an established tool.

---

## 8. Sources

**Bulatov**
- V. Bulatov, "An Interactive Creation of Polyhedra Stellations with Various Symmetries",
  *Bridges 2001*, pp. 201–212. https://archive.bridgesmathart.org/2001/bridges2001-201.pdf
- Same text on VisMath: https://www.mi.sanu.ac.rs/vismath/bulatov/index.html
- Polyhedra Stellations Applet (help page, © 2000, 2001):
  http://bulatov.org/polyhedra/stellation_applet/stellation.html
- Applet downloads: `stellation_010914.zip`, `stellation_src_010907.zip` (same directory)
- Polyhedra Stellation VRML pages, © 1997: http://bulatov.org/polyhedra/stellation/
- Stellations of icosahedron, © 1996: https://bulatov.org/polyhedra/icosahedron/
- Polyhedra collection index: http://bulatov.org/polyhedra/
- V. Bulatov, "Using Polyhedral Stellations for Creation of Organic Geometric Sculptures",
  *Bridges 2009*, pp. 193–198. https://archive.bridgesmathart.org/2009/bridges2009-193.pdf
- Bridges author search: https://archive.bridgesmathart.org/search.py?search=Bulatov
- Math projects & publications: http://bulatov.org/math/index.html

**Webb / Stella**
- R. Webb, "Stella: Polyhedron Navigator", *Symmetry: Culture and Science* 11(1–4),
  pp. 231–268, 2000 (issued 2003).
  Live (currently truncated): https://www.software3d.com/PolyNav/PolyNavigator.php
  Complete archived copy:
  https://web.archive.org/web/20180710203623id_/https://www.software3d.com/PolyNav/PolyNavigator.php
- Great Stella manual: https://www.software3d.com/StellaManual.php?prod=Great
- Stella's Polyhedral Glossary: https://www.software3d.com/Glossary.php
- Enumeration of Stellations: https://www.software3d.com/Enumerate.php
- Unsupportable Finite Cells: https://www.software3d.com/Unsupported.php
- Miller's Fifth Rule: https://www.software3d.com/Millers5th.php
- Version history: https://www.software3d.com/History.php and .../HistoryV3.php (Stella 1.0,
  20 Aug 2001), .../HistoryV4.php (Stella 4.0 / Stella4D, 13 Mar 2007)
- Product page: https://www.software3d.com/Stella.php
- Wikipedia, "Stella (software)": https://en.wikipedia.org/wiki/Stella_(software)

**Other software**
- K. R. McKeown, N. I. Badler, "Creating polyhedral stellations", *ACM SIGGRAPH Computer
  Graphics* 14(3), 1980. https://doi.org/10.1145/965105.807463
- Antiprism `stellate` (Roger Kaufman): https://www.antiprism.com/programs/stellate.html
- Fortran Friends polyhedra products (incl. `!Stellate` v2.23):
  https://fortran.orpheusweb.co.uk/Poly/prodp.htm
- Fortran Friends, The 59 Icosahedra / Tarquin 3rd edition + errata:
  https://fortran.orpheusweb.co.uk/Poly/59icos.htm
- G. Hart, *Virtual Polyhedra*: https://georgehart.com/virtual-polyhedra/vp.html ,
  .../stellations-info.html , .../stellations-icosahedron-info.html ,
  .../stellations-icosahedron-tetrahedral.html
- Z. Har'El, Kaleido: http://harel.org.il/zvi/kaleido/ ; "Uniform Solution for Uniform
  Polyhedra", *Geometriae Dedicata*, 1993: http://harel.org.il/zvi/docs/uniform.pdf
- Pedagoguery Software, Poly: http://www.peda.com/poly/
- J. McNeill, polyhedra site: https://www.orchidpalms.com/polyhedra/
- Xah Lee's polyhedron software list: http://xahlee.info/math_software/polytopes.html
- M. Starck, polyhedra-world software note: http://www.polyhedra-world.nc/poly_news_.htm

**Web implementations**
- vZome, The 59 Icosahedra: https://www.vzome.com/app/59icosahedra/ ; docs:
  https://www.vzome.com/docs/online.html ; announcement:
  https://mathstodon.xyz/@robinhouston/113368481741273225 ; G4G15 talk:
  https://www.youtube.com/watch?v=NP4PN1tgGvU
- monman53, Stellated Polyhedra Explorer:
  https://github.com/monman53/stellated-polyhedra-explorer (created 2026-06-11, MIT),
  live: https://monman53.github.io/stellated-polyhedra-explorer/
- Wolfram Demonstrations: "Fifty-Nine Icosahedra" (R. E. Maeder),
  "Playing with Stellations of the Icosahedron" (M. Rogers)

**Mathematics used for cross-checking**
- MathWorld, "Icosahedron Stellations": https://mathworld.wolfram.com/IcosahedronStellations.html
- G. Inchbald, "In Search of the Lost Icosahedra":
  https://www.steelpillow.com/polyhedra/icosa/searchlost/searchlost.html (473 finite cells,
  12 shapes)
- G. Inchbald, "Stellating and Facetting — a Brief History":
  https://www.steelpillow.com/polyhedra/StelFacet/history.html
- Wikipedia, "The Fifty-Nine Icosahedra" (Du Val's A/b…h shell notation):
  https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra
- P. W. Messer, "Stellations of the Rhombic Triacontahedron and Beyond", *Structural
  Topology* 21, pp. 25–46, 1995: https://upcommons.upc.edu/handle/2099/1097
- G. S. Pawley, "The 227 Triacontahedra", *Geometriae Dedicata* 4, pp. 221–232, 1975
- G. M. Fleurent, "Symmetry and Polyhedral Stellation—Ia", *Computers Math. Applic.*
  17(1–3), 1989: https://www.sciencedirect.com/science/article/pii/0898122189901570

**Java applet obsolescence**
- JEP 398 (deprecate Applet API, JDK 17): https://openjdk.org/jeps/398
- JEP 504 (remove Applet API, JDK 26): https://openjdk.org/jeps/504
- "So Long and Thanks for All the Applets", inside.java, 3 Dec 2025:
  https://inside.java/2025/12/03/applet-removal/
