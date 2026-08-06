# spec-03-symmetry.md — Symmetry group machinery

Reverse-engineered from:

- `stellation/src/main/java/pvs/polyhedra/Symmetry.java` (2298 lines) — the whole file
- `stellation/src/main/java/pvs/polyhedra/Matrix3D.java` (114 lines)
- `stellation/src/main/java/pvs/g3d/Matrix3D.java` (239 lines) — **unrelated** to symmetry, see §2.6
- `stellation/src/main/java/pvs/polyhedra/Vector3D.java`
- `stellation/src/main/java/pvs/polyhedra/Vector3Dsym.java`
- `stellation/src/main/java/pvs/polyhedra/Axis.java`, `Plane.java`
- `stellation/src/main/java/pvs/polyhedra/stellation/Utils.java`
- callers: `stellation/src/main/java/pvs/polyhedra/stellation/StellationController.java`,
  `stellation/src/main/java/pvs/polyhedra/Stellation.java`,
  `stellation/src/main/java/pvs/polyhedra/SSCell.java`,
  `stellation/src/ui/java/pvs/polyhedra/stellation/ui/StellationMain.java`,
  `stellation/src/ui/java/pvs/polyhedra/stellation/ui/DlgPlanes.java`
- helpers: `stellation/src/main/java/pvs/utils/QSort.java`, `StringComparator.java`

Every group table in this document was re-implemented in Python and checked for
(a) exact element count, (b) no duplicate elements, (c) closure under
multiplication, (d) determinant set. All checks passed — see §13 for what was
verified and what was not.

---

## 1. Where symmetry sits in the pipeline

```
Polyhedron (or hand-entered planes)
   │
   │  StellationController.makePolyhedronPlanes(poly)
   │     planes[i] = plane.v.mul(plane.d)          // foot of perpendicular, NOT a unit normal
   ▼
Vector3D[] m_polyhedronPlanes            (one per face of the seed polyhedron)
   │
   │  Utils.getCanonicalVectors(m_polyhedronPlanes, m_polySymmetry)   ← §9
   │     keeps only the vectors inside the fundamental domain of m_polySymmetry
   ▼
Vector3D[] canonical vectors  →  Utils.vectorsToPlanes → Plane[] m_canonicalPlanes
   │
   │  new Stellation(Utils.planesToVectors(m_canonicalPlanes),
   │                 m_polySymmetry, maxIntersection)   // StellationController:98, :200
   │     Symmetry.getOrbit(canvect[i], m_polySymmetry, i)             ← §10
   │     expands each canonical vector back to its full orbit
   │     NOTE the vector→Plane→vector round trip: planesToVectors calls
   │     Plane.toVector(), which THROWS when d == 0 (§14.9)
   ▼
full plane arrangement  →  faces  →  layers  →  primitive SCells
   │
   │  Stellation.makeCells2(m_polySymmetry, m_stellationSymmetry, maxLayer)
   │     makeSymmetricalCells(cells, fullSymmetry=m_polySymmetry, subCellSymmetry=m_stellationSymmetry)
   ▼
SSCell (one per m_polySymmetry-orbit of primitive cells)
   │
   │  Stellation.makeSymmetricalSubCells(cell, m_stellationSymmetry)
   ▼
SSCell.subCells (the m_stellationSymmetry-orbits inside each full-symmetry cell)
```

`m_polySymmetry` defaults to `"Ih"`, `m_stellationSymmetry` defaults to `"I"`
(`StellationController.java:51-52`). See §12 for the full/stellation pair.

---

## 2. Data structures

### 2.1 `pvs.polyhedra.Vector3D`

```java
public class Vector3D {
    public double x, y, z;
    int hashCode = 0;                       // reset to 0 by every mutator; never given a
                                            // non-zero value, so the cache is dead — see §14.7
    static final double tolerance = 1.e-6;  // used by equals() and collinear()
    static double TOL = 1.e-10;             // NOT final, package-private, used by chop()
}
```

Methods used by the symmetry code (exact semantics):

| Java | Math | Mutates? |
|---|---|---|
| `v.add(u)`, `v.sub(u)`, `v.mul(a)` | vector ops | no (returns new) |
| `v.addSet(u)`, `v.subSet(u)`, `v.mulSet(a)` | in-place | **yes** |
| `v.dot(u)` | `v·u` | no |
| `v.cross(u)` | `(y·uz − z·uy, z·ux − x·uz, x·uy − y·ux)` | no |
| `v.length()`, `v.length2()` | `|v|`, `|v|²` | no |
| `v.normalize()` | divides by `length()` **if length ≠ 0**; returns `this` | **yes** |
| `v.mul(Matrix3D M)` | **`M · v`** (v treated as a column vector) | no |
| `v.mulSet(Matrix3D M)` | `v ← M·v` | **yes** |
| `v.rotate(axis, θ)` | Rodrigues, `axis` must already be unit | no |
| `v.rotateSet(axis, θ)` | in-place Rodrigues | **yes** |
| `v.reflect(a, a0)` | `v − 2(v·â + a0)·â`, **normalizes `a` in place** | no (but mutates `a`) |

`Vector3D.mul(Matrix3D)`:

```java
return new Vector3D(x*m00+y*m01+z*m02,
                    x*m10+y*m11+z*m12,
                    x*m20+y*m21+z*m22);
```

So **`v.mul(M)` is `M·v`**, despite the name. Keep this straight — the whole
symmetry package depends on it.

`Vector3D.rotate(axis, sinθ, cosθ)`:

```java
Vector3D p = axis.mul(this.dot(axis));           // v∥ = â (v·â)
p.addSet(this.sub(p).mulSet(cosangle));          // + (v − v∥)·cosθ
p.addSet(axis.cross(this).mulSet(sinangle));     // + (â × v)·sinθ
```

i.e. `rotate(â,θ)(v) = â(v·â) + (v − â(v·â))cosθ + (â×v)sinθ`, identical to
`Matrix3D.rotation(â,θ) · v`. **The axis is NOT normalized inside `rotate`** —
callers must pass a unit axis (they all do).

`equals` / `hashCode` (§14.7 for the port consequences):

```java
public boolean equals(Object o){
    Vector3D v = (Vector3D)o;
    double dx = |v.x - x|, dy = |v.y - y|, dz = |v.z - z|;
    return dx < 1.e-6 && dy < 1.e-6 && dz < 1.e-6;
}
public int hashCode(){
    if(hashCode != 0) return hashCode;
    int value = (int)(331345.563*x) + (int)(412345.891*y) + (int)(71341.678*z);
    return value;                    // NOTE: never stored into the field
}
```

`(int)` is a **truncation toward zero**, not a floor.

### 2.2 `pvs.polyhedra.Matrix3D`

```java
public class Matrix3D {
    public double[][] m = new double[3][3];       // m[row][col]
    public Matrix3D();                            // identity
    public Matrix3D(double m00,m01,m02, m10,m11,m12, m20,m21,m22);   // ROW major
    public Matrix3D(Vector3D column1, Vector3D column2, Vector3D column3);  // COLUMNS
    public static Matrix3D reflection(Vector3D normal);
    public static Matrix3D rotation(Vector3D axis, double angleRad);
    public Matrix3D mul(Matrix3D a);              // returns this · a
    public double getDeterminant();               // lazily cached
}
```

`rotation(axis, θ)` — **mutates `axis` by calling `axis.normalize()`** — produces

```
        ⎡ t·a0² + c        t·a0·a1 − s·a2   t·a0·a2 + s·a1 ⎤
R(â,θ) = ⎢ t·a0·a1 + s·a2   t·a1² + c        t·a1·a2 − s·a0 ⎥
        ⎣ t·a0·a2 − s·a1   t·a1·a2 + s·a0   t·a2² + c      ⎦
    c = cos θ,  s = sin θ,  t = 1 − c,  (a0,a1,a2) = â (unit)
```

Right-handed / counter-clockwise looking down the axis toward the origin.
Sanity value: `R((0,0,1), θ) = [[c,−s,0],[s,c,0],[0,0,1]]`.

`reflection(n)` builds the matrix from **columns** `e_j` reflected:

```java
return new Matrix3D(new Vector3D(1,0,0).reflect(normal,0),
                    new Vector3D(0,1,0).reflect(normal,0),
                    new Vector3D(0,0,1).reflect(normal,0));
```

Since `reflect` normalizes `normal` in place, the result is exactly
`I − 2 n̂ n̂ᵀ`. That matrix is symmetric, so the column-vs-row ambiguity is
harmless here — but **`reflection(n)` leaves `n` normalized (mutated)**.

`mul` is ordinary matrix product `this·a`. Combined with `v.mul(M) = M·v`:

```
v.mul( A.mul(B) )  ==  A · B · v      // B applied first
```

That is why `reflection.mul(t[i])` (used to build every "h"/"v"/"d" coset)
means "apply the rotation `t[i]`, then the mirror".

### 2.3 `pvs.polyhedra.Vector3Dsym`

```java
public class Vector3Dsym extends Vector3D {
    Matrix3D matrix;   // the group element that produced this vector
    Vector3D vector;   // the canonical (pre-image) vector
    int index;         // index of the canonical vector in the canonical array
    public Vector3Dsym(double x,double y,double z, Vector3D vector, Matrix3D matrix, int index);
    public Vector3Dsym(Vector3D v, Vector3D vector, Matrix3D matrix, int index);
}
```

Pure record. It inherits `Vector3D.equals`/`hashCode`, so two `Vector3Dsym`
with the same coordinates but different `matrix` compare **equal**.

### 2.4 `pvs.polyhedra.Axis`

```java
public class Axis { public int order; public Vector3D vector; }
```

`order` = the rotational order n of the axis (2, 3, 4 or 5). The stored vector
is a **copy** and is **not normalized**.

### 2.5 `pvs.polyhedra.Plane` (only what the symmetry code touches)

```java
public Vector3D v;   // UNIT normal
public double d;     // signed distance from origin
public int index;
protected Vector3D m_normal;  // as supplied (may be non-unit)
protected Vector3D m_point;   // a point on the plane
static final double TOLERANCE = 1.e-10;   // equals()
```

Constructors used here:

- `new Plane(Vector3D point)` — "plane through the foot of the perpendicular":
  `v = point` normalized, `d = |point|`, `m_normal = m_point = point`.
- `new Plane(Vector3D v, double d, int index)` — the stored `this.v` is a normalized
  copy, but `m_point` is computed from the **raw argument**:
  `m_point = (d·v.x, d·v.y, d·v.z)` with the *unnormalized* `v` (`Plane.java:43`).
  The two agree only when the caller already passed a unit normal — which
  `getSymmetryPlanes` does, because it calls `planes[i].normalize()` first (§8).
- `plane.toVector()` → `d · v`; **throws `RuntimeException` if `d == 0.0`** (exact
  float compare).

`Plane.hashCode()` = `(int)(3345.563*v.x)+(int)(4345.891*v.y)+(int)(7341.678*v.z)+(int)(4134.178*d)`,
`equals` is componentwise within `1e-10`. Same hash/equals inconsistency as `Vector3D`.

### 2.6 `pvs.g3d.Matrix3D` — NOT part of the symmetry machinery

Different class, different package, different storage (`xx,xy,xz,xo; yx…`), a
4×3 affine matrix used only by the OpenGL/AWT viewer (`Model3D`, `Stellation3D`).
It has `mul`, `xrot/yrot/zrot` (**degrees**, not radians), `scale`, `translate`,
`transform(...)`. **`Symmetry` never uses it.** Note its integer `transform`
overload multiplies z by `1000000.0f` before the `(int)` cast — a depth-buffer
hack, irrelevant to the group code. A JS port should keep these two matrix types
separate (call them `Mat3` and `ViewMatrix`).

