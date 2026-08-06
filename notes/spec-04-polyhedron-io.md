# spec-04 — `Polyhedron` data model and file I/O

Reverse-engineered from source. Every field name, method signature, constant and
tolerance below was read out of the actual files listed here.

**Primary source**
`/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/main/java/pvs/polyhedra/Polyhedron.java` (1136 lines, read in full)

**Supporting source**
- `.../src/main/java/pvs/polyhedra/Vector3D.java`
- `.../src/main/java/pvs/polyhedra/VectorIndex.java`
- `.../src/main/java/pvs/utils/FixedStreamTokenizer.java`  (forked `java.io.StreamTokenizer`)
- `.../src/main/java/pvs/utils/Fmt.java`                    (ACME `Fmt`, number → string)
- `.../src/main/java/pvs/utils/QSort.java`, `DoubleComparator.java`, `Output.java`
- `.../src/main/java/pvs/g3d/STLWriter.java`
- `.../src/main/java/pvs/polyhedra/Stellation.java`         (producer of `Polyhedron`)
- `.../src/main/java/pvs/polyhedra/stellation/StellationController.java` (export driver)
- `.../src/ui/java/pvs/polyhedra/ui/StellationUI.java`      (CLI driver)
- `.../src/jsweet/java/awt/Color.java`                       (the `Color` the JS build sees)

**Data inspected**
`.../stellation/resources/images/off/` — 150 `.off` files; `u27.off`, `d29.off`, `u57.off`
read byte-for-byte, plus a scripted survey of all 150 (6209 faces total).

---

## 1. Data model

### 1.1 `Vector3D` (pvs.polyhedra.Vector3D)

```java
public class Vector3D {
  public double x, y, z;
  static final double tolerance = 1.e-6;   // line 256
  static double TOL = 1.e-10;              // line 288 — used by chop()/toString() AND by
                                           //   rotateSet(from,to) at line 235 as the
                                           //   sin(angle) degeneracy threshold
  int hashCode = 0;                        // lazily cached, invalidated on mutation
}
```

Operations used by `Polyhedron`:

| method | semantics |
|---|---|
| `Vector3D(Vector3D v)` | copy ctor |
| `addSet(v)` | `this += v`, returns `this` |
| `mulSet(double a)` | `this *= a`, returns `this` |
| `cross(v)` | `new Vector3D(y*v.z - z*v.y, z*v.x - x*v.z, x*v.y - y*v.x)` (does **not** mutate) |
| `dot(v)` | `x*v.x + y*v.y + z*v.z` |
| `length2()` | `x*x + y*y + z*z` |
| `length()` | `sqrt(length2())` |
| `getCoord(double[] f)` | writes `f[0..2] = x,y,z` |

`equals` / `hashCode` — this pair is **inconsistent** and matters when porting:

```java
public boolean equals(Object o){          // tolerant, per-component
  if(o == this) return true;
  Vector3D v = (Vector3D)o;
  double dx = |v.x - x|, dy = |v.y - y|, dz = |v.z - z|;
  return dx < tolerance && dy < tolerance && dz < tolerance;   // tolerance = 1e-6
}
public int hashCode(){                    // exact, quantizing
  if(hashCode != 0) return hashCode;
  int value = (int)(331345.563*x) + (int)(412345.891*y) + (int)(71341.678*z);
  return value;                           // NOTE: never stores into the cache field
}
```

Two vectors 1e-9 apart are `equals` but almost always hash differently. Any
`Hashtable<Vector3D,...>` lookup is therefore *approximate*. See §9.

**`Vector3D` has no `normal` field, and neither does `Polyhedron`.** Face normals are
computed downstream in the renderer, `pvs/g3d/Model3D.java` `init()` (line ~318):

```java
Vec3 vec0 = v1 - v0;  Vec3 vec1 = v2 - v1;
Vec3 norm = Vec3.cross(vec1, vec0);  norm.normalize();   // note the operand order
normals[f] = norm;                                       // null when index.length < 3
```

and in `Stellation.getPlane(Polyhedron poly, int face)` (line 946):

```java
Vector3D normal = v2.sub(v1).cross(v0.sub(v1));  normal.normalize();
double dot = normal.dot(v1);
return new Plane(normal, dot, face);
```

**The two are opposite in sign — do not assume they agree.** With
`e1 = v1−v0`, `e2 = v2−v1` (`Vec3.cross(a,b) == a × b`, Vec3.java:38):

- `Model3D.init` computes `e2 × e1` — the *inward* normal for a face wound
  CCW-from-outside. `Model3D` is self-consistent with this: its backface test at
  Model3D.java:512 is `tnormals[i].z < 0`.
- `Stellation.getPlane` computes `(v2−v1) × (v0−v1) = e2 × (−e1) = e1 × e2` — the
  ordinary *outward* normal.

So `getPlane` is the conventional `cross(edge1, edge2)` after all, and only the renderer
uses the flipped order. Reproduce each operand order separately; copying one into the
other flips every normal.

### 1.2 `Polyhedron` instance fields (lines 27–34)

```java
public Vector3D[]       vertices = new Vector3D[0];   // vertex positions
public int[][]          ifaces   = new int[0][0];     // ifaces[f][k] = vertex index, CCW from outside
public java.awt.Color[] colors   = new java.awt.Color[0];  // palette
public int[]            icolor   = new int[0];        // icolor[f] = index into colors[]
public int[][]          edges    = new int[0][0];     // edges[e] = {v0, v1}; only filled by Stellation
public String[]         description;                  // null by default; comment block for writers
```

Notes that a port must preserve:

- `ifaces` is jagged; faces may have any vertex count ≥ 3 in practice. Across the 150
  shipped `.off` files the histogram is
  `{3: 2436, 4: 1821, 5: 1008, 6: 584, 8: 120, 10: 240}` — no 7- or 9-gons.
  `Stellation.getPolyhedron(int layer)` can emit
  `null` entries mid-array before compacting, and drops faces that collapse to zero
  distinct vertices.
- `edges` is **never** populated by `readOFF` (the OFF edge count is parsed and thrown
  away). Only `Stellation.getPolyhedron(SSCell[] scells)` fills it
  (`Stellation.java:719–725`), from the set of *boundary* edges after interior edges
  cancel pairwise.
- `description` is `null` unless `setDescription` was called; every writer null-checks it.
- The arrays are shared by reference with the producer. `Stellation.getPolyhedron` hands
  out the same `Vector3D` objects it holds internally — see §4.2 on `scale()`.

### 1.3 `Polyhedron` static fields (lines 25, 36–44)

