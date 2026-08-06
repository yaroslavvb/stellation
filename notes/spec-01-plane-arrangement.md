# Spec 01 — Plane set → 2D arrangement on each plane

Reverse-engineered from the Java source at
`stellation/src/main/java/pvs/polyhedra/`. Every constant, field name and
signature below is quoted from the actual source.

Primary file: `Stellation.java` (2939 lines).
Supporting: `Plane.java`, `Vector3D.java`, `SFace.java`, `SEdge.java`,
`SVertex.java`, `Axis.java`, `FEdge.java`, `VectorIndex.java`,
`DoubleIndex.java`, `Matrix3D.java`, `Vector3Dsym.java`,
`pvs/utils/FastHashtable.java`, `pvs/utils/QSort.java`, `Jama/LUDecomposition.java`.

Scope of this document: **stage 1 of the pipeline** — from a set of planes to
`SFace[][] faces`, the per-plane list of arrangement facets. Cell construction
(`makeCells2`, `SCell`, `SSCell`) is a later stage and is out of scope.

---

## 0. One-paragraph summary of the algorithm

There is **no sweep-line / DCEL arrangement code**. The 2D arrangement on each
plane is produced by **iterated convex clipping**: a single huge convex square
lying in the plane is repeatedly split by every other plane, one plane at a
time, each split replacing one convex polygon by two convex polygons. After all
planes have been applied, the collection of polygons *is* exactly the set of
2-cells (facets) of the line arrangement, clipped to the seed square. Polygons
that still touch the artificial seed boundary are then thrown away by a radius
test. Every polygon carries an integer `layer` = the number of planes on whose
*positive* side it lies (closed half-space — see §4.4).

All arithmetic is `double`. Vertices are interned (deduplicated) through a
hash table so that shared corners become the *same* `Vector3D` object; later
stages rely on `==` reference identity of vertices.

---

## 1. Data structures

### 1.1 `Vector3D` (`Vector3D.java`)

```java
public class Vector3D {
  public double x, y, z;
  ...
  static final double tolerance = 1.e-6;   // used by equals() and collinear()
  static double TOL = 1.e-10;              // used by chop() AND by rotateSet(from,to)
                                           //   (Vector3D.java:235) — NOT print-only
  int hashCode = 0;                        // "cache" that is never assigned a NON-ZERO
                                           //   value; every mutator resets it to 0
}
```

Methods used by this stage (all `double`, all obvious):
`add`, `addSet`, `sub`, `subSet`, `mul(double)`, `mulSet(double)`,
`mul(Matrix3D)`, `mulSet(Matrix3D)`, `cross`, `dot`, `normalize`,
`length()`, `length2()`, `rotate/rotateSet`.

`mul(Matrix3D)` is matrix-times-column-vector, i.e. `out = M · v` (row `i` of `M`
dotted with `v`). It is **not** the row-vector form `vᵀ·M`, which would read
`out.x = x*m00 + y*m10 + z*m20`:

```
out.x = x*m00 + y*m01 + z*m02
out.y = x*m10 + y*m11 + z*m12
out.z = x*m20 + y*m21 + z*m22
```

**Equality (the tolerance that matters):**

```java
public boolean equals(Object o){
    if(o == this) return true;
    Vector3D v = (Vector3D)o;
    double dx = |v.x - x|, dy = |v.y - y|, dz = |v.z - z|;
    return dx < tolerance && dy < tolerance && dz < tolerance;   // tolerance = 1.e-6
}
```

**Hash (exact formula — reproduce bit-for-bit):**

```java
public int hashCode(){
    if(hashCode != 0) return hashCode;            // never true: the field is never assigned
    int value = (int)(331345.563*x) + (int)(412345.891*y) + (int)(71341.678*z);
    return value;
}
```

`(int)` is a Java narrowing cast: **truncation toward zero**, and the three
terms are summed in **32-bit wrapping int arithmetic**.

> **Critical:** `equals` and `hashCode` are *inconsistent*. `hashCode` quantises
> x to a grid of `1/331345.563 ≈ 3.018e-6`, y to `1/412345.891 ≈ 2.425e-6`,
> z to `1/71341.678 ≈ 1.4017e-5` — all coarser than the `1e-6` equality
> tolerance. See §7 for what this means for the lookup predicate.

### 1.2 `Plane` (`Plane.java`)

```java
public class Plane {
    protected Vector3D m_point;     // a point on the plane
    protected Vector3D m_normal;    // the normal as supplied (not necessarily unit)
    public Vector3D v;              // UNIT normal
    public double d;                // signed distance from origin along v
    public int index;               // index of this plane in Stellation.planes[]

    static Vector3D rndDir = new Vector3D(3.1415926, 2.718281828459045, 1.718281828459045);
    static final double TOLERANCE = 1.e-10;
    static double TOL = 1.e-10;
}
```

Plane equation: `v · X - d = 0`. `distance(x,y,z) = x*v.x + y*v.y + z*v.z - d`.

Constructor used by all three `Stellation` entry points:

```java
public Plane(Vector3D v, double d, int index){
    this.d = d;
    this.v = new Vector3D(v);  this.v.normalize();
    this.m_normal = new Vector3D(v);
    this.m_point  = new Vector3D(d*v.x, d*v.y, d*v.z);   // NOTE: uses the *argument* v, not the normalised copy
    this.index = index;
}
```

Quirk: `m_point` is `d * (argument v)`. It is only correct when the caller
already passes a unit vector — which every caller in this stage does.

`hashCode` / `equals` (used when planes are hash keys elsewhere):

```java
public int hashCode(){
    return (int)(3345.563*v.x) + (int)(4345.891*v.y) + (int)(7341.678*v.z) + (int)(4134.178*d);
}
public boolean equals(Object o){ // componentwise on (v.x,v.y,v.z,d), each |Δ| < TOLERANCE = 1.e-10
```

The 3-point constructor `Plane(Vector3D v0, Vector3D v1, Vector3D v2, int index)`
canonicalises the sign so `d >= 0`; when `|d| < TOLERANCE` it sets `d = 0` and
flips `v` if `v·rndDir < 0`. **This constructor is not used in the arrangement
path** (see §2.4 — `Stellation.getPlane()` builds planes without sign
canonicalisation).

### 1.3 `SFace` (`SFace.java`) — an arrangement facet

```java
public class SFace {
    public SCell cellAbove;      // filled in by a later stage
    public SCell cellBelow;      // filled in by a later stage
    public int layer = 0;        // stellation layer, see §4.4
    public Vector3D[] vertices = null;   // CCW seen from the +normal side
    private Plane plane;         // the plane this facet lives in
    Vector3D center = null;      // lazily cached centroid
    Vector3D area   = null;      // lazily cached area vector

    public SFace(Vector3D[] _vertices, Plane _plane);
    public SFace(Vector3D[] _vertices, Plane _plane, int layer);
    public SFace(SFace face);            // copies layer + deep-copies vertices; DOES NOT copy `plane`
    public Vector3D getCenter();         // arithmetic mean of vertices, cached
    public Vector3D getArea();           // 0.5 * Σ v[i] × v[i+1]  (vector area about origin), cached
    public boolean adjacent(SFace face, int direction);
    public void cleanVertices();
    public int getLayer();
    public Plane getPlane();
    public int getPlaneIndex();          // == plane.index
    public double getRadius();           // max |v[i]| over vertices, i.e. distance from ORIGIN
    public int hashCode();               // == getCenter().hashCode()
}
```

Notes:
* `SFace` does **not** override `equals`, so `SFace` equality is object identity
  while its `hashCode` is centre-based — deliberately inconsistent, exploited by
  later stages (an `SFace` behaves as an identity key that hashes by position).