---

## 3. Numeric constants and tolerances (complete)

| Symbol | Value | Where |
|---|---|---|
| `Symmetry.PI` | `Math.PI` | `Symmetry.java:248` |
| `Symmetry.g` | `(√5 + 1)/2` = 1.6180339887498949 | `Symmetry.java:1260` (static field, used by `axesI`) |
| `Symmetry.g1` | `1/g` = 0.6180339887498948 | `Symmetry.java:1261` |
| `Symmetry.gg1` | `1 + g1` = 1.6180339887498949 | `Symmetry.java:1261` |
| `Symmetry.gg` | `1 + g` = 2.618033988749895 | `Symmetry.java:1261` |
| `Symmetry.tau` | `(√5 + 1)/2` | `Symmetry.java:1430` (used by `make_canonical_point_Ih`) |
| `Symmetry.gam` | `(√5 + 1)/2` | `Symmetry.java:1969` (used by `Test_Ih`, `Test_I`) |
| local `g`, `g1` inside `getI()` | `(√5+1)/2`, `1/g` | `Symmetry.java:426` |
| local `gam` inside `getD*_I()` | `(√5+1)/2` | e.g. `Symmetry.java:619` |
| local `tau` inside `makePlanes_Ih()` | `(√5+1)/2` | `Symmetry.java:1324` |
| `Symmetry.TOL` | `Vector3D.TOL` = `1.e-10` | `Symmetry.java:2049` |
| `Vector3D.TOL` | `1.e-10` | `Vector3D.java:288` — **non-final static** |
| `Vector3D.tolerance` | `1.e-6` | `Vector3D.java:256` — used by `equals`, `collinear` |
| `Plane.TOLERANCE` | `1.e-10` | `Plane.java:123` — `Plane.equals` |
| `Plane.TOL` | `1.e-10` | `Plane.java:144` — `Plane.chop` |
| `Utils.EPS` | `1.e-12` | `Utils.java:202` — `Utils.chop`, `getString`, `getPlanesString` |
| `SSCell.EPS` | `1.e-4` | `SSCell.java:382` |
| `Stellation.ROUND_FACTOR` | `1.e6` | `Stellation.java:2753` |

Note: `Symmetry.TOL` is captured **at class-initialization time** from the
mutable `Vector3D.TOL`. Nothing in the shipped code writes `Vector3D.TOL`, so in
practice both are `1e-10`.

There is a commented-out `//static final double TOL = 0.00001;` at
`Symmetry.java:1613` — an earlier, 10⁵× looser tolerance. Ignore it, but be aware
that if your port's arithmetic is noisier than Java's you may need it back.

Golden-ratio derived numbers you will see printed:

```
g   = 1.618033988749895
g1  = 0.6180339887498948
gg  = 2.618033988749895
gg1 = 1.618033988749895            // gg1 == g numerically, but written as 1+1/g
τ/2 = 0.8090169943749475
1/(2τ) = 0.30901699437494745
```

---

## 4. `getSymmetryNames()` — the complete list

```java
static public String[] getSymmetryNames(){
    Hashtable ht = new Hashtable();
    for(int i=0; i < allgroups.length; i++) ht.put(allgroups[i], allgroups[i]);
    String snames[] = new String[ht.size()];
    int c = 0;
    for(Enumeration e = ht.elements(); e.hasMoreElements(); ) snames[c++] = (String)e.nextElement();
    QSort.quickSort(snames, 0, snames.length-1, new StringComparator());
    return snames;
}
```

`allgroups` (`Symmetry.java:1739-1762`) has **87 raw entries** with two
duplicates (`"D7d"` ×2, `"D7"` ×2) → **85 unique names**. `StringComparator`
delegates to `String.compareTo` (UTF-16 code-unit order); `QSort.quickSort`
delegates to a stable merge sort. The Hashtable enumeration order is irrelevant
because the array is sorted afterwards, so the result is **fully deterministic**:

```
 0  C10          17  C3v(O)      34  C9h        51  D2h(O)      68  D7h
 1  C10h         18  C4          35  C9v        52  D3          69  D8
 2  C10v         19  C4h         36  Ci         53  D3(O)       70  D8d
 3  C11          20  C4v         37  Cs         54  D3d         71  D8h
 4  C11h         21  C5          38  D10        55  D3d(O)      72  D9
 5  C11v         22  C5h         39  D10d       56  D3h         73  D9d
 6  C12          23  C5v         40  D10h       57  D4          74  D9h
 7  C12h         24  C6          41  D11        58  D4d         75  E
 8  C12v         25  C6h         42  D11d       59  D4h         76  I
 9  C2           26  C6v         43  D11h       60  D5          77  Ih
10  C2(O)        27  C7          44  D12        61  D5d         78  O
11  C2h          28  C7h         45  D12d       62  D5h         79  Oh
12  C2v          29  C7v         46  D12h       63  D6          80  S4
13  C3           30  C8          47  D2         64  D6d         81  S6
14  C3(O)        31  C8h         48  D2(O)      65  D6h         82  T
15  C3h          32  C8v         49  D2d        66  D7          83  Td
16  C3v          33  C9          50  D2h        67  D7d         84  Th
```

Sorting detail that matters: `'('` is code point 40, below the digits (48-57)
and letters, so `"C2"` &lt; `"C2(O)"` &lt; `"C2h"` &lt; `"C2v"`, and `"C10"` &lt; `"C2"`.
JS `Array.prototype.sort()` on strings uses UTF-16 code-unit order too, so a
plain `names.sort()` reproduces this exactly.

**20 of these 85 names have no matrices** (`getMatrices` falls through to
`println("Can't find symmetry [...]"); return new Matrix3D[0];`):

```
C8  C9  C10  C11  C12
C8h C9h C10h C11h C12h
C8v C9v C10v C11v C12v
D8h D9h D10h D11h D12h
```

(`getCn`/`getCnh`/`getCnv` are only wired for n = 2…7 and `getDnh` for n = 2…7.)
Selecting one of those in the UI silently yields an empty group. **In the port,
either extend `getCn/getCnh/getCnv/getDnh` to n ≤ 12 (recommended, trivially
correct) or grey those names out.** Keep the list itself identical so saved files
and UI indices still line up.

Where the list is consumed:

- `StellationController.symnames` (`:77`) → `getSymmetryIndex(String)` linear scan.
- `DlgPlanes.symnames` (`:92`) → the "polyhedron symmetry" dropdown.
- `StellationMain.symnames` (`:222`) — but `initSymmetryUI()` (`:408`) **replaces**
  it with `Symmetry.getSubgroups(controller.getPolySymmetry())` for the
  "stellation symmetry" dropdown. See §12.

---

## 5. `getMatrices(String)` — dispatch table

`Symmetry.getMatrices` (`:34-246`) is a long `if/else if` chain on
`String.equals`. **First match wins**, so later duplicate labels are dead code.
Listed in source order, with the resulting group order |G|:

| Accepted string(s) | Builder | \|G\| |
|---|---|---|
| `"E"`, `"C1"` | `getE()` | 1 |
| `"Ci"`, `"S2"` | `getS2()` | 2 |
| `"C2"` | `getC2()` | 2 |
| `"C2v"` | `getC2v()` | 4 |
| `"Cs"` | `getCs()` | 2 |
| `"O"` | `getO()` | 24 |
| `"Oh"` | `getOh()` | 48 |
| `"D3d(O)"` | `getD3d_O()` | 12 |
| `"D3(O)"` | `getD3_O()` | 6 |
| `"C3v(O)"` | `getC3v_O()` | 6 |
| `"C3(O)"` | `getC3_O()` | 3 |
| `"D2(O)"` | `getD2_O()` | 4 |
| `"D2h(O)"` | `getD2h_O()` | 8 |
| `"C2(O)"` | `getC2_O()` | 2 |
| `"C2v(O)"` | `getC2v_O()` | 4 |
| `"I"` | `getI()` | 60 |
| `"D5d(I)"` | `getD5d_I()` | 20 |
| `"D5(I)"` | `getD5_I()` | 10 |
| `"C5(I)"` | `getC5_I()` | 5 |
| `"C5v(I)"` | `getC5v_I()` | 10 |
| `"D3d(I)"` | `getD3d_I()` | 12 |
| `"D3(I)"` | `getD3_I()` | 6 |
| `"C3(I)"` | `getC3_I()` | 3 |
| `"C3v(I)"` | `getC3v_I()` | 6 |
| `"Ih"` | `getIh()` | 120 |
| `"T"` | `getT()` | 12 |
| `"Th"` | `getTh()` | 24 |
| `"Td"` | `getTd()` | 24 |
| `"D2h"`…`"D7h"` | `getDnh(n)`, n = 2…7 | 4n |
| `"D2d"`…`"D12d"` | `getDnd(n)`, n = 2…12 | 4n |
| `"D2"`…`"D12"` | `getDn(n)`, n = 2…12 | 2n |
| `"C2"`…`"C7"` | `getCn(n)` — **`"C2"` unreachable** | n |
| `"C2v"`…`"C7v"` | `getCnv(n)` — **`"C2v"` unreachable** | 2n |
| `"C2h"`…`"C7h"` | `getCnh(n)` | 2n |
| `"S4"`,`"S6"`,`"S8"`,`"S10"`,`"S12"`,`"S14"` | `getSn(n)` | n |
| `"S6(O)"` | `getS6_O()` | 6 |
| `"S10(I)"` | `getS10_I()` | 10 |
| `"S6(I)"` | `getS6_I()` | 6 |
| `"C2v(D)"` | `getC2v_D()` | 4 |
| `"C2h(D)"` | `getC2h_D()` | 4 |
| `"C2(D)"` | `getC2_D()` | 2 |
| `"Cs(D2d)"`…`"Cs(D7d)"` | `getCs_Dd(n)`, n = 2…7 | 2 |
| `"Cs(D2h)"`/`"Cs(C2v)"` … `"Cs(D7h)"`/`"Cs(C7v)"` | `getCs_Dh(n)`, n = 2…7 | 2 |
| *anything else* | `println("Can't find symmetry [...]")`, `new Matrix3D[0]` | 0 |

Dead builders (never reachable through `getMatrices`): **`getD2h()`** (shadowed by
`getDnh(2)`) and **`getD2d()`** (shadowed by `getDnd(2)`). Their axis choices even
differ from the `getDn*` versions (`getD2d` uses 2-fold axes (1,1,0)/(−1,1,0)/(0,0,1),
`getDnd(2)` uses x/y/z), so do not "helpfully" wire them back up.

`"C2"` → `getC2()` and `getCn(2)` give the same *set* in the same order.
`"C2v"` → `getC2v()` and `getCnv(2)` give the same *set* but the last two elements
are **swapped**; use `getC2v()`'s order to match the original.

---

## 6. Group element generation — exact, ordered

Notation used below:

