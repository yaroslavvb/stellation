# Spec 02 — Facets → Cells → Layers → Symmetric Super-Cells → Connectivity Graph

Reverse-engineered from:

- `stellation/src/main/java/pvs/polyhedra/Stellation.java` (2939 lines; cell code at 1446–2138)
- `stellation/src/main/java/pvs/polyhedra/SCell.java`
- `stellation/src/main/java/pvs/polyhedra/SSCell.java`
- `stellation/src/main/java/pvs/polyhedra/SCellIndex.java`
- `stellation/src/main/java/pvs/polyhedra/SFace.java`, `SVertex.java`, `SEdge.java`, `Plane.java`, `Vector3D.java`, `Matrix3D.java`
- `stellation/src/main/java/pvs/polyhedra/Symmetry.java` (matrices, canonical testers, handedness)
- `stellation/src/main/java/pvs/utils/FastHashtable.java`, `QSort.java`
- `stellation/src/main/java/pvs/polyhedra/stellation/StellationController.java` (the only live caller)

**Headline answer up front:** a cell is **NOT** defined by a sign vector over the plane
arrangement. It is defined by a **greedy adjacency walk over precomputed 2-D facets**,
seeded from one unused facet, using exact `Vector3D` **reference identity** (`==`) on shared
vertices plus a strict `< 0` half-space test for convexity. Layers are a **per-facet integer
counted during plane cutting**, not recomputed from cells.

---

## 0. Vocabulary and the constants that matter

| Symbol | Value | Where | Meaning |
|---|---|---|---|
| `Vector3D.tolerance` | `1.e-6` | `Vector3D.java:256` | componentwise tolerance in `Vector3D.equals` |
| `Vector3D.TOL` | `1.e-10` | `Vector3D.java:288` | `chop()` for printing; **also** `Symmetry.TOL` |
| `Symmetry.TOL` | `= Vector3D.TOL` = `1.e-10` | `Symmetry.java:2049` | canonical-triangle boundary slack |
| `Plane.TOLERANCE` | `1.e-10` | `Plane.java:123` | `Plane.equals`, and the `d≈0` special case |
| `Stellation.THRESHOLD` | `1.e-7` | `Stellation.java:1076` | inside/outside test when cutting facets — "to breake a little bit symmetry of +/-" |
| `Stellation.FACTOR` | `5.e3` | `Stellation.java:1224` | seed-face radius |
| `Stellation.MAXVERTEX` | `2.e3` | `Stellation.java:1226` | facets with a vertex farther than this are discarded (`cleanFaces`) |
| `SSCell.EPS` | `1.e-4` | `SSCell.java:382` | volume tie tolerance in `SSCell.compare` |
| `SSCell.TOL` | `0.0001` | `SSCell.java:286` | only used by dead `old_compare` |

**Plane convention** (`Plane.java`): every plane stores a *unit* normal `v` and a scalar `d`,
so the plane is `v·x = d` and `distance(x) = x·v − d`. On the live path `d ≥ 0` and normals
point **away from the origin** — the 3-arg constructor `Plane(v, d, index)` is fed
`d = |canonical vector| ≥ 0` (`Stellation.java:107-112`), and the 3-point constructor
`Plane(v0,v1,v2,index)` (`Plane.java:83-108`) explicitly flips `v` when `d < -TOLERANCE` and
disambiguates the `|d| < TOLERANCE` case against `rndDir`. The `Plane(normal, point, index)`
constructor does **not** normalise the sign (`d = v̂·point` may be negative); it is not used to
build `Stellation.planes[]`. Therefore for any point `x`:

- `x·v − d < 0` → `x` is **inside** (origin side) of the plane
- `x·v − d > 0` → `x` is **outside**

`Plane.index` is the index of the plane in `Stellation.planes[]`; planes `0 .. canonicalVectors.length-1`
are the **canonical** planes (constructor `Stellation(Vector3D[] canvect, String symmetry, int)`
lines 84–93 explicitly place the orbit representatives first).

---

## 1. Data structures

### 1.1 `SFace` — a 2-D facet of the arrangement

```java
public class SFace {
  public SCell cellAbove;      // cell for which this facet is a BOTTOM facet
  public SCell cellBelow;      // cell for which this facet is a TOP facet
  public int layer = 0;
  public Vector3D[] vertices;  // CCW as seen from outside; SHARED objects
  private Plane plane;
  Vector3D center;             // lazily = mean of vertices
  Vector3D area;               // lazily = 0.5 * Σ vᵢ × vᵢ₊₁   (vector area)
}
```

Key behaviours:

- `getCenter()` = `(1/n) Σ vertices[i]`, cached in `center`.
- `getArea()` = `0.5 * Σᵢ vertices[i] × vertices[(i+1)%n]` — a **vector**; its length is the
  scalar area, its direction the outward normal (for CCW winding).
- `hashCode()` = `getCenter().hashCode()`. **`equals` is NOT overridden** → identity equality.
  So an `SFace` used as a hashtable key is an identity key that merely *buckets* by center.
- `getPlaneIndex()` returns `plane.index`.
- `getRadius()` = max `|vertex|`.

### 1.2 `Vector3D` identity — the load-bearing detail

```java
public boolean equals(Object o){                     // tolerance 1.e-6, componentwise
  Vector3D v = (Vector3D)o;
  return |v.x-x| < 1e-6 && |v.y-y| < 1e-6 && |v.z-z| < 1e-6;
}
public int hashCode(){
  return (int)(331345.563*x) + (int)(412345.891*y) + (int)(71341.678*z);   // C-style truncation
}
```

This hash/equals pair **violates the hashCode contract** (two vectors 1e-7 apart can land in
different buckets). The program compensates by **canonicalizing every vertex object once**
through `findVertex(vtable, v)` (`Stellation.java:1196`) and `transformFace(...)`
(`Stellation.java:225`), after which **all downstream geometry compares vertices with `==`**,
never with `equals`. `SFace.adjacent` and `SFace.cleanVertices` rely on this.

> The `int hashCode = 0;` cache field in `Vector3D` is **write-only-as-zero**. `hashCode()`
> *does* read it (`if(hashCode != 0) return hashCode;`, `Vector3D.java:280`), but nothing ever
> assigns a non-zero value — every mutator (`set`, `addSet`, `mulSet`, `normalize`, …) only
> resets it to `0`. So the guard never fires and every call recomputes. The caching is dead,
> the field is not unread.

### 1.3 `SVertex` — vertex → incident facets index

```java
class SVertex { Vector faces = new Vector(); Vector3D vertex; }
```
Built by `makeVertexTable(SFace[][] faces)` (`Stellation.java:1515`): a `FastHashtable`
keyed by the canonical `Vector3D` object → `SVertex`, whose `faces` lists every facet in that
layer touching the vertex. This is purely an acceleration index for `findAdjacentFaces`.

### 1.4 `SCell` — one 3-D cell (elementary/primitive cell)

