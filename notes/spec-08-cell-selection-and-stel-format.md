# Spec 08 — The `.stel` file format and the cell-selection string grammar

Reverse-engineered from source, for a faithful JS/WebGL reimplementation.

**Primary sources read (absolute paths):**

| Role | File |
|---|---|
| cells-string **writer** | `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/ui/java/pvs/polyhedra/stellation/ui/SelectionPanel.java` (`makeStellationName_v2`, `writeLayer_v2`, `writeCell_v2`) |
| cells-string **parser** | same file (`parseCells_v2`, `parseLayer_v2`, `parseCell_v2`, `isNumber`) |
| index space owner | `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/ui/java/pvs/polyhedra/stellation/ui/Selection.java` (`init()`, `getCells()`, `setSelectedSubCells()`) |
| per-cell flag object | `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/main/java/pvs/polyhedra/stellation/SelectionCell.java` |
| `.stel` open/save | `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/main/java/pvs/polyhedra/stellation/StellationController.java` (`open`, `save`, `makeStreamTokenizer`, `setSymmetry`) |
| tokenizer | `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/main/java/pvs/utils/FixedStreamTokenizer.java` |
| planes helpers | `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/main/java/pvs/polyhedra/stellation/Utils.java` (`parsePlanes`, `getPlanesString`, `getString`) |
| polyhedron name table | `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/main/java/pvs/polyhedra/stellation/PolyNames.java` |
| cell-index provenance | `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/main/java/pvs/polyhedra/Stellation.java` (`makeCells2`, `makeSymmetricalCells`, `makeSymmetricalSubCells`, `makeConnectivityGraph`, `getStellation`, `readStellations`, `parseStellationLine`), `SSCell.java` |
| legacy name format | `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/ui/java/pvs/polyhedra/ui/StellationUI.java` (`makeStellationName`) |
| UI glue | `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/ui/java/pvs/polyhedra/stellation/ui/StellationMain.java` (`onOpen`, `save`, `startStellationThread`, `showDiagram`) |

Samples: `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/samples/sample_0{1..4}.stel`.

---

## 0. The four sample files (verbatim, LF-terminated, no BOM, no CR)

`sample_01.stel` (173 bytes), `sample_02.stel` (189), `sample_03.stel` (196), `sample_04.stel` (219).
Every file is exactly 5 lines, each ending `\n`:

```
// stellation generated from polyhedron icosahedron
// exported from Stellation Program by Vladimir.Bulatov@gmail.com
polyhedron "icosahedron"
symmetry "Ih / I"
cells "{0}"
```

```
polyhedron "icosahedron"           symmetry "Ih / I"    cells "{0,1,2,3,4,5(1[1])}"        (sample_02)
polyhedron "truncated dodecahedron" symmetry "Ih / Ih"  cells "{0}"                        (sample_03)
polyhedron "truncated dodecahedron" symmetry "Ih / I"   cells "{0,1,2,3,4,5,6(2,3)7(3[1])}" (sample_04)
```

---

## 1. `.stel` file grammar

### 1.1 Lexical layer — `FixedStreamTokenizer`

`StellationController.makeStreamTokenizer(Reader)` builds the lexer. Exact configuration
(constructor defaults **plus** the explicit calls):

```java
static FixedStreamTokenizer makeStreamTokenizer(Reader r){
    FixedStreamTokenizer st = new FixedStreamTokenizer(r);
    st.whitespaceChars((int)'=',(int)'=');
    st.slashSlashComments(true);
    st.slashStarComments(true);
    st.eolIsSignificant(false);
    st.quoteChar('"');
    st.wordChars('_','_');
    st.wordChars('0','9');
    st.wordChars('-','-');
    st.wordChars('.','.');
    return st;
}
```

Constructor defaults (`private FixedStreamTokenizer()`):
`wordChars('a','z'); wordChars('A','Z'); wordChars(128+32,255); whitespaceChars(0,' '); commentChar('/'); quoteChar('"'); quoteChar('\'');`
and **`parseNumbers()` is deliberately NOT called** — the source comment says
`// VB original tokenizer don't parse scientific notation correctly / so, we stop it from parsing numbers`.

Resulting character classes (byte values 0..255; ≥256 is treated as `CT_ALPHA`):

| Class | Characters |
|---|---|
| whitespace (`CT_WHITESPACE`) | `0x00`–`0x20` (incl. space, TAB, CR, LF) **and `=`** |
| word (`CT_ALPHA`) | `a`–`z`, `A`–`Z`, `0`–`9`, `_`, `-`, `.`, `0xA0`–`0xFF` |
| quote (`CT_QUOTE`) | `"` and `'` |
| comment (`CT_COMMENT`) | `/` |
| everything else | returned as a single-character token; `ttype == theChar`, `sval == null` |

Token types: `TT_EOF = -1`, `TT_EOL = '\n'` (never produced, `eolIsSignificant(false)`),
`TT_NUMBER = -2` (**never produced** — no `parseNumbers()`), `TT_WORD = -3`, `TT_NOTHING = -4`.
`lineno()` starts at 1 and increments on `\n` / `\r`.

**Lexer quirks that a JS port must reproduce (or at least tolerate):**

1. **`=` is whitespace.** `polyhedron = "icosahedron"` parses identically to `polyhedron "icosahedron"`.
2. **A lone `/` starts a line comment.** In `nextToken()`, on `/` the lexer peeks: `*` → block comment,
   `/` → line comment, **otherwise** it re-checks `(ct['/'] & CT_COMMENT) != 0` — which is true because
   the constructor called `commentChar('/')` — and swallows the rest of the line. So an *unquoted*
   `symmetry Ih / I` would lose `/ I`. All values in real files are quoted, so this never bites.
3. **`'` is also a quote char** and was never reset. An apostrophe anywhere outside a `"` string
   starts a single-quoted string.