* The copy constructor `SFace(SFace)` leaves `plane == null`. `createDiagram`
  uses it, so diagram copies have no plane. Do not call `getPlaneIndex()` on them.
* `getCenter()` and `getArea()` cache; the arrangement code mutates
  `sface.vertices` in place (§4.3) **without invalidating those caches**. It is
  safe only because nothing calls `getCenter()`/`getArea()` during construction.

`cleanVertices()` removes *consecutive duplicate* vertices using **reference
identity**, not `equals`:

```java
public void cleanVertices(){
    int vcounter = 0;
    for(int k = 0; k < vertices.length; k++)
        if(vertices[(k+1)%vertices.length] != vertices[k]) vcounter++;
    if(vcounter == 0)                     vertices = new Vector3D[0];
    else if(vcounter != vertices.length){ /* compact, keeping vertices[k] when v[k+1] != v[k] */ }
}
```

This works only because coincident corners were interned to the same object by
`findVertex` (§4.5).

### 1.4 `DoubleIndex` (`DoubleIndex.java`) — sort key for planes

```java
public class DoubleIndex implements Comparator {
    public double value;
    public int index;
    DoubleIndex(double _value, int _index);
    public int compare(Object fst, Object snd);   // ascending by .value; ties → 0
}
```

### 1.5 `SEdge`, `FEdge`, `SVertex`, `Axis`, `VectorIndex`

None of these participate in building the arrangement; they are consumed by
later stages / the UI. Recorded here for completeness:

```java
class SEdge { int v1,v2;
    public int hashCode(){ return v1*v2; }                       // symmetric product
    public boolean equals(Object o){ (v1,v2) == (e.v1,e.v2) || (v1,v2) == (e.v2,e.v1); } }

public class FEdge { int v1,v2,index;                            // index = signed plane index
    public int hashCode(){ return v1*v2; }
    public boolean equals(Object o){ same index AND unordered vertex pair equal } }

class SVertex { Vector faces = new Vector(); Vector3D vertex;
    public void addFace(SFace face);
    public int hashCode(){ return vertex.hashCode(); }            // no equals() override → identity
}

public class Axis { public int order; public Vector3D vector; }   // symmetry axis, order = n of C_n

public class VectorIndex implements Comparator { Vector3D vector; int index; double length2;
    compare → ascending by length2; equals → vector.equals; hashCode → vector.hashCode }
```

`SVertex` is built by `makeVertexTable(SFace[][] faces)` — keyed on the
`Vector3D` vertex objects, value = `SVertex` accumulating adjacent `SFace`s.

### 1.6 The container

```java
public class Stellation {
    static final boolean DEBUG = true;

    public SFace[][] faces;             // faces[planeIndex][facetIndex]
    public Plane[] planes;              // planes used to make this stellation
    private Vector3D[] canonicalVectors;
    private Vector3Dsym[] planeVectors;

    public int maxlayer = 0;
    int negCellCount = 0;

    // arrangement constants
    static double[] fval = new double[1000];       // STATIC scratch buffer!
    static final double THRESHOLD = 1.e-7;
    static double FACTOR    = 5.e3;                // seed square "radius"
    static double MAXVERTEX = 2.e3;                // discard facets reaching further than this
    static final double ROUND_FACTOR = 1.e6;       // only for printing
}
```

---

## 2. Entry points

### 2.1 `public Stellation(Polyhedron poly, int maxintersection)`

```java
public Stellation(Polyhedron poly, int maxintersection){
    faces = makeStellationFaces(poly, maxintersection);
    maxlayer = findMaxLayer(faces);
}
```

`makeStellationFaces(Polyhedron poly, int maxintersection)` builds
`planes[i] = getPlane(poly, i)` for every face `i` of the polyhedron, then calls
`makeStellationFaces(Plane[], int)`.

Callers: `StellationUI.main` (`-i <file.off>`), `StellationController.readFile`.
The polyhedron is read from OFF and `poly.makeCCW()` is applied first.

### 2.2 `public Stellation(Vector3D[] vectors, int maxintersection)`

```java
public SFace[][] makeStellationFaces(Vector3D[] vector, int maxintersection){
    Plane[] planes = new Plane[vector.length];
    for(int i = 0; i < vector.length; i++){
        Vector3D v = new Vector3D(vector[i]);
        double len = v.length();
        v.normalize();
        planes[i] = new Plane(v, len, i);
    }
    return makeStellationFaces(planes, maxintersection);
}
```

So an input vector `V` denotes the plane `{X : (V/|V|)·X = |V|}` — the plane
orthogonal to `V` passing through the tip of `V`. `d = |V| >= 0` always, so
every normal points **away from the origin**. `planes[i].index == i`.

Vectors are read by `Stellation.readVectors(String filename)`: either the
vertices of an `.off` file, or whitespace-separated triples parsed with
`java.io.StreamTokenizer` (see §8 for the parsing quirks). Zero-length vectors
(`v1.length2() != 0.0`) are silently dropped.

### 2.3 `public Stellation(Vector3D[] canvect, String symmetry, int maxintersection)`

This is the constructor used by the modern controller
(`StellationController.createStellation` → `new Stellation(Utils.planesToVectors(m_canonicalPlanes), m_polySymmetry, maxIntersection)`).
It is the interesting one. Step by step:

**(a) Build orbits.** For each canonical vector `canvect[i]`:

```java
orb[i] = Symmetry.getOrbit(canvect[i], symmetry, i);   // Vector3Dsym[]
totallen += orb[i].length;
```

`Symmetry.getOrbit`:

```java
public static Vector3Dsym[] getOrbit(Vector3D v, String symmetry, int index){
    Matrix3D[] sm = getMatrices(symmetry);
    Vector arr = new Vector();  Hashtable ht = new Hashtable();
    for(int i=0; i < sm.length; i++){
        Vector3D v1 = v.mul(sm[i]);
        if(ht.get(v1) == null){ ht.put(v1,v1); arr.addElement(new Vector3Dsym(v1, v, sm[i], index)); }
    }
    ...
}
```

Deduplication uses `Vector3D.hashCode`/`equals` (§1.1) via `java.util.Hashtable`
(**not** `FastHashtable`; see §7 — `java.util.Hashtable.get` also requires
`e.hash == hash`, so the behaviour is the same predicate).

`Vector3Dsym extends Vector3D` and remembers `{ Matrix3D matrix; Vector3D vector; int index; }`
= the symmetry matrix that produced it, the source vector, and the index of the
canonical vector it came from.

**(b) Order the plane vectors.** All *canonical representatives first* (`orb[i][0]`,
which is `canvect[i]` transformed by `sm[0]`, normally the identity), then all
remaining orbit members grouped by canonical index:

```
vectors[0 .. canlength-1]  = orb[0][0], orb[1][0], ...
vectors[canlength ..]      = orb[0][1..], orb[1][1..], ...
```

**(c) Build `planes[]`** exactly as in §2.2, one plane per orbit vector,
`planes[i].index == i`.

**(d) Pre-seed the vertex table with triple-plane intersections.**

```java
for(int i=0; i < canvect.length; i++)          // NOTE: i only over canonical planes
  for(int j=i+1; j < planes.length; j++)
    for(int k=j+1; k < planes.length; k++){
        Vector3D v = Plane.intersect(planes[i], planes[j], planes[k]);
        if(v == null) zerocount++;
        else {
            double len = v.length();
            if(len > 1.E5) zerocount++;         // reject near-parallel triples
            else { intcount++; if(inttable.get(v) == null) inttable.put(v,v);
                   if(len > maxlen) maxlen = len; }
        }
    }
FastHashtable symverttable = makeSymVertTable(inttable, symmetry);
```