```java
public class SCell implements Comparator {
  SFace[] top;      // facets whose plane has the cell INSIDE  (facets face outward/away from origin)
  SFace[] bottom;   // facets whose plane has the cell OUTSIDE (facets face inward/toward origin)
  int layer;
  private int index = -1;   // symmetry index; -1 = uninitialised
  Vector3D center; double vol = 0; double area = 0;
}
```

Constructor side effect (`SCell.java:45-58`) — **this is how the cell graph is wired**:

```java
for (t in top)    top[t].cellBelow  = this;
for (b in bottom) bottom[b].cellAbove = this;
```

- `getCenter()` = mean of `top[i].getCenter()` and `bottom[i].getCenter()` over
  `top.length + bottom.length` facets — **not** the centroid, and **not** vertex-based.
  Cached in `center`. This center is the cell's identity key for all symmetry hashing.
- `getVolume()` (divergence theorem, origin as apex):
  ```
  V = (1/3) * [ Σ_top    top[i].vertices[0] · top[i].getArea()
              − Σ_bottom bottom[i].vertices[0] · bottom[i].getArea() ]
  ```
  The minus sign is because bottom facets carry the *same* CCW-from-outside winding as when
  they served as some other cell's top facet, i.e. they are reversed relative to this cell.
- `getArea()` = Σ `|getArea()|` over top **and** bottom facets (no sign).
- `setIndex(int)` keeps the **minimum**: uninitialised (`-1`) accepts anything; afterwards only
  a strictly smaller value replaces it. Never resets.
- `compare(o1,o2)` = `c1.index - c2.index`. `SCell` *is* its own comparator (see §7).
- **`SCell` does not override `hashCode`/`equals`** → identity semantics in `SSCell.ttop`.

### 1.5 `SSCell` — symmetric super-cell (an orbit of `SCell`s)

```java
public class SSCell implements Comparator {
  public Vector top    = new Vector();  // SSCells in layer+1 adjacent from above
  public Vector bottom = new Vector();  // SSCells in layer-1 adjacent from below
  public SCell[] cells;                 // the orbit, sorted (see §5)
  public SSCell[] subCells = null;
  public SSCell superCell = null;
  int handedness = 0;                   // -1 / 0 / +1
  private FastHashtable ttop = new FastHashtable();
  private boolean isTopBottomInitialized = false;
  public int layer;  public int index;  String symmetry;
}
```

Derived quantities (all use `cells[0]` as the representative, assuming the orbit is congruent):

- `getNFacets()` = `cells[0].top.length + cells[0].bottom.length`
- `getNtopFacets()` = `cells[0].top.length`
- `getVolume()` / `getArea()` = sum over the **whole orbit**
- `getNVertices()` = `countComponents()`: puts every vertex of every facet of every `SCell`
  into a `java.util.Hashtable` (so **tolerance** `Vector3D.equals` applies here, unlike the
  `==` used elsewhere) and returns `ht.size()`. `nComponents` is hardcoded `= 1` (the real
  component count is an unfinished TODO at `SSCell.java:239-252`).

### 1.6 `SCellIndex` — sorted plane-index fingerprint

```java
public class SCellIndex implements Comparator {
  int index[];                       // sorted ascending by QSort.quickSort(int[],lo,hi)
  compare: length first, then lexicographic elementwise
}
```
`SSCell.getSCellIndex()` builds, for each `SCell` in the orbit, the multiset of
`getPlaneIndex()` over `top ∪ bottom`, sorts each, sorts the array of them, and returns the
smallest. **It is computed but never used on the live path** (the call sites at
`Stellation.java:1637` and `:1712` are commented out). Its own doc comment says
"make no much sence actually".

---

## 2. `layer` — definition and computation

`layer` lives on `SFace`, is assigned **during plane cutting**, and is *inherited*, never
recomputed.

In `intersectFacesWithPlane(Vector faces, Plane plane, FastHashtable vtable, int index, int maxintersection)`
(`Stellation.java:1084`), for every current facet `sface` and every vertex `j`:

```
fval[j] = sface.vertices[j] · plane.v  −  plane.d
if (fval[j] < THRESHOLD)  nminus++      // "inside"  (note: exactly-on-plane counts INSIDE)
else                      nplus++       // "outside"
```
with `THRESHOLD = 1.e-7`. Note `int fsize = faces.size();` is captured **before** the loop
(`Stellation.java:1088`), so the outside pieces appended during this call are **not** re-cut by
the same plane — they are only seen by the next plane in `sortPlanes` order. A port that writes
`for (i = 0; i < faces.size(); i++)` will not be bug-compatible. Also note the `int index`
parameter is never read in the method body. Then:

- `nminus == 0` (whole facet strictly outside) → **`sface.layer++`**; facet unchanged.
- `nplus == 0` (whole facet inside) → nothing.
- otherwise the facet is split; the inside piece **keeps** `sface.layer`, and the new outside
  piece gets `fout.layer = sface.layer + 1`. The outside piece is appended only if
  `maxintersection < 0 || fout.layer < maxintersection`.

**Therefore, for a facet `f` lying on plane `Pᵢ`:**

```
layer(f) = #{ j ≠ i : every vertex v of f satisfies  v·nⱼ − dⱼ ≥ 1e-7 }
```
i.e. *the number of face planes that `f` lies entirely beyond*. Layer 0 = the facets of the
core polyhedron.

`findMaxLayer(SFace[][])` (`Stellation.java:1339`) is the max over all facets;
`nlayers = findMaxLayer(faces) + 1`.

### 2.1 `makeLayers` — bucketing facets by layer

```java
static SFace[][][] makeLayers(SFace[][] faces)      // Stellation.java:1450
// returns layers[layer][planeIndex][facetInPlane]
```
Pure re-bucketing: counting pass per plane, then fill. Every `layers[k]` has exactly
`faces.length` (= number of planes) rows, possibly of length 0.

### 2.2 Cell layer

`makeCellsFromLayers2(bottomfaces = layers[i-1], topfaces = layers[i], layer = i)` stamps
`new SCell(top, bottom, layer=i)`.

The invariant this encodes: **a cell of layer `k` has all its top facets at facet-layer `k`
and all its bottom facets at facet-layer `k−1`.** (Proof sketch: if the cell is beyond `k`
planes, a top facet — cell inside its plane — is beyond the same `k` planes; a bottom facet —
cell outside its plane — *lies on* that plane, and "on" counts as inside by the `< THRESHOLD`
rule, so it is beyond `k−1`.)

Layer 0 is special-cased: `makeCellsFromLayers2(new SFace[0][0], layers[0], 0)` — the core
cell(s) have **no bottom facets**.

---

## 3. What defines a cell: the adjacency walk (`makeCellsFromLayers2`)

`Stellation.java:1745`. Not a sign vector; a flood fill over facets.

```java
Vector makeCellsFromLayers2(SFace[][] bottomfaces, SFace[][] topfaces, int layer)
```

### 3.1 Setup

