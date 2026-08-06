# Spec 06 — The 2D Stellation Diagram

Reverse-engineered from the original Java. Everything below is quoted from or derived
from actual source; line numbers are given as `File.java:NNN` against the tree at
`/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation`.

## Source files read

| Path | Role |
|---|---|
| `src/main/java/pvs/polyhedra/Stellation.java` (2939 lines) | `getStellationDiagram`, `Diagram`, `createDiagram`, `getNonEquivalentFaces`, `Vector3DLengthComparator`, `intersect`, `translateFaces`, `rotateFaces`, `getMaxRadius`, `findCell` |
| `src/ui/java/pvs/polyhedra/ui/StellationCanvas.java` (1423 lines) | the whole interactive 2D view: projection, view transform, painting, hit-testing, mouse/keyboard, zoom/pan/rotate, scrollbars, PS print |
| `src/ui/java/pvs/utils/ui/Graphics2D.java` | world↔screen transform, polygon fill/draw, Cohen–Sutherland line clip |
| `src/main/java/pvs/utils/Viewport.java`, `ViewRect.java`, `Point2.java` | plain data holders |
| `src/main/java/pvs/polyhedra/IGraphics2D.java` | 3-method interface (`setColor`, `drawLine`, `fillControlSquare`) — **not used by the diagram**, `StellationCanvas` uses the concrete `pvs.utils.ui.Graphics2D` |
| `src/main/java/pvs/polyhedra/{SFace,Plane,Axis,Vector3D,PolyShape,SCell,SSCell}.java` | geometry records |
| `src/main/java/pvs/polyhedra/Symmetry.java` | `getAxes`, `getSymmetryPlanes`, `getMatrices` |
| `src/main/java/pvs/utils/FastHashtable.java` | the hashtable whose identity semantics the algorithm depends on |
| `src/ui/java/pvs/polyhedra/ui/StellationUI.java`, `.../stellation/ui/StellationMain.java`, `Selection.java` | call sites / click → selection wiring |

---

## 1. What the diagram *is*

A stellation diagram is one **face plane** of the core polyhedron, showing the complete
arrangement of lines where every *other* face plane cuts it. That arrangement carves the
plane into 2D convex regions ("facets"). The picture has four layers of content:

1. **The line pattern** — the outlines of *all* facets lying in plane `findex`.
   Source: `Stellation.faces[findex]`, an `SFace[]`. In the canvas these become
   `fpoly : Point2[][]`, drawn black (or gray when symmetry lines are on).
   This is the classic "stellation diagram" engraving.
2. **The filled facets** — the subset of those facets that form the *boundary* of the
   currently selected 3D cell set, tinted by which side of the plane the solid is on.
   Source: `getStellationDiagram(scells, pindex)` → `createDiagram(...).faces`.
   In the canvas these become `levels : Point2[level][poly][vertex]` with
   `level ∈ {0,1}` (0 = bottom face, 1 = top face).
3. **Symmetry mirror lines** — the segments where each mirror plane of the symmetry
   group cuts this face plane. `Diagram.planes : Vector3D[nPlanes][2]`, canvas field
   `symLines : Point2[][]`. Optional (`Sym. Lines` checkbox), drawn black.
4. **Symmetry axis punctures** — the points where each rotation axis of the symmetry
   group pierces this face plane, drawn as a filled disc colored by axis order.
   `Diagram.axes : Axis[]`, canvas fields `symAxes : Point2[]`, `symAxesOrder : int[]`.
   Optional (`Axes` checkbox).

The user clicks a facet to toggle the 3D cell above or below it into/out of the
stellation; the fills then update.

### Pipeline (call sites: `StellationMain.java:817-850`, `StellationUI.java:20-59`)

```
selection (int[][] {layer,index} pairs)
  └─ stellation.getStellation(subcells, st)          -> SSCell[] cells
      └─ Stellation.getStellationDiagram(cells, faceToShow)   -> Object[][] facets  (§3)
          └─ stellation.createDiagram(faceToShow, vertexUp, symmetry, facets) -> Diagram  (§4)
              └─ new/updated StellationCanvas(d.faces, d.ffaces, d.axes, d.planes) (§5..§9)
```

`faceToShow` and `vertexUp` are plain `int` fields on `StellationMain`
(`StellationMain.java:142-143`, both default `0`), each driven by a `Choice` initially
populated with the literal strings `"0".."9"` (`StellationMain.java:326-329`). Once a
polyhedron is loaded, `initSubcells()` does `choice_face.removeAll()` and refills the
*face* dropdown with `getNonEquivalentFaces()` — the item labels are then the actual plane
indices, not `0..9` — and disables the dropdown when only one representative exists
(`StellationMain.java:646-658`). The `vertexUp` dropdown keeps `0..9` forever. The `int`
fields themselves are only written by the two `ItemListener`s
(`StellationMain.java:1304`, `1315`).

---

## 2. Data structures

### 2.1 `Stellation` fields used here

```java
public SFace[][] faces;   // Stellation.java:34  faces[planeIndex][facetIndex]
double maxRadius = 0;     // Stellation.java:2494 lazily computed cache
```

`faces[p]` is the list of all facets of the arrangement lying in plane `p`, built by
`makeStellationFaces` (`Stellation.java:992-1038`). **The index `facetIndex` into
`faces[findex]` is the identity used for hit-testing and for cell lookup — it must be
preserved verbatim by the port.**

### 2.2 `SFace` (`SFace.java`)

```java
public SCell cellAbove;      // the cell that has this face among its `bottom` faces
public SCell cellBelow;      // the cell that has this face among its `top` faces
public int layer = 0;        // stellation layer  (REPURPOSED by createDiagram, see §4)
public Vector3D[] vertices;  // polygon, in order
private Plane plane;         // null in copies! (see below)
Vector3D center = null;      // lazily cached

public Vector3D getCenter();      // mean of vertices, cached in `center`
public double   getRadius();      // max |vertex|
public Plane    getPlane();
public int      getPlaneIndex();  // == plane.index
public int      hashCode();       // == getCenter().hashCode()
// NO equals() override -> Object identity
```

**Copy constructor (`SFace.java:44-50`) deep-copies `vertices` but copies neither
`plane` nor `center`.** So every `SFace` inside a `Diagram` has `plane == null` and a
freshly-lazy `center`. Do not call `getPlaneIndex()` on diagram faces.

`SCell`'s constructor (`SCell.java:44-58`) wires the back-pointers:

```java
for (t : top)    top[t].cellBelow  = this;
for (b : bottom) bottom[b].cellAbove = this;
```

so a facet is a *shared object*: it is simultaneously the `top` face of the cell
underneath it and the `bottom` face of the cell above it. That sharing is what makes
§3 work.

Orientation convention: cells at layer *i* are built with `topfaces = layers[i]`,
`bottomfaces = layers[i-1]` (`Stellation.java:1613-1616`, `1692-1694`), and layer index
grows outward from the core. `Plane.d ≥ 0` with `Plane.v` pointing away from the origin.
Therefore **"top" = the +normal (outward) side, "bottom" = the −normal (inward) side.**

