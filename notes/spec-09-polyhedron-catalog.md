# Spec 09 — Built-in Polyhedron Catalog

Source of truth: `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/main/java/pvs/polyhedra/stellation/PolyNames.java` (304 lines, read in full).

Consumers read in full or in part:
- `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/ui/java/pvs/polyhedra/stellation/ui/StellationMain.java`
- `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/ui/java/pvs/polyhedra/stellation/ui/DlgSelectPoly.java`
- `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/main/java/pvs/polyhedra/stellation/StellationController.java`
- `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/main/java/pvs/polyhedra/Symmetry.java`

Asset directories:
- `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/resources/images/off/` — 150 `.off` files
- `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/resources/images/poly/` — 150 `_tmb.gif` thumbnails

---

## 1. Data model in the Java source

`PolyNames` is a pure data holder with static tables plus two instance cursors.

### 1.1 Column indices

```java
static final int NAME=0;
static final int FNAME=1;
static final int SYMMETRY=2;
```

### 1.2 Instance state (mutable cursors)

```java
int category = 0;
int representation = 0;
public PolyNames(){}
```

`category` selects which sub-array `name(int i)` / `fname(int i)` / `length()` index into. `representation` is written by `setRepresentation` and never read anywhere in the code base (see §1.5).

### 1.3 The main table

```java
static String poly[][][] = { ... };
```

A ragged 3-D array of `String`: `poly[category][index][field]` where `field ∈ {NAME=0, FNAME=1, SYMMETRY=2}`. Every innermost element is a 3-element `String[]`; there are no 2-element rows (the commented-out lines at 224–232 and 289–297 use 2-element `{name, file}` literals, but they are all commented out and thus not present).

### 1.4 Category labels

```java
static String categories[] = {
  "regular polyhedra",
  "archimedean solids",
  "archimedean duals",
  "nonconvex uniform polyhedra",
  "duals to uniform polyhedra",
  /*
  "tetrahedral symmetry",
  "octahedral symmetry",
  "icosahedral symmetry"
  */
};
```

Only **5** categories are live; the three symmetry-grouped labels are inside a `/* */` block and are not compiled. `categories.length == 5` and `poly.length == 5` — they line up index-for-index. Note the in-source comment above category 4 reads `// "duals to noncovex uniform polyhedra"` (with the typo "noncovex"), but the **displayed** label from `categories[4]` is `"duals to uniform polyhedra"`. The port must use the `categories[]` string, not the comment.

### 1.5 Two unused/near-unused tables

```java
static String modifiers[] = {
  "", "e", "r", "s"
};

static String representations[] = {
  "faces", "edges", "Escher's style", "spherical"
};
```

`modifiers[]` is never referenced anywhere (verified by grep across `src/`). `representations[]` is referenced only by `PolyNames.setRepresentation`, which itself has no callers. Both are dead code — reproduce them only if you want bit-for-bit parity of the data module; nothing in the app depends on them.

---

## 2. Public API of `PolyNames` (exact signatures)

```java
public PolyNames()
public static int[] findPolyByName(String name)      // returns new int[]{cat, i} or null
public String name(int i)                            // poly[category][i][NAME]
public String fname(int i)                           // poly[category][i][FNAME]
public String fname(int cat, int i)                  // poly[cat][i][FNAME]
public String symmetry(int cat, int i)               // poly[cat][i][SYMMETRY]
public String name(int cat, int i)                   // poly[cat][i][NAME]
public int length()                                  // poly[category].length
public int getCategoryLength(int cat)                // poly[cat].length
int setCategory(String name)                         // package-private
public String[] getCategories()                      // returns the live array (not a copy!)
int setRepresentation(String name)                   // package-private
```

### 2.1 `findPolyByName` — exact semantics

```java
public static int [] findPolyByName(String name){
  for(int cat=0; cat < poly.length; cat++){
    for(int i=0; i < poly[cat].length; i++){
      if(poly[cat][i][NAME].equalsIgnoreCase(name))
        return new int[]{cat, i};
    }
  }
  return null;
}
```

- Scan order: category 0..4, then index 0..n-1 within each. **First match wins.**
- Comparison is `String.equalsIgnoreCase` — case-insensitive, but otherwise an exact full-string match (no trimming, no whitespace normalization, no substring match).
- Returns `null` on no match. There are **two** callers, and they behave differently:

  1. `StellationController.open`, line 301 — **does** null-check and bails out:
     ```java
     int [] cat = PolyNames.findPolyByName(polyhedronName);
     if(cat == null){
         printf("can't find polyhedron by name: %s\n", polyhedronName);
         return null;
     }
     response = polyhedronName + "/" + cells;
     ```
     (it also ignores the returned indices entirely — the result is only used as an existence test.)
  2. `StellationMain.openStellationFile`, line 1180 — does **not** null-check:
     ```java
     int [] cat = PolyNames.findPolyByName(polyName);
     Output.out.println("found: " + cat[0] + ", " + cat[1]);
     ```

  Because caller 1 runs first (`StellationMain` line 1166 calls `controller.open(...)` and guards on `if(response != null)`), a saved `.stel` file naming an *unknown* polyhedron does **not** reach the unchecked deref — `open` returns `null` and `StellationMain` silently does nothing. The path that actually NPEs is a **planes-source** file: `open` returns `PLANES_SOURCE + "/" + cells` where `PLANES_SOURCE = "__PLANES"` (`StellationController` line 54), `StellationMain` splits off `polyName == "__PLANES"`, `findPolyByName("__PLANES")` returns `null`, and line 1181 throws `NullPointerException`. The JS port should return `null` and handle it explicitly (see §7).