```java
static final boolean DEBUG = true;                    // gates printf() tracing in writeSTL
public static boolean Debug = false;                  // unused
public static double  tolerance = Vector3D.tolerance; // == 1.0e-6; used by chop()
public static PrintStream Out = System.out;           // only used in writeToFile catch blocks

public static boolean outFaces    = true,
                      outEdges    = false,
                      outVertices = false,
                      outColor    = true;
```

**These four flags are `static`, i.e. global program state**, even though callers assign
them through an instance reference (`poly.outFaces = true;` in
`StellationController.doExport`, line 535 — legal Java, but it writes the static). Two
`Polyhedron` objects can never have different flags.

Who sets them:

| site | assignment |
|---|---|
| `StellationController.doExport` (lines 535–538) | `outFaces=true; outEdges=true; outVertices=true; outColor=false;` — **the GUI export path always uses this combination** |
| `StellationUI.main` (lines 196–198) | CLI `+Of/-Of`, `+Oe/-Oe`, `+Ov/-Ov` toggle `outFaces`/`outEdges`/`outVertices` (`'+'` → true) |
| `StellationUI.main` (line 323) | `poly.outColor = true;` before the `-Ol` layer dump |

What each flag actually does:

| flag | `writeVrml` | `writePOV` | `writeOFF` | `writeSTL` | `writeDXF` |
|---|---|---|---|---|---|
| `outFaces` | emits the `IndexedFaceSet` | emits `polygon{…}` per face | ignored | ignored | ignored |
| `outEdges` | emits the `PROTO Edge` block + one `Edge{}` per `edges[]` entry | emits `cylinder{…}`; if `edges.length == 0` falls back to *every face-side, so each shared edge twice* | ignored | ignored | ignored |
| `outVertices` | **never read** | only inside a commented-out block (lines 719–725) | ignored | ignored | ignored |
| `outColor` | **never read** — `writeVRMLIndexedFaceSet` hardcodes `diffuseColor 0.3 0.5 0.9` | only inside a commented-out block (lines 741–746) | ignored (`writeOFF` always writes RGB) | ignored | ignored |

So `outVertices` and `outColor` are dead in every live code path. Keep them in the port's
options object only if you want CLI parity; nothing reads them.

### 1.4 Colour representation

`colors[]` holds `java.awt.Color`. In the JSweet/JS build the shim is
`src/jsweet/java/awt/Color.java`: a single `int value` with `ARGB` layout,
`Color(int rgb)` forces `value = 0xff000000 | rgb`, and
`getRed()/getGreen()/getBlue()` are `(value >> 16/8/0) & 0xFF`.
`Color.getHSBColor(h,s,b)` in that shim **returns `null`** — so
`generateRandomColors` is broken in the JS build (§4.6).

`getColor(int face)` (lines 94–99):

```java
public java.awt.Color getColor(int face){
    if(icolor != null) return colors[icolor[face]];
    else               return java.awt.Color.lightGray;
}
```

The guard is wrong: `icolor` is initialised to a **zero-length array**, never `null`, so
the `lightGray` fallback is unreachable and `getColor` throws
`ArrayIndexOutOfBoundsException` whenever `icolor` or `colors` is empty. This is exactly
why `StellationUI.main` line 322 must call
`poly.generateRandomColors(poly.paintFacesByArea())` before `writeToFile(..., "OFF")` —
`Stellation.getPolyhedron(int layer)` leaves `icolor`/`colors` at their zero-length
defaults. In JS, make `getColor(f)` defensive:
`colors.length ? colors[icolor[f]] : LIGHT_GRAY` where `LIGHT_GRAY = rgb(192,192,192)`
in real AWT / `rgb(160,160,160)` in the JSweet shim (they differ — see §9).

---

## 2. Constants and tolerances (complete list for this file)

| name | value | file:line | used for |
|---|---|---|---|
| `Polyhedron.tolerance` | `1.0e-6` (aliases `Vector3D.tolerance`) | Polyhedron.java:37 | `chop()` snap-to-zero in all text writers |
| `Vector3D.tolerance` | `1.e-6` | Vector3D.java:256 | `Vector3D.equals`, `collinear` |
| `Vector3D.TOL` | `1.e-10` | Vector3D.java:288 | `Vector3D.chop` (used by `toString()`) **and** the degeneracy test in `rotateSet(Vector3D from, Vector3D to)`, Vector3D.java:235 |
| `Polyhedron.MINAREA` | `1.E-3` | Polyhedron.java:1115 | `isCollinerar(int[] face)` (dead code) |
| area-bucket tolerance | `0.001` | Polyhedron.java:450 | `findAreaColorIndex`: `Math.abs(d - a) < 0.001` |
| `STLWriter.SCALE` | `1000` | STLWriter.java:40 | metres → millimetres on STL export |
| `STLWriter.STL_HEADER_LENGTH` | `80` | STLWriter.java:38 | binary STL header |
| `StellationController.DEFAULT_EXPORT_LENGTH_UNIT` | `0.01` | StellationController.java:46 | `poly.scale(...)` before export |
| `Polyhedron.zeroes` | `"00000000000"` (11 chars) | Polyhedron.java:993 | zero-padding in `makeFileName` |

```java
static double chop(double x){                       // Polyhedron.java:646
    if(x > -tolerance && x < tolerance) return 0.0;
    else return x;
}
```
i.e. `Math.abs(x) < 1e-6 → 0.0`. Applied to every coordinate written by `writeOFF`,
`writeVrml`, `writePOV`, `writeDXF`, `printVertices`. **Not** applied by `writeSTL`.

---

## 3. OFF file format as this program actually reads and writes it

### 3.1 Shipped sample — `resources/images/off/u27.off` (icosahedron), verbatim head

```
OFF
# file generated by poly2vrml (author V.Bulatov@ic.ac.uk)
# polyhedron: #26 :icosahedron
12 20 30
 0.000000000000000  0.850650808352039  0.525731112119133 
 0.850650808352039  0.525731112119133 -0.000000000000000 
 ... (12 vertex lines total)
3 2 1 0 0.80 0.31 0.28
3 3 2 0 0.80 0.31 0.28
 ... (20 face lines total)
```

`d29.off` (rhombic triacontahedron): header `32 30 60`, faces `4 13 24 30 23 0.80 0.68 0.27`.
`u57.off` (great stellated dodecahedron): header `20 12 30`, faces
`5 2 7 4 1 0 0.81 0.47 0.66` — the 12 pentagram faces are stored as plain 5-gons whose
winding self-intersects.

Survey of all 150 shipped files (6209 faces): **every face line carries exactly three
trailing colour numbers**, all in `[0,1]`; 11 distinct triples exist across the whole set;
76 files use 1 colour, 51 use 2, 23 use 3. Ten of the eleven triples are written as `0.NN`
(two decimals); the eleventh is the bare integer triple `0 0 0` (80 faces), which is why
"always 2 decimals" is *not* a safe parsing assumption. No file uses scientific notation. All files
are pure-ASCII, LF-only line endings, and all end with a trailing newline (this last fact
is load-bearing — see the EOF hazard in §3.4).

