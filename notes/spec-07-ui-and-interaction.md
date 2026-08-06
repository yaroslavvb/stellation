# Spec 07 — UI and Interaction

Reverse-engineered from the Java source so the workflow can be reproduced faithfully in a
browser (Canvas/WebGL) port.

## 0. Source files this spec is derived from

| Path (relative to repo root `stellation/`) | Lines | Role |
|---|---|---|
| `src/ui/java/pvs/polyhedra/stellation/ui/StellationMain.java` | 1687 | Main window, menus, event routing, all four top-level frames |
| `src/ui/java/pvs/polyhedra/stellation/ui/SelectionPanel.java` | 758 | "Cells" window chrome: cell-name text field, Set/Clear, info line, scrollbars, cell-notation grammar |
| `src/ui/java/pvs/polyhedra/stellation/ui/Selection.java` | 820 | "Cells" window canvas: layer/cell/subcell grid, painting, mouse selection, support-set computation |
| `src/ui/java/pvs/polyhedra/stellation/ui/DlgSelectPoly.java` | 421 | Modal polyhedron picker (thumbnail grid) |
| `src/ui/java/pvs/polyhedra/stellation/ui/DlgPlanes.java` | 513 | Modal "Make Planes" dialog (user-defined generating planes) |
| `src/ui/java/pvs/polyhedra/stellation/ui/DlgPrint.java` | 415 | Modal print/tiling dialog for the diagram |
| `src/ui/java/pvs/polyhedra/stellation/ui/AboutDialog.java` | 113 | About box (unreachable from the menu bar — see §13.4) |
| `src/ui/java/pvs/polyhedra/ui/StellationUI.java` | 332 | `showStellationDiagram()`, `makeStellationName()`, plus a headless CLI `main` |
| `src/ui/java/pvs/polyhedra/ui/StellationCanvas.java` | 1423 | Diagram window: 2D viewport, zoom/pan/rotate, picking, popup menu |
| `src/ui/java/pvs/g3d/ui/Canvas3D.java` | 1048 | 3D window: trackball, inertia, zoom, stereo/anaglyph modes, picking |
| `src/ui/java/pvs/g3d/ui/Panel3D.java` | 14 | **Empty stub** — `class Panel3D extends Panel { Canvas3D canvas; }`. Nothing else. Ignore. |
| `src/main/java/pvs/g3d/Model3D.java` | 598 | Base renderer: transform, painter's-algorithm z-sort, 3-light shading |
| `src/main/java/pvs/g3d/Stellation3D.java` | 515 | Renderer subclass: plane-partition depth ordering, picking, per-normal shading |
| `src/main/java/pvs/g3d/Matrix3D.java` | ~240 | 3×4 row-major transform, `transform(double[],int[],n)` |
| `src/main/java/pvs/polyhedra/stellation/StellationController.java` | 592 | Headless model (already JSweet-transpiled) |
| `src/main/java/pvs/polyhedra/stellation/PolyNames.java` | 304 | Catalog of 5 categories / 121 polyhedra |
| `src/ui/java/pvs/utils/ui/Graphics2D.java` | 445 | World↔screen mapping used by the diagram canvas |

---

## 1. Top-level application state

`StellationMain` is a plain object (not a `Frame` subclass) that owns everything.
Fields that matter for the port:

```java
private StellationController controller;      // headless model (already ported to JS)

static final int SOURCE_POLY = 1, SOURCE_PLANES = 2;
int m_source = SOURCE_POLY;                   // where the generating planes come from
String polyhedronName;                        // e.g. "icosahedron"

int currentCategory = 0;                      // index into PolyNames.categories
int currentPoly = 3;                          // index within the category -> u27, icosahedron

int[][] cellsIndex;                           // last selection reported by the Cells panel
int[][] cellIndex = new int[0][0];            // *currently displayed* selection; each row = {layer, subcellIndexInLayer}
Model3D model3D = null;
String stellationPath = NEW_FILE;             // "stellation.stel" -- but the constructor
                                              // immediately overwrites it with the -i argument

int vertexUp = 0;                             // which vertex of the reference face points +Y in the diagram
int faceToShow = 0;                           // which face plane's diagram is displayed

boolean viewCells = true, viewOutput = true, viewDiagram = true, m_view3D = true;

static final String NEW_FILE = "stellation.stel";
final static String EXT_STEL = ".stel";
final static String EXT_BAK  = ".bak";
static final String START = "Start!";
static final String STOP  = "Stop!";
static String MakeStellation = "Start";
static final String LASTDIR_PROPERTY = "lastDir";
static final double DEFAULT_EXPORT_LENGTH_UNIT = 0.01;   // metres per model unit, used on export
static final int THUMB_SIZE = 400;                       // saved PNG thumbnail is 400x400
Font m_font = new Font("Helvetica", Font.PLAIN, 12);      // applied recursively to every component
```

Note `cellIndex` and `cellsIndex` are two different fields with confusingly similar names.
`cellIndex` is the authoritative "currently shown" selection (written by `showDiagram`, read by
the Face and Vertex Up listeners); `cellsIndex` is a stale copy written only in the
`who == selection` branch of `update()`. The other two branches of `update()` declare a *local*
`int[][] cellsIndex` that shadows the field, so the field is never updated from the diagram or
3D-view selection paths.

`save()` decides whether to divert to `saveAs()` with `stellationPath == NEW_FILE` — **reference**
identity against the interned constant, not `.equals()`. That is only ever true after
`doMakePlanes()` assigns the constant; at startup `stellationPath` is the `-i` argument, so the
first `Save` writes to `<that path>.stel` without prompting.

---

## 2. Window layout

Five independent AWT top-level windows. `screen = Toolkit.getDefaultToolkit().getScreenSize()`.

| Window | Title | Position / size (from source) |
|---|---|---|
| Main | `getFileName()` — the basename of `stellationPath`. The constructor does `this.stellationPath = fname` **before** building the frame, so with the default CLI args the initial title is `"u27.off"`, *not* `"stellation.stel"` (the `NEW_FILE` field initialiser is overwritten immediately) | `m_mainFrame.setPreferredSize(new Dimension(300,300)); pack()`. No explicit location → top-left. |
| Cells | `"Cells"` | `setBounds(screen.width - screen.height, 0, screen.height/2, screen.height/2)` |
| 3D view | `"3D view"` | `setBounds(screen.width - screen.height/2, 0, screen.height/2, screen.height/2)` |
| Diagram | `"Diagram"` | `setBounds(screen.width - screen.height/2, screen.height/2, screen.height/2, screen.height/2 - 30)` |
| Output | `"output"` (the `WindowOutputStream` frame is created titled `"Debug Output"` and renamed) | `setLocation(0, screen.height/2); setSize(screen.width - screen.height/2, screen.height/2 - 30)` |

On a 1920×1080 screen that is: Cells at (840,0) 540×540; 3D at (1380,0) 540×540;
Diagram at (1380,540) 540×510; Output at (0,540) 1380×510; Main at (0,0) 300×300.

All four secondary frames get `frameClosingListener` (a `FrameClosingListener`): closing a
secondary window hides it and unticks the matching **View** checkbox; it does not destroy it.
`WindowListenerClass` on the main frame:
- `windowClosing` → `doQuit()` → dispose all five frames then `System.exit(0)`.
- `windowIconified` → hide all four secondary frames.
- `windowDeiconified` → show them again according to `m_view3D / viewCells / viewOutput / viewDiagram`.

**Port note:** in a browser these become four resizable/dockable panes. The relative sizing
(each roughly a half-screen square) is worth keeping because the diagram and 3D views assume
a near-square aspect (see `initViewport` in §9.3 and `mindiameter` in §10.2).

---

## 3. Menu bar (exact structure)

Built by `MenuBar makeMenuBar()`. Labels are verbatim.

```
File
 ├ Open...                       -> onOpen()
 ├ Save                          -> save()
 ├ Save As...                    -> saveAs()
 ├ Export ▸                      (submenu, added in this order)
 │   ├ STL                       -> doExport("STL")
 │   ├ VRML                      -> doExport("VRML")
 │   ├ Povray                    -> doExport("POVRAY")
 │   └ DXF                       -> doExport("DXF")
 ├ ──────────
 ├ Make Planes                   -> doMakePlanes()
 ├ Print Connectivity Graph      -> controller.printConnectivityGraph()
 ├ ──────────
 ├ Select Polyhedron             -> OnSelectPolyhedron
 ├ Print Diagram                 -> PrintDiagram
 ├ Print 3D Model                -> Print3DModel
 ├ ──────────
 ├ Vector Calculator             -> new VectorCalculator().show()
 ├ Polygon Display               -> new PolygonDisplay().show()
 ├ ──────────
 └ Quit                          -> doQuit()

Edit
 ├ Undo                          -> selection.doUndo()
 └ Clear All                     -> selection.doClearAll()

View            (all four are CheckboxMenuItem, all initially checked)
 ├ Diagram                       -> toggles frameDiagram visibility
 ├ 3D                            -> toggles m_frame3D visibility
 ├ Cells                         -> toggles frameSelection visibility
 └ Output                        -> toggles frameOutput visibility
```

Declared but **never added** to any menu: `miPrefereces` ("Preferences"), and the dead
`createMenu()` method which would have built a File/Help menu with "Load..."/"Quit"/"About...".
There is therefore **no Help menu and no reachable About item** (see §13.4).

Menu dispatch is by label string comparison inside `MenuDispatcher.actionPerformed`:

```java
String what = e.getActionCommand();
if(what.equals(miOpen.getLabel()))            onOpen();
else if(what.equals("Quit"))                  doQuit();
else if(what.equals("About..."))              doAbout();          // unreachable
else if(what.equals(miSaveAsSTL.getLabel()))  doExport("STL");
...
else if(what.equals("Stop"))                  stopStellationThread();   // never matches, see §14.1
else if(what.equals(MakeStellation))          startStellationThread(""); // "Start"
```

---

## 4. Main window contents

Layout is `GridBagLayout` via `WindowUtils.constrain(container, comp, gx, gy, gw, gh, fill, anchor, wx, wy [,left,top,right,bottom])`.
Top to bottom (grid column 0, rows 0..3):

**Row 0 — `polyInfo`** (two sub-panels side by side)
- left (`polyInfo_1`): `LabelBitmap polyImage` — an 80×80 `Canvas` showing
  `/images/poly/<fname>_tmb.gif` (150 GIFs exist in `resources/images/poly/`), or
  `/images/stellation_main.jpg` when the source is user planes.
- right (`polyInfo_2`), four rows, each `HORIZONTAL`:
  - `Label polyInfoFaces`    — `"faces:    " + polyhedron.ifaces.length`
  - `Label polyInfoVertices` — `"vertices: " + polyhedron.vertices.length`
  - `Label polyInfoSymmetry` — `"symmetry: " + controller.getPolySymmetry()`
  - `Button btnSelectPoly` labelled **"Select..."** → same handler as menu *Select Polyhedron*

  (In the `SOURCE_PLANES` branch the three labels are repurposed:
  `"faces:    " + polyhedronPlanes.length`, `"symmetry: " + polySymmetry`, `""`.)

**Row 1 — `panel_1`**: `TextField tfPolyName` (20 columns), set to the polyhedron name or
`"user defined planes"`. It is *display only* — no listener is attached.

**Row 2 — `panel_2`**: three labelled `Choice` drop-downs, font `Serif BOLD 16`:

| Label | Control | Contents | Listener effect |
|---|---|---|---|
| `"Symmetry "` | `choice_symmetry` | `Symmetry.getSubgroups(controller.getPolySymmetry())` | `controller.createSubcells(symm); initSubcells();` — re-splits every cell into symmetry orbits and rebuilds the Cells grid |
| `"Face "` | `choice_face` | initially `"0".."9"`; replaced by `controller.getNonEquivalentFaces()` after each stellation build; **disabled** if there is only one non-equivalent face | `faceToShow = parseInt(item); showDiagram(cellIndex);` |
| `"Vertex Up"` | `choice_vertexUp` | `"0".."9"` (fixed) | `vertexUp = parseInt(item); showDiagram(cellIndex);` |

**Row 3 — `buttons`**: `GridLayout(1,2,5,5)` containing only `btnStart` (initially labelled
`"Start"`). `btnTest`/`btnTest1` exist with listeners but the `buttons.add(...)` calls for them
are commented out.

**Not laid out at all:** `TextField tfMaxLayer = new TextField(5)` is constructed and read by
the worker thread but never added to a container, so it always reads `""` →
`Integer.valueOf("")` throws → `mi = 0` → `maxLayer` stays at the controller default `1000`.
A JS port should expose this as a real "max layers" input.

---

## 5. Startup and the core workflow

### 5.1 Boot

```java
public static void main(String args[]){
    String fname = "off/u27.off";
    String stellationSymmetry = "I";
    // -i <file>  -y <symmetry>
    new StellationMain(fname, stellationSymmetry);
}
```

**`-i <file>` does not choose the polyhedron.** `StellationController(fname, stellationSymmetry)`
stores only `m_stellationSymmetry` and ignores `fname` completely (its body is: assign the
symmetry, print the JVM vendor/version). The polyhedron that actually gets loaded comes from
`currentCategory = 0, currentPoly = 3` → `u27` via `PolyNames`, regardless of `-i`. All `-i` does
is set `stellationPath`, hence the main-window title and the initial `Save` target.

Constructor order:
1. `this.stellationPath = fname`; `controller = new StellationController(fname, stellationSymmetry)`
2. `m_mainFrame = new Frame(getFileName())`; icon = `/images/stellation_main.jpg`;
   `addWindowListener(new WindowListenerClass())`