```java
FastHashtable makeSymVertTable(FastHashtable table, String symmetry){
    Matrix3D[] sm = Symmetry.getMatrices(symmetry);
    FastHashtable ht = new FastHashtable();
    for(Enumeration e = table.elements(); e.hasMoreElements(); ){
        Vector3D v = (Vector3D)e.nextElement();
        for(int i=0; i < sm.length; i++){
            Vector3D v1 = v.mul(sm[i]);
            if(ht.get(v1) == null) ht.put(v1,v1);
        }
    }
    return ht;
}
```

**Why this matters:** the arrangement is then run with
`FastHashtable vtable = symverttable;` — i.e. **pre-populated**. Every corner
that the clipping algorithm computes by 2-point interpolation gets snapped
(via `findVertex`, §4.5) to an *exactly symmetric* pre-computed intersection
point, if one exists in the same hash bucket within `1e-6`. This is the
mechanism that keeps the symmetry exact across the whole model. The
`Stellation(Vector3D[], int)` path has no such pre-seeding — its `vtable` starts
empty — and is therefore noticeably less numerically clean.

**(e) Clip only the canonical planes.**

```java
faces = new SFace[planes.length][];
for(int canface=0; canface < canlength; canface++){
    sortPlanes(pindex, planes, planes[canface]);
    Vector vfaces = new Vector();
    vfaces.addElement(makeSeedFace(planes[canface], canface));
    for(int j = 0; j < planes.length; j++)
        if(pindex[j].index != canface)
            intersectFacesWithPlane(vfaces, planes[pindex[j].index], vtable, canface, maxintersection);
    faces[canface] = cleanFaces(vfaces);
}
```

**(f) Rebuild `vtable` with only *surviving* vertices**, then generate the
remaining `faces[i]` (i ≥ canlength) by transforming the canonical ones:

```java
vtable = new FastHashtable();
for(int i=0; i < canlength; i++)
  for(int j=0; j < faces[i].length; j++)
    for(int k=0; k < faces[i][j].vertices.length; k++)
        vtable.put(face.vertices[k], face.vertices[k]);

for(int i = canlength; i < vectors.length; i++){
    Vector3Dsym svector = vectors[i];
    int findex = svector.index;                                 // which canonical face
    faces[i] = transformFace(faces[findex], svector.matrix, vtable, planes[i]);
}
```

```java
SFace[] transformFace(SFace[] inface, Matrix3D matrix, FastHashtable vtable, Plane plane){
    SFace[] outface = new SFace[inface.length];
    double det = matrix.getDeterminant();
    for each face:
        for each vertex vi:
            Vector3D v = face.vertices[vi].mul(matrix);
            Vector3D v_old = (Vector3D)vtable.get(v);
            if(v_old == null){ vtable.put(v,v); vert.addElement(v); } else vert.addElement(v_old);
        if(det < 0.)  reverse the vertex array;                  // keep CCW-from-outside
        outface[i] = new SFace(vertices, plane, face.layer);
}
```

**Consequence (important for the port):** for every `i >= canlength`,
`faces[i].length == faces[findex].length`, and `faces[i][j]` is the symmetric
image of `faces[findex][j]` **with the same facet index `j` and the same
`layer`**. The UI relies on this: selecting facet `j` on any plane in an orbit
selects the corresponding facet on all of them.

### 2.4 `public static Plane getPlane(Polyhedron poly, int face)`

```java
public static Plane getPlane(Polyhedron poly, int face){
    int iface[] = poly.ifaces[face];
    Vector3D v0 = poly.vertices[iface[0]];
    Vector3D v1 = poly.vertices[iface[1]];
    Vector3D v2 = poly.vertices[iface[2]];
    Vector3D normal = v2.sub(v1).cross(v0.sub(v1));
    normal.normalize();
    double dot = normal.dot(v1);
    return new Plane(normal, dot, face);
}
```

Verify the orientation with a concrete example: `v0=(0,0,0), v1=(1,0,0), v2=(0,1,0)`
(CCW seen from +z) ⇒ `normal = (-1,1,0) × (-1,0,0) = (0,0,1)`. So for a
polyhedron whose faces are CCW-when-viewed-from-outside (which is what
`Polyhedron.makeCCW()` guarantees), `normal` is the **outward** normal. `d` may
be negative if the origin is on the outer side of a face plane; the sign is
**not** canonicalised here. `index = face`.

Only the first three vertices are used — non-planar faces are silently
approximated.

---

## 3. The local 2D frame on each plane

Built inside `makeSeedFace(Plane plane, int face)`:

```java
static SFace makeSeedFace(Plane plane, int face){
    int n = 4;
    Vector3D[] vert = new Vector3D[n];
    Vector3D normal = new Vector3D(plane.v);
    normal.normalize();
    Vector3D x = new Vector3D(1,0,0);
    Vector3D y = x.cross(normal);
    if(y.length2() < 1.e-4){
        x = new Vector3D(0,1,0);
        y = x.cross(normal);
    }
    y.normalize();
    Vector3D z = normal.cross(y);
    Vector3D fpoint = plane.v.mul(plane.d);
    for(int i = 0; i < n; i++){
        Vector3D v1 = y.mul(FACTOR*Math.cos(2*Math.PI*i/n));
        Vector3D v2 = z.mul(FACTOR*Math.sin(2*Math.PI*i/n));
        vert[i] = fpoint.add(v1.add(v2));
    }
    return new SFace(vert, plane);
}
```

The parameter `face` is **unused**.

### 3.1 Frame definition (write this verbatim in JS)

Given a plane with unit normal `n = plane.v` and offset `d = plane.d`:

```
a0 = (1,0,0)
u  = a0 × n                                  // = (0, -n.z, n.y)
if |u|² < 1.e-4:  a0 = (0,1,0);  u = a0 × n  // = (n.z, 0, -n.x)
u  = u / |u|
w  = n × u                                   // already unit, since n ⊥ u and both unit
o  = d * n                                   // in-plane origin = foot of perpendicular from world origin
```

* `(u, w, n)` is right-handed: `u × w = n`. Proof: `u × (n × u) = n(u·u) − u(u·n) = n`.
* Map 2D → 3D: `P(a,b) = o + a·u + b·w`
* Map 3D → 2D: `a = (P − o)·u`, `b = (P − o)·w`
* Because `+n` is "up" in this frame, a polygon whose 2D vertices run
  counter-clockwise in `(a,b)` runs counter-clockwise when viewed **from the
  positive-normal side** in 3D. All `SFace`s produced by this stage keep that
  winding.

The `1.e-4` guard on `|u|²` is a *squared-length* test: it triggers when
`n.y² + n.z² < 1e-4`, i.e. when `n` is within about `0.573°` of ±X.

### 3.2 Seed polygon

`FACTOR = 5.e3`. The seed is a square (n = 4) inscribed in a circle of radius
5000 centred at `o`:

```
vert[k] = o + u·(5000·cos(2πk/4)) + w·(5000·sin(2πk/4)),  k = 0..3
```

i.e. approximately `o+5000u`, `o+5000w`, `o−5000u`, `o−5000w`, CCW about `+n`.

> Reproduce the trig **as written** — `Math.cos(2*Math.PI*1/4)` is
> `6.123233995736766e-17`, not `0`, so `vert[1]` has an `u` component of
> `3.06e-13`. IEEE doubles make JS produce the identical value, but
> hard-coding `0` would perturb hash-bucket membership at the margins.

There is a second, **dead** seed builder that inflates an actual polyhedron face
about its own centroid; it is never called:

```java
static SFace makeSeedFace(Polyhedron poly, int face, Plane plane){
    // center = centroid of face vertices
    // vert[i] = (poly.vertices[iface[i]] - center)*FACTOR + center
}
```

---

## 4. `makeStellationFaces(Plane[] planes, int maxintersection)` — the arrangement

