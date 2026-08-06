# Design doc — planes through the origin

**Status:** proposed, not implemented. Two prototypes written and measured; both
are recorded below, including the one that fails, because the failure is the
interesting part.

**Raised by:** Vladimir Bulatov, 6 Aug 2026, 09:50–09:54 — described as "a
fundamental defect of the program", with the note that fixing it "may break
everything", so nothing has been changed in the shipped engine.

---

## 1. The defect as originally stated

In the Java original a plane is stored as **a single point in space**: the point
where the plane meets its own normal from the origin. Three numbers carry both
facts at once — the direction of the normal, and the distance from the origin.

    plane  ≙  p ∈ ℝ³        normal = p/|p|,  distance = |p|

It is a compact and natural encoding until the distance is zero. The point
becomes the origin, `p = (0,0,0)`, and the direction is lost: every plane through
the centre has the same representation, and it is a representation from which no
normal can be recovered.

The proposal is to store the two facts separately, four numbers instead of three:

    plane  ≙  (n, d)        n ∈ ℝ³ (need not arrive normalised), d ∈ ℝ

with the plane being `{ x : n·x = d }`. `d = 0` is then unremarkable.

## 2. What it cost

The exclusions are in the source, in the author's own hand.
`PolyNames.java` carries twenty commented-out entries, one of which says why:

```java
//{"great dirhombicosidodecahedron","u80","Ih"},// it has hemi faces passing through center
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

— and the ten duals of the same solids, the "-acrons", below them. That is
**twenty of the uniform polyhedra and their duals removed from the catalogue**
because of one representational choice. The geometry files are all still present
in `resources/images/off/`; only the names were commented out.

These are the *hemipolyhedra*: uniform solids some of whose faces pass through
the centre. The name is the giveaway — "hemi" faces are exactly the ones this
representation cannot express.

## 3. The state of the JavaScript port

**The port already stores four numbers.** `facePlanes()` in `web/js/core.js`
returns `{ n, d }` with `n` a unit normal and `d` the distance, and every
consumer uses them separately and correctly:

```js
const fpoint = mul(normal, plane.d);        // a point on the plane — fine at d = 0
const val    = dot(p, plane.n) - plane.d;   // signed distance — fine at d = 0
```

So the change Vladimir describes is, in the port, **already done**. What remains
is a single guard, inherited from the Java behaviour rather than from the Java
representation:

```js
let d = dot(n, c);
if (d < 0) { n = mul(n, -1); d = -d; }   // orient away from the origin
if (Math.abs(d) < 1e-9) continue;        // plane through the centre: skip
```

That line is the whole of the remaining defect. Everything downstream is ready.

## 4. First prototype: delete the guard

Deleting the guard needs two supporting changes, because a plane through the
origin has no "away from the origin" to orient by, and `n` and `−n` then describe
the *same* plane:

1. a canonical sign for `n` when `d = 0` (first significantly non-zero component
   positive), so the duplicate test can recognise the pair;
2. the duplicate test extended to treat `n` and `−n` as equal when `d = 0`.

**Result — the ten hemipolyhedra build.** Measured with `maxIntersection = 6`:

| file | name | planes (was → now) | central | layers | cells | time |
|---|---|---|---|---|---|---|
| u09 | tetrahemihexahedron | 4 → 7 | 3 | 4 | 8 | 5 ms |
| u08 | octahemioctahedron | 8 → 12 | 4 | 6 | 46 | 10 ms |
| u20 | cubohemioctahedron | 6 → 10 | 4 | 5 | 43 | 8 ms |
| u54 | small icosihemidodecahedron | 20 → 26 | 6 | 13 | 340 | 59 ms |
| u80 | great dirhombicosidodecahedron | 32 → 62 | 30 | 34 | 316 | 285 ms |

u80 is the solid the comment singles out. It builds in under a third of a second.

**But it is not free.** Re-running all 121 catalogue solids, four change:
`d44`, `d55`, `d61`, `d68` each acquire one extra plane, `(0,0,1)` at `d = 0`,
and their cell counts shift substantially. Those four are duals — the "acrons" —
and the plane is spurious.

## 5. Second prototype: reject faces with no usable normal — and why it fails

The obvious diagnosis is that the acron faces have no computable normal.
`facePlanes` builds normals by Newell's method, whose sum has length `2 × area`;
for a *crossed* polygon the signed lobes cancel and the length collapses, leaving
a direction that is pure rounding noise. Normalising it yields an arbitrary unit
vector, whose `d` against the centroid is ~0 — which the old guard silently
swallowed along with the genuine central planes.

So: skip a face when the Newell length is below `1e-9`, and keep central planes
otherwise.

**This is worse.** It recovers all ten hemipolyhedra correctly *and destroys seven
working catalogue solids* — `d23`, `d26`, `d44`, `d55`, `d61`, `d68`, `d78` drop
to **zero planes**, because every one of their faces falls under the threshold.
Those solids currently produce usable arrangements; the threshold was too blunt
and deleted them.

The lesson: the guard is doing **two jobs at once**, and they have to be
separated before either can be changed.

- *job A* — drop faces whose plane is genuinely undefined;
- *job B* — drop planes through the origin.

Job B is the one to remove. Job A must survive, and Newell length is not a safe
way to do it.

## 6. The discriminator that does work: planarity

Fit a plane to each face's vertices directly — centroid plus the smallest
eigenvector of their covariance — and measure the largest distance from any
vertex to that plane. This asks the right question ("do these points lie in a
plane at all?") and does not care whether the polygon is crossed.

The two populations separate by **sixteen orders of magnitude**:

| file | faces | max out-of-plane deviation | faces with d ≈ 0 | verdict |
|---|---|---|---|---|
| u27 (icosahedron) | 20 | 2.2 × 10⁻¹⁶ | 0 | planar, no central planes |
| u09 (tetrahemihexahedron) | 7 | 1.1 × 10⁻¹⁶ | 3 | **planar, central planes real** |
| u80 (great dirhombicosidodecahedron) | 124 | 8.9 × 10⁻¹⁶ | 60 | **planar, central planes real** |
| d44 (small rhombidodecacron) | 60 | 5.3 × 10⁻¹ | 56 | **not planar at all** |
| d55 (small dodecicosacron) | 60 | 8.5 × 10⁻¹ | 60 | **not planar at all** |

The hemipolyhedra are planar to floating-point exactness and their central planes
are real geometry. The acron duals are not planar in any useful sense — their
"faces" deviate by half a unit on a solid of radius one — so no plane
representation, three numbers or four, can describe them. Whatever the current
code produces for those seven is a heuristic that happens to be useful, and it
should be left alone deliberately rather than by accident.

A threshold anywhere between 10⁻¹⁰ and 10⁻³ separates the two cleanly. Nothing
delicate is being balanced.

## 7. Proposed change

In `facePlanes()`:

1. compute the best-fit plane for each face (centroid + smallest eigenvector);
2. measure `dev`, the largest vertex deviation from it;
3. **if `dev > εplanar`** (say `1e-6` relative to the solid's radius): the face has
   no plane — keep whatever the current code does for it, so the seven acron
   duals are unaffected, and mark the plane `approximate: true`;
4. otherwise take `n` from the fit, `d = n·centroid`, and **do not skip `d = 0`**;
5. canonicalise the sign at `d = 0`, and fold `n`/`−n` in the duplicate test.

Then re-enable the twenty commented-out names, and re-validate:

- all 121 current catalogue solids must be **byte-identical** in plane count,
  layer count and per-layer cell counts;
- the 10 hemipolyhedra and their duals must build without error;
- the four `.stel` samples must still round-trip.

The first of those is the real acceptance test, and it is cheap to run — the
comparison harness used for the tables above takes about two minutes over the
whole catalogue.

## 8. What this does not fix

A plane through the origin divides space into two half-spaces that are mirror
images, so "outside" is no longer meaningful for it. Everything that currently
reasons about a cell being *outside* a plane — the layer number, which counts how
many half-spaces a facet lies outside of — needs a convention for these planes,
and the layering of the hemipolyhedra should be sanity-checked against the
literature before the results are trusted. The prototypes above produce plausible
layer counts (u09: 4 layers, u80: 34) but nothing has been checked against a
published enumeration, because there may not be one.

Vladimir's own estimate — that this "may break everything" — is right in spirit
and wrong in scale: it turns out to be one guard and one convention, but the
convention question in this section is genuinely open.

## 9. Related, from the same session

- The original Java applet's 3-D rotation is also on the to-do list (transcript
  09:49). Not addressed here.
- The port's `suggestDepth()` already treats a near-zero plane distance as the
  signal for an expensive arrangement (`spread = max/min`, guarded against
  division by zero). With central planes admitted, `min` becomes exactly 0 for
  the hemipolyhedra and the guard returns `Infinity`, so the depth cap falls to
  its conservative branch. That is the right behaviour but it is accidental, and
  should be made explicit.