```
E              = identity matrix
R(a, θ)        = Matrix3D.rotation(a, θ)          (§2.2; `a` is normalized internally)
σ(n)           = Matrix3D.reflection(n) = I − 2n̂n̂ᵀ
σx  = diag(−1, 1, 1)      // reflection in plane x = 0, source comment "(100)"
σy  = diag( 1,−1, 1)      // reflection in plane y = 0, source comment "(010)"
σz  = diag( 1, 1,−1)      // reflection in plane z = 0, source comment "(001)"
σxy = [[0,−1,0],[−1,0,0],[0,0,1]]   // mirror x+y=0, normal (1,1,0), comment "(110)"
σx−y= [[0, 1,0],[ 1,0,0],[0,0,1]]   // mirror x−y=0, normal (1,−1,0)
σyz = [[1,0,0],[0,0,−1],[0,−1,0]]   // mirror y+z=0, normal (0,1,1), comment "(011)"
g   = (√5+1)/2,  g1 = 1/g,  gg = 1+g,  gg1 = 1+g1
```

Coset construction pattern used everywhere: `D[k·m + i] = σ · D[i]`, i.e.
**rotation first, then mirror** (§2.2).

### 6.1 Trivial and small groups

```
getE()   : [ E ]                                                   |G| = 1
getS2()  : [ E , diag(−1,−1,−1) ]                                  |G| = 2   ("Ci"/"S2")
getC2()  : [ E , diag(−1,−1, 1) ]                                  |G| = 2   (= R(z,π))
getC2v() : [ E , diag(−1,−1,1) , diag(−1,1,1) , diag(1,−1,1) ]     |G| = 4
getCs()  : [ E , diag( 1, 1,−1) ]                                  |G| = 2   (σz)
```

`getCs` is annotated in the source: the original `Cs[1] = diag(−1,1,1)` (mirror
x = 0) was replaced by "PB!" with `diag(1,1,−1)` (mirror z = 0).
`Symmetry.java:305-307`. **Use `diag(1,1,−1)`.**

`getE`, `getS2`, `getCs` **rewrite their array elements on every call** (only the
array allocation is cached), so callers that stored the array see fresh objects
identical in value. Harmless here, noted for fidelity.

### 6.2 `getO()` — chiral octahedral, |G| = 24

`Symmetry.java:314-354`. Index → (axis, angle):

| i | axis | angle | | i | axis | angle |
|---|---|---|---|---|---|---|
| 0 | — | E | | 12 | (−1, 1, 1) | 2π/3 |
| 1 | (1,0,0) | π/2 | | 13 | (−1, 1, 1) | −2π/3 |
| 2 | (1,0,0) | π | | 14 | (1,−1, 1) | 2π/3 |
| 3 | (1,0,0) | 3π/2 | | 15 | (1,−1, 1) | −2π/3 |
| 4 | (0,1,0) | π/2 | | 16 | (−1,−1, 1) | 2π/3 |
| 5 | (0,1,0) | π | | 17 | (−1,−1, 1) | −2π/3 |
| 6 | (0,1,0) | 3π/2 | | 18 | ( 1, 1, 0) | π |
| 7 | (0,0,1) | π/2 | | 19 | (−1, 1, 0) | π |
| 8 | (0,0,1) | π | | 20 | ( 1, 0, 1) | π |
| 9 | (0,0,1) | 3π/2 | | 21 | (−1, 0, 1) | π |
| 10 | (1,1,1) | 2π/3 | | 22 | ( 0, 1, 1) | π |
| 11 | (1,1,1) | −2π/3 | | 23 | ( 0,−1, 1) | π |

Axes are written non-normalized in the source; `Matrix3D.rotation` normalizes them.

### 6.3 `getOh()` — |G| = 48

```
Oh[i]      = O[i]          for i = 0..23
Oh[24 + i] = σx · O[i]     for i = 0..23
```

### 6.4 `getT()` — chiral tetrahedral, |G| = 12

`Symmetry.java:360-379`:

| i | axis | angle | | i | axis | angle |
|---|---|---|---|---|---|---|
| 0 | — | E | | 6 | (−1, 1, 1) | 2π/3 |
| 1 | (1,0,0) | π | | 7 | (−1, 1, 1) | −2π/3 |
| 2 | (0,1,0) | π | | 8 | ( 1,−1, 1) | 2π/3 |
| 3 | (0,0,1) | π | | 9 | ( 1,−1, 1) | −2π/3 |
| 4 | (1,1,1) | 2π/3 | | 10 | (−1,−1, 1) | 2π/3 |
| 5 | (1,1,1) | −2π/3 | | 11 | (−1,−1, 1) | −2π/3 |

### 6.5 `getTh()`, `getTd()` — |G| = 24 each

```
Th[i] = T[i], Th[12+i] = σx  · T[i]      // σx·R(x,π) = −I, so Th = T ∪ (−T) = T × {E, i}
Td[i] = T[i], Td[12+i] = σxy · T[i]      // σxy = mirror x+y = 0
```

### 6.6 `getI()` — chiral icosahedral, |G| = 60

`Symmetry.java:424-512`. `g = (√5+1)/2`, `g1 = 1/g`, `gg1 = 1+g1`, `gg = 1+g`.

Block A — six 5-fold axes, indices 1…24, each contributing four rotations in the
order **2π/5, −2π/5, 4π/5, −4π/5**:

| block start | axis |
|---|---|
| 1 | (0, g, 1) |
| 5 | (0, g, −1) |
| 9 | (g, 1, 0) |
| 13 | (g, −1, 0) |
| 17 | (1, 0, g) |
| 21 | (−1, 0, g) |

Block B — ten 3-fold axes, indices 25…44, each contributing **2π/3, −2π/3**:

| block start | axis | | block start | axis |
|---|---|---|---|---|
| 25 | ( g1, g, 0) | | 35 | (0, −g1, g) |
| 27 | (−g1, g, 0) | | 37 | ( 1, 1, 1) |
| 29 | ( g, 0, g1) | | 39 | ( 1,−1, 1) |
| 31 | ( g, 0,−g1) | | 41 | (−1,−1, 1) |
| 33 | ( 0, g1, g) | | 43 | (−1, 1, 1) |

Block C — fifteen 2-fold axes, indices 45…59, each a single π rotation:

```
45 (1,0,0)      50 ( 1,−gg1, gg)   55 (gg,−1,−gg1)
46 (0,1,0)      51 (−1,−gg1, gg)   56 ( gg1, gg, 1)
47 (0,0,1)      52 (gg, 1, gg1)    57 ( gg1, gg,−1)
48 ( 1, gg1, gg) 53 (gg,−1, gg1)   58 (−gg1, gg, 1)
49 (−1, gg1, gg) 54 (gg, 1,−gg1)   59 (−gg1, gg,−1)
```

Plus `I[0] = E`. Verified: 60 distinct matrices, all det = +1, closed.

### 6.7 `getIh()` — |G| = 120

```
Ih[i]      = I[i]          for i = 0..59
Ih[60 + i] = σx · I[i]     for i = 0..59
```

Verified: 120 distinct, dets {+1, −1}, closed.

### 6.8 Icosahedral subgroups (special axis settings)

All use `gam = (√5+1)/2`. Note `ax2.mul(D[i])` is `D[i]·ax2` (§2.2) — the 2-fold
axis is *carried around* by the n-fold rotation.

```
getD5d_I()   n = 5,  |G| = 20     ax2 = (1,0,0)              ax5 = normalize(0, gam, 1)
   for i in 0..4:  D[i]   = R(ax5, i·2π/5)
                   D[i+5] = R( D[i]·ax2 , π )
   for i in 0..9:  D[10+i] = σx · D[i]

getD5_I()    n = 5,  |G| = 10     same first 10 elements, no mirrors
getC5_I()    n = 5,  |G| =  5     D[i] = R(ax5, i·2π/5)
getC5v_I()   n = 5,  |G| = 10     D[i] as C5_I ; D[5+i] = σx · D[i]

getD3d_I()   n = 3,  |G| = 12     ax2 = normalize(1,0,0)     ax3 = normalize(0, 1/gam, gam)
   for i in 0..2:  D[i]   = R(ax3, i·2π/3)
                   D[i+3] = R( D[i]·ax2 , π )
   for i in 0..5:  D[6+i] = σx · D[i]

getD3_I()    n = 3,  |G| =  6     first 6 of the above
getC3_I()    n = 3,  |G| =  3     D[i] = R(ax3, i·2π/3)
getC3v_I()   n = 3,  |G| =  6     D[i] = R(ax3, i·2π/3) ; D[3+i] = σx · D[i]
                                  (built interleaved in one loop, but stored at i and i+3)
```

`getD3d_I()` and `getD3_I()` are **not cached** — they allocate a fresh array on
every call. All the others are cached in a static field.

The `getD5d_I`/`getD5_I` bodies contain `double f = i*PI/n;` which is **never used**
(dead local). Do not port it.

`getD3d_I`, `getC3v_I` contain commented-out alternative mirror planes
(conjugating σx by `R((1,0,gam), ±2π/5)`) — the live code uses plain `σx`.

Verified closed: D5d(I) = 20, D3d(I) = 12, dets {±1}.

### 6.9 Octahedral subgroups (special axis settings)

```
getD3d_O()   n = 3, |G| = 12   ax2 = normalize(1,−1,0)   ax3 = normalize(1,1,1)
   for i in 0..2:  D[i]   = R(ax3, i·2π/3)
                   D[i+3] = R( D[i]·ax2 , π )
   for i in 0..5:  D[6+i] = σx−y · D[i]        // [[0,1,0],[1,0,0],[0,0,1]]

getD3_O()    |G| =  6    first 6 of the above
getC3v_O()   |G| =  6    D[i] = R(normalize(1,1,1), i·2π/3) ; D[3+i] = σx−y · D[i]
getC3_O()    |G| =  3    D[i] = R(normalize(1,1,1), i·2π/3)

getC2_O()    |G| =  2    ax = normalize(1,1,0) ; D[i] = R(ax, i·π)  →  [E, R(ax,π)]
getC2v_O()   |G| =  4    D[i] = R(normalize(1,1,0), i·π) ; D[2+i] = σz · D[i]

getD2h_O()   |G| =  8    D[0] = E
                         D[1] = R(normalize(0,1, 1), π)
                         D[2] = R(normalize(1,0, 0), π)
                         D[3] = R(normalize(0,1,−1), π)
                         D[4+i] = σyz · D[i]  for i = 0..3     // [[1,0,0],[0,0,−1],[0,−1,0]]

getD2_O()    |G| =  4    the first four of getD2h_O
```

`getD3d_O` and `getC3v_O` use the *same* mirror matrix `[[0,1,0],[1,0,0],[0,0,1]]`,
which is the mirror in the plane **x − y = 0** (normal (1,−1,0)). `getD3d_O`'s
comment "(1-10)" is **correct**; `getC3v_O`'s "(110)" is **wrong**. (The other
mislabelled comment in the file is `getD5d_I`'s "reflection in plane (010)" at
`Symmetry.java:629`, which actually builds `diag(−1,1,1)` = the (100) mirror. All
the remaining `// reflection in plane (…)` comments check out.) Trust the matrix.

### 6.10 Parametric families (axis = z)