4. **Backslash escapes are decoded inside quoted strings**: `\n \t \r \b \f \v \a` and octal `\0`–`\377`.
   A literal `\` in a value is therefore destructive. (Irrelevant for the current keyword set.)
5. **Quoted strings may span lines.** Bulatov patched the loop condition to
   `while (d >= 0 && d != ttype ) { // && d != '\n' && d != '\r') { // VB - strings may occupy several lines`.
   An unterminated `"` therefore swallows the rest of the file rather than ending at EOL.
6. Numbers are words: `0.01`, `-1.5`, `1e-3` all come back as `TT_WORD` with `sval` set;
   they are converted later with `Double.parseDouble`.
7. Word tokens stop at any non-word char, so `truncated dodecahedron` unquoted would yield two words —
   another reason values must be quoted.

### 1.2 Syntactic layer — EBNF

`StellationController.open(String path)` is a flat `while(st.nextToken() != TT_EOF)` loop over
`TT_WORD` tokens, so the format is an *unordered bag of key/value pairs*:

```ebnf
stel_file      = { statement } ;
statement      = keyword , value ;                (* '=' between them is legal: it is whitespace *)
keyword        = "polyhedron" | "planes" | "cells" | "symmetry" | "exportLengthUnit" ;
                                                  (* matched with String.equalsIgnoreCase *)
value          = quoted_string | word ;           (* open() just takes st.sval of the next token, so an
                                                     unquoted word is accepted too; all real files quote it *)

(* comments, anywhere: *)
comment        = "//" , { any - eol } , eol
               | "/*" , { any } , "*/" ;
```

Semantics of each key (later occurrences overwrite earlier ones — the loop just reassigns):

| Keyword | Value grammar | Meaning / consumer |
|---|---|---|
| `polyhedron` | free text, canonical name from `PolyNames.poly[cat][i][0]` | selects the base polyhedron (§3) |
| `planes` | `"[(nx,ny,nz)(nx,ny,nz,px,py,pz)...]"` | alternative source; `Utils.parsePlanes` |
| `symmetry` | `"<polySym>" ("/"|" ") "<stellSym>"` e.g. `"Ih / I"` or `"Ih/I"` | `setSymmetry` (§1.4) |
| `cells` | the cell-selection string, §4 | which cells are lit |
| `exportLengthUnit` | decimal, e.g. `"0.01"` | `Double.parseDouble`; scale (metres) applied on export. Default `DEFAULT_EXPORT_LENGTH_UNIT = 0.01` |

Unknown keywords are **not fatal**: `open()` prints `"wrong parameter in stellation: \"" + st.sval + "\""`
and, because it does not consume the value, the following quoted string hits the `default:` branch
and prints `"wrong character in stellation: \"" + (char)st.ttype + "\""`. Parsing continues.

### 1.3 `open()` — step by step

```
open(path):
  1. tokenize whole file, collecting the last value seen for each of:
       planes, polyhedronName, cells, symmetry, exportLengthUnit   (all null-initialised)
  2. if polyhedronName != null:                       # polyhedron WINS over planes
        cat = PolyNames.findPolyByName(polyhedronName)
        if cat == null: print "can't find polyhedron by name: %s"; RETURN null   # abort load
        response = polyhedronName + "/" + cells
     elif planes != null:
        response = "__PLANES" + "/" + cells           # StellationController.PLANES_SOURCE
        m_canonicalPlanes = Utils.parsePlanes(planes)
     else:
        print "****no polyhedron or planes was found in the file******* - ignorng"
        RETURN null
  3. m_exportLengthUnit = (exportLengthUnit != null) ? parseDouble(exportLengthUnit) : 0.01
  4. setSymmetry(symmetry)                            # NPE if the file has no symmetry line
  5. return response
```

`StellationMain.onOpen()` then does:

```java
StringTokenizer st = new StringTokenizer( response, "/", false );
String polyName = st.nextToken();
String cells    = st.nextToken();
...
int [] cat = PolyNames.findPolyByName(polyName);
Output.out.println("found: " + cat[0] + ", " + cat[1]);
currentCategory = cat[0]; currentPoly = cat[1];
initializePoly( false );
startStellationThread(cells);          // -> selection.setCells(cells) after the stellation is built
```

Known defects in this path (reproduce or fix deliberately, but know they exist):

* **`/`-joined response is a hack.** Any `/` inside a polyhedron name or cells string would split wrongly.
  Neither currently contains one.
* **Planes files crash `onOpen`.** `PolyNames.findPolyByName("__PLANES")` returns `null`,
  then `cat[0]` throws `NullPointerException` (caught by the outer `catch(Exception)` in `onOpen`,
  so the file silently fails to load).
* **Missing `cells` line ⇒ literal string `"null"`.** `response` becomes `"icosahedron/null"`;
  `setCells("null")` then throws `Throwable("wrong start of cell: 'null'")` and the selection stays empty.
* **Missing `symmetry` line ⇒ `NullPointerException`** inside `setSymmetry` (`new StringTokenizer(null, " /")`).
* **Order matters for the reader only in that `polyhedron` shadows `planes`** — if both keys are present
  the `planes` value is parsed only in the `else` branch, i.e. it is ignored entirely.

### 1.4 `setSymmetry`

```java
public void setSymmetry(String symmetry){
    StringTokenizer st = new StringTokenizer(symmetry, " /", false);
    m_polySymmetry = st.nextToken();      // e.g. "Ih"
    m_stellationSymmetry = st.nextToken();// e.g. "I"
}
```

Delimiters are space and slash, `returnDelims=false`, so `"Ih / I"`, `"Ih/I"`, `"Ih  /  I"` are all equivalent.
Group names are the ones `Symmetry.getMatrices(String)` recognises, matched with `String.equals` (case-sensitive):
`E`/`C1`, `Ci`/`S2`, `C2`, `C2v`, `Cs`, `O`, `Oh`, `D3d(O)`, `D3(O)`, `C3v(O)`, `C3(O)`, `D2(O)`, `D2h(O)`,
`C2(O)`, `C2v(O)`, `I`, `Ih`, `D5d(I)`, `D5(I)`, `C5(I)`, `C5v(I)`, … (full list in `Symmetry.getMatrices`).
Note names containing `(` `)` — harmless here because the value is quoted.

`m_polySymmetry` is the symmetry used to build the cells (`makeCells2(fullSymmetry, …)`);
`m_stellationSymmetry` is the *sub*-symmetry used to split each cell into subcells.

### 1.5 `save()` — what the current code writes (and what the samples show)

```java
public void save( File file, String polyhedronName ){
    OutputStream out = new FileOutputStream(file);
    PrintWriter pw = new PrintWriter(out);
    if ( polyhedronName == null ) {
        pw.println("// stellation generated from a set of planes");
        pw.println("// exported from Stellation Program by Vladimir.Bulatov@gmail.com");
        pw.println("planes \"" + getPlanesString(m_canonicalPlanes) + "\"");
    } else {
        pw.println("// stellation generated from polyhedron " + polyhedronName);
        pw.println("// exported from Stellation Program by Vladimir.Bulatov@gmail.com");
        pw.println("polyhedron \"" + polyhedronName  + "\"");
    }
    pw.println( "symmetry \"" + m_polySymmetry + "/" + m_stellationSymmetry + "\"" );
    // pw.printf("cells \"%s\"\n", selection.getCells());          <-- LINE 226, COMMENTED OUT
    pw.println( "exportLengthUnit \"" + getString(m_exportLengthUnit) + "\"" );
    pw.close();
}
```

Mismatches against the sample files — items 1–2 show **the samples were produced by an older build**;
item 3 is a separate writer bug, not a sample mismatch:

1. The current `save()` **does not write the `cells` line at all** (line 226 is commented out), so a
   round-trip through today's Java loses the whole selection. The JS port must emit it:
   `cells "<makeStellationName_v2(selection)>"`.
2. Current `save()` writes `symmetry "Ih/I"` (no spaces) and adds `exportLengthUnit`;
   the samples have `symmetry "Ih / I"` and no `exportLengthUnit`. Both are accepted by the reader.
3. `polyhedronName` in `StellationMain` is only ever assigned in the `SOURCE_POLY` branch of
   `initializePoly()` and is never reset to `null` when the user switches to `SOURCE_PLANES`,
   so a planes-based stellation saved after a polyhedron-based one is written as a `polyhedron` file.

Also written on save: a sidecar thumbnail `writeThumbnail(stellationPath + ".png")`, and the previous
file is renamed to `<path>.stel.bak` (`EXT_BAK = ".bak"`). Extension is forced: `EXT_STEL = ".stel"`,
new/unsaved documents are called `NEW_FILE = "stellation.stel"`.

**Recommended canonical writer for the JS port** (superset-compatible with both eras):

```
// stellation generated from polyhedron <name>
// exported from Stellation Program by Vladimir.Bulatov@gmail.com
polyhedron "<name>"
symmetry "<polySym> / <stellSym>"
cells "<cellsString>"
exportLengthUnit "<unit>"
```

---

## 2. The index space: what `(layer, cell, subcell)` refers to

The cells string is a set of triples into a ragged 3-D array built in `Selection.init()` from
`allcells` (the result of `Stellation.makeCells2`):

```java
selectableSubCells = new SelectionCell[nlayers][][];            // [layer][cell][subcell]
for(int l = 0; l < nlayers; l++){
    Vector layer = (Vector)allcells.elementAt(l);
    selectableSubCells[l] = new SelectionCell[layer.size()][];
    for(int c = 0; c < layer.size(); c++){
        SSCell ssc = (SSCell)layer.elementAt(c);
        selectableSubCells[l][c] = new SelectionCell[ssc.subCells.length];
    }
}
```

* **layer** `l` — index into `allcells` (a `java.util.Vector` of layers). Layer *i* is the set of stellation
  cells whose top facets lie in the *i*-th "layer" of the face arrangement (`makeLayers(faces)`);
  layer 0 is the core. Layer count is capped by `StellationController.maxLayer`, whose field initializer is
  `1000`. (The UI text field is `new TextField(5)` with **no initial text** and no `setText`, so
  `Integer.valueOf(tfMaxLayer.getText())` throws, `mi` stays `0`, and `createStellation`'s `if(mi > 0)`
  guard leaves the `1000` in place — the "UI default" is empty, not `1000`.)
* **cell** `c` — index into that layer's `Vector` of `SSCell`. An `SSCell` here is a **full orbit under
  `m_polySymmetry`** (e.g. `Ih`): `makeSymmetricalCells(cells, fullSymmetry, stellSymmetry)`.
  These are the columns you see in the Selection canvas, labelled with `String.valueOf(j)`.
* **subcell** `s` — index into `SSCell.subCells[]`, i.e. the split of that orbit into
  **orbits of `m_stellationSymmetry`**: `Stellation.makeSymmetricalSubCells(cell, symmetry)`, stored via
  `SSCell.setSubCells(Vector)` which also sets `subCells[i].superCell = this`.
  With `Ih / I` a mirror-symmetric orbit yields **1** subcell; a chiral orbit splits into an
  **enantiomorphic pair, 2** subcells. With `Ih / Ih` every cell has exactly 1 subcell.

Selection is stored per subcell only: `SelectionCell { int isSelected; SSCell cell; int index; }`
with `setSelected(int)`, `getSelected()`, `invertSelection()` (`isSelected = 1 - isSelected`).

**A second, flattened index space also exists** and must not be confused with the string's:
`Selection.getCells()` returns `int[n][2]` pairs `(layer, scount)` where `scount` counts subcells
*consecutively across all cells of the layer* (`selectableCells[l][scount]`). That flat order is
exactly the order of `StellationController.makeSubcells()`:

```java
for each layer l: for each cell c in layer: for each s in cell.subCells: sublayer.add(cell.subCells[s]);
```

and is what `Stellation.getStellation(Vector cells, int[][] stellation)` consumes:

```java
scells[i] = (SSCell)((Vector)cells.elementAt(stellation[i][0])).elementAt(stellation[i][1]);
```

So: **string ⇒ `[layer][cell][subcell]` flags ⇒ (flatten in order) ⇒ `(layer, flatIndex)` pairs ⇒ `SSCell[]` ⇒ geometry.**
`SSCell.setIndex(layer, index)` (called from `makeConnectivityGraph`) stores the *flat* pair on the subcell.

**Ordering stability warning (critical for round-trip fidelity).** Cell indices are only meaningful
relative to the exact ordering produced by the generator:

* `makeSymmetricalCells` / `makeSymmetricalSubCells` pull seed cells out of a `FastHashtable`
  (`table.elements().nextElement()`) — hash order — and then sort with
  `QSort.quickSort(scells, 0, size-1, (SSCell)scells.elementAt(0))` using `SSCell.compare`.
* `SSCell.compare` = `strictCompare` (number of primitive `SCell`s → per-cell `getIndex()` → `getNFacets()`
  → `getNVertices()`) then volume with `static final double EPS = 1.e-4`; **equal-comparing cells return 0
  and their relative order is left to the quicksort/hash order.** `SSCell.old_compare` is dead code (no
  caller anywhere in the tree). Its `static double TOL = 0.0001` is *numerically the same 1e-4* as `EPS` —
  only a separate, non-`final` field — but its **ordering is different**: volume descending (`d = v2 - v1`),
  then area, then `handedness`. Do not port it.

⇒ If the JS port's cell ordering differs at all, old `.stel` files decode to a *different* solid.
Port `SSCell.compare` and the sort exactly, and make tie-breaking deterministic (see JS notes §8).

---

## 3. `PolyNames.findPolyByName`

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

* `poly` is `static String[][][]` — `[category][entry][field]`, fields `NAME=0`, `FNAME=1`, `SYMMETRY=2`.
* Comparison is **case-insensitive, whole-string, no trimming, no normalisation of spaces**.
  `"icosahedron"` ✓, `"Icosahedron"` ✓, `" icosahedron"` ✗, `"u27"` ✗ (fname is not searched).
* Returns `int[]{category, index}` or `null`.
* The 5 categories (`categories[]`): `"regular polyhedra"`, `"archimedean solids"`, `"archimedean duals"`,
  `"nonconvex uniform polyhedra"`, `"duals to uniform polyhedra"`.
* Downstream use in `StellationMain`:
  `polyhedronName = polyNames.name(cat,i)` (canonical spelling, so saved names always round-trip);
  `fname = polyNames.fname(cat,i)` → the model is loaded from the jar resource
  `"/images/off/" + fname + ".off"` (e.g. `icosahedron → u27 → /images/off/u27.off`);
  `symm = polyNames.symmetry(cat,i)` → on a *fresh* selection (`initializePoly(true)`) the symmetry
  is initialised to `symm + "/" + symm`, but on **file open** `initializePoly(false)` is used so the
  symmetry from the file survives.
* Relevant sample rows: `{"icosahedron","u27","Ih"}`, `{"truncated dodecahedron","u31","Ih"}`.
* Note the typos preserved in the table (`"truncated ochahedron"`, `"truncated icosidodechedon"`,
  `"great pentakisdodekahedron"`) — the JS port must keep the exact strings or old files break.

---

## 4. The cells string — formal grammar

Alphabet actually emitted: `{ } ( ) [ ] ,` and decimal digits. **No whitespace, no `*`, no `-`.**

### 4.1 EBNF — the language the *writer* emits (canonical form)

```ebnf
cells        = "{" , [ layer , { layer } ] , "}" ;       (* the separator rule below says where ',' goes;
                                                            it is not expressible as one EBNF separator  *)

(* two kinds of layer entries: *)
layer        = full_layer | partial_layer ;
full_layer   = index ;                                   (* every subcell of every cell is on   *)
partial_layer= index , "(" , cell , { cell } , ")" ;     (* see separator rules below            *)

cell         = full_cell | partial_cell ;
full_cell    = index ;                                   (* every subcell of this cell is on     *)
partial_cell = index , "[" , index , { "," , index } , "]" ;

index        = digit , { digit } ;                       (* decimal, no sign, no leading '+'     *)
digit        = "0".."9" ;
```

**Separator rule (exact, and asymmetric — this is the subtle part).**
A comma is emitted *only after an entry that was written as a bare index*, i.e. after a `full_layer`
or a `full_cell`, and only if another entry follows. After a `partial_layer` (`…)`) or a
`partial_cell` (`…]`) **no comma is emitted and none may appear**. From `writeLayer_v2`/`makeStellationName_v2`:

```java
if(layer.equals("(*)")){ needComma = true; }      // full layer  -> comma before next
else { sb.append(layer); needComma = false; }      // partial layer -> NO comma before next
```

So, legal: `{0,1,2,3,4,5(1[1])}` · `{0,1,2,3,4,5,6(2,3)7(3[1])}` · `{5(1[1])6}` · `{5(0,1[1])}`
Illegal (parser throws): `{5(1[1]),6}` · `{5(1[1],0)}` · `{ 0 }` · `{0-2}` · `{3(*)}`

(Verified by executing a line-for-line port of `parseCells_v2` on each of these strings.)

### 4.2 EBNF — the language the *parser* actually accepts (a small superset)

The parser is token-driven; the practical differences from §4.1 are:

* A trailing comma before `}` or end-of-string is tolerated: `{0,1,}` ⇒ same as `{0,1}`.
  (Mechanism: `parseLayer_v2(1)` consumes the trailing `,` as its own terminator and returns it; the outer
  loop then reads `}` and returns. The "outer `while(st.hasMoreTokens())` simply runs out" case is the
  *unterminated* `{0,1,` — which is a different failure mode, see §4.5.)
* Anything after the closing `}` is ignored: `{0}extra` ⇒ `{0}`.
* Within `[...]`, commas are optional and repeated commas are ignored (`else if(",".equals(token)){ /* do nothing */ }`),
  so `[0,1]`, `[01]`?? — careful: `[01]` is the single number 1 in decimal-with-leading-zero, **not** two
  subcells. `[0 1]` is invalid (space is not a delimiter). `[0,,1]` is accepted.
* Duplicate/out-of-order entries are accepted; the result is a set of flags, so `{0,0}` == `{0}`.
* A missing `}` at the end is *not* an error (see error semantics, §4.5).

### 4.3 Decoding algorithm (`parseCells_v2` and friends), literal

Tokenizer: `new StringTokenizer(cells, "(),-{}[]", true)` — delimiter set is exactly
`( ) , - { } [ ]`, `returnDelims = true`. Java `StringTokenizer` returns each delimiter as its own
one-character token and never returns an empty token; **whitespace is *not* a delimiter here**, so a
space becomes part of a "number" token and then fails `isNumber`.

```java
private static boolean isNumber(String str){
    for(int i =0; i < str.length();i++){
        if(str.charAt(i) < '0' || str.charAt(i) >'9') return false;
    }
    return true;
}
```

Pseudocode (shape = the ragged `[layer][cell][subcell]` dimensions from §2, all flags start 0):

```
parseCells_v2(s, shape):
    index = zeros(shape)                      # ragged int[l][c][k]
    tokens = tokenize(s, delims="(),-{}[]", keepDelims=true)
    try:
        if tokens empty:                      throw Throwable("wrong cell notation")
        t = next()
        if t != "{":                          throw Throwable("wrong start of cell: '"+t+"'")
        while has_next():
            t = next()
            if t == "}":                      return index
            if !isNumber(t):                  throw Throwable("wrong expression of layer: '"+t+"'")
            layer = int(t)
            if layer < 0 or layer >= nLayers: throw Throwable("layer number: "+layer+" is out of bounds")
            t = parseLayer(layer)
            if t == "}":                      return index
    catch (Exception e):                      e.printStackTrace()      # NOTE: does NOT catch Throwable
    return index

parseLayer(layer):                            # returns the terminator token it consumed
    t = next()
    if t == "," or t == "}":                  # bare layer index -> select EVERYTHING in the layer
        for c in 0..nCells(layer)-1:
            for k in 0..nSub(layer,c)-1: index[layer][c][k] = 1
        return t
    if t != "(":                              throw Throwable("illegal start of cell: '"+t+"' in layer "+layer)
    while has_next():
        t = next()
        if t == ")":                          return ")"                  # end of layer
        if !isNumber(t):                      throw Throwable("illegal cell expression '"+t+"' in layer "+layer)
        cell = int(t)
        if !(0 <= cell < nCells(layer)):      throw Throwable("cell number: "+cell+" in layer "+layer+" is out of bounds")
        last = parseCell(layer, cell)
        if last == ")":                       return ")"
    return ""

parseCell(layer, cell):                       # returns the terminator token it consumed
    t = next()
    if t == "," or t == ")":                  # bare cell index -> select ALL subcells of this cell
        for i in 0..nCells(layer)-1:          # (outer loop index i is UNUSED — see note)
            for k in 0..nSub(layer,cell)-1: index[layer][cell][k] = 1
        return t
    if t != "[":                              throw Throwable("illegal start of subcell: '"+t+"' in layer "+layer+" cell "+cell)
    while has_next():
        t = next()
        if t == "]":                          return "]"
        if t == ",":                          continue
        if !isNumber(t):                      throw Throwable("illegal cell expression: '"+t+"' in layer "+layer)
        index[layer][cell][int(t)] = 1        # NO bounds check -> ArrayIndexOutOfBoundsException possible
    return ""
```

Note the redundant outer loop in `parseCell_v2`'s "complete cell" branch — it iterates
`index[layer].length` times over the same inner assignment. Harmless; almost certainly a copy/paste
slip from `parseLayer_v2`. A port may drop it.

Note the **missing bounds check on `subcell`**: `index[layer][cell][subcell] = 1` throws
`ArrayIndexOutOfBoundsException` if the string was written under a different stellation symmetry
(e.g. `Ih/I`, 2 subcells) and reloaded under a coarser one (`Ih/Ih`, 1 subcell).

Then `Selection.setSelectedSubCells(int[][][] index)` copies the flags into the `SelectionCell` grid
and repaints; `SelectionPanel.doParseCells()` finally calls `canvas.getCells()` → `main.update(...)`
which rebuilds the 3-D model.

### 4.4 Encoding algorithm (`makeStellationName_v2`), literal

```
writeCell(subFlags):                          # -> "[]" | "[*]" | "[i,j,...]"
    if no flag == 0:  return "[*]"            # ALL subcells on   (also for a 0-length array!)
    else: return "[" + comma-joined indices of flags == 1 + "]"   # "" if none -> "[]"

writeLayer(cellFlags[][]):                    # -> "()" | "(*)" | "(...)"
    s = "("; hasEmptyCells = false; hasPartialCells = false; needComma = false
    for c, sub in enumerate(cells):
        str = writeCell(sub)
        if str == "[]": hasEmptyCells = true; continue          # skip empty cells
        if needComma: s += ","
        s += str(c)
        if str == "[*]": needComma = true                       # full cell: bare index, comma follows
        else: hasPartialCells = true; s += str; needComma = false
    s += ")"
    if !hasEmptyCells && !hasPartialCells: return "(*)"         # whole layer on
    else: return s

makeStellationName_v2(index[][][]):
    s = "{"; needComma = false
    for l, layer in enumerate(index):
        str = writeLayer(layer)
        if str == "()": continue                                # empty layer: omit entirely
        if needComma: s += ","
        s += str(l)
        if str == "(*)": needComma = true                       # full layer: bare index, comma follows
        else: s += str; needComma = false
    return s + "}"
```

`"(*)"`, `"[*]"`, `"()"`, `"[]"` are **internal sentinels only** — they are always replaced by the
compact form and never reach the output, which is why `*` never appears in a real cells string
(and the parser rejects it).

The encoding is **canonicalising**: `{3(0[0,1])}` re-encodes to `{3}` when layer 3 has one cell with
two subcells (verified). So a JS port need not preserve the exact input spelling, only the flag set.

Degenerate inputs: a cell with `subCells.length == 0` encodes as `[*]` (“all zero subcells are on”),
and a layer with `0` cells encodes as `(*)`. Both would be decoded as *fully selected*; neither
occurs in practice.

### 4.5 Error semantics (a real Java-ism, reproduce deliberately)

The helpers `throw new Throwable(...)` — **`java.lang.Throwable`, not `Exception`** — while
`parseCells_v2` wraps its body in `try { … } catch (Exception e) { e.printStackTrace(); }`.
Consequently:

| Failure | Caught where | Effect on the selection |
|---|---|---|
| Explicit `throw new Throwable("…")` (bad char, bad layer, bad cell, missing `{`) | **not** caught by `catch(Exception)`; propagates out of `parseCells_v2` to `doParseCells`'s `catch(Throwable ex)` | `setSelectedSubCells` is never called → **selection unchanged** |
| `NoSuchElementException` (string truncated, e.g. `"{0,1"`) | `catch(Exception)` inside `parseCells_v2` | partially-filled index **is returned and applied** |
| `ArrayIndexOutOfBoundsException` (subcell index too large) | ditto | partial index applied |
| `NumberFormatException` (`Integer.valueOf` overflow) | ditto | partial index applied |

`SelectionPanel.doParseCells()` also maps the empty text field to `"{}"`:
`if(str.length() == 0) str = "{}";`.

---

## 5. Worked example — decoding `samples/sample_02.stel`

File: `polyhedron "icosahedron"`, `symmetry "Ih / I"`, `cells "{0,1,2,3,4,5(1[1])}"`.

**Setup.** `PolyNames.findPolyByName("icosahedron")` → `{0, 3}` (category 0 "regular polyhedra",
entry 3) → `fname = "u27"` → load `/images/off/u27.off`. `setSymmetry("Ih / I")` →
`m_polySymmetry = "Ih"`, `m_stellationSymmetry = "I"`. Build `allcells = makeCells2("Ih","I",maxLayer)`.
Because `Ih ⊃ I` with index 2, each `SSCell` has 1 subcell (achiral orbit) or 2 (chiral pair).

**Token stream** (`StringTokenizer(s,"(),-{}[]",true)`), verified:

```
{  0  ,  1  ,  2  ,  3  ,  4  ,  5  (  1  [  1  ]  )  }
```

**Trace:**

| step | token | handler | action |
|---|---|---|---|
| 1 | `{` | `parseCells_v2` | ok, start |
| 2 | `0` | `parseCells_v2` | `layer = 0` → `parseLayer_v2(0)` |
| 3 | `,` | `parseLayer_v2` | bare layer → set **all** `index[0][c][k] = 1`; return `,` |
| 4 | `1` | `parseCells_v2` | `layer = 1` → all of layer 1 on |
| 5–8 | `2` `3` `4` | same | all of layers 2, 3, 4 on |
| 9 | `5` | `parseCells_v2` | `layer = 5` → `parseLayer_v2(5)` |
| 10 | `(` | `parseLayer_v2` | partial layer |
| 11 | `1` | `parseLayer_v2` | `cell = 1` → `parseCell_v2(5,1)` |
| 12 | `[` | `parseCell_v2` | partial cell |
| 13 | `1` | `parseCell_v2` | `index[5][1][1] = 1` |
| 14 | `]` | `parseCell_v2` | return `]` |
| 15 | `)` | `parseLayer_v2` | end of layer 5, return `)` |
| 16 | `}` | `parseCells_v2` | return `index` |

**Result** — the selected `(layer, cell, subcell)` triples are:

```
layer 0 : every (0, c, s)        for all c, s        # the icosahedral core
layer 1 : every (1, c, s)
layer 2 : every (2, c, s)
layer 3 : every (3, c, s)
layer 4 : every (4, c, s)
layer 5 : exactly one triple, (5, 1, 1)
```

i.e. `allcells[0..4]` fully lit, plus the **second subcell (index 1) of the second cell (index 1) of
layer 5**. Because the stellation symmetry is `I` while the cells were built with `Ih`, cell `5(1)`
must have ≥ 2 subcells, i.e. it is a **chiral orbit split into an enantiomorphic pair**, and this
selection takes exactly one hand of the pair — which is why the file needs subcell notation at all
(under `Ih / Ih`, as in `sample_03`, every cell has exactly one subcell and `[...]` never appears).

Illustrative concrete shape (the *actual* per-layer cell counts for `u27` under `Ih/I` could not be
computed here — no JRE in this environment, see UNCERTAIN §9). With hypothetical shape
`[[1],[1],[1],[2],[1,2],[2,2,1],…]` the decoder produced, and the encoder round-tripped, exactly:

```
layer 0: [[1]]        layer 3: [[1, 1]]              layer 5: [[0,0],[0,1],[0]]
layer 1: [[1]]        layer 4: [[1], [1, 1]]         layer 6+: all zero
layer 2: [[1]]
makeStellationName_v2(...) == "{0,1,2,3,4,5(1[1])}"       # exact round-trip
```

**`sample_04`, `{0,1,2,3,4,5,6(2,3)7(3[1])}`** decodes to: layers 0–5 entirely on; in layer 6, cells 2
and 3 fully on (all their subcells) and every other cell off; in layer 7, only subcell 1 of cell 3.
Note the missing comma between `)` and `7` — mandatory, per §4.1.

**Downstream.** The flag grid is flattened by `Selection.getCells()` into `(layer, flatSubcellIndex)`
pairs, `Stellation.getStellation(subcells, pairs)` maps those to `SSCell[]`, and
`stellation.getPolyhedron(cells)` unions their primitive `SCell` geometry into the displayed solid.

---

## 6. Legacy / sibling formats you will meet in this codebase

Do not confuse these with the `.stel` `cells` string.

### 6.1 `SelectionPanel.makeStellationName_v1` / `parseCells` ("v1", no braces, no subcells)

Writer emits `0(*)1(0,2-5)` style: per layer `layer '(' … ')'`, `*` = whole layer, `a-b` = inclusive
range (emitted only when ≥ 3 adjacent cells are selected: `if(count > 2)`), no outer `{}` and no
subcell `[]`. Reader `parseCells(String, SelectionCell[][][])` uses
`new StringTokenizer(cells,"(),-",true)` and handles `*`, `-` ranges, and a `token.equals(" ")` branch.

That `" "` branch is **reachable, not dead** — precisely *because* space is not in the delimiter set, a run
consisting only of spaces between two delimiters is emitted as the single token `" "`. E.g. `0( , 1)`
tokenizes to `0` `(` `" "` `,` `" 1"` `)` (verified with a port of `StringTokenizer`); the `" 1"` token then
reaches `Integer.valueOf` and throws `NumberFormatException`.

Its output array is allocated `int[ind.length][ind[i].length]` — layer × **cell count**, taken from the *v2*
`SelectionCell[][][]` argument — while the only would-be consumer, `Selection.setSelectionIndex`, indexes
`selectableCells[i][j]` by **flat subcell index**. That latent shape mismatch never bites because
`makeStellationName_v1`, `parseCells`, and `Selection.setSelectionIndex` have **no callers anywhere in this
snapshot**; v1 plays no part in `.stel` I/O. The `-` in the v2 delimiter set is a leftover from v1;
v2 rejects `-`.

### 6.2 `StellationUI.makeStellationName(int[][])` — the letter format

Used only for the diagram window title, from the flattened `(layer, flatIndex)` pairs:

```java
int offset  = index % ('z'-'a'+1);      // 26
int segment = index / ('z'-'a'+1);
segment 0 -> 'a'+offset ;  1 -> 'A'+offset ;  2 -> "_" + ('a'+offset) ;  3 -> "__" + ('A'+offset)
```
The layer number is emitted **whenever it differs from the previous pair's layer**
(`if(stellation[i][0] != layer)`) — not once per string — then one letter per selected cell, e.g. `0a1ab`.
Note the integer division.

### 6.3 `Stellation.readStellations(String fname)` — a *different* file type

```java
public static int[][][] readStellations(String fname)   // one stellation per LINE
static int [][] parseStellationLine(String line)
```

Reads a plain text file line by line (`BufferedReader.readLine()`), each line describing **one**
stellation in the §6.2 letter format, returning `int[stellationIdx][cellIdx][2]` where each cell is
`{layer, letterIndex}`. Grammar per line, informally:

```ebnf
line = { digits , { lowercase_letter } } ;      (* e.g. "0a1ab2c" *)
```

Parsing details: it scans digits into `layer` (stopping at the first non-digit), then consumes
consecutive `'a'..'z'` emitting `{layer, ch - 'a'}` for each; it stops at the first character that is
neither. Consequences: **only lowercase `a`–`z` are decoded** — the `'A'`, `'_a'`, `'__A'` segments
that `makeStellationName` can emit are *not* readable back, so cell indices ≥ 26 cannot be expressed.
A line whose first char is not a digit yields `null` and is skipped (so comment lines starting with
`#` or `//` are silently dropped). Every character read is echoed to `System.out` (`System.out.println(b)`)
— extremely chatty. Empty result ⇒ `null` ⇒ line skipped. All exceptions are swallowed with
`e.printStackTrace(System.out)`.
Sole caller: `StellationUI.main` via the `-s <file with stellations>` batch flag.
`parseStellationLineOld` (unused) parsed `"<layer> <index> <layer> <index> …"` with delimiters
`" _,\n\r\t"` and `#` starting a comment.

### 6.4 `planes "…"` value grammar (`Utils.parsePlanes` / `getPlanesString`)

```ebnf
planes_value = "[" , { plane } , "]" ;
plane        = "(" , num , "," , num , "," , num ,                       (* normal only *)
               [ "," , num , "," , num , "," , num ] , ")" ;             (* normal + point *)
```
`new StringTokenizer(splanes, " ()[],", true)`; `[`, ` `, `,` are ignored, `(` clears the accumulator,
`)` flushes it: **exactly 3 numbers → `new Plane(new Vector3D(nx,ny,nz))`; exactly 6 → `new Plane(normal, point)`;
any other count is silently dropped.** Numbers via `Double.parseDouble`.
(Note `]` *is* a delimiter but is **not** in the ignore list — it falls into the `else` branch and is pushed
onto the coordinate accumulator as if it were a number. Harmless: it can only arrive after the final `)`,
and the accumulator is cleared by the next `(`.)
Writer `getPlanesString` emits the 3-number form when
`abs(norm.x-point.x)<EPS && abs(norm.y-point.y)<EPS && abs(norm.z-point.z)<EPS` with
`static final double EPS = 1.e-12;` and formats each number with `Utils.getString(double)`:
it finds the smallest `n` with `abs(u - floor(u+0.5)) < EPS` for `u = v*10^n`, **testing only `n = 0..9`**
(`for( ; n < 10; n++)`); if no `n` in that range matches, the loop exits with `n == 10`. It then formats
with `"%." + n + "f"` (shortest fixed-point spelling, no exponent) — so the widest output is `"%.10f"`.
`Utils.chop(double v)` returns `0` when `-1e-12 <= v <= 1e-12`, else `v`.

---

## 7. Reference implementation sketch (JS)

```js
// ---- decode ---------------------------------------------------------------
const CELL_DELIMS = new Set(['(', ')', ',', '-', '{', '}', '[', ']']);

function tokenizeCells(s) {                    // java.util.StringTokenizer(s, delims, true)
  const out = []; let cur = '';
  for (const ch of s) {
    if (CELL_DELIMS.has(ch)) { if (cur) { out.push(cur); cur = ''; } out.push(ch); }
    else cur += ch;
  }
  if (cur) out.push(cur);
  return out;                                   // never yields empty tokens
}
const isNumber = t => /^[0-9]*$/.test(t);       // matches Java: "" -> true

// shape: shape[l][c] = number of subcells; returns flags[l][c][s] in {0,1}
function parseCells(str, shape) { /* exactly the pseudocode of §4.3 */ }

// ---- encode ---------------------------------------------------------------
function makeCellsString(flags) { /* exactly the pseudocode of §4.4 */ }
```

`parseCells(makeCellsString(f), shape)` must equal `f` for every reachable `f` (the encoding is
lossless *and* canonical). Property-test that in the port.

---

## 8. JS PORTING NOTES (Java-isms that need care)

1. **`throw new Throwable(...)` vs `catch (Exception e)`.** `Throwable` is *not* an `Exception`, so the
   explicit grammar errors escape `parseCells_v2`'s own catch while `RuntimeException`s (index/format/
   `NoSuchElementException`) are swallowed and leave a **partially applied** selection. JS has one
   error type — model this with two classes (`CellsSyntaxError` vs `CellsRuntimeError`) and mirror the
   table in §4.5, or you will get different behaviour on malformed files. See §4.5.