3. `createUI()` — starts with `setFont(m_mainFrame, m_font)`, then builds everything above, plus:
   - `initializePoly(false)` (loads `u27.off` from the classpath, thumbnail, plane set)
   - `choice_symmetry.select(getSymmetryIndex(controller.getStellationSymmetry()))`
   - `m_mainFrame.setMenuBar(makeMenuBar())`
   - `createSelectionFrame()` — Cells window, immediately visible
   - `createOutputStream()` — Output window; **`Output.out` and `Polyhedron.Out` are rebound to
     this window's `PrintStream`** (static mutable global — see §16)
   - `setFont(m_mainFrame, m_font)` recursively
4. `pack()`, `setVisible(true)`
5. `startStellationThread(null)`

The Diagram and 3D frames do **not** exist yet — they are created lazily inside
`showDiagram()` / `showModel()` on the first stellation.

### 5.2 `initializePoly(boolean forceInit)`

```java
case SOURCE_POLY:
    polyhedronName = polyNames.name(currentCategory, currentPoly);
    String fname   = polyNames.fname(currentCategory, currentPoly);   // e.g. "u27"
    polyImage.setImage(loadImageFromJar("/images/poly/"+fname+"_tmb.gif"));
    Polyhedron polyhedron = readOffFile(fname);        // "/images/off/"+fname+".off"
    if (forceInit) {
        String symm = polyNames.symmetry(currentCategory, currentPoly);  // e.g. "Ih"
        controller.setSymmetry(symm + "/" + symm);      // poly symmetry / stellation symmetry
    }
    initSymmetryUI();
    controller.initPolyPlanes(polyhedron);
    // three info labels + tfPolyName
```

`forceInit == true` only when the user picks a polyhedron from `DlgSelectPoly`. That is what
resets the stellation symmetry to the polyhedron's full symmetry group.

`readOffFile` reads the classpath resource `/images/off/<fname>.off`, calls
`poly.readOFF(stream)` then `poly.makeCCW()` then `poly.printVertices(Output.out)`.

### 5.3 The stellation worker

```java
public void startStellationThread(String cellsToSet){
    thread = new Thread(new StellationThread(cellsToSet));
    thread.setPriority(Thread.MIN_PRIORITY);
    thread.start();
}

class StellationThread implements Runnable {
    public void run(){
        btnStart.setLabel(STOP);                       // "Stop!"
        int mi = 0;
        try { mi = Integer.valueOf(tfMaxLayer.getText()).intValue(); } catch (Exception e){}
        controller.createStellation(mi);               // heavy: plane arrangement + cells
        initSubcells();
        btnStart.setLabel(START);                      // "Start!"
        if (cellsToSet != null) selection.setCells(cellsToSet);
        m_canvas3D.doFit();
    }
}
```

`stopStellationThread()` calls the deprecated `Thread.stop()`. In JS the equivalent is a
Web Worker with a cancellation flag or `worker.terminate()`.

### 5.4 `initSubcells()` — the bridge from model to UI

```java
void initSubcells(){
    controller.initSubcells();                                    // makeSubcells + connectivity graph
    selection.setArray(controller.getAllCells(), controller.getSubcells());
    showDiagram(new int[0][0]);                                   // empty selection
    diagram.init();                                               // recompute diagram extent + zoom
    choice_face.removeAll();
    Integer[] findex = controller.getNonEquivalentFaces();
    if (findex != null) {
        if (findex.length > 1) { for each -> choice_face.addItem(f.toString()); choice_face.setEnabled(true); }
        else                    choice_face.setEnabled(false);
    }
}
```

### 5.5 `showDiagram(int[][] st)` — the single redraw entry point

Every selection change funnels through here.

```java
void showDiagram(int[][] st){
    cellIndex = st;
    Stellation stellation = controller.getStellation();
    SSCell[] cells = stellation.getStellation(controller.getSubcells(), st);   // st[i] = {layer, indexInSubcellLayer}
    Object[][] facets = Stellation.getStellationDiagram(cells, faceToShow);
    if (stellation.getFaces().length == 0) { println("Can't make stellation!"); return; }
    Stellation.Diagram diagramData =
        stellation.createDiagram(faceToShow, vertexUp, controller.getStellationSymmetry(), facets);
    diagram = StellationUI.showStellationDiagram(diagramData,
                  StellationUI.makeStellationName(st), diagram);
    if (frameDiagram == null) {  // first time only: create frame, wire observer, set bounds/title/icon }
    showModel(cells);
}
```

`getStellationDiagram(cells, pindex)` returns `Object[n][2]` where `[i][0]` is an `SFace` lying
in plane `pindex` and `[i][1]` is `Integer(1)` for a *top* facet or `Integer(0)` for a *bottom*
facet. Facets that appear as both top and bottom (interior, cancelled) are removed from the hash
table entirely. `createDiagram` copies those facets into `Diagram.faces`, stamping
`face.layer = 0 or 1`, and copies the **full** set of facets of plane `findex` into
`Diagram.ffaces` (the clickable outline mesh), plus `Diagram.axes` and `Diagram.planes`
(symmetry axes / mirror lines intersected with the face plane), then translates the reference
facet's centre to the origin, rotates the face normal onto +Z, and rotates
`face.vertices[vertexUp]` onto +Y.

Two details of `createDiagram` that a port must copy exactly:
- The **reference facet** is `ffaces[index]` where `index` minimises `getCenter().length2()` —
  the facet of plane `findex` whose centre is closest to the model origin. (The alternative
  "lowest `layer`" rule is present but commented out.) Its normal is recomputed as
  `(v1-v0) × (v2-v1)` normalised, *not* taken from the plane.
- The vertex-up rotation is guarded: `if (vertexUp < face.vertices.length)`. When the Vertex Up
  choice (fixed items `"0".."9"`, §4) exceeds the reference facet's vertex count, **no** second
  rotation happens at all — the diagram simply keeps the normal-to-+Z orientation rather than
  erroring.

**Consequence for the diagram colouring:** `levels` only ever has indices 0 and 1 —
0 = bottom facets, 1 = top facets. See §9.4.

### 5.6 `showModel(SSCell[] cells)` — build and hand off the 3D model

```java
controller.setCurrentCells(cells);
Polyhedron poly = controller.getStellation().getPolyhedron(cells);
double[] vert = flatten(poly.vertices);                 // xyz triples
int[][] faces = poly.ifaces mapped so faces[i][j] = poly.ifaces[i][j] * 3;   // BYTE-OFFSET indices!
int[][] edges = new int[0][2];                          // *** edges deliberately empty ***
model3D = new pvs.g3d.Stellation3D(vert, faces, edges, poly.colors, poly.icolor,
                                   controller.getStellationSymmetry(),
                                   controller.getPolyhedronPlanes());
if (m_canvas3D == null) { create Frame "3D view", new Canvas3D(model3D), setObserver(this), setBounds, show }
m_canvas3D.setModel(model3D);
```

Two things to carry over: **vertex indices are pre-multiplied by 3** everywhere in `pvs.g3d`
(they index into the flat coordinate array), and the *edge* list is intentionally empty —
the 3D view draws face outlines instead (see §10.4).

### 5.7 The user's actual click-path

1. **File ▸ Select Polyhedron** (or the **Select...** button) → modal thumbnail grid → pick →
   `initializePoly(true)` → `startStellationThread(null)`.
   Alternatively **File ▸ Make Planes** to define a generating plane set by hand.
2. Wait for the worker. When it finishes: the **Cells** grid is populated, the **Diagram**
   window opens (empty selection), and the **3D view** opens showing an empty/degenerate model,
   auto-fitted by `doFit()`.
3. Optionally change **Symmetry** (re-groups cells into orbits), **Face** (which face plane's
   diagram is shown), **Vertex Up** (diagram orientation).
4. Select cells by any of three equivalent routes — Cells grid, Diagram canvas, or 3D view
   (§7, §9.5, §10.5). Every route ends in `Selection.modifySelection(...)` →
   `StellationMain.showDiagram(...)` → diagram + 3D refreshed together.
5. Type or paste a cell string into the Cells window's text field and press **Set**
   to jump to an exact selection (§8).
6. **Edit ▸ Undo** steps back one selection; **Edit ▸ Clear All** empties it.
7. **File ▸ Save / Save As...** writes a `.stel` file plus a 400×400 PNG thumbnail;
   **File ▸ Export ▸ …** writes STL/VRML/POV/DXF plus a thumbnail.

---

## 6. Observer plumbing

Everything is routed through `pvs.utils.PVSObserver`:

```java
public interface PVSObserver { void update(Object who, Object what); PolygonDisplayNode findNode(String nodeID); }
```

`StellationMain.update(Object who, Object what)` demultiplexes on `who`:

| `who` | `what` | Action |
|---|---|---|
| `selection` (the Cells panel) | `int[][]` cell list | `cellsIndex = what; showDiagram(cellsIndex);` |
| `m_canvas3D` | `Object[]{ double[3] center, Integer modifiers, double[3] normal, double[3] vertex }` | see §10.5 |
| anything else (the diagram canvas) | `int[2] { facetIndex, action }` | see §9.5 |

---

## 7. The "Cells" window

Two classes: `SelectionPanel` (chrome) wrapping `Selection extends Canvas` (the grid).

### 7.1 `SelectionPanel` layout

```
row 0: cpanel   (gridwidth 3, BOTH, weight 1/1, insets 2)   -> [ Selection canvas | sbVertical ]
                                                               [ sbHorizontal                  ]
row 1: infoField  (TextField, background lightGray, gridwidth 3, HORIZONTAL)
row 2: [ cellField (TextField, HORIZONTAL, weightx 1) ] [ Button "Set" ] [ Button "Clear" ]
```

Scrollbars are **added and removed dynamically** by `adjustScrollbars()`, called from a
`ComponentListener` on `cpanel`:

```java
if (canvas.preferedWidth > d.width) {
    sbHorizontal.setMaximum(canvas.preferedWidth);
    sbHorizontal.setVisibleAmount(d.width);
    sbHorizontal.setUnitIncrement(canvas.gridX);
    sbHorizontal.setBlockIncrement(10*canvas.gridX);
    // add at cpanel (0,2) HORIZONTAL
}
// same for vertical with preferedHeight / gridY / 10*gridY at cpanel (1,1) VERTICAL
```
Scrollbar value `x` → `canvas.setOffsetX(-x)`; value `y` → `canvas.setOffsetY(-y)`.
`sbMaximum = sbVisible = 100000` are the initial (meaningless) constructor values.

**Buttons**
- `"Set"` → `doParseCells()`: reads `cellField` (empty ⇒ `"{}"`), `parseCells_v2`,
  `canvas.setSelectedSubCells(index)`, then `main.update(this, canvas.getCells())`.
- `"Clear"` → `doClearAll()`: `canvas.clearAll()`, `cellField.setText("")`,
  `main.update(this, canvas.getCells())`.

**Undo** (`Edit ▸ Undo` → `SelectionPanel.doUndo()`):
`initCellField()` pushes the *previous* `cellField` text onto `Vector cellHistory` before
writing the new one. `doUndo()` pops the last entry, writes it into `cellField`, and calls
`doParseCells()`. It is a plain stack of strings; there is no redo.

**Info line** (`infoField`), driven by `CanvasMouseMotion.mouseMoved` — updated only when the
hovered `(layer, column)` changes, and the cursor becomes `HAND_CURSOR` over a live cell:

```java
if (ssc.superCell != null)
    info = layer + "(" + lay.indexOf(ssc.superCell) + "[" + getIndex(ssc.superCell.subCells, ssc) + "]), "
                 + ssc.getCellsCount() + " elem. cells";
else
    info = layer + "(" + lay.indexOf(ssc) + "), " + ssc.getCellsCount() + " elem. cells";
info += "[" + ssc.getNFacets() + "," + ssc.getNVertices() + "," + Fmt.fmt(ssc.getVolume(),6,8) + "]";
```

### 7.2 `Selection` — data model of the grid

```java
Vector allcells;                                  // per layer: Vector<SSCell>  (symmetry-full cells)
Vector subcells;                                  // per layer: Vector<SSCell>  (flattened orbits)
SelectionCell[][]   selection;        // [layer][visual column]     — includes group-header columns
SelectionCell[][]   selectableCells;  // [layer][selectable index]  — subcells only, no headers
SelectionCell[][][] selectableSubCells; // [layer][cellInLayer][subcellInCell]
int offsetX = 0, offsetY = 0;
int preferedWidth = 100, preferedHeight = 100;
int gridX = 10, gridY = 10;                       // recomputed in init()
```

`SelectionCell` (`pvs/polyhedra/stellation/SelectionCell.java`) is 3 fields:
`int isSelected; SSCell cell; int index;` plus `setSelected/getSelected/getIndex/invertSelection`
(`isSelected = 1 - isSelected`).

`init()` builds all three arrays in one pass over `allcells`:

```java
for each layer l:
  for each SSCell ssc in layer:
    if (ssc.subCells.length > 1)  layerlen += ssc.subCells.length + 1;  // +1 for the header column
    else                          layerlen += 1;
    selcellLen += ssc.subCells.length or 1;
  ...
  // header column holds  new SelectionCell(ssc, 0)          -> .cell.subCells != null
  // each subcell column  new SelectionCell(ssc.subCells[s], scount)
```