```java
FastHashtable ttableCanon = makeFaceTableCanon(topfaces, canonicalVectors.length);
FastHashtable ttable      = makeFaceTable(topfaces);      // ALL top facets
FastHashtable btable      = makeFaceTable(bottomfaces);   // ALL bottom facets
FastHashtable tvtable     = makeVertexTable(topfaces);
FastHashtable bvtable     = makeVertexTable(bottomfaces);
```
`makeFaceTableCanon(faces, maxindex)` (`:1496`) only walks plane rows `0 .. maxindex-1` —
i.e. **only the canonical planes**. This is the *only* difference in setup vs. the older
`makeCellsFromLayers`, and it is what makes `makeCells2` cheap.

> `canonicalVectors` is a private field set **only** by the 3-arg constructor
> `Stellation(Vector3D[] canvect, String symmetry, int maxintersection)`. Calling
> `makeCells2` on a `Stellation` built from the `Polyhedron` or plain-`Vector3D[]`
> constructors would NPE. `StellationController` always uses the 3-arg constructor.

### 3.2 The walk (one iteration = one cell)

```
while ttableCanon is non-empty:
  face  = arbitrary element of ttableCanon        // FastHashtable enumeration order, §8
  remove face from ttableCanon and from ttable

  vert_table   = {}     # canonical Vector3D objects already absorbed into this cell
  t_adj_faces  = {}     # candidate top facets touching those vertices
  b_adj_faces  = {}     # candidate bottom facets touching those vertices

  for v in face.vertices:
      vert_table.add(v)
      findAdjacentFaces(ttable, v, t_adj_faces, tvtable)
      findAdjacentFaces(btable, v, b_adj_faces, bvtable)

  # ---- grow the TOP shell ----
  tfaces = [face]
  while (iface = findAdjacentFace(t_adj_faces, tfaces, +1)) != null:
      tfaces.append(iface)
      remove iface from ttable, ttableCanon, t_adj_faces
      for v in iface.vertices where v not in vert_table:
          findAdjacentFaces(ttable, v, t_adj_faces, tvtable)
          findAdjacentFaces(btable, v, b_adj_faces, bvtable)
          vert_table.add(v)

  # ---- grow the BOTTOM shell ----
  bfaces = []
  while (iface = findAdjacentFace(b_adj_faces, tfaces, -1)) != null:
      bfaces.append(iface)
      remove iface from btable, b_adj_faces
      for v in iface.vertices where v not in vert_table:
          findAdjacentFaces(btable, v, b_adj_faces, bvtable)
          vert_table.add(v)

  sc = new SCell(tfaces.toArray(), bfaces.toArray(), layer)
  if sc.getVolume() > 0: cells.append(sc)
  else:                  negCellCount++          # "it is infinite cell"
```

### 3.3 `findAdjacentFaces` — vertex-incidence filter

```java
static void findAdjacentFaces(FastHashtable pool, Vector3D vert,
                              FastHashtable faces, FastHashtable vtable)   // :1938
```
Looks up `SVertex vertex = vtable.get(vert)`; if null, returns. For each `aface` in
`vertex.faces`, if `pool.get(aface) != null` (i.e. the facet has not yet been consumed by an
earlier cell) then `faces.put(aface, aface)`. Pure candidate harvesting; no geometry.

### 3.4 `findAdjacentFace` — the acceptance test (this is *the* cell definition)

```java
static SFace findAdjacentFace(FastHashtable pool, Vector faces, int direction) { // :1971
  for (i = 0; i < faces.size(); i++) {
    SFace face = faces.elementAt(i);
    Vector3D plane = face.getPlane().v;      // unit normal
    double   length2 = face.getPlane().d;    // signed offset (misleading name)
    for (SFace pface : pool.elements()) {
      if (plane.dot(pface.getCenter()) - length2 < 0) {     // STRICT, NO TOLERANCE
        if (pface.adjacent(face, direction)) return pface;
      }
    }
  }
  return null;
}
```

Two conditions, both required:

1. **Convexity / half-space:** `pface.center · face.plane.v − face.plane.d < 0` — the
   candidate's center must be **strictly inside** the plane of the *particular* already-accepted
   face `face` it is being matched against. This is what stops the walk from leaking out of the
   cell into the next cell on the same side.
   Note `faces` is always `tfaces` — even for the bottom pass. Bottom facets are tested
   against **top-facet planes only**.

   > **UNCERTAIN:** an earlier draft of this spec claimed the test also "guarantees no two
   > accepted facets are coplanar, because a coplanar candidate gives exactly `0`". Both halves
   > are overclaims. (a) The value is a floating-point dot product of a computed centroid, so it
   > is `~0`, not exactly `0`, and its sign is not decidable statically. (b) The test is per
   > `(face, pface)` pair inside a double loop: a candidate coplanar with `tfaces[0]` can still
   > be accepted at `i = 1` if it passes `tfaces[1]`'s half-space test and is edge-adjacent to
   > `tfaces[1]`. Whether that ever happens for real inputs is a runtime question. Port the two
   > nested loops verbatim rather than relying on a coplanarity invariant.
2. **Edge adjacency with orientation:** `SFace.adjacent`.

### 3.5 `SFace.adjacent(SFace face, int direction)` (`SFace.java:71`)

```java
for (i in 0..this.n-1) {
  for (j in 0..face.m-1) {
    if (this.vertices[i] == face.vertices[j]) {                 // REFERENCE identity
      return this.vertices[(i+1)%n]        == face.vertices[(j-direction+m)%m]
          || this.vertices[(i-1+n)%n]      == face.vertices[(j+direction+m)%m];
    }                                                            // <-- returns on FIRST match
  }
}
return false;
```

- `direction = +1` → shared edge traversed in **opposite** order in the two polygons →
  the two facets have the **same** orientation (both CCW-from-outside). Used for `top`.
- `direction = -1` → shared edge traversed in the **same** order → **opposite** orientation.
  Used for `bottom`, matching `SCell`'s doc: *"bottom faces, they have opposite (clockwise)
  orientation"*.
- **Quirk to preserve:** the method returns on the *first* shared vertex it finds; it does not
  keep scanning. Sharing exactly one vertex (corner touch) correctly yields `false`.
- Called as `pface.adjacent(face, direction)` → `this` = candidate from the pool,
  `face` = already-accepted facet.

### 3.6 Known limitation (replicate it for fidelity)

The bottom-growth loop only ever tests candidates against `tfaces`. A bottom facet that shares
an edge with **no** top facet — only with other bottom facets — is never accepted, so such a
cell comes out with a hole in its bottom shell, hence a wrong (possibly ≤ 0) volume, and may
be silently discarded by the `getVolume() > 0` filter into `negCellCount`.

> **UNCERTAIN:** I could not determine whether this case ever occurs for the polyhedra
> actually shipped in `samples/`. It is a structural property of the code, not a hypothesis
> about a bug being hit. To be bug-compatible, port the loop exactly as written (test only
> against `tfaces`); do not "fix" it to also test against `bfaces`.

### 3.7 Volume filter

`sc.getVolume() > 0` — strict. Zero-volume and negative-volume cells are dropped and counted
in the instance field `int negCellCount` (`Stellation.java:40`, never reset). The code's
comment calls these "infinite cell": these arise from the seed faces being finite squares of
radius `FACTOR = 5e3` rather than true infinite planes, so unbounded arrangement cells appear
as junk.