2. **`java.util.StringTokenizer` ≠ `String.split`.** With `returnDelims=true` it emits each delimiter as
   its own token, coalesces nothing, and **never emits empty tokens** — `"{0,,1}"` yields
   `{ 0 , , 1 }` (two comma tokens), while `"{0,,1}".split(/([,{}()\[\]-])/)` yields empty strings.
   Use the explicit scanner in §7.
3. **Whitespace is not a delimiter in the cells string.** `"{ 0 }"` fails (`isNumber(" 0 ")` is false).
   Do not `trim()` tokens "to be helpful" — that would accept strings the original rejects.
4. **`isNumber("")` is `true` in Java** (empty loop). Unreachable via `StringTokenizer`, but if you
   restructure the scanner, keep the semantics or add an explicit non-empty check.
5. **`Integer.valueOf(t).intValue()`** throws on overflow; JS `parseInt` returns a huge float or `NaN`.
   Validate: `const n = Number(t); if (!Number.isSafeInteger(n)) throw …`.
6. **Leading zeros are decimal, not octal**: `[01]` = subcell 1.
7. **Ragged arrays.** `int[l][c][s]` has per-layer and per-cell lengths; allocate from the actual
   `allcells`/`subCells` shape (as `parseCells_v2` does from its `ind` argument), never from a
   rectangular guess. Out-of-range *subcell* indices are unchecked in the original → real crash.