Naming: `u<NN>.off` = uniform polyhedron, `d<NN>.off` = its dual; the comment on line 3
numbers them `#(NN−1)` (e.g. `u27.off` → `#26 :icosahedron`, `d29.off` →
`#28 :rhombic triacontahedron`). Thumbnails live in `resources/images/poly/<name>_tmb.gif`.
Loaded at runtime via `getClass().getResourceAsStream("/images/off/" + fname + ".off")`
(`StellationMain.readOffFile`, line ~779).

### 3.2 Tokenizer configuration (`readOFF`, lines 146–155)

```java
Reader r = new BufferedReader(new InputStreamReader(instr));
FixedStreamTokenizer stream = new FixedStreamTokenizer(r);
stream.parseNumbers();
stream.wordChars('F','O');
stream.eolIsSignificant(false);
stream.commentChar('#');
stream.whitespaceChars(0, ' ');   // explicit for JSweet; harmless in Java
```

`FixedStreamTokenizer`'s private no-arg ctor (lines 176–187) has already run:

```java
wordChars('a','z'); wordChars('A','Z'); wordChars(128+32, 255);
whitespaceChars(0, ' '); commentChar('/'); quoteChar('"'); quoteChar('\'');
// parseNumbers() deliberately NOT called: "original tokenizer don't parse
//  scientific notation correctly, so we stop it from parsing numbers" — VB
```

Resulting character classes when `readOFF` runs:

- whitespace: `0x00`–`0x20` (includes space, tab, CR, LF)
- digit-class (`CT_DIGIT`): `0`–`9`, `.`, `-`  ← note **no `+`, no `e`/`E`**
- alpha: `a`–`z`, `A`–`Z`, `0xA0`–`0xFF`
- comment: `#` **and `/`** (the `/` from the default ctor is never cleared)
- quote: `"` and `'` — a stray apostrophe in a comment is fine (comments are eaten first),
  but a stray quote in data would swallow the rest of the file up to the next one.

Token constants: `TT_EOF = -1`, `TT_EOL = '\n' = 10`, `TT_NUMBER = -2`, `TT_WORD = -3`.

### 3.3 The number lexer (`FixedStreamTokenizer.nextToken`, lines 557–593)

Exact algorithm — reimplement this, do **not** substitute `parseFloat`:

```
if c == '-':
    c = read()
    if c != '.' and not ('0' <= c <= '9'):  push back c; return ttype = '-'   // lone minus
    neg = true
v = 0; decexp = 0; seendot = 0
loop:
    if c == '.' and seendot == 0:  seendot = 1
    elif '0' <= c <= '9':          v = v*10 + (c - '0');  decexp += seendot
    else: break
    c = read()
peekc = c
if decexp != 0:
    denom = 10; decexp--
    while decexp > 0: denom *= 10; decexp--
    v = v / denom
nval = neg ? -v : v ;  return TT_NUMBER
```

Consequences:
- **No exponent support.** `1.5e-3` lexes as number `1.5` followed by the single word token
  `"e-3"` — *not* word `"e"` then number `-3`. The word loop (lines 595–612) continues
  while `(ctype & (CT_ALPHA | CT_DIGIT)) != 0`, and after `parseNumbers()` both `-` and the
  digits carry `CT_DIGIT`, so they are absorbed into the word.
- A second `.` terminates the number (`1.2.3` → `1.2` then `.3`).
- `+1.0` → ordinary char token `'+'` then number `1.0`.
- Accumulate-then-divide: `0.80` becomes `80 / 100`, which is bit-identical to `0.8` here,
  but for long mantissas this differs in the last ulp from `Double.parseDouble`. For the
  15-decimal coordinates in the shipped files the difference is at or below 1 ulp;
  irrelevant against `tolerance = 1e-6`, but note it if you diff coordinates bitwise.

### 3.4 `public void readOFF(InputStream instr)` — step by step (lines 142–223)

Whole body is wrapped in `try { … } catch (Exception e){ e.printStackTrace(System.err); }`.
**Any failure leaves the object half-built and reports nothing to the caller.**

**Step 1 — magic.**
```java
if(stream.nextToken() != TT_WORD || !stream.sval.equals("OFF"))
    throw new IOException("wrong header in OFF stream");
```
Case-sensitive, exact `"OFF"`. `COFF`/`NOFF`/`4OFF`/`STOFF` variants are rejected. (A file
starting with `#comment` before `OFF` works, because comments are consumed by the lexer.)

**Step 2 — counts.**
```java
while(stream.nextToken() != TT_NUMBER) ;      // skip comment lines / words
nvert  = (int)stream.nval;
stream.nextToken(); nfaces = (int)stream.nval;
stream.nextToken(); nedges = (int)stream.nval;
```
`nedges` is read and **discarded** — `this.edges` stays `new int[0][0]`.
Hazard: at EOF `nextToken()` returns `TT_EOF` forever, so the `while` spins forever on a
truncated file. Guard this in the port.

**Step 3 — vertices.** `eolIsSignificant` is still `false`, so newlines are whitespace and
the reader is purely token-stream-driven; the file need not put one vertex per line.
```java
vertices = new Vector3D[nvert];
for(num = 0; num < nvert; num++){
    stream.nextToken(); x = stream.nval;
    stream.nextToken(); y = stream.nval;
    stream.nextToken(); z = stream.nval;
    vertices[num] = new Vector3D(x,y,z);
}
```
No `ttype` check: a non-numeric token silently contributes the **previous** `nval`
(`nval` is not reset between tokens).

**Step 4 — faces + colours.**
```java
ifaces = new int[nfaces][];
icolor = new int[nfaces];
int fcolor = 0;
Vector color = new Vector();          // Vector<Integer>, packed 0xRRGGBB
stream.eolIsSignificant(true);        // <-- EOL becomes a token from here on
while(num < nfaces){
    while(stream.nextToken() != TT_NUMBER) ;        // (a) skip EOLs to the vertex count
    int nf = (int)stream.nval;
    int[] iface = new int[nf];  ifaces[num] = iface;
    for(int i=0; i < nf; i++){ stream.nextToken(); iface[i] = (int)stream.nval; }   // (b)
    fcolor = 0;                                                                     // (c)
    for(int i=0; i < 3; i++){
        if(stream.nextToken() != TT_NUMBER) break;
        fcolor <<= 8;
        int c = (stream.nval <= 1.0) ? (int)(255*stream.nval) : (int)(stream.nval);
        fcolor = (fcolor | (c & 0xFF));
    }
    icolor[num] = findOffColorIndex(color, fcolor);
    num++;
    while(stream.nextToken() != TT_EOL) ;           // (d) eat rest of line
}
colors = new java.awt.Color[color.size()];
for(int i=0; i < colors.length; i++)
    colors[i] = new java.awt.Color(((Integer)color.elementAt(i)).intValue());
```