---

## 4. `makeCells2` vs. `makeCells`

```java
public Vector makeCells2(String fullSymmetry, String stellSymmetry, int maxLayer)  // :1579
public Vector makeCells (String fullSymmetry, String stellSymmetry, int maxLayer)  // :1672
```

Both return **`Vector<Vector<SSCell>>`**: outer index = layer, inner = the `SSCell`s of that
layer, sorted by `SSCell.compare`.

### 4.1 `makeCells2` (the live path — `StellationController:100` and `:203`)

```
layers = makeLayers(faces)                         // [layer][plane][facet]
ftables[l] = FastHashtable { sf.getCenter() -> sf }  for every facet sf in layers[l]
symMatrices = Symmetry.getMatrices(fullSymmetry)
maxlay = min(maxLayer, layers.length)

for i in 0 .. maxlay-1:
    if i == 0:
        faceCells = makeCellsFromLayers2(SFace[0][0], layers[0], 0)
        cells     = makeCellsFromFaceCells(faceCells, symMatrices, new FastHashtable(), ftables[0])
    else:
        faceCells = makeCellsFromLayers2(layers[i-1], layers[i], i)
        cells     = makeCellsFromFaceCells(faceCells, symMatrices, ftables[i-1], ftables[i])
    scells = makeSymmetricalCells(cells, fullSymmetry, stellSymmetry)
    allcells.addElement(scells)
```

Only cells seeded from **canonical-plane** facets are built geometrically; the rest of each
layer is produced by rigid transformation. `makeConnectivityGraph(allcells)` is **commented
out** at `:1663`.

### 4.2 `makeCellsFromFaceCells` — orbit expansion (`:1540`)

```java
Vector makeCellsFromFaceCells(Vector cells, Matrix3D[] symMatrices,
                              FastHashtable tbottom, FastHashtable ttop)
```
```
tcells = FastHashtable(initialCapacity = cells.size() * planes.length)   # throws if cells is empty
for c in cells: tcells.put(c.getCenter(), c)
for c in cells:                       # iterates the ORIGINAL Vector, not tcells
  for m = 1 .. symMatrices.length-1:  # skips identity at index 0
    tc = c.getCenter().mul(symMatrices[m])
    if tcells.get(tc) == null:
        tcells.put(newCell.getCenter(), newCell)  where newCell = c.getTransformedCopy(symMatrices[m], tbottom, ttop)
return all values of tcells as a Vector
```
The dedup key is the **transformed cell center**, matched with `Vector3D.equals`
(tolerance `1e-6`) inside the hashtable. Note the dedup *probe* uses `center.mul(m)` but the
*insert* key is `ttanscell.getCenter()` — recomputed from the facets that were actually looked
up — so the two can differ by round-off.

> `new FastHashtable(n)` throws `IllegalArgumentException` for `n <= 0`
> (`FastHashtable.java:111-114`). If a layer yields zero positive-volume canonical cells,
> `cells.size()*planes.length == 0` and this line throws rather than returning an empty
> `Vector`. A JS port using a `Map` will silently survive that case; the Java build does not.

`SCell.getTransformedCopy(Matrix3D matrix, FastHashtable tbottom, FastHashtable ttop)`
(`SCell.java:135`) does **not** create new geometry. For each `top[i]` it looks up
`ttop.get(top[i].getCenter().mul(matrix))` — the *existing* `SFace` at the transformed center —
and likewise `tbottom` for bottoms. Misses print `"! no top facet in SCell.getTransformedCopy()"`
and leave a `null` in the array (which will NPE later). The new cell reuses `layer`.

Because the new `SCell` constructor runs, it (re)assigns `cellBelow` / `cellAbove` on those
shared `SFace` objects — this is how the whole layer's facet→cell back-pointers get filled in.

`Vector3D.mul(Matrix3D)` is **row-major, matrix-times-column-vector**:
`(x·m00+y·m01+z·m02, x·m10+y·m11+z·m12, x·m20+y·m21+z·m22)`.

### 4.3 `makeCells` (older, dead)

Identical control flow except:

1. It calls `makeCellsFromLayers(layers[i-1], layers[i], i)`, which has **no `ttableCanon`** —
   it seeds from `ttable` (all facets on all planes) and so builds every cell of every layer
   geometrically. Consequently there is **no** `makeCellsFromFaceCells` step.
2. After the layer loop it prints a diagnostic for adjacent pairs where
   `scell1.strictCompare(scell1, scell2) == 0` (topologically indistinguishable neighbours).
   The same block is commented out in `makeCells2` (`:1645-1661`).
3. It **does** call `makeConnectivityGraph(allcells)` at `:1735`.

Both produce the same mathematical object; `makeCells2` is the O(orbit) version.
No live caller uses `makeCells`.

---

## 5. `SSCell` construction, canonical ordering, sorting

### 5.1 `makeSymmetricalCells(Vector cells, String cellSymmetry, String subCellSymmetry)` (`:2045`)

```
table = FastHashtable { cell.getCenter() -> cell }   for all cells in the layer
matrices = Symmetry.getMatrices(cellSymmetry)

while table.size() > 0:
    cell = arbitrary element                        # enumeration order, §8
    scell = [cell];  table.remove(cell.getCenter())
    center = cell.getCenter()
    for i = 0 .. matrices.length-1:                 # NOTE: includes identity i=0
        tc = center.mul(matrices[i])
        tcell = table.get(tc)
        if tcell != null: table.remove(tc); scell.append(tcell)
    sscell = new SSCell(scell, cellSymmetry)
    sscell.makeCanonicalOrder()
    scells.append(sscell)
    sscell.setSubCells(makeSymmetricalSubCells(sscell, subCellSymmetry))

if scells.size() > 0: QSort.quickSort(scells, 0, scells.size()-1, (SSCell)scells.elementAt(0))
```

Notes:
- The seed cell is removed *before* the matrix loop, so the `i == 0` identity lookup is a
  harmless no-op for the seed but can still legitimately hit other members.
- The orbit is collected by **center matching only**, never by matching facet sets.
- The comparator instance is the vector's first element — the `SSCell` class implements
  `Comparator` on itself.

### 5.2 `SSCell` constructor (`SSCell.java:40`)

```java
public SSCell(Vector _cells, String symmetry){
    cells = _cells.toArray();
    this.symmetry = symmetry;
    QSort.quickSort(cells, 0, cells.length-1, cells[0]);   // sorts by SCell.index (all -1 at first pass)
    initHandedness();
}
```
`initTopAndBottom()` is deliberately **not** called here (it must run after all layers exist).

### 5.3 `initHandedness` / `Symmetry.get_handedness(Vector3D v, String symmetry)` (`Symmetry.java:1627`)

`handedness = Symmetry.get_handedness(cells[0].getCenter(), symmetry)`, computed **before**
`makeCanonicalOrder` re-sorts, i.e. on an arbitrary orbit member. That is safe because
handedness is a rotation invariant.

Only these symmetry strings return non-zero:

| symmetry | rule |
|---|---|
| `"O"` | if `test_point_at_plane(planes_Oh, v)` → `0`; else `p = make_canonical_point_Oh(v)`; `p.x < -TOL → -1`, `p.x > TOL → +1`, else `0` |
| `"I"` | same with `planes_Ih` / `make_canonical_point_Ih` |
| `"T"`, `"Th"` | `p = make_canonical_point_Ih(v)`; sign of `p.x` vs `TOL` |
| `"Td"` | `p = make_canonical_point_Ih(v)`; sign of `p.x - p.y` vs `TOL` |
| everything else (incl. `"Oh"`, `"Ih"`) | `0` — *"for others symmetries we don't know yet"* |

`TOL = 1.e-10`. `test_point_at_plane` returns true if `|planes[i]·v| < TOL` for any mirror
plane — i.e. the cell sits *on* a mirror, so it is achiral.

`make_canonical_point_Oh(v)` (`:1498`) folds `v` into the fundamental domain by absolute value
and sorted-component swaps, tracking `sign` (`*= -1` per reflection), then returns `p` with
`p.x *= sign` — so the *sign of x* encodes the parity of the folding, i.e. handedness.
`make_canonical_point_Ih(v)` (`:1438`) does the same via octant folding plus up to two
rotations (`2π/3` or `4π/3` about `(1,1,1)`, then `2π/5` or `4π/5` about `(1,0,τ)`,
`τ = (√5+1)/2`), decided by the signs of `p·planes_Ih[10]`, `[6]`, `[3]`, `[2]` — where `s6` is
**recomputed after** the first rotation (`Symmetry.java:1481`). It then does one **final
`p.y < 0` fold** (`sign *= -1; p.y = -p.y;`, lines 1488-1491) *before* `p.x *= sign`. That last
fold is easy to miss and changes the sign of the answer; port it.

`getHandedness()` returns the field (the supercell-delegation is commented out).

### 5.4 `makeCanonicalOrder()` (`SSCell.java:388`) — canonicalisation under the group

```java
Symmetry.CanonicalTester tester = Symmetry.getCanonicalTester(symmetry);

cIndex = 0; count = 0;
for i in 0..cells.length-1:
    if tester.test(cells[i].getCenter()): { count++; cIndex = i; }
if count != 1: System.out.print("!");          // diagnostic only; execution continues

ht = Hashtable { cells[i].getCenter() -> cells[i]   for all i != cIndex }
matr = Symmetry.getMatrices(symmetry);
cells[cIndex].setIndex(0);
v0 = cells[cIndex].getCenter();
for i = 1 .. matr.length-1:
    v1 = v0.mul(matr[i]);
    cell = ht.get(v1);
    if cell != null: cell.setIndex(i);          // setIndex keeps the MINIMUM

QSort.quickSort(cells, 0, cells.length-1, cells[0]);   // sort by SCell.index
```

Semantics: **the canonical cell is the one whose center falls in the fundamental spherical
triangle**; it gets symmetry index 0, and every other orbit member gets the **smallest index
`i` such that `matr[i]` maps the canonical center onto it** (stabiliser elements produce
several candidates; `SCell.setIndex` keeps the min). `cells` is then sorted by that index, so
`cells[k]` corresponds to group element `k` in the group's own matrix order.

`Symmetry.getMatrices(...)` always has `matrices[0] = new Matrix3D()` (identity) — verified for
`getE`, `getS2`, `getC2`, `getC2v`, `getCs`, `getO`, `getT`, `getD2h`, and derived groups
(`getOh` = `getO` ++ `reflection(−1,0,0;0,1,0;0,0,1)·getO`, similarly `getIh` from `getI`).

**Canonical testers** (`Symmetry.getCanonicalTester`, `:1986`, `TOL = 1e-10`, `gam = (√5+1)/2`):

| symmetry | tester | region |
|---|---|---|
| `E`, `C1` | `Test_E` | always `true` |
| `Oh` | `Test_Oh` | `v.y ≥ -TOL` ∧ `n₁·v ≥ -TOL` ∧ `n₂·v ≥ -TOL`, `n₁=(1,-1,0)̂`, `n₂=(-1,0,1)̂` — closed triangle (0,0,1),(1,1,1),(1,0,1) |
| `O` | `Test_O` | `n₁·v ≥ -TOL` ∧ `n₂·v ≥ -TOL`, then `v.y > -TOL` → **true** (upper triangle); otherwise requires **both** `n₃·v ≥ TOL` **and** `n₂·v ≥ TOL` (strict, `n₃=(1,1,0)̂`) — the mirrored *open* triangle (0,0,1),(1,-1,1),(1,0,1). Note `v.y` is never tested against `-TOL` as a rejection, unlike `Test_Oh` |
| `Ih` | `Test_Ih` | `v.x ≥ -TOL` ∧ `v.y ≥ -TOL` ∧ `n·v ≥ -TOL`, `n = ((1,0,gam) × (0,1/gam,gam))̂` |
| `I` | `Test_I` | closed triangle ∪ open mirror triangle, `n₂ = ((0,-1/gam,gam) × (1,0,gam))̂` |
| `D3d…D12d`, `D3…D12` (and `D4`→`Test_Dnd(4)`) | `Test_Dnd(n)` / `Test_Dn(n)` (bodies are **identical**) | `v.y ≥ 0` ∧ `v.z ≥ 0` ∧ `normal·v ≥ 0`, `normal = (sin φ, −cos φ, 0)`, `φ = 2π/n`. Note: plain `≥ 0`, **no TOL** |
| `T`, `Th`, `Td`, and every other string | `Test_Fake` | always `true` (the T/Th/Td branches are empty, falling through) |

**Behavioural consequence to replicate:** for `T`/`Th`/`Td`/unknown groups, `Test_Fake` returns
`true` for every member, so `count == cells.length`, `"!"` is printed, and `cIndex` ends up as
the **last** index (the loop keeps overwriting). The canonicalisation is then arbitrary but
deterministic.

### 5.5 `makeSymmetricalSubCells(SSCell superCell, String symmetry)` (`Stellation.java:2000`)

```
table = FastHashtable { cell.getCenter() -> cell }  for cell in superCell.cells
matrices = Symmetry.getMatrices(symmetry)
while table.size() > 0:
    cell = arbitrary element; scell = [cell]; table.remove(cell.getCenter())
    center = cell.getCenter()
    for i = 0 .. matrices.length-1:
        tc = center.mul(matrices[i])
        tcell = table.get(tc)
        if tcell != null: table.remove(tc); scell.append(tcell)
    sscell = new SSCell(scell, symmetry)
    sscell.setSuperCell(superCell)
    scells.append(sscell)
if scells.size() > 0: QSort.quickSort(scells, 0, scells.size()-1, (SSCell)scells.elementAt(0))
```

