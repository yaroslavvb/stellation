# Stellation, resurrected

### ▶ **[Open the app](https://yaroslavvb.github.io/stellation/)**

Vladimir Bulatov's **Stellation** program (1998–2001) was a Java applet. Applets are
gone, so this repository does two things:

1. **Runs the original Java again** on a modern machine — it still works, unchanged.
2. **Ports it to JavaScript**, so it runs in a browser with no plugin, and checks the
   port against the original number for number.

---

## What a stellation is

Take a pentagon and extend its five sides. They cross again, and the crossings outline
a five-pointed star. That is a stellation: *the same lines, followed further*.

In three dimensions you extend a polyhedron's face **planes** instead. The planes slice
space into small bounded regions — **cells** — arranged in shells, or **layers**, around
the original solid. Any choice of cells that respects the solid's symmetry is a
stellation of it. The icosahedron famously has 59.

---

## 1. Running the original Java

The original compiles and runs cleanly under a current JDK. On macOS:

```bash
brew install openjdk@11
```

Then, from the repository root:

```bash
JAVA_HOME=/opt/homebrew/opt/openjdk@11/libexec/openjdk.jdk/Contents/Home
export PATH="$JAVA_HOME/bin:$PATH"
mkdir -p bin
find src/main/java src/ui/java -name '*.java' > /tmp/srcs.txt
javac -nowarn -d bin -encoding UTF-8 @/tmp/srcs.txt
java -Xmx512M -cp "bin:resources" pvs.polyhedra.stellation.ui.StellationMain
```

That opens the original Swing/AWT application. Notes:

- **Use the source, not `stellation.jar`.** The checked-in jar is a 2017 build of an
  older tree (package `PVS`, uppercase) and does not match `src/`.
- `resources` must be on the classpath — the program loads polyhedra as classpath
  resources at `/images/off/<name>.off`.
- The `build.bash` / JSweet path in the upstream README transpiles the core to
  JavaScript but produces no visible UI, and depends on a `3.1.0-SNAPSHOT` transpiler
  from a third-party Maven repository. The port here does not use it.

### Headless drivers

Two small programs were added under `src/test/java/vbulatov/` to get at the
geometry without the GUI:

```bash
# print the cell structure and write meshes for the first few layers
java -cp "bin:resources" vbulatov.Driver u27 Ih I 1000

# render the stellation diagram and the solid to PNG, no display needed
java -Djava.awt.headless=true -cp "bin:resources" vbulatov.ReferenceRender u27 Ih I 2

# dump the symmetry tables, the catalog and all 150 polyhedra as JSON
java -cp "bin:resources" vbulatov.ExportData
```

---

## 2. The JavaScript port

Everything under `docs/` is a static site — no build step, no dependencies.

```bash
python3 -m http.server 8731 --directory docs
```

Then open <http://localhost:8731>.

### What it does

- Browse **121 polyhedra** in five categories, with the original thumbnails.
- A **Cells table** modelled on the Java window: one row per layer, numbered outward
  from the core, with a box per symmetric cell. A cell that splits into sub-cells (a
  chiral pair, say) is a shaded header followed by its sub-cell boxes. The coloured
  bars are the original's idea — one hue per *number of congruent pieces*, so cells
  of the same kind read alike across the whole table.
- See the **stellation diagram**: one face plane with every other face plane's trace
  drawn across it.
- See the **solid** in WebGL, coloured by layer so the shell structure is readable.
- **Saves as JSON**, in the SymmHub preset shape — the same
  `{name, appInfo:{appName, fileFormatRelease}, params:{…}}` envelope the other
  SymmHub apps write, with `par-YY-MM-DD-HH-MM-SS-mmm` document names. The
  original program's `.stel` files still open; one **Open…** button takes either.
- Export **STL**, **OBJ**, **OFF**, diagram **SVG**, **PNG**, and `.stel` for the
  Java program.