```
getCn(n)     |G| = n
   D[i] = R((0,0,1), i·2π/n)                              i = 0..n−1

getCnv(n)    |G| = 2n            (n = 2..7 wired)
   D[i]   = R((0,0,1), i·2π/n)
   D[n+i] = σy · D[i]                                     σy = diag(1,−1,1)

getCnh(n)    |G| = 2n            (n = 2..7 wired)
   D[i]   = R((0,0,1), i·2π/n)
   D[n+i] = σz · D[i]                                     σz = diag(1,1,−1)

getDn(n)     |G| = 2n            (n = 2..12 wired)
   D[i]   = R((0,0,1), i·2π/n)
   D[n+i] = R((cos(iπ/n), sin(iπ/n), 0), π)               2-fold axes at azimuth iπ/n

getDnh(n)    |G| = 4n            (n = 2..7 wired)
   first 2n as getDn(n)
   D[2n+i] = σy · D[i]           for i = 0..2n−1

getDnd(n)    |G| = 4n            (n = 2..12 wired)
   first 2n as getDn(n)
   σd = R_z(π/(2n)) · σy · R_z(−π/(2n))
      = [[ cos(π/n),  sin(π/n), 0],
         [ sin(π/n), −cos(π/n), 0],
         [        0,         0, 1]]           // mirror plane bisecting the 2-fold axes
   D[2n+i] = σd · D[i]           for i = 0..2n−1

getSn(n)     |G| = n             (n = 4,6,8,10,12,14 wired; "n should be even !!")
   S = σz · R_z(2π/n)
   D[0] = E ;  D[i] = S · D[i−1]  (= Sⁱ)      i = 1..n−1
```

`getDnd` has a commented-out alternative `double f = i*PI/n + PI/(2*n);` — the
live code uses `f = i*PI/n`, i.e. the 2-fold axes are **not** offset; the mirror
is offset instead.

The closed form for `σd` above was derived and checked numerically; use it
directly in JS rather than three matrix products (it also avoids the
`R_z(θ)` round-trip error).

### 6.11 Rotoreflection groups on special axes

```
getS6_O()    n = 6,  |G| = 6     normal = normalize(1,1,1)
getS10_I()   n = 10, |G| = 10    normal = normalize(0, g, 1)          g = (√5+1)/2
getS6_I()    n = 6,  |G| = 6     normal = normalize(0, 1/g, g)

common body:
   rot        = R(normal, 2π/n)
   refl       = Matrix3D.reflection(normal)      = I − 2·normal·normalᵀ
   rotreflect = refl · rot
   D[0] = rotreflect                    ←  *** NOT the identity ***
   D[i] = rotreflect · D[i−1]           i = 1..n−1     (= rotreflect^(i+1))
```

**Quirk worth flagging:** unlike `getSn`, these three start at `S¹`, not `S⁰`.
The set is the same group (`S^n = E`), but **the identity sits at index n−1
instead of index 0**. Any code that assumes `matrices[0] == E` breaks — including
`Symmetry.getOrbit` (§10), whose caller `Stellation`'s constructor comments
"first vectors will be canonical vectors". Preserve the order for fidelity, but
know that these three groups are the reason a "canonical vector" can come back
transformed.

### 6.12 Dihedral-axis-setting groups (main axis = **x**)

```
getC2_D()    |G| = 2     D[i] = R((1,0,0), i·π)          →  [E, R(x,π)]
getC2v_D()   |G| = 4     D[i] as above ; D[2+i] = σy · D[i]      σy = diag(1,−1,1)
getC2h_D()   |G| = 4     D[i] as above ; D[2+i] = σx · D[i]      σx = diag(−1,1,1)
```

### 6.13 `Cs` in a dihedral setting

```
getCs_Dd(n):
    D[0] = E
    f = (n even) ? 0.5·π/n : 0.0                    // literally  (i+0.5)*PI/n : i*PI/n with i = 0
    D[1] = Matrix3D.reflection( (cos f, sin f, 0) )

getCs_Dh(n):                                        // n is IGNORED
    D[0] = E
    D[1] = Matrix3D.reflection( (0, 1, 0) )  =  diag(1, −1, 1)
```

`getCs_Dd`'s local `int i = 0;` exists only to make the ternary read like the
general formula. For odd n the mirror normal is (1,0,0); for even n it is
(cos(π/2n), sin(π/2n), 0).

---

## 7. Rotation axes: `getAxes(String)`

```java
public static Axis[] getAxes(String symmetry)
```

- `"O"`, `"Oh"` → `axesO` (13 axes)
- `"I"`, `"Ih"` → `axesI` (31 axes)
- `"T"`, `"Th"`, `"Td"` → `axesT` (7 axes)
- anything else → `new Axis[0]`

`axesO` (`Symmetry.java:1234-1248`) — vectors are **not normalized**:

```
(1,0,0)  order 4      (1,1,1)   order 3      ( 1, 1, 0) order 2
(0,1,0)  order 4      (−1,1,1)  order 3      (−1, 1, 0) order 2
(0,0,1)  order 4      (1,−1,1)  order 3      ( 1, 0, 1) order 2
                      (−1,−1,1) order 3      (−1, 0, 1) order 2
                                             ( 0, 1, 1) order 2
                                             ( 0,−1, 1) order 2
```

`axesT` (`:1249-1257`): `(1,0,0) (0,1,0) (0,0,1)` order **2**, then
`(1,1,1) (−1,1,1) (1,−1,1) (−1,−1,1)` order 3.

`axesI` (`:1263-1300`), using the *static* `g, g1, gg, gg1` from `:1260-1261`:

```
order 5 (6):  (0,g,1) (0,g,−1) (g,1,0) (g,−1,0) (1,0,g) (−1,0,g)
order 3 (10): (g1,g,0) (−g1,g,0) (g,0,g1) (g,0,−g1) (0,g1,g) (0,−g1,g)
              (1,1,1) (1,−1,1) (−1,−1,1) (−1,1,1)
order 2 (15): (1,0,0) (0,1,0) (0,0,1)
              ( 1, gg1, gg) (−1, gg1, gg) ( 1,−gg1, gg) (−1,−gg1, gg)
              (gg, 1, gg1) (gg,−1, gg1) (gg, 1,−gg1) (gg,−1,−gg1)
              ( gg1, gg, 1) ( gg1, gg,−1) (−gg1, gg, 1) (−gg1, gg,−1)
```

These are exactly the rotation axes of `getI()`, same order (5-fold block,
3-fold block, 2-fold block), and are consumed by `Stellation.createDiagram`
(`Stellation.java:2853`) for drawing the stellation-diagram symmetry overlay.

**Beware**: `Axis` copies the vector, but the *arrays* are static and shared; if
anything downstream normalizes an `Axis.vector` in place it corrupts the table
for the rest of the session. Nothing currently does, but see §14.4.

---

## 8. Mirror planes: `getSymmetryPlanes(String)` and the `planes_*` tables

```java
public static Plane[] getSymmetryPlanes(String symmetry){
    Vector3D[] planes = new Vector3D[0];
    if     ("Ih" or "I") { if(planes_Ih == null) makePlanes_Ih(); planes = planes_Ih; }
    else if("Oh" or "O") { if(planes_Oh == null) makePlanes_Oh(); planes = planes_Oh; }
    else if("Td" or "T") { if(planes_Td == null) makePlanes_Td(); planes = planes_Td; }
    else if("Th")        { if(planes_Th == null) makePlanes_Th(); planes = planes_Th; }
    Plane pl[] = new Plane[planes.length];
    for(int i = 0; i < planes.length; i++){
        planes[i].normalize();                       // ← MUTATES THE STATIC TABLE
        pl[i] = new Plane(planes[i], 0., i);
    }
    return pl;
}
```

Note the chiral names map to their achiral parents' mirror sets: `"I"` gets the
15 Ih mirrors, `"O"` gets the 9 Oh mirrors, `"T"` gets the 6 Td mirrors.

### 8.1 `makePlanes_Oh()` — 9 normals (`Symmetry.java:1347-1361`)

```
0 (1,1,0)  1 (−1,1,0)  2 (1,0,1)  3 (1,0,−1)  4 (0,1,1)  5 (0,1,−1)
6 (1,0,0)  7 (0,1,0)   8 (0,0,1)
```

**Not unit** as constructed (the first six have length √2).

### 8.2 `makePlanes_Td()` — 6 normals (`:1363-1375`)

The first six of the Oh list: `(1,1,0) (−1,1,0) (1,0,1) (1,0,−1) (0,1,1) (0,1,−1)`.

### 8.3 `makePlanes_Th()` — 3 normals (`:1377-1384`)

`(1,0,0) (0,1,0) (0,0,1)`.

### 8.4 `makePlanes_Ih()` — 15 normals (`:1319-1345`)

Built by rotating `(0,1,0)` about four helper axes. `tau = (√5+1)/2`.

```java
planes[0]  = (0,1,0);
planes[1]  = (1,0,0);
g1 = normalize( 1, 0, tau);   g2 = normalize(−1, 0, tau);
c7 = normalize(tau, 0, 1/tau); c8 = normalize(−tau, 0, 1/tau);
planes[2]  = planes[0].rotate(g1, −  π/5);   planes[3]  = planes[0].rotate(g2,   π/5);
planes[4]  = planes[0].rotate(g1, −2π/5);    planes[5]  = planes[0].rotate(g2, 2π/5);
planes[6]  = planes[0].rotate(g1, −3π/5);    planes[7]  = planes[0].rotate(g2, 3π/5);
planes[8]  = planes[0].rotate(g1, −4π/5);    planes[9]  = planes[0].rotate(g2, 4π/5);
planes[10] = planes[0].rotate(c7, −  π/3);   planes[11] = planes[0].rotate(c8,   π/3);
planes[12] = planes[0].rotate(c7, −2π/3);    planes[13] = planes[0].rotate(c8, 2π/3);
planes[14] = (0,0,1);
```

Evaluated exactly (all already unit length, `τ/2 = 0.8090169943749475`,
`1/(2τ) = 0.30901699437494745`):

| i | normal | i | normal |
|---|---|---|---|
| 0 | ( 0, 1, 0) | 8 | ( 1/2, −τ/2, −1/(2τ)) |
| 1 | ( 1, 0, 0) | 9 | (−1/2, −τ/2, −1/(2τ)) |
| 2 | ( 1/2, τ/2, −1/(2τ)) | 10 | ( 1/(2τ), 1/2, −τ/2) |
| 3 | (−1/2, τ/2, −1/(2τ)) | 11 | (−1/(2τ), 1/2, −τ/2) |
| 4 | ( τ/2, 1/(2τ), −1/2) | 12 | ( 1/(2τ), −1/2, −τ/2) |
| 5 | (−τ/2, 1/(2τ), −1/2) | 13 | (−1/(2τ), −1/2, −τ/2) |
| 6 | ( τ/2, −1/(2τ), −1/2) | 14 | ( 0, 0, 1) |
| 7 | (−τ/2, −1/(2τ), −1/2) | | |

Verified: 15 pairwise non-collinear normals whose reflections generate a group of
**order 120** (Ih). These exact index positions matter: `make_canonical_point_Ih`
(§11.2) hard-codes `planes[2]`, `planes[3]`, `planes[6]`, `planes[10]`.

You may hard-code the 15 numeric triples in JS instead of re-deriving them —
they are exact algebraic numbers and the derivation is only a convenience.

---

## 9. Fundamental domains: `CanonicalTester` and `getCanonicalVectors`

### 9.1 The interface and the dispatch

```java
public interface CanonicalTester { public boolean test(Vector3D v); }
public static CanonicalTester getCanonicalTester(String symmetry)
```

| symmetry | tester |
|---|---|
| `"E"`, `"C1"` | `Test_E` — always true |
| `"O"` | `Test_O` |
| `"Oh"` | `Test_Oh` |
| `"I"` | `Test_I` |
| `"Ih"` | `Test_Ih` |
| `"T"`, `"Th"`, `"Td"` | **falls through** — the branches are empty (the `return` lines are commented out) → `Test_Fake` |
| `"D3d"`,`"D4d"`,`"D5d"`,`"D6d"`,`"D7d"`,`"D8d"`,`"D9d"`,`"D10d"`,`"D11d"`,`"D12d"` | `Test_Dnd(n)` |
| `"D3"`,`"D5"`,`"D6"`,`"D7"`,`"D8"`,`"D9"`,`"D10"`,`"D11"`,`"D12"` | `Test_Dn(n)` |
| `"D4"` | `Test_Dnd(4)` — inconsistent with its siblings, but see below |
| everything else | `Test_Fake` — always true |

