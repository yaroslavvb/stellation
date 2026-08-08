# Running Vladimir's original Java Stellation app

Two ways: the shipped 2017 jar, or a fresh build from the newer source tree.
Both work on this Mac today.

---

## The catch: `java` on macOS is a decoy

```
$ java -version
The operation couldn't be completed. Unable to locate a Java Runtime.
```

`/usr/bin/java` is a stub Apple ships that does nothing but tell you to install
Java. A real JDK **is** installed here — Homebrew's, three of them — but Homebrew
keeps JDKs "keg-only", meaning it deliberately does not symlink them into the
PATH, so the stub keeps winning. Nothing is broken; you just have to name the
JDK you want.

```bash
ls -d /opt/homebrew/opt/openjdk*
```

→ `openjdk` (26), `openjdk@11`, `openjdk@26`.

Use the full path, or put this in your shell profile once:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk
export PATH="$JAVA_HOME/bin:$PATH"
```

---

## 1. Run the shipped jar

```bash
cd ~/Library/CloudStorage/Dropbox/git0/stellation-resurrect/fork
/opt/homebrew/opt/openjdk/bin/java -jar stellation.jar
```

It prints a `usage:` block and a page of symmetry matrices to the terminal before
the window appears — that is normal chatter, not an error. The jar is
self-contained: all 304 polyhedron thumbnails are inside it, so it does not
matter what directory you launch from.

It also takes arguments if you want to skip the picker:

```
-i <input file>            a .stel file to open
-y <stellationSymmetry>    e.g. I, Ih, O, Oh, T
```

**Which jar.** There are two, and they are not the same:

| file | class format | files | age |
|---|---|---|---|
| `fork/stellation.jar` | Java 7 | 587 | **newer** |
| `fork/jars/stellation.jar` | Java 5 | 575 | older |

Use `fork/stellation.jar`. Vladimir wondered on the recording whether the jar
was the latest build — «jar-файл не самый последний, наверное» — and he was
right, but not about this one. See below.

---

## 2. Build the newer source tree

The jar's classes are in packages `PVS.polyhedra.stellation.*` with main class
`Main`. The `src/` tree in the repository is a **later refactor**: lower-case
`pvs.…` packages, and the main class is `StellationMain`. So the jar predates
the source, which is what Vladimir was half-remembering.

It compiles clean — 111 files, 287 classes, no errors, no dependencies beyond
the JDK. Java 11 is the comfortable choice for 2001-era code:

```bash
cd ~/Library/CloudStorage/Dropbox/git0/stellation-resurrect/fork
J=/opt/homebrew/opt/openjdk@11
OUT=/tmp/stel-classes

rm -rf "$OUT" && mkdir -p "$OUT"
find src/main/java src/ui/java -name '*.java' > /tmp/stel-srcs.txt
"$J/bin/javac" -nowarn -d "$OUT" @/tmp/stel-srcs.txt

# the source tree has no images of its own; borrow the jar's
(cd "$OUT" && unzip -qo ~/Library/CloudStorage/Dropbox/git0/stellation-resurrect/fork/stellation.jar 'images/*')

"$J/bin/java" -cp "$OUT" pvs.polyhedra.stellation.ui.StellationMain
```

Already done once, and packaged as **`stellation-latest.jar`** in the repository
root (outside the `fork/` checkout, so it does not show up as untracked):

```bash
cd ~/Library/CloudStorage/Dropbox/git0/stellation-resurrect
/opt/homebrew/opt/openjdk@11/bin/java -jar stellation-latest.jar
```

Rebuild it with:

```bash
printf 'Main-Class: pvs.polyhedra.stellation.ui.StellationMain\n' > /tmp/stel.mf
/opt/homebrew/opt/openjdk@11/bin/jar -cfm stellation-latest.jar /tmp/stel.mf -C /tmp/stel-classes .
```

**Ignore `pom.xml`.** It is configured for JSweet — Vladimir's own Java→TypeScript
transpiler experiment — not for building the desktop app, and its
`j4ts 2.1.0-SNAPSHOT` dependency will not resolve. `build.xml` (Ant) has proper
`compile` and `runMain` targets but Ant is not installed here; the plain `javac`
above does the same job. The `bat/*.bat` scripts are the Windows build, and
assume a `classes/` directory that is not in the repository.

---

## Where the menus are

On Windows the menu bar sits on the window. On macOS it moves to the system
menu bar at the top of the screen, and only when the Java window has focus —
this is what confused the 6 August session. **File → Make planes** is the plane
editor dialog Vladimir was looking for; `DlgPlanes.class` is present in both
jars, so if it does not open it is a bug in the app, not a missing feature.

Worth knowing: the plane-editor *functionality* is now in the JavaScript port,
so you do not need the Java app for it —
<https://stellation.mathornament.workers.dev>, Symmetry & depth → **Make planes**.

The other things the Java app still has that the port does not: stereo view
(anaglyph and cross-eyed), separate faces/edges toggles, and the symmetry-axis
and mirror-plane markers on the 2-D diagram (the last of these is now in the
port too).

---

## If you want a real `java` on the PATH

Homebrew tells you the incantation itself:

```bash
brew info openjdk
```

The system-wide route is to symlink the JDK where macOS looks for it, which
needs your password, so run it yourself:

```bash
sudo ln -sfn /opt/homebrew/opt/openjdk/libexec/openjdk.jdk \
             /Library/Java/JavaVirtualMachines/openjdk.jdk
```

After that `/usr/libexec/java_home -V` will list it and plain `java -jar …`
will work.