The discriminator used by the mouse handler is `sc.cell.subCells != null`: only *group headers*
have it non-null, because `Stellation.makeSymmetricalSubCells` sets `subCells` on the parent
only and the children keep the default `null`.

Metrics:

```java
FontMetrics fm = getFontMetrics(font);            // font = SansSerif BOLD 16
gridY = fontHeight + yspace;                      // 16 + 8 = 24
gridX = fm.charWidth('W') + xspace;               // typically 14..17 + 8
preferedHeight = gridY * selection.length;
preferedWidth  = gridX * (maxColumnsAcrossLayers + 3);
```

Constants: `fontHeight=16`, `fontHeightSub=12`, `fontHeightSub3=10`,
`yspace = xspace = 8`, `ypad = xpad = 2`, `xpad2 = 4`,
`symCellColor = new Color(230,230,255)`.
`static Color[] color = { white, new Color(192,192,192) }` is declared but **never used**.

### 7.3 `Selection.paint(Graphics)` — pixel-exact layout

Renders into an off-screen `memImage` re-created whenever the canvas size changes; the whole
canvas is filled white first. For layer `i`, with `y = 1 + offsetY + i*gridY`:

```java
x  = 1 + offsetX;  xg = x;
yg = (i+1)*gridY - yspace - 2 + offsetY;        // text baseline

// layer number box: 2 grid columns wide
g.setColor(black); g.setFont(font);
g.drawRect(x+1, y, 2*gridX-3, gridY);
g.drawString(Fmt.fmt(i,3), xg+4, yg+3);
xg += 2*gridX;

for each SSCell cell (index j) in allcells[i]:
  groupsize = cell.subCells.length;  xs = xg;

  if (groupsize > 1) {                          // ---- group header + subcells ----
     fill  symCellColor  at (xs+xpad-1, y+ypad-1, gridX-xpad2-1, gridY-2*ypad-1);
     draw  gray rect     at (xs+xpad-2, y+ypad-2, gridX-xpad2,   gridY-2*ypad);
     draw  String(j) in BOLD 16 at (xg + (1-digit ? 5 : 1), yg+3);
     fill  gray 3x3 at (xs+gridX-3, y+gridY/2-4) and (xs+gridX-3, y+gridY/2+2);   // "«" grip dots
     for k in 0..groupsize-1 {
        if (selected) fill lightGray (xs+gridX+xpad-1, y+ypad-2, gridX-xpad2-1, gridY-2*ypad);
        else          draw lightGray (xs+gridX+xpad-2, y+ypad-2, gridX-xpad2,   gridY-2*ypad);
        fill getOutlineColor(cell.subCells[k]) at (xs+xpad+gridX-2, y+ypad-2, gridX-xpad2+1, 3);  // top bar
        font = (String(k).length()==3) ? fontSub3 : fontSub;
        disp = {1 digit:6, 2 digits:3, 3 digits:1};
        drawString(String(k), xs+gridX+disp, yg+3);
        xs += gridX;
     }
     fill getOutlineColor(cell) at (xg+gridX+xpad-2, y+gridY-ypad-3, gridX*groupsize-xpad2+1, 3);  // group bar
     xg += (groupsize+1)*gridX;
  } else {                                       // ---- single cell ----
     if (selected) fill lightGray (xs+xpad-1, y+ypad-2, gridX-xpad2-1, gridY-2*ypad);
     draw String(j) in black;
     draw gray rect (xs+xpad-2, y+ypad-2, gridX-xpad2, gridY-2*ypad);
     fill getOutlineColor(cell) at (xg+xpad-2, y+gridY-ypad-3, gridX-xpad2+1, 3);
     xg += gridX;
  }
y += gridY;
```

`update(Graphics g)` sets the colour to `lightGray` and immediately calls `paint(g)` — i.e. no
background clear; the double buffer handles it.

### 7.4 Cell colour coding (`makeColors` / `getOutlineColor`)

The little 3-pixel bars encode **orbit size** = `SSCell.cells.length` (number of elementary
`SCell`s in the cell).

```java
Color[] makeColors(){
    // collect the distinct values of cell.cells.length over every SSCell in allcells
    int ncolors  = number of distinct values;
    int maxcolor = largest value;
    Color[] colors = new Color[maxcolor+1];
    // mark used slots, then, walking i ascending over used slots:
    colors[i] = Color.getHSBColor(hue = ccount/(float)ncolors, saturation = 0.8f, brightness = 0.9f);
    ccount++;
}

Color getOutlineColor(SSCell cell){
    int index = cell.cells.length;
    if (colors[index] == null) {                     // interpolate between the nearest used slots
        indbottom = greatest used i < index, else 0;
        indtop    = least  used i > index, else colors.length-1;
        len = indtop - indbottom;  c1 = index - indbottom;  c2 = indtop - index;
        red   = (c1*ctop.getRed()   + c2*cbot.getRed())  /len;   // integer division
        green = (c1*ctop.getGreen() + c2*cbot.getGreen())/len;
        blue  = (c1*ctop.getBlue()  + c2*cbot.getBlue()) /len;
        colors[index] = new Color(red,green,blue);   // memoised
    }
    return colors[index];
}
```

### 7.5 Mouse on the cells grid

Hit test:

```java
int[] getCellUnderMouse(int x, int y){
    int xg = ((x - offsetX)/gridX) - 2;     // -2 and -1 land in the layer-number box
    int yg = ((y - offsetY)/gridY);
    if (yg >= 0 && yg < selection.length && xg >= -2 && xg < selection[yg].length)
        return new int[]{yg, xg};
    return null;
}
```

`MouseListenerClass.mousePressed` (note: *pressed*, not clicked):

```
xg >= 0  (a real column)
  sc = selection[yg][xg];   ssc = sc.cell
  if (ssc.subCells != null)                                  // GROUP HEADER column
      if (ctrl || shift)
          asupp = union over c of getSupportCells(yg, selection[yg][xg+1+c].getIndex())
          processSelection(asupp, ctrl, shift)
      else
          for i in 0..subCells.length-1: selection[yg][xg+1+i].invertSelection()
  else                                                        // ordinary subcell column
      if (ctrl || shift)
          processSelection(getSupportCells(yg, selection[yg][xg].getIndex()), ctrl, shift)
      else
          selection[yg][xg].setSelected(1 - selection[yg][xg].getSelected())
  repaint(); updateObserver();

xg < 0   (the layer-number box) — whole-layer operation, skipping group headers
  if (shift)  for all i with selection[yg][i].cell.subCells == null: setSelected(1)
  else        for all i with selection[yg][i].cell.subCells == null: invertSelection()
  updateObserver(); repaint();
```

Modifier semantics inside `processSelection(int[][] supp, boolean ctrl, boolean shift)`:

| Modifier | Effect on every cell in the support set |
|---|---|
| Shift + Ctrl | `setSelected(0)` — clear |
| Shift        | `setSelected(1)` — add |
| Ctrl         | `invertSelection()` — toggle |
| (none)       | plain toggle of the single clicked cell (no support set) |

`getSupportCells(layer, index)` computes the transitive **downward** closure — every cell that
the given cell rests on, so the result is a "fully supported" (physically buildable) set:

```java
int[][] cells = new int[layer+1][];               // cells[l][i] = 0/1
for l: cells[l] = new int[selectableCells[l].length];
cells[layer][index] = 1;
for (int lay = layer; lay > 0; lay--)
    for (int ind = 0; ind < cells[lay].length; ind++)
        if (cells[lay][ind] == 1)
            for each SSCell bcell in selectableCells[lay][ind].cell.bottom
                cells[bcell.layer][bcell.index] = 1;
```

`getCells()` flattens the selection back to `int[count][2]` rows `{layer, selectableIndex}`.
It makes two passes over `selectableCells`: the first sums `getSelected()` to size the array,
the second writes `cells[count] = {i, j}` **inside** `if (selectableCells[i][j].getSelected() == 1)`
and then advances with `count += getSelected()` (outside the `if`). Note `cells[count][1]` is the
*flat* index `j` into `selectableCells[i]`, not `selectableCells[i][j].getIndex()` — the source line
that would have used `getIndex()` is commented out. (They coincide, because `init()` assigns
`scount` in the same order.)

---

## 8. The cell-notation string (the "cells" field and the `.stel` file)

This is the app's shareable identifier for a stellation. Version 2 grammar (v1 exists as
`makeStellationName_v1` / `parseCells` and is dead code).

### 8.1 Writer — `SelectionPanel.makeStellationName_v2(SelectionCell[][][] index)`

```
name   := '{' layers '}'
layers := ( layerIndex [ layerBody ] [','] )*
```

Exact algorithm:

```java
sb.append('{');  boolean needComma = false;
for i in 0..index.length-1:
    String layer = writeLayer_v2(index[i]);
    if (layer.equals("()")) continue;             // empty layer -> omitted entirely
    if (needComma) sb.append(',');
    sb.append(i);
    if (layer.equals("(*)")) needComma = true;    // fully selected layer: index only, comma after
    else { sb.append(layer); needComma = false; } // partial layer: no comma after
sb.append('}');
```

```java
static String writeLayer_v2(SelectionCell[][] index){
    sb.append('(');
    for i: String s = writeCell_v2(index[i]);
        if (s.equals("[]")) { hasEmptyCells = true; continue; }
        if (needComma) sb.append(',');
        sb.append(i);
        if (s.equals("[*]")) needComma = true;
        else { hasPartialCells = true; sb.append(s); needComma = false; }
    sb.append(')');
    return (!hasEmptyCells && !hasPartialCells) ? "(*)" : sb.toString();
}

static String writeCell_v2(SelectionCell[] index){
    sb.append('[');
    if (no unselected subcell) sb.append('*');
    else list the selected subcell indices, comma separated;
    sb.append(']');
}
```

Real examples from `samples/`:

```
{0}                              layer 0 fully selected
{0,1,2,3,4,5(1[1])}              layers 0..4 full; layer 5: cell 1, subcell 1 only
{0,1,2,3,4,5,6(2,3)7(3[1])}      layers 0..5 full; layer 6: cells 2 and 3 fully;
                                 layer 7: cell 3, subcell 1
```

Note that a *partial* layer is **not** followed by a comma (`...6(2,3)7(3[1])`).

### 8.2 Reader — `SelectionPanel.parseCells_v2(String cells, SelectionCell[][][] ind)`

Tokenised with `new StringTokenizer(cells, "(),-{}[]", true)` (delimiters returned as tokens).
Returns `int[layer][cell][subcell]` of 0/1.

```
parseCells_v2:
   expect "{" (else throw "wrong start of cell: '<tok>'")
   loop: tok = next
         if "}"          -> done
         if !isNumber    -> throw "wrong expression of layer: '<tok>'"
         layer = int(tok); range-check -> "layer number: N is out of bounds"
         tok = parseLayer_v2(...)
         if "}"          -> done

parseLayer_v2(layer):
   tok = next
   if "," or "}"  -> mark the WHOLE layer selected (all cells, all subcells) and return tok
   if != "("      -> throw "illegal start of cell: '<tok>' in layer N"
   loop: tok = next
         if ")"       -> return ")"
         if !isNumber -> throw "illegal cell expression '<tok>' in layer N"
         cell = int(tok); range-check
         last = parseCell_v2(...); if last == ")" return ")"

parseCell_v2(layer, cell):
   tok = next
   if "," or ")"  -> mark the WHOLE cell selected and return tok
   if != "["      -> throw "illegal start of subcell: '<tok>' in layer N cell M"
   loop: tok = next
         if "]"       -> return "]"
         if ","       -> skip
         if !isNumber -> throw "illegal cell expression: '<tok>' in layer N"
         index[layer][cell][int(tok)] = 1
```

`isNumber(str)` returns true iff every char is `'0'..'9'` — so **the empty string returns true**.
The `'-'` delimiter is still in the tokenizer's delimiter set but v2 never uses ranges (v1 did:
`3-7`).

**Two different error paths — do not conflate them.** All the `throw` statements above throw
`new Throwable(...)`, and `Throwable` is *not* an `Exception`, so the inner
`catch(Exception e){ e.printStackTrace(); }` inside `parseCells_v2` does **not** catch them. A
grammar error therefore propagates out of `parseCells_v2` to `doParseCells()`'s
`catch(Throwable ex){ ex.printStackTrace(Output.out); }`, which means
`canvas.setSelectedSubCells(index)` and `main.update(...)` never run and **the selection is left
untouched**. Only incidental *runtime* exceptions — `NumberFormatException` from
`Integer.valueOf`, `NoSuchElementException` when the tokens run out, `ArrayIndexOutOfBoundsException`
from `index[layer][cell][subcell] = 1` with an out-of-range subcell — are caught by the inner
handler, and only those cause the partially-filled index to be returned and applied.

### 8.3 Short display name — `StellationUI.makeStellationName(int[][] stellation)`

Used only as the initial Diagram window title (it is overwritten with `"Diagram"` immediately
afterwards, so it is effectively invisible).

```java
int layer = -1;
for each {l, index}:
    if (l != layer) { s.append(l); layer = l; }
    int offset  = index % 26;          // ('z'-'a'+1)
    int segment = index / 26;
    switch(segment){
      case 0: s.append((char)('a'+offset)); break;
      case 1: s.append((char)('A'+offset)); break;
      case 2: s.append('_');  s.append((char)('a'+offset)); break;
      case 3: s.append("__"); s.append((char)('A'+offset)); break;
      default: /* TO-DO, nothing is appended */
    }
```

---

## 9. The Diagram window (`StellationCanvas`)