### 2.2 `setCategory` / `setRepresentation` — fallback-to-zero semantics

```java
int setCategory(String name){
  category = 0;
  for(int i=0; i < categories.length; i++){
    if(name.equals(categories[i])){ category = i; break; }
  }
  return category;
}
```

Note: `equals` here (case **sensitive**), unlike `findPolyByName`. On no match the cursor silently falls back to `0`. `setRepresentation` (line 80) is identical in shape against `representations[]`.

Both are **dead**: grep across `src/` finds no call to either (`setCategory` and `setRepresentation` appear only at their own declarations, `PolyNames.java:64` and `:80`). The `category` cursor is therefore permanently `0` in every live `PolyNames` instance, and the single-arg `name(int i)`/`fname(int i)`/`length()` accessors that depend on it are never called either — all live reads go through the two-arg overloads. Reproduce these only for parity.

---

## 3. How the catalog is consumed

### 3.1 Resource paths derived from `file`

Given `f = polyNames.fname(cat, i)` (e.g. `"u27"`):

| Asset | Path template | Source |
| --- | --- | --- |
| Geometry | `"/images/off/" + f + ".off"` | `StellationMain.readOffFile`, line ~779: `String fullname = "/images/off/" + fname +".off";` |
| Thumbnail | `"/images/poly/" + f + "_tmb.gif"` | `StellationMain` line ~992 and `DlgSelectPoly.loadImage` line ~281: `loadImageFromJar("/images/poly/"+polyNames.fname(cat,poly)+"_tmb.gif")` |

Both are loaded via `getClass().getResourceAsStream(...)`, i.e. from the classpath root, which maps to `resources/` in the repo. So `resources/images/off/u27.off` and `resources/images/poly/u27_tmb.gif`.

### 3.2 Symmetry string is used to seed both symmetry groups

`StellationMain.initializePoly(boolean forceInit)`, case `SOURCE_POLY`:

```java
polyhedronName = polyNames.name(currentCategory,currentPoly);
String fname = polyNames.fname(currentCategory,currentPoly);
...
image = loadImageFromJar("/images/poly/"+fname+"_tmb.gif");
polyImage.setImage(image);
Polyhedron polyhedron = readOffFile(fname);
if( forceInit ){
    String symm = polyNames.symmetry(currentCategory,currentPoly);
    this.controller .setSymmetry( symm + "/" + symm );
}
```

So on a fresh selection the catalog `symmetry` field becomes **both** the polyhedron symmetry and the stellation symmetry, joined as `"Ih/Ih"`. `StellationController.setSymmetry` (line 339) splits it:

```java
/** it takes string of kind "Ih / I" */
public void setSymmetry(String symmetry){
    StringTokenizer st = new StringTokenizer(symmetry, " /", false);
    m_polySymmetry = st.nextToken();
    m_stellationSymmetry = st.nextToken();
}
```

Delimiter set is the two characters space and `/`; consecutive delimiters collapse (`StringTokenizer` behaviour), so `"Ih / I"`, `"Ih/I"` and `"Ih  /  I"` all parse identically.

`forceInit == true` is passed at **exactly one** call site: `OnSelectPolyhedron.actionPerformed`, `StellationMain` line 1486 (i.e. the user picked an entry in the selection dialog). The other three call sites pass `false` and the catalog `symmetry` field is ignored:

| call site | line | where the symmetry comes from instead |
| --- | --- | --- |
| initial UI construction (startup) | 336 | nothing sets it — the `StellationController` field initializers `m_polySymmetry = "Ih"` / `m_stellationSymmetry = "I"` (lines 51–52) stand, with `m_stellationSymmetry` overwritten by the constructor arg (`-y`, default `"I"`) |
| after opening a saved `.stel` | 1185 | the `symmetry "P/S"` line in the saved file, applied by `StellationController.open` line 330 |
| after the user-planes dialog | 1285 | `dlgPlanes.getSymmetry()`, applied at line 1279 as `symm + "/" + symm` |

So at startup the catalog is used only for the *geometry and name* of `poly[0][3]`; its `"Ih"` symmetry is never applied — the effective pair is the controller default `Ih/I`, which happens to agree on the polyhedron half.

### 3.3 Symmetry vocabulary actually used by the catalog

Only five distinct values appear in the table: **`Td`, `Oh`, `O`, `Ih`, `I`**. Counts:

| symmetry | count |
| --- | --- |
| `Ih` | 72 |
| `Oh` | 28 |
| `I` | 16 |
| `Td` | 3 |
| `O` | 2 |
| **total** | **121** |

`Symmetry.java` recognizes a wider set — `"T"`, `"Th"`, `"Td"`, `"O"`, `"Oh"`, `"I"`, `"Ih"` (dispatch chains at lines 15–27, 46–90, 1990–2002), plus the `symNames[][]` documentation table declared at line 1677 whose first seven rows (1678–1684) map e.g. `{"Ih", "[3, 5]", "A_5 x C_2", "Diploid icosahedral"}`; that table continues past line 1684 with non-polyhedral groups (`C1`, `Cs`, `S2`, `Cn`, `Dn`, …). The catalog only ever emits the five above.

Rule of thumb visible in the data: chiral (snub / snub-dual) entries carry the rotation-only group `O` or `I`; everything else carries the full group `Td` / `Oh` / `Ih`. The tetrahedral entries use `Td`, never `T` or `Th`.

### 3.4 Default selection at startup

`StellationMain` lines 121–122:

```java
int currentCategory = 0;
int currentPoly = 3;
```

`poly[0][3]` = `{"icosahedron", "u27", "Ih"}`. **This is the only thing that determines the startup polyhedron.** Do not read `StellationMain.main`'s `String fname = "off/u27.off";` (line 1643) as a second, corroborating default — that variable is the `-i` argument and is stored as `this.stellationPath` (line 233), i.e. the path of a saved `.stel` file for the Save/Open dialogs; it is never parsed as an OFF path and never feeds the catalog. `StellationController`'s constructor (line 85) takes the same string as `fname` and **discards it entirely**, keeping only `stellationSymmetry`. The `"off/u27.off"` text is a stale leftover that merely happens to name the same solid. `main`'s `String stellationSymmetry = "I";` (line 1644) does reach the controller, and per §3.2 is what actually holds at startup.

### 3.5 Selection dialog layout

`DlgSelectPoly.PolyCanvas` builds one `PolyLabel` (an AWT `Canvas` showing the thumbnail) per catalog entry, over all categories:

```java
String cat[] = polyNames.getCategories();
images = new Image[cat.length][];
polyLabels = new PolyLabel[cat.length][];
for(int i =0; i < cat.length; i++){
  int catlen = polyNames.getCategoryLength(i);
  images[i] = new Image[catlen];
  polyLabels[i] = new PolyLabel[catlen];
}
```

The `PolyCanvas` constructor (line 181) places the labels on a naive `x*cellSizeX, y*cellSizeY` grid — one **row per category**, no wrapping, so wide categories initially run off the panel.

The real layout method is **`moveIcons()`, `DlgSelectPoly` line 238** (there is no `moveLabels`); it is driven by `DlgSizeListener` (line 417) and `SBAdjustmentListener` (line 155). Its whole reflow body is gated on `if(dim.width != oldWidth)`, so it only re-lays out when the dialog width actually changes. Inside: for each category `curX` resets to 0, entries wrap at `nx = dim.width / cellSizeX` columns, and after each category `curY++` — i.e. **each category starts on a fresh row**, but category headings are never drawn.

Two different labels are updated, by two different handlers:
- `processMouseEntered` (**hover**, line 218) → `lbCurPolyName.setText(polyNames.name(cat,poly))`
- `processMouseClicked` (**click / commit selection**, line 207) → `tfPolyName.setText(polyNames.name(currentCategory, currentPoly))`, after `currentCategory`/`currentPoly` and `selection[]` have been updated

A JS port should draw real category headings; this is a UI improvement, not a fidelity break.

---

## 4. File-naming convention (`u##` / `d##`)

Every `file` value matches `^[ud]\d{2}$` and, with `.off` appended, names a real file.

- `u##` = **uniform** polyhedron, `d##` = its **dual**. The two digits are the same index for a polyhedron and its dual (`u17` snub cube ↔ `d17` pentagonal icositetrahedron).
- The number is **not** the Maeder / Wikipedia `U1..U80` index. In that numbering `U1` is the tetrahedron and the great dirhombicosidodecahedron is `U75`; here `u06` is the tetrahedron and `u80` is the great dirhombicosidodecahedron. The asset numbering is the Har'El / *Kaleido* ordering that `poly2vrml` was built on, in which the five prism/antiprism families occupy `#1`..`#5` and the finite list starts at `#6` = tetrahedron. Hence the directory begins at `u06`/`d06` and ends at `u80`/`d80` (150 files = 2 × 75).
  Spot-checked against the `.off` headers below: `u06`→tetrahedron, `u07`→truncated tetrahedron, `u10`→octahedron, `u11`→cube, `u27`→icosahedron, `u80`→great dirhombicosidodecahedron. **UNCERTAIN:** the attribution to Har'El/Kaleido specifically is inferred from this offset and from the `poly2vrml` byline in the header; nothing in this repo names the source list.
