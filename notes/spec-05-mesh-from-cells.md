# Spec 05 — Mesh From Cells

**Scope:** turning a chosen set of stellation cells into a renderable / exportable
polyhedron mesh, and handing that mesh to the 3-D viewer.

## Sources read

| File | Lines | Read |
|---|---|---|
| `stellation/src/main/java/pvs/polyhedra/Stellation.java` | 2939 | targeted methods in full (§ below) |
| `stellation/src/main/java/pvs/polyhedra/SFace.java` | 179 | full |
| `stellation/src/main/java/pvs/polyhedra/SCell.java` | 165 | full |
| `stellation/src/main/java/pvs/polyhedra/SSCell.java` | 466 | full |
| `stellation/src/main/java/pvs/polyhedra/Vector3D.java` | 318 | full |
| `stellation/src/main/java/pvs/polyhedra/Plane.java` | 271 | full |
| `stellation/src/main/java/pvs/polyhedra/FEdge.java`, `SEdge.java` | 32, 30 | full |
| `stellation/src/main/java/pvs/polyhedra/Polyhedron.java` | ~960 | fields, `makeCCW`, `scale`, colour, `writeSTL`, `writeOFF`, `writeDXF`, `paintFacesByArea` |
| `stellation/src/main/java/pvs/utils/FastHashtable.java` | 457 | full |
| `stellation/src/main/java/pvs/g3d/Stellation3D.java` | 515 | full |
| `stellation/src/main/java/pvs/g3d/Model3D.java` | 598 | full |
| `stellation/src/main/java/pvs/g3d/Face.java`, `Vec3.java`, `Matrix3D.java` | 46, 143, 239 | full |
| `stellation/src/ui/java/pvs/polyhedra/stellation/ui/StellationMain.java` | — | `showModel`, `showDiagram`, `update` |
| `stellation/src/main/java/pvs/polyhedra/stellation/StellationController.java` | — | `doExport`, `findCell`, `makePolyhedronPlanes` |
| `stellation/src/ui/java/pvs/polyhedra/ui/StellationUI.java` | — | batch/CLI path |

Absolute repo root for all of the above:
`/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/`

---

## 1. Data structures

### 1.1 `Vector3D` — the vertex type (`pvs/polyhedra/Vector3D.java`)

```java
public class Vector3D {
  public double x, y, z;
  static final double tolerance = 1.e-6;

  public boolean equals(Object o){
    if(o == this) return true;
    Vector3D v = (Vector3D)o;
    double dx = v.x - x; double dy = v.y - y; double dz = v.z - z;
    if(dx < 0) dx = -dx; if(dy < 0) dy = -dy; if(dz < 0) dz = -dz;
    return dx < tolerance && dy < tolerance && dz < tolerance;
  }

  int hashCode = 0;                                    // dead cache, never assigned non-zero
  public int hashCode(){
    if(hashCode != 0) return hashCode;
    int value = (int)(331345.563*x) + (int)(412345.891*y) + (int)(71341.678*z);
    return value;
  }
}
```

**This is THE vertex-merge tolerance: `1.e-6`, per component, L∞ (Chebyshev), not
Euclidean.** It is the only tolerance used for vertex identification anywhere in the
mesh-extraction path.

Two properties that a port must reproduce bug-for-bug if it wants identical output:

1. `hashCode()` is **not** consistent with `equals()`. `(int)` in Java truncates toward
   zero. Two points 1e-9 apart can straddle an integer boundary of `331345.563*x` and
   get **different hash codes**. `FastHashtable.get/put/remove` test
   `(e.hash == hash) && e.key.equals(key)` (`FastHashtable.java:220-230, 310-343,
   351-367`), i.e. the *full 32-bit stored hash* must match exactly before `equals` is
   ever called — landing in the same bucket is not enough. So such a pair becomes
   **two distinct output vertices** even though `equals()` would say they are the same.
   Conversely, exact-hash collisions are resolved by the tolerant `equals`, so a point can
   be merged with a neighbour up to 1e-6 away.
2. The `hashCode` field is initialised to 0 and reset to 0 by every mutator, but is
   **never assigned a non-zero value** — so the cache never engages and `hashCode()` is
   recomputed from the current `x,y,z` every call. Practical consequence: a `Vector3D`
   used as a hash key stays findable after mutation only because it is recomputed; but a
   key that is mutated *while in a table* lands in the wrong bucket. (`rotateFaces` /
   `translateFaces` mutate vertices in place — see §6.)

### 1.2 `SFace` — one facet of one plane (`pvs/polyhedra/SFace.java`)

```java
public class SFace {
  public SCell cellAbove;      // cell on the +normal side of this facet
  public SCell cellBelow;      // cell on the -normal side of this facet
  public int layer = 0;
  public Vector3D[] vertices = null;
  private Plane plane;
  Vector3D center = null;      // lazily cached centroid
  Vector3D area   = null;      // lazily cached area vector

  public Vector3D getCenter(){                 // arithmetic mean of vertices
    if(center == null){
      center = new Vector3D(vertices[0]);
      for(int i = 1; i < vertices.length; i++) center.addSet(vertices[i]);
      center.mulSet(1./vertices.length);
    }
    return center;
  }
  public Vector3D getArea(){                   // 0.5 * Σ v[i] × v[i+1]
    if(area == null){
      area = new Vector3D(0,0,0);
      int length = vertices.length;
      for(int i = 0; i < length; i++) area.addSet(vertices[i].cross(vertices[(i+1)%length]));
      area.mulSet(0.5);
    }
    return area;
  }
  public int getPlaneIndex(){ return plane.index; }
  public double getRadius(){ /* max |v| over vertices */ }

  public int hashCode(){ return getCenter().hashCode(); }
  // *** NO equals() OVERRIDE ***
}
```

**Critical:** `SFace` overrides `hashCode()` but **not** `equals()`. So `SFace` uses
`Object.equals` = *reference identity*, while bucketing by centroid. In a
`FastHashtable`, `get(face)` finds an entry only if it is **the same object instance**
(and, incidentally, only if the centroid hashes to the same bucket — which it does,
since it is literally the same object).

This is exactly what makes the boundary extraction of §3 work: the *same* `SFace`
instance is stored as `top` of the cell below it and as `bottom` of the cell above it.

`SFace` copy constructor:

```java
public SFace (SFace face){
  layer = face.layer;
  vertices = new Vector3D[face.vertices.length];
  for(int i = 0; i < vertices.length; i++) vertices[i] = new Vector3D(face.vertices[i]);
}
```

Note it **does not copy `plane`** (left `null`) nor `cellAbove/cellBelow` nor the caches.
Copies therefore throw `NullPointerException` from `getPlaneIndex()`. Only
`createDiagram()` makes copies, and it never calls `getPlaneIndex()` on them.

### 1.3 `SCell` — one elementary (convex) cell (`pvs/polyhedra/SCell.java`)

```java
public class SCell implements Comparator {
  SFace[] top;      // facets bounding this cell from outside (away from origin)
  SFace[] bottom;   // facets bounding it from inside
  int layer;
  private int index = -1;      // symmetry-orbit index
  Vector3D center;

  SCell(SFace[] _top, SFace[] _bottom, int _layer){
    top = _top; bottom = _bottom; layer = _layer;
    for(int t = 0; t < top.length; t++)    top[t].cellBelow    = this;
    for(int b = 0; b < bottom.length; b++) bottom[b].cellAbove = this;
  }
  double getVolume(){                     // divergence theorem, sign-aware
    double volume = 0;
    for(int i=0;i<top.length;i++)    volume += top[i].vertices[0].dot(top[i].getArea());
    for(int i=0;i<bottom.length;i++) volume -= bottom[i].vertices[0].dot(bottom[i].getArea());
    vol = volume/3; return vol;
  }
}
```

The wiring `top[t].cellBelow = this` / `bottom[b].cellAbove = this` is the adjacency
graph used by `findCell(SSCell[], Vector3D, boolean)` (§7.3).

### 1.4 `SSCell` — a symmetry orbit of elementary cells

```java
public class SSCell implements Comparator {
  public Vector top    = new Vector();   // SSCells adjacent from outside  (filled by makeConnectivityGraph)
  public Vector bottom = new Vector();   // SSCells adjacent from inside
  public SCell[] cells;                  // the elementary cells in this orbit
  public int layer, index;               // set by setIndex(layer,index)
  public boolean hasSCell(SCell cell){ /* identity scan over cells[] */ }
}
```

`SSCell` is the unit of user selection: the UI picks whole symmetry orbits, so the
result is automatically symmetric.

### 1.5 Layer bookkeeping (why "top" and "bottom" mean what they mean)

`SFace.layer` is incremented in `intersectFacesWithPlane` every time a facet lies wholly
**outside** another plane's half-space:

```java
fval[j] = sface.vertices[j].dot(plane.v) - dist2;   // dist2 == plane.d
if(fval[j] < THRESHOLD) nminus++; else nplus++;
...
if(nminus == 0){ sface.layer++; continue; }         // polygon is outside of halfspace
```