A `Panel` containing a button strip, an inner `SCanvas`, and two scrollbars.

### 9.1 Controls (left to right in the button strip)

| Control | Type | Behaviour |
|---|---|---|
| `"Sym. Lines"` | `Checkbox`, default `false` | toggles `drawSymmetryLines`. **Only created if `axes != null`.** |
| `"Axes"` | `Checkbox`, default `false` | toggles `drawSymmetryAxes` |
| `"+"` / `"-"` | `Button` + `ZoomListener(ZOOM_TYPE_IN/OUT)` | press: `doZoom(initialZoom = 1.01)`. After `m_initialDelay = 300 ms` an autorepeat loop starts: `factor = Math.exp(zoomSpeed * 0.001*delayMs)` with `zoomSpeed = 1.5`; `doZoom` is called **twice per callback** (a copy-paste duplication in the source). Zoom out uses `1/factor`. |
| `"^" "v" "<" ">"` | `Button` + `PanListener(PAN_TYPE_UP/DOWN/LEFT/RIGHT)` | press: `doPan(clickPanAmount = 0.01)`; autorepeat after 300 ms with `shift = 0.001*delayMs*panSpeed`, `panSpeed = 0.5` (screens per second). `UP→pan(0,+s) DOWN→pan(0,-s) LEFT→pan(-s,0) RIGHT→pan(+s,0)` |
| `"L"` / `"R"` | `Button` + `RotateListener(-1 / +1)` | press: `doRotation(initialRotation*sign)` with `initialRotation = Math.PI/1800` (0.1°); autorepeat: `angle = 0.001*delayMs*rotationSpeed`, `rotationSpeed = Math.PI/18` rad/s (10°/s) |

```java
public void zoom(double factor){ Width /= factor; canvas.repaint(); adjustScrollbars(); }
public void pan(double sx, double sy){ centerX -= Width*sx; centerY -= Width*sy; canvas.repaint(); adjustScrollbars(); }
void doRotation(double angle){
    matrix = {{cos,-sin},{sin,cos}};
    rotate(matrix);          // mutates every cached Point2 in levels[], fpoly[], symLines[], symAxes[] IN PLACE
}
```

Rotation is destructive — there is no accumulated angle to invert. Porting note: keep a
rotation angle in the view state and rotate at draw time instead, or replicate the in-place
mutation exactly (a long rotate-hold will accumulate float drift in the original).

Keyboard on the canvas: `'p'` / `'P'` → `doPrint()`, which spawns a `MIN_PRIORITY` thread that
opens a `FileDialog` and renders the canvas through `pvs.utils.ui.GraphicsPS` to a PostScript
file. The string `psName = "stellation.ps"` is passed as the *dialog title*
(`new FileDialog(frame, psName, FileDialog.SAVE)`) — `setFile()` is never called, so there is no
default filename.

### 9.2 Data held by the canvas

```java
private SFace[]     faces;        // NOTE: setFaces(...) assigns  this.faces = ffaces  (!)
private SFace[]     ffaces;
private Axis[]      axes;
private Vector3D[][] planes;

Point2[][][] levels;              // levels[layer][polygon][vertex] — FILLED shapes; layer ∈ {0,1}
Point2[][]   fpoly;               // outline / clickable facets, from ffaces
Point2[][]   symLines;            // [i] = {p0,p1} mirror-line endpoints
Point2[]     symAxes;  int[] symAxesOrder;
double Width, polyDiameter, centerX = 0, centerY = 0, Angle = 0;
```

`transform(Vector3D[] v, Point2[] p)` is literally a **drop of Z**: `p[i] = new Point2(v.x, v.y)`
— legal only because `createDiagram` already rotated the face plane into `z = const`.

```java
void findWidth(){                                 // called from init() only
    r = max over fpoly vertices of v.length2();
    polyDiameter = 2*Math.sqrt(r);   if (polyDiameter == 0.0) polyDiameter = 1;
    Width = polyDiameter;   centerX = 0;  centerY = 0;
}
```

Because `findWidth()` runs only in `init()` (i.e. once per stellation rebuild, via
`StellationMain.initSubcells()`), **zoom/pan state survives selection changes** — the user's
view of the diagram is not reset when they toggle a cell. Reproduce this.

### 9.3 World→screen mapping

```java
void initViewport(int width, int height){
    int d = min(width, height);
    int borderWidth = 4;
    double wx = Width*(width  - 2*borderWidth)/(d - 2*borderWidth);
    double wy = Width*(height - 2*borderWidth)/(d - 2*borderWidth);
    g2d.setViewport(new Viewport(centerX - wx/2, centerY + wy/2, centerX + wx/2, centerY - wy/2));
    //                            left,           top,            right,          bottom
    g2d.setScreenRectangle(new ViewRect(borderWidth, borderWidth, width-borderWidth, height-borderWidth));
}
```

`pvs.utils.ui.Graphics2D.initTransform()`:

```java
scalex = (screenRect.right - screenRect.left)/(viewport.right - viewport.left);
scaley = (screenRect.top   - screenRect.bottom)/(viewport.top - viewport.bottom);   // NEGATIVE -> flips Y
x0 = -viewport.left + screenRect.left/scalex;
y0 = -viewport.top  + screenRect.top /scaley;

x2screen(x)      = scalex*(x + x0);
y2screen(y)      = scaley*(y + y0);
screen2world(x,y)= new Point2(x/scalex - x0, y/scaley - y0);
```

Line drawing goes through a Cohen–Sutherland `clipLine(...)` against the viewport
(`outcode` bits: 1 = left, 2 = right, 4 = above top, 8 = below bottom).

### 9.4 Painting (`drawContent(Graphics2D g)`)

Double-buffered into `backImage`, cleared to white:

1. **Filled facets**, by level:
   ```java
   for i in 0..levels.length-1: g.setColor(getColor(i)); for each poly: g.fillPolygon(poly);
   ```
   with
   ```java
   static Color[] stepColors = new Color[100];
   static { float c = 0.0f;
            for (i=0..99){ stepColors[i] = Color.getHSBColor(c, 0.5f, 1.0f);
                           c += 0.1534f; if (c > 1.0f) c -= 1.0; } }
   static Color getColor(int i){ i = (i < 0) ? -1 : i; return stepColors[i % 100]; }
   ```
   Since `levels.length == 2` in practice (§5.5), the diagram uses exactly two fills:
   **index 0 = bottom facets → HSB(0.0000, 0.5, 1.0)** (pink),
   **index 1 = top facets → HSB(0.1534, 0.5, 1.0)** (pale yellow).
   `getColor(-1)` would throw `ArrayIndexOutOfBoundsException` (`stepColors[-1]`) — never hit.
2. **Outlines** of every facet in `fpoly`, in `Color.gray` if `drawSymmetryLines` else
   `Color.black`; `g.drawPolyline` if `usePolyline` else `g.drawPolygon` (closed).
3. **Symmetry mirror lines** in black when `drawSymmetryLines`.
4. **Symmetry axes** when `drawSymmetryAxes`:
   ```java
   void drawAxis(Graphics2D g, Point2 p, int order){
       int x = (int)(g.x2screen(p.x)+0.5), y = (int)(g.y2screen(p.y)+0.5);
       int size = 4;
       g.setColor(axisColor[order]);
       g.getGraphics().fillOval(x-size, y-size, 2*size, 2*size+1);
   }
   static Color axisColor[] = { Color.gray, Color.gray,
                                new Color(200,0,200),   // order 2
                                new Color(0,0,250),     // order 3
                                new Color(0,200,250),   // order 4
                                new Color(50,250,50) }; // order 5
   ```
   Only orders 0..5 are covered — an order-6 or higher axis (D6d, D7h, …) indexes past the end.

`adjustScrollbars()` (`sbMaximum = 100000`):

```java
sbVisible = (int)(sbMaximum * Width/polyDiameter);
sbVertical.setVisibleAmount(sbVisible);
int y = (int)((sbMaximum - sbVisible)*0.5*(1 - 2*centerY/polyDiameter));
int unitInc = max(1, (int)((sbMaximum - sbVisible)*(0.01*Width/polyDiameter)));
block = unitInc*50;
int x = (int)((sbMaximum - sbVisible)*0.5*(1 + 2*centerX/polyDiameter));
```
and the inverse in the listeners:
```java
centerX = 0.5*polyDiameter*(2.*x/(sbMaximum - sbVisible) - 1);
centerY = 0.5*polyDiameter*(1 - 2.*y/(sbMaximum - sbVisible));
```

`getRenderingShapes()` returns a `Vector<PolyShape>` for the printing path: one
`PolyShape(GeneralPath, PolyShape.FILL, getColor(i))` per level, then one
`PolyShape(outline, PolyShape.DRAW, Color.black)` for all of `fpoly`.

### 9.5 Mouse on the diagram — the primary selection UI

Action codes (`StellationCanvas`):
```java
public static final int SUB_SUPPORTING_CELLS = 0, ADD_SUPPORTING_CELLS = 1,
                        TOGGLE_SUPPORTING_CELLS = 2, TOGGLE_TOP_CELL = 3, TOGGLE_BOTTOM_CELL = 4;
```

`CanvasMouseListener.mousePressed`:

```java
Point2 point = g2d.screen2world(e.getX(), e.getY());
System.out.print("pointer:[" + chop(point.x) + ", " + chop(point.y) + "] ");
int[] vert = findVertex(point);
if (vert != null) System.out.print("vertex:[" + chop(v.x) + ", " + chop(v.y) + "]");
System.out.println();

if ((e.getModifiers() & BUTTON1_MASK) == 0) return;
int poly = findPoly(point);
if (poly >= 0) {
    if (CTRL)  arg[1] = SHIFT ? SUB_SUPPORTING_CELLS : TOGGLE_SUPPORTING_CELLS;
    else if (SHIFT) arg[1] = ADD_SUPPORTING_CELLS;
    else       arg[1] = ALT ? TOGGLE_TOP_CELL : TOGGLE_BOTTOM_CELL;
    arg[0] = poly;
    observer.update(this, arg);
}
```

| Gesture on the diagram | Action code |
|---|---|
| Left click | `TOGGLE_BOTTOM_CELL` (4) |
| Alt + click | `TOGGLE_TOP_CELL` (3) |
| Ctrl + click | `TOGGLE_SUPPORTING_CELLS` (2) |
| Shift + click | `ADD_SUPPORTING_CELLS` (1) |
| Ctrl + Shift + click | `SUB_SUPPORTING_CELLS` (0) |
| Right click (release) | popup menu at the cursor |

`chop(v)` here uses `EPS = 1.e-12`: `return (v < -EPS || v > EPS) ? v : 0;`.
Note the coordinate/vertex readout goes to **`System.out`**, not `Output.out`, so it does *not*
appear in the Output window.

**Right-click popup** (`makeCellSelectionPopup`), titled `"Select Cell"`, item labels verbatim:

```
toggle bottom cell     (Click)
toggle top cell          (Alt+Click)
toggle supp. cells    (Ctrl+Click)
add supp. cells        (Shift+Click) 
subtract supp. cells (Ctrl+Shift+Click) 
```

Shown from `mouseReleased` when `BUTTON3_MASK` is set, after `menuActionPoly = findPoly(point)`.

**Picking:**

```java
int findPoly(Point2 point){
    if (oldPolyIndex >= 0 && oldPolyIndex < fpoly.length && isInsidePolygon(fpoly[oldPolyIndex], point))
        return oldPolyIndex;                     // DEAD BRANCH -- see below
    for (i) if (isInsidePolygon(fpoly[i], point)) return i;
    return -1;
}
```
The `oldPolyIndex` fast path **never fires**. `oldPolyIndex` is initialised to `-1`, is set back to
`-1` at the end of every `paintCanvas()`, and the only two statements that would give it a real
polygon index are both commented out: `oldPolyIndex = polyIndex;` sits inside the block-commented
body of `CanvasMouseMotionListener.mouseMoved`, and `//oldPolyIndex = i;` inside the `findPoly`
loop itself. So `findPoly` is always the plain linear scan, first hit wins. (This is also why the
"subtract supp. cells" popup item is dead — §14.5.) A port can drop the branch entirely.
`isInsidePolygon` is an **even–odd** crossing test (so it handles the self-intersecting
diagram polygons):

```java
static boolean isInsidePolygon(Point2[] polygon, Point2 p){
    int cnt = 0;  Point2 pnt1 = polygon[polygon.length-1];
    for (Point2 pnt2 : polygon) {
        if (p.y > MIN(pnt1.y,pnt2.y) && p.y <= MAX(pnt1.y,pnt2.y) && p.x <= MAX(pnt1.x,pnt2.x)) {
            if (pnt1.y != pnt2.y) {
                double xinters = (p.y-pnt1.y)*(pnt2.x-pnt1.x)/(pnt2.y-pnt1.y) + pnt1.x;
                if (pnt1.x == pnt2.x || p.x <= xinters) cnt++;
            }
        }
        pnt1 = pnt2;
    }
    return (cnt % 2) != 0;
}
```

`findVertex(point)` returns `{polyIndex, vertexIndex}` of the first vertex whose **Manhattan**
distance is below a 10-screen-pixel-wide world cutoff:

```java
Point2 pnt1 = g2d.screen2world(10,0), pnt0 = g2d.screen2world(0,0);
double cutoff = Math.abs(pnt1.x - pnt0.x);
... d = |p.x-x| + |p.y-y|; if (d < cutoff) return {i, v};
```

**Routing in `StellationMain.update` (the "else" branch):**