```java
public SFace[][] makeStellationFaces(Plane[] planes, int maxintersection) {

    System.out.println("planes: " + planes.length);
    this.planes = planes;
    DoubleIndex[] pindex = new DoubleIndex[planes.length];
    for(int i=0; i < pindex.length; i++) pindex[i] = new DoubleIndex(0., i);

    FastHashtable vtable = new FastHashtable();          // all generated vertices
    SFace[][] faces = new SFace[planes.length][];

    for(int i=0; i < planes.length; i++){
        sortPlanes(pindex, planes, planes[i]);
        Vector vfaces = new Vector();
        vfaces.addElement(makeSeedFace(planes[i], i));
        for(int j = 0; j < planes.length; j++)
            if(pindex[j].index != i)
                intersectFacesWithPlane(vfaces, planes[pindex[j].index], vtable, i, maxintersection);
        faces[i] = cleanFaces(vfaces);
    }

    // rebuild vtable from surviving vertices only
    vtable = new FastHashtable();
    for(all faces[i][j], all vertices k) vtable.put(v, v);
    System.out.println("vertices found: " + vtable.size());
    return faces;
}
```

Note `this.planes = planes` — the field is assigned as a side effect.
`pindex` is a single array reused for every plane; `sortPlanes` permutes it in place.

### 4.1 `sortPlanes` — the cutting order

```java
static void sortPlanes(DoubleIndex[] pindex, Plane[] planes, Plane plane){
    for(int i=0; i < pindex.length; i++)
        pindex[i].value = -plane.v.dot(planes[pindex[i].index].v);
    QSort.quickSort(pindex, 0, pindex.length-1, pindex[0]);
}
```

* Key = `−(n_ref · n_j)`, sorted **ascending** ⇒ planes are visited in order of
  **descending** `n_ref · n_j`.
* The reference plane itself has key `−1` and therefore ends up (essentially)
  first; it is skipped by `if(pindex[j].index != i)`.
* Near-parallel planes (whose in-plane cut lines are far away) are applied
  first; anti-parallel planes last.
* Ties (`compare` returns 0 on exactly equal doubles) keep their previous
  relative order because `QSort.quickSort(Object[],int,int,Comparator)` delegates
  to `sort(a, lo, hi+1, c)` which is a **stable merge sort** (insertion sort
  below length 7). *Reproducing this stability matters* — the array `pindex`
  is carried over from the previous plane's sort, so ties inherit the previous
  permutation. A JS port must (a) use a stable sort, and (b) reuse and mutate
  the same `pindex` array across the outer loop, exactly as Java does.
* `pindex[0]` is passed as the comparator instance; `DoubleIndex.compare` is
  stateless so which element it is does not matter.

### 4.2 `intersectFacesWithPlane` — one clip pass

```java
static double[] fval = new double[1000];
static final double THRESHOLD = 1.e-7;

static void intersectFacesWithPlane(Vector faces, Plane plane,
                                    FastHashtable vtable, int index, int maxintersection){
    double dist2 = plane.d;                 // NAME IS MISLEADING: this is d, not a squared length
    int fsize = faces.size();               // captured BEFORE the loop

    for(int i=0; i < fsize; i++){
        int nplus = 0, nminus = 0;
        SFace sface = (SFace)faces.elementAt(i);
        for(int j = 0; j < sface.vertices.length; j++){
            if(sface.vertices[j] == null){ /* prints "null pointer!!!!!!" and skips */ }
            else {
                fval[j] = sface.vertices[j].dot(plane.v) - dist2;
                if(fval[j] < THRESHOLD) nminus++; else nplus++;
            }
        }

        if(nminus == 0){ sface.layer++; continue; }   // entire polygon outside → just bump layer
        if(nplus  == 0){ continue; }                  // entire polygon inside  → nothing to do
        ... split (see §4.3) ...
    }
}
```

Notation: for the cutting plane `Q = (m, e)` with unit normal `m = plane.v` and
`e = plane.d`, the signed distance of a vertex `V` is

```
f(V) = V·m − e
```

Classification uses a **biased** threshold, not zero:

```
f(V) <  1.e-7  →  "minus" / inside  (kept in the same SFace)
f(V) >= 1.e-7  →  "plus"  / outside (goes to the new SFace, layer+1)
```

The comment in the source says exactly why:
`// to breake a little bit symmetry of +/-`. A vertex lying exactly on the cut
line counts as *inside*, so a facet that merely touches a cut line is not split
into a degenerate sliver.

In 2D terms, `f` restricted to the plane's frame is the affine function

```
f(a,b) = a·(u·m) + b·(w·m) + (o·m − e)
```

so the cut is the straight line `a·(u·m) + b·(w·m) = e − o·m`. The code never
forms this 2D line explicitly — it evaluates `f` on 3D vertices.

`fsize` is captured before the loop, so polygons created during this pass are
**not** re-cut by the same plane (correct: they are already on one side of it).

`fval` is a **static** array of length 1000 — a shared scratch buffer, with the
comment `// we assume, that there will be less than 1000 vertices in polygon`.
No bounds check. Not thread-safe.