`Test_Dn` and `Test_Dnd` have **byte-identical bodies**, so the `"D4"` oddity has
no behavioural effect. It also means `Test_Dnd` is **wrong for Dnd**: see §9.3.

### 9.2 The four exact testers

All use `TOL = Symmetry.TOL = 1e-10`. Normals are precomputed unit vectors stored
as instance fields.

```java
class Test_Oh {                                    // closed spherical triangle
    norm1 = normalize(1,−1,0);
    norm2 = normalize(−1,0,1);
    test(v): v.y >= −TOL  &&  norm1·v >= −TOL  &&  norm2·v >= −TOL
}
// = triangle with corners (0,0,1), (1,1,1), (1,0,1);  1/48 of the sphere
```

```java
class Test_O {                                     // Oh triangle ∪ its mirror image
    norm1 = normalize(1,−1,0);
    norm2 = normalize(−1,0,1);
    norm3 = normalize(1, 1,0);
    test(v):
        if (norm1·v < −TOL) return false;
        if (norm2·v < −TOL) return false;
        if (v.y > −TOL)     return true;     // upper (closed) triangle
        if (norm3·v <  TOL) return false;    // lower (OPEN) triangle
        if (norm2·v <  TOL) return false;
        return true;
}
// closed triangle (0,0,1),(1,1,1),(1,0,1) + open triangle (0,0,1),(1,−1,1),(1,0,1); 1/24
```

```java
class Test_Ih {
    norm = cross( (1,0,gam), (0, 1/gam, gam) ).normalize();     gam = (√5+1)/2
    test(v): v.x >= −TOL  &&  v.y >= −TOL  &&  norm·v >= −TOL
}
// triangle: z-axis (0,0,1) — 5-fold axis (1,0,gam) — 3-fold axis (0,1/gam,gam);  1/120
```

```java
class Test_I {
    norm1 = cross( (1,0,gam), (0, 1/gam, gam) ).normalize();
    norm2 = cross( (0,−1/gam,gam), (1,0,gam) ).normalize();
    test(v):
        if (v.x     < −TOL) return false;
        if (norm1·v < −TOL) return false;
        if (v.y     > −TOL) return true;     // closed upper triangle
        if (v.x     <  TOL) return false;    // open lower triangle
        if (norm2·v <  TOL) return false;
        return true;
}
// closed (0,0,1),(1,0,g),(0,1/g,g)  +  open (0,0,1),(1,0,g),(0,−1/g,g);  1/60
```

**Verified**: for 400 random unit vectors each, applying every group element and
counting how many images pass the test gives **exactly 1** for all four
(Oh/48, O/24, Ih/120, I/60). These are genuine strict fundamental domains.

### 9.3 `Test_Dn` / `Test_Dnd` (identical code)

```java
Test_Dn(int order) {
    m_order = order;
    double phi = 2*Math.PI/m_order;
    normal = new Vector3D(Math.sin(phi), −Math.cos(phi), 0);      // NOT normalized (already unit)
}
test(v): v.y >= 0  &&  v.z >= 0  &&  normal·v >= 0
```

Note: **no tolerance at all** (plain `< 0`), and `phi = 2π/n`, not `π/n`.

The region is the wedge `0 ≤ azimuth ≤ 2π/n` intersected with the upper
hemisphere: solid-angle fraction `1/(2n)`.

- For **Dn** (|G| = 2n) that is a correct fundamental domain — verified: exactly
  1 hit per orbit for n = 3,4,5,6.
- For **Dnd** (|G| = 4n) it is **twice too large** — verified: exactly **2** hits
  per orbit for n = 3,4,5,6.

Consequence: `SSCell.makeCanonicalOrder()` (`SSCell.java:388-425`) counts the
canonical cells and prints `"!"` when `count != 1`; with any Dnd symmetry it
prints `!` for every cell and picks the *last* matching index as the origin of
the canonical ordering. `Utils.getCanonicalVectors` under Dnd likewise keeps two
representatives per orbit, doubling the plane count fed to the stellation engine.

**Porting decision required.** Bug-compatible: keep as is. Correct: for Dnd use
`normal = (sin(π/n), −cos(π/n), 0)` (half wedge) *or* add the σd half-plane test.
I recommend keeping the buggy version behind a flag so existing saved stellations
reproduce, and flagging Dnd in the UI.

### 9.4 `Utils.getCanonicalVectors(Vector3D[] planes, String polySymmetry)`

`Utils.java:216-250`, verbatim algorithm:

```
tester ← Symmetry.getCanonicalTester(polySymmetry)
cv     ← ordered list (java.util.Vector)
ht     ← hash set    (java.util.Hashtable, Vector3D keys)

for i = 0 .. planes.length−1:
    if not tester.test(planes[i]):    skip     // "tester.test() failed, ignoring"
    v ← Vector3D( chop(planes[i].x), chop(planes[i].y), chop(planes[i].z) )
    if ht.get(v) == null:
        ht.put(v, v)
        cv.append(v)                            // "adding canonical vector"
    // else: "duplicated canonical vector, ignored"

return cv as array (order of first appearance)
```

with

```java
static final double EPS = 1.e-12;
public static double chop(double v){ return (v < −EPS || v > EPS) ? v : 0; }
```

Points to carry into JS:

1. The input vectors are **not unit normals**. `StellationController.makePolyhedronPlanes`
   builds `planes[i] = plane.v.mul(plane.d)` — the foot of the perpendicular from
   the origin, so `|planes[i]|` = the plane's distance from the origin. All the
   testers are homogeneous sign tests, so positive scaling is irrelevant; but a
   plane through the origin (`d = 0`) becomes the zero vector and passes almost
   every test.
2. `chop` only kills values in `(−1e-12, 1e-12)`; it does **not** round the rest.
   Its purpose is to turn `−0.0`/`1e-17` noise into a clean `0` so that the
   hash bucket is stable.
3. Deduplication uses `Vector3D.hashCode` (§2.1) + `equals` (1e-6 componentwise).
   This is the classic broken hash/equals pair — see §14.7.
4. **Output order is the input order**, filtered. It is *not* the Hashtable
   enumeration order. This matters: `Stellation`'s constructor uses index 0…k−1 of
   the returned array as "the canonical vectors" and prints orbit sizes in that
   order.
5. For `"T"`, `"Th"`, `"Td"` and every non-listed symmetry the tester is
   `Test_Fake` (always true) → **all** distinct planes are kept, then the orbit
   expansion in §10 dedupes them again. The result is correct but does ~|G|× more
   work.

Related helper in the same file:

```java
public static Vector3D[] transformVectors(Vector3D vec[], String symmetry)
// applies every matrix to every vector, dedupes via Hashtable,
// returns them in *Hashtable key enumeration order* — NON-DETERMINISTIC across JVMs.
```

Do not use `transformVectors` where order matters (it is currently only called
from a commented-out line in `StellationController.open`).

---

## 10. `getOrbit`

```java
public static Vector3Dsym[] getOrbit(Vector3D v, String symmetry, int index){
    Matrix3D[] sm = getMatrices(symmetry);
    Vector arr = new Vector();
    Hashtable ht = new Hashtable();
    for(int i=0; i < sm.length; i++){
        Vector3D v1 = v.mul(sm[i]);                    //  = sm[i] · v
        if(ht.get(v1) == null){
            ht.put(v1, v1);
            arr.addElement(new Vector3Dsym(v1, v, sm[i], index));
        }
    }
    Vector3Dsym[] result = new Vector3Dsym[arr.size()];
    arr.copyInto(result);
    return result;
}
```

- Iterates the group **in the stored order**, keeping the *first* element that
  produces each distinct image. Output order therefore mirrors the group order,
  and `orbit[0]` is `sm[0]·v`.
- `orbit.length` = |G| / |stabilizer of v|, so it shrinks for vectors on axes or
  mirror planes.
- `sm[0] == E` for every group **except** `S6(O)`, `S10(I)`, `S6(I)` (§6.11),
  where `sm[0]` is the primitive rotoreflection. `Stellation`'s constructor
  (`Stellation.java:85-87`) does:
  ```java
  for(int i=0; i < canlength; i++) vectors[count++] = orb[i][0];   // "first vectors will be canonical vectors"
  ```
  which is false for those three groups.
- The dedupe key is `Vector3D` (tolerant `equals`, brittle `hashCode`).

---

## 11. Handedness: `get_handedness` and `make_canonical_point_*`

Used by `SSCell.initHandedness()` (`SSCell.java:102-107`) to tag each symmetric
cell as left-handed (−1), achiral / on a mirror (0) or right-handed (+1).

### 11.1 Entry point

```java
public static int get_handedness(Vector3D v, String symmetry){

    if(symmetry.equals("O")){
        if(planes_Oh == null) makePlanes_Oh();
        if(test_point_at_plane(planes_Oh, v)) return 0;
        Vector3D p = make_canonical_point_Oh(v);
        return (p.x < −TOL) ? −1 : (p.x > TOL) ? 1 : 0;

    } else if(symmetry.equals("I")){
        if(planes_Ih == null) makePlanes_Ih();
        if(test_point_at_plane(planes_Ih, v)) return 0;
        Vector3D p = make_canonical_point_Ih(v);
        return (p.x < −TOL) ? −1 : (p.x > TOL) ? 1 : 0;

    } else if(symmetry.equals("Th") || symmetry.equals("T")){
        Vector3D p = make_canonical_point_Ih(v);          // ← see §14.2 (looks like a bug)
        return (p.x < −TOL) ? −1 : (p.x > TOL) ? 1 : 0;

    } else if(symmetry.equals("Td")){
        Vector3D p = make_canonical_point_Ih(v);          // ← see §14.2
        return (p.x − p.y < −TOL) ? −1 : (p.x − p.y > TOL) ? 1 : 0;
    }
    return 0;     // "for others symmetries we don't know yet"
}

static boolean test_point_at_plane(Vector3D[] planes, Vector3D v){
    for(int i = 0; i < planes.length; i++)
        if( |planes[i] · v| < TOL ) return true;          // TOL = 1e-10
    return false;
}
```

Note `test_point_at_plane` dots against the **raw stored normals**, which for
`planes_Oh` are non-unit (length √2 for six of the nine) **unless**
`getSymmetryPlanes("Oh"/"O")` has already run and normalized them in place. See
§14.4 — the effective tolerance is order-dependent (1e-10 vs 1e-10/√2). It is far
below any realistic geometry noise, so it never bites in practice, but a faithful
port should normalize consistently and say so.

### 11.2 `make_canonical_point_Ih(Vector3D v)` (`Symmetry.java:1438-1495`)

Returns the unique I-orbit representative, with the **sign of the accumulated
reflections folded into `x`**. Verified: constant over all 60 I-images of a
random vector (50/50 trials), and mirroring the input flips only the sign of the
result's x.