```java
int face   = ((int[])what)[0];
int action = ((int[])what)[1];
switch (action) {
case TOGGLE_BOTTOM_CELL:
case TOGGLE_SUPPORTING_CELLS:
case ADD_SUPPORTING_CELLS:
case SUB_SUPPORTING_CELLS:
    cindex = controller.findCell(faceToShow, face, 1);   // "1 if we want it to be top face"
    break;
case TOGGLE_TOP_CELL:
    cindex = controller.findCell(faceToShow, face, 0);   // "0 if we want it to be bottom face"
    break;
}
if (cindex != null) {
    int[][] cellsIndex = selection.modifySelection(cindex, action);
    showDiagram(cellsIndex);
    selection.initCellField();
}
```

The `top` flag is **inverted** relative to the action name (this is deliberate and load-bearing:
"toggle *bottom* cell" means "find the cell for which this facet is a *top* face", i.e. the cell
lying *below* the plane). `Stellation.findCell(Vector cells, int faceIndex, int facetIndex, int top)`
scans every `SSCell` in `subcells`, then every `SCell` in it, then that cell's `top[]` (if
`top==1`) or `bottom[]` (if `top==0`) faces, looking for identity (`==`) with
`faces[faceIndex][facetIndex]`. It returns `{layerIndex, indexInLayer}` or `null`.

Then `Selection.modifySelection(int[] index, int action)`:

```java
case TOGGLE_BOTTOM_CELL:
case TOGGLE_TOP_CELL:        selectableCells[index[0]][index[1]].invertSelection();  break;
case ADD_SUPPORTING_CELLS:   for all 1s in getSupportCells(index[0],index[1]): setSelected(1); break;
case SUB_SUPPORTING_CELLS:   for all 1s in getSupportCells(index[0],index[1]): setSelected(0); break;
case TOGGLE_SUPPORTING_CELLS:for all 1s in getSupportCells(index[0],index[1]): invertSelection(); break;
// then repaint(); return getCells();
```

---

## 10. The 3D view

`Canvas3D extends Panel implements Runnable` holds a button strip and an inner
`SCanvas extends Canvas` (`getPreferredSize() = 300×300`; `Canvas3D.getPreferredSize()` is
`400×400`, `getMinimumSize()` is `200×200`).

### 10.1 Controls

| Control | Behaviour |
|---|---|
| `Checkbox "Edges"` (default true) | `drawLines` |
| `Checkbox "Faces"` (default true) | `drawFaces` |
| `Choice` display type | items **exactly**: `"Normal 3D"`, `"Anaglyph (Red/Blue)"`, `"Anaglyph (Blue/Red)"`, `"Stereo (Parallel)"`, `"Stereo (Crosseyed)"`. The selected *index* is stored directly in `displayType`, matching `Model3D.NORMAL=0, ANAGLYPH_RC=1, ANAGLYPH_CR=2, STEREO_PARALLEL=3, STEREO_CROSSED=4`. |
| `Button "Reset"` | `eventCallback = null; m_curMatrix.unit(); repaint()` — orientation only, zoom unchanged |
| `Button "Fit"` | `doFit()` |
| `Button "+"` | mouse-press autorepeat: `zoomIn()` immediately, then after a `Timeout(300)` a self-perpetuating callback loop; each step `m_xfac *= zoomSpeed` with `zoomSpeed = 1.02` |
| `Button "-"` | same with `m_xfac /= 1.02` |

```java
public void doFit(){
    eventCallback = null;
    m_curMatrix.unit();
    m_model.findBB();
    double size = (m_model.xmax - m_model.xmin);     // X extent only
    if (size != 0.) m_xfac = 0.9/size;
    m_canvas.repaint();
}
```
`m_xfac` starts at `0.4`.

Keyboard (`KeyListenerClass.keyTyped` on the inner canvas):
`'p'/'P'` → PostScript export via a `FileDialog`; `'e'/'E'/'l'/'L'` → toggle `drawLines`;
`'f'/'F'` → toggle `drawFaces`.

Mouse wheel: `double factor = Math.exp(-e.getWheelRotation() * 0.1); zoom(factor);`

### 10.2 Camera / projection

Pure **orthographic**. `Canvas3D.paint(Graphics graphics, int width, int height)`:

```java
m_model.mat.unit_flipped();                 // rows: (1,0,0) (0,-1,0) (0,0,-1)
m_model.mat.mul(m_curMatrix);               // "mul(R)" post-composes: map = R ∘ current
int mindiameter = min(width, height);
double scale = m_xfac * mindiameter;
m_model.mat.scale(scale, scale, scale);
m_model.mat.translate(width/2, height/2, 0);
m_model.transformed = false;
graphics.setColor(getBackground()); graphics.fillRect(0,0,width,height);
m_model.paint(graphics, displayType, drawFaces, drawLines);
```

so, per vertex `p = (x,y,z)`:

```
q      = F·p            where F = diag(1, -1, -1)
r      = C·q            where C = m_curMatrix (accumulated rotation)
screen = scale·r + (width/2, height/2, 0)
```

`Matrix3D.transform(double v[], int tv[], int nvert)` writes **integers**:

```java
tv[i    ] = (int)(x*lxx + y*lxy + z*lxz + lxo);
tv[i + 1] = (int)(x*lyx + y*lyy + z*lyz + lyo);
tv[i + 2] = (int)((x*lzx + y*lzy + z*lzz + lzo) * 1000000.0f);   // depth scaled by 1e6
```

Screen coordinates are therefore **truncated to whole pixels**, and depth is a truncated
fixed-point value in units of 1e-6. `(int)` in Java truncates toward zero (JS: `Math.trunc` /
`| 0`, *not* `Math.floor`).