8. **`Vector`/`Hashtable` iteration order.** `makeSymmetricalCells` and `makeSymmetricalSubCells` seed
   from `FastHashtable.elements().nextElement()`, then sort with `QSort.quickSort` (unstable) using
   `SSCell.compare`, which **returns 0 for topologically+volumetrically identical cells**
   (`static final double EPS = 1.e-4`). Cell/subcell numbering — hence the meaning of every stored
   `.stel` file — depends on that order. In JS: reproduce `compare` exactly and add a deterministic
   final tie-break (e.g. lexicographic on `getSCellIndex()`, or on the sorted primitive-cell centres),
   then re-verify the four samples render as expected. `Array.prototype.sort` is stable in modern JS;
   `pvs.utils.QSort` — Doug Lea's vendored median-of-three quicksort in
   `/Users/yaroslavvb/Library/CloudStorage/Dropbox/git0/stellation-resurrect/stellation/src/main/java/pvs/utils/QSort.java`,
   **not** `java.util.Arrays.sort` — is not; identical comparators can still produce different orders.
9. **`SSCell` identity.** `FastHashtable` (a vendored 1995 `java.util.Hashtable` clone) is keyed by
   `Vector3D` centres via value-based `hashCode`/`equals`, *not* by object identity; a JS `Map` keyed by an
   object will silently behave differently. But do **not** "key by a rounded tuple" — there is no rounding
   anywhere in `Vector3D`. `equals` is an absolute-difference test against
   `static final double tolerance = 1.e-6` (`|dx| < 1e-6 && |dy| < 1e-6 && |dz| < 1e-6`), while `hashCode()`
   is the truncating multiply-hash
   `(int)(331345.563*x) + (int)(412345.891*y) + (int)(71341.678*z)` — which is **not** consistent with that
   tolerance: two centres 1e-7 apart can hash to different buckets and so never be compared at all.
   (`Vector3D.chop`'s `TOL = 1.e-10` is used only by `toString`, and the `hashCode` memo field is dead —
   `hashCode()` computes `value` and returns it without ever assigning the field.) A faithful port must
   reproduce **both** the hash expression and the epsilon-`equals`, bucket walk included.
   UNCERTAIN: whether any real centre pair straddles a bucket boundary — not verified here.