with `static final double THRESHOLD = 1.e-7;` (line 1076 of `Stellation.java`, comment:
*"to breake a little bit symmetry of +/-"*).

That whole-polygon case is not the only place layer is bumped. When the facet straddles
the plane it is **split**, and the outside piece is created with

```java
SFace fout = new SFace(vout, sface.getPlane());
fout.layer = sface.layer + 1;                       // Stellation.java:1177-1178
if(maxintersection < 0 || fout.layer < maxintersection)
    faces.addElement(fout);                         // else the outside piece is DISCARDED
```

while the inside piece keeps `sface.layer` (only `sface.vertices` is replaced by `vins`).
So `layer` = "number of planes this facet is on the far side of", accumulated both by the
wholly-outside branch and by splitting; and `maxintersection` silently truncates the
arrangement above that layer.

`makeLayers(SFace[][])` buckets facets by `layer`, and cells are built with

```java
cells = makeCellsFromLayers(layers[i-1], layers[i], i);   // (bottomfaces, topfaces, layer)
```

so **a facet with `layer == L` is a `top` facet of the cell at layer L (the cell nearer
the origin) and a `bottom` facet of the cell at layer L+1 (the cell farther out).** One
and the same `SFace` object plays both roles. Layer-0 cells have `bottomfaces =
new SFace[0][0]`, i.e. the core has no bottom facets and its cells are the core's
interior pieces.

### 1.6 `Polyhedron` — the output mesh (`pvs/polyhedra/Polyhedron.java`)

```java
public Vector3D[]        vertices = new Vector3D[0];
public int[][]           ifaces   = new int[0][0];   // per face: vertex indices, CCW seen from outside
public java.awt.Color[]  colors   = new java.awt.Color[0];
public int[]             icolor   = new int[0];      // per face: index into colors[]
public int[][]           edges    = new int[0][0];   // pairs of vertex indices
public String[]          description;
public static double tolerance = Vector3D.tolerance; // 1e-6
public static boolean outFaces = true, outEdges = false, outVertices = false, outColor = true;
```

Note `outFaces/outEdges/outVertices/outColor` are **static** (process-global) export
flags, mutated by `StellationController.doExport`.

### 1.7 `FEdge` / `SEdge` — edge keys

```java
public class FEdge {                        // plane-tagged, orientation-insensitive
  int v1,v2,index;
  public int hashCode(){ return v1*v2; }
  public boolean equals(Object o){
    if(!(o instanceof FEdge)) return false;
    FEdge e = (FEdge)o;
    if(e.index != index) return false;
    return (e.v1 == v1 && e.v2 == v2) || (e.v2 == v1 && e.v1 == v2);
  }
}

class SEdge {                               // untagged, orientation-insensitive
  int v1,v2;
  public int hashCode(){ return v1*v2; }
  public boolean equals(Object o){
    if(!(o instanceof SEdge)) return false;
    SEdge e = (SEdge)o;
    return (e.v1 == v1 && e.v2 == v2) || (e.v2 == v1 && e.v1 == v2);
  }
}
```

`hashCode() == v1*v2` — any edge touching vertex 0 hashes to 0; collisions are frequent
but harmless (resolved by `equals`).

---

## 2. `getStellation(Vector, int[][])` — selection → cell array

```java
public SSCell[] getStellation(Vector cells, int [][] stellation) {
    SSCell[] scells = new SSCell[stellation.length];
    for(int i =0; i < stellation.length; i++){
        scells[i] = (SSCell)((Vector)cells.elementAt(stellation[i][0])).
            elementAt(stellation[i][1]);
    }
    return scells;
}
```

`cells` is a `Vector` of `Vector`s: `cells[layer][indexInLayer] -> SSCell` (the structure
returned by `makeCells(...)` / `makeCells2(...)`). `stellation[i] = {layer, index}`.
No validation; out-of-range throws.

Convenience wrapper:

```java
public Polyhedron getPolyhedron(Vector cells, int [][] stellation) {
    SSCell[] scells = getStellation(cells, stellation);
    return getPolyhedron(scells);
}
```

**JS:** `getStellation(cells, sel) => sel.map(([l,i]) => cells[l][i])`.

---

## 3. `getPolyhedron(SSCell[] scells)` — THE mesh builder

`Stellation.java:593-728`. This is the only function that actually produces a mesh from a
cell selection; everything else is either dead (§5) or single-cell (§4).

### 3.1 Step 1 — boundary extraction by ±1 cancellation

```java
FastHashtable ftable = new FastHashtable();
Integer topindex    = new Integer(1);
Integer bottomindex = new Integer(-1);

for(int i =0; i < scells.length; i++){
  SSCell scell = scells[i];
  for(int c = 0; c < scell.cells.length; c++){
    SCell cell = scell.cells[c];
    for(int f = 0; f < cell.top.length; f++){          // top facets
      SFace face = cell.top[f];
      Integer index = (Integer)ftable.get(face);
      if(index == null){ ftable.put(face, topindex); }
      else if(index == bottomindex){ ftable.remove(face); }
      else { System.out.println("duplicate face in stellation!"); }
    }
    for(int f = 0; f < cell.bottom.length; f++){       // bottom facets
      SFace face = cell.bottom[f];
      Integer index = (Integer)ftable.get(face);
      if(index == null){ ftable.put(face, bottomindex); }
      else if(index == topindex){ ftable.remove(face); }
      else { System.out.println("duplicate face in stellation!"); }
    }
  }
}
```

Semantics, stated exactly:

* Every elementary cell contributes each of its facets once, tagged `+1` if the cell is
  **below** the facet (the facet is one of the cell's `top` facets) and `-1` if the cell
  is **above** it.
* Because *the same `SFace` object* is `top` of the inner cell and `bottom` of the outer
  cell, a facet whose two incident cells are **both selected** is entered once (say +1)
  and then encountered again with the opposite tag → `remove` → it disappears.
* A facet with only **one** incident cell selected survives, carrying the tag of that
  cell's role.
* **So: a facet survives iff it is shared by exactly one selected cell — i.e. exactly the
  outer boundary of the union of selected cells.** The surviving tag `+1` means "the
  selected material is on the inner (−normal) side"; `-1` means "the selected material is
  on the outer (+normal) side".
* The `else` branch (`"duplicate face in stellation!"`) means the same facet was seen
  twice with the same tag — geometrically impossible for a valid arrangement; the code
  prints and keeps the existing entry.
* Because `SFace.equals` is identity, the whole thing is a pure object-identity parity
  toggle. **A JS port must give each facet a stable unique id and use a Map/Set keyed on
  that id — not on geometry.**

Comparisons `index == bottomindex` / `index == topindex` are **reference** comparisons of
boxed `Integer`s; they work only because the exact same two boxed objects are used
everywhere. In JS they are plain `=== 1` / `=== -1`.

### 3.2 Step 2 — vertex welding + winding + edge parity

```java
poly.ifaces = new int[ftable.size()][];
poly.icolor = new int[ftable.size()];
Vector vert = new Vector();
FastHashtable vtable = new FastHashtable();   // Vector3D -> Integer index
FastHashtable etable = new FastHashtable();   // FEdge parity set

int fcounter = 0;
for(Enumeration keys = ftable.keys(); keys.hasMoreElements();){
    SFace face = (SFace)keys.nextElement();
    int [] iface = new int[face.vertices.length];
    Integer findex = (Integer)ftable.get(face);           // +1 or -1

    for(int v = 0; v < face.vertices.length; v++){
        Integer vindex = (Integer)vtable.get(face.vertices[v]);
        if(vindex == null){
            vindex = new Integer(vert.size());
            vtable.put(face.vertices[v], vindex);
            vert.addElement(face.vertices[v]);
        }
        if(findex == topindex){                  // top face: keep order
            iface[v] = vindex.intValue();
        } else {                                 // bottom face: reverse order
            iface[iface.length -1 - v] = vindex.intValue();
        }
    }

    // edge parity, using the ORIGINAL (unreversed) vertex order
    Integer v1index = (Integer)vtable.get(face.vertices[face.vertices.length-1]);
    for(int v = 0; v < face.vertices.length; v++){
        Integer v2index = (Integer)vtable.get(face.vertices[v]);
        FEdge edge = new FEdge(v1index.intValue(), v2index.intValue(),
                               face.getPlaneIndex()*findex.intValue());
        if(etable.get(edge) != null) etable.remove(edge);
        else                          etable.put(edge,edge);
        v1index = v2index;
    }

    poly.icolor[fcounter] = (findex == topindex)? 1: 0;
    poly.ifaces[fcounter] = iface;
    fcounter++;
}
```

**Vertex welding.** `vtable` maps `Vector3D -> Integer`. Lookup computes `hashCode()`
(§1.1), indexes bucket `(h & 0x7FFFFFFF) % capacity`, and then accepts an entry only if
**`e.hash == h` exactly** *and* `e.key.equals(key)` (the 1e-6 per-component test). The
stored hash is checked *before* `equals`, so two vertices whose hash codes differ at all
are never compared geometrically, regardless of which bucket they land in. In practice most
vertex objects are already *interned* during stellation construction (`findVertex(vtable,
v)` in `intersectFacesWithPlane`, and the `vtable` interning in `transformFace`), so the
same `Vector3D` instance appears in many facets and the first `equals(o == this)`
shortcut fires. Distinct-but-close instances are merged only if they also hash equal.

**Winding.** Every `SFace` is built by clipping a seed polygon whose vertex order is CCW
around the plane's outward unit normal `plane.v` (see `makeSeedFace(Plane,int)`: it
builds `y = x̂ × n`, `z = n × y`, so `(y, z, n)` is right-handed and the seed goes CCW
about `n`; clipping preserves the cyclic order). Therefore:

* a **top** facet (selected cell is on the −n side, i.e. inside): stored order is already
  CCW seen from outside the solid → **keep**;
* a **bottom** facet (selected cell is on the +n side): stored order is CCW seen from
  *inside* the solid → **reverse**.

Result: **`poly.ifaces[i]` is always counter-clockwise when viewed from outside the
solid.** There is no `makeCCW()` call on the output — `Polyhedron.makeCCW()` is only
applied to *input* `.off` files (`StellationUI.java:252`, `StellationMain.java:802`,
`StellationController.java:166`).

**Edge parity.** `FEdge.index = face.getPlaneIndex() * findex` — the plane index signed
by the facet's top/bottom tag, so a top facet and a bottom facet in the same plane get
different edge tags and never cancel each other. Edges interior to a maximal coplanar
same-tag patch appear twice (once from each of the two facets, in opposite directions;
`FEdge.equals` is orientation-insensitive) and cancel. What is left in `etable` is the
**outline of each coplanar patch**. Odd multiplicities (>2 facets meeting along an edge
in the same plane and tag) survive.

> **Quirk:** `plane.index * findex` is `0` for plane index 0 regardless of sign, so top
> and bottom facets of plane 0 share an edge tag and can cancel each other spuriously.
> Reproduce or fix deliberately; document either way.

### 3.3 Step 3 — colours, vertices, unique edges

```java
//joinEdgesToFaces(etable);                    // dead call, commented out
poly.colors = makeTopBottomColors();
poly.vertices = new Vector3D[vert.size()];
vert.copyInto(poly.vertices);

FastHashtable setable = new FastHashtable();
for(Enumeration e = etable.keys(); e.hasMoreElements();){
    FEdge fedge = (FEdge)e.nextElement();
    SEdge sedge = new SEdge(fedge.v1,fedge.v2);
    setable.put(sedge,sedge);
}
poly.edges = new int[setable.size()][2];
int ecount = 0;
for(Enumeration e = setable.keys(); e.hasMoreElements();){
    SEdge sedge = (SEdge)e.nextElement();
    poly.edges[ecount][0] = sedge.v1;
    poly.edges[ecount][1] = sedge.v2;
    ecount++;
}
return poly;
```

The `FEdge -> SEdge` re-keying drops the plane tag, so an outline edge that shows up once
from a top patch and once from a bottom patch is emitted **once**.

### 3.4 Colouring

```java
static Color[] makeTopBottomColors(){
    Color[] col = new Color[2];
    col[1] = new Color((int)(0.85*255),(int)(0.85*255),(int)(0.1*255));
    col[0] = new Color((int)(0.95*255),(int)(0.4*255),(int)(0.2*255));
    return col;
}
```

Java `(int)` truncates, so the exact RGB values are:

| index | meaning | RGB | hex |
|---|---|---|---|
| `colors[1]` | facet tagged **+1** (top facet: material inside, normal points out along `+plane.v`) | `(216, 216, 25)` | `#D8D819` (yellow) |
| `colors[0]` | facet tagged **−1** (bottom facet: material outside, i.e. this is an "underside") | `(242, 102, 51)` | `#F26633` (orange) |

`poly.icolor[f] = (findex == topindex) ? 1 : 0`.

So the exported mesh is two-toned: outward-facing plane sides yellow, inward-facing
plane sides orange. **This is the only colour information the mesh carries.** It is
honoured by `writeOFF` (which writes per-face RGB) but *ignored* by the on-screen
renderer (§8.3) and by `writeSTL` / `writeDXF`.

### 3.5 Complexity / ordering

`fcounter` runs over `ftable.keys()`, whose order is `FastHashtable`'s bucket order,
enumerated **from the highest bucket index downward** (`HashtableEnumerator` starts at
`index = table.length` and decrements). So face order, vertex numbering and edge order in
the output are hash-order dependent and will not match a JS port unless the port
replicates the hashing. Geometry is identical; indices are not.

### 3.6 Reference pseudo-code for the port

```js
function getPolyhedron(scells) {
  // 1. parity map over facet identity
  const tag = new Map();                       // SFace -> +1 | -1
  for (const scell of scells)
    for (const cell of scell.cells) {
      for (const f of cell.top)    toggle(tag, f, +1);
      for (const f of cell.bottom) toggle(tag, f, -1);
    }
  // toggle(map,f,s): if !map.has(f) map.set(f,s)
  //                  else if map.get(f) === -s map.delete(f)
  //                  else warn("duplicate face in stellation!")

  const vertices = [], vindexOf = new VertexTable(1e-6);   // see §9 for the table
  const ifaces = [], icolor = [], edgeParity = new Map();

  for (const [face, s] of tag) {
    const n = face.vertices.length;
    const idx = new Array(n);
    for (let v = 0; v < n; v++) {
      const i = vindexOf.intern(face.vertices[v], vertices);
      if (s === +1) idx[v] = i; else idx[n-1-v] = i;
    }
    // edges use the ORIGINAL order
    let a = vindexOf.lookup(face.vertices[n-1]);
    for (let v = 0; v < n; v++) {
      const b = vindexOf.lookup(face.vertices[v]);
      const key = fedgeKey(a, b, face.planeIndex * s);     // unordered in (a,b)
      if (edgeParity.has(key)) edgeParity.delete(key); else edgeParity.set(key,[a,b]);
      a = b;
    }
    ifaces.push(idx);
    icolor.push(s === +1 ? 1 : 0);
  }

  const edges = dedupeUnordered([...edgeParity.values()]);
  return { vertices, ifaces, icolor,
           colors: [[242,102,51],[216,216,25]], edges };
}
```

---

## 4. `getPolyhedron(SSCell scell)` — single cell, **has a vertex-welding bug**

`Stellation.java:366-426`. Used only by `writeCells(Vector, String, String)` (line 2227),
i.e. the "dump every cell to its own file" batch feature.

```java
int fcounter = 0;
for(int i = 0; i < scell.cells.length; i++){
    SCell cell = scell.cells[i];
    fcounter += cell.top.length;
    fcounter += cell.bottom.length;
}
Polyhedron poly = new Polyhedron();
poly.ifaces = new int[fcounter][];
poly.icolor = new int[fcounter];
fcounter = 0;
FastHashtable vtable = new FastHashtable();
Vector vert = new Vector();
for(int i = 0; i < scell.cells.length; i++){
    SCell cell = scell.cells[i];
    for(int f = 0; f < cell.top.length; f++){
        SFace face = cell.top[f];
        int[] iface = new int[face.vertices.length];
        for(int v = 0; v < face.vertices.length; v++){
            Integer index = (Integer)vtable.get(face.vertices[v]);
            if(index == null){
                index = new Integer(vert.size());
                vtable.put(index,face.vertices[v]);          // <-- KEY AND VALUE SWAPPED
                vert.addElement(face.vertices[v]);
            }
            iface[v] = index.intValue();
        }
        poly.ifaces[fcounter] = iface;
        poly.icolor[fcounter] = 1;
        fcounter ++;
    }
    for(int f = 0; f < cell.bottom.length; f++){
        SFace face = cell.bottom[f];
        int[] iface = new int[face.vertices.length];
        for(int v = 0; v < face.vertices.length; v++){
            Integer index = (Integer)vtable.get(face.vertices[v]);
            if(index == null){
                index = new Integer(vert.size());
                vtable.put(index,face.vertices[v]);          // <-- same bug
                vert.addElement(face.vertices[v]);
            }
            iface[iface.length -1 - v] = index.intValue();   // opposite order of vertices
        }
        poly.ifaces[fcounter] = iface;
        poly.icolor[fcounter] = 0;
        fcounter ++;
    }
}
poly.colors = makeTopBottomColors();
poly.vertices = new Vector3D[vert.size()];
vert.copyInto(poly.vertices);
```

**Confirmed bug:** `vtable.put(index, face.vertices[v])` stores `Integer -> Vector3D`,
but the lookup is `vtable.get(face.vertices[v])` (a `Vector3D`). `FastHashtable.get`
computes `key.hashCode()` and then tests `e.key.equals(key)`, where `e.key` is an
`Integer` — `Integer.equals(Vector3D)` is always `false`. So the lookup **always returns
`null`** and *every corner of every facet becomes a brand-new vertex*. The output is an
unwelded soup: `vertices.length == Σ facet.vertices.length`, and `poly.edges` is left as
the default empty array.