The `int index` parameter (the reference plane's index) is **never read** in the
body; it is dead. The `null`-vertex branch is also worth noting for a port: it
prints and skips *without* incrementing `nplus`/`nminus` and *without* writing
`fval[j]`, so a stale `fval[j]` from a previous polygon is left in place and the
`vins`/`vout` array sizes would no longer match the run lengths. It never fires
in practice.

### 4.3 The convex split

Because every polygon is convex and the split function is affine, the
"minus" vertices form one contiguous cyclic run and the "plus" vertices form
the complementary run. The code finds the four boundary indices:

```java
int lastin = 0, lastout = 0, firstin = 0, firstout = 0;
int polysize = sface.vertices.length;

// find any positive point
while(fval[lastout] < THRESHOLD) lastout = (++lastout)%polysize;

// walk forward over the positive run to the first negative point
firstin = (lastout+1)%polysize;
while(fval[firstin] >= THRESHOLD){ lastout = firstin; firstin = (++firstin)%polysize; }

// walk forward over the negative run to the first positive point
lastin = firstin;
firstout = (lastin+1)%polysize;
while(fval[firstout] < THRESHOLD){ lastin = firstout; firstout = (++firstout)%polysize; }
```

So after this block:
`lastout` = last outside vertex before the run of inside vertices;
`firstin` = first inside vertex; `lastin` = last inside vertex;
`firstout` = first outside vertex after them. Cyclic order is
`... lastout, firstin, ..., lastin, firstout, ...`.

Then the two new polygons:

```java
int inside = firstin;
Vector3D[] vins = new Vector3D[nminus+2];
Vector3D[] vout = new Vector3D[nplus+2];
int count = 0;
while(fval[inside] < THRESHOLD){ vins[count++] = sface.vertices[inside]; inside = (++inside)%polysize; }

Vector3D pnt1 = findVertex(vtable, interpolate(sface.vertices[lastin],  sface.vertices[firstout],
                                               fval[lastin],  fval[firstout]));
Vector3D pnt2 = findVertex(vtable, interpolate(sface.vertices[lastout], sface.vertices[firstin],
                                               fval[lastout], fval[firstin]));
vins[count++] = pnt1;
vins[count++] = pnt2;

count = 0;
vout[count++] = pnt2;
vout[count++] = pnt1;
int outside = firstout;
while(fval[outside] >= THRESHOLD){ vout[count++] = sface.vertices[outside]; outside = (++outside)%polysize; }

SFace fout = new SFace(vout, sface.getPlane());
fout.layer = sface.layer + 1;

sface.vertices = vins;                                  // in-place replacement of the inside part

if(maxintersection < 0 || fout.layer < maxintersection)
    faces.addElement(fout);
```

Resulting winding (both CCW about `+n`, matching the parent):

```
vins = [ firstin, ..., lastin, pnt1, pnt2 ]
vout = [ pnt2, pnt1, firstout, ..., lastout ]
```

`pnt1` lies on the edge `lastin → firstout`; `pnt2` lies on the edge
`lastout → firstin`. The shared edge is traversed `pnt1→pnt2` in `vins` and
`pnt2→pnt1` in `vout` — opposite directions, as it must be for two faces with
the same orientation.

Array sizes are exact: `nminus + 2` and `nplus + 2`.

The `(++x)%polysize` idiom is `x = (x+1) % polysize` in both Java and JS
(post-assignment of a pre-incremented value). Safe to port literally.

Also, `sface.layer` is bumped in the `nminus == 0` branch **without** any
`maxintersection` check, whereas `fout.layer` is checked. See §5.

### 4.4 The `layer` invariant

After the whole outer loop for plane `i` completes, for any surviving facet `F`:

```
F.layer = #{ j : j ≠ i and F lies on the positive side of plane j }
```

i.e. the number of face planes whose **outer** half-space contains `F`. Read
that half-space as **closed**, not open: a plane that actually *split* `F` off
as the outside piece contributes `+1`, yet the two interpolated corners `pnt1`,
`pnt2` lie exactly *on* that cut line and therefore have
`f = planes[j].v·X − planes[j].d ≈ 0 < THRESHOLD`. Only for planes that never
cut `F` (the `nminus == 0` branch) does *every* vertex satisfy `f >= THRESHOLD`.
The `1e-7` bias decides only the borderline "touches the line" case, in favour
of *inside*. Therefore:

* `layer == 0` ⇔ `F` lies inside every half-space ⇔ `F` is the face of the
  **convex core** on this plane. `getPolyhedron(0)` reconstructs the original
  convex polyhedron.
* `layer == 1` is the first stellation shell, etc.
* `maxlayer = findMaxLayer(faces)` = max over all facets.

`findMaxLayer`:

```java
static int findMaxLayer(SFace[] faces){ max of sf.layer }
static int findMaxLayer(SFace[][] faces){ max over rows }
```

### 4.5 Vertex interning: `findVertex` and `interpolate`

```java
static Vector3D findVertex(FastHashtable vtable, Vector3D vector){
    Vector3D v = (Vector3D)vtable.get(vector);
    if(v != null) return v;
    vtable.put(vector, vector);
    return vector;
}

static Vector3D interpolate(Vector3D p1, Vector3D p2, double t1, double t2){
    // p = (p1*t2 - p2*t1)/(t2 - t1);
    double t12 = t2 - t1;
    if(t12 == 0.0){ System.out.println("t1 == t2"); return new Vector3D(p1); }
    t1 /= t12;
    t2 /= t12;
    return new Vector3D((p1.x*t2 - p2.x*t1), (p1.y*t2 - p2.y*t1), (p1.z*t2 - p2.z*t1));
}
```

`interpolate` is the exact zero-crossing of the affine function: with
`f(p1) = t1` and `f(p2) = t2`, the returned point is
`(p1·t2 − p2·t1)/(t2 − t1)`.

**Reproduce the two divisions in this order** (`t1 /= t12; t2 /= t12;` *then*
multiply) rather than the algebraically equivalent single division — the
rounding differs and vertex identity depends on ≈1e-6 agreement.

The source flags this as the main accuracy weakness:

```
// TO-DO - this is place, where significant roundof error may come
// instead of calculating intesection in plane we better calculate
// intersection of 3 planes forming that vertex
```

The interning is what makes vertex identity global: the *first* computed
instance of a corner wins, and every subsequent nearby computation of the same
corner returns that same object. Later stages (`cleanVertices`,
`SFace.adjacent`, `makeVertexTable`) rely on `==`.

### 4.6 `cleanFaces` — dropping the artificial boundary

```java
static double MAXVERTEX = 2.e3;

static SFace[] cleanFaces(Vector faces){
    int flag[] = new int[faces.size()];
    int count = 0;
    for(int i = 0; i < flag.length; i++){
        SFace face = (SFace)faces.elementAt(i);
        // bad aproach !!!
        if(getLongestVertex(face.vertices) < MAXVERTEX){
            face.cleanVertices();
            if(face.vertices.length > 2){ flag[i] = 1; count++; }
        }
    }
    // compact, preserving order
}

static double getLongestVertex(Vector3D[] vertices){ // max |v[i]| — distance from the ORIGIN
}
```

Rules, in order:

1. Discard any facet with a vertex further than `2000` from the **world origin**
   (not from the plane's own centre). Seed radius is `5000`, so this reliably
   removes every facet that still touches the artificial square boundary — and
   also removes any genuine but very large facet. The author's own comment is
   `// bad aproach !!!`.
2. On the survivors, run `cleanVertices()` (identity-based removal of
   consecutive duplicates).
3. Keep only facets with `vertices.length > 2`.
4. Output order = original insertion order in `vfaces`, with holes squeezed out.

**Facet index semantics.** `faces[p][j]` — `p` is the plane index
(`== planes[p].index == faces[p][j].getPlaneIndex()`), and `j` is the position
after `cleanFaces` compaction, i.e. creation order:

* `vfaces` element 0 is the seed face, which is repeatedly narrowed in place and
  ends as the `layer == 0` facet (the convex-core face). If it survives the
  radius test it is `faces[p][0]`.
* subsequent elements are the "outside" pieces `fout`, in the order they were
  split off, which is determined by the `sortPlanes` order.

Nothing in the code sorts facets geometrically. `createDiagram` therefore
re-finds the central facet by minimum `|center|²`:

```java
double rMin = 1.e20;
for(int i=0; i < ffaces.length; i++){
    double r = ffaces[i].getCenter().length2();
    if(r < rMin){ rMin = r; index = i; }
}
```

---

## 5. What `maxintersection` limits

`maxintersection` is threaded from the CLI (`StellationUI.main`, option `-t <n>`;
default `-1`) and from `StellationController.maxIntersection` (field initialised
to `-1`) all the way into `intersectFacesWithPlane`, where its *only* use is:

```java
if(maxintersection < 0 || fout.layer < maxintersection)
    faces.addElement(fout);
```

So:

* `maxintersection < 0` (the default) ⇒ unlimited; the full arrangement is built.
* `maxintersection = M > 0` ⇒ a newly split-off outside piece is **dropped
  entirely** (and therefore never further subdivided) as soon as its layer would
  reach `M`. Facets with `layer >= M` do not appear in `faces[][]`, except for
  the case below.
* It is a **layer cap**, not a count of plane-plane intersections, despite the
  name. Effective retained layers are `0 .. M-1`.

**Two caveats a faithful port must keep:**

1. The check is applied only to the newly created outside polygon. The branch
   `if(nminus == 0){ sface.layer++; continue; }` bumps the layer of an *existing*
   polygon with no cap check. A facet can therefore end up with
   `layer >= maxintersection` if the increments came from "wholly outside"
   events rather than split events. Whether that happens depends on the
   `sortPlanes` order, so the culling is **order-dependent in edge cases** —
   reproduce the ordering exactly rather than reasoning about it.
2. `maxintersection` is distinct from `StellationController.maxLayer`
   (default `1000`), which caps the number of layers processed later in
   `makeCells2`, not the arrangement.

---

## 6. Auxiliary intersection routines (used by the diagram, not by the arrangement)

### 6.1 `intersect(Plane p, Vector3D v)` — plane ∩ line through origin

```java
public static Vector3D intersect(Plane p, Vector3D v){
    // (t*v, p) - d = 0;
    double denom = (p.v.dot(v));
    if(Math.abs(denom) < Plane.TOLERANCE)     // Plane.TOLERANCE = 1.e-10
        return null;
    return v.mul(p.d / denom);
}
```

Returns `v · (d / (n·v))`. `null` when the line is (near) parallel to the plane.
Used in `createDiagram` to map each symmetry axis onto the plane.

### 6.2 `intersect(Plane P1, Plane P2, double r)` — plane ∩ plane, clipped to a sphere

```java
public static Vector3D[] intersect(Plane P1, Plane P2, double r){
    double EPSILON = 0.001;                       // LOCAL variable, not a class constant
    Vector3D T  = P1.v.cross(P2.v);
    Vector3D T1 = T.cross(P1.v);
    double t1p2 = T1.dot(P2.v);
    if(Math.abs(t1p2) < EPSILON) return null;     // planes (near) parallel
    double t1 = (P2.d - P1.d*P2.v.dot(P1.v))/t1p2;
    Vector3D P = T1.mul(t1).add(P1.v.mul(P1.d));  // point on the intersection line
    double d = (r*r+1) - P.dot(P);
    if(d <= 0.) return null;                      // line misses the sphere
    Vector3D points[] = new Vector3D[2];
    double t12 = Math.sqrt(d/T.dot(T));
    points[0] = P.add(T.mul( t12));
    points[1] = P.add(T.mul(-t12));
    return points;
}
```

`T` is **not** normalised (`|T| = sin θ` between the normals) — the `T·T`
division compensates. `P` is the point of the line closest to the origin, so
the two returned points are at distance `sqrt(r² + 1)` from the origin. The
`+1` is an unexplained fudge that lengthens the drawn segment slightly. Note
`EPSILON = 0.001` here is enormously looser than `Plane.TOLERANCE = 1e-10`.

Used only by `createDiagram` for drawing symmetry mirror lines.

### 6.3 `Plane.intersect(Plane p1, Plane p2, Plane p3)` — three planes

```java
public static Vector3D intersect(Plane p1, Plane p2, Plane p3){
    try {
        double[][] vals = {{p1.v.x,p1.v.y,p1.v.z},
                           {p2.v.x,p2.v.y,p2.v.z},
                           {p3.v.x,p3.v.y,p3.v.z}};
        double[][] d = {{p1.d},{p2.d},{p3.d}};
        Matrix A = new Matrix(vals);
        Matrix B = new Matrix(d);
        Matrix result = A.solve(B);
        double[][] arr = result.getArray();
        return new Vector3D(arr[0][0],arr[1][0],arr[2][0]);
    } catch (Exception e){ }
    return null;
}
```

`Jama.Matrix.solve` on a square matrix is `LUDecomposition.solve`: Crout LU with
**partial pivoting**, throwing `RuntimeException("Matrix is singular.")` when any
`LU[j][j] == 0` **exactly**. Near-singular systems return huge coordinates
instead of `null`, which is why the caller in §2.3(d) additionally rejects
`v.length() > 1.E5`.

Port note: a plain 3×3 Gaussian elimination with partial pivoting reproduces
this to within a few ulps. Exact bit-agreement is not required because the
result is only used as a snap target, matched within `1e-6`.

---

## 7. The vertex hash table (`FastHashtable`) — exact matching predicate

`FastHashtable extends java.util.Hashtable` but shadows the whole
implementation: `table[]`, `count`, `threshold`, `loadFactor` are private
fields of `FastHashtable`, and `get`/`put`/`remove`/`size`/`keys`/`elements` are
all overridden.

```java
public FastHashtable(){ this(101, 0.75f); }
public FastHashtable(int initialCapacity){ this(initialCapacity, 0.75f); }

public Object get(Object key) {
    HashtableEntry tab[] = table;
    int hash = key.hashCode();
    int index = (hash & 0x7FFFFFFF) % tab.length;
    for (HashtableEntry e = tab[index]; e != null; e = e.next)
        if ((e.hash == hash) && e.key.equals(key)) return e.value;
    return null;
}
```

Rehash: `newCapacity = oldCapacity*2 + 1`, triggered when `count >= threshold`,
`threshold = (int)(capacity * loadFactor)`.

**The matching predicate for vertices is therefore:**

```
match(a, b)  ⇔  hash32(a) == hash32(b)
              AND |a.x-b.x| < 1e-6 AND |a.y-b.y| < 1e-6 AND |a.z-b.z| < 1e-6
```

where

```
hash32(v) = int32( trunc(331345.563*v.x) + trunc(412345.891*v.y) + trunc(71341.678*v.z) )
```

`trunc` = truncate toward zero; the sum wraps as a 32-bit signed int.

Two vertices that agree to `1e-9` but straddle a quantisation boundary of the
hash (grid steps ≈ `3.02e-6` / `2.42e-6` / `1.40e-5`) will hash differently and
**will not be merged**. This is a real, load-bearing behaviour: a JS port that
uses a tolerance-only spatial index will produce a *different* (arguably better)
vertex set and hence different facet vertex counts and different
`cleanVertices` results. To reproduce the original output exactly, implement the
same two-part predicate: `Map<int32, Vector3D[]>` keyed by `hash32`, linear scan
within the bucket applying the `1e-6` componentwise test.

`(hash & 0x7FFFFFFF) % capacity` only affects performance, not which entries can
match, because `e.hash == hash` is required — so the capacity/rehash schedule
does **not** need to be reproduced.

Enumeration order (`keys()` / `elements()`) walks buckets **from high index down
to 0**, and within a bucket follows the collision chain (most recently inserted
first, since `put` prepends). Order-sensitive consumers include
`getPolyhedron(SSCell[])`, `printSortedVertices` before sorting and
`makeCellsFromFaceCells` — and, contrary to what one might assume, **also one
step of this stage**: `makeSymVertTable` (§2.3(d)) iterates
`inttable.elements()` and inserts `v.mul(sm[i])` only when no tolerance-match is
already present, so *which* of several near-coincident images becomes the stored
representative depends on the enumeration order, and hence on the bucket index
`(hash & 0x7FFFFFFF) % capacity` and on the rehash schedule. The representatives
agree to ~1e-12, so this shifts final vertex coordinates only in the last few
digits, but it does mean the "capacity/rehash schedule need not be reproduced"
remark above is strictly about the *matching predicate*, not about bit-identical
seeded-vertex coordinates.

> **UNCERTAIN:** whether that last-digit divergence can ever flip a `1e-6`
> tolerance comparison later and change facet topology. Not tested.

---

## 8. `readVectors` — StreamTokenizer parsing

```java
public static Vector3D[] readVectors(String filename){
    ...
    Reader r = new BufferedReader(new InputStreamReader(f));
    StreamTokenizer tok = new StreamTokenizer(r);
    Vector vv = new Vector();
    while(tok.nextToken() != StreamTokenizer.TT_EOF){
        double x,y,z;
        x = tok.nval;
        if(tok.nextToken() == StreamTokenizer.TT_EOF) break;
        y = tok.nval;
        if(tok.nextToken() == StreamTokenizer.TT_EOF) break;
        z = tok.nval;
        Vector3D v1 = new Vector3D(x,y,z);
        if(v1.length2() != 0.0) vv.addElement(v1);
    }
    ...
}
```

Quirks of the default `java.io.StreamTokenizer` configuration that a JS reader
must emulate (or deliberately fix):

* `parseNumbers()` is on by default. `tok.nval` is only meaningful when
  `ttype == TT_NUMBER`; this code **never checks `ttype`**, so a word token
  contributes the *stale previous* `nval`.
* The default number grammar accepts `-` and `.` but **not** exponents:
  `1.5e3` tokenises as the number `1.5` followed by the word `e3`. Scientific
  notation in an input file is silently mis-parsed.
* `commentChar('/')` is on by default: a `/` starts a line comment.
* `'` and `"` are quote characters by default; `eolIsSignificant(false)`.
* Zero vectors are dropped (`length2() != 0.0`, exact comparison).

If the input file name ends with `.off`, `Polyhedron.readOFF` is used instead
and `v = poly.vertices`.

---

## 9. Reference implementation outline (JS)

```js
const THRESHOLD  = 1e-7;
const FACTOR     = 5e3;
const MAXVERTEX  = 2e3;
const V_TOL      = 1e-6;      // Vector3D.tolerance
const PLANE_TOL  = 1e-10;     // Plane.TOLERANCE

// planes: [{ n:{x,y,z} unit, d:number, index:int }]
function buildArrangement(planes, maxIntersection /* -1 = unlimited */, vtable /* interner */) {
  const faces = new Array(planes.length);
  // reused across the outer loop, exactly like Java's pindex
  const pindex = planes.map((_, i) => ({ value: 0, index: i }));

  for (let i = 0; i < planes.length; i++) {
    sortPlanes(pindex, planes, planes[i]);            // stable, ascending by -(n_i · n_j)
    const vfaces = [ makeSeedFace(planes[i]) ];       // one huge CCW square
    for (let j = 0; j < planes.length; j++) {
      const p = pindex[j].index;
      if (p !== i) clipAll(vfaces, planes[p], vtable, maxIntersection);
    }
    faces[i] = cleanFaces(vfaces);
  }
  return faces;
}

function clipAll(vfaces, plane, vtable, maxIntersection) {
  const fsize = vfaces.length;                        // snapshot BEFORE the loop
  const fval  = SCRATCH;                              // shared Float64Array(1000)
  for (let i = 0; i < fsize; i++) {
    const F = vfaces[i];
    let nplus = 0, nminus = 0;
    for (let j = 0; j < F.vertices.length; j++) {
      fval[j] = dot(F.vertices[j], plane.n) - plane.d;
      if (fval[j] < THRESHOLD) nminus++; else nplus++;
    }
    if (nminus === 0) { F.layer++; continue; }
    if (nplus  === 0) { continue; }
    // ... §4.3 verbatim ...
  }
}
```

Ordering of operations that must not be "cleaned up":

1. `sortPlanes` must be **stable** and must mutate the shared `pindex`.
2. `fval` classification must use `< 1e-7` / `>= 1e-7`, never `< 0` / `>= 0`.
3. `interpolate` must divide `t1` and `t2` by `t12` separately before
   multiplying.
4. `findVertex` must consult the interner *before* the vertex is stored in any
   polygon, and the interner must use the hash+tolerance predicate of §7.
5. `cleanFaces` must apply the radius test **before** `cleanVertices`, and must
   preserve insertion order.

---

## 10. JS PORTING NOTES

**`Vector` / `Hashtable` / `FastHashtable`.**
`java.util.Vector` → plain `Array` (note `Vector.size()` snapshots matter, §4.2).
`FastHashtable` is *not* a `Map`: its lookup requires `hashCode` equality **and**
`equals`, and `equals` is a tolerance test. Model it as
`Map<int32, Array<Vector3D>>` + linear scan; do **not** substitute a string key
like `` `${x},${y},${z}` `` or a rounding-based spatial hash — you will get a
different vertex set. `FastHashtable.put(k,v)` throws `NullPointerException` on
a null *value* (not key). Enumeration order is high-bucket-first,
newest-first-within-bucket.

**Integer arithmetic in hashes.**
`(int)(331345.563*x)` = `Math.trunc(...)` (toward zero, not `Math.floor`).
The three-term sum overflows 32 bits in Java and **wraps**; in JS write
`(Math.trunc(a) + Math.trunc(b) + Math.trunc(c)) | 0`. Also true for
`Plane.hashCode`. `SEdge.hashCode()` is `v1*v2` — an int multiply that wraps;
use `Math.imul(v1, v2)`. `FEdge.hashCode()` is likewise `v1*v2`.
`OrientedEdge.hashCode()` (inner class in `Stellation`) is `v1 + 119*v2`.

**Integer division.**
`QSort`'s `int mid = (lo + hi)/2` and `mergeSort`'s `(low + high)/2` truncate.
Use `(lo + hi) >> 1` or `Math.floor`. Also `for(int v = 0; v < vertices.length/2; v++)`
in `transformFace` (reversal loop) — `length/2` truncates.

**`float` vs `double`.**
Everything in the geometry path is `double`; JS numbers match exactly. The only
`float` is `FastHashtable.loadFactor = 0.75f` (irrelevant, §7). `Color`
components are ints. `GeneralPath` in the UI uses `float` casts — display only.

**`hashCode`/`equals` identity.**
`Vector3D` has both (inconsistent, §1.1). `Plane` has both. `SFace` overrides
only `hashCode` (centre-based) ⇒ hash-table lookups on `SFace` behave as
*identity* keys that happen to hash by position — reproduce by using the
`SFace` object itself as a `Map` key, and, if you need the centre hash for
bucketing, key on `[centerHash, objectRef]`. `SVertex` also overrides only
`hashCode`. `OrientedEdge.equals` is **broken in the original**: it does
`if(!(o instanceof SEdge)) return false;` — comparing an `OrientedEdge` against
`SEdge`, so `OrientedEdge` never equals another `OrientedEdge`. `OrientedEdge`
is currently unused; do not "fix" it if you are chasing bit-identical output.

**Static mutable state.**
`Stellation.fval` (`static double[1000]`), `Stellation.FACTOR`,
`Stellation.MAXVERTEX` (both non-final `static double`, so writable at runtime),
`Plane.rndDir`, `Plane.TOL`, `Vector3D.TOL`, `Polyhedron.outFaces/outEdges/outVertices`,
and the **named** `Symmetry.<Group>` matrix caches (`static Matrix3D[] E, I, O, Oh,
T, D2h, S10_I, ...`, each lazily filled by `if(X == null){...}`). The
*parameterised* families are **not** cached: `getCn(n)`, `getDn(n)`, `getDnh(n)`,
`getDnd(n)`, `getSn(n)` allocate a fresh `Matrix3D[]` on every call. Beware
`Matrix3D.rotation(Vector3D axis, double angleRad)` — it calls `axis.normalize()`
and thereby **mutates its argument**. In a JS port make it non-mutating, but only
after confirming no call site depends on the side effect (none in the arrangement
path does).
A single shared scratch buffer means the arrangement is not re-entrant — fine
for a single-threaded JS port, but do not run two arrangements concurrently in
workers sharing one module instance. There is **no bounds check** on
`fval[j]` for polygons with ≥ 1000 vertices (in Java that throws
`ArrayIndexOutOfBoundsException`; in JS a `Float64Array` write is silently
dropped and a plain `Array` grows — add an explicit guard/throw).

**`Vector3D.hashCode` dead cache.**
The field `int hashCode = 0` is reset to 0 by every mutator but is **never
assigned** by `hashCode()`, so the value is recomputed each call. Mutating a
`Vector3D` after it has been used as a hash key (which `rotateFaces` /
`translateFaces` do in `createDiagram`) therefore silently changes its hash.
`createDiagram` avoids corruption only because it works on `new SFace(SFace)`
deep copies. Preserve that copying.

**`(++x)%n`.**
Identical semantics in Java and JS; safe to port literally. Do not rewrite as
`x = (x+1) % n` inside a condition without checking — but in the four loops of
§4.3 it *is* exactly `x = (x+1) % n`.

**`StreamTokenizer`.**
See §8. If you re-implement the reader with `parseFloat`/regex you will accept
exponent notation that the original silently corrupts — a deliberate divergence,
worth logging.

**Java `(int)` cast saturation.**
Java saturates a `double → int` cast at `Integer.MIN_VALUE/MAX_VALUE`; JS `| 0`
wraps. Seed vertices sit at `o + FACTOR·(unit)` with `|o| = |plane.d|`, so the
bound on one coordinate is `|coord| <= |d| + FACTOR`, i.e. ≈ 5000 for the usual
`|d| = O(1)` — *not* exactly 5000. The largest coefficient then gives
`412345.891 * 5000 ≈ 2.061e9 < 2^31−1 = 2.147e9`, so saturation never fires and
`Math.trunc(...)` followed by `|0` on the *sum* is correct. The exact saturation
threshold is `2147483647 / 412345.891 ≈ 5207.7`: if `|d| + FACTOR` ever exceeds
that, the `412345.891*y` term saturates in Java and you must emulate it.

**`Color`.**
`makeTopBottomColors()` returns
`col[1] = Color((int)(0.85*255), (int)(0.85*255), (int)(0.1*255))` = `(216,216,25)`
and `col[0] = Color((int)(0.95*255), (int)(0.4*255), (int)(0.2*255))` = `(242,102,51)`.
Note `(int)` truncation: `0.85*255 = 216.75 → 216`, `0.1*255 = 25.5 → 25`,
`0.95*255 = 242.25 → 242`, `0.4*255 = 102.0 → 102`, `0.2*255 = 51.0 → 51`.

---

## 11. Diagram frame (for the 2D facet-picker UI)

`createDiagram(int findex, int vertexUp, String symmetry, Object[][] facets)`
builds the flattened 2D view. It is a *display* transform, independent of the
construction frame of §3:

1. Pick `index` = the facet of `faces[findex]` with the smallest
   `getCenter().length2()`.
2. Deep-copy the facet list (`new SFace(SFace)`) and the selected-facet list
   (`facets[i][0]` with layer from `facets[i][1]`).
3. Map each symmetry axis onto the plane:
   `Stellation.intersect(plane, symAxes[i].vector)` (§6.1), keeping order.
   When `intersect` returns `null` (axis parallel to the plane) the slot is left
   **null** — `axes[i]` is never assigned — and every later loop null-checks it.
   A port must keep the array length and the null holes.
4. Map each mirror plane to a chord:
   `Stellation.intersect(plane, symPlanes[i], getMaxRadius())` (§6.2).
5. `translateFaces(nsfaces, center)` / `translateFaces(nffaces, center)` —
   subtract the chosen facet's centre from every vertex; likewise subtract it
   from the axis points and chord endpoints.
6. `normal = (vert[1]−vert[0]) × (vert[2]−vert[1])`, normalised;
   `rotateFaces(..., normal, z)` with `z = (0,0,1)` — rotates the plane normal
   onto `+Z` via `Vector3D.rotateSet(from, to)` (rotation about `from × to` by
   the angle whose sine is `|from × to|` and cosine is `from · to`; a no-op when
   `|sin| <= TOL = 1e-10`, so an already-aligned or exactly-antiparallel normal
   is left alone — **antiparallel is a latent bug**).
7. If `vertexUp < face.vertices.length`, rotate again so that
   `normalize(face.vertices[vertexUp])` lands on `y = (0,1,0)`.
8. Returns `Diagram { SFace[] faces; SFace[] ffaces; Axis[] axes; Vector3D[][] planes; }`
   where `faces` = selected facets, `ffaces` = all facets of the plane.

The canvas then simply **drops z**: `new Point2(v.x, v.y)`
(`StellationCanvas.java:415`, `:321`, `:330-331`).

Note step 6 uses the *translated* copy's first three vertices — the rotation in
that same step is applied afterwards, using the normal computed from the
already-translated (but not yet rotated) vertices (`Stellation.java:2893` vs
`:2897`).

The `normal` computed there is `(v1−v0) × (v2−v1)`, which is the **same**
convention as `getPlane()`'s `(v2−v1) × (v0−v1)`, not the opposite one: with
`a = v1−v0` and `b = v2−v1` we have `v0−v1 = −a`, so
`(v2−v1)×(v0−v1) = b×(−a) = −(b×a) = a×b = (v1−v0)×(v2−v1)`. The two
expressions are algebraically identical. Hence for a CCW facet this `normal`
agrees with `plane.v` (points **outward**), `rotateFaces(normal → +Z)` puts the
+normal side towards the viewer, and dropping `z` yields an **unmirrored** view
consistent with the construction frame of §3. Do not insert a flip.

---

## 12. UNCERTAIN

* **UNCERTAIN:** whether `maxintersection` was ever intended to also cap the
  `nminus == 0 → sface.layer++` path. As written it does not (§5, caveat 1).
  The CLI help text is only
  `out.println("-t <max number of intersections>");` (`StellationUI.printHelp`),
  which does not disambiguate; no test or sample invocation pins it down.
* **RESOLVED — and the assumption is FALSE in general.** §2.3 assumes
  `Symmetry.getMatrices(sym)[0]` is the identity, so that `orb[i][0] == canvect[i]`.
  Confirmed identity-first for `getE()`, `getI()`, `getO()`, `getT()`, `getOh()`
  (its first 24 entries are `getO()` verbatim), `getSn(n)` (`D[0] = new Matrix3D()`
  explicitly), and `getCn(n)` / `getDn(n)` / `getDnh(n)` / `getDnd(n)` (element 0
  is `Matrix3D.rotation((0,0,1), 0)`, numerically the identity).
  **Counterexamples exist:** `getS10_I()` sets `S10_I[0] = refl·rot`
  (`Symmetry.java:1125`) and `getS6_I()` does the same (`:1149`) — both reachable
  via the symmetry names `"S10(I)"` and `"S6(I)"` (`Symmetry.java:199-202`). For
  those groups `orb[i][0] != canvect[i]`, and — worse — §2.3(f) then applies
  `svector.matrix` (which maps `canvect[i]`, not `orb[i][0]`) to
  `faces[findex]`, so the symmetric copies are transformed from the wrong source
  plane. Treat `sm[0] != identity` as a latent bug in the original, not as
  behaviour to port faithfully without checking.
  Note also `getD2h()` (`Symmetry.java:562`) is **dead code** — the name `"D2h"`
  dispatches to `getDnh(2)`, so spot-checking `getD2h()` proves nothing about
  the `"D2h"` symmetry.
  Separately: `Matrix3D.rotation(Vector3D axis, double)` calls `axis.normalize()`,
  **mutating the caller's vector** — safe only because every call site passes a
  freshly allocated `new Vector3D(...)`. Covered by a separate spec.
* **UNCERTAIN:** whether the `+1` in `d = (r*r+1) - P.dot(P)` (§6.2) is a
  deliberate margin or a leftover. It only affects the drawn length of mirror
  lines in the diagram.
* **UNCERTAIN:** whether any real input ever produces a polygon with ≥ 1000
  vertices, overrunning the static `fval` buffer. For a plane arrangement of
  N planes a single facet can in principle have up to N edges, so N ≥ 1000
  planes would be required — plausible for large icosahedral orbits
  (e.g. 120-element groups × several canonical vectors stays well under 1000,
  but I did not bound it).
* **UNCERTAIN:** whether `Polyhedron.makeCCW()` guarantees outward-CCW for
  non-convex input; §2.4's outward-normal conclusion assumes it does. Not
  verified — `Polyhedron.java` (1136 lines) is outside this spec's scope.
* **RESOLVED (no shadow in §2.3).** `Stellation.makeStellationFaces(Plane[], int)`
  assigns `this.planes = planes` as a side effect while also *returning* the
  faces; there the **parameter** `planes` genuinely shadows the field, so the
  assignment is load-bearing. In the symmetric constructor (§2.3) there is **no**
  local shadow at all: `planes = new Plane[vectors.length];`
  (`Stellation.java:106`) writes the field directly, so the later
  `this.planes = planes;` (`Stellation.java:158`) is a pure self-assignment
  no-op. A port can drop it.