UNCERTAIN: that `d ≥ 0` / outward-`v` invariant is **not enforced by the constructor the
stellation actually uses.** Face planes are built by `Stellation.getPlane(Polyhedron,int)`
(`Stellation.java:946-956`) → `new Plane(normal, dot, face)`, i.e. `Plane.java:38-45`,
which just stores `d` as given and normalizes `v` — no sign fix. It works out only because
`Polyhedron.makeCCW()` has already forced CCW winding and the core is convex with the
origin inside, which makes `normal = (v2−v1)×(v0−v1) = (v1−v0)×(v2−v1)` outward and
`d = normal·v1 > 0`. The vectors-file path (`Stellation.java:105-112`, `975-983`) uses
`new Plane(v, len, i)` with `len = |v| ≥ 0`, so `d ≥ 0` holds there by construction.
The self-orienting three-point constructor `Plane(v0,v1,v2,index)` (`Plane.java:83-108`,
which *does* flip when `d < -TOLERANCE`) is used **only** by `PolygonDisplay.java:242` and
is not on this path — do not rely on it. A port should assert `plane.d >= 0` after load.

### 2.3 `Plane` (`Plane.java`)

```java
public Vector3D v;   // UNIT normal
public double d;     // signed distance from origin;  plane = { x : v·x = d }
public int index;
static final double TOLERANCE = 1.e-10;   // used by equals() and by intersect()
public int hashCode() {  // Plane.java:113-121
    return (int)(3345.563*v.x) + (int)(4345.891*v.y) + (int)(7341.678*v.z) + (int)(4134.178*d);
}
public boolean equals(Object o); // componentwise |Δ| < 1.e-10 on (v.x,v.y,v.z,d)
```

### 2.4 `Axis` (`Axis.java`)

```java
public int order;         // 2,3,4,5 for rotation order; used as a color index
public Vector3D vector;   // in Symmetry: the axis DIRECTION (not normalized)
                          // in Diagram:  the INTERSECTION POINT with the face plane
```

### 2.5 `Vector3D` (`Vector3D.java`) — the pieces the diagram needs

```java
static final double tolerance = 1.e-6;  // equals()/collinear()
static double TOL = 1.e-10;             // rotateSet(from,to) degeneracy cutoff
int hashCode = 0;                       // DEAD cache field, see below
public int hashCode(){                  // Vector3D.java:279-286
    if(hashCode != 0) return hashCode;  // never taken — field is never written non-zero
    return (int)(331345.563*x)+(int)(412345.891*y)+(int)(71341.678*z);
}
public boolean equals(Object o);        // componentwise |Δ| < 1.e-6
```

**The `hashCode` field is not a working memo.** `hashCode()` computes `value` and returns
it *without ever storing it* (`Vector3D.java:279-286`). The only writes to the field are
the `hashCode = 0;` lines in every mutator (`Vector3D.java:34, 43, 55, 67, 83, 91, 133,
150, 158, 195, 204`), so the field stays `0` forever and the fast path is dead code. Net
effect: the hash is **always recomputed from the live coordinates**. Port it as a plain
function of `(x,y,z)`; there is nothing to invalidate.

Rotation, Rodrigues form (`Vector3D.java:180-185`):

```java
Vector3D rotate(Vector3D k, double sin, double cos){
    Vector3D p = k.mul(this.dot(k));               // (v·k)k
    p.addSet(this.sub(p).mulSet(cos));             // + (v − (v·k)k)·cos
    p.addSet(k.cross(this).mulSet(sin));           // + (k × v)·sin
    return p;
}
```

"Rotate `from` onto `to`" (`Vector3D.java:227-239`) — **both arguments must already be
unit vectors**:

```java
public void rotateSet(Vector3D from, Vector3D to){
    Vector3D axis = from.cross(to);
    double sinangle = axis.length();
    double cosangle = from.dot(to);
    if (sinangle > TOL || sinangle < -TOL) {   // TOL = 1.e-10
        axis.normalize();
        rotateSet(axis, sinangle, cosangle);
    }
    // else: NOTHING HAPPENS  (see §11 quirk Q1)
}
```

### 2.6 `Diagram` (`Stellation.java:2807-2813`)

```java
public class Diagram {
    public SFace[]     faces;   // selected boundary facets, layer := 0|1 flag
    public SFace[]     ffaces;  // ALL facets of plane findex, in original index order
    public Axis[]      axes;    // per symmetry axis: intersection point, or null
    public Vector3D[][] planes; // per mirror plane: 2 endpoints, or null
}
```

All coordinates in a `Diagram` are already **translated and rotated into diagram space**:
the plane is `z ≈ 0`, so the 2D picture is just `(x, y)`.

### 2.7 `Point2` / `Viewport` / `ViewRect`

```java
class Point2  { double x, y; }                                  // Point2.java
class Viewport{ double left, top, right, bottom; }              // Viewport.java (world)
class ViewRect{ int    left, top, right, bottom; }              // ViewRect.java (pixels)
```

Note `Viewport(left, top, right, bottom)` and `ViewRect(left, top, right, bottom)` —
argument order is L,T,R,B in both constructors even though the fields are declared
top,left,right,bottom.

---

## 3. `getStellationDiagram(SSCell[] scells, int pindex)` — pick the boundary facets

`Stellation.java:2633-2705`. Static. Returns `Object[][] facets` where
`facets[i][0]` is an `SFace` and `facets[i][1]` is an `Integer` **1 = top, 0 = bottom**.

```java
FastHashtable ftable = new FastHashtable();
Integer topindex    = new Integer(1);
Integer bottomindex = new Integer(0);

for each SSCell scell in scells:
  for each SCell cell in scell.cells:
    for each SFace face in cell.top:
       if (face.getPlaneIndex() != pindex) continue;
       Integer index = ftable.get(face);
       if (index == null)            ftable.put(face, topindex);
       else if (index == bottomindex) ftable.remove(face);
       else  println("duplicate face in stellation!");
    for each SFace face in cell.bottom:
       if (face.getPlaneIndex() != pindex) continue;
       Integer index = ftable.get(face);
       if (index == null)          ftable.put(face, bottomindex);
       else if (index == topindex)  ftable.remove(face);
       else  println("duplicate face in stellation!");

// flatten
Object[][] facets = new Object[ftable.size()][2];
for (Enumeration keys = ftable.keys(); keys.hasMoreElements();) {
    SFace face = (SFace)keys.nextElement();
    facets[count][0] = face;
    facets[count][1] = ftable.get(face);
    count++;
}
```

**Semantics.** Because a facet object is shared between the cell below it (as `top`) and
the cell above it (as `bottom`), a facet that is interior to the selected set gets
inserted once and then cancelled — leaving exactly the *outer boundary* facets of the
selected solid that lie in plane `pindex`, each tagged with which side of the plane the
solid is on.