No boundary extraction is performed here either: *all* facets of the cell are emitted
(this is correct — a single elementary cell orbit is a solid whose whole facet set is its
boundary), with the same winding convention as §3.2 (top kept, bottom reversed) and the
same `icolor` convention (top = 1, bottom = 0).

**Port advice:** implement it correctly (weld with the shared `VertexTable`); the bug
produces geometrically identical but topologically shattered meshes. If bug-parity
matters for a regression test, gate it behind a flag.

---

## 5. Dead code — do NOT port

### 5.1 `getPolyhedron_new(SSCell[] scells)` (lines 491-529)

```java
public Polyhedron getPolyhedron_new(SSCell[] scells){
    Polyhedron poly = new Polyhedron();
    FastHashtable ftable = getAllFacets(scells);          // same ±1 parity as §3.1
    FastHashtable[] tfaces = new FastHashtable[planes.length];
    FastHashtable[] bfaces = new FastHashtable[planes.length];
    ...
    for(Enumeration e = ftable.keys(); e.hasMoreElements();){
        SFace face = (SFace)e.nextElement();
        Integer ind = (Integer)ftable.get(face);
        if(ind.intValue() > 0) tfaces[face.getPlaneIndex()].put(face,face);
        else                   bfaces[face.getPlaneIndex()].put(face,face);
    }
    Vector[] tcluster = new Vector[tfaces.length];
    Vector[] bcluster = new Vector[tfaces.length];
    for(int p =0; p <  tfaces.length; p++){
        System.out.print("plane: "  + p);
        System.out.print(" top: " + tfaces[p].size());
        System.out.println("  bottom: " + bfaces[p].size());
        tcluster[p] = findFacetsClusters(tfaces[p]);
        bcluster[p] = findFacetsClusters(bfaces[p]);
    }
    return poly;                                          // <-- EMPTY Polyhedron
}
```

It **returns an empty `Polyhedron`** (no vertices, no faces). `findFacetsClusters` calls
`buildCluster(...)`, which is a stub:

```java
Vector buildCluster(SFace seed, FastHashtable facets, FastHashtable edges, Vector result){
    // TO-DO
    return result;
}
```

`findFacetsClusters` would additionally **loop forever**: its `while(facets.size() > 0)`
body never removes anything from `facets`. Nothing in the repo calls
`getPolyhedron_new`. This was the author's unfinished attempt to merge coplanar facets
into single large polygons (which is what stellation renderings conventionally show).
**Nothing to port; but note the intent — a modern port may want real coplanar-facet
merging, which the original never achieved.**

`getAllFacets(SSCell[])` (lines 431-483) is identical to §3.1 step 1 and is called only
from `getPolyhedron_new`.

### 5.2 `class OrientedEdge` (lines 566-585) — unused and broken

```java
class OrientedEdge {
    int v1,v2;
    OrientedEdge(int _v1, int  _v2){ v1 =_v1; v2 = _v2; }

    public int hashCode(){
        return v1+119*v2;
    }

    public boolean equals(Object o){
        if(!(o instanceof SEdge))          // <-- tests SEdge, not OrientedEdge
            return false;
        SEdge e = (SEdge)o;
        return (e.v1 == v1 && e.v2 == v2 );
    }
}
```

Two things: (a) it is referenced nowhere in the code base — a `grep` over all `.java`
finds only its declaration; (b) `equals` checks `instanceof SEdge`, so
`orientedEdge.equals(anotherOrientedEdge)` is always `false` and it could never work as a
hash key. Its *intended* contract was clearly an **order-sensitive** edge:
`hashCode = v1 + 119*v2` and equality requiring `(v1,v2)` in the same order — i.e. the
half-edge you would need for the coplanar-merging algorithm of §5.1.
**Do not port. If you implement coplanar merging, write a correct half-edge key
`` `${v1},${v2}` `` and remember the reverse half-edge is `` `${v2},${v1}` ``.**

### 5.3 `joinEdgesToFaces` / `makeChains` / `makeChainFromSeed` (lines 733-840)

Only reachable from the commented-out `//joinEdgesToFaces(etable);` on line 706. They
build chains of `FEdge`s per plane and print them; they never modify the `Polyhedron`.
**`joinEdgesToFaces` itself** (lines 736-746) — *not* `makeChains` — sorts edges into
`sortedEdges[nfaces*2]` indexed by
`edge.index < 0 ? -edge.index + nfaces : edge.index` — an aliasing scheme that breaks when
`|index| >= nfaces`. `makeChains(Vector edges)` (line 785) only takes one such bucket and
groups it into chains, keyed on `new Integer(fe.v1)`; `makeChainFromSeed` (line 823) walks
`v2 -> v1` links out of that table. Dead; skip.

---

## 6. `getMaxRadius()`, `rotateFaces()`, `translateFaces()`

These three are *not* part of mesh export; they exist for the 2-D stellation-diagram view
(`createDiagram`). They are documented here because the task asks for them.

```java
double maxRadius = 0;
public double getMaxRadius(){
    if(maxRadius == 0){
        for(int i =0 ; i < faces.length; i++){
            for(int j =0 ; j < faces[i].length; j++){
                double r2 = faces[i][j].getRadius();
                if(r2 > maxRadius) maxRadius = r2;
            }
        }
    }
    return maxRadius;
}
```

`SFace.getRadius()` returns `sqrt(max_i |v_i|²)` — the largest vertex distance from the
origin, so `getMaxRadius()` = radius of the smallest origin-centred sphere containing the
whole plane arrangement. Cached in `maxRadius` with the sentinel `0` (a genuinely
zero-radius stellation would recompute forever — harmless).

Used once: `createDiagram` line 2866-2869, as the `r` argument of
`Stellation.intersect(Plane P1, Plane P2, double r)` when drawing symmetry-plane traces
across the diagram.

```java
public static void rotateFaces(SFace[] f, Vector3D from, Vector3D to){
    for(int i = 0; i < f.length; i++ ){
        Vector3D[] v = f[i].vertices;
        for(int j = 0; j < v.length; j++) v[j].rotateSet(from,to);
    }
}

public static void translateFaces(SFace[] f, Vector3D center){
    for(int i = 0; i < f.length; i++ ){
        Vector3D[] v = f[i].vertices;
        for(int j = 0; j < v.length; j++) v[j].subSet(center);
    }
}
```

Both mutate `Vector3D`s **in place**. `Vector3D.rotateSet(Vector3D from, Vector3D to)`:

```java
public void rotateSet (Vector3D from, Vector3D to){
    Vector3D axis = from.cross(to);
    double sinangle = axis.length();
    double cosangle = from.dot(to);
    if(sinangle > TOL ||  sinangle < -TOL){      // static double TOL = 1.e-10
        axis.normalize();
        rotateSet(axis,sinangle,cosangle);
    }
}
```

i.e. Rodrigues rotation about `axis = from × to` by the angle between them, with the
**no-op guard `|sin| <= 1e-10`**. Note the guard also skips the *antiparallel* case
(`from ≈ −to`, `sin ≈ 0`, `cos ≈ −1`) — a 180° flip is silently not applied. `from` and
`to` are expected pre-normalised (the callers pass unit vectors).

Rodrigues (from `rotate(axis, sinangle, cosangle)`):

```
p = axis*(v·axis) + (v − axis*(v·axis))*cos + (axis × v)*sin
```

Safety note: these are only ever called on the **deep copies** made in `createDiagram`
(`new SFace(face)` copies each `Vector3D`), so the shared interned vertex objects of the
real stellation are never disturbed. **A port must preserve that: if you ever call these
on live facets you corrupt every facet that shares those vertex objects, and every
`FastHashtable` keyed by them.** Also, `SFace.center` / `SFace.area` caches are *not*
invalidated by these mutations — `createDiagram` calls `face.getCenter()` **before**
`translateFaces`, so the cached centre is stale afterwards.

---

## 7. Finding cells (picking)

### 7.1 `findCell(Vector cells, int faceIndex, int facetIndex, int top)`

```java
public int[] findCell(Vector cells, int faceIndex, int facetIndex, int top){
    SFace face = faces[faceIndex][facetIndex];
    int imax = cells.size();
    for(int i = 0; i < imax; i++){
        Vector slayer = (Vector)cells.elementAt(i);
        int jmax = slayer.size();
        for(int j = 0; j < jmax; j++){
            SCell[] scells = ((SSCell)slayer.elementAt(j)).cells;
            for(int k = 0; k < scells.length; k++ ){
                SFace[] f = (top == 1) ? scells[k].top : scells[k].bottom;
                for(int m = 0; m < f.length; m++){
                    if(f[m] == face){                     // identity
                        int[] index = new int[2];
                        index[0] = i; index[1] = j;
                        return index;
                    }
                }
            }
        }
    }
    return null;
}
```

