# R6 — Symmetry and Chirality: why stellation cells come in orbits, and why orbits sometimes split

Research note for the "Cells" tutorial. Focus: the group theory that makes the
Cells table look the way it does — why cells are grouped at all, why the grouping
changes when you switch the stellation symmetry from `Ih` to `I`, and what the
resulting "sub-cells" physically are.

Written for a reader who knows what a polyhedron is but has never taken a group
theory course. Jargon is defined at first use.

---

## 0. The one-paragraph answer

The face planes of a polyhedron chop space into hundreds of little solid pieces
(cells). Individually they are useless — a stellation built from an arbitrary
handful of them would be a lopsided blob. What makes a stellation *a stellation*
is that it has the same symmetry as the polyhedron you started from. Symmetry is
an all-or-nothing constraint: if a symmetry operation of the solid maps cell X
onto cell Y, then any symmetric stellation containing X must also contain Y. So
the cells clump into indivisible bundles — the **orbits** — and a stellation is a
*choice of bundles*, not a choice of cells. The program's Cells table is a list of
those bundles. When you loosen the required symmetry from the full group `Ih`
(120 operations, including mirrors) to the rotations-only group `I` (60
operations), some bundles that were welded together only by a mirror come apart
into two halves that are mirror images of each other. Those halves are the
**sub-cells**, and picking one without the other is exactly what makes a
stellation *chiral* (handed).

---

## 1. Symmetry groups: the vocabulary

**Symmetry operation.** A rigid motion of space that leaves an object looking
exactly as it did. Two kinds:

- **Proper** (a.k.a. *direct*, *orientation-preserving*): rotations. You could
  physically perform them on a real cardboard model without taking it apart.
- **Improper** (*indirect*, *orientation-reversing*): reflections in a mirror
  plane, the central inversion `i` (send every point **p** to **−p**), and
  *rotoreflections* `Sn` (rotate by 360°/n, then reflect in the plane
  perpendicular to that axis). These turn a left hand into a right hand.

**Symmetry group.** The set of all symmetry operations of an object, which is
closed under composition — do two of them in a row and you get a third one in the
set. The number of operations is the group's **order**.

**Rotation subgroup.** Take a symmetry group `G` and keep only its proper
operations. That subset is itself a group, written `G⁺` or `G ∩ SO(3)`. If `G`
contains any improper operation at all, then exactly half of `G` is proper —
so `G⁺` always has **index 2** in `G` (index = order of the big group ÷ order of
the subgroup). This "index 2" fact is the engine behind everything in §5.

**Chiral / achiral.** An object is **chiral** (Greek *cheir*, hand) if its mirror
image cannot be brought into coincidence with it by rotation alone. The term and
that definition are Lord Kelvin's. He coined it in a footnote to the Second Robert
Boyle Lecture, delivered to the Oxford University Junior Scientific Club on
16 May 1893 and **first published in 1894** as *The Molecular Tactics of a Crystal*
(Clarendon Press); the lecture was later reprinted in the appendix to the
*Baltimore Lectures*, 1904. (Citing only "*Baltimore Lectures*, 1904" for the
coinage, as an earlier draft of this note did, skips the actual first publication.)
The two mirror-image versions of a
chiral object are called **enantiomorphs** (chemists say *enantiomers* for
molecules). A chiral object's symmetry group contains only rotations; an object
whose symmetry group contains any improper operation is **achiral**.

---

## 2. The two icosahedral groups: `Ih` and `I`

The regular icosahedron and the regular dodecahedron have the same symmetry
group, because they are duals.

### `I` — the chiral (rotational) icosahedral group, order 60

Its 60 operations are:

| operation | axes | count |
|---|---|---|
| identity | — | 1 |
| 5-fold rotations (72°, 144°, 216°, 288°) | 6 axes through opposite vertices of the icosahedron | 6 × 4 = 24 |
| 3-fold rotations (120°, 240°) | 10 axes through opposite face centres | 10 × 2 = 20 |
| 2-fold rotations (180°) | 15 axes through opposite edge midpoints | 15 × 1 = 15 |
| | | **60** |

As an abstract group, `I ≅ A₅`, the alternating group on 5 objects (the even
permutations of five things). The "five things" are geometrically real: the five
cubes inscribed in a dodecahedron, or the five tetrahedra of §6.

`A₅` is famous for being the smallest **simple** non-abelian group — it has no
nontrivial normal subgroups. That is the group-theory fact behind the
unsolvability of the general quintic.

### `Ih` — the full icosahedral group, order 120

`Ih` is `I` plus 60 improper operations: the central inversion `i`, 15 mirror
planes, 24 `S10` rotoreflections (about the six 5-fold axes) and 20 `S6`
rotoreflections (about the ten 3-fold axes). 1 + 15 + 24 + 20 = 60. ✔

Because the icosahedron *is* centrally symmetric, `Ih = I × {1, i}`, i.e.
**`Ih ≅ A₅ × C₂`** where `C₂` is the two-element group.