The rotation matrix constructor (Rodrigues, row-major in this class's convention):

```java
public Matrix3D(Vec3 axis, double angleRad){
    double c = cos(angleRad), s = sin(angleRad), t = 1.0 - c;
    axis.normalize();                       // MUTATES the caller's Vec3
    init(new Vec3(t*ax*ax + c,    t*ax*ay - s*az, t*ax*az + s*ay),
         new Vec3(t*ax*ay + s*az, t*ay*ay + c,    t*ay*az - s*ax),
         new Vec3(t*ax*az - s*ay, t*ay*az + s*ax, t*az*az + c));
}
```

### 10.3 Trackball, inertia, and the anaglyph/stereo modes

```java
public void mouseDragged(MouseEvent e){
    long curTime = System.currentTimeMillis();
    double dx = e.getX() - m_mouseDownX, dy = e.getY() - m_mouseDownY;
    double angle = 3*Math.sqrt(dx*dx + dy*dy) / getSize().width;    // NOTE: the Panel width, not the canvas
    spinAxis = new Vec3(dy, -dx, 0);  spinAxis.normalize();
    m_curMatrix.mul(new Matrix3D(spinAxis, angle));
    m_mouseDragged = true;  m_canvas.repaint();
    double dt = (curTime - m_mouseDownTime)*0.001;
    if (dt != 0) spinSpeed = 0.2*angle/dt + 0.8*spinSpeed*Math.exp(-dt*10);
    m_mouseDownX = x; m_mouseDownY = y; m_mouseDownTime = curTime;
}
```

On `mouseReleased`, if `spinAxis != null && spinSpeed > spinSpeedCutoff (0.001)` **and**
`System.currentTimeMillis() - m_mouseDownTime <= 500`, the inertial spin loop starts. Each frame
(driven from the tail of `paintCanvas`, after a `Thread.sleep(10)`):

```java
long dt = curTime - m_mouseDownTime;
averageDt = 0.8*averageDt + 0.2*dt*0.001;
m_curMatrix.mul(new Matrix3D(spinAxis, spinSpeed * averageDt));
m_mouseDownTime = curTime;  m_canvas.repaint();
```
Any `mousePressed` with button 1 and no modifier, or any `mouseClicked`, kills the spin
(`spinAxis = null; spinSpeed = 0; eventCallback = null;`).

**Stereo/anaglyph** (`anaglyphAngleGrad = 2`, in *degrees* — `Matrix3D.yrot` converts):

```java
public void drawAnaglyph(Graphics graphics, int width, int height, double angle){
    m_model.mat.unit_flipped();
    m_model.mat.mul(m_curMatrix);
    m_model.mat.translate(0, 0, Math.abs((m_model.zmax - m_model.zmin)/2));  // push behind the screen
    m_model.mat.yrot(angle);                                                 // degrees
    double scale = m_xfac * min(width,height);
    m_model.mat.scale(scale,scale,scale);
    m_model.mat.translate(width/2, height/2, 0);
    graphics.setColor(Color.gray); graphics.fillRect(0,0,width,height);
    m_model.paint(graphics, displayType, drawFaces, drawLines);
}
```

`makeAnaglyph(angle)` renders right eye at `+angle` and left eye at `-angle` into two offscreen
images, `PixelGrabber`s both, and combines per pixel:

```java
int blue = (bufferLeft[i] & 0xFF);
bufferLeft[i] = 0xFF000000 | ((bufferRight[i] & 0xFF) << 16) | (blue << 8) | blue;
```
i.e. **red = right eye's blue channel, green = blue = left eye's blue channel** — a red/cyan
anaglyph built from the blue channel of each grey-ish render.

`drawStereo(g, angle)` renders the two eyes into `dim.width/2 × dim.height` halves and blits
left at x=0, right at x=width/2. Sign of `angle` swaps parallel vs cross-eyed.

### 10.4 Rendering (`Stellation3D.paintSlow`)

This overrides `Model3D.paint`, so the **base class's z-sort is not used for stellations**.

```java
if (displayType is ANAGLYPH_*) { drawAnaglyph = true;  light = light_anaglyph; light_color = light_color_anaglyph; }
else                           { drawAnaglyph = false; light = light_normal;   light_color = light_color_normal;  }

transform();                             // vertices AND the plane normals (mat.transform(planes, tplanes, n))

for each face: face.zdepth = (sum of tvert[index[c]+2]) / nverts;    // computed but UNUSED by Stellation3D

sortedFaces = index1;
if (drawFaces) card_shuffle();

for i in 0..colors.length-1:
    if (tnormals[i].z > 0) colors[i] = makeColor(Color.white, tnormals[i]);   // one colour per DISTINCT normal

for i in 0..nfaces-1:
    Face f = face[sortedFaces[i]];
    if (tnormals[f.nindex] != null && tnormals[f.nindex].z <= 0 && drawFaces) continue;    // backface cull
    collect vx[c] = tvert[index[c]], vy[c] = tvert[index[c]+1];
    if (drawFaces) {
        if (nv >= 3) { g.setColor(colors[f.nindex]); g.fillPolygon(vx, vy, nv); }
        else         { g.setColor(Color.black); g.drawLine(vx[0],vy[0],vx[1],vy[1]); }
    }
    if (drawLines) {
        g.setColor((drawAnaglyph && !drawFaces) ? Color.white : Color.black);
        for (v = 0; v < nv-1; v++) g.drawLine(vx[v],vy[v],vx[v+1],vy[v+1]);
        g.drawLine(vx[nv-1],vy[nv-1],vx[0],vy[0]);
    }
```

Because `showModel` passes an empty edge array, "Edges" draws **face outlines** — each shared
edge is stroked twice (the comment in the source says so: *"each line is drawn usually twice"*).

**Depth ordering — `card_shuffle()`, not a z-sort.** The stellation is the intersection region
of a finite set of planes, so a plane-by-plane stable partition gives an exact ordering:

```java
void card_shuffle(){
    sortedFaces = index1;
    for (int p = 0; p < planes.length; p++) {
        int[] src = index1, front = index2, back = index3;
        int fcount = 0, bcount = 0;
        double zcomp = tplanes[p].z;                 // z of the transformed plane vector
        for (int f = 0; f < src.length; f++) {
            int s = facePlaneDist[p][src[f]];        // -1 / 0 / +1
            if (s * zcomp > 0.0001) front[fcount++] = src[f];
            else                    back [bcount++] = src[f];
        }
        // write front group first, then back group, preserving relative order (stable partition)
        int scount = 0;
        for (f) src[scount++] = front[f];
        for (f) src[scount++] = back [f];
    }
    sortedFaces = index1;
}
```

`facePlaneDist` is precomputed once per model (`initFacePlaneDist()`), with
`private static final double EPS = 1.e-6`:

```java
face[i].center = centroid of face[i]'s vertices;   face[i].findex = i;
facePlaneDist[p][f] = (dist < -EPS) ? -1 : (dist > EPS) ? +1 : 0;
   where dist = plane.dot(plane, center) - plane.length2();
```

The threshold in `card_shuffle` is the literal `0.0001`. When `drawFaces == false` no sorting
happens at all (`sortedFaces` stays in natural order).

Faces are drawn in ascending `sortedFaces` order, later polygons overwriting earlier ones —
so the array is back-to-front by construction.

`Stellation3D.init()` overrides `Model3D.init()` to **deduplicate normals**: it hashes each
face normal into a `FastHashtable` (`Vec3.equals` uses `tolerance = 1.e-6` per component;
`Vec3.hashCode()` is `(int)(331345.563*x)+(int)(412345.891*y)+(int)(71341.678*z)`), stores the
index in `face[f].nindex`, and allocates `colors[]` with one entry per distinct normal.
So shading is per-plane-orientation, not per-face.

### 10.5 Lighting model

`Model3D.makeColor(Color c, Vec3 normal)` — note the `c` argument is **completely ignored**:

```java
int red = 50, green = 50, blue = 50;              // flat ambient term
for (int i = 0; i < light.length; i++) {
    double dot = Vec3.dot(light[i], normal);
    if (dot < 0.) continue;                       // light is behind the surface
    red   += dot*light_color[i].getRed();
    green += dot*light_color[i].getGreen();
    blue  += dot*light_color[i].getBlue();
}
return new Color(min(255,red), min(255,green), min(255,blue));
```

Lights (all normalized in the `Model3D()` constructor):

```java
// "MMA" = Mathematica-style, used for NORMAL / STEREO_*
Vec3[]  light_normal        = { (10,0,10), (10,10,10), (0,10,10) };
Color[] light_color_normal  = { (225,0,0), (0,225,0),  (0,0,225) };

// used for ANAGLYPH_RC / ANAGLYPH_CR
Vec3[]  light_anaglyph       = { (10,10,10), (-10,5,10) };
Color[] light_color_anaglyph = { (150,150,150), (150,150,150) };

double ambient = 0.25;    // DECLARED BUT NEVER USED
```

So the normal 3D view is a white material lit by three saturated red/green/blue directional
lights over a flat `rgb(50,50,50)` ambient — this is the characteristic look of the app.
The polyhedron's own `poly.colors`/`poly.icolor` are propagated into `Face.cr/cg/cb` and `gr[]`
but **`Stellation3D` never reads them**. (The base `Model3D.paint`, used only for plain OFF
models loaded via `Canvas3D.loadObject`, does the classic painter's-algorithm quicksort `qs()`
on `face.zdepth` descending, and calls `makeColor(gr[i], tnormals[i])`.)

### 10.6 Picking in 3D

```java
public int[] findFaceAtPoint(int x, int y){          // returns {faceIndex, closestVertexIndexWithinFace}
    if (sortedFaces == null || face == null) return new int[]{-1,-1};
    for (int i = nfaces-1; i >= 0; i--) {             // reverse paint order = topmost first
        Face f = face[sortedFaces[i]];
        if (tnormals[f.nindex] != null && tnormals[f.nindex].z <= 0) continue;   // backface
        fill vx/vy from tvert;
        if (isInsidePolygon(vx, vy, nv, x, y))        // even-odd, integer arithmetic
            return new int[]{ f.findex, findClosestVertex(f, x, y) };
    }
    return new int[]{-1,-1};
}
int findClosestVertex(Face face, int x, int y){       // Manhattan distance, dmin initialised to 1000
    ... d = ABS(x-vx) + ABS(y-vy); ...
}
```

`Canvas3D.MouseListenerClass.mouseClicked` (button 1, *any* modifier state) then reports:

```java
Vec3 center     = m_model.face[index[0]].center;                          // MODEL-space centroid
Vector3D normal = ((Stellation3D)m_model).getFacePlane(index[0]);         // unit normal * d
Vector3D vertex = ((Stellation3D)m_model).getVertex(index[0], index[1]);
observer.update(Canvas3D.this, new Object[]{
    new double[]{center.x,center.y,center.z},
    new Integer(e.getModifiers()),
    new double[]{normal.x,normal.y,normal.z},
    new double[]{vertex.x,vertex.y,vertex.z} });
```

`getFacePlane(i)` = `normalize(cross(v2-v1, v0-v1)) * dot(normal, v1)` — the plane's
"support vector" form used throughout this codebase (`x·v = |v|²`).

`StellationMain.update` for `who == m_canvas3D`:

```java
if ((options & CTRL_MASK) == 0 && (options & SHIFT_MASK) == 0 && (options & ALT_MASK) == 0) {
    printf("normal:(%14.12f,%14.12f,%14.12f) vertex:(%14.12f,%14.12f,%14.12f)\n",
           chop(normal[0]),chop(normal[1]),chop(normal[2]), chop(vertex[0]),chop(vertex[1]),chop(vertex[2]));
    return;                                                       // plain click = read out coordinates only
}
boolean addCell = true;
if ((options & CTRL_MASK)  != 0) addCell = true;
if ((options & SHIFT_MASK) != 0) addCell = false;                 // SHIFT wins, it is tested second
int[] cindex = controller.findCell(new Vector3D(center), addCell);
if (cindex != null) {
    int[][] cellsIndex = selection.modifySelection(cindex, StellationCanvas.TOGGLE_TOP_CELL);
    showDiagram(cellsIndex);
    selection.initCellField();
}
```

| Gesture in the 3D view | Effect |
|---|---|
| Plain left click on a face | Print that facet's plane vector and nearest vertex to the Output window (`chop` with `EPS = 1.e-12`, `%14.12f`). No selection change. |
| **Ctrl** + click | `addCell = true` → `Stellation.findCell(currentCells, center, adjacent=true)` returns the cell **on the far side of that facet** → toggled on. This is how you *grow* the stellation outward through the clicked face. |
| **Shift** + click (with or without Ctrl) | `addCell = false` → returns the cell that **owns** the facet → toggled (normally off). This is how you *carve away* the clicked cell. |
| **Alt** + click | Also passes the modifier test → falls through with `addCell = true`, same as Ctrl. |

`Stellation.findCell(SSCell[] sscells, Vector3D center, boolean adjacent)` matches the facet by
`face.getCenter().equals(center)` (`Vector3D.equals` is itself tolerance-based), remembers
`SFace.cellAbove` / `SFace.cellBelow`, and either returns `{foundSSCell.layer, foundSSCell.index}`
or searches the found cell's `top`/`bottom` lists for the `SSCell` containing the adjacent
`SCell`.

---

## 11. Aggregate: every user-visible control

| Where | Control | Result |
|---|---|---|
| Main | `Select...` button / File▸Select Polyhedron | modal thumbnail picker → rebuild |
| Main | Symmetry `Choice` | `createSubcells(symm)` + `initSubcells()` — regroups cells into orbits |
| Main | Face `Choice` | change `faceToShow`, redraw diagram |
| Main | Vertex Up `Choice` | change `vertexUp`, redraw diagram |
| Main | `Start` button | run the stellation builder (only works once — §14.1) |
| Cells | grid click / Shift / Ctrl / Ctrl+Shift | toggle / add-supported / toggle-supported / clear-supported |
| Cells | click layer-number box | invert (or Shift: select) all non-group cells in the layer |
| Cells | hover | info line: layer(cell[sub]), elementary-cell count, [facets, vertices, volume] |
| Cells | text field + `Set` | jump to an exact selection by notation string |
| Cells | `Clear` | empty the selection |
| Cells | scrollbars | pan the grid (unit = one grid cell, block = 10) |
| Diagram | left / Alt / Ctrl / Shift / Ctrl+Shift click | 5 selection actions (§9.5) |
| Diagram | right click | popup with the same 5 actions |
| Diagram | `+ - ^ v < > L R` | zoom / pan / rotate with press-and-hold autorepeat |
| Diagram | `Sym. Lines`, `Axes` checkboxes | overlay mirror lines / rotation axes |
| Diagram | scrollbars | pan |
| Diagram | `p` key | export the diagram as PostScript |
| 3D | drag | trackball rotate, with release-inertia |
| 3D | wheel | zoom, `exp(-notches*0.1)` |
| 3D | Ctrl / Shift click | grow / carve a cell |
| 3D | plain click | print facet plane + vertex to Output |
| 3D | `Edges`, `Faces` checkboxes | wireframe / solid |
| 3D | display-type `Choice` | normal, 2 anaglyph modes, 2 side-by-side stereo modes |
| 3D | `Reset` / `Fit` / `+` / `-` | orientation reset / fit to bounds / zoom |
| 3D | `p`, `e`/`l`, `f` keys | PostScript export, toggle edges, toggle faces |
| Menu | Edit▸Undo / Clear All | selection history stack |
| Menu | File▸Save / Save As / Export ▸ 4 formats | see §12 |
| Menu | File▸Print Diagram / Print 3D Model | see §13.3 |
| Menu | File▸Make Planes | see §13.2 |
| Menu | File▸Print Connectivity Graph | dumps `layer.index: (bottom cells) (top cells)` for every subcell to Output |
| Menu | View ▸ Diagram/3D/Cells/Output | show/hide the four secondary windows |

---

## 12. File formats and export

### 12.1 `.stel` (the app's own document)

`StellationController.save(File, String polyhedronName)`:

```
// stellation generated from polyhedron <name>            (or "... from a set of planes")
// exported from Stellation Program by Vladimir.Bulatov@gmail.com
polyhedron "<name>"                                        (or  planes "[(x,y,z)(x,y,z)...]")
symmetry "<polySymmetry>/<stellationSymmetry>"
exportLengthUnit "<m_exportLengthUnit>"
```

**The `cells "..."` line is commented out in this snapshot** —
`// pw.printf("cells \"%s\"\n", selection.getCells());`. The reader still handles it and the
sample files contain it, so a JS port **must re-enable writing it**; without it `Save` loses
the selection.

`StellationMain.save()` first rotates a backup: delete `<path>.bak`, rename `<path>` →
`<path>.bak`, then write. Then `writeThumbnail(stellationPath + ".png")`.

Reader — `StellationController.open(String path)` — uses a `FixedStreamTokenizer` configured by:

```java
st.whitespaceChars('=','=');   st.slashSlashComments(true);  st.slashStarComments(true);
st.eolIsSignificant(false);    st.quoteChar('"');
st.wordChars('_','_');  st.wordChars('0','9');  st.wordChars('-','-');  st.wordChars('.','.');
```
Recognised keys (case-insensitive): `polyhedron`, `cells`, `symmetry`, `planes`,
`exportLengthUnit`. `symmetry` is split with `new StringTokenizer(symmetry, " /", false)` into
`m_polySymmetry` / `m_stellationSymmetry`. Missing `exportLengthUnit` ⇒ `0.01`.
The method returns `"<polyhedronName-or-__PLANES>/<cells>"`, which `StellationMain.onOpen`
re-splits on `"/"` and then feeds to `startStellationThread(cells)`.

### 12.2 Export

`doExport(String outType)` opens a `FileDialog(SAVE)` titled `"Export Polyhedron as <type>"`
with a default filename of `getFileName()` plus `.wrl` / `.pov` / `.stl` / `.dxf`, then:

```java
controller.doExport(f, outType, selection.getCells(), polyhedronName);
writeThumbnail(exportPath + ".png");
```

`StellationController.doExport` scales the polyhedron by `m_exportLengthUnit` (default `0.01`,
i.e. model units → centimetres if the model is in "metres"), attaches a description block, sets
`outFaces = outEdges = outVertices = true; outColor = false`, and dispatches to
`writePOV` / `writeVrml` / `writeSTL` / `writeDXF`.

### 12.3 Thumbnails

```java
static final int THUMB_SIZE = 400;
void writeThumbnail(String path){
    Image cimg = m_canvas3D.getImage();                       // the 3D back buffer
    BufferedImage img = new BufferedImage(400,400,TYPE_INT_ARGB);
    AffineTransform trans = getBoxTransform(cimg.getWidth(null), cimg.getHeight(null), 400, 400);
    // uniform scale = min(400/w, 400/h)
    g.setRenderingHint(KEY_ANTIALIASING, VALUE_ANTIALIAS_ON);
    g.setRenderingHint(KEY_INTERPOLATION, VALUE_INTERPOLATION_BICUBIC);
    g.drawImage(cimg, trans, null);
    ImageIO.write(img, "png", new File(path));
}
```

### 12.4 File dialogs

`getOpenPathJ()` / `getSaveAsPathJ()` use a Swing `JFileChooser` (preferred size 500×500,
remembered across calls in `m_fileChoserSize`) with
`new FileNameExtensionFilter("Stellation files", "stel")`, and persist the last directory in
`java.util.prefs.Preferences.userNodeForPackage(StellationMain.class)` under the key
`"lastDir"`. An older AWT `FileDialog` path (`getOpenPathFD`, filter `"*.stel;"`) is retained
but commented out at the call site. `StelFilter` (a `javax.swing.filechooser.FileFilter` for
`.stel`, description `"Stellation Files"`) is defined but unused.

In a browser: `showOpenFilePicker` / `showSaveFilePicker` (or `<input type=file>` +
`Blob` download), with `localStorage` standing in for `Preferences`.

---

## 13. Dialogs

### 13.1 `DlgSelectPoly` — the polyhedron picker

Modal `Dialog`, sized to **the whole screen**: `dialog.setSize(screen.width, screen.height-30)`.

```
┌ panelPoly (BorderPanel) ────────────────────────────────┬─ sbPoly ─┐
│  polyCanvas: scrollable grid of PolyLabel thumbnails    │ vertical │
├─────────────────────────────────────────────────────────┴──────────┤
│ [ tfPolyName (30 cols, clicked name) ] [ lbCurPolyName (hovered) ] │
├────────────────────────────────────────────────────────────────────┤
│                    [ OK ]  [ Cancel ]                              │
└────────────────────────────────────────────────────────────────────┘
```

Grid metrics (`PolyCanvas`): `cellSizeX = cellSizeY = 90`, `iconSizeX = iconSizeY = 86`,
`offsetX = offsetY = 2`. Each `PolyLabel extends Canvas` draws a 3-D bevel
(`brighter()` top/left, `darker()` bottom/right), then `g.drawImage(image, 3, 3, this)`, and
when selected two blue rectangles at `(2,2,82,82)` and `(3,3,80,80)`
(`offsetX-1, offsetY-1, imageSizeX+2, imageSizeY+2` with `offsetX=offsetY=3, imageSize=80`).

Layout (`moveIcons()`, re-run on every dialog resize):

```java
int nx = max(1, dim.width / cellSizeX);        // columns
int ny = dim.height / cellSizeY;  visibleRows = ny;
scrollPanel.setLocation(0, -globalOffsetY);
if (dim.width != oldWidth) {
   curX = curY = 0;
   for each category cat: { curX = 0;
       for each poly: { if (curX == nx) { curX = 0; curY++; }
                        setLocation(curX*90 + 2, curY*90 + 2); curX++; }
       curY++; }                                // each CATEGORY starts a new row
   numberRows = curY;
   scrollPanel.setSize(dim.width, (curY+1)*cellSizeY);
   adjustSB();
}
```

Scrollbar: `Scrollbar(VERTICAL, 0, 1000, 0, 1000)`, `sbPolyMaximum = 1000`;

```java
void adjustSB(){
    sbPoly.setVisibleAmount((polyCanvas.visibleRows*1000)/polyCanvas.numberRows);
    sbPoly.setBlockIncrement(1000/polyCanvas.numberRows);
    sbPoly.setUnitIncrement(1000/polyCanvas.numberRows);      // integer division
}
// on adjust:
polyCanvas.globalOffsetY = (value*polyCanvas.numberRows*polyCanvas.cellSizeY)/1000;
polyCanvas.moveIcons();
```

Interaction: `mousePressed` on a thumbnail (not `mouseClicked`) selects it — deselect the old,
select the new, update `currentCategory/currentPoly`, write `selection[0]/selection[1]`, and put
the name into `tfPolyName`. `mouseEntered` writes the hovered name into `lbCurPolyName`.
`OK` sets `result = true`, `Cancel` sets `result = false`; `getPolyhedron(...)` returns
`selection` or `null`.

Catalog (`PolyNames`): 5 categories, **121 entries total** —
`"regular polyhedra"` (9), `"archimedean solids"` (13), `"archimedean duals"` (13),
`"nonconvex uniform polyhedra"` (43), `"duals to uniform polyhedra"` (43).
Each entry is `{displayName, fileStem, symmetry}` e.g. `{"icosahedron","u27","Ih"}`.
Assets: `resources/images/off/<stem>.off` and `resources/images/poly/<stem>_tmb.gif`
(150 of each in the repo — i.e. 29 stems are shipped but not listed in the catalog).
`PolyNames.findPolyByName(name)` does a case-insensitive scan and returns `{category, index}`
or `null`.

### 13.2 `DlgPlanes` — "Make Planes"

Modal `Dialog` titled `"Make Planes"`.

```
plane |   Nx   |   Ny   |   Nz   |  (3 more unlabelled TextFields per row: Px, Py, Pz)
  1   | [    ] | [    ] | [    ] | [    ] [    ] [    ]
 ...   (MAXPLANES = 12 rows, each field TextField(12))
 12   | ...
──────────────────────────────────────────────────────
   TextArea (log of source vectors and generated vectors)
──────────────────────────────────────────────────────
 Symmetry [Choice: Symmetry.getSymmetryNames()]   [Generate] [OK] [Cancel]
```

The `Px/Py/Pz` column headers are commented out but the fields are laid out.

`OK` is disabled until `Generate` is pressed. `Generate` →

```java
parser = new Parser();
polySymmetry = choiceSymmetry.getSelectedItem();
for i in 0..11:  Vector3D plane = readPlane(i);   // uses ONLY normalX/Y/Z; readPlane6 (with a point) is unused
if (plane != null) vectors.add(plane);
m_allPlanes = Utils.transformVectors(vv, polySymmetry);
// log source vectors (Fmt.fmt(v,17,14)) and the transformed set
btnOK.setEnabled(true);
```

Each text field is an **expression**, evaluated by `pvs.Expression.Parser` with two predefined
variables:

```java
Variable g  = expr.getVariable("g");  g.setValue((Math.sqrt(5)+1)/2);   // golden ratio
Variable pi = expr.getVariable("pi"); pi.setValue(Math.PI);
```

so you can type `g`, `1/g`, `2*pi/5`, etc. A row is used only if all three of Nx/Ny/Nz are
non-empty. The resulting `Vector3D v` is the plane in support-vector form: the plane is
`{ x : x·v = |v|² }`.

`Utils.transformVectors(Vector3D[], String symmetry)` applies every matrix of the group and
de-duplicates via a `Hashtable` keyed on `Vector3D` (tolerance-based `equals`/`hashCode`).

Then `StellationMain.doMakePlanes()`:

```java
if (!dlgPlanes.edit(m_mainFrame)) return;
stellationPath = NEW_FILE;
symm = dlgPlanes.getSymmetry();
controller.setSymmetry(symm + "/" + symm);
controller.setCanonicalPlanes(dlgPlanes.getGeneratingPlanes());
initSymmetryUI();
m_source = SOURCE_PLANES;
initializePoly(false);
startStellationThread(null);
```

**This path is broken in this snapshot** — see §14.2.

### 13.3 Printing

**`File ▸ Print Diagram`** → `DlgPrint.edit(frame, diagram.getRenderingShapes())`, a modal
dialog with a live preview `Canvas` (also a `java.awt.print.Printable`) and 12 parameters,
persisted to/from `stellation_print.ini` via `Dlg_Preferences.readPreferences/savePreferences`:

| Parameter | Type | Default in code | Value in the shipped `stellation_print.ini` |
|---|---|---|---|
| `Scale` | double | 1 | 5.0 |
| `MirrorV` | boolean | false | off |
| `MirrorH` | boolean | false | off |
| `Xoffset` | double | 0 | 5.0 |
| `Yoffset` | double | 0 | 5.0 |
| `PrintWidth` (cm) | double | 20 | 20.0 |
| `PrintHeight` (cm) | double | 25 | 25.0 |
| `CorrectionHeight` | double | 1 | 1.0 |
| `CorrectionWidth` | double | 1 | 1.002 |
| `TileX` | int (1..100) | 1 | 2 |
| `TileY` | int (1..100) | 1 | 2 |
| `Copies` | int (1..1000) | 1 | 1 |

Buttons `Apply` (update values + repaint preview), `Print`, `Cancel`.
`static final double INCHES = 2.54;` and the page transform is:

```java
g2d.translate(pageFormat.getWidth()/2, pageFormat.getHeight()/2);
g2d.scale(CorrectionWidth*72/INCHES, CorrectionHeight*72/INCHES);   // cm -> 1/72 in
Rectangle2D rect = new Rectangle2D.Double(-PrintWidth/2, -PrintHeight/2, PrintWidth, PrintHeight);
g2d.draw(rect); g.setClip(rect);
double imageOffsetX = PrintWidth  * (2*tileOffsetX + 1 - TileX) / 2;
double imageOffsetY = PrintHeight * (2*tileOffsetY + 1 - TileY) / 2;
g2d.translate(Xoffset - imageOffsetX, -Yoffset + imageOffsetY);
g2d.scale(Scale, -Scale);
if (MirrorV) g2d.scale(-1,1);
if (MirrorH) g2d.scale(1,-1);
renderShapes(g2d);        // antialias OFF, BasicStroke(0), fill or draw each PolyShape
```
Page count = `Copies * TileX * TileY`; `tile = pageIndex / Copies`,
`tileOffsetX = tile % TileX`, `tileOffsetY = tile / TileX`.

This is the "print the diagram life-size across several sheets so you can cut out the facets
and glue a paper model" feature — worth reproducing as a multi-page PDF/SVG export.

If `DlgPrint` throws (the handler catches everything), the fallback is the legacy AWT
`Toolkit.getPrintJob(...)` path calling `diagram.drawContent(gr, dim.width, dim.height)`.

**`File ▸ Print 3D Model`** has no dialog at all: `Toolkit.getPrintJob(...)` then
`m_canvas3D.paint(gr, dim.width, dim.height)`.

### 13.4 `AboutDialog`

Modal, `TextArea` with `Font("Courier", PLAIN, 14)` containing the BSD notice
("Stellations-v.1.0 (polyhedra stellation creator) … Copyright (C) 1997 by Vladimir Bulatov"),
and two buttons: **`"OK"`** (dispose) and **`"not OK"`** (`System.exit(0)`).
It is only reachable through the action command `"About..."`, which no menu item produces —
so in practice it never appears. A JS port should add a normal Help ▸ About.

### 13.5 Auxiliary tool windows (separate mini-apps, launched from the File menu)

- **Vector Calculator** (`pvs.Expression.ui.VectorCalculator`, `Frame "Vector Calculator"`):
  three `TextField(17)` vector inputs `v1 v2 v3` (each accepting expressions with `g` and `pi`),
  an `angle` field with a `Choice{"degree","radians"}`, a log `TextArea(24,80)`, and buttons
  `Dot(v1.v2)`, `Cross(v1, v2)`, `Angle(v1, v2)`, `Angle(v1,v2,v3)`, `Normalize(v)`,
  `Rot(v1,v2,angle)`, `Distance(v1,v2)`, `v1 - v2`, `Intersect(v1,v2,v3)`, `Plane(v1,v2,v3)`,
  `Length(v)`, `Clear`.
- **Polygon Display** (`pvs.polyhedra.ui.PolygonDisplay`): a separate scene-graph editor/viewer
  for `.poly` files, with its own menu bar, `sceneNormal = (0,0,1)`, `sceneCenter = (0,0,0)`.
  Out of scope for the stellation workflow — treat as a "phase 2 or never" item.

### 13.6 Output window

`WindowOutputStream` creates `MyFrame("Debug Output")` with a `TextArea(24,80)`
(`Font("Courier", PLAIN, 12)`, editable) and a `Clear` button; `StellationMain` renames it to
`"output"`. Writing is line-buffered: characters accumulate in a `StringBuffer` and are flushed
to the `TextArea` on `'\n'`.

`StellationMain.createOutputStream()` sets the **process-wide statics**
`Output.out = new PrintStream(winStream)` and `Polyhedron.Out = Output.out`. Almost every
`println`/`printf` in the codebase goes here. `System.setOut/setErr` are present but commented out,
which is why `StellationCanvas`'s pointer readout (`System.out.print`) does *not* land in this window.

---

## 14. Bugs in this source snapshot (do NOT reproduce)

1. **The `Start` button dies after one use.** `MakeStellation = "Start"` is the initial label,
   but `StellationThread.run()` sets it to `START = "Start!"` on completion (and `STOP = "Stop!"`
   while running). `MenuDispatcher` compares against `"Start"` and `"Stop"` — neither `"Start!"`
   nor `"Stop!"` matches, so after the first run the button does nothing.
   *Fix in the port:* use stable action ids, not labels.
2. **`File ▸ Make Planes` throws immediately.** `DlgPlanes.m_generatingPlanes` is declared but
   never assigned — both `m_generatingPlanes = copyPlanes(planes)` calls (constructor and
   `setPlanes`) are commented out. `edit()` → `initUI()` dereferences `m_generatingPlanes.length`
   → `NullPointerException`. Also `generatePlanes()` stores into `m_allPlanes`, while
   `getGeneratingPlanes()` returns `m_generatingPlanes`, so even if `initUI` survived, OK would
   hand back nothing. *Fix:* assign the generated planes to the field the getter returns, and
   seed the fields from `controller.getCanonicalPlanes()`.
3. **`Save` loses the selection.** The `cells "..."` line is commented out in
   `StellationController.save()` (§12.1), yet `open()` reads it and the `samples/*.stel` files
   contain it. Re-enable.
4. **Opening a plane-based `.stel` crashes.** `StellationMain.onOpen` does
   `int[] cat = PolyNames.findPolyByName(polyName)` and immediately reads `cat[0]`. For a
   planes document `polyName` is `StellationController.PLANES_SOURCE = "__PLANES"`, which is not
   in the catalog → `null` → NPE (swallowed by the outer `catch`), so nothing loads.
5. **`SubSupportingCellsAction` uses the wrong field.** In `StellationCanvas`, four of the five
   popup handlers read `menuActionPoly` (set when the popup opens); `SubSupportingCellsAction`
   reads `oldPolyIndex` instead. `oldPolyIndex` is *never* assigned a value other than `-1` —
   it starts at `-1`, `paintCanvas()` re-sets it to `-1`, and both statements that would assign a
   real index are commented out (one inside the block-commented body of
   `CanvasMouseMotionListener.mouseMoved`, one inside `findPoly`). The handler's
   `if (oldPolyIndex >= 0)` guard therefore always fails, so the "subtract supp. cells" menu item
   is unconditionally dead — it is not merely racing a repaint (the Ctrl+Shift+click path still
   works). Same root cause makes `findPoly`'s fast path dead (§9.5).
6. **`DlgSelectPoly` OK-without-clicking returns the tetrahedron.** `getPolyhedron(frame, cat, poly)`
   stores the incoming values in `currentCategory/currentPoly` but not in `selection[]`, which
   stays `{0,0}`.
7. **`ZoomListener.processEventCallback` calls `doZoom(factor)` twice** per callback in
   `StellationCanvas` (lines 1178 and 1181) — zoom-hold runs at double the intended rate.
8. **`tfMaxLayer` is never added to the UI** (§4), so the max-layer limit is unreachable.
9. **`SelectionPanel.adjustScrollbars` calls `cpanel.remove(sbHorizontal)` twice** in the
   else-branch (once unconditionally, once inside the `if`).
10. `Model3D.ambient = 0.25` and `Selection.color[]` are dead. `Canvas3D.init()` computes
    `f1`, `f2` and never uses them. `Panel3D` is an empty stub. `Timeout.stop()` is a no-op
    (its body is commented out), so an autorepeat timer always fires once after 300 ms even if
    the button was already released — the `mouseDown` guard is what actually stops it.

---

## 15. Constant reference

| Constant | Value | Where |
|---|---|---|
| `Utils.EPS`, `DlgPlanes.EPS`, `StellationCanvas.EPS` | `1.e-12` | coordinate "chop" for display |
| `Stellation3D.EPS` | `1.e-6` | face-vs-plane side classification |
| `card_shuffle` partition threshold | `0.0001` | `s * zcomp > 0.0001` |
| `Vec3.tolerance` | `1.e-6` | `Vec3.equals` per component |
| `Vec3.TOL` (`chop` in `toString`) | `1.e-10` | display only |
| `Model3D.CHOP` | `1.e-10` | unused helper |
| `Stellation.chop` threshold | `1.e-10` | |
| `Stellation.ROUND_FACTOR` | `1.e6` | `round(x) = floor(x*1e6 + 1/2e6)/1e6` |
| depth scale in `Matrix3D.transform(double[],int[],n)` | `1000000.0f` | tv[i+2] |
| `Canvas3D.m_xfac` initial | `0.4` | |
| `Canvas3D.zoomSpeed` | `1.02` | per +/- button step |
| wheel zoom | `Math.exp(-notches*0.1)` | |
| `doFit` | `m_xfac = 0.9/(xmax-xmin)` | |
| `Canvas3D` drag angle | `3*sqrt(dx²+dy²)/panelWidth` rad | |
| `spinSpeedCutoff` | `0.001` | |
| inertia launch window | `<= 500 ms` since last drag | |
| `anaglyphAngleGrad` | `2` (degrees) | |
| `StellationCanvas.m_initialDelay` | `300 ms` | autorepeat delay |
| zoom: `initialZoom`, `zoomSpeed` | `1.01`, `1.5` | |
| pan: `clickPanAmount`, `panSpeed` | `0.01`, `0.5` | |
| rotate: `initialRotation`, `rotationSpeed` | `π/1800`, `π/18` rad/s | |
| diagram `borderWidth` | `4` px | `initViewport` |
| diagram `sbMaximum` | `100000` | |
| diagram hue step | `0.1534` (sat `0.5f`, bri `1.0f`) | `stepColors` |
| cells grid `gridY` | `fontHeight + yspace = 24` | |
| cells grid `gridX` | `fm.charWidth('W') + 8` | |
| cells cell colours | `HSB(hue, 0.8f, 0.9f)` | `makeColors` |
| `symCellColor` | `rgb(230,230,255)` | |
| `THUMB_SIZE` | `400` | |
| `DEFAULT_EXPORT_LENGTH_UNIT` | `0.01` | |
| `DlgPlanes.MAXPLANES` | `12` | |
| `DlgSelectPoly` cell/icon size | `90` / `86` (image `80` at offset `3`) | |
| golden ratio variable `g` | `(sqrt(5)+1)/2` | expression parser |

---

## 16. JS PORTING NOTES

**`Vector` / `Hashtable` and identity.**
`allcells` and `subcells` are `Vector<Vector<SSCell>>`; use nested `Array`. But
`FastHashtable`/`Hashtable` are keyed on `SFace`, `Vec3`, `Vector3D`, `Plane` — objects with
**tolerance-based `equals()` and quantising `hashCode()`** (e.g.
`Vec3.hashCode() = (int)(331345.563*x)+(int)(412345.891*y)+(int)(71341.678*z)`,
`Vec3.equals` = all three components within `1.e-6`). A JS `Map`/`Set` uses reference identity,
so these must become explicit hash-with-tolerance structures: compute the same integer key
(watch the `(int)` truncation-toward-zero and `|0` 32-bit wrap) and do a linear `equals` scan
within the bucket. `Stellation3D.init()`'s normal deduplication and
`getStellationDiagram`'s top/bottom cancellation both depend on this exact behaviour.

Conversely, `Stellation.findCell(cells, faceIndex, facetIndex, top)` and
`SFace.adjacent()` compare with `==` — **true reference identity**. Do not "helpfully" replace
those with structural comparison; keep the shared `SFace`/`Vector3D` object graph intact.

**Integer division.** Pervasive and load-bearing:
`Selection.getCellUnderMouse` (`((x-offsetX)/gridX) - 2`), `DlgSelectPoly.adjustSB`
(`1000/numberRows`), `moveIcons` (`dim.width / cellSizeX`), `makeStellationName`
(`index / 26`, `index % 26`), `DlgPrint.print` (`pageIndex / Copies`, `tile % TileX`),
`getOutlineColor` colour interpolation, `Model3D.qs` pivot `(left+right)/2`.
Wrap every one in `Math.floor` (all operands are non-negative here) or `| 0` where the Java
value can be negative — Java `/` truncates toward zero, `Math.floor` does not.

**`(int)` casts on coordinates.** `Matrix3D.transform(double[], int[], n)` truncates screen X/Y
to integers and the depth to `(int)(z * 1e6)`. `Graphics2D.x2screen`/`y2screen` return doubles
but every consumer does `(int)` or `(int)(v + 0.5)`. If you draw with sub-pixel precision the
picking (`isInsidePolygon` on integer `vx`/`vy` in `Stellation3D`) and the rendering will
disagree on boundary pixels. Either replicate the truncation in both, or move both to float
consistently.

**float vs double.** The code is double throughout except for two `f`-suffixed literals:
`1000000.0f` in `Matrix3D.transform` and the HSB floats. `Matrix3D` has `xx = 1.0f` in the
default constructor (a float literal widened to double — harmless). JS numbers are doubles, so
this is a non-issue *except* that `(int)(x * 1000000.0f)` in Java promotes to double before the
multiply; JS does the same. No action needed.

**`StreamTokenizer` quirks.** The `.stel` reader uses `FixedStreamTokenizer` with
`whitespaceChars('=','=')`, `slashSlash/slashStarComments(true)`, `quoteChar('"')`, and
`wordChars` extended over `_ 0-9 - .`. Consequences: `=` is a separator, `//` and `/* */`
comments are stripped, quoted strings come back in `sval` with quotes removed, and a bare token
like `-1.5e3` is a *word*, not a number (`TT_NUMBER` never fires because digits were reclassified
as word chars). Do not reach for `JSON.parse` or a naive `split` — write a small tokenizer with
those rules. The cell-notation parser is different again: `new StringTokenizer(cells, "(),-{}[]", true)`
returns delimiters as tokens and **collapses runs of nothing** — reimplement as a regex split
keeping delimiters, e.g. `str.split(/([(),\-{}\[\]])/).filter(s => s !== '')`. Also note
`isNumber("")` returns `true` in the Java source.

**Static mutable state.** `Output.out` and `Polyhedron.Out` are process-wide `PrintStream`s
rebound at startup to the Output window. `Selection.color[]`, `StellationCanvas.stepColors[]`,
`StellationCanvas.axisColor[]`, `WindowUtils.cons` (a **single shared `GridBagConstraints`
instance** mutated per call!), and each dialog's `static GridBagConstraints gbc` are all
statics. `DlgPrint`'s twelve `Parameter*` objects are `static` too, so print settings are shared
across dialog instances and persisted to `stellation_print.ini`. In JS, make the log stream an
injected sink and turn the colour tables into frozen module constants.

**Threads.** `startStellationThread` runs the plane-arrangement build at `MIN_PRIORITY` while
the UI stays live, and `stopStellationThread` calls the deprecated `Thread.stop()`. Port to a
Web Worker (the `pvs.polyhedra.*` model classes are already JSweet-transpiled and have no AWT
dependency) with a cancellation token; `worker.terminate()` is the closest analogue to
`Thread.stop()`. `Timeout` spawns a raw `Thread` that sleeps then fires a callback — that is
`setTimeout`. The autorepeat "eventCallback" idiom (a field re-armed from inside `paintCanvas`
after `Thread.sleep(10)`) is a hand-rolled animation loop: replace with
`requestAnimationFrame` and keep the same per-frame `delta`-scaled factors
(`exp(zoomSpeed*dt)`, `dt*panSpeed`, `dt*rotationSpeed`).

**AWT `getModifiers()` bit masks.** `InputEvent.CTRL_MASK`, `SHIFT_MASK`, `ALT_MASK`,
`BUTTON1_MASK`, `BUTTON3_MASK`. Map to `event.ctrlKey / shiftKey / altKey` and
`event.button === 0 / 2`. **Alt+click is intercepted by many window managers and by macOS**;
the diagram's `TOGGLE_TOP_CELL` needs an alternative binding (the right-click popup already
offers it, and that popup must be reproduced since `contextmenu` must be `preventDefault`ed
anyway). Also note the app uses `mousePressed` for selection in the Cells grid and
`mouseReleased` for the diagram popup — pick `pointerdown`/`pointerup` accordingly.