10. **Integer division** in `StellationUI.makeStellationName` (`index / 26`) and in
    `Selection.getCellUnderMouse` (`((x-offsetX)/gridX) - 2`) must become `Math.floor(a/b)`
    (values are non-negative there, so `(a/b)|0` also works).
11. **`float` vs `double`.** All the parsing/formatting here is `double`; JS `number` matches. The only
    formatting subtlety is `Utils.getString`'s shortest-fixed-point loop (§6.4) — `"%.<n>f"` is
    `Number.prototype.toFixed(n)`; beware `toFixed` rounding differences at the 15th digit
    (`(1.005).toFixed(2)`). Use the same `EPS = 1e-12` loop.
12. **Static mutable state.** `PolyNames.poly/categories/representations` are `static String[][][]`
    shared across instances; `Selection.color` is a `static Color[2]` filled in a static initialiser;
    `StellationController.symnames` is `static String[]` from `Symmetry.getSymmetryNames()`, which
    enumerates a `Hashtable` **and then sorts** the result with `QSort` + `StringComparator` — so unlike the
    cell orbits (§8.8) this array *is* deterministic, the sort washes out the hash order. Freeze these as
    module-level constants in JS and don't mutate.
13. **`StreamTokenizer` quirks for the `.stel` reader** (§1.1): `=` is whitespace; a lone `/` starts a
    line comment; `'` is a quote char; `\` escapes (incl. octal) are decoded inside strings; quoted
    strings may span lines; **numbers are returned as words** (`parseNumbers()` is not called), so
    `ttype` is never `TT_NUMBER` — the code reads `st.sval` unconditionally after `st.nextToken()`,
    which yields `null` for a bare punctuation token. A regex/line-based JS reader is fine for the
    canonical 5-line file, but keep `=`-as-space and `//` `/* */` comments, and accept both
    `"Ih / I"` and `"Ih/I"`.