```
ensure planes_Ih                                     // 15 mirror normals, §8.4
p ← copy(v);  sign ← +1
if p.x < 0 : sign ← −sign ; p.x ← −p.x
if p.y < 0 : sign ← −sign ; p.y ← −p.y
if p.z < 0 : sign ← −sign ; p.z ← −p.z

s10 ← p · planes[10]
s6  ← p · planes[6]
s3  ← p · planes[3]
if   (s10 > 0 and s6 > 0) : p ← R( normalize(1,1,1), 4π/3 ) · p
elif (s6  < 0 and s3 > 0) : p ← R( normalize(1,1,1), 2π/3 ) · p

s2 ← p · planes[2]
s6 ← p · planes[6]                                    // recomputed after the rotation
if   (s6 > 0) : p ← R( normalize(1, 0, tau), 4π/5 ) · p
elif (s2 > 0) : p ← R( normalize(1, 0, tau), 2π/5 ) · p

if p.y < 0 : sign ← −sign ; p.y ← −p.y

p.x ← p.x · sign
return p
```

(`tau = (√5+1)/2`; the rotations are `Vector3D.rotateSet(axis, angle)`, i.e.
Rodrigues with a unit axis, equivalent to left-multiplying by `R(axis, angle)`.)

The comment above the method states the contract: *"canonical point is in one of
segments adjacent to (0 0 1), and above x axis. we can define, that point has
'right' handedness if p.x > 0 and 'left' handedness p.x < 0."*

### 11.3 `make_canonical_point_Oh(Vector3D v)` (`:1498-1536`)

```
p ← copy(v);  sign ← +1
if p.x < 0 : sign ← −sign ; p.x ← −p.x
if p.y < 0 : sign ← −sign ; p.y ← −p.y
if p.z < 0 : sign ← −sign ; p.z ← −p.z

if p.x > p.z : swap(p.x, p.z) ; sign ← −sign
if p.y > p.x : swap(p.y, p.x) ; sign ← −sign
if p.x > p.z : swap(p.x, p.z) ; sign ← −sign      // "once more"

p.x ← p.x · sign
return p
```

Verified invariant over all 24 O-images (200/200 random trials) and
sign-flipping under mirroring. Result satisfies `|p.y| ≤ |p.x| ≤ p.z`.

### 11.4 `make_canonical_point_Th(Vector3D v)` (`:1581-1611`) — **dead code**

```
p ← copy(v); sign ← +1
fold the three signs as above
if p.z < p.x : (x,y,z) ← (y,z,x)      // cyclic
if p.z < p.y : (x,y,z) ← (z,x,y)      // cyclic
if p.z < p.x : (x,y,z) ← (y,z,x)      // cyclic
p.x ← p.x · sign
return p
```

Both permutations are cyclic (det +1), consistent with T. Verified invariant over
all 12 T-images (200/200). **Never called** — `get_handedness("T"/"Th")` calls
`make_canonical_point_Ih` instead.

### 11.5 `make_canonical_point_Td(Vector3D v)` (`:1538-1579`) — **dead code**

The source comments it as *"these are empirical rules"*. No sign folding; six
conditional swap/negate steps, then a final `swap(x,y)` when `sign < 0`:

```
p ← copy(v); sign ← +1
if p.y >  p.x : (p.y,p.x) ← (p.x,p.y)   ; sign ← −sign
if p.y < −p.x : (p.y,p.x) ← (−p.x,−p.y) ; sign ← −sign
if p.z <  p.x : (p.z,p.x) ← (p.x,p.z)   ; sign ← −sign
if p.z < −p.x : (p.z,p.x) ← (−p.x,−p.z) ; sign ← −sign
if p.y >  p.x : (p.y,p.x) ← (p.x,p.y)   ; sign ← −sign
if p.y < −p.x : (p.y,p.x) ← (−p.x,−p.y) ; sign ← −sign
if sign < 0   : swap(p.x, p.y)
return p
```

**Never called.** Port it only if you fix §14.2.

---

## 12. The `"Ih / I"` full-symmetry / stellation-symmetry pair

### 12.1 What the two strings mean

```java
// StellationController.java
String m_polySymmetry       = "Ih";     // FULL symmetry of the polyhedron / plane arrangement
String m_stellationSymmetry = "I";      // symmetry imposed on the CHOSEN CELL SET
```

Persisted in the `.stel` file as one token (`StellationController.save`, `:225`):

```
symmetry "Ih/I"
```

and parsed back by (`:339-345`)

```java
public void setSymmetry(String symmetry){
    StringTokenizer st = new StringTokenizer(symmetry, " /", false);
    m_polySymmetry       = st.nextToken();
    m_stellationSymmetry = st.nextToken();
}
```

so `"Ih/I"`, `"Ih / I"`, `"Ih  /  I"` all parse. **A single-token value throws
`NoSuchElementException`** — the port must handle that (default the second to the
first, or to `"E"`).

### 12.2 How they are used differently

`m_polySymmetry` — the group of the *arrangement*:

1. `Utils.getCanonicalVectors(m_polyhedronPlanes, m_polySymmetry)` — collapse the
   face normals to fundamental-domain representatives (§9.4).
2. `new Stellation(Utils.planesToVectors(m_canonicalPlanes), m_polySymmetry,
   maxIntersection)` (`StellationController.java:98`, `:200`) — note the code feeds
   the vectors back through `m_canonicalPlanes`, it does not reuse the array
   `getCanonicalVectors` returned. Then expand
   each representative back to its whole orbit via `getOrbit` (§10) to rebuild
   the complete plane set, but with `Vector3Dsym` provenance so each plane knows
   which canonical plane and which group element made it.
3. `Stellation.makeCells2(fullSymmetry = m_polySymmetry, …)` → `makeSymmetricalCells`,
   which groups the primitive `SCell`s into `SSCell`s: one `SSCell` per orbit of
   cell centres under `getMatrices(m_polySymmetry)`.

`m_stellationSymmetry` — the group the *selected solid* is required to have:

4. `Stellation.makeSymmetricalSubCells(cell, m_stellationSymmetry)` splits each
   full-symmetry `SSCell` into sub-orbits under the subgroup
   (`Stellation.java:2000-2038`). Same algorithm, smaller group.

Because the sub-cells are the click targets in the UI, choosing the subgroup
controls the granularity of selection: with `Ih/Ih` every cell is atomic; with
`Ih/I` any cell whose orbit is not fixed by the extra mirror splits into **two
enantiomorphic halves**, and you can pick just one → a chiral stellation.

### 12.3 The specific Ih / I pair

`I` (order 60, all det = +1) is the index-2 rotation subgroup of `Ih`
(order 120). For an `Ih`-orbit cell with centre `c`:

- if `c` lies on one of the 15 Ih mirror planes (§8.4) the `Ih`-orbit equals the
  `I`-orbit → the cell does **not** split, `handedness = 0`;
- otherwise the `Ih`-orbit is exactly two `I`-orbits of equal size → the cell
  splits into a `handedness = +1` half and a `handedness = −1` half.

`SSCell.initHandedness()` computes this via `get_handedness(cells[0].getCenter(),
symmetry)` (§11), where `symmetry` is the `SSCell`'s own group string. So an
`SSCell` built with `"I"` gets ±1; one built with `"Ih"` gets 0 (the `"Ih"` branch
does not exist in `get_handedness`, which returns 0 for unknown names).

The same pattern applies to the other listed pairs: `Oh/O` (48 → 24, det +1
subgroup), `Td/T`, `Th/T`, `Dnh/Dn`, `Dnd/Dn`, `Cnv/Cn`, `Cnh/Cn`, `Sn/Cn/2`, etc.
The "full" member is achiral, the "stellation" member is (usually) its rotation
subgroup. Nothing in the code *enforces* subgroup-hood — `getSubgroups` is only
used to populate the dropdown.

### 12.4 `getSubgroups(String group)` — the pairing table

```java
public static String[] getSubgroups(String group){
    for(int i=0; i < subgroups.length; i++)
        if(subgroups[i][0][0].equals(group)) return subgroups[i][1];
    return new String[]{group};                // unknown → itself only
}
```

`subgroups` (`Symmetry.java:1765-1955`) is a `String[56][2][]` (56 entries).
Consumed only by
`StellationMain.initSymmetryUI()` (`:408`) to fill the stellation-symmetry Choice.
Complete contents (key → allowed stellation symmetries, in the source order,
which is the dropdown order):

```
Oh   → Oh O Th Td T D4h D4 C4v C4h C4 S4 D3d(O) D3(O) S6(O) C3v(O) C3(O)
       D2h D2d D2 C2v C2h C2 D2h(O) D2(O) C2(O) Ci Cs E                    (28)
Td   → Td T C3v(O) C3(O) D2d D2 C2v C2 Ci Cs E                             (11)
O    → O T D4 C4 D3(O) C3(O) D2 D2(O) C2 C2(O) E                           (11)
Th   → Th T S6(O) C3(O) D2d D2 C2v C2h C2 Ci Cs E                          (12)
T    → T C3(O) D2 C2 E                                                     (5)
D6h  → D6h D6 S6 C6h C6v C6 D3d D3h D3 C3v C3h C3 D2h D2 C2v C2h C2 Ci Cs E
       C2v(D) C2h(D) C2(D) Cs(D6h)                                         (24)
D3h  → D3h D3 C3v C3h C3 C2v(D) C2(D) Cs Cs(D3h) E                         (10)
C6v  → C6v C6 C3v C3 C2v C2 Cs(C6v) E                                      (8)
D6   → D6 C6 D3 C3 D2 C2 C2(D) E                                           (8)
C6h  → C6h C6 S6 C3h C3 C2h C2 Ci Cs E                                     (10)
C3h  → C3h C3 Cs E                                                         (4)
C6   → C6 C3 C2 E                                                          (4)
D3d  → S6 D3d D3 C3v C3 C2h(D) C2(D) Ci Cs(D3d) E                          (10)
C3v  → C3v C3 Cs(C3v) E                                                    (4)
D3   → D3 C3 C2(D) E                                                       (4)
S6   → S6 C3 Ci E                                                          (4)
C3   → C3 E                                                               (2)
C3(O)→ C3(O) E                                                            (2)
D4h  → D4h D4 C4v C4h C4 S4 D2h D2d D2 C2v C2h C2 Ci Cs E
       C2v(D) C2h(D) C2(D) Cs(D4h)                                         (19)
D2d  → D2d S4 D2 C2v C2 C2(D) Cs(D2d) E                                    (8)
C4v  → C4v C4 C2v C2 Cs(C4v) E                                             (6)
D4   → D4 C4 D2 C2 C2(D) E                                                 (6)
C4h  → C4h C4 S4 C2h C2 Ci Cs E                                            (8)
S4   → S4 C2 E                                                            (3)
C4   → C4 C2 E                                                            (3)
D2h  → D2h D2 C2v C2h C2 Ci Cs E                                           (8)
C2v  → C2v C2 Cs(C2v) E                                                    (4)
D2   → D2 C2 E                                                            (3)
C2h  → C2h C2 Ci Cs E                                                      (5)
Cs   → Cs E                                                               (2)
C2   → C2 E                                                               (2)
Ci   → Ci E                                                               (2)
E    → E                                                                  (1)
Ih   → Ih I Th T D5d(I) D5(I) S10(I) C5v(I) C5(I) D3d(I) D3(I) S6(I) C3v(I) C3(I)
       D2h D2 C2v C2h C2 Ci Cs E                                           (22)   // "complete !"
I    → I T D5(I) C5(I) D3(I) C3(I) D2 C2 E                                 (9)    // "complete"
D4d  → D4d S8 D4 C4v C4 D2 C2v C2 C2(D) Cs(D4d) E                          (11)
S8   → S8 C4 C2 E                                                          (4)
D5d  → D5d S10 D5 C5v C5 C2h(D) C2(D) Ci Cs(D5d) E                         (10)
S10  → S10 C5 Ci E                                                         (4)
D5h  → D5h D5 C5h C5v C5 C2v(D) C2(D) Cs(D5h) Cs E                         (10)
D5   → D5 C5 C2(D) E                                                       (4)
C5h  → C5h C5 Cs E                                                         (4)
C5v  → C5v C5 Cs(C5v) E                                                    (4)
D6d  → D6d S12 D6 C6v C6 D3 C3v C3 S4 D2 C2v C2 C2(D) Cs(D6d) E            (15)
S12  → S12 C6 C3 S4 C2 E                                                   (6)
D7d  → D7d S14 D7 C7v C7 C2h(D) C2(D) Ci Cs(D7d) E                         (10)
D8d  → D8d E                                                              (2)  // "//TODO"
D9d  → D9d E                                                              (2)  // "//TODO"
D10d → D10d E                                                             (2)  // "//TODO"
D11d → D11d E                                                             (2)  // "//TODO"
D12d → D12d E                                                             (2)  // "//TODO"
S14  → S14 C7 Ci E                                                        (4)
D7h  → D7h D7 C7h C7v C7 C2v(D) C2(D) Cs(D7h) Cs E                        (10)
D7   → D7 C7 C2(D) E                                                      (4)
C7h  → C7h C7 Cs E                                                        (4)
C7v  → C7v C7 Cs(C7v) E                                                   (4)
```