**Rendering.** The 3D view is a software rasteriser: filled polygons in a fixed order, no
z-buffer. If you port to WebGL you get depth testing for free and can drop `card_shuffle()` —
but be aware the two are *not* equivalent for the self-intersecting/coplanar geometry stellations
produce, and the original's look (coplanar faces resolved by plane-partition order rather than
by depth) is part of its identity. A 2D-canvas port that reproduces `card_shuffle` verbatim is
the faithful choice; `fillPolygon` maps to `ctx.beginPath()/moveTo/lineTo/closePath/fill` with
`ctx.fill('evenodd')` if you want AWT's even-odd default.

**Colour construction.** `Color.getHSBColor(h,s,b)` uses `h` in `[0,1)` (wrapping), and
Java's HSB→RGB is the standard algorithm — but Java rounds with `(int)(x*255.0f + 0.5f)`.
If exact colour matching matters, port `java.awt.Color.HSBtoRGB` rather than using a CSS
`hsl()` string (HSL ≠ HSB).

**`Frame` iconify semantics.** `windowIconified`/`windowDeiconified` hide/show the four
secondary windows. There is no browser analogue; drop it, or map to a "collapse all panes"
button.

**Fonts.** `Helvetica PLAIN 12` (global), `Serif BOLD 16` (the three Choices),
`SansSerif BOLD 16` / `PLAIN 12` / `PLAIN 10` (cells grid), `Courier PLAIN 12` (output),
`Courier PLAIN 14` (about). The cells grid's `gridX` is derived from
`FontMetrics.charWidth('W')`, so use `ctx.measureText('W').width` and round the same way, or
the hit test (`(x-offsetX)/gridX`) will drift from the drawing.