- Light and dark themes, following the system by default.
- Every state is in the URL, build depth included: `#u27/Ih/I/d20/{0,1,2}`.

### Choosing cells

The same three gestures work in the **Cells table**, on the **diagram**, and on the
**solid itself**:

| gesture | effect |
|---|---|
| click | toggle that cell (on the solid, plain drag orbits instead) |
| <kbd>shift</kbd>-click | add it *and everything supporting it* |
| <kbd>ctrl</kbd>/<kbd>cmd</kbd>-click | remove it *and everything resting on it* |

Both modified forms keep the selection **fully supported**, so what you get is always
a solid that holds together. The supporting set comes from the cell connectivity
graph — a port of `Stellation.makeConnectivityGraph` and `Selection.getSupportCells`,
built at the sub-cell level rather than the whole-cell level the original indexes by.

This is not a loose analogy to the original's behaviour: shift-clicking the chiral
cell `5(1[1])` of the icosahedron produces exactly `{0,1,2,3,4,5(1[1])}` — which is,
byte for byte, the selection stored in `samples/sample_02.stel`.

On the solid, <kbd>shift</kbd> grows outward from the face you point at and
<kbd>ctrl</kbd> carves away the cell just inside it; picking is done by ray-casting
the pointer against the mesh, so it is exact.

Clicking the same spot twice puts it back. That is not a plain toggle, because the
surface moves: grow at a face and the cell you just added *becomes* the surface
there, so the second click is pointing at a different face and would otherwise grow
again forever. The tell is that the cell you last toggled is now on the other side
of the face under the cursor — inside it if you grew, outside it if you carved —
and when that holds the click is treated as the same click and reverted, undoing
the exact set that changed rather than just the one cell.

### How it is organised

| file | what it holds |
|---|---|
| `docs/js/core.js` | the port: plane arrangement, layers, cells, symmetry orbits, connectivity graph, mesh extraction, `.stel` parsing |
| `docs/js/worker.js` | runs the build off the main thread with progress |
| `docs/js/render3d.js` | a small dependency-free WebGL2 renderer, with ray-cast picking |
| `docs/js/diagram.js` | the interactive 2D stellation diagram |
| `docs/js/cells.js` | the Cells table, a close port of the Java `Selection` canvas |
| `docs/js/preset.js` | JSON documents in the SymmHub shape, and reading `.stel` |
| `docs/js/app.js` | the UI |
| `docs/data/symmetry.json` | all 85 symmetry groups, **dumped from the Java** rather than re-derived |
| `docs/data/catalog.json` | the `PolyNames` catalog |
| `docs/data/geometry.json` | all 150 `.off` polyhedra |

The symmetry tables are exported from the original Java instead of being hand-ported.
`Symmetry.java` is 2300 lines of hardcoded matrices; transcribing them by hand would
have been the most likely place to introduce a silent error.

### How deep to build

Depth is the original's `maxintersection`: facets past that many half-spaces are
discarded. Set it too low and outer layers come out *empty*, which reads as a bug —
cells look disconnected because the shells that would join them were never built.
Set it too high and the densest solids take half a minute.

So it is chosen per polyhedron, from two things known before any work starts:

- **How close a plane passes to the centre.** A plane near the origin is cut by every
  other plane and shatters into thousands of facets. The duals of the hemi-polyhedra
  do exactly this — their plane distances span 80:1, against 1.0 for every
  well-behaved solid — and they are far and away the slowest to build.
- **How many planes there are.** 120 planes is heavy even when they all sit at the
  same distance.

Everything convex — the Platonic and Archimedean solids and their duals — comes out
at "every layer", complete and gapless, in under a second. Across all 121 catalogue
entries the median build is 270 ms, 103 have no truncated layers at all, and the
worst case is 4.5 s instead of 30. The slider overrides it.

### The algorithm

The heart of it, and the reason the port is small:

1. Each face gives a plane `n·x = d`.
2. For each plane, start with a huge polygon lying in it, then clip that polygon
   against the half-space of every other plane. Clipping splits polygons; each piece is
   a **facet**. A facet's **layer** is the number of planes it lies entirely outside of.
   That one counter is the whole depth structure.
3. Bucket facets by layer.
4. A cell at layer *L* is capped by facets of layer *L* and floored by facets of layer
   *L−1*; cells are grown by walking oriented shared edges.
5. Group cells into orbits of the symmetry group, then split each orbit by the
   stellation subgroup — that split is what exposes chirality.
6. Select cells; drop every facet shared by two selected cells; what remains is the
   surface of the stellation.

The original leans on Java reference identity (`vertexA == vertexB`) to know two facets
share a vertex, backed by a tolerance-matching hashtable. The port interns vertices into
integer ids through a spatial hash, so identity is integer equality — the same idea, but
it probes all 27 neighbouring grid cells instead of trusting a single hash bucket.

---

## 3. Is the port correct?

It is checked against the Java, not merely eyeballed.

```bash
node docs/test/validate.mjs   # 42 assertions against numbers the Java printed
node docs/test/samples.mjs    # the four .stel samples, round-tripped
node docs/test/sweep.mjs      # all 121 catalog entries, timing and failures
```

For the icosahedron under `Ih / I`, the port reproduces the Java exactly:

| | Java | JS |
|---|---|---|
| planes | 20 | 20 |
| facets per plane | 67 | 67 |
| total facets | 1340 | 1340 |
| layers | 8 | 8 |
| primitive cells per layer | 1, 20, 30, 60, 80, 132, 90, 60 | same |
| symmetric cells per layer | 1, 1, 1, 1, 2, 2, 2, 1 | same |
| layer volumes | 2.536151, 0.866453, 2.102924, 2.599358, 5.812340, 16.209771, 25.424714, 197.585371 | same to 6 dp |
| mesh, layers 0–1 | 32 v / 60 f | same |
| mesh, layers 0–2 | 62 v / 120 f | same |

and the sanity checks land where they should: the cube and the tetrahedron produce a
single facet each (neither has any stellation), the dodecahedron's first layer is the
small stellated dodecahedron (32 v / 60 f), and the icosahedron's is the triakis
icosahedron.

All four `.stel` samples decode and re-encode byte-identically, including
`{0,1,2,3,4,5(1[1])}` — which selects one hand of a chiral pair, and therefore only
round-trips if the cell ordering matches the original's comparator (fewest primitive
cells, then fewest facets, then fewest vertices, then smallest volume).

### Known differences

- **Chirality can be mirrored.** When an orbit splits into a mirror pair, both halves
  tie on every ordering key, so which one is `[0]` depends on hash iteration order — in
  the Java too. The port breaks the tie geometrically instead, so it is at least
  deterministic. A `.stel` file may therefore give you the mirror image of what the Java
  showed. Both are correct stellations.
- **Depth is capped by default.** The `plane depth` control maps to the original's
  `maxintersection`. Full depth on the densest duals takes ~30 s; depth 12 is the
  default and is exact for every Platonic and Archimedean solid.
- **Unimplemented symmetry groups are hidden.** `Symmetry.getMatrices` returns nothing
  for `C8`–`C12` and their variants in the original; the UI does not offer them.

---

## 4. Where the pieces came from

- everything outside `docs/` and `notes/` is the upstream repository unchanged, apart
  from the three driver classes added under `src/test/java/vbulatov/`.
- `notes/` — nine detailed specs reverse-engineered from the Java source, covering the
  plane arrangement, cells and layers, symmetry, polyhedron I/O, mesh extraction, the
  diagram, the UI, the `.stel` grammar, and the catalog.
- `notes/reference/` — renders produced by the Java itself, used to check the port.

Original program and all the polyhedron data: **Vladimir Bulatov**,
<http://bulatov.org/polyhedra/stellation_applet/>. The applet also credits Jef
Poskanzer (Fmt), Darius Bacon (expression parser), the JAMA team, and Paul Prants.