Cross-check to do in the port: several subgroup-list entries
(`S8 S10 S12 S14 S6(O) S6(I) S10(I) C2v(D) C2h(D) C2(D) Cs(D*d) Cs(D*h) Cs(C*v)
D5d(I) D5(I) C5v(I) C5(I) D3d(I) D3(I) C3v(I) C3(I)`) **do have matrices** but are
**not** in `getSymmetryNames()`. (The `(O)`-suffixed family — `D3d(O) D3(O) C3v(O)
C3(O) D2h(O) D2(O) C2(O)` — *is* in `allgroups` at `Symmetry.java:1742-1743`, so
those seven appear in both tables; only the `(I)`-suffixed family is commented out,
at `:1753`.)
Conversely `C8…C12`, `C8h…C12h`, `C8v…C12v`, `D8h…D12h` are in
`getSymmetryNames()` and have **no** matrices (§4). Keep both tables verbatim; do
not try to reconcile them.

There is an older commented-out `allgroups`/`subgroups` pair at
`Symmetry.java:1698-1736` marked "VB! original included for reference". Ignore it.

A prose crib-sheet of group notations lives at the very bottom of the file
(`:2272-2298`) and in `symNames[][]` (`:1677-1696`):

```java
static String symNames[][] = {
    {"T",  "[3, 3]+",   "A_4",       "Tetrahedral"},
    {"Td", "[3, 3]",    "S_4",       "Diploid tetrahedral"},
    {"Th", "[3+, 4]",   "A_4 x C_2", "Central tetrahedral"},
    {"O",  "[3, 4]+",   "S_4",       "Octahedral"},
    {"Oh", "[3, 4]",    "S_4 x C_2", "Diploid octahedral"},
    {"I",  "[3, 5]+",   "A_5",       "Icosahedral"},
    {"Ih", "[3, 5]",    "A_5 x C_2", "Diploid icosahedral"},
    {"C1", "[ ]+",      "C_1",       "Identity"},
    {"Cs", "[ ]",       "D_1",       "Bilateral"},
    {"S2", "[2+, 2+]",  "C_2",       "Central"},
    {"Cn", "[n]+",      "C_n",       "n-gonal"},
    {"Dn", "[n, 2]+",   "D_n",       "n-dihedral"},
    {"Cnv","[n]",       "D_n",       "Diploid n-gonal"},
    {"S2n","[2n+, 2+]", "C_2n",      "Skew 2n-gonal"},
    {"Cnh","[n+, 2]",   "C_n x D_1", "Diploid n-cyclic"},
    {"Dnd","[2n, 2+]",  "D_2n",      "Diploid skew 2n-gonal"},
    {"Dnh","[n, 2]",    "D_n x D_1", "   Diploid n-dihedral"}
};
```

`symNames` is **never read** by any code — it is documentation. Ship it as tooltip
text (note the stray leading spaces in the last entry).

---

## 13. Verification performed

Re-implemented in Python/NumPy from the source above and asserted:

| group | \|G\| | distinct | closed | dets |
|---|---|---|---|---|
| `I` | 60 | ✓ | ✓ | {+1} |
| `Ih` | 120 | ✓ | ✓ | {+1,−1} |
| `O` | 24 | ✓ | ✓ | {+1} |
| `Oh` | 48 | ✓ | ✓ | {+1,−1} |
| `T` | 12 | ✓ | ✓ | {+1} |
| `Th` | 24 | ✓ | ✓ | {+1,−1} |
| `Td` | 24 | ✓ | ✓ | {+1,−1} |
| `D5d(I)` | 20 | ✓ | ✓ | {+1,−1} |
| `D3d(I)` | 12 | ✓ | ✓ | {+1,−1} |
| `D3d(O)` | 12 | ✓ | ✓ | {+1,−1} |
| `D2h(O)` | 8 | ✓ | ✓ | {+1,−1} |
| `D2d…D5d` | 4n | ✓ | ✓ | {+1,−1} |
| `S4, S6, S8` | n | ✓ | ✓ | {+1,−1} |
| `S6(O)` | 6 | ✓ | ✓ | {+1,−1} — identity at index **5** |

Fundamental domains: exactly one orbit representative for `Oh`, `O`, `Ih`, `I`
over 400 random unit vectors each. `Test_Dn` gives exactly one for `Dn` and
exactly **two** for `Dnd` (n = 3,4,5,6).

Canonical points: `make_canonical_point_Ih` constant over all 60 `I` images
(50/50); `make_canonical_point_Oh` constant over all 24 `O` images (200/200);
`make_canonical_point_Th` constant over all 12 `T` images (200/200). All three
flip the sign of `x` under an input mirror.

`planes_Ih`: 15 pairwise non-collinear unit normals; the reflections they define
generate a group of order 120.

**Not verified** (no ground truth available in-repo): `getC2v_O`, `getD2_O`,
`getCs_Dd`, `getCs_Dh`, `getC2*_D`, `getS10_I`, `getS6_I` closure (they follow the
same construction patterns as the verified ones, and the constructions are
mechanical, but I did not run them); and whether the *whole* pipeline reproduces
any specific published stellation.

---

## 14. Known bugs and quirks in the original (decide bug-compat vs fix)

**14.1 `Test_Dnd` is a `Dn` fundamental domain.** Selects 2 representatives per
orbit under any `Dnd`. Consequences in §9.3.

**14.2 `get_handedness` uses the wrong canonical-point function for T/Th/Td.**
`Symmetry.java:1657-1671` calls `make_canonical_point_Ih` for `"T"`, `"Th"` and
`"Td"`, leaving `make_canonical_point_Th` and `make_canonical_point_Td` dead.
`make_canonical_point_Ih` is invariant only under `I`, not under `T`, so the
handedness it reports for tetrahedral cells is **not** a `T`-invariant, i.e. two
cells in the same `T` orbit can get different handedness. Also, the `"T"`/`"Th"`
branches skip the `test_point_at_plane` mirror check entirely, so a cell sitting on
a tetrahedral mirror is reported achiral (0) only if the canonicalized point happens
to land with `|p.x| ≤ TOL` — UNCERTAIN: not measured, but there is no longer any
guarantee that "on a mirror" ⇒ 0. Fixing means swapping in
`make_canonical_point_Th` / `make_canonical_point_Td` and adding
`test_point_at_plane(planes_Th /* or planes_Td */, v)` guards.

**14.3 `getSn` vs `getS6_O`/`getS10_I`/`getS6_I` start indices differ** (§6.11).
`matrices[0]` is not the identity for the latter three.

**14.4 Static mutable tables are normalized in place.**
`getSymmetryPlanes` does `planes[i].normalize()` on the cached `planes_Oh` /
`planes_Td` / `planes_Th` arrays. Before the first call those normals are
non-unit; afterwards they are unit. `test_point_at_plane` (used by
`get_handedness`) reads the same arrays, so its effective tolerance depends on
whether the UI has drawn a stellation diagram yet. In JS, build the tables
pre-normalized and make them immutable.

**14.5 `Matrix3D.rotation(axis, θ)` and `Matrix3D.reflection(n)` mutate their
argument** (they call `normalize()` on it). Every call site in `Symmetry` passes
either a freshly allocated temporary or an already-unit vector, so no live bug —
but a JS port must not "helpfully" keep that side effect, and must not
accidentally *drop* it where the caller relies on the axis being unit afterwards
(none does).

**14.6 Dead code**: `getD2h()`, `getD2d()` (shadowed, §5); `make_canonical_point_Td`,
`make_canonical_point_Th` (§14.2); `symNames[][]`; the commented-out original
`allgroups`/`subgroups`; the unused local `double f = i*PI/n;` in `getD5d_I` /
`getD5_I`; `Vector3D.mul(double sx, double sy, double sz)` which computes
`(x*sz, y*sy, z*sz)` instead of `(x*sx, y*sy, z*sz)` — a live typo. Not used by
the symmetry code, but it **is** called from
`pvs/polyhedra/TransformNode.java:176` (`vertn[v] = vert[v].mul(sx,sy,sz)`), so
non-uniform scaling in the scene graph is wrong along x. `mulSet(sx,sy,sz)` on
the very next lines is correct. Decide per call site when porting.

**14.7 `Vector3D.hashCode` is inconsistent with `Vector3D.equals`.**

```java
equals   : |Δx| < 1e-6 && |Δy| < 1e-6 && |Δz| < 1e-6
hashCode : (int)(331345.563*x) + (int)(412345.891*y) + (int)(71341.678*z)
```

Two vectors that `equals` says are the same can land in different buckets
(whenever a scaled coordinate straddles an integer), so `Hashtable`-based dedupe
in `getOrbit`, `getCanonicalVectors`, `transformVectors` (`java.util.Hashtable`) and
`makeSymmetricalCells` / `makeSymmetricalSubCells` / `getNonEquivalentFaces`
(`FastHashtable`, which `extends Hashtable` and still keys on `hashCode()`/`equals()`)
is *probabilistic*: it usually works because the
scale factors are large relative to 1e-6 (a 1e-6 perturbation moves
`331345.563*x` by only 0.33). Also `hashCode()` never writes its own cache field.

**14.8 `Hashtable` enumeration order leaks into output.** `transformVectors`
returns `ht.keys()` order; `Stellation.getNonEquivalentFaces` and
`makeSymmetricalCells`/`makeSymmetricalSubCells` pick
`table.elements().nextElement()` as an arbitrary seed. Results are stable for a
given JVM+build but are not a specification. `getSymmetryNames` is immune (it
sorts).

**14.9 `Plane.toVector()` throws on `d == 0.0`** — exact comparison. Any
`vectorsToPlanes(planesToVectors(...))` round trip dies on a plane through the
origin, which is precisely what `getSymmetryPlanes` produces (`new Plane(v, 0., i)`).
Keep those two families of `Plane` objects apart.

---

## 15. `Utils` string/plane helpers (needed to load & save `.stel` files)