---

## 17. UNCERTAIN

- **UNCERTAIN:** the exact sign convention of `card_shuffle`'s "front" partition. The array
  named `front` is written first and the drawing loop paints ascending, so the `front` group is
  painted *first* and therefore ends up *behind*. I have traced the arithmetic
  (`facePlaneDist[p][f] * tplanes[p].z > 0.0001`, with `unit_flipped` giving `F = diag(1,-1,-1)`
  and larger transformed z meaning farther, per `Model3D.qs`'s descending sort and its comment
  "sorting faces from back to front"), and it is self-consistent — but I could not run the
  program to confirm empirically. Port the expression verbatim rather than re-deriving it.
- **UNCERTAIN:** whether `Selection`'s "group header" column is ever clickable in practice for a
  group of size 1. `init()` only emits a header column when `ssc.subCells.length > 1`, so I
  believe not, but the discriminator in `mousePressed` (`ssc.subCells != null`) is a different
  test from the one in `init()` (`ssc.subCells.length > 1`) and I could not exercise the case
  where a top-level `SSCell` has exactly one subcell that itself has subcells.
- **UNCERTAIN:** the precise pixel geometry of the sub-cell "top bar" in `Selection.paint`.
  The fill is `fillRect(xs+xpad+gridX-2, y+ypad-2, gridX-xpad2+1, 3)` while the selection
  rectangle around it is at `xs+gridX+xpad-1` / `xs+gridX+xpad-2` — the bar is offset by one
  pixel relative to the box it decorates. This looks like an off-by-one in the original but I
  cannot tell without a screenshot whether it is visible.
- **UNCERTAIN:** `Symmetry.getAxes(symmetry)` may return axes of order 6 or higher for the
  dihedral groups in the Symmetry choice (D6d, D7h, …). `StellationCanvas.axisColor` has only
  6 entries (indices 0..5), so `drawAxis` would throw. I did not enumerate `getAxes`'s output
  per group to confirm which symmetries are actually reachable from the UI.
- **UNCERTAIN:** whether the `Diagram` window title is ever the `makeStellationName` short form.
  `showStellationDiagram` creates `new Frame(name)` with it, but `StellationMain` immediately
  calls `frameDiagram.setTitle("Diagram")` in the same `if (frameDiagram == null)` block, so the
  short name should never be visible. I could not verify there is no repaint in between.
- **UNCERTAIN:** the `PolygonDisplay` sub-application. I read only its imports and the first
  ~70 lines; it is a separate `.poly` scene-graph editor with its own menu bar and is not part
  of the stellation workflow. If the port needs it, it requires its own spec.
- **UNCERTAIN:** whether `getPolyhedronPlanes()` is correct after `Make Planes`.
  `initializePoly(SOURCE_PLANES)` reads `controller.getPolyhedronPlanes().length`, but
  `m_polyhedronPlanes` is only ever assigned in `initPolyPlanes(Polyhedron)`. In the normal flow
  it holds the *previous* polyhedron's planes (stale, not null); reached before any polyhedron
  was loaded it would NPE. Since the Make Planes dialog throws first (§14.2), I could not
  observe which case actually occurs.