14. **`String.equalsIgnoreCase`** (keywords in `open`, names in `findPolyByName`) is locale-independent
    per-char folding; JS `toLowerCase()` is locale-sensitive for a few characters (Turkish `I`).
    Use `a.toLowerCase() === b.toLowerCase()` with `'en-US'`-safe input, or compare with
    `localeCompare(b, 'en', {sensitivity:'accent'}) === 0`. All current names are ASCII.
15. **Round-trip is canonicalising, not textual.** `{3(0[0,1])}` re-encodes as `{3}`. Don't write a test
    that asserts string equality after load→save unless the input is already canonical (the four
    samples are).
16. **Write the `cells` line.** The Java `save()` has it commented out (§1.5); a faithful *round-trippable*
    port must emit it, or every saved file loses its selection.

---

## 9. UNCERTAIN

* **Actual per-layer cell/subcell counts for the samples.** No JRE is installed in this environment
  (`java -version` → "Unable to locate a Java Runtime"), so I could not execute
  `makeCells2("Ih","I",…)` on `u27.off`/`u31.off` to print the real shape of `allcells`. The worked
  example in §5 is therefore exact at the *index/algorithm* level (verified by executing a
  line-for-line port of `parseCells_v2`/`makeStellationName_v2` on all four sample strings) but the
  geometric identity of "layer 5, cell 1, subcell 1" of the icosahedron (which named stellation it is)
  is not established here.