**Identity semantics — critical.** `FastHashtable.get/put/remove` test
`(e.hash == hash) && e.key.equals(key)` (`FastHashtable.java:220-230, 310-343,
351-367`). `SFace` overrides `hashCode()` (= center's hash) but **not** `equals()`, so
matching is **reference identity** with a geometric hash bucket. The port must key on
object identity (JS `Map` does exactly this) — do **not** key on center coordinates.

`index == bottomindex` / `index == topindex` are **reference** comparisons on `Integer`
objects, which are the very singletons stored in the table, so they behave as intended.

`ftable.keys()` iterates buckets from `table.length-1` down to `0`, newest-first inside a
bucket (`FastHashtable.java:421-457`) — i.e. the output order is hash-dependent and
*not* stable across implementations. This only affects fill order of disjoint polygons,
so it is visually irrelevant; do not try to reproduce it.

---

## 4. `createDiagram(int findex, int vertexUp, String symmetry, Object[][] facets)`

`Stellation.java:2815-2936`. Instance method. Builds the projected, oriented `Diagram`.

### Step 1 — choose the reference facet

```java
int index = 0;
double rMin = 1.e20;
SFace[] ffaces = this.faces[findex];
for (int i = 0; i < ffaces.length; i++) {
    double r = ffaces[i].getCenter().length2();   // squared length
    if (r < rMin) { rMin = r; index = i; }
}
```

The facet of plane `findex` whose centroid is **closest to the origin**. For a convex
core polyhedron this is the original polyhedron face itself (layer 0). (A commented-out
alternative selected the facet with the lowest `layer`.)

### Step 2 — deep copies (originals are never mutated)

```java
SFace[] nsfaces = new SFace[facets.length];
for (i) { nsfaces[i] = new SFace((SFace)facets[i][0]);
          nsfaces[i].layer = ((Integer)facets[i][1]).intValue(); }   // layer := 0|1 flag !
SFace[] nffaces = new SFace[ffaces.length];
for (i) { nffaces[i] = new SFace(ffaces[i]); }
```

**`layer` is overloaded here.** In `nsfaces` it no longer means "stellation layer"; it
carries the top/bottom flag, and `StellationCanvas.setFaces` later uses it as the color
bucket index (§7). `nffaces` keeps whatever `layer` the original facet had, but the
canvas never reads it.

### Step 3 — symmetry axes ∩ plane

```java
Axis[] symAxes = Symmetry.getAxes(symmetry);      // shared STATIC arrays, see JS notes
Axis[] axes    = new Axis[symAxes.length];
Plane  plane   = this.faces[findex][0].getPlane();
for (i) {
    Vector3D v = Stellation.intersect(plane, symAxes[i].vector);
    if (v != null) axes[i] = new Axis(v, symAxes[i].order);   // null stays null
}
```

`Stellation.intersect(Plane p, Vector3D v)` (`Stellation.java:846-852`) — the point where
the line `t·v` through the origin meets the plane:

```
denom = p.v · v
if (|denom| < Plane.TOLERANCE)  // 1.e-10
    return null                 // axis parallel to the plane
return v * (p.d / denom)
```

`Symmetry.getAxes` returns unnormalized direction vectors (`Symmetry.java:1234-1300`;
e.g. `new Axis(new Vector3D(1,1,1), 3)`) — harmless, since the formula is scale-invariant.
Orders present: 2,3,4 for `O`/`Oh`; 2,3,5 for `I`/`Ih`; 2,3 for `T`/`Th`/`Td`. Any other
symmetry string returns `new Axis[0]`.

### Step 4 — symmetry mirror planes ∩ plane

```java
Plane[]      symPlanes = Symmetry.getSymmetryPlanes(symmetry);   // all have d == 0
Vector3D[][] planes    = new Vector3D[symPlanes.length][];
double maxradius = this.getMaxRadius();
for (i) planes[i] = Stellation.intersect(plane, symPlanes[i], maxradius);
```

`getMaxRadius()` (`Stellation.java:2494-2506`) = max over **all** facets of **all** planes
of `SFace.getRadius()` = the outermost vertex of the whole arrangement. Cached in
`maxRadius`, with the sentinel `if (maxRadius == 0) recompute`.

`Stellation.intersect(Plane P1, Plane P2, double r)` (`Stellation.java:858-879`):

```
EPSILON = 0.001            // local, NOT Plane.TOLERANCE
T   = P1.v × P2.v                        // direction of the intersection line
T1  = T × P1.v                           // lies in P1, ⟂ T
t1p2 = T1 · P2.v
if (|t1p2| < EPSILON) return null        // planes parallel / too shallow
t1  = (P2.d − P1.d·(P2.v · P1.v)) / t1p2
P   = T1·t1 + P1.v·P1.d                  // the point of the line closest to origin
d   = (r*r + 1) − P·P
if (d <= 0) return null                  // line misses the clipping sphere
t12 = sqrt(d / (T·T))
points[0] = P + T·t12
points[1] = P − T·t12
```

Because `P ⟂ T`, both endpoints land exactly on a sphere of radius `sqrt(r² + 1)`. The
`+1` is an unexplained absolute-scale fudge that guarantees the segment overshoots the
diagram — see UNCERTAIN U1.

`Symmetry.getSymmetryPlanes` (`Symmetry.java:1387-1428`) lazily builds and **mutates**
static arrays (`planes[i].normalize()` on the shared `Vector3D`s) and returns
`new Plane(planes[i], 0., i)`. 15 planes for `Ih`/`I`, 9 for `Oh`/`O`, 6 for `Td`/`T`,
3 for `Th`, 0 otherwise.

### Step 5 — translate the reference facet centroid to the origin

```java
SFace    face   = nffaces[index];
Vector3D center = face.getCenter();          // computed from the COPY, before translation

Stellation.translateFaces(nsfaces, center);  // v.subSet(center) for every vertex
Stellation.translateFaces(nffaces, center);
for (i) if (axes[i]   != null) axes[i].vector.subSet(center);
for (i) if (planes[i] != null) { planes[i][0].subSet(center); planes[i][1].subSet(center); }
```

`center` is a fresh `Vector3D` (built by `getCenter()` via `new Vector3D(vertices[0])` then
`addSet`/`mulSet`), so it is not aliased to any vertex and stays valid throughout the
loop. It does leave `face.center` cached at a now-stale value; nothing reads it later.

### Step 6 — rotate the plane normal to +Z

```java
Vector3D y = new Vector3D(0,1,0);
Vector3D z = new Vector3D(0,0,1);
Vector3D[] vert = face.vertices;                                   // already translated
Vector3D normal = vert[1].sub(vert[0]).cross(vert[2].sub(vert[1]));
normal.normalize();

Stellation.rotateFaces(nffaces, normal, z);   // note: ffaces FIRST here
Stellation.rotateFaces(nsfaces, normal, z);
for (i) if (axes[i]   != null) axes[i].vector.rotateSet(normal, z);
for (i) if (planes[i] != null) { planes[i][0].rotateSet(normal,z); planes[i][1].rotateSet(normal,z); }
```

`normal = (v1−v0) × (v2−v1)`. Facets are wound CCW as seen from the outward side —
`makeSeedFace(Plane,int)` builds the seed square CCW in a right-handed `(y, z, n)` basis
(`Stellation.java:1250-1279`) and `Polyhedron.makeCCW()` (`Polyhedron.java:73-89`) forces
`v0 × v1 · center > 0`. Hence **`normal` equals the plane's outward unit normal, and the
finished diagram is the view of the face plane from *outside* the polyhedron, with world
`+x` right and `+y` up.**

`rotateFaces` (`Stellation.java:2476-2483`) mutates every vertex in place with
`v.rotateSet(from, to)`. `normal` is a freshly allocated vector, so there is no aliasing
with the data being rotated.

### Step 7 — `vertexUp`: spin the picture inside the plane

```java
if (vertexUp < face.vertices.length) {
    Vector3D v1 = new Vector3D(face.vertices[vertexUp]);   // COPY, post step-6
    v1.normalize();
    Stellation.rotateFaces(nsfaces, v1, y);                // note: sfaces FIRST here
    Stellation.rotateFaces(nffaces, v1, y);
    for (i) if (axes[i]   != null) axes[i].vector.rotateSet(v1, y);
    for (i) if (planes[i] != null) { planes[i][0].rotateSet(v1,y); planes[i][1].rotateSet(v1,y); }
}
```

**What `vertexUp` does:** it selects which vertex of the *reference facet* (the innermost
facet of plane `findex` — for a convex core, the original polyhedron face) is rotated to
point along the diagram's `+Y` axis. Because `v1` already lies in the `z ≈ 0` plane, the
rotation axis `v1 × y` is along `±z`, so this is a pure in-plane spin — e.g. it turns a
pentagonal face diagram point-up vs. edge-up.

Guard: if `vertexUp >= face.vertices.length` **the whole block is skipped** and the
diagram keeps whatever azimuth step 6 produced. No wraparound, no clamping. The UI offers
`0..9` regardless of the actual vertex count (`StellationMain.java:326-329`).

`v1` is copied before use, so rotating `nffaces` (which contains `face`) does not corrupt
the rotation being applied.

### Step 8 — package

```java
Diagram diagram = new Diagram();
diagram.axes   = axes;      // entries may be null
diagram.faces  = nsfaces;   // layer ∈ {0,1}
diagram.ffaces = nffaces;
diagram.planes = planes;    // entries may be null
return diagram;
```

---

## 5. `getNonEquivalentFaces(String symmetry)` — which planes are worth showing

`Stellation.java:2708-2744`. Populates the "face" dropdown, so the user only sees one
representative per symmetry orbit of planes.

```java
Matrix3D[] sym = Symmetry.getMatrices(symmetry);
FastHashtable table = new FastHashtable();
table.put(faces[0][0].getPlane(), new Integer(0));       // plane 0 always kept

for (int i = 1; i < faces.length; i++) {
    Plane plane = faces[i][0].getPlane();
    boolean found = false;
    for (int s = 0; s < sym.length; s++) {
        Plane pl = new Plane(plane.v.mul(sym[s]), plane.d, s);   // rotate normal, keep d
        if (table.get(pl) != null) { found = true; break; }
    }
    if (!found) table.put(plane, new Integer(i));
}

Integer[] ind = new Integer[table.size()];
// ... collect table.get(plane) for every key ...
QSort.quickSort(ind, 0, ind.length-1, new IntegerComparator());
return ind;                                              // sorted ascending, deterministic
```

Here the hashtable keys are `Plane`s, which **do** override `equals` (componentwise
tolerance `1.e-10`) and `hashCode`. Note the mismatch: `equals` is tolerant but `hashCode`
is a truncating `(int)` cast of scaled coordinates, so two planes that compare equal can
land in different buckets when a scaled coordinate straddles an integer boundary. This is
a latent bug — see UNCERTAIN U2.

`Vector3DLengthComparator` (`Stellation.java:2773-2785`) is unrelated to the diagram: it
is a `pvs.utils.Comparator` ordering `Vector3D` by `length()`, used only by the debug
helper `printSortedVertices(FastHashtable, int)` (`Stellation.java:2759-2771`), which
prints the shortest `maxCount` vertices. Nothing in the diagram path calls it. The port
can skip it.

---

## 6. `StellationCanvas`: 3D → 2D

`StellationCanvas.java:280-343` (`setFaces(SFace[] faces, SFace[] ffaces, Axis[] axes,
Vector3D[][] planes)`).

**The projection is: drop `z`.** (`StellationCanvas.java:412-417`)

```java
void transform(Vector3D[] vect, Point2[] point){
    for (int i=0; i < vect.length; i++) { Vector3D v = vect[i]; point[i] = new Point2(v.x, v.y); }
}
```

That is legitimate only because `createDiagram` already rotated the face plane onto
`z = 0`. There is no perspective, no scaling, no z test.

Full body of `setFaces(faces, ffaces, axes, planes)`:

```java
this.faces = ffaces;                 // (!) the field is overwritten with ffaces, not faces

maxlevel = -1;
for (i) if (faces[i].layer > maxlevel) maxlevel = faces[i].layer;      // -> 1, 0, or -1
int[] lcount = new int[maxlevel+1];
for (i) lcount[faces[i].layer]++;
levels = new Point2[maxlevel+1][][];
for (i) levels[i] = new Point2[lcount[i]][];
int[] counter = new int[maxlevel+1];
for (i) { int level = faces[i].layer;
          Point2[] points = new Point2[faces[i].vertices.length];
          transform(faces[i].vertices, points);
          levels[level][counter[level]++] = points; }

fpoly = new Point2[ffaces.length][];
for (i) { Point2[] points = new Point2[ffaces[i].vertices.length];
          transform(ffaces[i].vertices, points);
          fpoly[i] = points; }

if (axes != null)   { symAxes = new Point2[axes.length]; symAxesOrder = new int[axes.length];
                      for (i) if (axes[i] != null) { symAxes[i] = new Point2(axes[i].vector.x, axes[i].vector.y);
                                                     symAxesOrder[i] = axes[i].order; } }
if (planes != null) { symLines = new Point2[planes.length][];
                      for (i) if (planes[i] != null)
                          symLines[i] = new Point2[]{ new Point2(planes[i][0].x, planes[i][0].y),
                                                      new Point2(planes[i][1].x, planes[i][1].y) }; }
initCurrentMatrix();
rotate(current_matrix);      // identity in practice; its real effect is adjustScrollbars()
canvas.repaint();
```

Note `this.faces = ffaces`: after `setFaces`, the canvas field `faces` holds **all facets
of the plane**, index-aligned with `fpoly`. `mousePressed` relies on that alignment
(`StellationCanvas.java:896`).

`setFaces` deliberately does **not** call `findWidth()` — see §7.

`findWidth()` (`StellationCanvas.java:360-389`):

```java
double r = 0;
for each poly in fpoly, for each vertex v:  r = max(r, v.length2());
polyDiameter = 2*sqrt(r);
if (polyDiameter == 0.0) polyDiameter = 1;
Width    = polyDiameter;
centerX  = 0;  centerY = 0;
```

so the initial view frames the entire line pattern (not just the core face).

---

## 7. View transform (world ↔ screen)

`initViewport` (`StellationCanvas.java:526-535`) + `Graphics2D.initTransform`
(`Graphics2D.java:86-95`).

```java
// StellationCanvas
int d = (width > height) ? height : width;      // MIN of the two
int borderWidth = 4;
double wx = Width*(width  - 2*borderWidth)/(d - 2*borderWidth);
double wy = Width*(height - 2*borderWidth)/(d - 2*borderWidth);
g2d.setViewport(new Viewport(centerX - wx/2, centerY + wy/2, centerX + wx/2, centerY - wy/2));
g2d.setScreenRectangle(new ViewRect(borderWidth, borderWidth, width-borderWidth, height-borderWidth));

// Graphics2D
scalex = (screenRect.right - screenRect.left) / (viewport.right - viewport.left);
scaley = (screenRect.top   - screenRect.bottom) / (viewport.top - viewport.bottom);
x0 = -viewport.left + screenRect.left/scalex;
y0 = -viewport.top  + screenRect.top /scaley;

double x2screen(double x) { return scalex*(x + x0); }
double y2screen(double y) { return scaley*(y + y0); }
Point2 screen2world(int x, int y) { return new Point2(x/scalex - x0, y/scaley - y0); }
```

Substituting, with `b = 4` and `s = (d − 2b)/Width`:

```
scalex =  s
scaley = −s                      (Y is flipped: world +Y is up on screen)
x2screen(x) = b + s·(x − centerX + wx/2)
y2screen(y) = b + s·(centerY + wy/2 − y)
screen2world(px,py) = ( centerX − wx/2 + (px − b)/s ,  centerY + wy/2 − (py − b)/s )
```

`Width` is therefore the world-space extent spanned by the **shorter** canvas dimension,
minus a 4 px border on every side; the aspect ratio is preserved exactly.

`initTransform` no-ops until *both* viewport and screenRect have been set, so the first
`setViewport` of a fresh `Graphics2D` does nothing and the following
`setScreenRectangle` computes the transform.

### Zoom / pan / rotate

```java
public void zoom(double factor){ Width /= factor; canvas.repaint(); adjustScrollbars(); }
public void pan(double sx, double sy){ centerX -= Width*sx; centerY -= Width*sy;
                                       canvas.repaint(); adjustScrollbars(); }
```

Autorepeat while a button is held (`StellationCanvas.java:1137-1341`); `m_initialDelay =
300` ms before repeat starts, then per-frame deltas from wall-clock:

| Control | Constants | Per-frame amount |
|---|---|---|
| `+` / `-` (`ZoomListener`) | `initialZoom = 1.01`, `zoomSpeed = 1.5` | `factor = exp(1.5 · 0.001·Δt_ms)`; `-` uses `1/factor` |
| `^ v < >` (`PanListener`) | `panSpeed = 0.5`, `clickPanAmount = 0.01` | `shift = 0.001·Δt_ms·0.5`; up→`pan(0,+s)`, down→`pan(0,−s)`, left→`pan(−s,0)`, right→`pan(+s,0)` |
| `L` / `R` (`RotateListener`) | `initialRotation = π/1800`, `rotationSpeed = π/18` | `angle = 0.001·Δt_ms·π/18`, times `sign` (`R`=+1, `L`=−1) |

Rotation is **destructive** — `rotate(double[][] matrix)` (`StellationCanvas.java:650-709`)
rewrites every `Point2` of `levels`, `fpoly`, `symLines`, `symAxes` in place:

```java
double t = m00*point.x + m01*point.y;
point.y   = m10*point.x + m11*point.y;
point.x   = t;
```

with `RotateListener.doRotation`: `m00=m11=cos(a)`, `m01=−sin(a)`, `m10=+sin(a)`.
`rotate_matrix()` exists but its call is commented out inside `rotate()`, and the
`Angle` field is never assigned, so `current_matrix` (built by `initCurrentMatrix()` from
`Angle = 0`) is always the identity. Consequence: **any interactive rotation is discarded
the next time `setFaces` runs** (i.e. on every selection change), because the `Point2`s
are rebuilt from the 3D data. Zoom and pan *do* survive, because `Width`/`centerX`/
`centerY` are untouched by `setFaces` and `findWidth()` is only called from `init()`
(`StellationCanvas.java:197-201`). `init()` in turn has exactly two call sites: the tail
of `initUI()` (`StellationCanvas.java:186`, i.e. once when the canvas is first
constructed, right after the `setFaces` at line 181 has populated `fpoly`) and
`StellationMain.initSubcells()` (`StellationMain.java:644`, on load of a new
polyhedron). Nothing else ever resets the view.

(Note `initCurrentMatrix()` uses the *transposed* sign convention relative to
`RotateListener.doRotation` — `m01 = +sin(fi)`, `m10 = −sin(fi)`,
`StellationCanvas.java:345-353`. Irrelevant in practice since `Angle` is always 0.)

### Scrollbars

`sbMaximum = 100000`, initial `sbVisible = 100000`. `adjustScrollbars()`
(`StellationCanvas.java:613-633`):

```java
sbVisible = (int)(sbMaximum * Width / polyDiameter);
y = (int)((sbMaximum - sbVisible) * 0.5 * (1 - 2*centerY/polyDiameter));
x = (int)((sbMaximum - sbVisible) * 0.5 * (1 + 2*centerX/polyDiameter));
unitInc = max(1, (int)((sbMaximum - sbVisible) * (0.01*Width/polyDiameter)));
blockIncrement = unitInc*50;
```

and the inverse in the listeners (`StellationCanvas.java:1343-1367`):

```java
centerX = 0.5*polyDiameter*( 2.*x/(sbMaximum - sbVisible) - 1);
centerY = 0.5*polyDiameter*( 1 - 2.*y/(sbMaximum - sbVisible));
```

At the default zoom `Width == polyDiameter` ⇒ `sbVisible == sbMaximum`, so
`sbMaximum - sbVisible == 0`. In `adjustScrollbars` that is only a *multiplier*, so it
harmlessly yields `x = y = 0` and `unitInc = 1`; the division by zero is in the two
`AdjustmentListener`s (`StellationCanvas.java:1349, 1361`), which produce `NaN`/`±Infinity`
silently in both Java and JS. A port should special-case `Width >= polyDiameter` and just
disable the scrollbars.

---

## 8. Rendering

`paintCanvas(Graphics)` → `paintCanvas(g,w,h)` → `drawContent(g,w,h)` → `drawContent(Graphics2D)`
(`StellationCanvas.java:424-598`). Double buffered into an offscreen `Image` recreated
whenever the size changes; cleared to `Color.white`. The panel background is also white
(`initUI`). At the end of `paintCanvas(Graphics)`, `oldPolyIndex = -1`.

```java
public void drawContent(Graphics2D g){
    if (levels == null) return;

    // 1. filled facets, one color per level
    for (int i = 0; i < levels.length; i++) {
        g.setColor(getColor(i));
        for (Point2[] poly : levels[i]) g.fillPolygon(poly);
    }

    // 2. the line pattern
    g.setColor(drawSymmetryLines ? Color.gray : Color.black);
    if (usePolyline) for (j) g.drawPolyline(fpoly[j]);      // open path
    else             for (j) g.drawPolygon(fpoly[j]);       // closed

    // 3. mirror lines
    if (drawSymmetryLines) {
        g.setColor(Color.black);
        for (i) if (symLines[i] != null)
            g.drawLine(symLines[i][0].x, symLines[i][0].y, symLines[i][1].x, symLines[i][1].y);
    }

    // 4. axis punctures
    if (drawSymmetryAxes)
        for (i) if (symAxes[i] != null) drawAxis(g, symAxes[i], symAxesOrder[i]);
}
```

`usePolyline` is `false` for the stellation diagram (that constructor never sets it); it
is `true` only for the unrelated `PolygonDisplay` tool (`PolygonDisplay.java:120-122`).

### Fill colors — the selection shading

`StellationCanvas.java:211-230`:

```java
static Color[] stepColors = new Color[100];
static {
    float c = 0.0f;
    for (int i = 0; i < stepColors.length; i++) {
        stepColors[i] = Color.getHSBColor(c, 0.5f, 1.0f);
        c += 0.1534f;
        if (c > 1.0f) c -= 1.0;
    }
}
static Color getColor(int i){ i = (i < 0) ? -1 : i;  return stepColors[i % 100]; }
```

For the stellation diagram only levels 0 and 1 ever occur, so the shading rule is simply:

| level | meaning | color |
|---|---|---|
| 0 | facet is a **bottom** face of a selected cell → the solid is **above** (outward of) the plane | `#ff8080` salmon |
| 1 | facet is a **top** face of a selected cell → the solid is **below** (inward of) the plane | `#fff580` pale yellow |
| — | unselected facet | unfilled (white), black outline only |

Exact palette (verified by reimplementing `Color.getHSBColor` in float32 — the `float`
accumulation of `0.1534f` drifts, so precompute the table rather than recomputing hues):
`0:#ff8080 1:#fff580 2:#94ff80 3:#80ffe1 4:#80a8ff 5:#cc80ff 6:#ff80bc 7:#ffb880`.
(Indices ≥ 2 are **unreachable in this tree**. The single-argument `setFaces(SFace[])`
*method* — not a constructor — at `StellationCanvas.java:240-274` is the only code that
would bucket by true stellation layers, and `grep` finds no caller for it anywhere in
`src/`. The three live call sites are all the four-argument overload:
`StellationCanvas.java:181` (from `initUI`), `StellationUI.java:55`, and
`PolygonDisplay.java:300` (which passes `new SFace[0]`, giving `maxlevel = -1` and zero
levels). A port only ever needs colors 0 and 1.)

### Axis markers

```java
void drawAxis(Graphics2D g, Point2 p, int order){
    int x = (int)(g.x2screen(p.x) + 0.5);
    int y = (int)(g.y2screen(p.y) + 0.5);
    int size = 4;
    g.setColor(axisColor[order]);
    g.getGraphics().fillOval(x-size, y-size, 2*size, 2*size+1);   // 8 x 9 px
}
static Color axisColor[] = { Color.gray, Color.gray,
                             new Color(200,0,200),    // order 2  magenta
                             new Color(0,0,250),      // order 3  blue
                             new Color(0,200,250),    // order 4  cyan
                             new Color(50,250,50) };  // order 5  green
```

Fixed pixel size, not scaled by zoom. `axisColor` has 6 entries; `order > 5` would throw.

### Line clipping

`Graphics2D.drawLine` clips against the viewport before drawing
(`Graphics2D.java:215-230, 361-437`), recursive Cohen–Sutherland with the outcode

```java
int outcode(x, y, top, bottom, left, right){
    int i = 0;
    if (x < left) i += 1; else if (x > right) i += 2;
    if (y > top)  i += 4; else if (y < bottom) i += 8;
    return i;
}
```

This matters for the symmetry lines, whose endpoints sit on a sphere of radius
`sqrt(maxRadius² + 1)`, far outside the view. `fillPolygon`/`drawPolyline`/`drawPolygon`
truncate to `int` with a plain `(int)` cast (round toward zero), *not* `+0.5` rounding —
only `drawAxis`, `drawRect` and `fillRect` add `0.5`.

### PostScript / print path

`getRenderingShapes()` (`StellationCanvas.java:482-524`) returns a `Vector<PolyShape>`:
one `PolyShape(GeneralPath, PolyShape.FILL, getColor(i))` per non-empty level (**all
polygons of a level concatenated into one path**), then one
`PolyShape(outline, PolyShape.DRAW, Color.black)` for the whole line pattern. Called from
`StellationMain.java:1413` and consumed by `DlgPrint.renderShapes`
(`DlgPrint.java:366-386`), which drives the real `java.awt.Graphics2D` (not
`pvs.utils.ui.Graphics2D`). Symmetry lines and axes are *not* exported. Separately, typing `P`/`p` on the canvas (`KeyListenerClass`) spawns a thread
that repaints the canvas into a `GraphicsPS`.

Caveat: `Graphics.fillPolygon` uses the **even-odd** rule while `GeneralPath` defaults to
**non-zero** winding, so screen and print could disagree for a self-intersecting facet.
Arrangement facets are convex, so in practice they agree.

---

## 9. Hit-testing

### Screen → world

Both mouse handlers start with `Point2 point = g2d.screen2world(e.getX(), e.getY())`
(`StellationCanvas.java:869, 891`). `e.getX()/getY()` are canvas-local pixels. **The
transform used is whatever the last `paint` left in `g2d`** — a port should recompute it
on demand from the current size instead of relying on paint order.

### Facet pick

```java
int findPoly(Point2 point){                    // StellationCanvas.java:994-1010
    if (oldPolyIndex >= 0 && oldPolyIndex < fpoly.length)
        if (isInsidePolygon(fpoly[oldPolyIndex], point)) return oldPolyIndex;
    for (int i = 0; i < fpoly.length; i++)
        if (isInsidePolygon(fpoly[i], point)) return i;    // //oldPolyIndex = i;  <- commented out
    return -1;
}
```

The returned value is the **index into `fpoly`, i.e. into `ffaces`, i.e. into
`Stellation.faces[findex]`** — that is exactly the key the selection code needs (§10).
The `oldPolyIndex` fast path is dead: nothing ever assigns a non-negative value to
`oldPolyIndex` (the only assignment is `oldPolyIndex = -1` at the end of
`paintCanvas`). Facets tile the plane without overlap, so "first hit" is unambiguous
except exactly on a shared edge.

Point-in-polygon (`StellationCanvas.java:1384-1413`), classic even-odd crossing test,
**no tolerance at all**:

```java
static boolean isInsidePolygon(Point2[] polygon, Point2 p){
    int cnt = 0;
    Point2 pnt1 = polygon[polygon.length-1];
    for (int i = 0; i < polygon.length; i++) {
        Point2 pnt2 = polygon[i];
        if (p.y >  MIN(pnt1.y, pnt2.y))
        if (p.y <= MAX(pnt1.y, pnt2.y))
        if (p.x <= MAX(pnt1.x, pnt2.x))
        if (pnt1.y != pnt2.y) {
            double xinters = (p.y - pnt1.y)*(pnt2.x - pnt1.x)/(pnt2.y - pnt1.y) + pnt1.x;
            if (pnt1.x == pnt2.x || p.x <= xinters) cnt++;
        }
        pnt1 = pnt2;
    }
    return (cnt % 2 != 0);
}
```

(The nested `if`s above are the original's literal structure, flattened for readability.)

### Vertex pick (diagnostic only)

```java
int[] findVertex(Point2 point){                // StellationCanvas.java:953-987
    Point2 pnt1 = g2d.screen2world(10, 0);
    Point2 pnt0 = g2d.screen2world( 0, 0);
    double cutoff = Math.abs(pnt1.x - pnt0.x);          // == 10 screen px in world units
    for (i over fpoly) for (v over fpoly[i]) {
        double d = |p.x - x| + |p.y - y|;               // MANHATTAN distance
        if (d < cutoff) return new int[]{i, v};
    }
    return null;
}
```

Used only by `mousePressed` to print `pointer:[..] vertex:[..]` to stdout, via
`faces[vert[0]].vertices[vert[1]]` — valid because `this.faces == ffaces` after
`setFaces`. `chop(v)` here uses `EPS = 1.e-12` (`StellationCanvas.java:1415-1422`) and is
inverted relative to `Stellation.chop` — it returns `v` when `|v| > EPS` and 0 otherwise,
i.e. same behavior, different spelling.

---

## 10. Click → action → selection

`CanvasMouseListener.mousePressed` (`StellationCanvas.java:887-929`). Left button only
(`BUTTON1_MASK`); modifiers pick the action:

| Modifiers | Action constant | Value |
|---|---|---|
| Ctrl + Shift | `SUB_SUPPORTING_CELLS` | 0 |
| Shift | `ADD_SUPPORTING_CELLS` | 1 |
| Ctrl | `TOGGLE_SUPPORTING_CELLS` | 2 |
| Alt | `TOGGLE_TOP_CELL` | 3 |
| (none) | `TOGGLE_BOTTOM_CELL` | 4 |

(`StellationCanvas.java:780-781`.) The canvas then calls
`observer.update(this, new int[]{ polyIndex, action })`.

Right button (`mouseReleased`, `BUTTON3_MASK`) sets `menuActionPoly = findPoly(point)` and
pops up `cellSelectionPopup` at the click point, whose five items fire the same five
actions (`StellationCanvas.java:734-761`).

`StellationMain.update` (declared at `StellationMain.java:546`; the diagram-click branch
is the trailing `else` at `587-627`) resolves the facet index to a cell:

```java
int face   = ((int[])what)[0];
int action = ((int[])what)[1];
switch (action) {
  case TOGGLE_BOTTOM_CELL:
  case TOGGLE_SUPPORTING_CELLS:
  case ADD_SUPPORTING_CELLS:
  case SUB_SUPPORTING_CELLS:
      cindex = controller.findCell(faceToShow, face, 1); break;   // 1 = want it as a TOP face
  case TOGGLE_TOP_CELL:
      cindex = controller.findCell(faceToShow, face, 0); break;   // 0 = want it as a BOTTOM face
}
if (cindex != null) {
    int[][] cellsIndex = selection.modifySelection(cindex, action);
    showDiagram(cellsIndex);      // -> getStellationDiagram + createDiagram + canvas.setFaces
    selection.initCellField();
}
```

`Stellation.findCell(Vector cells, int faceIndex, int facetIndex, int top)`
(`Stellation.java:2528-2561`):

```java
SFace face = faces[faceIndex][facetIndex];            // <- the identity link
for (i over layers) for (j over SSCells in layer) for (k over scells[j].cells)
    for (m over (top==1 ? cells[k].top : cells[k].bottom))
        if (f[m] == face) return new int[]{ i, j };   // REFERENCE equality
return null;
```

So: a plain click asks for the cell that has this facet as a **top** face — the cell
**below** the plane (hence `TOGGLE_BOTTOM_CELL`); Alt+click asks for the cell that has it
as a **bottom** face — the cell **above** the plane. `Selection.modifySelection`
(`Selection.java:303-351`) then toggles/adds/subtracts, and the round-trip through
`showDiagram` re-derives the fills. The whole interaction is stateless in the canvas: the
canvas never stores "selected"; it just re-receives new `Diagram.faces`.

---

## 11. Constants, tolerances, quirks

### Numeric constants (all of them)

| Symbol | Value | Where |
|---|---|---|
| `Plane.TOLERANCE` | `1.e-10` | `Plane.java:123` — `Plane.equals`, and the parallel test in `Stellation.intersect(Plane,Vector3D)` |
| `EPSILON` (local) | `0.001` | `Stellation.java:860` — plane∩plane degeneracy |
| clipping-sphere radius | `sqrt(maxRadius² + 1)` | `Stellation.java:869` |
| `Vector3D.TOL` | `1.e-10` | `Vector3D.java:288` — `rotateSet(from,to)` skip threshold |
| `Vector3D.tolerance` | `1.e-6` | `Vector3D.java:256` — `equals`, `collinear` |
| `rMin` init | `1.e20` | `Stellation.java:2822` |
| `Stellation.chop` band | `±1.e-10` | `Stellation.java:2747-2751` |
| `Stellation.ROUND_FACTOR` | `1.e6` | `Stellation.java:2753` (debug printing only) |
| `StellationCanvas.EPS` | `1.e-12` | `StellationCanvas.java:1415` (console printing only) |
| `borderWidth` | `4` px | `StellationCanvas.java:529` |
| vertex-pick cutoff | `10` px (converted to world) | `StellationCanvas.java:959-961` |
| axis marker `size` | `4` px (oval `8×9`) | `StellationCanvas.java:605-608` |
| `sbMaximum` / initial `sbVisible` | `100000` | `StellationCanvas.java:77-78` |
| `m_initialDelay` | `300` ms | `StellationCanvas.java:1132` |
| `initialZoom`, `zoomSpeed` | `1.01`, `1.5` | `StellationCanvas.java:1142-1143` |
| `panSpeed`, `clickPanAmount` | `0.5`, `0.01` | `StellationCanvas.java:1209-1210` |
| `initialRotation`, `rotationSpeed` | `π/1800`, `π/18` | `StellationCanvas.java:1279-1280` |
| hue step | `0.1534f`, sat `0.5f`, bri `1.0f` | `StellationCanvas.java:214-220` |
| `Stellation.FACTOR` (seed face size) | `5.e3` | `Stellation.java:1224` |
| preferred canvas size | `300 × 300` | `StellationCanvas.java:232, 1102` |

### Quirks and outright bugs (reproduce or fix deliberately, but know they are there)

- **Q1 — `rotateSet(from,to)` silently no-ops when `from ≈ ±to`.** If the reference
  facet's computed `normal` is already `(0,0,1)` the skip is harmless; if it is
  `(0,0,-1)` (`sin = 0`, `cos = -1`) **no rotation is applied at all** and the diagram
  comes out mirrored/flipped instead of rotated by π. Same hazard for the `vertexUp`
  step when the chosen vertex already points along `−Y`. A robust port should special-case
  `cos < 0 && |sin| <= TOL` by rotating π about any axis ⟂ `from`.
- **Q2 — `SubSupportingCellsAction` reads the wrong field.** It uses `oldPolyIndex`
  (`StellationCanvas.java:772-777`) where the other four popup actions use
  `menuActionPoly`. Since `oldPolyIndex` is forced to `-1` at the end of every paint, the
  popup's "subtract supp. cells" item never fires. Ctrl+Shift+click still works.
- **Q3 — `ZoomListener.processEventCallback` calls `doZoom(factor)` twice per frame**
  (`StellationCanvas.java:1177-1182`), doubling the effective zoom rate. `RotateListener`
  assigns `eventCallback = this` twice but rotates once.
- **Q4 — `getColor(i)` throws for negative `i`**: `i = (i<0) ? -1 : i; return
  stepColors[i % 100];` → `stepColors[-1]`. Unreachable with layers ∈ {0,1}.
- **Q5 — the scrollbar *listeners* divide by zero at default zoom**
  (`sbMaximum - sbVisible == 0`, `StellationCanvas.java:1349, 1361`). `adjustScrollbars`
  itself only multiplies by that quantity and is fine (§7).
- **Q6 — interactive rotation is lost on every selection change** (§7).
- **Q7 — `polyDiameter` is never recomputed by `setFaces`**, so switching `faceToShow`
  keeps the zoom range of the previously shown plane.
- **Q8 — `Plane.hashCode` is not consistent with `Plane.equals`** (§5).

---

## 12. JS PORTING NOTES

**`FastHashtable` keyed by `SFace`.** `SFace` has a custom `hashCode()` but no
`equals()`, so the table is an *identity* map with a geometric hash. Port it as
`new Map()` keyed on the facet object — JS `Map` uses SameValueZero (reference identity
for objects), which is exactly right. **Do not** key on centroid coordinates or on a
stringified center; that would silently merge distinct facets. Conversely, the `Plane`
table in `getNonEquivalentFaces` *does* need value semantics with a `1e-10` tolerance —
port that as a linear scan over an array of planes (there are only tens of them), not as a
hash map, which also fixes Q8.

**`Integer` identity comparisons.** `index == bottomindex` in `getStellationDiagram`
compares boxed `Integer` references, but only against the two singletons the method
itself created, so it is equivalent to `=== 0` / `=== 1` on plain numbers in JS. (Do not
"fix" it into a `.equals()`; the semantics are already numeric.)

**`Vector` / `Hashtable` → `Array` / `Map`.** `java.util.Vector` becomes `Array`
(`elementAt(i)` → `[i]`, `addElement` → `push`, `size()` → `.length`), and iteration order
of `FastHashtable.keys()` is reverse-bucket order — deliberately *not* reproducible.
Nothing in the diagram path depends on it (see §3); `getNonEquivalentFaces` sorts its
output explicitly.

**`float` vs `double`.** Only one place matters: the `stepColors` palette accumulates a
`float` hue (`c += 0.1534f`), which drifts differently from JS's `double`. Hard-code the
palette table (given in §8) rather than recomputing it. Everything geometric is `double`,
which is JS's native number — no action needed.

**Integer division and `(int)` casts.** `(int)x` in Java truncates toward zero, unlike
`Math.floor`. Use `Math.trunc` (or `|0` for values known to fit in 32 bits). Affected:
`Graphics2D.fillPolygon` and `Graphics2D.drawLineNoClip` pixel coordinates (note
`Graphics2D.drawPolygon`/`drawPolyline` do *no* casting themselves — they delegate to
`drawLine` → `clipLine` → `drawLineNoClip`), and `adjustScrollbars`. `initViewport`'s
`int d = (width > height) ? height : width` is a plain min with no truncation and no
integer division — `Width*(width-2*b)/(d-2*b)` is `double*int` then `double/int`, so it
is already exact double arithmetic; the only hazard there is `d - 2*b == 0`. In canvas
rendering you will usually
*want* to keep subpixel doubles and let the browser antialias — but note that changes the
pixel-exact appearance, and that AWT's `fillPolygon` is even-odd while `GeneralPath` is
non-zero (§8): specify `ctx.fill('evenodd')` if you want to match the screen renderer.

**`(screenRect.right - screenRect.left)/(...)`** is `int - int` then `int / double` →
double. Fine in JS. But `int d = (width > height) ? height : width` and the `d - 2*b`
denominators go to zero for canvases ≤ 8 px; guard.

**Division by zero.** Java and JS agree (`Infinity`/`NaN`, no exception), so Q5 will
reproduce silently. Guard `sbMaximum - sbVisible == 0` explicitly.

**`Vector3D.hashCode` is a live function of the coordinates, not a memo.** The `hashCode`
field exists and every mutator resets it to `0` (`Vector3D.java:34, 43, 55, 67, ...`), but
nothing ever writes a non-zero value into it, so the `if(hashCode != 0)` fast path never
fires and the hash is recomputed from the current `(x,y,z)` on every call (§2.5). The
porting consequence is the same but the reason is the opposite of a stale cache:
`translateFaces` / `rotateFaces` mutate vertices **in place**, which silently *changes*
the hash of any `Vector3D` already sitting in a table, so any such table must be rebuilt
after a transform. `createDiagram` sidesteps this by deep-copying every `SFace`
first — preserve that: in JS, clone vertices (`{x,y,z}` objects or a `Float64Array`)
before transforming, or make the transform pure and return new arrays.

**Aliasing.** `createDiagram` depends on three things not being aliased: `center` (a fresh
vector from `getCenter()`), `normal` (fresh from `sub`/`cross`), and `v1`
(`new Vector3D(face.vertices[vertexUp])`, an explicit copy taken *before* `nffaces` is
rotated). If you rewrite the transform as "build a 4×4 matrix and apply once", these
hazards vanish — recommended.

**Static mutable state.** `Symmetry.planes_Ih/_Oh/_Th/_Td` are lazily built statics whose
`Vector3D`s are then normalized in place by `getSymmetryPlanes` every call
(`Symmetry.java:1422-1425`); `Symmetry.axesO/axesT/axesI` are shared static `Axis[]`
arrays that `createDiagram` is careful to copy from (`new Axis(v, symAxes[i].order)`).
`Stellation.fval` is a shared `static double[1000]` scratch buffer (not on this path but
in the same file). In JS, freeze these as module-level constants and never mutate them —
build normalized copies at module init.

**`StreamTokenizer` parsing.** Not used by the diagram path. (`FixedStreamTokenizer` and
`Polyhedron.readOFF` feed it upstream; see the loader spec.)

**Event model.** The autorepeat uses a `Timeout` plus an `eventCallback` re-armed from
inside `paintCanvas` — i.e. repeat rate is coupled to repaint completion. In JS use
`requestAnimationFrame` with the same `Δt`-based formulas from §7; you will not reproduce
Q3's double zoom unless you want to.

**Canvas coordinates.** The Y flip is inside the transform (`scaley < 0`), so if you use
a raw 2D canvas with `y` down you can either keep `scaley` negative exactly as-is (then
`y2screen` already yields canvas pixels) or set a transform — but then remember to invert
it for `screen2world`. Recomputing the transform per frame from
`(width, height, Width, centerX, centerY)` is cheap and removes the "hit-test depends on
last paint" coupling.

**Suggested port shape**

```js
// pure data
class DiagramData { faces; ffaces; axes; planes; }   // faces[i] = {vertices:[{x,y}], side:0|1}
                                                     // ffaces[i] = {index, vertices:[{x,y}]}
                                                     // axes[i]  = null | {x, y, order}
                                                     // planes[i]= null | [{x,y},{x,y}]
// view state
{ Width, polyDiameter, centerX, centerY }
// derived per frame
const b = 4, d = Math.min(W,H), s = (d - 2*b)/Width;
const wx = Width*(W-2*b)/(d-2*b), wy = Width*(H-2*b)/(d-2*b);
const toScreen = (x,y) => [ b + s*(x - centerX + wx/2), b + s*(centerY + wy/2 - y) ];
const toWorld  = (px,py) => [ centerX - wx/2 + (px-b)/s, centerY + wy/2 - (py-b)/s ];
```

Because the diagram is a static 2D line arrangement, `Path2D` per facet (built once per
`setFaces`, reused across zoom/pan via a canvas transform) plus
`ctx.isPointInPath(path, x, y)` is the natural replacement for `isInsidePolygon` — but
`isPointInPath` defaults to non-zero winding, so pass `'evenodd'` to match.

---

## 13. UNCERTAIN

- **U1 — the `+1` in the mirror-line clipping sphere.** `Stellation.java:869` computes
  `d = (r*r + 1) - P·P` where `r = getMaxRadius()`. Every other length in the file is in
  the polyhedron's own units, so this constant is scale-dependent and I could find no
  comment or caller explaining it. It only makes the segments longer than needed (they are
  clipped anyway), so any sufficiently large radius works, but I could not determine
  whether the original author intended `r*r + 1` or e.g. `(r+1)*(r+1)`.
- **U2 — `Plane.hashCode` / `equals` inconsistency in `getNonEquivalentFaces`.** I could
  not determine empirically (no runtime available in this environment — `java` is on
  `PATH` but there is no JRE installed) how often two tolerance-equal planes hash to
  different buckets and therefore how often a duplicate orbit representative sneaks into
  the face dropdown. I recommend the linear-scan replacement rather than trying to
  reproduce the exact behavior.
- **U3 — winding of clipped facets.** I verified CCW-as-seen-from-outside for the *seed*
  faces (`makeSeedFace`, `Polyhedron.makeCCW`) and convex clipping preserves orientation,
  but I did not trace `intersectFacesWithPlane` / `cleanFaces`
  (`Stellation.java:1084-…`) end-to-end to prove every facet in `faces[p]` keeps that
  winding. If some facet were reversed, `createDiagram`'s `normal` would flip only when
  that facet happens to be the reference facet (min `|center|²`), so the risk is confined
  to the innermost facet. Worth an assertion in the port:
  `assert normal.dot(plane.v) > 0`.
- **U4 — `IGraphics2D`.** The interface exists and `pvs.utils.ui.Graphics2D` implements
  it, but `StellationCanvas` holds the concrete class, and I found no diagram-path caller
  that goes through the interface. Its `fillControlSquare(double,double,int)` is used by
  other tools. I treated it as not part of this feature.
- **U5 — the `int vertexUp` UI range.** `choice_vertexUp` is hard-coded to `0..9`
  (`StellationMain.java:326-329`) while the guard is `vertexUp < face.vertices.length`.
  For faces with fewer than 10 vertices, the high entries silently do nothing (no
  rotation). I could not determine whether the original intended to clamp or to modulo.