**Colour rule (step c), spelled out.** For each of up to three numbers `t`:
```
c = (t <= 1.0) ? trunc(255 * t) : trunc(t)        // Java (int) cast = truncation toward zero
fcolor = (fcolor << 8) | (c & 0xFF)
```
Therefore with three numbers `fcolor = (R<<16) | (G<<8) | B`, and the packed int is
turned into a colour with alpha forced to `0xFF`.

Worked example, `u27.off` face `3 2 1 0 0.80 0.31 0.28`:
`255*0.80 = 204.0` (exact — the double is precisely 204) `→ 204`,
`255*0.31 = 79.05 → 79`, `255*0.28 = 71.4 → 71` ⇒ `0xCC4F47` ⇒ `rgb(204, 79, 71)`.
(The truncation, not float noise, is what loses the `.05`/`.4`; both products round-trip
to their short decimal form.)

The `<= 1.0` branch means an integer-valued colour of `0` or `1` is treated as a
*fraction*: `1 1 1` reads as `rgb(255,255,255)`, not `rgb(1,1,1)`. `2 2 2` reads as
`rgb(2,2,2)`. There is **no** RGBA support: a fourth component is skipped by step (d).

**Palette de-duplication** (`findOffColorIndex`, lines 128–137) is a linear scan for exact
`int` equality (`if(d - newcolor == 0) return i;`), appending on miss. So `colors[]` is in
**first-appearance order**, and `icolor[f]` indexes it. Cost is O(nfaces × ncolors); with
≤ 3 distinct colours per file that is fine.

**Two real bugs in step (c)/(d) that a faithful port must decide about:**