```java
public static Vector3D[] planesToVectors(Plane planes[])   // v[i] = planes[i].toVector() = d·v̂   (throws if d==0)
public static Plane[]   vectorsToPlanes(Vector3D vectors[])// planes[i] = new Plane(vectors[i])   (foot-of-perpendicular ctor)
```

### 15.1 `parsePlanes(String)` — `Utils.java:82-134`

```java
StringTokenizer st = new StringTokenizer(splanes, " ()[],", true);   // returnDelims = TRUE
Vector<String> coord = new Vector<String>(6);
Vector<Plane>  vplanes = new Vector<Plane>();
while(st.hasMoreTokens()){
    String token = st.nextToken();
    if      (token.equals("[") || token.equals(" ") || token.equals(","))  { /* ignore */ }
    else if (token.equals("("))  coord.clear();                       // start of plane
    else if (token.equals(")")) {                                     // end of plane
        if(coord.size()==3)  vplanes.add(new Plane(new Vector3D(n0,n1,n2)));
        if(coord.size()==6)  vplanes.add(new Plane(new Vector3D(n0,n1,n2), new Vector3D(p0,p1,p2)));
        // any other count is SILENTLY DROPPED
    }
    else coord.add(token);                                            // "should be a number"
}
```

Accepted grammar: `[(nx,ny,nz)(nx,ny,nz)…]` or
`[(nx,ny,nz,px,py,pz)…]`, mixed freely. Quirks:

- `"]"` is a delimiter but is **not** in the ignore list, so it falls into the
  `else` branch and is appended to `coord` — harmless only because `coord` is
  cleared by the next `(` and never re-read after the final `)`.
- Tabs and newlines are **not** delimiters (`" ()[],"` only), so a value split
  across lines produces a token like `"1.5\n"` → `Double.parseDouble` actually
  tolerates surrounding whitespace, but `"1.5\n0.2"` would throw.
- 3 numbers → the triple is used as a **point** (foot of perpendicular), giving
  `d = |v|`. 6 numbers → first triple is the **normal**, second is a **point on
  the plane**, and `d = n̂ · p`.
- Coordinate counts other than 3 or 6 are dropped without any message.
- `printf("plane: %s\n", plane)` fires for each parsed plane (see `Output`).

`parseVectors(String)` (`:56-75`) is the simpler sibling: `StringTokenizer(planes,
" ()[],", false)`, then groups of three, `size = coord.size()/3` (**integer
division** — a trailing partial triple is silently discarded).

### 15.2 `getPlanesString(Plane[])` — `Utils.java:168-183`

```java
"[" + for each plane:
        norm  = p.getNormal();  point = p.getPoint();
        if(|norm.x−point.x| < 1e-12 && |norm.y−point.y| < 1e-12 && |norm.z−point.z| < 1e-12)
             "(nx,ny,nz)"
        else "(nx,ny,nz,px,py,pz)"
    + "]"
```

i.e. the compact 3-number form is emitted exactly when the plane was created by
the `Plane(Vector3D point)` constructor (which sets `m_normal == m_point`).

### 15.3 `getString(double)` — shortest round-tripping decimal, `Utils.java:188-200`

```java
int n = 0; double u = v;
for( ; n < 10; n++){
    if(abs(u − floor(u + 0.5)) < 1e-12) break;
    u *= 10;
}
return fmt("%." + n + "f", v);          // note: formats the ORIGINAL v, not u
```

Finds the smallest `n ∈ [0,10]` such that `v·10ⁿ` is within 1e-12 of an integer,
then prints `v` with `n` decimals. If the loop never breaks, `n` exits as **10**
(the loop increments `n` on the failing iteration too) and `"%.10f"` is used.
`floor(u+0.5)` is round-half-up, which differs from `Math.round` for negatives at
exactly `.5` — irrelevant at 1e-12 precision.

Java `String.format("%.3f", x)` rounds HALF_UP on the decimal expansion;
JS `Number.prototype.toFixed` rounds using the binary value and can differ in the
last digit (e.g. `(1.005).toFixed(2)` → `"1.00"`). Since `getString` only picks
`n` once the value is already within 1e-12 of a representable decimal, the two
agree in practice — but if you need byte-identical `.stel` files, implement the
formatter explicitly rather than calling `toFixed`.

### 15.4 The `.stel` file grammar (context for the symmetry token)

`StellationController.makeStreamTokenizer` (`:421-437`):

```java
FixedStreamTokenizer st = new FixedStreamTokenizer(r);
st.whitespaceChars('=','=');     // '=' is whitespace → "symmetry = "Ih/I"" also parses
st.slashSlashComments(true);     // //
st.slashStarComments(true);      // /* */
st.eolIsSignificant(false);
st.quoteChar('"');               // "..." becomes a single TT_WORD-ish token in st.sval
st.wordChars('_','_');
st.wordChars('0','9');
st.wordChars('-','-');
st.wordChars('.','.');
```

Recognised keys (case-insensitive, each followed by one quoted token):
`polyhedron`, `cells`, `symmetry`, `planes`, `exportLengthUnit`. Unknown words
print a warning and are skipped **without consuming their value**, so the value
becomes the next key candidate.

Because digits, `-` and `.` are declared word characters, `StreamTokenizer` never
emits `TT_NUMBER` — everything is `TT_WORD` or a quoted string. A JS reimplementation
should tokenize with a regex over `//`-and-`/* */`-stripped text rather than
emulate `StreamTokenizer` state.

---

## 16. JS PORTING NOTES

**Matrix convention.** Store row-major `m[3][3]` (or a flat `Float64Array(9)` with
`m[r*3+c]`). Define exactly two ops and never deviate:
`mulMat(A,B) = A·B` and `applyMat(M,v) = M·v`. The Java `v.mul(M)` is
`applyMat(M, v)` — the name lies. Getting this backwards silently transposes every
group and still produces a *group*, so it will not throw; it will just render
mirror-image stellations.

**Do not mutate arguments.** `Matrix3D.rotation` and `Matrix3D.reflection` normalize
their input vector in place. Make the JS versions pure and normalize a copy.

**`Vector` / `Hashtable` → arrays and `Map`.** `java.util.Vector` is just an ordered
array (`addElement`/`elementAt`/`copyInto` → `push`/`[i]`/`slice`).
`java.util.Hashtable` is used only as a *set with tolerant equality* — see the
next note. Preserve the distinction between "output in insertion order"
(`getCanonicalVectors`, `getOrbit`) and "output in hash order"
(`transformVectors`, `getNonEquivalentFaces`, the `SSCell` seeds). The former must
be reproduced exactly; the latter is unspecified and you may choose insertion
order for determinism (do so deliberately — it changes cell numbering).

**`hashCode`/`equals` identity.** JS `Map`/`Set` use `SameValueZero`, so `Vector3D`
objects can never collide. Replace with an explicit quantized string key:

```js
const KEY_SCALE = 1e6;                                  // matches Vector3D.tolerance = 1e-6
const key = v => `${Math.round(v.x*KEY_SCALE)},${Math.round(v.y*KEY_SCALE)},${Math.round(v.z*KEY_SCALE)}`;
```

This is *more* stable than the Java original (§14.7), which can put two
`equals`-equal vectors in different buckets. If you want bug-compatibility for a
specific saved model, additionally probe the 26 neighbouring lattice keys, or
replicate the Java hash literally (`Math.trunc(331345.563*x) + Math.trunc(412345.891*y)
+ Math.trunc(71341.678*z)`, with `|0` 32-bit wraparound) plus a bucket scan using
the 1e-6 tolerance. Apply `Utils.chop` (`|v| < 1e-12 → 0`) **before** keying, exactly
as `getCanonicalVectors` does, to normalize `-0`.

**`(int)` cast ≠ `Math.floor`.** Java's `(int)` truncates toward zero. Use
`Math.trunc`, and `| 0` only if you also want the 32-bit wrap. `Vector3D.hashCode`
and `Plane.hashCode` both rely on this.

**Integer division.** `Utils.parseVectors` uses `coord.size()/3` (Java int
division). Write `Math.floor(n/3)` — a JS `/` leaves a fraction and
`new Array(2.33)` throws.

**float vs double.** Everything in `pvs.polyhedra` is `double`; JS numbers are
doubles, so arithmetic matches bit-for-bit *provided you do not reassociate*.
`Math.sqrt`, `Math.sin`, `Math.cos` are not bit-identical across
JVM/V8 in the last ulp, so results can differ by ~1e-16. With `TOL = 1e-10` that
is 6 orders of margin — fine. `pvs.g3d.Matrix3D` has stray `1.0f` literals but
stores `double`; irrelevant.

**Static mutable state.** `Symmetry` caches every group in a static field
(`O, T, I, E, S2, C2, C2v, Cs, Th, Td, Ih, Oh, D2h, D2d, D5d_I, D5_I, C5_I,
C5v_I, C3_I, C3v_I, D3d_O, D3_O, C3v_O, C3_O, C2_O, C2v_O, D2h_O, D2_O, S6_O,
S10_I, S6_I, planes_Ih, planes_Oh, planes_Th, planes_Td`) and hands out the live
array. `getE`/`getS2`/`getCs` rewrite their contents on each call;
`getSymmetryPlanes` normalizes `planes_*` in place; `getD3d_I`/`getD3_I` are not
cached at all. In JS: build every table once at module load, `Object.freeze` the
matrices, and return the same frozen array. Never expose a mutable normal.

**`StreamTokenizer`.** `FixedStreamTokenizer` with digits/`-`/`.`/`_` promoted to
word characters, `=` as whitespace, `"` as quote char, and `//` + `/* */`
comments. Do not emulate it; strip comments with a regex and tokenize on
`/"([^"]*)"|[^\s=]+/`.

**Empty-group fallback.** `getMatrices` returns `new Matrix3D[0]` for the 20
unmatched names (§4) after printing to stdout. An empty group makes every orbit
empty and produces a blank model. In JS, `throw` (or return `[IDENTITY]`) and
surface it in the UI instead of silently rendering nothing.

**`setSymmetry` can throw.** `new StringTokenizer(s, " /").nextToken()` twice on a
one-token string throws `NoSuchElementException`. Guard the split.

**Suggested module shape:**

```js
// symmetry.js
export const GROUP_NAMES;                      // the 85 sorted strings, §4
export function getMatrices(name);             // Float64Array(9)[] frozen, exact source order
export function getAxes(name);                 // [{vector:[x,y,z], order:n}]
export function getSymmetryPlanes(name);       // [{n:[x,y,z], d:0, index:i}]  pre-normalized
export function getCanonicalTester(name);      // (v) => boolean
export function getOrbit(v, name, index);      // [{v, source, matrix, index}] insertion order
export function getHandedness(v, name);        // -1 | 0 | +1
export function getSubgroups(name);            // string[]
```

Test vector for a port: `getMatrices("Oh")` must return 48 matrices whose
determinants are 24×(+1) then 24×(−1) in that block order, with `M[0]` the
identity and `M[24] = diag(-1,1,1)`; `getMatrices("Ih").length === 120` with
`M[60] = diag(-1,1,1)`; and for `v = (1,1,1)` — the test `Symmetry.main()` runs —
`getCanonicalTester("Oh")` accepts the image of **6 of the 48** matrices
(indices 0, 10, 11, 30, 31, 46), because `(1,1,1)` is a *corner* of the closed
fundamental triangle and its stabilizer in `Oh` has order 6. Only **one distinct
image** — `(1,1,1)` itself — passes. Use a *generic* vector if you want the
"exactly one matrix" property; the count is 1 per orbit only for points with
trivial stabilizer (§9.2).