Structurally identical to `makeSymmetricalCells` except:
- it partitions the **parent orbit** rather than a whole layer,
- it sets `superCell` (and `setSubCells` sets each subcell's `superCell` again, redundantly),
- **it does NOT call `makeCanonicalOrder()`**. Subcells inherit the `SCell.index` values that
  the parent's `makeCanonicalOrder` already assigned, and the `SSCell` constructor sorts by
  them — which is exactly why `strictCompare` can compare index sequences.

`SSCell.setSubCells(Vector cells)` copies into `SSCell[] subCells` and back-links
`subCells[i].superCell = this`.

Typical usage: `fullSymmetry = "Ih"`, `stellSymmetry = "I"` → each achiral supercell splits
into a left- and a right-handed subcell (`handedness = ∓1`), which is exactly the
Miller/enantiomorph distinction the UI exposes.

### 5.6 Ordering — `strictCompare` and `compare`

```java
public int strictCompare(SSCell s1, SSCell s2){      // SSCell.java:330
    d = s1.cells.length - s2.cells.length;          if (d != 0) return d;   // orbit size
    for i in 0..s1.cells.length-1:
        d = s1.cells[i].getIndex() - s2.cells[i].getIndex();
        if (d != 0) return d;                                               // symmetry-index sequence
    d = s1.getNFacets()   - s2.getNFacets();         if (d != 0) return d;  // facets of cells[0]
    d = s1.getNVertices() - s2.getNVertices();       if (d != 0) return d;  // distinct vertices of the orbit
    return 0;
}

public int compare(Object fst, Object snd){           // SSCell.java:362
    int sdiff = strictCompare(scell1, scell2);  if (sdiff != 0) return sdiff;
    double vdiff = scell1.getVolume() - scell2.getVolume();
    if (Math.abs(vdiff) < EPS /* 1.e-4 */) return 0;   // "volumes are equal, what to do?"
    return vdiff < 0 ? -1 : +1;
}
```
`SCell.compare` (`SCell.java:160`) is `c1.index - c2.index` and is very much **live** — it is
the comparator passed as `cells[0]` in the `SSCell` constructor (`SSCell.java:45`) and in
`makeCanonicalOrder` (`SSCell.java:423`), i.e. it is what orders an orbit by symmetry index.
The one genuinely dead sibling is `SSCell.old_compare` (`SSCell.java:289`): volume
**descending**, then area descending, then handedness, `TOL = 0.0001` — no caller anywhere.

`compare` is **not a total order** — ties (`return 0`) are resolved by the **stability** of the
sort (see §7), which in turn depends on the hashtable enumeration order that produced the
input vector. This is the single biggest reproducibility hazard in the port.

---

## 6. The connectivity graph

```java
static public void makeConnectivityGraph(Vector allcells)     // Stellation.java:2096
```
Input: `Vector<Vector<SSCell>>` indexed by layer. Live caller:
`StellationController.initSubcells()` → `Stellation.makeConnectivityGraph(subcells)`, where
`subcells = makeSubcells(allcells)` flattens each layer's `cell.subCells` into a per-layer
vector (`StellationController:373`). **The graph is built on subcells, not supercells.**

```
# pass 1: stamp coordinates and reset
for layer in 0 .. allcells.size()-1:
    for j in 0 .. bcells.size()-1:
        bcell.setIndex(layer, j)         # sets SSCell.layer = layer, SSCell.index = j
        bcell.top.removeAllElements()
        bcell.bottom.removeAllElements()
        bcell.initTopAndBottom()

# pass 2: link consecutive layers only
for layer in 0 .. allcells.size()-2:
    bcells = allcells[layer];  tcells = allcells[layer+1]
    for bcell in bcells:
        for tcell in tcells:
            if bcell.isTopAdjacent(tcell):
                tcell.bottom.addElement(bcell)
                bcell.top.addElement(tcell)
```

### 6.1 What top/bottom mean, precisely

For an `SFace f`:
- `f.cellBelow` = the unique `SCell` for which `f` is a **top** facet (the cell on the origin
  side of `f`'s plane).
- `f.cellAbove` = the unique `SCell` for which `f` is a **bottom** facet (the cell on the far
  side). `null` if no cell above was ever built — true for the outermost layer, or when
  `maxLayer` truncated the build.

```java
void initTopAndBottom(){                    // SSCell.java:55
    if (isTopBottomInitialized) return;
    isTopBottomInitialized = true;
    for (SCell c : cells)
        for (SFace f : c.top)
            if (f.cellAbove != null) ttop.put(f.cellAbove, f.cellAbove);
}
boolean isTopAdjacentCell(SCell cell){ return ttop.get(cell) != null; }
boolean isTopAdjacent(SSCell topcell){
    for (SCell c : topcell.cells) if (isTopAdjacentCell(c)) return true;
    return false;
}
```
`ttop` is keyed by `SCell` **object identity** (`SCell` overrides neither `hashCode` nor
`equals`), so this is exact pointer matching, no geometry.

So: **`A.top` contains `B` iff some elementary cell of `A` has a top facet whose `cellAbove`
belongs to `B`** — i.e. the two orbits share at least one facet, with `A` below it and `B`
above it. `B.bottom` gets `A` in the same step, so the two vectors are always consistent.

`SSCell.top` / `SSCell.bottom` are `Vector<SSCell>`; there is no weight or facet count on the
edge, and multiplicities are not recorded (each pair is tested once per layer pair, so no
duplicates).

`printConnectivityGraph()` (`StellationController:348`) renders each node as
`layer.index: (bottom neighbours) (top neighbours)` using `c.layer + "." + c.index`.

### 6.2 Gotchas

- The `isTopBottomInitialized` guard means `initTopAndBottom` is **one-shot per object**.
  Calling `makeConnectivityGraph` twice on the *same* `SSCell` objects clears `top`/`bottom`
  and rebuilds them from a stale `ttop`. In practice `createSubcells(symmetry)` allocates
  fresh `SSCell` objects each time, so this is latent, not active.
- Because `makeCells2` does **not** call `makeConnectivityGraph`, supercell `SSCell.layer`
  and `SSCell.index` remain their default `0` on the `allcells` structure. Only subcells carry
  meaningful `(layer, index)`.
- The graph only links layers `l` and `l+1`. Two cells in the same layer sharing a vertical
  facet are **not** connected — the model is strictly a layered DAG.
- The commented-out `tbottom` machinery (`SSCell.java:29, 69-76, 91-100`) is the disabled
  symmetric half; don't port it.

### 6.3 Consumer semantics — facet cancellation

`Stellation.getPolyhedron(SSCell[] scells)` (`:593`) shows what selecting a set of cells
means. It builds `FastHashtable ftable` keyed by `SFace` (identity) with values
`topindex = new Integer(1)` / `bottomindex = new Integer(-1)`:

- facet seen only as a top facet → kept with `+1`
- facet seen only as a bottom facet → kept with `-1`
- facet seen as **both** (top of one selected cell, bottom of another) → `ftable.remove(face)`
  — it is interior to the union and cancels.
- otherwise print `"duplicate face in stellation!"`.

The `index == bottomindex` / `index == topindex` comparisons are Java **reference** equality
on those two `Integer` objects — safe here because those exact instances are the only values
ever stored.

`Stellation.getPolyhedron(SSCell scell)` (`:366`) emits top facets with their winding intact
(`icolor = 1`) and bottom facets with `iface[len-1-v]` — **reversed winding** (`icolor = 0`).
That reversal is the rendering-side statement of "bottom facets have opposite orientation".

> Bug in `getPolyhedron(SSCell)` worth *not* porting: line 393/410 do
> `vtable.put(index, face.vertices[v])` — key and value swapped, while the lookup is
> `vtable.get(face.vertices[v])`. The lookup therefore always misses and every vertex is
> emitted as a fresh index (vertex de-duplication silently disabled). `getPolyhedron(SSCell[])`
> does not have this bug.

---

## 7. Sorting: `QSort` is actually a stable merge sort

`pvs/utils/QSort.java`. Despite the name, `quickSort(Object[], lo, hi, Comparator)`
(`QSort.java:253`), `quickSort(Vector, …)` (`:258`) and `quickSort(FastVector, …)` (`:268`) all
delegate to `sort(a, fromIndex, toIndex, c)` → `mergeSort(...)`, which is the classic JDK
**stable** merge sort with insertion sort for runs `< 7`. The three *comparator-taking*
quicksorts (`_quickSort(Object[])`, `quickSort(Vector)`, `quickSort(FastVector)`) are commented
out. One real median-of-3 quicksort survives: `quickSort(int[], lo, hi)` at `QSort.java:91`,
whose only caller is `SCellIndex`'s constructor.

Consequences:
- `quickSort(v, 0, v.size()-1, c)` sorts the whole vector, but only because `lo`/`hi` happen to
  span it. Precisely: `sort` is called with `toIndex = hi+1` and sorts exactly `[lo, hi]`; the
  `Vector` overload then copies **the entire array back**, so elements outside `[lo, hi]` are
  left in place rather than being dropped. Do not read this as "`lo`/`hi` are ignored".
- **Ties preserve input order.** Since `SSCell.compare` returns 0 for cells that are
  topologically identical with volumes within `1e-4`, the final index of such a cell inside its
  layer is determined by hashtable enumeration order. Reproduce §8 exactly if you need the
  same cell numbering as the Java build.
- The comparator argument is frequently an *element of the array being sorted*
  (`quickSort(cells, 0, cells.length-1, cells[0])`). `SCell` and `SSCell` implement
  `pvs.utils.Comparator` (a 2-arg `compare(Object,Object)`, ignoring `this`), so this is
  harmless — but a JS port should hoist a standalone comparator function.

---

## 8. `FastHashtable` iteration order (needed for bit-identical output)

`pvs/utils/FastHashtable.java` is a 1995 `java.util.Hashtable` copy with a public
`printStatistic`. To reproduce cell numbering exactly you must reproduce its order:

- Default constructor: `initialCapacity = 101`, `loadFactor = 0.75f` → `threshold = 75`.
  `new FastHashtable(n)` → `loadFactor = 0.75f`, `threshold = (int)(n*0.75)`.
- Bucket: `index = (key.hashCode() & 0x7FFFFFFF) % table.length`.
- `put` **prepends** to the bucket chain (`e.next = tab[index]; tab[index] = e;`), so within a
  bucket, most-recently-inserted comes first.
- Rehash when `count >= threshold`: `newCapacity = oldCapacity*2 + 1`, and rehashing walks
  `i = oldCapacity-1 … 0`, prepending — i.e. it **reverses** chains.
- `elements()` / `keys()` iterate buckets from `table.length-1` **down to 0**
  (`HashtableEnumerator`: `this.index = table.length; while (index-- > 0)`), following each
  chain head-first.
- `get`/`put`/`remove` match on `(e.hash == hash) && e.key.equals(key)` — **hash first**, so a
  `Vector3D` key that is `equals`-close but hashes differently will **not** be found. This is
  why the pipeline canonicalises vertex objects.

Sites where enumeration order leaks into output:
`makeCellsFromLayers2` seed pick (`ttableCanon.elements().nextElement()`), `findAdjacentFace`
pool scan, `makeSymmetricalCells` / `makeSymmetricalSubCells` seed pick, and the
`tcells → Vector` conversion in `makeCellsFromFaceCells`.

---

## 9. End-to-end algorithm (the shape of the JS port)

```
1. Build planes:  canonical vectors first, then their orbits under fullSymmetry.
                  planes[i] = Plane(unit(v_i), |v_i|, i)
2. Cut facets:    for each canonical plane, start from a FACTOR=5e3 seed quad, cut by every
                  other plane (sortPlanes order: descending  plane.v · planes[j].v), maintaining
                  SFace.layer per §2. cleanFaces() drops |v| >= MAXVERTEX and degenerate polys.
                  Non-canonical planes' facets are rigid images (transformFace; reverse winding
                  when det(matrix) < 0).
3. layers = makeLayers(faces)                                # [layer][plane][facet]
4. for each layer i < min(maxLayer, layers.length):
     a. faceCells = adjacency walk over canonical-plane facets  (§3)
     b. cells     = orbit expansion under fullSymmetry          (§4.2)
     c. scells    = group cells into SSCells under fullSymmetry, canonicalise, sort  (§5.1)
     d. each SSCell gets subCells under stellSymmetry           (§5.5)
5. subcells = flatten allcells[l][c].subCells per layer
6. makeConnectivityGraph(subcells)                             (§6)
7. user selects a set of SSCells; render = union of their facets with top/bottom cancellation (§6.3)
```

---

## 10. JS PORTING NOTES

**Vector identity vs. equality.** The pipeline mixes three different comparison regimes and
they are not interchangeable:
- `==` (reference identity). Three different object types, don't conflate them:
  **`Vector3D` identity** in `SFace.adjacent` and `SFace.cleanVertices`;
  **`SFace` identity** in `findCell(Vector,int,int,int)` (`Stellation.java:2550`) and in every
  `SFace`-keyed `FastHashtable` (`SFace` overrides `hashCode` but not `equals`);
  **`Integer` identity** for the `topindex`/`bottomindex` sentinels in
  `getPolyhedron(SSCell[])`. Note the *other* overload, `findCell(SSCell[], Vector3D, boolean)`
  (`:2570`), uses `getCenter().equals(center)` — tolerance, not identity.
  In JS use object references and a `Map`/`Set` keyed by the object.
- `Vector3D.equals` (tolerance `1e-6`) inside hashtables keyed by centers.
- Raw `< 0` with **no** tolerance in `findAdjacentFace`'s half-space test.
Do not "unify" these; the algorithm's correctness depends on the vertex-canonicalisation step
making tolerance-equality and reference-equality coincide by the time cells are built.

**Hash/equals contract violation.** `Vector3D.hashCode` casts each of
`331345.563*x`, `412345.891*y`, `71341.678*z` to `int` separately and adds the three.
Two `equals`-close vectors can hash apart, and `FastHashtable` compares `e.hash`
before `equals`, so lookups can miss. If you replace the table with a JS `Map` + quantised
string key, expect *different* (probably better) results — but no longer bit-compatible.

Getting the arithmetic right needs care, and the two steps do **not** behave the same way:
- Java's `double → int` narrowing **truncates toward zero and then saturates**: out-of-range
  magnitudes clamp to `Integer.MAX_VALUE` / `Integer.MIN_VALUE`, `NaN → 0`. It does *not* wrap.
  `Math.trunc(x) | 0` wraps and is therefore **wrong** at the extremes; use an explicit clamp.
  (In practice coordinates stay under `MAXVERTEX = 2e3`, so `331345.563*2000 ≈ 6.6e8` is well
  inside range and saturation never fires — but a seed-face vertex at `FACTOR = 5e3` reaches
  `≈1.66e9`, uncomfortably close to `2^31−1`.)
- The subsequent `int + int + int` **does** wrap on 32-bit overflow — that part is `| 0`.
Then apply `& 0x7FFFFFFF` before `% tab.length`.

**`java.util.Vector` / `Hashtable`.** Plain ordered arrays and `Map`s. Note `SSCell` mixes
`FastHashtable` (`ttop`) with `java.util.Hashtable` (`countComponents`, `makeCanonicalOrder`) —
same semantics, different classes.

**`QSort` is a stable merge sort, not a quicksort (§7).** JS `Array.prototype.sort` is
required to be stable since ES2019, so a straight port works — but only if the *input order*
matches, which means reproducing `FastHashtable` enumeration order (§8).

**Comparators are instance methods on data objects.** `SCell`, `SSCell`, `SCellIndex` all
`implements Comparator` and are passed as `s[0]`. Hoist to free functions in JS.

**"0 means not cached" idiom.** `SCell.vol`, `SCell.area`, `SSCell.volume`, `SSCell.area`,
`SSCell.nVertices`, `SSCell.nComponents` use `0` as the sentinel. A genuinely zero-volume cell
recomputes forever (harmless, but don't "fix" it into a `null` sentinel if you want identical
timing/behaviour). `Vector3D.hashCode`'s cache field is effectively dead (§1.2).
`Matrix3D.getDeterminant` is the **exception**: it uses an explicit
`boolean isDeterminantInitialized` flag (`Matrix3D.java:99-106`), not a `0` sentinel, so a
genuinely singular matrix caches correctly there. `SFace.center` / `SFace.area` use `null`.

**Static mutable state in `Symmetry`.** `O`, `Oh`, `I`, `Ih`, `T`, `D2h`, `planes_Oh`,
`planes_Ih`, `planes_Td`, `planes_Th` are static lazily-initialised caches. `getE()`,
`getS2()`, `getCs()` **reassign their array elements on every call** while others guard with
`if (X == null)`. Also `Matrix3D.rotation(axis, angle)` calls `axis.normalize()`, which
**mutates the caller's vector**. In JS, freeze the group tables at module init and make
`rotation` non-mutating.

**Integer division / modulo.** `int mid = (lo + hi) / 2` in `QSort` is truncating; `(i-1+length)%length`
in `SFace.adjacent` is written with the `+length` guard already, so JS `%` is safe there — but
`(hash & 0x7FFFFFFF) % tab.length` needs `hash` forced to a 32-bit int first.

**`float` vs `double`.** Everything geometric is `double`. The only `float` is
`FastHashtable.loadFactor = 0.75f`, used in `(int)(capacity * loadFactor)`. JS `Number` is
`double`, so that's fine, but note `(int)(101*0.75) = 75`.

**Postfix-increment-in-assignment.** `lastout = (++lastout)%polysize` (`Stellation.java:1127`,
1133, 1141) is pre-increment assigned back — fine in JS, but `(i++)%n` patterns elsewhere would
not be; read each one carefully.

**`String`-keyed symmetry dispatch.** `Symmetry.getMatrices` / `getCanonicalTester` are long
`if/else` chains on exact strings like `"D3d(O)"`, `"C5v(I)"`. `StellationController.setSymmetry`
parses `"Ih / I"` with `StringTokenizer(symmetry, " /", false)` — delimiters are space **and**
slash, no empty tokens. In JS: `symmetry.split(/[\s\/]+/).filter(Boolean)`.

**`StreamTokenizer` parsing quirks** (file I/O, `StellationController.open`): the file format
is `word "quoted-string"` pairs (`polyhedron`, `cells`, `symmetry`, `planes`,
`exportLengthUnit`). `st.sval` holds both `TT_WORD` and quoted-string values, so the reader
just calls `nextToken()` and grabs `sval` without checking `ttype` — a numeric token there
would silently yield a stale/`null` `sval`. Any JS parser should be at least as permissive
about whitespace/comments (`//` line comments appear in the written files) and must not
number-parse bare tokens.

**Fidelity switches to decide up front.** Two places make the port either bug-compatible or
"correct" but different:
1. bottom-shell growth tested only against `tfaces` (§3.6),
2. `SSCell.compare` returning `0` on `|Δvolume| < 1e-4` (§5.6), leaving the layer ordering to
   hash iteration order.
If exact parity with the Java output (cell numbering used by saved `.stel` selections) matters,
port both verbatim plus `FastHashtable` (§8). If only the geometry matters, either is safe to
replace.

---

## 11. UNCERTAIN / could not determine from the source

- **UNCERTAIN:** whether the §3.6 bottom-shell limitation is ever exercised by the shipped
  sample polyhedra. Requires running the Java build and instrumenting `negCellCount` vs. the
  expected cell count per layer; static reading cannot settle it.
- **UNCERTAIN:** the exact intended semantics of `SSCell.nComponents`. `countComponents()`
  hardcodes `nComponents = 1` and the real counting loop is commented out
  (`SSCell.java:239-252`), so "number of connected components of a super-cell" is unimplemented.
  It is not used by `strictCompare`.
- **UNCERTAIN:** whether `SCellIndex` was ever intended as the canonical cell identity. It is
  fully implemented, its only caller `getSCellIndex()` is live, but every *use* of that caller
  is commented out, and the class's own comment disparages it. I found no persistence format
  that stores it.
- **UNCERTAIN:** what `cells "…"` in the saved stellation file looks like. `StellationController.open`
  parses it into a local `String cells` and the code says
  `// TODO: NEED TO GET THIS BACK TO THE CALLER`; the writer's `pw.printf("cells \"%s\"\n", selection.getCells())`
  is commented out at `StellationController:226`. The selection-serialisation format is therefore
  not recoverable from this file — it needs `samples/*.stel` inspection (out of scope here).
- **UNCERTAIN:** why `Test_Dn` and `Test_Dnd` have byte-identical bodies, and why `"D4"` maps to
  `Test_Dnd(4)` while `"D3"`, `"D5"`… map to `Test_Dn(n)`. Looks like a copy-paste artefact;
  behaviourally it makes no difference *today* because the bodies match.
- **UNCERTAIN:** whether `makeCells` (the older variant) still produces identical output to
  `makeCells2` for all inputs. They differ in which facets seed the walk, and the orbit-expansion
  path in `makeCells2` reuses `SFace` objects looked up by transformed center — a lookup that can
  fail (it prints `"! no top facet in ..."`). Whether that ever fires is a runtime question.