* **Whether any released `.stel` file in the wild uses the `planes "…"` form.** All four samples use
  `polyhedron`. Note that `StellationMain.onOpen` NPEs on `__PLANES` (§1.3), which suggests the
  planes path was never exercised via the file-open menu in this build.
* **Whether an older build wrote `exportLengthUnit`** or any additional keyword. The samples predate
  the current `save()` (they contain `cells`, which current `save()` omits, and use `"Ih / I"` spacing
  which current `save()` does not produce). I found no other writer of `cells "…"` in the tree —
  `grep -rn 'cells "'` over `src` hits only the commented-out line 226 of `StellationController.java`.
  So the exact historical writer is not recoverable from this snapshot; the format in §4.4 is
  reconstructed from `makeStellationName_v2`, which reproduces all four sample strings exactly.
* **Tie-breaking in `QSort.quickSort` when `SSCell.compare` returns 0.** The active overload is a
  median-of-three quicksort (pivot = median of `lo`, `mid = (lo+hi)/2`, `hi`, swapped into order first),
  so it is *deterministic given an input order* but **not stable**. The residual nondeterminism is
  therefore entirely in the `FastHashtable` enumeration order that seeded the `Vector` — reproducing the
  Java ordering in JS means reproducing that hash order too. UNCERTAIN: I did not enumerate the actual
  resulting order for any real polyhedron (no JRE). This is the single biggest fidelity risk for reusing
  old `.stel` files (§8.8).
* **`maxIntersection` / `maxLayer` at save time.** Neither is stored in the `.stel` file
  (`maxLayer` comes from the UI text field `tfMaxLayer`, default `1000`; `maxIntersection = -1`).
  A file that selects layer 7 will silently decode to nothing if the viewer is configured with a
  lower layer cap — `parseCells_v2` throws `Throwable("layer number: 7 is out of bounds")` and the
  selection is left untouched.