Linear identity scan over the whole cell tree. Returns `{layer, indexInLayer}` of the
first `SSCell` that has `faces[faceIndex][facetIndex]` in its `top` (if `top==1`) or
`bottom` (if `top==0`) list, else `null`.

Caller semantics (`StellationMain.java:601-613`): clicking a facet in the 2-D diagram
with `TOGGLE_TOP_CELL` passes `top = 0` (find the cell *above* the facet, for which the
facet is a bottom facet); the other actions pass `top = 1` (find the cell *below*).

### 7.2 `findCell(SSCell[] sscells, Vector3D center, boolean adjacent)`

```java
main:
for(int s = 0; s  < sscells.length; s++){
    SCell cells[] = sscells[s].cells;
    for(int c = 0; c < cells.length; c++){
        SFace[] faces = cells[c].top;
        if(faces != null) for(int f = 0; f < faces.length; f++){
            if(faces[f].getCenter().equals(center)){       // 1e-6 tolerance
                foundSSCell = sscells[s]; foundFace = faces[f];
                adjacentSSCells = foundSSCell.top;
                adjacentSCell = faces[f].cellAbove;
                break main;
            }
        }
        faces = cells[c].bottom;
        if(faces != null) for(int f = 0; f < faces.length; f++){
            if(faces[f].getCenter().equals(center)){
                foundSSCell = sscells[s]; foundFace = faces[f];
                adjacentSSCells = foundSSCell.bottom;
                adjacentSCell = faces[f].cellBelow;
                break main;
            }
        }
    }
}
if(foundSSCell != null){
    if(adjacent){
        for(int c = 0; c < adjacentSSCells.size(); c++){
            SSCell sscell = (SSCell)adjacentSSCells.elementAt(c);
            if(sscell.hasSCell(adjacentSCell))
                return new int[]{sscell.layer, sscell.index};
        }
    } else {
        return new int[]{foundSSCell.layer, foundSSCell.index};
    }
}
return null;
```

This is the **3-D picking** path: `Canvas3D` reports the picked `Face.center` (in model
coordinates), `StellationMain.update` wraps it in a `new Vector3D(center)` and calls
`StellationController.findCell(v, addCell)`.

* Matching is by **facet centroid**, using `Vector3D.equals` — the 1e-6 per-component
  tolerance again. `Face.center` in `Stellation3D.initFacePlaneDist` is the mean of the
  face's vertices read out of the flat `vert[]` array, so it agrees with
  `SFace.getCenter()` to roundoff (summation order may differ; the difference is
  ~1e-15).
* `adjacent == false` (SHIFT-click, `addCell = false`) → return the cell the user clicked
  on, so it can be removed.
* `adjacent == true` (CTRL-click, `addCell = true`) → return the cell on the *other* side
  of the clicked facet, so it can be added. `SSCell.top` / `SSCell.bottom` are the
  neighbouring-orbit lists populated by `makeConnectivityGraph(Vector allcells)`
  (line 2096), which also does `bcell.setIndex(layer, j)` so that `sscell.layer` /
  `sscell.index` are meaningful. **If `makeConnectivityGraph` was not run, `top`/`bottom`
  are empty and `adjacent == true` always returns `null`.** (`makeCells` calls it;
  `makeCells2` has the call commented out at line 1663 — worth checking which the port
  uses.)
* `foundFace` is assigned but never read (dead local).

---

## 8. From `Polyhedron` to the screen

### 8.1 Flattening (`StellationMain.showModel(SSCell[] cells)`, lines 855-907)

```java
Polyhedron poly = this.controller.getStellation().getPolyhedron(cells);
double[] vert = new double[poly.vertices.length*3];
for(int i = 0, j = 0; i < poly.vertices.length; i++){
    Vector3D v = poly.vertices[i];
    vert[j++] = v.x; vert[j++] = v.y; vert[j++] = v.z;
}
int[][] faces = new int[poly.ifaces.length][];
for(int i = 0; i < faces.length; i++){
    faces[i] = new int[poly.ifaces[i].length];
    for(int j = 0; j < faces[i].length; j++)
        faces[i][j] = poly.ifaces[i][j]*3;        // *** indices are PRE-MULTIPLIED BY 3 ***
}
int[][] edges = new int[0][2];                    // *** edges disabled for display ***
model3D = new pvs.g3d.Stellation3D(vert, faces, edges, poly.colors, poly.icolor,
                                   controller.getStellationSymmetry(),
                                   controller.getPolyhedronPlanes());
```

Two things to carry over: face indices in `Model3D`/`Stellation3D` are **component
(element) offsets into the flat `double[] vert` array** — `vertexIndex*3`, i.e. the slot
of the vertex's `x`, *not* a byte offset — and the edge list is deliberately passed empty
(`new int[0][2]`) so the dead loop over it never runs.

`controller.getPolyhedronPlanes()` returns `Vector3D[]`, one per face of the **base**
polyhedron, each being `plane.v.mul(plane.d)` — i.e. the point on the plane nearest the
origin (`StellationController.makePolyhedronPlanes`). The plane equation is
`p·x = |p|²`.

### 8.2 `Model3D` — the base renderer

Per-face normal in `Model3D.init()`:

```java
int v0 = index[0], v1 = index[1], v2 = index[2];
Vec3 vec0 = new Vec3(vert[v1]-vert[v0], vert[v1+1]-vert[v0+1], vert[v1+2]-vert[v0+2]);
Vec3 vec1 = new Vec3(vert[v2]-vert[v1], vert[v2+1]-vert[v1+1], vert[v2+2]-vert[v1+2]);
Vec3 norm = Vec3.cross(vec1,vec0);
norm.normalize();
```

Note the operand order: `vec1 × vec0 = −(vec0 × vec1)`. For a CCW-from-outside polygon
the conventional outward normal is `vec0 × vec1`, so **`Model3D.normals[f]` is the
INWARD normal.** That is consistent with the back-face test, which keeps faces with
`tnormal.z > 0` after a view matrix built on `unit_flipped()`:

```java
public void unit_flipped(){ xx=1; yy=-1; zz=-1; }      // Matrix3D
```

(`Canvas3D` lines 605/630 call `m_model.mat.unit_flipped()` before rotation/scale, since
screen Y grows downward.) In `Model3D.paint`: `if(tnormals[i] != null && tnormals[i].z < 0
&& drawFaces) continue;`. Vertices go through
`Matrix3D.transform(double[], int[], nvert)` which **truncates x,y to `int` screen pixels**
and stores `z * 1000000.0f` as an int.

Painter's sort: `qs(0, nfaces-1)` sorts `findex[]` by `face[].zdepth` **descending**
(`while (face[findex[i]].zdepth > x && i < right) i++;`), i.e. far-to-near given the
z flip. `zdepth` is the mean of the face's transformed z.

Lighting, `Model3D.makeColor(Color c, Vec3 normal)`:

```java
int cred = c.getRed(), cgreen = c.getGreen(), cblue = c.getBlue();   // computed, NEVER USED
int red = 50, green = 50, blue = 50;
for(int i = 0; i < light.length; i++){
    double dot = Vec3.dot(light[i], normal);
    if(dot < 0.) continue;
    double dot1 = 1-dot;                                             // computed, NEVER USED
    red   += dot*light_color[i].getRed();
    green += dot*light_color[i].getGreen();
    blue  += dot*light_color[i].getBlue();
}
return new Color(Math.min(255,red), Math.min(255,green), Math.min(255,blue));
```

**The face's own colour argument `c` is discarded.** The shade is
`clamp(50 + Σ_i max(0, L_i·n) · C_i, 0..255)` per channel. `red/green/blue` are `int`s, so
`red += dot*...` truncates each term (Java compound assignment does an implicit narrowing
cast). `double ambient = 0.25` is declared and never used.

Light rigs (normalised in the `Model3D()` constructor):

| mode | directions (pre-normalisation) | normalised | colour |
|---|---|---|---|
| normal | `(10,0,10)` | `(0.70711, 0, 0.70711)` | `(225,0,0)` |
| normal | `(10,10,10)` | `(0.57735, 0.57735, 0.57735)` | `(0,225,0)` |
| normal | `(0,10,10)` | `(0, 0.70711, 0.70711)` | `(0,0,225)` |
| anaglyph | `(10,10,10)` | `(0.57735, 0.57735, 0.57735)` | `(150,150,150)` |
| anaglyph | `(-10,5,10)` | `(-0.66667, 0.33333, 0.66667)` | `(150,150,150)` |

So the characteristic look — red / green / blue rim lights on a dark grey base — is
produced entirely by this three-light rig, independent of face colour.

### 8.3 `Stellation3D` — the renderer actually used

`Stellation3D extends Model3D` and **overrides `init()`** to deduplicate normals:

