# Data quality: the ten solids with vertices at infinity

Requested in the 6 August night review: *«надо оставить это задокументированной —
какие солиды имеют вертексы на бесконечности».*

## The fact

Ten solids in `web/data/geometry.json` have faces that are **genuinely
non-planar in the data** — by up to 1.155 units, in a file where every solid is
normalised to circumradius 1. No plane-fitting method can repair them; the
non-planarity is a property of the data, not a bug in any algorithm reading it.

They are the **duals of the hemipolyhedra**. A hemipolyhedron has faces passing
through its centre; the dual vertex corresponding to such a face lies **at
infinity**. Vladimir's own account of how the files were made (16:10 in the
night transcript): the infinite vertices were clamped to a large finite radius —
*«я просто их сделал на 100 или на 110, в результате они стали не плоскими»* —
and after normalisation those approximated spikes leave every face bent.

## The ten

All are `d`-files (duals). None is offered in the picker.

| file | faces affected | worst off-plane (units, circumradius 1) |
|------|---------------:|----------------------------------------:|
| d08 | 12 | 1.155 |
| d09 |  3 | 0.717 |
| d20 |  6 | 0.793 |
| d54 | 20 | 0.670 |
| d56 | 18 | 0.788 |
| d67 | 24 | 1.003 |
| d70 | 24 | 0.493 |
| d75 | 18 | 0.827 |
| d76 | 20 | 0.536 |
| d80 | 60 | 0.756 |

(Measured as the farthest vertex from the best plane through any three vertices
of the face; script preserved in the session scratchpad, trivially rebuilt from
this description.)

## What this means downstream

- **`facePlanes` cannot give these solids correct planes.** The bow-tie fix
  (fitting a plane from the vertices when Newell's signed area cancels) rescued
  the seven crossed-but-planar solids (d23 d26 d44 d55 d61 d68 d78); these ten
  are the remainder, and they are unfixable from the vertex data alone. A true
  fix would rebuild the faces from the *primal* hemipolyhedron's plane data,
  which is the same work as the planes-through-the-origin project
  (`notes/design/plane-representation.md`).
- **The winding-number tool rightly refuses them** — their surfaces are not
  consistently orientable as given.
- Do not spend a day trying to make these planar with a better fit. This note
  exists so nobody does.

## A related, separate fact

The catalog's face windings are inconsistent across almost all solids (majority
need repair). That one **is** repairable and the repair now lives in
`web/js/core.js` as `orientFaces(poly)` — walk the face adjacency, flip
neighbours that traverse a shared edge the same way, refuse non-orientable
input. Anything that ever culls back faces or integrates a volume must call it
first.