> **Precision point worth putting in the tutorial.** `Ih` has order 120 and so
> does the symmetric group `S₅`, and both are built out of `A₅` — but they are
> **not** isomorphic. `Ih` is a *direct* product `A₅ × C₂` (its centre contains
> the inversion), whereas `S₅` is a non-split-in-that-way extension with trivial
> centre. Confusing them is a common slip.
> Sources: [nLab, *icosahedral group*](https://ncatlab.org/nlab/show/icosahedral+group);
> [Wikipedia, *Icosahedral symmetry*](https://en.wikipedia.org/wiki/Icosahedral_symmetry).

### Why the choice matters here

`I` is a subgroup of `Ih` of index 2 (120 / 60 = 2). Every object with `Ih`
symmetry also has `I` symmetry, but not conversely. So:

- Demanding **`Ih` symmetry** of a stellation is the *stricter* requirement. Such
  a stellation is achiral — it is its own mirror image.
- Demanding only **`I` symmetry** is *looser*. It permits everything `Ih`
  permits, plus new, chiral stellations that come in left/right pairs.

The program's "stellation symmetry" setting is exactly this dial.

---

## 3. Group actions and orbits, in plain terms

A group **acts on** a set when each group element shuffles the set. Here the set
is the collection of primitive cells cut out by the face planes, and the group is
the polyhedron's symmetry group: every symmetry operation moves the whole
arrangement of planes onto itself, hence permutes the cells.

**Orbit.** Pick a cell `x`. Its **orbit** is the set of all cells you can reach
from `x` by applying operations of the group:

```
Orbit(x) = { g·x : g ∈ G }
```

Informally: *"the cell `x` together with all its copies."* Orbits partition the
cells — every cell is in exactly one orbit, and two cells are in the same orbit
precisely when some symmetry of the solid carries one to the other. Cells in one
orbit are necessarily congruent (same size and shape, possibly mirrored).

**Stabiliser.** The **stabiliser** of `x` is the set of group elements that leave
`x` exactly where it is (mapping the cell onto itself, not necessarily pointwise):

```
Stab(x) = { g ∈ G : g·x = x }
```

Crystallographers call this the cell's **site symmetry** — the little symmetry
group the cell has *in its own right, as seen by the ambient group*.

**Orbit–Stabiliser Theorem.** For a finite group,

```
|Orbit(x)| × |Stab(x)| = |G|
```

That is: orbit size = index of the stabiliser. Consequence — **every orbit size
divides the order of the group.** Under `Ih` (order 120), an orbit size must
therefore be one of the sixteen divisors of 120: 120, 60, 40, 30, 24, 20, 15, 12,
10, 8, 6, 5, 4, 3, 2, 1.

Divisibility is only a *necessary* condition, though: the orbit size is the index
of an actual subgroup, and `Ih ≅ A₅ × C₂` has no subgroup of order 15, 30 or 40
(its only normal subgroups have orders 1, 2, 60, 120, which rules out any subgroup
of index 3, and `A₅` has no element of order 15). So the sizes **8, 4 and 3 cannot
occur** for `Ih`. All the others do have realising subgroups — e.g. 15 ↔ `D2h`
(order 8), 5 ↔ `Th` (order 24), 6 ↔ `D5d` (order 20), 2 ↔ `I` (order 60).

(Standard references: any algebra text; e.g. [T. Gowers, "Group actions II: the
orbit-stabilizer theorem"](https://gowers.wordpress.com/2011/11/09/group-actions-ii-the-orbit-stabilizer-theorem/),
2011.)

---

## 4. Reading the program's icosahedron numbers straight off the theorem

This is the payoff, and it is worth putting in the tutorial verbatim, because
every number the program prints is *forced* by orbit–stabiliser.

The program reports, for the icosahedron under `Ih` with stellation symmetry `I`,
8 layers with these primitive-cell counts:

| layer | counts | stabiliser in `Ih` (= 120 ÷ count) | what that stabiliser is |
|---|---|---|---|
| 0 | 1 | order 120 | all of `Ih` — the core solid itself |
| 1 | 20 | order 6 | `C3v`: a 3-fold axis + 3 mirrors (one cell per face direction) |
| 2 | 30 | order 4 | `C2v`: a 2-fold axis + 2 mirrors (one per edge direction) |
| 3 | 60 | order 2 | `Cs`: a single mirror |
| 4 | 20 + 60 | order 6, order 2 | `C3v`, `Cs` |
| 5 | 12 + 120 | order 10, order 1 | `C5v` (5-fold axis + 5 mirrors, one cell per vertex direction); and `C1` = **no symmetry at all** |
| 6 | 30 + 60 | order 4, order 2 | `C2v`, `Cs` |
| 7 | 60 | order 2 | `Cs` |

Total primitive cells = 1 + 20 + 30 + 60 + 20 + 60 + 12 + 120 + 30 + 60 + 60 =
**473** (472 outside the core).

This matches the literature. MathWorld, citing Wenninger, gives the non-core cell
count as 20 + 30 + 60 + 20 + 60 + 120 + 12 + 30 + 60 + 60 — ten shapes, 472 cells
([MathWorld, *Icosahedron Stellations*](https://mathworld.wolfram.com/IcosahedronStellations.html),
citing M. J. Wenninger, *Polyhedron Models*, Cambridge University Press, p. 41 of
the 1989 printing). Verified against MathWorld directly: that string of ten counts
is quoted exactly. The multiset is identical to the program's; only the ordering
inside layer 5 differs (the literature lists 120 then 12; the program lists 12
then 120). Ordering inside a layer is a presentation choice, not a mathematical
one.

The eight layers are exactly Du Val's eight shells **a, b, c, d, e, f, g, h** (see
§8), with `e`, `f`, `g` each splitting into two shapes.

**Note the beautiful bit.** The only orbit with a *trivial* stabiliser is the
120-cell orbit in layer 5. Section 5 shows that this is precisely why it — and
only it — splits when you switch to `I`.

---

## 5. Why an `Ih` orbit can split into two `I` orbits

Let `G = Ih` (order 120) and `H = I` (order 60), so `H` has index 2 in `G`.
Take a `G`-orbit `O` containing a cell `x`.

The `H`-orbit of `x` sits inside `O`. Two cases, and only two:

- **Case A — the orbit does not split.** `H·x = O`. The 60 rotations alone
  already reach every cell in the orbit.
- **Case B — the orbit splits into exactly two equal halves.** `O` breaks into
  `H·x` and `H·(σ·x)` for any improper `σ ∈ G \ H`, each of size `|O|/2`.

**The criterion.** Write `Gx = Stab_G(x)` and `Hx = Gx ∩ H`. Then

> `O` splits ⟺ `Gx ⊆ H`, i.e. **the cell's own stabiliser consists of rotations only** —
> the cell is not held in place by any mirror or other improper operation.

*Proof sketch.* `|O| = |G|/|Gx| = 120/|Gx|` and `|H·x| = |H|/|Hx| = 60/|Hx|`.
If `Gx ⊆ H` then `Hx = Gx`, so `|H·x| = 60/|Gx| = |O|/2` → two halves.
If `Gx ⊄ H` then `Gx` contains an improper element, so `Hx` has index 2 in `Gx`,
giving `|H·x| = 60/(|Gx|/2) = 120/|Gx| = |O|` → no split. ∎

**Applied to the icosahedron table above:**

- Layers 1, 2, 4(20), 5(12), 6(30): stabilisers `C3v`, `C2v`, `C5v` all contain
  mirrors → **no split**. (Under `I` the stabiliser shrinks to `C3`, `C2`, `C5`
  and the orbit size stays 20, 30, 12 — check: 60/3 = 20 ✔, 60/2 = 30 ✔,
  60/5 = 12 ✔.)
- Layers 3, 4(60), 6(60), 7: stabiliser has order 2. If that element were a
  *rotation*, the orbit would split into 30 + 30. The program reports it does
  not, so the order-2 stabiliser must be a **mirror** (`Cs`) — geometrically,
  these cells straddle one of the 15 mirror planes and are themselves
  mirror-symmetric. **No split.**
- Layer 5, the 120-cell orbit: stabiliser is trivial (`C1`), which is trivially
  contained in `I`. **Splits into 60 + 60.** These cells have no symmetry of
  their own; each is a scalene, handed little solid, and the 120 of them are 60
  right-handed and 60 left-handed copies.

So exactly one orbit in the icosahedron's cell structure is chiral, and the
program's "the 120 splits into two chiral halves of 60" is not an implementation
quirk — it is the orbit–stabiliser theorem.

### What the two halves *are*, physically

The two `I`-orbits are **enantiomorphs**: reflect one and you get the other, but
no rotation carries one to the other. Build a stellation from the 60 right-handed
sub-cells and you get a solid that spirals one way; build it from the 60
left-handed ones and you get its mirror image. Both have `I` symmetry (order 60);
neither has `Ih`. Include **both** halves and you are back to a single `Ih`-symmetric
solid.

### The general case (important, because the program offers many groups)

The clean "splits into two equal halves or not at all" dichotomy is special to
**index 2**. For a general subgroup `H ≤ G`, a `G`-orbit decomposes into `H`-orbits
indexed by the double cosets `H \ G / Gx`, and the pieces need **not** be equal in
size and need not number two. Two constraints survive: every piece has size
dividing `|H|`, and the pieces sum to `|O|`.

*Worked example (checked by hand).* Take `G = I` (order 60) and `H = T` (order 12),
index 5. Layer 1's orbit of 20 cells has one cell per face direction of the
icosahedron, i.e. one per end of each of the 10 three-fold axes. `T` contains only
**4** of those 10 axes, so 8 of the 20 directions keep a `C3` stabiliser inside `T`
and 12 lose it. Orbit sizes are `12/3 = 4` for the first group and `12/1 = 12` for
the second, and the 8 split as the tetrahedron's 4 vertex directions plus its 4
face-centre directions. The 20-orbit therefore breaks into **4 + 4 + 12** — three
pieces, unequal.

(A caution the other way: when `H` is *normal* in `G`, unequal pieces are
impossible. `G` then permutes the `H`-orbits inside one `G`-orbit transitively, so
they are all the same size and their number divides `[G:H]`. `T ◁ Oh` and `I ◁ Ih`
are both normal, so e.g. a 24-cell `Oh`-orbit can only go to 12 + 12 or
6 + 6 + 6 + 6 under `T` — never to anything with pieces of unequal size, and never
to a piece of size 8, since 8 ∤ 12. An earlier draft of this note claimed
"8 + 8 + 8 or 12 + 4 + 8"; that is impossible on both counts.)

So in the program's UI, "sub-cells" should be described as *the pieces an orbit
breaks into under the chosen stellation symmetry* — a chiral mirror pair is the commonest and
most vivid case (`Ih → I`, `Oh → O`, `Td → T`, `Dnh → Dn`, `Cnv → Cn`), not the
only one.

---

## 6. The classic example: five tetrahedra vs. ten tetrahedra

This is the textbook illustration of everything above, and both objects are
themselves stellations of the icosahedron — so it is a perfect tutorial example.

**Compound of five tetrahedra.** Five regular tetrahedra inscribed in a
dodecahedron, one per "cube" of the five-cube compound. First described by Edmund
Hess in 1876. Its symmetry group is the **chiral icosahedral group `I`, order
60** — the compound possesses none of the 60 improper operations of `Ih`. Coxeter
symbol `{5,3}[5{3,3}]{3,5}`; indices UC5, Wenninger W24; it is a stellation of the
icosahedron. There are **two** of them — the "left" and "right" compounds — and no
rotation carries one to the other. It is one of the five *regular* compounds.
Curious extra: reciprocating it does not give it back — **its dual is its
enantiomorph**, the *other* handedness. (Careful with the phrasing here: it is not
self-dual, and "its dual is its own enantiomorph" garbles the point.)
([Wikipedia, *Compound of five tetrahedra*](https://en.wikipedia.org/wiki/Compound_of_five_tetrahedra))

**Compound of ten tetrahedra.** Take both enantiomorphs at once. The result has
the **full icosahedral group `Ih`, order 120** — it *is* its own mirror image.
Coxeter symbol `2{5,3}[10{3,3}]2{3,5}`; indices UC6, W25; also described by Hess
in 1876; also a stellation of the icosahedron.
([Wikipedia, *Compound of ten tetrahedra*](https://en.wikipedia.org/wiki/Compound_of_ten_tetrahedra))

Mapped onto the cell language — and here the Du Val symbols pin it down exactly.
In the Crennell-numbered table, stellation **22 is `Ef₁`** (the compound of ten
tetrahedra) and stellation **47 is `E`f₁** — the same cell set except that only one
handedness of the `f₁` shell is taken (the compound of five tetrahedra,
right-handed; its mirror image is the left-handed one).

> Both compounds contain **every** cell out to shell `e`; they differ *only* in the
> `f₁` shell. The ten-tetrahedron compound takes the whole `f₁` `Ih`-orbit; each
> five-tetrahedron compound takes one of its two `I` sub-orbits. Choosing a
> sub-cell instead of the parent cell is *literally* the difference between the two
> figures.

(Do **not** say "the ten-tetrahedron compound is a whole `Ih` orbit" — an earlier
draft of this note did. It is a union of many orbits, `a+b+c+d+e₁+e₂+f₁`; only the
outermost of those orbits is the one that splits.)

For contrast, the **compound of five octahedra** (Hess 1876; W23, UC17; the second
stellation of the icosahedron, Du Val symbol **`C` = `a+b+c`**) has full `Ih`
symmetry, order 120, and is *not* chiral — so it corresponds to whole orbits with
mirror-containing stabilisers, no sub-cell choice involved.
([Wikipedia, *Compound of five octahedra*](https://en.wikipedia.org/wiki/Compound_of_five_octahedra);
[Wikipedia, *The Fifty-Nine Icosahedra*](https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra), stellation table)

---

## 7. Why a stellation must be built from whole orbits

This is the reason the program groups cells at all. Three ways to say it, pick
whichever the tutorial voice prefers.

**The direct argument.** Let `S` be a set of cells and let `P(S)` be the solid you
get by gluing them. Let `g` be a symmetry operation. Since `g` permutes cells,
`g(P(S)) = P(g(S))`. So

> `P(S)` is invariant under `g` ⟺ `g(S) = S`, i.e. `S` is closed under `g`.

Demanding that `P(S)` have symmetry group containing `G` therefore means `S` is
closed under every element of `G` — and a subset closed under a group action is
exactly **a union of orbits**. Hence: *symmetric stellation ⟺ union of whole
orbits*. Nothing else is possible.

**The "if you include one you must include all" argument.** Suppose you put cell
`x` in and leave out `y = g·x`. Then applying `g` to the finished solid moves a
solid piece onto an empty piece: the solid changes. So `g` was not a symmetry
after all. Symmetry forces you to take all of `Orbit(x)` or none of it.

**The counting consequence.** The number of `G`-symmetric stellations of a given
core is `2^(number of orbits)` before you impose any further aesthetic rules
(minus the empty choice). This is why the program's Cells table has ~11 rows for
the icosahedron rather than 473: the choice space is over *orbits*, and the orbit
count is what governs the combinatorics. Relaxing `Ih → I` raises the number of
selectable units (here from 11 to 12, since one orbit becomes two), so the number
of raw candidate stellations doubles — and the extra ones are all chiral.

Great Stella, Robert Webb's polyhedron program, works from the same rule, and uses
it to justify treating a whole congruence class of cells as a single selectable
unit: because the finished figure is expected to retain the core's rotational
symmetry, a cell type is all-in or all-out.
([Stella's Polyhedral Glossary, software3d.com](https://www.software3d.com/Glossary.php) —
UNCERTAIN: the site returns HTTP 403 to programmatic fetching, so this is
reconstructed from search-engine snippets rather than read in place. The sentiment
is confirmed by two independent snippet sets, but **do not quote it** — the wording
above is ours, not Webb's.)

Great Stella also implements the same sub-symmetry dial: once you select a
sub-symmetry group of the model's symmetry group, stellation, faceting and
augmentation all operate with respect to that group, and sub-symmetric (including
chiral) stellations become available.

---

## 8. Where this sits in the historical literature

**Miller's rules and the 59 icosahedra.** *The Fifty-Nine Icosahedra* by
H. S. M. Coxeter, P. Du Val, H. T. Flather and J. F. Petrie, University of Toronto
Press, **1938**; 2nd edition Springer-Verlag 1982; 3rd edition Tarquin 1999 with
new material and photographs by Kate and David Crennell. Flather's contribution
was a set of card models of all 59, kept in the Cambridge mathematics library;
Petrie drew the figures. The enumeration follows five criteria proposed by
J. C. P. Miller for which stellations count as "properly significant and distinct".
([Wikipedia, *The Fifty-Nine Icosahedra*](https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra))

Two of Miller's rules bear directly on this note:

- **Rule (iii)**, verbatim: *"The parts included in any one plane must have trigonal
  symmetry, without or with reflection. This secures icosahedral symmetry for the
  whole solid."* The subgroup of `Ih` that maps one face plane to itself has order
  6 (120 ÷ 20 face planes) and acts on that plane as the 2D group `3m` (`C3v`).
  Rule (iii) allows either the whole order-6 group (→ the solid gets full `Ih`)
  **or** just the 3-fold rotation part (→ the solid gets only `I`). *That single
  "without or with reflection" clause is exactly the `Ih` vs `I` dial the program
  exposes.*
- **Rule (v)**, verbatim: *"We exclude from consideration cases where the parts can
  be divided into two sets, each giving a solid with as much symmetry as the whole
  figure. But we allow the combination of an enantiomorphous pair having no common
  part (which actually occurs in just one case)."* That parenthetical is worth
  keeping: the one case is the compound of ten tetrahedra (`Ef₁`), which the
  exemption lets stay on the list of 59 despite being visibly two
  five-tetrahedron compounds.

Of the 59, **32 are reflexible** (full `Ih`) and **27 are chiral** (`I` only, with
only the right-handed representative listed). Counting both handednesses of the
chiral ones gives 32 + 54 = 86 physically distinct solids — a useful sanity check
for a tutorial that shows a model gallery. Separately, 18 of the 59 are "fully
supported" (16 reflexible, 2 chiral).
([MathWorld, *Icosahedron Stellations*](https://mathworld.wolfram.com/IcosahedronStellations.html))

**Du Val's notation — the historical ancestor of "sub-cells".** Patrick Du Val
observed that the cells lie in concentric shells around the core and labelled them
by *power* (the number of face planes a ray from the core centre to the cell
crosses): **a** for the core icosahedron, then **b, c, d, e, f, g, h** — eight
shells, matching the program's eight layers 0–7. Where a shell contains more than
one shape of cell, he used numeric subscripts (`e1`, `e2`; `f1`, `f2`; `g1`, `g2`).
And where a shape occurs in right- and left-handed forms, he wrote the
right-handed (dextro) one in roman type and the left-handed (laevo) one in
*italic* — so the pair `f1` / *`f1`* is exactly what the program calls a cell and
its two chiral sub-cells. Where a stellation contains a complete shell **and
everything inside it**, that shell's letter is capitalised and the inner ones are
dropped from the symbol: `a + b + c + e1` is written `Ce1` — note that the capital
`C` stands for `a+b+c`, so `Ce1` deliberately *skips* shell `d`. Symbols that are
a bare capital `A`…`H` are the "main-line" stellations, one complete shell after
another.
([Wikipedia, *The Fifty-Nine Icosahedra*](https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra);
[G. Inchbald, *Stellating the Icosahedron and Facetting the Dodecahedron*, steelpillow.com](https://www.steelpillow.com/polyhedra/icosa/stelfacet/StelFacet.html))

(UNCERTAIN — minor source inconsistency, flagged so nobody "fixes" it the wrong
way: Wikipedia's Du Val section names the core shell **A** in one paragraph and
lowercase **a** two paragraphs later, and illustrates the capital rule once as
`De1 = A + b + c + d + e1` and once as `Ce1 = a + b + c + e1`. The two are
consistent about *what a capital means*; they differ only on how the core is
written. Inchbald uses lowercase `a` for the core, which is what this note follows.)

Cross-referencing §4: the enantiomorphic shape is `f1`, the 120-cell orbit in
layer 5 — consistent with the program's report that it is the 120 that splits.
The supporting chain, each link checked: Wikipedia states that the layer of
power 5 is shell `f` and holds three kinds of cell, `f1`, *`f1`* and `f2`; the
program's layer 5 holds 12 + 120; MathWorld's shell-ordered list makes the sixth
entry (= `f1`) 120 and the seventh (= `f2`) 12; and the Crennell-numbered
stellation table has `Ef₁` = compound of ten tetrahedra vs `E`f₁ = compound of five
tetrahedra, which is exactly a 120-cell orbit versus one 60-cell half of it.
(UNCERTAIN: that is still an inference across four sources. No single source I
reached states "f1 = 120 cells" outright.)

**Cell diagrams, layers, shells — who introduced what.**

- Max Brückner, *Vielecke und Vielflache* (1900) — set out the theory of polyhedral
  reciprocation in detail and recorded the then-known stellations plus six more of
  the icosahedron. (UNCERTAIN: an earlier draft of this note called this "the
  earliest passing treatment of the space division into cells". No source I found
  says that; what Inchbald and Wikipedia both say is only that before Coxeter,
  Brückner and Wheeler were the only ones to record significant *sets* of
  stellations.)
- A. H. Wheeler, Proc. International Mathematical Congress (1924) — applied group
  theory to the icosahedron and introduced the idea of describing only the *visible*
  regions of a face; he avoided the word "stellation", and included hollow figures
  and disconnected sets of cells. (UNCERTAIN: an earlier draft called this the
  "first group-theoretic treatment". Neither Inchbald's history nor Wikipedia says
  "first" — Wikipedia in fact credits the then-novel use of combinatorics and
  abstract graph theory in this geometric setting to *Coxeter*, in 1938. Drop the
  superlative.)
- J. D. Ede, "Rhombic triacontahedra", *The Mathematical Gazette* **42** (1958),
  pp. 98–100 — introduced the idea of **"main-line" stellations**, those built from
  successive *complete shells*. This is the direct ancestor of the program's
  "layer" concept.
- N. J. Bridge, "Facetting the dodecahedron", *Acta Crystallographica* **A30**
  (1974), pp. 548–552 — developed the stellation ↔ faceting duality and found a
  stellation of the icosahedron (`Df2`) excluded by Miller's rules.
- G. S. Pawley, "The 227 triacontahedra", *Geometriae Dedicata* **4** (1975),
  pp. 221–232 — enumerated the "non-reentrant" (now "fully supported") stellations
  of the rhombic triacontahedron.
- P. W. Messer & M. J. Wenninger, "Symmetry and polyhedral stellation — II",
  *Computers & Mathematics with Applications* **17** (1989), nos. 1–3,
  pp. 195–201 (Pergamon). Companion paper: G. M. Fleurent, "Symmetry and polyhedral
  stellation — Ia and Ib", same volume, pp. 167–193.
- P. W. Messer, "Stellations of the rhombic triacontahedron and beyond",
  *Structural Topology* **21** (1995), pp. 25–46.
- Guy Inchbald (1998– ), steelpillow.com — modern reappraisal, reciprocity-based
  definitions, rediscovery of non-Miller stellations.

The **cell diagram** is the layered graph the program's connectivity view is
modelled on: each cell becomes a vertex, vertices sit at a height given by their
shell (core lowest), and two vertices are joined when the corresponding cells abut
across a shared face. Since a shell wraps the one inside it completely, no edge can
ever skip a level — every edge runs between neighbouring shells.

> **UNCERTAIN — attribution.** The claim "Messer introduced the cell diagram,
> building on Pawley" is *not* verified against a primary source. It comes from
> search-engine snippets of Robert Webb's *Stella: Polyhedron Navigator* material;
> the hosting page (`polyhedra-world.nc/PolyNav/PolyNavigator.html`, and the
> `maths.ac-noumea.nc` address that redirects to it) now returns 404, and neither
> the Internet Archive nor Inchbald's history page was reachable/usable to confirm
> it. Two independent snippet sets agree, but they are snippets of *the same* page.
> Counter-evidence worth weighing: Wikipedia says Coxeter himself used abstract
> graph theory in 1938 and reproduces a connectivity graph from the book — though
> that one is a graph of *face regions* in the stellation diagram, not of cells,
> and a "cell diagram" image does appear in Wikipedia's Du Val section without
> attribution. Treat the priority question as open.
>
> The description above is deliberately reworded: the snippet phrasing ("nodes
> represent cells… lines connect any two cells that share a face… lines can only
> ever connect cells from two consecutive layers") is close enough to Webb's own
> sentences that reproducing it would be lifting.

**Historical caveat worth flagging.** Guy Inchbald argues that Miller's rules are
an arbitrary aesthetic filter with no principled connection to faceting, and that
they admit odd objects (undercut or wholly disconnected cells) while excluding
legitimate ones. So "the 59" is a *convention*, not a theorem about how many
stellations the icosahedron has. A cell-based program like this one is more
general than Miller: it lets the user pick any set of orbits, of which the 59 are
a curated subset.

---

## 9. Schoenflies glossary — the point groups the program offers

**Schoenflies notation** (Arthur Moritz Schoenflies, German mathematician) is the
naming scheme used by chemists and by most polyhedron software for the symmetry
groups of *finite* 3D objects ("point groups" — every operation fixes at least one
common point). The capital letter names the family; a number is the order of the
main rotation axis; a subscript letter says what mirrors are present.

Reading the subscripts:

- **`v`** = *vertical* mirror planes — planes that **contain** the main axis.
- **`h`** = a *horizontal* mirror plane — the plane **perpendicular** to the main axis.
- **`d`** = *diagonal* (or dihedral) mirror planes — vertical planes that **bisect**
  the angles between the secondary 2-fold axes.
- **no subscript** on `C`, `D`, `T`, `O`, `I` = **rotations only ⇒ chiral**.

### Axial families (one distinguished main axis)

| Symbol | Order | Contents | Chiral? | Rotation subgroup | Everyday example |
|---|---|---|---|---|---|
| `Cn` | n | one n-fold rotation axis, nothing else | **yes** | itself | a pinwheel; a propeller with n blades |
| `Cnv` | 2n | `Cn` + n vertical mirrors | no | `Cn` | a square pyramid (`C4v`); a cone |
| `Cnh` | 2n | `Cn` + one horizontal mirror | no | `Cn` | a flat n-gon with a chiral pattern on both faces |
| `S2n` | 2n | generated by a 2n-fold rotoreflection | no | `Cn` | `S4`: a **baseball** seam (a seam with a direction); `S6` = `C3i` |
| `Dn` | 2n | `Cn` + n 2-fold axes perpendicular to it | **yes** | itself | a twisted (chirally offset) n-gonal drum |
| `Dnh` | 4n | `Dn` + horizontal mirror (and n vertical mirrors) | no | `Dn` | a regular n-gonal **prism** |
| `Dnd` | 4n | `Dn` + n diagonal mirrors; contains `S2n` | no | `Dn` | a regular n-gonal **antiprism** |

Notes and edge cases the tutorial may want:

- Correction to an earlier draft: the **tennis ball** is not an `S4` example — its
  seam is undirected, which buys two extra `C2` axes and two extra mirrors, giving
  `D2d` (order 8). The standard `S4` example is the **baseball**, whose seam *is*
  directional; noticing that direction drops `D2d` down to `S4`.
- `C1` (order 1) is the trivial group — no symmetry at all.
- `Cs` (order 2) is a single mirror; it is `C1v` = `C1h`. `Ci` (order 2) is a lone
  inversion centre; it equals `S2`.
- Odd-index `S` groups are *not new*: `S1 = Cs`, `S3 = C3h`, `S5 = C5h`. Only the
  even ones are genuinely distinct, which is why the family is written **`S2n`**.
- `C2h`, `D2h`, `Dnd` with odd n, `S2n` with odd n, `Th`, `Oh`, `Ih` contain the
  central inversion `i`; `Td`, `Cnv`, `Dnh` with odd n do not.

### Polyhedral families (more than one high-order axis)

| Symbol | Order | Axes / operations | Chiral? | Abstract group | Rotation subgroup |
|---|---|---|---|---|---|
| `T` | 12 | 4 three-fold, 3 two-fold | **yes** | `A4` | itself |
| `Td` | 24 | `T` + 6 mirrors + 6 `S4`; **no** inversion | no | `S4` | `T` |
| `Th` | 24 | `T` + inversion + 3 mirrors + 8 `S6` ("pyritohedral") | no | `A4 × C2` | `T` |
| `O` | 24 | 3 four-fold, 4 three-fold, 6 two-fold | **yes** | `S4` | itself |
| `Oh` | 48 | `O` + inversion + 9 mirrors + `S4`/`S6` | no | `S4 × C2` | `O` |
| `I` | 60 | 6 five-fold, 10 three-fold, 15 two-fold | **yes** | `A5` | itself |
| `Ih` | 120 | `I` + inversion + 15 mirrors + 24 `S10` + 20 `S6` | no | `A5 × C2` | `I` |

`T` is the rotation group of the regular tetrahedron; `Td` is its full symmetry
group. `Th` is the symmetry of a pyritohedron (the "fool's gold" crystal habit) —
same rotations as `T` but achiral in a different way from `Td`. `O`/`Oh` belong to
the cube and octahedron; `I`/`Ih` to the icosahedron and dodecahedron.

Two useful containments for a stellation program: `T ⊂ Td ⊂ Oh` and
`T ⊂ Th ⊂ Oh` and `T ⊂ O ⊂ Oh`. Also `T ⊂ I` and `D3 ⊂ I`, `D5 ⊂ I` — so an
icosahedral core can be stellated under low sub-symmetries too, producing orbits
that split into many unequal pieces.

Sources for this section:
[Wikipedia, *Schoenflies notation*](https://en.wikipedia.org/wiki/Schoenflies_notation);
[Wikipedia, *Point groups in three dimensions*](https://en.wikipedia.org/wiki/Point_groups_in_three_dimensions).

### The chirality rule in one line

> Exactly the families with no subscript are chiral: **`C1`, `Cn`, `Dn`, `T`, `O`, `I`.**
> Every other point group contains at least one mirror, inversion, or
> rotoreflection, and objects with those symmetries are achiral.

(For crystals, where n is restricted to 1, 2, 3, 4, 6, this leaves the 11 chiral
— also called "enantiomorphic" — crystal classes `C1, C2, C3, C4, C6, D2, D3, D4,
D6, T, O`, and the 65 Sohncke space groups are exactly those whose point group is
one of these 11. A nice aside if the tutorial wants to connect to real materials —
but beware a collision of numbers: the *other* "11" often quoted in this area is
the 11 **enantiomorphic pairs** of space groups, i.e. 22 of the 65. Different
eleven.)

---

## 10. Suggested tutorial framing

A short ladder that a non-specialist can climb:

1. **Cut.** Extend the 20 face planes. They dice space into unbounded outer regions
   plus **473 bounded cells** for the icosahedron (the core plus 472 others); only
   the bounded ones are cells in the stellation sense.
2. **Sort by distance.** Cells fall into 8 concentric shells (layers 0–7), because
   the number of planes you cross on the way out from the centre is a natural
   grading. Layer 0 is the icosahedron itself.
3. **Sort by symmetry.** Within a layer, cells that symmetry maps onto each other
   form one orbit. The icosahedron has 11 orbits under `Ih`. That is the Cells
   table.
4. **Choose.** A symmetric stellation = a choice of orbits. All-or-nothing per
   orbit; that is what §7 proves.
5. **Loosen.** Drop the mirrors (`Ih → I`). Orbits whose cells have no mirror
   symmetry of their own break into left and right halves — sub-cells. Choose one
   half and your stellation becomes handed.
6. **Recognise.** Take everything out through shell `e` and then add **both** halves
   of the layer-5 `f₁` orbit: that is the compound of ten tetrahedra (Du Val `Ef₁`).
   Add only **one** half and you get one of the two compounds of five tetrahedra
   (Du Val `E`f₁). Identical except for the handedness switch on a single orbit.

---

## 11. Things I could not confirm

- **UNCERTAIN:** A single primary source stating that Du Val's `f1` shape has
  exactly 120 cells. The identification is an inference from combining
  (a) two sources saying `f1` is the enantiomorphic pair, and (b) MathWorld's
  ordered cell-count list where the 6th entry (= `f1` in shell order) is 120.
  It is also consistent with the program's own computation.
- **UNCERTAIN:** Steve Dutch's page says type-1 cells "meet at or enclose a
  three-fold symmetry axis" and type-2 cells a five-fold axis. This works for
  `e1` = 20 (one per 3-fold axis direction) and `f2` = 12 (one per 5-fold axis
  direction), but is a loose description for `e2` = 60, `f1` = 120, `g1` = 30,
  `g2` = 60. Do not present it as a rule. Note also that Dutch attributes the
  subscript convention to **Coxeter**, not Du Val, and writes shells as capital
  `A`–`H` throughout — a different convention from the one used in §8 here, so
  don't cite him for Du Val's notation.
- **UNCERTAIN:** Attribution of the *cell diagram* graph to Messer building on
  Pawley. Recovered only from search snippets of Robert Webb's PolyNavigator
  material; the hosting URL now 404s, the `maths.ac-noumea.nc` mirror just redirects
  to it, and the Internet Archive was not reachable from here. Against it: Wikipedia
  credits Coxeter (1938) with bringing combinatorics and abstract graph theory to
  this problem, and the connectivity graph reproduced from the book is of face
  regions. Priority is genuinely open — do not assert it in the tutorial.
- **UNCERTAIN:** Stella's glossary text (software3d.com/Glossary.php) returns HTTP
  403 to programmatic fetching; its wording here is paraphrased from search-engine
  snippets rather than read directly.
- **UNCERTAIN / disagreement in sources:** Wikipedia's *Stellation* article
  describes Miller's rules as preserving *rotational* symmetry; the *Fifty-Nine
  Icosahedra* article describes rule (iii) as securing *icosahedral* symmetry. Both
  are right in context — rule (iii) permits trigonal symmetry "without or with
  reflection", i.e. `I` or `Ih`. Worth stating carefully rather than repeating
  either phrasing bare.
- **UNCERTAIN:** MathWorld cites the cell counts to "Wenninger 1989, p. 41". I did
  not independently verify the page or which printing of *Polyhedron Models*
  (Cambridge University Press, first published 1971) that refers to.
- **UNCERTAIN:** The stabiliser identifications in §4 (`C3v`, `C2v`, `Cs`, `C5v`,
  `C1`) are *deduced* from orbit sizes via orbit–stabiliser plus which order-6 /
  order-4 / order-2 subgroups of `Ih` are geometrically available. Orbit–stabiliser
  fixes the stabiliser's **order** and nothing more; that an order-2 stabiliser is
  `Cs` rather than `C2` is an inference from the program reporting no split, as §5
  says openly. It is not read off any source, and it is not a theorem.
- Not researched here (belongs to other notes): whether every one of the program's
  other polyhedra shows the same clean orbit structure, and the combinatorics of
  Miller's accessibility rule (iv).

### Corrections applied in this pass

Errors found and fixed in place, listed so they are not silently reintroduced:

1. §5's index-4 example was mathematically impossible (`8 + 8 + 8`, `12 + 4 + 8`
   under a group of order 12). Replaced with a hand-checked `I → T` example.
2. §6 called the compound of ten tetrahedra "a whole `Ih` orbit". It is `Ef₁`, a
   union of orbits; only `f₁` splits.
3. §6's "its dual is its own enantiomorph" garbled the source, which says the dual
   *is* the enantiomorph.
4. §9 gave the tennis ball as the `S4` example. Tennis ball is `D2d`; the baseball
   is the `S4` one.
5. §1 credited the coinage of "chiral" to the 1904 *Baltimore Lectures*, skipping
   the 1894 first publication.
6. §8 called Wheeler (1924) the "first group-theoretic treatment" and Brückner
   (1900) the "earliest treatment of the space division". Neither superlative is
   in any source consulted; both downgraded.
7. §3's "orbit sizes can only be [all 16 divisors of 120]" was true but slack;
   sizes 3, 4 and 8 are in fact unrealisable in `Ih`.
8. The cell-diagram description and the Great Stella sentence were close
   paraphrases of their sources; both rewritten.

Claims re-checked and found **correct** (no change needed): the 473 / 472 cell
totals and the ten-shape multiset against MathWorld; 32 reflexible + 27 chiral and
18 fully supported (16 + 2); `Ih ≅ A₅ × C₂` and its non-isomorphism to `S₅`; the
`I` and `Ih` operation inventories (24 + 20 + 15 + 1, and 1 + 15 + 24 + 20); Hess
1876 and the W/UC indices and Coxeter symbols for all three compounds; the
five-octahedra compound as the second stellation; the 1938/1982/1999 editions and
each author's role; Miller's rules (iii) and (v) verbatim; the `Ce1` capital-letter
rule; Ede 1958 *Math. Gazette* **42**, 98–100; Bridge 1974's `Df2`; Pawley 1975;
the Fleurent "Ia and Ib" / Messer–Wenninger "II" pagination; the 11 chiral crystal
classes and 65 Sohncke groups.

---

## 12. Sources

Books and papers

- H. S. M. Coxeter, P. Du Val, H. T. Flather, J. F. Petrie, *The Fifty-Nine
  Icosahedra*, University of Toronto Press, 1938; 2nd ed. Springer-Verlag, 1982;
  3rd ed. Tarquin, 1999 (new material by K. & D. Crennell). ISBN 9781899618323 /
  9781907550089.
- J. D. Ede, "Rhombic triacontahedra", *The Mathematical Gazette* 42 (1958),
  98–100.
- N. J. Bridge, "Facetting the dodecahedron", *Acta Crystallographica* A30 (1974),
  548–552. https://journals.iucr.org/paper?S0567739474001306
- G. S. Pawley, "The 227 triacontahedra", *Geometriae Dedicata* 4 (1975), 221–232.
  https://link.springer.com/article/10.1007/BF00148756
- G. M. Fleurent, "Symmetry and polyhedral stellation — Ia and Ib", *Computers &
  Mathematics with Applications* 17 (1989), nos. 1–3, 167–193.
- P. W. Messer & M. J. Wenninger, "Symmetry and polyhedral stellation — II",
  *Computers & Mathematics with Applications* 17 (1989), nos. 1–3, 195–201.
  https://www.sciencedirect.com/science/article/pii/0898122189901594
- P. W. Messer, "Stellations of the rhombic triacontahedron and beyond",
  *Structural Topology* 21 (1995), 25–46.
- M. J. Wenninger, *Polyhedron Models*, Cambridge University Press (1st ed. 1971;
  cited by MathWorld as "Wenninger 1989, p. 41").
- Lord Kelvin (W. Thomson), *The Molecular Tactics of a Crystal* — the Second
  Robert Boyle Lecture, delivered to the Oxford University Junior Scientific Club
  on 16 May 1893, published Oxford: Clarendon Press, **1894**; reprinted in the
  appendix to *Baltimore Lectures on Molecular Dynamics and the Wave Theory of
  Light*, 1904. Origin of the word "chiral" (in a footnote).
  Full text: https://www.gutenberg.org/files/54976/54976-h/54976-h.htm
- E. Hess, 1876 — first description of the compounds of five tetrahedra, ten
  tetrahedra and five octahedra.

Web

- Wikipedia, *Icosahedral symmetry* — https://en.wikipedia.org/wiki/Icosahedral_symmetry
- Wikipedia, *The Fifty-Nine Icosahedra* — https://en.wikipedia.org/wiki/The_Fifty-Nine_Icosahedra
- Wikipedia, *Schoenflies notation* — https://en.wikipedia.org/wiki/Schoenflies_notation
- Wikipedia, *Point groups in three dimensions* — https://en.wikipedia.org/wiki/Point_groups_in_three_dimensions
- Wikipedia, *Stellation* — https://en.wikipedia.org/wiki/Stellation
- Wikipedia, *Compound of five tetrahedra* — https://en.wikipedia.org/wiki/Compound_of_five_tetrahedra
- Wikipedia, *Compound of ten tetrahedra* — https://en.wikipedia.org/wiki/Compound_of_ten_tetrahedra
- Wikipedia, *Compound of five octahedra* — https://en.wikipedia.org/wiki/Compound_of_five_octahedra
- nLab, *icosahedral group* — https://ncatlab.org/nlab/show/icosahedral+group
- Wolfram MathWorld, *Icosahedron Stellations* — https://mathworld.wolfram.com/IcosahedronStellations.html
- G. Inchbald, *Defining Stellation and Facetting* — https://www.steelpillow.com/polyhedra/StelFacet/stel-facet.html
- G. Inchbald, *Stellating and Facetting — a Brief History* — https://www.steelpillow.com/polyhedra/StelFacet/history.html
- G. Inchbald, *Stellating the Icosahedron and Facetting the Dodecahedron* — https://www.steelpillow.com/polyhedra/icosa/stelfacet/StelFacet.html
- HandWiki, *The Fifty-Nine Icosahedra* — https://handwiki.org/wiki/The_Fifty-Nine_Icosahedra
- R. Webb, *Stella's Polyhedral Glossary* / Great Stella — https://www.software3d.com/Glossary.php (403 to fetch; paraphrased from snippets)
- S. Dutch, *Stellations of the Icosahedron* — https://stevedutch.net/symmetry/stelicos.htm
- M. Tunnissen, *The Stellations of the Icosahedron* — https://www.tunnissen.eu/polyh/icosahedra/
- T. Gowers, "Group actions II: the orbit-stabilizer theorem" (2011) — https://gowers.wordpress.com/2011/11/09/group-actions-ii-the-orbit-stabilizer-theorem/