```java
FastHashtable htNormals = new FastHashtable();
FastVector vNormals = new FastVector(), tNormals = new FastVector();
for (int f = 0; f < nfaces; f++) {
    ... Vec3 norm = Vec3.cross(vec1,vec0); norm.normalize();
    Object o = htNormals.get(norm);
    if(o == null){
        face[f].nindex = vNormals.size();
        htNormals.put(norm, new Integer(face[f].nindex));
        vNormals.addElement(norm);
        tNormals.addElement(new Vec3());
    } else {
        face[f].nindex = ((Integer)o).intValue();
    }
    gr[f] = new Color(face[f].cr, face[f].cg, face[f].cb);
}
normals = new Vec3[vNormals.size()];  vNormals.copyInto(normals);
tnormals = new Vec3[tNormals.size()]; tNormals.copyInto(tnormals);
colors = new Color[tNormals.size()];
```

`Vec3.equals` uses the same `tolerance = 1.e-6` per-component test and the same
non-consistent `hashCode` as `Vector3D`. Because a stellation has only ~2×(#planes)
distinct facet normals, this collapses thousands of faces onto a handful of normals — the
whole point of the override.

Then in `paintSlow`:

```java
for(int i = 0; i < colors.length; i++){
    if(tnormals[i].z > 0)
        colors[i] = makeColor(Color.white, tnormals[i]);
}
...
Face facei = face[sortedFaces[i]];
int nindex = facei.nindex;
if(tnormals[nindex] != null && tnormals[facei.nindex].z <= 0 && drawFaces) continue;   // backface
...
g.setColor(colors[nindex]);
g.fillPolygon(vx, vy, nv);
```

**Confirmed: the on-screen colour is `colors[nindex]`, keyed by NORMAL, computed from
`Color.white`.** `gr[f]` (built from `poly.colors[poly.icolor[f]]`, i.e. the yellow/orange
top/bottom colours) is populated and never used by `Stellation3D`. So in the live viewer,
the top/bottom two-tone is invisible; every facet with a given normal has exactly one
shade. **A JS port that wants to look like the original must shade per-normal from white
with the 3-light rig, not per-face from `icolor`.** (Export to OFF still writes the
two-tone.)

Back-face culling is `<= 0` here versus `< 0` in `Model3D` — faces exactly edge-on are
dropped.

### 8.4 Depth sorting: `card_shuffle()` (the stellation-specific painter's algorithm)

`Model3D.qs` (mean-z quicksort) is **not** used by `Stellation3D`. Instead:

```java
private void initFacePlaneDist(){
    // face centres
    for (int i = 0; i < nfaces; i++) {
        ... facei.center = new Vec3(x/facei.nverts, y/facei.nverts, z/facei.nverts);
        facei.findex = i;
    }
    facePlaneDist = new byte[planes.length][face.length];
    for(int p = 0; p < planes.length; p++){
        Vec3 plane = planes[p];
        for(int f = 0; f < face.length; f++){
            Vec3 center = face[f].center;
            double dist = (plane.dot(plane,center) - plane.length2());
            if(dist < -EPS)      facePlaneDist[p][f] = -1;
            else if (dist > EPS) facePlaneDist[p][f] =  1;
            // else stays 0
        }
    }
}
private static final double EPS = 1.e-6;
```

so `facePlaneDist[p][f] ∈ {-1, 0, +1}` records which side of plane `p` face `f`'s centre
is on, with tolerance **1e-6** (planes given as points `p`, plane equation `p·x = |p|²`).

```java
void card_shuffle(){
    sortedFaces = index1;
    for(int p = 0; p < planes.length; p++){
        int [] src = index1, front = index2, back = index3;
        int fcount = 0, bcount = 0;
        double zcomp = tplanes[p].z;
        zcompOld[p] = zcomp;
        for(int f = 0; f < src.length; f++){
            int faceIndex = src[f];
            int s = facePlaneDist[p][src[f]];
            if(s * zcomp > 0.0001){ front[fcount++] = faceIndex; }
            else                   { back[bcount++]  = faceIndex; }
        }
        int scount = 0;
        for(int f = 0; f < fcount; f++) src[scount++] = front[f];
        for(int f = 0; f < bcount; f++) src[scount++] = back[f];
    }
    sortedFaces = index1;
}
```

Algorithm, in words: for each plane of the arrangement, stably partition the current face
order into the group with `s*zcomp > 0.0001` (collected in the array *named* `front[]`)
and everything else (`back[]`), then write **`front[]` first, `back[]` second** — read the
copy-back loops carefully, the code does *not* write `back[]` first. `tplanes` is the
transformed plane-point array (`transform()` calls
`mat.transform(planes, tplanes, planes.length)`, which applies rotation/scale only — the
`Vec3[]` overload drops the translation terms), so `tplanes[p].z` tells which way the
plane faces the camera. Faces are then drawn in array order `i = 0 .. nfaces-1`, so
**the array holds far-to-near** — and since `s*zcomp > 0` means the face sits on the +z
(away-from-camera) side of plane `p`, the group written first is the far one and the name
`front[]` is a misnomer (the class comment calls that same group "behind"). The threshold
is the literal `0.0001` on
`s * zcomp`. Since the model is a union of convex cells cut by these very planes, this
gives an exact depth order that a mean-z sort cannot.

`index1/index2/index3` are three reusable `int[nfaces]` scratch arrays allocated once in
the constructor; `index1` is initialised to the identity permutation and is **never
re-initialised between frames** — the previous frame's order is the starting point.
Because the partition is stable and every plane is re-applied on every frame that sorts,
the result is still correct; but it makes the order frame-history dependent. A port can
safely reset `index1` to identity each frame. Note `paintSlow` guards the call —
`sortedFaces = index1; if (drawFaces) card_shuffle();` (`Stellation3D.java:221-223`) — so
in lines-only mode no sorting happens at all and `index1` keeps whatever order the last
filled frame left in it.

### 8.5 Picking

```java
public int[] findFaceAtPoint(int x, int y){
    for (int i = nfaces-1; i >= 0; i--) {          // nearest first (reverse draw order)
        Face facei = face[sortedFaces[i]];
        int nindex = facei.nindex;
        if(tnormals[nindex] != null && tnormals[facei.nindex].z <= 0) continue;
        ... fill vx/vy from tvert ...
        if(isInsidePolygon(vx,vy,nv,x,y)){
            int vindex = findClosestVertex(facei,x,y);
            return new int[]{facei.findex, vindex};
        }
    }
    return new int[]{-1,-1};
}
```

`isInsidePolygon` is an **even-odd** crossing test done in integer screen coordinates
(`int xinters = (y-y1) * (x2-x1) / (y2-y1) + x1;` — **integer division**, deliberately;
see §9). `findClosestVertex` uses Manhattan distance `|dx|+|dy|` with an initial
`dmin = 1000` (so a click farther than 1000 px in L1 from every vertex returns vertex 0).

### 8.6 Export

* `writeSTL` fans each polygon from vertex 0: `for j in 0..n-3: addTri(v[0], v[j+1], v[j+2])`.
  `STLWriter.addTri` writes a **zero normal** (`defaultNormal = (0,0,0)`) and relies on
  vertex order — which is CCW-from-outside per §3.2, the STL convention. `STLWriter` has
  `static final double SCALE = 1000` for mm; `StellationController.doExport` pre-scales via
  `poly.scale(m_exportLengthUnit)`.
* `writeOFF` writes `OFF`, `#`-prefixed description lines, `nv nf ne`, then vertices, then
  `n i0 i1 ... R G B` per face using `getColor(i) = colors[icolor[i]]` — the only place the
  yellow/orange survives.
* `writeDXF` emits `3DFACE` entities; polygons with >4 vertices become one quad
  `(v0,v1,v2,v3)` plus a fan of triangles `(v0, v[i-1], v[i])` for `i = 4..n-1`.
* `getTriCount() = Σ (ifaces[i].length - 2)`.

`getPolyhedron(int layer)` output has **no colours**, so the CLI path
(`StellationUI.java:321-326`) calls `poly.generateRandomColors(poly.paintFacesByArea())`
first: faces are binned by area with tolerance `Math.abs(d - a) < 0.001`
(`findAreaColorIndex`) and each bin gets an HSB colour
`Color.getHSBColor(c, 0.5f, 0.9f)` with `c` starting at `Math.random()` and stepping by
`1.0/ncolors` (wrapping at 1.0).

---

## 9. `getPolyhedron(int layer)` — the "main-line stellation" shortcut

`Stellation.java:286-359`. Emits **every facet whose `layer == layer`**, from every plane.
No cells involved, no boundary extraction, no top/bottom distinction.

```java
int fcounter = 0;
for(int i = 0; i < faces.length; i++)
  for(int j = 0; j < faces[i].length; j++)
    if(faces[i][j].layer == layer) fcounter++;

Polyhedron poly = new Polyhedron();
poly.ifaces = new int[fcounter][];
fcounter = 0;
Vector vert = new Vector();
FastHashtable table = new FastHashtable();

for(int i = 0; i < faces.length; i++){
  for(int j = 0; j < faces[i].length; j++){
    if(faces[i][j].layer == layer){
      int[] iface = new int[faces[i][j].vertices.length];
      for(int k = 0; k < iface.length; k++)
        iface[k] = findIndex(table, vert, faces[i][j].vertices[k]);

      // remove double vertices  (count corners whose SUCCESSOR index differs)
      int vcounter = 0;
      for(int k = 0; k < iface.length; k++)
        if(iface[(k+1)%iface.length] != iface[k]) vcounter++;

      if(vcounter == 0){                       // fully degenerate -> drop
        poly.ifaces[fcounter] = null;
      } else if(vcounter != iface.length){      // some consecutive duplicates -> compact
        int[] newf = new int[vcounter];
        vcounter = 0;
        for(int k = 0; k < iface.length; k++)
          if(iface[(k+1)%iface.length] != iface[k]) newf[vcounter++] = iface[k];
        poly.ifaces[fcounter] = newf;
      } else {
        poly.ifaces[fcounter] = iface;
      }
      fcounter++;
    }
  }
}
// compact out the nulls
int fc = 0;
for(int i=0; i < poly.ifaces.length; i++) if(poly.ifaces[i] != null) fc++;
if(fc != poly.ifaces.length){
  int [][] newif = new int[fc][];
  fc = 0;
  for(int i=0; i < poly.ifaces.length; i++)
    if(poly.ifaces[i] != null) newif[fc++] = poly.ifaces[i];
  poly.ifaces = newif;
}
poly.vertices = new Vector3D[vert.size()];
vert.copyInto(poly.vertices);
return poly;
```

with

```java
int findIndex(FastHashtable table, Vector vert, Vector3D vector){
    Integer index = (Integer)table.get(vector);
    if(index == null){
        Integer newindex = new Integer(vert.size());
        table.put(vector,newindex);          // correct key order (cf. §4 bug)
        vert.addElement(vector);
        return newindex.intValue();
    }
    return index.intValue();
}
```

Points to note:

* Vertex welding is the same 1e-6 `Vector3D` table as §3.2 and here it is **correct**.
* The degenerate-corner filter compares **indices after welding**, so it removes corners
  whose *successor welded to the same vertex* — i.e. edges shorter than the merge
  tolerance. Only *consecutive* duplicates are removed; a repeated vertex separated by
  others survives (a pinched polygon).
* `poly.icolor` and `poly.colors` are left at their empty defaults; the caller must set
  them (see §8.6).
* `poly.edges` is left empty.
* All facets keep their stored order → all normals point outward from *their own plane*,
  which for a "main-line" stellation shell is the outward direction. There is no
  inside/outside pairing, so this output is a single-sided shell, not a closed solid.

The package-private *static* counterpart (it is `static`, but **not** `public` —
`Stellation.java:926`)

```java
static int findIndex(Vector vert, Vector3D vect){
    int size = vert.size();
    for(int i = 0; i < size; i++)
        if(vect.equals((Vector3D)vert.elementAt(i))) return i;
    vert.addElement(vect);
    return size;
}
```

is the O(n) linear-scan version — **tolerance-correct** (no hashing), and therefore
subtly *different* from the hashed version: it will merge points that the hashed version
splits. It is not used in the mesh path.

---

## 10. JS PORTING NOTES

1. **`SFace` identity, not geometry.** `SFace` overrides `hashCode()` (centroid-derived)
   but not `equals()`, so all `FastHashtable` operations on facets are reference identity.
   Give every facet a monotonically increasing integer `id` at construction and key the
   parity map on that (`Map<number, 1|-1>` or `Map<SFace, …>` — JS `Map` uses SameValue,
   which is object identity, so `Map<SFace,…>` works directly). **Do not** key facets by
   centroid, or coincident facets from different planes will merge.

2. **The vertex merge is `1e-6` L∞, but hashed with a non-consistent hash.** Faithful
   reproduction requires a bucketed table whose bucket key is
   `(int)(331345.563*x) + (int)(412345.891*y) + (int)(71341.678*z)` with **truncation
   toward zero** (`Math.trunc`, *not* `Math.floor` — they differ for negatives) and
   `((h & 0x7FFFFFFF) % capacity)` bucketing, plus — before any geometric compare — an
   **exact equality test on the full 32-bit hash** (`e.hash == h`), and only then the
   tolerant `equals`. Bucket membership alone never triggers a geometric compare.
   Note the products can exceed 2³¹; Java's `(int)` cast of a `double` saturates at
   `Integer.MAX_VALUE/MIN_VALUE`, and the `int` additions wrap modulo 2³². In JS use
   `Math.trunc` then `| 0` (which wraps) and clamp explicitly for the saturation case.
   *Recommended alternative:* implement a correct spatial hash (quantise each coordinate
   to `round(v/1e-6)` and probe the 27 neighbouring cells). This is strictly better
   geometry; only bit-identical index numbering is lost, and index numbering is already
   hash-order dependent (§3.5).

3. **Vertices are shared/interned objects.** The stellation builder interns every
   `Vector3D` (`findVertex`, `transformFace`), and `SFace.adjacent()` compares vertices
   with `==`. Preserve that: use one canonical `Vector3D` object per geometric point, and
   compare with `===` where the Java compares with `==`.

4. **Never mutate a live vertex.** `Vector3D.subSet/mulSet/rotateSet/addSet/set` mutate in
   place; `rotateFaces`/`translateFaces` walk facets and mutate. In Java this is only safe
   because `createDiagram` deep-copies first. In JS the same trap exists and is worse
   (`Map` keyed on objects will silently keep stale entries). Prefer immutable vector ops
   in the port and copy explicitly where the original copies.

5. **`java.util.Vector` and `FastHashtable`.** `Vector` → `Array`. `FastHashtable` extends
   `java.util.Hashtable` but shadows *all* of its storage, so only its own methods matter;
   `size()`, `get`, `put`, `remove`, `keys()`, `elements()` map to `Map`. **Enumeration
   order is bucket order from the highest bucket down** (`HashtableEnumerator` starts at
   `index = table.length` and decrements) — `Map` in JS iterates in insertion order. This
   changes face/vertex/edge numbering in the output but not the geometry. Do not rely on
   iteration order for correctness anywhere.

6. **Boxed-`Integer` reference comparison.** `index == bottomindex`, `findex == topindex`
   compare *object references* to the two singletons `new Integer(1)` / `new Integer(-1)`.
   The code only works because those exact instances are used. In JS just use `+1` / `-1`
   numbers with `===`.

7. **Integer division and `(int)` truncation.**
   * `Matrix3D.transform(double[], int[], nvert)` truncates screen x,y to `int` and stores
     `z*1000000.0f` as an `int` — reproduce with `Math.trunc` if you want pixel-identical
     output; a WebGL port should just keep doubles.
   * `Stellation3D.isInsidePolygon`: `int xinters = (y-y1) * (x2-x1) / (y2-y1) + x1;` is
     **integer division**. Use `Math.trunc((y-y1)*(x2-x1)/(y2-y1)) + x1` for parity.
   * `makeTopBottomColors`: `(int)(0.85*255) = 216`, `(int)(0.1*255) = 25`,
     `(int)(0.95*255) = 242`, `(int)(0.4*255) = 102`, `(int)(0.2*255) = 51`. Hard-code
     `#D8D819` / `#F26633`; do not recompute with `Math.round`.
   * `Model3D.makeColor`: `int red = 50; red += dot*lightRed;` truncates **each** term
     (Java compound-assignment narrowing). To match, accumulate with
     `red = Math.trunc(red + dot*lightRed)` inside the loop, not once at the end.

8. **`float` vs `double`.** Only two `float` literals matter: `z*1000000.0f` in
   `Matrix3D.transform`, and the `0.75f` load factor. Everything geometric is `double`.
   JS numbers are doubles → fine.

9. **Static mutable state.**
   * `Stellation.fval` — `static double[] fval = new double[1000]`, a shared scratch buffer
     for polygon clipping, with the comment *"we assume, that there will be less than 1000
     vertices in polygon"*. Not thread-safe, and silently `ArrayIndexOutOfBounds` above
     1000. Make it a local/growable array.
   * `Stellation.THRESHOLD = 1.e-7`, `FACTOR = 5.e3`, `MAXVERTEX = 2.e3`,
     `ROUND_FACTOR = 1.e6` — `FACTOR`/`MAXVERTEX` are **non-final** statics.
   * `Polyhedron.outFaces/outEdges/outVertices/outColor/tolerance/Out/Debug` are static and
     mutated by `StellationController.doExport`. Make them per-export options.
   * `STLWriter.buffer`, `STLWriter.buffer2`, `STLWriter.STLHeader` are static byte buffers
     shared across writers.

10. **Tolerance table (memorise these; they are all different).**

    | constant | value | where | what it gates |
    |---|---|---|---|
    | `Vector3D.tolerance` | `1.e-6` | `Vector3D.equals` | **vertex merging**, facet-centre picking |
    | `Vec3.tolerance` | `1.e-6` | `Vec3.equals` | render-time normal deduplication |
    | `Vector3D.TOL` | `1.e-10` | `rotateSet(from,to)`, `chop` | skip near-zero rotations |
    | `Plane.TOLERANCE` | `1.e-10` | `Plane.equals`, `Stellation.intersect(Plane,Vector3D)` | plane identity |
    | `Stellation.THRESHOLD` | `1.e-7` | `intersectFacesWithPlane` | in/out of half-space during clipping |
    | `Stellation3D.EPS` | `1.e-6` | `initFacePlaneDist` | face-centre side-of-plane sign |
    | `card_shuffle` literal | `0.0001` | `s*zcomp > 0.0001` | depth-partition threshold |
    | `Stellation.intersect(P1,P2,r)` `EPSILON` | `0.001` | plane-plane parallelism | diagram only |
    | `SSCell.EPS` | `1.e-4` | volume comparison in `compare` | cell ordering |
    | `SSCell.TOL` | `0.0001` | `old_compare` (dead) | — |
    | `Polyhedron.findAreaColorIndex` | `0.001` | area binning | CLI random colouring |
    | `Model3D.CHOP` | `1.e-10` | `chop` (debug print only) | — |
    | `Stellation.chop` | `1.e-10` | file output rounding | — |
    | `Stellation.ROUND_FACTOR` | `1.e6` | `round()` for printed rotations | — |

11. **`StreamTokenizer` quirks (only relevant if you port the loaders).**
    `Model3D.readObject` and `Polyhedron.readOFF` use `java.io.StreamTokenizer` with
    `eolIsSignificant(true)` and `commentChar('#')`. `StreamTokenizer.parseNumbers()` is on
    by default and **cannot parse exponent notation** (`1.0e-5` tokenises as the number
    `1.0` followed by the word `e-5`) and treats `-` as a sign only when directly followed
    by digits. It also collapses `--` oddly. `pvs/utils/FixedStreamTokenizer` exists
    specifically to work around some of this and is what
    `StellationController.makeStreamTokenizer` uses (with `wordChars('0','9')`,
    `wordChars('-','-')`, `wordChars('.','.')` so numbers arrive as *words* and are parsed
    manually). If you port the `.off` reader, parse with a plain regex/`parseFloat` and
    accept exponents — the Java reader would have rejected them.

12. **`Face.index[]` holds pre-multiplied indices.** In `Model3D`/`Stellation3D`, an
    entry of `face[i].index[]` is `vertexIndex*3` (an offset into the flat `vert[]`
    array), set by the caller in `StellationMain.showModel`. Any port that keeps a flat
    `Float32Array` should decide once whether indices are element or component offsets and
    stay consistent — the original mixes the two conventions across `Polyhedron.ifaces`
    (element) and `Face.index` (component).

13. **`Model3D.MAX_VERTS = 20`.** `vx`/`vy` scratch arrays are `int[20]`; a facet with more
    than 20 vertices overflows. Stellation facets are small, but size the port's buffer
    dynamically.

14. **Two rendering-vs-export colour paths.** Export honours `poly.icolor`/`poly.colors`
    (yellow/orange); the interactive renderer ignores them and shades per-normal from
    white. Decide explicitly which the JS viewer should do — the "authentic" look is the
    per-normal three-light shading (§8.2/§8.3).

---

## 11. UNCERTAIN

* **UNCERTAIN:** I did not verify empirically that the vertex order of a clipped `SFace`
  is always CCW about `plane.v`. The claim is derived from `makeSeedFace(Plane plane, int
  face)` building `y = x̂ × n̂` (or `ŷ × n̂` when degenerate), `z = n̂ × y`, hence
  `y × z = n̂`, so the seed quad `fpoint + y·cos(2πi/4) + z·sin(2πi/4)` runs CCW about
  `n̂`; and from `intersectFacesWithPlane` preserving cyclic order when it splits the
  polygon. I did not trace `transformFace`'s determinant flip
  (`if(det < 0.) { reverse vertices }`) against a concrete improper symmetry operation to
  confirm it restores the same convention for mirror-image planes — the code clearly
  intends it to, but I have not run it.
* **UNCERTAIN:** whether `plane.d` is guaranteed `>= 0` for all planes reaching
  `getPolyhedron`. `Plane(Vector3D,double,int)` (the constructor used in the `Stellation`
  constructors) does **not** normalise the sign of `d`; only `Plane(v0,v1,v2,index)` does
  (`if(d < -TOLERANCE){ d = -d; v = -v; }`). If a caller ever supplies a negative `d`, the
  "outward" direction of `plane.v` flips and the top/bottom colour assignment inverts for
  that plane. In the observed paths (`Stellation(Vector3D[] vectors, ...)` and
  `Stellation(Vector3D[] canvect, String symmetry, ...)`) `d = v.length() >= 0`, so this
  does not arise there.
* **UNCERTAIN:** the exact behaviour when three or more facets in the same plane and with
  the same `±1` tag share an edge. `FEdge` parity leaves such an edge in `etable`
  (odd count), so `poly.edges` will contain it. I could not construct a stellation that
  exercises this without running the program.
* **UNCERTAIN:** whether `makeCells2` (whose `makeConnectivityGraph` call is commented out
  at line 1663) is ever the active path in the shipping UI. `StellationUI` uses
  `makeCells`; I did not trace every branch of `StellationController`. If `makeCells2` is
  used, `SSCell.top`/`bottom` stay empty and CTRL-click cell-adding via
  `findCell(SSCell[], Vector3D, true)` silently does nothing.
* **UNCERTAIN:** the precise screen-space handedness after
  `unit_flipped() → rotations → scale → translate`. I reasoned that `Model3D.normals[f]`
  is the inward normal (because of `Vec3.cross(vec1, vec0)`) and that the `tnormal.z > 0`
  keep-test is therefore consistent with CCW-from-outside faces, but I did not render
  anything to confirm the sign end-to-end. If a port shows inside-out culling, flip that
  test first.
* **UNCERTAIN:** I did not read `pvs/utils/FastVector.java`, `pvs/utils/QSort.java` or
  `pvs/polyhedra/SVertex.java` in full; they are used by the paths above but their exact
  semantics (e.g. `QSort`'s stability) do not affect mesh geometry.

---

## 12. Key entry points, one line each

| Java | Purpose |
|---|---|
| `public Polyhedron Stellation.getPolyhedron(SSCell[] scells)` | **the** mesh builder: ±1 facet parity → boundary, weld, wind, edges, two-tone colour |
| `public Polyhedron Stellation.getPolyhedron(Vector cells, int[][] stellation)` | selection indices → `getStellation` → `getPolyhedron(SSCell[])` |
| `public SSCell[] Stellation.getStellation(Vector cells, int[][] stellation)` | `{layer,index}` pairs → `SSCell[]` |
| `public Polyhedron Stellation.getPolyhedron(SSCell scell)` | one cell orbit, all facets, **broken welding** (§4) |
| `public Polyhedron Stellation.getPolyhedron(int layer)` | all facets of one layer, correct welding, no colours |
| `public Polyhedron Stellation.getPolyhedron_new(SSCell[] scells)` | dead: returns empty `Polyhedron`, infinite-loops in `findFacetsClusters` |
| `FastHashtable Stellation.getAllFacets(SSCell[] scells)` | ±1 parity map, used only by `getPolyhedron_new` |
| `class Stellation.OrientedEdge` | dead + broken `equals(instanceof SEdge)` |
| `public double Stellation.getMaxRadius()` | max vertex radius over all facets, cached |
| `public static void Stellation.rotateFaces(SFace[] f, Vector3D from, Vector3D to)` | in-place Rodrigues rotation of all facet vertices |
| `public static void Stellation.translateFaces(SFace[] f, Vector3D center)` | in-place `v -= center` on all facet vertices |
| `public int[] Stellation.findCell(Vector cells, int faceIndex, int facetIndex, int top)` | identity scan → `{layer,index}` of the cell owning that facet as top/bottom |
| `public int[] Stellation.findCell(SSCell[] sscells, Vector3D center, boolean adjacent)` | centroid pick (1e-6) → this cell, or the cell across the facet |
| `static Color[] Stellation.makeTopBottomColors()` | `{ #F26633, #D8D819 }` |
| `int Stellation.findIndex(FastHashtable table, Vector vert, Vector3D vector)` | hashed vertex intern (1e-6) |
| `public void Polyhedron.makeCCW()` | input-side winding fix (not applied to stellation output) |
| `void Stellation3D.init()` | per-normal dedup (1e-6) replacing `Model3D`'s per-face normals |
| `void Stellation3D.card_shuffle()` | plane-partition depth sort, threshold `0.0001` |
| `private void Stellation3D.initFacePlaneDist()` | `byte[plane][face] ∈ {-1,0,1}`, `EPS = 1e-6` |
| `public Color Model3D.makeColor(Color c, Vec3 normal)` | `clamp(50 + Σ max(0,L·n)·C)`, ignores `c` |