1. *Face line with no colour.* Step (c) immediately gets `TT_EOL` and breaks with
   `fcolor == 0` (black). Then step (d) `while(nextToken() != TT_EOL)` consumes the
   **entire next face line** and its EOL. The next iteration's step (a) then starts on the
   line after that. Net effect: on a colourless OFF file every other face is dropped and
   the face array is filled with garbage / the loop runs past EOF. None of the 150 shipped
   files trigger this (all have 3 colour columns), but any hand-written OFF will.
   **Recommendation for the JS port: fix this** (treat "no colour" as "inherit
   `lightGray`" and do not over-consume), and note the divergence.
2. *Missing final newline.* Step (d) loops until `TT_EOL`; at EOF `nextToken()` returns
   `TT_EOF` forever ⇒ infinite loop. All shipped files end with `\n`. Guard on `TT_EOF`.

Also note there is no bounds check on `iface[i]`: an out-of-range vertex index is stored
and only blows up later.

### 3.5 Recommended JS shape

```js
// returns {vertices: Float64Array|Array<{x,y,z}>, ifaces: int[][], colors: Uint32Array, icolor: Int32Array}
function readOFF(text) { … }   // tokenizer per §3.3, state machine per §3.4
```
A regex/`split(/\s+/)` tokenizer is *not* equivalent — it would accept exponents that the
original rejects and would not reproduce the `#`/`/` comment rules. Simplest faithful
route: strip `#…` and `/…` to end-of-line, then split on whitespace while tracking line
boundaries (needed because face colours are line-terminated).

---

## 4. Non-I/O methods

### 4.1 `public void setDescription(String[] description)` (lines 53–55)

```java
public void setDescription(String[] description){ this.description = description; }
```
Stores the reference; no copy, no null check. Every writer emits it as a comment block with
its own prefix: `writeOFF` → `#`, `writeVrml` → `#`, `writePOV` → `// `, `writeDXF` →
DXF group code `999`. `writeSTL` ignores it entirely (binary STL has no comment channel —
the 80-byte header is left as zeros).

Canonical content, from `StellationController.doExport` (lines 513–530):

```
polyhedron: <name>                       (or "polyhedron stellation generated from set of planes"
  symmetry: <m_polySymmetry> / <m_stellationSymmetry>       + "  planes: <…>" when unnamed)
  cells: <cells>
  exported from Stellation Program by Vladimir Bulatov
  http://bulatov.org/polyhedra/stellation_applet/index.html
```

### 4.2 `public void scale(double factor)` (lines 60–66)

```java
for(int i = 0; i < vertices.length; i++){
    vertices[i] = new Vector3D(vertices[i]);   // COPY first
    vertices[i].mulSet(factor);
}
```
The copy is essential and deliberate: `Stellation.getPolyhedron` hands out the *same*
`Vector3D` instances that live in its `SFace`/`SCell` graph, so scaling in place would
corrupt the stellation model. `ifaces` is untouched. Only used by
`StellationController.doExport` line 509: `poly.scale(m_exportLengthUnit)` with
`DEFAULT_EXPORT_LENGTH_UNIT = 0.01` (interpreted as metres, then STL multiplies by 1000 →
model of unit radius exports as a 10 mm-radius solid).

### 4.3 `public void makeCCW()` (lines 73–89)

Makes every face wind counter-clockwise **as seen from outside**, assuming the origin is
inside the solid.

```java
for(int f = 0; f < ifaces.length; f++){
    Vector3D center = new Vector3D(0,0,0);
    int iface[] = ifaces[f];
    for(int i = 0; i < iface.length; i++) center.addSet(vertices[iface[i]]);
    center.mulSet(1.0/iface.length);                                   // face centroid
    if(vertices[iface[0]].cross(vertices[iface[1]]).dot(center) < 0.0){ // wrong orientation
        for(int i = 0; i < iface.length/2; i++){                        // reverse in place
            int t = iface[i];
            iface[i] = iface[iface.length-1-i];
            iface[iface.length-1-i] = t;
        }
    }
}
```

Math: let `C = (1/n)·Σ vᵢ`. The test is **`(v₀ × v₁) · C < 0` ⇒ reverse**. Note it uses the
*absolute* position vectors `v₀`, `v₁` (not edge vectors) — this is the signed volume of
the tetrahedron `(O, v₀, v₁, C)` times 6. It is a single-term proxy for
`(Σᵢ vᵢ × vᵢ₊₁) · C`, valid only while the origin is comfortably interior. It fails when
`O`, `v₀`, `v₁` are collinear, or when the origin lies in/near the face plane. All shipped
`.off` files are origin-centred so it always works there.

`iface.length/2` is Java **integer division**; for odd `n` the middle index is correctly
left alone. Reversal mutates the `int[]` **in place** — aliased arrays elsewhere see the
change.

Call sites: always immediately after `readOFF`, never after a `Stellation.getPolyhedron`
(`StellationUI.main:252`, `StellationController.readFile:166`, `StellationMain.readOffFile:802`,
plus the test drivers `Driver.java:34`, `ExportData.java:131`, `ReferenceRender.java:38`).

### 4.4 `public double getRadius()` (lines 816–824)

`sqrt(max_i length2(vertices[i]))` — circumradius about the origin. Used only by
`writePOV` for `#declare PolyRadius`.

### 4.5 `public int getTriCount()` (lines 228–235)

`Σ_f (ifaces[f].length − 2)`. A degenerate face of length 2 contributes 0; length 1 or 0
would contribute a **negative** count and corrupt the STL header. Not guarded.

### 4.6 Colour helpers

```java
public void setColor(java.awt.Color color)              // lines 104–114 — DEAD (no caller)
public int  getColorIndex(int color){ return 0; }       // lines 119–122 — stub, "TO-DO"
public void generateRandomColors(int ncolors)           // lines 412–428
double faceArea(int face)                               // lines 433–442
int    findAreaColorIndex(Vector areas, double a)       // lines 447–455
public int paintFacesByArea()                           // lines 460–474
```

`generateRandomColors(n)`: picks `c = random()` then walks the hue wheel,
`colors[i] = Color.getHSBColor(c, 0.5f, 0.9f)`, `c += 1.0f/n`, wrapping at `1.0f`.
Fixed saturation `0.5`, brightness `0.9`. In JS: `hsl`/`hsv` with S=0.5, V=0.9.
**In the JSweet build `Color.getHSBColor` returns `null`**, so this path yields a palette
of nulls — a real port must implement HSB→RGB itself (standard `java.awt.Color.HSBtoRGB`).

`faceArea(f)` = `| ½ Σᵢ vᵢ × v₍ᵢ₊₁₎ mod n |` — the polygon area vector taken about the
origin, magnitude only. Correct for planar faces regardless of origin. (`getArea(int[])`
at line 1117 is the identical formula with a different signature; `isCollinerar` compares
it to `MINAREA = 1.E-3`. Both dead.)

`paintFacesByArea()`: buckets faces by area with tolerance `0.001`
(`Math.abs(d - a) < 0.001`, first-match wins), sorts the bucket list ascending with
`QSort.quickSort(areas, 0, areas.size()-1, new DoubleComparator())` (which delegates to a
merge sort over a copied array — `QSort.java:258`), then **recomputes every `icolor[i]`
against the sorted list**, so colour index 0 = smallest face. Returns the number of
distinct areas. Note the second pass re-runs `faceArea(i)` for every face — O(n²) overall.
Called as `poly.generateRandomColors(poly.paintFacesByArea())`.

### 4.7 File-name helpers

```java
public static String getPostfix(String type)            // "Vrml2"→".wrl", "OFF"→".off", "POV"→".inc", else ""
public static String makeFileName(String prefix, String type, int n, int maxn)
static String zeroes = "00000000000";
```
`makeFileName`: when `maxn > 0`, left-pads `n` with zeros to the decimal width of `maxn`
(`prefix + zeroes.substring(0, len(str(maxn)) - len(str(n))) + str(n) + ext`); otherwise
`prefix + n + ext`. Throws if `n` has more digits than `maxn`, or if the padding exceeds
11 characters.

`writeToFile(String fname, String ftype)` (instance, lines 964–980) and the static twin
(942–958) dispatch on `ftype` ∈ `{"Vrml2", "POV", "OFF"}` — note **`STL` and `DXF` are not
reachable through `writeToFile`**; those two only exist on the `doExport` path, which
dispatches on `{"POVRAY","VRML","STL","DXF"}`. Two different type-name vocabularies.
Exceptions are swallowed into `e.printStackTrace(Out)`.

### 4.8 Dead code (no *live* call sites — safe to drop from the port)

`setColor`, `getColorIndex`, `_getCoordinates`, `getVrmlString`, `clearDoubleVertices`,
`addPoly`, `isCollinerar`, `printFaceCenters` (empty), `printEdges` (empty),
`printEdgeCenters` (empty), and the commented-out `getIndexedFaceSet` / `main`.

Three of these are not literally uncalled — they are reachable only from other dead code,
so the whole cluster drops together:
`findVertex` ← `clearDoubleVertices` (line 804) ← `addPoly` (line 836);
`getArea(int[])` ← `isCollinerar` (line 1130).
`getVrmlColors` (line 544) and `countIndex` (line 524) are referenced *only* inside the
commented-out `getIndexedFaceSet`.
`printVertices(PrintStream)` is live (called by `StellationMain.readOffFile`).

---

## 5. Number formatting used by the text writers (`pvs.utils.Fmt`)

Every text writer routes coordinates through `Fmt.fmt(double d, int minWidth, int sigFigs)`
= `pad(sigFigFix(doubleToString(d), sigFigs), minWidth)`. Reproduce it or your files will
not diff-match the originals.

- `Fmt.doubleToString(d)` re-derives up to 16 digits by repeated
  `dig = (int)(frac/p); frac -= dig*p; p /= 10` starting from `p = 10^exp`, then chops
  trailing zeros and a trailing `.`; a final `(int)(frac/p + 0.5) == 1` triggers a
  carry-propagating round-up.
- `Fmt.sigFigFix(s, n)` **truncates** (the source literally says `// Round?` where the
  rounding would go) the fraction so that `numFigs + fracFigs == n`, or right-pads with
  `'0'` when there are too few figures.
- Leading-zero handling has a latent Java bug: the guard
  `if ((numFigs == 0 || number.equals("0")) && fracFigs > 0)` compares a **`StringBuffer`
  to a `String`**, which is always `false`. Consequence: the leading `0` of `0.xxx` counts
  as a significant figure, so `fmt(x, 18, 15)` yields **14** decimals for values in `(0,1)`.
  A JS port that "fixes" this will produce 15 decimals and differ from the original.
- `pad` is right-justify with spaces to `minWidth`; if the string is already longer it is
  returned unchanged.

Simulated outputs (verified against the algorithm, not against a JVM — no JRE on this box):

| value | `writeOFF` `(18,15)` | `writeVrml` `(8,6)` | `writePOV` `(18,16)` | `printVertices` `(19,16)` |
|---|---|---|---|---|
| `0.850650808352039` | `  0.85065080835203` | ` 0.85065` | ` 0.850650808352039` | `  0.850650808352039` |
| `-0.850650808352040` | ` -0.85065080835204` | `-0.85065` | `-0.850650808352040` | ` -0.850650808352040` |
| `0.0` | `  0.00000000000000` | ` 0.00000` | ` 0.000000000000000` | `  0.000000000000000` |
| `1.0` | `  1.00000000000000` | ` 1.00000` | ` 1.000000000000000` | `  1.000000000000000` |
| `123456.789` | `  123456.789000000` | `  123456` | ` 123456.7890000000` | `  123456.7890000000` |

`writeDXF` does **not** use `Fmt`; it uses `PrintStream.print(double)` = Java
`Double.toString` (shortest round-tripping form, may emit `E` notation for
|x| ≥ 1e7 or < 1e-3).

---

## 6. Export writers

### 6.1 `public void writeSTL(OutputStream out) throws IOException` (lines 240–255)

**The most important writer for a JS port.** Binary STL, little-endian.

```java
int tcount = getTriCount();
STLWriter writer = new STLWriter(out, tcount);
for(int i = 0; i < ifaces.length; i++){
    int[] iface = ifaces[i];
    for(int j = 0; j < iface.length-2; j++)
        writer.addTri(vertices[iface[0]], vertices[iface[j+1]], vertices[iface[j+2]]);
}
```

- **Triangulation is a naive fan from vertex 0**: `(v[0], v[j+1], v[j+2])` for
  `j = 0 … n-3`. Correct only for convex, planar faces. Stellation cells are convex, so it
  holds there; a self-intersecting pentagram face (as in `u57.off`) fans into overlapping
  triangles.
- `writer.close()` is **never called**. That is safe only because the
  `STLWriter(OutputStream, int)` constructor writes the header *and* the count eagerly and
  sets `triCountWritten = true`. The caller (`StellationController.doExport`) closes the
  wrapping `PrintStream`, which flushes.
- Nothing is written for `edges`; `outFaces`/`outColor` are ignored — STL has no colour.

Byte layout produced by `STLWriter` (STLWriter.java:95–207):

```
offset 0    : 80 bytes, all 0x00           (static byte[80] STLHeader, never filled in)
offset 80   : uint32 LE triangleCount      (== getTriCount())
then per triangle, 50 bytes:
   float32 LE nx, ny, nz     ← always 0.0, 0.0, 0.0  (defaultNormal = new Vector3D(0,0,0))
   float32 LE v0.x*1000, v0.y*1000, v0.z*1000
   float32 LE v1.x*1000, v1.y*1000, v1.z*1000
   float32 LE v2.x*1000, v2.y*1000, v2.z*1000
   uint16  LE 0                            ← attribute byte count
```
Total file size = `84 + 50 * N`.

`SCALE = 1000` converts metres to millimetres. Combined with
`poly.scale(0.01)` in `doExport`, a unit-radius model becomes a 10 mm-radius STL.

The zero normal is intentional (`defaultNormal`); most slicers recompute from winding, and
winding is CCW-from-outside because `makeCCW`/`Stellation` guarantee it. **If your JS
target needs real normals, compute `normalize(cross(v1−v0, v2−v0))` at write time** —
that is *not* what the Java does, so it is a deliberate divergence.

JS implementation sketch:

```js
function writeSTLBinary(poly, {scale = 1000} = {}) {
  const n = poly.ifaces.reduce((s, f) => s + f.length - 2, 0);
  const buf = new ArrayBuffer(84 + 50 * n);
  const dv  = new DataView(buf);
  dv.setUint32(80, n, true);                       // bytes 0..79 already zero
  let o = 84;
  const put = v => { dv.setFloat32(o, v.x*scale, true);  o += 4;
                     dv.setFloat32(o, v.y*scale, true);  o += 4;
                     dv.setFloat32(o, v.z*scale, true);  o += 4; };
  for (const f of poly.ifaces)
    for (let j = 0; j < f.length - 2; j++) {
      dv.setFloat32(o,0,true); dv.setFloat32(o+4,0,true); dv.setFloat32(o+8,0,true); o += 12;
      put(poly.vertices[f[0]]); put(poly.vertices[f[j+1]]); put(poly.vertices[f[j+2]]);
      dv.setUint16(o, 0, true); o += 2;
    }
  return new Blob([buf], {type: 'model/stl'});
}
```

**OBJ export (not in the Java, but the obvious JS sibling):** OBJ keeps n-gons, so emit
`v x y z` per vertex and `f i+1 j+1 …` per face (OBJ is 1-based) and you avoid the
fan-triangulation artefacts entirely; per-face colour would need an `.mtl` with one
`newmtl` per entry of `colors[]` and a `usemtl` before each face group.

### 6.2 `public void writeVrml(PrintStream out)` (lines 565–604) + `writeVRMLIndexedFaceSet` (606–644)

Emits VRML 97 / VRML 2.0. Exact structure:

```
#VRML V2.0 utf8
#<description[0]>                                  (only if description != null)
…
NavigationInfo {
	type "EXAMINE"
	headlight TRUE
}
<VRMLEdge[] block>                                  (only if outEdges — see below)
PROTO Piece [
]{
Group {
 children [
<IndexedFaceSet Shape>                              (only if outFaces)
Edge{start  x  y  z end  x  y  z }                  (one per edges[i], only if outEdges)
…
]
}
}
Piece{}
```

The `Shape` block, verbatim in structure:

```
Shape {
  geometry IndexedFaceSet {
    solid TRUE
    creaseAngle 0
    coord Coordinate {
      point[
       <x> <y> <z>            ← Fmt.fmt(chop(v), 8, 6), 6-space indent, space separated
      ]
    }
    coordIndex [
      i0 i1 i2 … -1           ← one line per face, indices space-separated, "-1" terminator
    ]
  }
  appearance Appearance {
    material Material{
      diffuseColor 0.3 0.5 0.9
    }
  }
}
```

Key facts for the port:

- **No per-face colour is ever written.** `colors`, `icolor` and `outColor` are ignored;
  the whole solid is `diffuseColor 0.3 0.5 0.9`. The colour-capable code
  (`getVrmlColors()` and `getIndexedFaceSet()`) is dead/commented out. If the JS viewer
  should show `icolor`, that is new behaviour, not a port.
- `solid TRUE` + `creaseAngle 0` ⇒ back-face culling on, flat shading.
- `outEdges` emits the `VRMLEdge[]` preamble (42 string entries, lines 1032–1073): a
  `Background {skyColor 1 1 1}` plus a `PROTO Edge` whose `Script` node builds a `Cylinder`
  between `start` and `end` in ECMAScript at initialize time
  (`field SFFloat radius 0.01`, `diffuseColor 0.6 0.4 0.4`). It then emits one `Edge{}` per
  entry of `edges[]`. If `edges` is `null` this NPEs; if it is empty (the `readOFF` case)
  you get the PROTO with no instances.
- Coordinates use `Fmt.fmt(chop(x), 8, 6)` — 5 decimals for values in `(0,1)`, so VRML
  output is the lowest-precision of all the writers.
- `getVrmlString()` (lines 555–560) renders the same thing into a `String` via
  `ByteArrayOutputStream`; no callers.

### 6.3 `public void writePOV(PrintStream out)` (lines 679–779)

POV-Ray 3.1 include file (`getPostfix("POV") == ".inc"`).

```
// <description[i]>                            (prefix "// ")
<POVStart[] — 25 lines, verbatim from lines 1077–1101>
#declare PolyRadius = <getRadius()>;           ← raw Double.toString + ";"
#declare V0 = < x, y, z>;                      ← Fmt.fmt(chop(v), 18, 16)
…
polygon {<n+1>,V<i0>,V<i1>,…,V<i(n-1)>,V<i0> texture{TextureF}}     (per face, if outFaces)
cylinder{V<a>,V<b>,RadiusE open texture {TextureE}}                 (per edge, if outEdges)
<POVEnd[] — 7 lines, lines 1105–1111>
```

`POVStart` fixes the scene: `#version 3.1`, `assumed_gamma 1.0`, a camera at
`<0.01, 0.01, -3.0>` with `direction 1.5*z` / `right 4/3*x`, white background, three
coloured lights (pure R at `<0,10,-10>`, pure G at `<7,-5,-10>`, pure B at `<-7,-5,-10>`),
`#declare FinF = finish {reflection 0 ambient 0.2 diffuse 0.8 phong 0.1 metallic 0}`,
`#declare TextureE` (dark edge texture), `#declare TextureF = texture{pigment{color rgb <1 1 1>}finish{FinF}}`,
`#declare RadiusE = 0.01;`, then `#declare Polyhedron = union {`.
`POVEnd` closes the union and emits `object { Polyhedron scale 1/PolyRadius rotate <0 0 0> no_shadow }`
— i.e. the model is normalised to unit circumradius at render time.

Note the polygon vertex count is `iface.length + 1` because the first vertex is repeated to
close the loop (POV-Ray requires that). Per-face colours are commented out; every face gets
`TextureF`. When `outEdges` is set and `edges.length == 0`, it falls back to emitting a
cylinder for **every side of every face**, i.e. each shared edge twice.

### 6.4 `public void writeOFF(OutputStream out)` (lines 260–295)

```
OFF
#<description[i]>                    ← comments come AFTER the magic line
<nvert> <nfaces> <edges.length or 0>
<x> <y> <z>                          ← Fmt.fmt(chop(v),18,15), fields joined by " ", println on z
…
<n> <i0> <i1> … <i(n-1)> <R> <G> <B> ← note a trailing space after every index; RGB are ints 0..255
```

`R/G/B` come from `getColor(i).getRed()/getGreen()/getBlue()` — so this **round-trips
through `readOFF` only approximately**: `readOFF` maps `0.80 → 204` on the way in, and
`writeOFF` writes `204` back out, which `readOFF` then reads as `204 > 1.0 → 204`. Stable
after one round trip, but the shipped fractional style is not reproduced.
`writeOFF` will throw if `colors` is empty (see §1.4).

### 6.5 `public void writeDXF(OutputStream out)` (lines 377–392, helpers 301–372)

AutoCAD R11/R12 (`AC1009`) DXF containing only `3DFACE` entities on layer `0`.

```
999
<description[i]>                     (one 999 group per line, before the header)
<DXFHeader — HEADER/$ACADVER=AC1009, TABLES with a single LAYER "poly" CONTINUOUS,
             empty BLOCKS, then "0 SECTION 2 ENTITIES">
<one 3DFACE per face>
<DXFTail — "0 ENDSEC 0 EOF">
```

Per-face emission (`writeDXFFace`):
- `n == 3` → `writeDXFTriangle(v0,v1,v2)`: groups `10/20/30`, `11/21/31`, `12/22/32`,
  `13/23/33` where the 4th corner **repeats `v0`** (degenerate DXF triangle convention).
- `n == 4` → `writeDXFQuadrangle(v0,v1,v2,v3)`.
- `n > 4`  → one quad on `(v0,v1,v2,v3)` then a triangle fan
  `(v0, v[i-1], v[i])` for `i = 4 … n-1`. Together this tiles the polygon exactly once.
- `n < 3`  → emits nothing.

Every entity is prefixed `0\n3DFACE\n8\n0\n` (group 8 = layer `"0"`, note: **not** the
`"poly"` layer that the header defines). Coordinates via raw `Double.toString(chop(x))`.
No colours, no `outFaces`/`outEdges` gating.

---

## 7. Where a `Polyhedron` comes from and goes

```
.off resource ──readOFF──▶ Polyhedron ──makeCCW──▶ makePolyhedronPlanes()
                                                        │  Stellation.getPlane(poly, f):
                                                        │    n = normalize((v2−v1) × (v0−v1))
                                                        │    d = n · v1        → plane vector n*d
                                                        ▼
                                              Stellation(planes, symmetry, maxIntersection)
                                                        │
                                      getPolyhedron(SSCell[] cells)   ← the export path
                                                        ▼
                             Polyhedron{vertices, ifaces, icolor∈{0,1}, colors=2, edges}
                                                        │
                        scale(0.01) → setDescription(...) → writePOV/writeVrml/writeSTL/writeDXF
```

`Stellation.getPolyhedron(SSCell[])` (Stellation.java:593–728) is the only producer that
fills `edges` and it colours faces by orientation only:

```java
poly.icolor[fcounter] = (findex == topindex) ? 1 : 0;
poly.colors = makeTopBottomColors();           // Stellation.java:887
//   col[1] = new Color(216, 216, 25);         // (int)(0.85*255), (int)(0.85*255), (int)(0.1*255)
//   col[0] = new Color(242, 102, 51);         // (int)(0.95*255), (int)(0.4*255),  (int)(0.2*255)
```

so `colors.length == 2` always: index 1 = "top" faces (yellow `#D8D819`), index 0 =
"bottom" faces (orange `#F26633`). Bottom faces have their vertex order reversed on the way
into `ifaces` (`iface[iface.length-1-v] = …`) so all faces end up CCW-from-outside without
needing `makeCCW`.

`Stellation.getPolyhedron(int layer)` (line 286) leaves `colors`/`icolor` at their
zero-length defaults — callers must run `generateRandomColors(paintFacesByArea())` first.

---

## 8. JS PORTING NOTES

**Static mutable state.** `outFaces / outEdges / outVertices / outColor / tolerance /
Out / Debug` are `static`, and `StellationController` writes them through an *instance*
reference (`poly.outFaces = true;`). In JS put them in an explicit options object passed to
each writer; do not attach them to the instance, or you will silently change behaviour for
concurrently-live models. The only real shared-mutable hazard in `STLWriter` is
`static byte buffer2[]` (STLWriter.java:63), rewritten by every `writeInt2` call;
`static byte buffer[]` (line 37) is declared but never referenced anywhere, and
`static final byte STLHeader[]` (line 42) is only ever *read* (it stays all-zero). Use a
fresh `DataView` per export anyway.

**`Vector` / `Hashtable`.** `readOFF` uses `java.util.Vector<Integer>` with a linear
`findOffColorIndex` scan; `addPoly` uses `java.util.Hashtable<VectorIndex,VectorIndex>`.
`Hashtable` rejects null keys/values and is synchronized; `Vector` is `Array` plus locking.
Straight `Array` / `Map` ports are fine **except** for the hashing identity below.

**`hashCode` / `equals` identity.** `Vector3D.equals` is tolerant (`1e-6` per component)
while `Vector3D.hashCode` is an exact quantization
`(int)(331345.563*x) + (int)(412345.891*y) + (int)(71341.678*z)` with 32-bit wraparound and
truncation-toward-zero. A JS `Map` keyed on an object uses reference identity and will
behave differently. If you must reproduce hash-bucket behaviour, key on the string
`` `${(331345.563*x)|0},${(412345.891*y)|0},${(71341.678*z)|0}` `` — but note `|0` is
32-bit truncation-toward-zero, same as Java's `(int)` cast, only for `|value| < 2^31`.
Also: `Vector3D.hashCode()` computes `value` and returns it **without assigning the
`hashCode` cache field**, so the cache never takes effect. Mirror that (or just don't
cache) rather than "fixing" it.

**Integer division and casts.** `iface.length/2` in `makeCCW`, `1.0/iface.length` (that one
is float because of the `1.0`), `(int)stream.nval`, `(int)(255*stream.nval)`. Java `(int)`
truncates toward zero; JS needs `Math.trunc`, **not** `Math.floor` (they differ for
negatives, and negative vertex indices in a malformed file would diverge). `|0` also
truncates toward zero but silently wraps beyond 32 bits.

**float vs double.** All geometry is `double`. The only `float` narrowing is in
`STLWriter.writeFloat` (`Float.floatToRawIntBits((float)dvalue)`) — JS
`DataView.setFloat32` does the same IEEE-754 round-to-nearest narrowing, so STL matches
bit-for-bit. `getVrmlColors()` returns `float[][]` but is dead code.

**`StreamTokenizer` quirks.** See §3.3. Reimplement the lexer; do not reach for
`parseFloat`. Specific traps: no exponent/`+` support (and `1.5e-3` yields number `1.5`
plus the *single* word `"e-3"`, because `-` and digits are `CT_DIGIT` and so continue a
word); `-` alone becomes a `'-'` token;
`.` and `-` are in the *digit* class so `wordChars` and comments interact oddly;
`'/'` remains a comment character alongside `'#'`; `'"'` and `'\''` remain quote characters;
at EOF `nextToken()` returns `TT_EOF` forever, so both `while(nextToken() != TT_NUMBER)`
and `while(nextToken() != TT_EOL)` in `readOFF` spin forever on truncated input — add EOF
guards. `TT_EOL` is `'\n'` = `10`, which is why `eolIsSignificant(true)` is toggled on only
for the face section.

**`java.awt.Color`.** In the real JDK `Color.lightGray` is `rgb(192,192,192)`; the JSweet
shim in this repo defines it as `rgb(160,160,160)` and returns `null` from
`getHSBColor(...)`. Decide which one you are reproducing and write it down. `Color(int)`
forces alpha `0xFF`; there is no alpha anywhere in the pipeline.

**Exception swallowing.** `readOFF`, both `writeToFile` overloads and `STLWriter.finalize`
catch `Exception` and only print a stack trace. Porting this as-is gives silent partial
loads. Prefer throwing and surfacing to the UI, and note the divergence.

**Number formatting.** `Fmt` is not `toFixed`. It truncates instead of rounding, counts the
leading `0` of `0.xxx` as a significant figure (because of the `StringBuffer.equals(String)`
bug), and left-pads with spaces to a minimum width. If byte-identical export files matter,
port `Fmt.doubleToString` + `Fmt.sigFigFix` verbatim; if not, `toFixed(14)` +
`padStart(18)` is a close-but-not-identical stand-in for the `(18,15)` case.

**`PrintStream.println`.** Emits the platform line separator; on the machines this was
written for that is `\n` (all shipped `.off` files are LF-only). Use `\n` explicitly.

**Binary output in the browser.** `writeSTL` writes to an `OutputStream`; in JS build one
`ArrayBuffer` of exactly `84 + 50*N` bytes and hand back a `Blob`. Everything is
little-endian (`true` as the third arg to every `DataView` setter).

---

## 9. UNCERTAIN

- **UNCERTAIN:** I could not execute the original Java to capture ground-truth output —
  `/usr/bin/java` on this machine is the macOS stub (`Unable to locate a Java Runtime`),
  so `stellation.jar` was not run. The `Fmt.fmt` outputs in §5 come from a faithful
  Python re-implementation of `Fmt.doubleToString` + `Fmt.sigFigFix`, not from a JVM. The
  digit-extraction loop uses floating-point division, so the last digit of a few values
  could differ from a real JVM. Verify against a JVM before claiming byte-identical export.
- **UNCERTAIN:** whether `Fmt.doubleToString`'s `"ROUNDMORE"` branch (Fmt.java:520–526,
  the author's own "I haven't found a test case yet") can ever fire for stellation
  coordinates. If it does, the output string contains the literal text `ROUNDMORE`.
- **UNCERTAIN:** exact `java.awt.Color.lightGray` value in effect at runtime. The desktop
  build uses the JDK's `rgb(192,192,192)`; the `src/jsweet` shim in this repo says
  `rgb(160,160,160)`. Which one shipped depends on the build target, and `getColor`'s
  fallback is unreachable anyway, so it may never matter.
- **UNCERTAIN:** whether any real-world OFF file consumed by this program lacks per-face
  colours. All 150 shipped files have exactly 3 colour columns on every face line, so the
  step-(d) line-over-consumption bug described in §3.4 is latent, not observed. I could not
  find a test corpus that exercises it.
- `Polyhedron.Out` (`public static PrintStream Out`) is only *read* in the two `writeToFile`
  catch blocks, but it **is** reassigned: `StellationMain.java:511` does
  `Polyhedron.Out = Output.out;`, so under the GUI it points at the app's own log stream,
  not `System.out`. `printFaceCenters`, `printEdges`, `printEdgeCenters` have empty bodies —
  presumably features that were never finished; nothing indicates intended output format.
- **UNCERTAIN:** `edges` semantics after `readOFF`. The OFF header's edge count is parsed
  and discarded and `edges` keeps its `new int[0][0]` default, so `writeOFF` on a
  freshly-read polyhedron writes `0` as the edge count. Whether the original author
  intended to reconstruct edges from faces is not recoverable from the source.