- Live catalog entries span `u06`..`u79` and `d07`..`d79` only — `u80`/`d80` exist on disk but are commented out (§5.3c), and `d06` has no catalog row (§5.3a).
- The `.off` file's own header comment uses a **0-based** index, one less than the filename. Verified samples (line 3 of each file):

  | file | header line 3 |
  | --- | --- |
  | `u06.off` | `# polyhedron: #5 :tetrahedron` |
  | `u10.off` | `# polyhedron: #9 :octahedron` |
  | `u27.off` | `# polyhedron: #26 :icosahedron` |
  | `u80.off` | `# polyhedron: #79 :great dirhombicosidodecahedron` |
  | `d07.off` | `# polyhedron: #6 :triakistetrahedron` |
  | `d80.off` | `# polyhedron: #79 :great dirhombicosidodecacron` |

  Do **not** use the header number for lookup; use the filename.

Full `.off` header shape (line 1–4 of `u27.off`):

```
OFF
# file generated by poly2vrml (author V.Bulatov@ic.ac.uk)
# polyhedron: #26 :icosahedron
12 20 30
```

(OFF parsing itself is out of scope for this spec.)

---

## 5. Cross-check against the asset directories

Method: parsed all `{name, file, symmetry}` triples out of `PolyNames.java` (comment-stripped, so commented-out rows are excluded), then set-diffed against `ls resources/images/off/*.off` and `resources/images/poly/*_tmb.gif`.

### 5.1 Totals

| quantity | value |
| --- | --- |
| catalog entries (live) | **121** |
| distinct `file` values in catalog | 121 (no duplicates) |
| distinct `name` values in catalog | 121 (no duplicates) |
| `.off` files on disk | 150 |
| `_tmb.gif` files on disk | 150 |
| `.off` basename set == `.gif` basename set | **yes** (exact match, `d06..d80` ∪ `u06..u80`) |

Per-category counts:

| # | category | entries |
| --- | --- | --- |
| 0 | regular polyhedra | 9 |
| 1 | archimedean solids | 13 |
| 2 | archimedean duals | 13 |
| 3 | nonconvex uniform polyhedra | 43 |
| 4 | duals to uniform polyhedra | 43 |
|  | **total** | **121** |

### 5.2 Catalog entries with a MISSING `.off` file

**None.** All 121 referenced files exist as both `.off` and `_tmb.gif`. No broken references.

### 5.3 `.off` files NOT referenced by the catalog

29 orphans (present on disk, unreachable from the UI):

```
d06 d08 d09 d10 d11 d20 d27 d28 d39 d40
d54 d56 d57 d58 d67 d70 d75 d76 d80
u08 u09 u20 u54 u56 u67 u70 u75 u76 u80
```

Each orphan is explained by the source itself:

**(a) Self-dual / degenerate duals of the Platonic and Kepler–Poinsot solids** — the `d` twins of catalog entries that are only listed under their `u` name: `d06` (tetrahedron's dual = tetrahedron), `d10`/`d11` (octahedron ↔ cube), `d27`/`d28` (icosahedron ↔ dodecahedron), `d39`/`d40`, `d57`/`d58`. These are simply not given catalog rows; the regular category lists only the `u` forms.

**(b) Hemipolyhedra, explicitly commented out.** Category 3 ends with:

```java
//{"octahemioctahedron","u08"},
//{"tetrahemihexahedron","u09"},
//{"cubohemioctahedron","u20"},
//{"small icosihemidodecahedron","u54"},
//{"small dodecahemidodecahedron","u56"},
//{"small dodecahemicosahedron","u67"},
//{"great dodecahemicosahedron","u70"},
//{"great dodecahemidodecahedron","u75"},
//{"great icosihemidodecahedron","u76"},
```

and category 4 mirrors it:

```java
//{"octahemioctacron","d08"},
//{"tetrahemihexacron","d09"},
//{"hexahemioctacron","d20"},
//{"small icosihemidodecacron","d54"},
//{"small dodecahemidodecacron","d56"},
//{"small dodecahemicosacron","d67"},
//{"great dodecahemicosacron","d70"},
//{"great dodecahemidodecacron","d75"},
//{"great icosihemidodecacron","d76"},
```

Note these commented-out literals are **2-element** `{name, file}` — no symmetry column — so they cannot be simply un-commented; the port would have to supply symmetries if it ever wants to enable them. **UNCERTAIN:** the source gives no symmetry for these rows, so any value is guesswork from outside knowledge. Note in particular that the octahedral-family guess is *not* uniform: the tetrahemihexahedron (`u09`/`d09`) has **`Td`**, not `Oh`; `u08`/`u20`/`d08`/`d20` are `Oh` and the ten icosahedral ones are `Ih`. Verify each against the actual `.off` geometry before hard-coding anything.

**(c) The great dirhombicosidodecahedron pair, commented out with a stated reason.** Category 3, line 214:

```java
//{"great dirhombicosidodecahedron","u80","Ih"},// it has hemi faces passing through center
```

Category 4, line 278:

```java
//{"great dirhombicosidodecacron","d80","Ih"},
```

**Why the exclusions matter for the port:** there are **two** distinct exclusion reasons, not one. Groups (b) and (c) are hemi solids — face planes pass through the centre of symmetry, so the plane has zero distance from the origin, which breaks the plane-arrangement/cell-classification machinery (a plane through the centre cannot bound a cell "outward" from the core). Only group (c) states this in the source (`// it has hemi faces passing through center`, line 214); for group (b) it is inferred from the fact that every name in that block is a *hemi*polyhedron/*hemi*cron. Do not re-enable (b) or (c) without first proving the stellation engine tolerates centre-crossing planes.

Group (a) is unrelated — those solids are perfectly well-behaved, they simply were never given catalog rows. **UNCERTAIN:** see §8; the source says nothing about why.

---

## 6. Verbatim transcription — full catalog table

Field order in each row is `{NAME, FNAME, SYMMETRY}` exactly as in the source. **Rows are in source order** (this is the order `findPolyByName` scans and the order the selection dialog lays out). Three names contain typos in the original — `"truncated ochahedron"` (u13), `"truncated icosidodechedon"` (u33), `"great pentakisdodekahedron"` (d63) — and are transcribed **as-is** because `findPolyByName` matches on them and saved stellation files contain them.

```json
[
  { "category": "regular polyhedra", "name": "tetrahedron", "file": "u06", "symmetry": "Td" },
  { "category": "regular polyhedra", "name": "octahedron", "file": "u10", "symmetry": "Oh" },
  { "category": "regular polyhedra", "name": "cube", "file": "u11", "symmetry": "Oh" },
  { "category": "regular polyhedra", "name": "icosahedron", "file": "u27", "symmetry": "Ih" },
  { "category": "regular polyhedra", "name": "dodecahedron", "file": "u28", "symmetry": "Ih" },
  { "category": "regular polyhedra", "name": "small stellated dodecahedron", "file": "u39", "symmetry": "Ih" },
  { "category": "regular polyhedra", "name": "great dodecahedron", "file": "u40", "symmetry": "Ih" },
  { "category": "regular polyhedra", "name": "great stellated dodecahedron", "file": "u57", "symmetry": "Ih" },
  { "category": "regular polyhedra", "name": "great icosahedron", "file": "u58", "symmetry": "Ih" },
  { "category": "archimedean solids", "name": "truncated tetrahedron", "file": "u07", "symmetry": "Td" },
  { "category": "archimedean solids", "name": "cuboctahedron", "file": "u12", "symmetry": "Oh" },
  { "category": "archimedean solids", "name": "truncated ochahedron", "file": "u13", "symmetry": "Oh" },
  { "category": "archimedean solids", "name": "truncated cube", "file": "u14", "symmetry": "Oh" },
  { "category": "archimedean solids", "name": "rhombicuboctahedron", "file": "u15", "symmetry": "Oh" },
  { "category": "archimedean solids", "name": "truncated cuboctahedron", "file": "u16", "symmetry": "Oh" },
  { "category": "archimedean solids", "name": "snub cube", "file": "u17", "symmetry": "O" },
  { "category": "archimedean solids", "name": "icosidodecahedron", "file": "u29", "symmetry": "Ih" },
  { "category": "archimedean solids", "name": "truncated icosahedron", "file": "u30", "symmetry": "Ih" },
  { "category": "archimedean solids", "name": "truncated dodecahedron", "file": "u31", "symmetry": "Ih" },
  { "category": "archimedean solids", "name": "rhombicosidodecahedron", "file": "u32", "symmetry": "Ih" },
  { "category": "archimedean solids", "name": "truncated icosidodechedon", "file": "u33", "symmetry": "Ih" },
  { "category": "archimedean solids", "name": "snub dodecahedron", "file": "u34", "symmetry": "I" },
  { "category": "archimedean duals", "name": "triakistetrahedron", "file": "d07", "symmetry": "Td" },
  { "category": "archimedean duals", "name": "rhombic dodecahedron", "file": "d12", "symmetry": "Oh" },
  { "category": "archimedean duals", "name": "tetrakishexahedron", "file": "d13", "symmetry": "Oh" },
  { "category": "archimedean duals", "name": "triakisoctahedron", "file": "d14", "symmetry": "Oh" },
  { "category": "archimedean duals", "name": "strombic icositetrahedron", "file": "d15", "symmetry": "Oh" },
  { "category": "archimedean duals", "name": "disdyakisdodecahedron", "file": "d16", "symmetry": "Oh" },
  { "category": "archimedean duals", "name": "pentagonal icositetrahedron", "file": "d17", "symmetry": "O" },
  { "category": "archimedean duals", "name": "rhombic triacontahedron", "file": "d29", "symmetry": "Ih" },
  { "category": "archimedean duals", "name": "pentakisdodecahedron", "file": "d30", "symmetry": "Ih" },
  { "category": "archimedean duals", "name": "triakisicosahedron", "file": "d31", "symmetry": "Ih" },
  { "category": "archimedean duals", "name": "strombic hexecontahedron", "file": "d32", "symmetry": "Ih" },
  { "category": "archimedean duals", "name": "disdyakistriacontahedron", "file": "d33", "symmetry": "Ih" },
  { "category": "archimedean duals", "name": "pentagonal hexecontahedron", "file": "d34", "symmetry": "I" },
  { "category": "nonconvex uniform polyhedra", "name": "small cubicuboctahedron", "file": "u18", "symmetry": "Oh" },
  { "category": "nonconvex uniform polyhedra", "name": "great cubicuboctahedron", "file": "u19", "symmetry": "Oh" },
  { "category": "nonconvex uniform polyhedra", "name": "cubitruncated cuboctahedron", "file": "u21", "symmetry": "Oh" },
  { "category": "nonconvex uniform polyhedra", "name": "great rhombicuboctahedron", "file": "u22", "symmetry": "Oh" },
  { "category": "nonconvex uniform polyhedra", "name": "small rhombihexahedron", "file": "u23", "symmetry": "Oh" },
  { "category": "nonconvex uniform polyhedra", "name": "stellated truncated hexahedron", "file": "u24", "symmetry": "Oh" },
  { "category": "nonconvex uniform polyhedra", "name": "great truncated cuboctahedron", "file": "u25", "symmetry": "Oh" },
  { "category": "nonconvex uniform polyhedra", "name": "great rhombihexahedron", "file": "u26", "symmetry": "Oh" },
  { "category": "nonconvex uniform polyhedra", "name": "small ditrigonal icosidodecahedron", "file": "u35", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "small icosicosidodecahedron", "file": "u36", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "small snub icosicosidodecahedron", "file": "u37", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "small dodecicosidodecahedron", "file": "u38", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "great dodecadodecahedron", "file": "u41", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "truncated great dodecahedron", "file": "u42", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "rhombidodecadodecahedron", "file": "u43", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "small rhombidodecahedron", "file": "u44", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "ditrigonal dodecadodecahedron", "file": "u46", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "great ditrigonal dodecicosidodecahedron", "file": "u47", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "small ditrigonal dodecicosidodecahedron", "file": "u48", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "icosidodecadodecahedron", "file": "u49", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "icositruncated dodecadodecahedron", "file": "u50", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "great ditrigonal icosidodecahedron", "file": "u52", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "great icosicosidodecahedron", "file": "u53", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "small dodecicosahedron", "file": "u55", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "great icosidodecahedron", "file": "u59", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "great truncated icosahedron", "file": "u60", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "rhombicosahedron", "file": "u61", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "small stellated truncated dodecahedron", "file": "u63", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "truncated dodecadodecahedron", "file": "u64", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "great dodecicosidodecahedron", "file": "u66", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "great dodecicosahedron", "file": "u68", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "great stellated truncated dodecahedron", "file": "u71", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "great rhombicosidodecahedron", "file": "u72", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "great truncated icosidodecahedron", "file": "u73", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "small retrosnub icosicosidodecahedron", "file": "u77", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "great rhombidodecahedron", "file": "u78", "symmetry": "Ih" },
  { "category": "nonconvex uniform polyhedra", "name": "snub dodecadodecahedron", "file": "u45", "symmetry": "I" },
  { "category": "nonconvex uniform polyhedra", "name": "snub icosidodecadodecahedron", "file": "u51", "symmetry": "I" },
  { "category": "nonconvex uniform polyhedra", "name": "great snub icosidodecahedron", "file": "u62", "symmetry": "I" },
  { "category": "nonconvex uniform polyhedra", "name": "inverted snub dodecadodecahedron", "file": "u65", "symmetry": "I" },
  { "category": "nonconvex uniform polyhedra", "name": "great snub dodecicosidodecahedron", "file": "u69", "symmetry": "I" },
  { "category": "nonconvex uniform polyhedra", "name": "great inverted snub icosidodecahedron", "file": "u74", "symmetry": "I" },
  { "category": "nonconvex uniform polyhedra", "name": "great retrosnub icosidodecahedron", "file": "u79", "symmetry": "I" },
  { "category": "duals to uniform polyhedra", "name": "small hexacronic icositetrahedron", "file": "d18", "symmetry": "Oh" },
  { "category": "duals to uniform polyhedra", "name": "great hexacronic icositetrahedron", "file": "d19", "symmetry": "Oh" },
  { "category": "duals to uniform polyhedra", "name": "tetradyakishexahedron", "file": "d21", "symmetry": "Oh" },
  { "category": "duals to uniform polyhedra", "name": "great strombic icositetrahedron", "file": "d22", "symmetry": "Oh" },
  { "category": "duals to uniform polyhedra", "name": "small rhombihexacron", "file": "d23", "symmetry": "Oh" },
  { "category": "duals to uniform polyhedra", "name": "great triakisoctahedron", "file": "d24", "symmetry": "Oh" },
  { "category": "duals to uniform polyhedra", "name": "great disdyakisdodecahedron", "file": "d25", "symmetry": "Oh" },
  { "category": "duals to uniform polyhedra", "name": "great rhombihexacron", "file": "d26", "symmetry": "Oh" },
  { "category": "duals to uniform polyhedra", "name": "small triambic icosahedron", "file": "d35", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "small icosacronic hexecontahedron", "file": "d36", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "small hexagonal hexecontahedron", "file": "d37", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "small dodecacronic hexecontahedron", "file": "d38", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "medial rhombic triacontahedron", "file": "d41", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "small stellapentakisdodecahedron", "file": "d42", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "medial strombic hexecontahedron", "file": "d43", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "small rhombidodecacron", "file": "d44", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "medial triambic icosahedron", "file": "d46", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "great ditrigonal dodecacronic hexecontahedron", "file": "d47", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "small ditrigonal dodecacronic hexecontahedron", "file": "d48", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "medial icosacronic hexecontahedron", "file": "d49", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "tridyakisicosahedron", "file": "d50", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "great triambic icosahedron", "file": "d52", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "great icosacronic hexecontahedron", "file": "d53", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "small dodecicosacron", "file": "d55", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "great rhombic triacontahedron", "file": "d59", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "great stellapentakisdodecahedron", "file": "d60", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "rhombicosacron", "file": "d61", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "great pentakisdodekahedron", "file": "d63", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "medial disdyakistriacontahedron", "file": "d64", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "great dodecacronic hexecontahedron", "file": "d66", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "great dodecicosacron", "file": "d68", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "great triakisicosahedron", "file": "d71", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "great strombic hexecontahedron", "file": "d72", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "great disdyakistriacontahedron", "file": "d73", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "small hexagrammic hexecontahedron", "file": "d77", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "great rhombidodecacron", "file": "d78", "symmetry": "Ih" },
  { "category": "duals to uniform polyhedra", "name": "medial pentagonal hexecontahedron", "file": "d45", "symmetry": "I" },
  { "category": "duals to uniform polyhedra", "name": "medial hexagonal hexecontahedron", "file": "d51", "symmetry": "I" },
  { "category": "duals to uniform polyhedra", "name": "great pentagonal hexecontahedron", "file": "d62", "symmetry": "I" },
  { "category": "duals to uniform polyhedra", "name": "medial inverted pentagonal hexecontahedron", "file": "d65", "symmetry": "I" },
  { "category": "duals to uniform polyhedra", "name": "great hexagonal hexecontahedron", "file": "d69", "symmetry": "I" },
  { "category": "duals to uniform polyhedra", "name": "great inverted pentagonal hexecontahedron", "file": "d74", "symmetry": "I" },
  { "category": "duals to uniform polyhedra", "name": "great pentagrammic hexecontahedron", "file": "d79", "symmetry": "I" }
]
```

### 6.1 Category list, for the category dropdown

```json
["regular polyhedra", "archimedean solids", "archimedean duals", "nonconvex uniform polyhedra", "duals to uniform polyhedra"]
```

### 6.2 Dead tables (reproduce only for parity)

```json
{ "modifiers": ["", "e", "r", "s"],
  "representations": ["faces", "edges", "Escher's style", "spherical"] }
```

---

## 7. JS PORTING NOTES

1. **Flat array + index maps, not a ragged 3-D array.** The JSON above is flat and carries `category` on every row. If you need the original `(cat, i)` addressing (saved-file round-trips and `DlgSelectPoly` both use it), derive it once:
   ```js
   const CATEGORIES = [...new Set(CATALOG.map(e => e.category))]; // preserves source order = the 5 labels
   const BY_CAT = CATEGORIES.map(c => CATALOG.filter(e => e.category === c));
   ```
   `BY_CAT[cat][i]` then matches `poly[cat][i]` element-for-element, including within-category order.

2. **Preserve source order exactly.** Order is semantic in three places: `findPolyByName`'s first-match scan, the persisted `(cat, i)` pair if you ever serialize it, and the thumbnail grid layout. Do not sort alphabetically. Note in particular that categories 3 and 4 are *not* in numeric file order — the `Oh` block comes first, then the `Ih` block, then the chiral `I` block appended at the end (`u45, u51, u62, u65, u69, u74, u79`).

3. **Do not "fix" the typos.** `"truncated ochahedron"`, `"truncated icosidodechedon"`, `"great pentakisdodekahedron"` are the persisted identifiers. If you want correct spelling in the UI, add a separate `displayName` field and keep `name` as the lookup key.

4. **`equalsIgnoreCase` vs `toLowerCase()`.** Java's `equalsIgnoreCase` is locale-independent per-char case folding. All catalog names are ASCII, so `a.toLowerCase() === b.toLowerCase()` is equivalent here — but avoid `toLocaleLowerCase()` (Turkish dotless-i would break `"icosahedron"` under `tr` locale). Use:
   ```js
   const findPolyByName = n => {
     const k = String(n).toLowerCase();
     const idx = CATALOG.findIndex(e => e.name.toLowerCase() === k);
     return idx < 0 ? null : { cat: CATEGORIES.indexOf(CATALOG[idx].category),
                               i: BY_CAT[...].indexOf(...) };
   };
   ```
   and **return `null` / throw a typed error** rather than reproducing the Java NPE at `StellationMain` line 1181. Remember there are two callers with different discipline (§2.1): `StellationController.open` line 301 null-checks and aborts; `StellationMain` line 1180 does not, and the string it feeds in can be the sentinel `"__PLANES"`, which is never a catalog name. In the port, branch on the `PLANES_SOURCE` sentinel *before* doing a catalog lookup.

5. **`setCategory` uses `equals`, `findPolyByName` uses `equalsIgnoreCase`.** Two different comparison rules in the same tiny class. Keep them distinct or you will change behaviour on a mixed-case category string.

6. **Silent fallback to index 0.** `setCategory`/`setRepresentation` return `0` for an unknown name instead of signalling. In JS prefer returning `-1`/`null` and having the caller decide; if you must match Java exactly, comment the fallback loudly.

7. **`getCategories()` leaks the live static array.** Java returns the mutable `categories[]` itself, not a clone — a caller could corrupt the global table. In JS, freeze the module data: `Object.freeze(CATALOG); CATALOG.forEach(Object.freeze);` and return a copy from any accessor.

8. **Static mutable cursor state.** `category`/`representation` are per-instance, but both `StellationMain` (line 223) and `StellationController` (line 78) and `DlgSelectPoly` (line 58) each construct their own `new PolyNames()`, so the cursors are independent while the `poly[][][]` table is shared static. In JS, drop the cursor entirely and pass `(cat, i)` explicitly; the single-arg `name(int i)` / `fname(int i)` overloads exist only to serve the cursor and have no callers worth preserving.

9. **Resource paths become fetch URLs.** `getClass().getResourceAsStream("/images/off/u27.off")` → `fetch("images/off/u27.off")` (or a bundler `import.meta.url` reference). Java returns `null` for a missing resource and the code logs `"ImageLoader.loadFromJar getResourceAsStream failed on " + imageName` and continues with a null image; `fetch` rejects/404s instead — wrap it and keep going, so one bad asset doesn't blank the grid. Since §5.2 shows nothing is missing, this path should never fire.

10. **Symmetry string joining and splitting.** `symm + "/" + symm` then `StringTokenizer(s, " /", false)`. The JS equivalent must collapse consecutive delimiters: `s.split(/[\s/]+/).filter(Boolean)` — a naive `s.split("/")` on `"Ih / I"` yields `["Ih ", " I"]` with stray spaces and will fail the downstream `symmetry.equals("Ih")` checks in the `Symmetry` port. Trim/normalize before comparing.

11. **Zero floats here.** This module is pure strings and small ints; none of the float/double concerns from the geometry specs apply. The only numeric hazard is treating `"u06"` as a number — keep file ids as **strings** (leading zero is significant: the file is `u06.off`, not `u6.off`).

12. **Consider preloading a manifest.** The 121 referenced `.off` files total ~483 KB and the 121 `_tmb.gif` thumbnails ~306 KB (the full 150-file directories are 888 KB and 636 KB). A JSON manifest that inlines the OFF geometry (or a single concatenated bundle) avoids 121 round-trips; the catalog JSON above is the natural index for it, keyed on `file`.

13. **Re-enabling the commented-out solids is not free.** See §5.3(b)/(c) — the 2-element literals lack the symmetry column, and every excluded solid has centre-crossing (hemi) face planes that the stellation engine was not written to handle.

---

## 8. UNCERTAIN

- **UNCERTAIN:** Whether the three commented-out category labels (`"tetrahedral symmetry"`, `"octahedral symmetry"`, `"icosahedral symmetry"`) ever had corresponding `poly[][][]` sub-arrays. There is no trace of them in the table — the array has exactly 5 sub-arrays — so I could not determine whether they were an abandoned reorganization or planned-but-never-built.
- **UNCERTAIN:** Whether the `d##` orphans in group (a) of §5.3 (`d06, d10, d11, d27, d28, d39, d40, d57, d58`) were deliberately omitted because they are duals of solids already listed under `u##`, or simply overlooked. The source contains no comment either way; my grouping is inferred from the duality pattern, not stated in the code.
- **UNCERTAIN:** The exact provenance/vintage of `modifiers[] = {"", "e", "r", "s"}`. The letters look like file-name suffixes for alternate renderings (edges / ? / spherical), matching `representations[]` positionally, but no code uses them so I could not confirm the intended mapping.
- **UNCERTAIN:** I read `PolyNames.java` in full and the direct consumers listed at the top, but did not audit the JSweet transpilation path (`jsweet-errors.txt`, `build.xml`) to see whether an earlier JS port already emitted this table in a different shape.
