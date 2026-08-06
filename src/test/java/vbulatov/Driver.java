package vbulatov;

import java.io.*;
import java.util.Vector;

import pvs.polyhedra.*;
import pvs.polyhedra.stellation.*;
import pvs.utils.Output;

/**
 * Headless driver: exercises the stellation core without any AWT/Swing,
 * and dumps deterministic ground-truth numbers that a JS port can be
 * validated against.
 *
 *   java -cp bin:resources vbulatov.Driver <u27|u28|...> <polySym> <stellSym> <maxLayer>
 */
public class Driver {

    public static void main(String[] args) throws Exception {

        String fname     = args.length > 0 ? args[0] : "u27";
        String polySym   = args.length > 1 ? args[1] : "Ih";
        String stellSym  = args.length > 2 ? args[2] : "I";
        int    maxLayer  = args.length > 3 ? Integer.parseInt(args[3]) : 1000;

        Output.out = System.out;

        String path = "resources/images/off/" + fname + ".off";
        System.out.println("=== INPUT " + path + "  poly=" + polySym + " stell=" + stellSym + " maxLayer=" + maxLayer);

        Polyhedron poly = new Polyhedron();
        FileInputStream in = new FileInputStream(path);
        poly.readOFF(in);
        poly.makeCCW();
        in.close();

        System.out.println("=== POLYHEDRON vertices=" + poly.vertices.length
                           + " faces=" + poly.ifaces.length);

        StellationController ctrl = new StellationController(fname, stellSym);
        ctrl.setSymmetry(polySym + "/" + stellSym);
        ctrl.initPolyPlanes(poly);

        Plane[] canon = ctrl.getCanonicalPlanes();
        System.out.println("=== CANONICAL PLANES " + canon.length);
        for (int i = 0; i < canon.length; i++) {
            System.out.printf("  plane[%d] n=(%.9f,%.9f,%.9f) d=%.9f%n",
                              i, canon[i].v.x, canon[i].v.y, canon[i].v.z, canon[i].d);
        }

        long t0 = System.currentTimeMillis();
        ctrl.createStellation(maxLayer);
        ctrl.initSubcells();
        long t1 = System.currentTimeMillis();

        Stellation st = ctrl.getStellation();
        System.out.println("=== TIMING makeCells2 " + (t1 - t0) + " ms");
        System.out.println("=== PLANES USED " + st.planes.length);
        System.out.println("=== FACE-PLANES " + st.faces.length);

        int totFacets = 0;
        for (int p = 0; p < st.faces.length; p++) totFacets += st.faces[p].length;
        System.out.println("=== TOTAL FACETS " + totFacets);
        for (int p = 0; p < Math.min(st.faces.length, 8); p++) {
            System.out.println("  plane " + p + " facets=" + st.faces[p].length);
        }

        Vector all = ctrl.getAllCells();
        Vector sub = ctrl.getSubcells();
        System.out.println("=== LAYERS " + all.size());
        for (int l = 0; l < all.size(); l++) {
            Vector layer = (Vector) all.elementAt(l);
            Vector slayer = (Vector) sub.elementAt(l);
            StringBuilder sb = new StringBuilder();
            double vol = 0;
            for (int c = 0; c < layer.size(); c++) {
                SSCell cell = (SSCell) layer.elementAt(c);
                sb.append(String.format(" [%d: prim=%d facets=%d verts=%d sub=%d vol=%.6f]",
                        c, cell.cells.length, cell.getNFacets(), cell.getNVertices(),
                        cell.subCells == null ? 0 : cell.subCells.length, cell.getVolume()));
                vol += cell.getVolume();
            }
            System.out.printf("layer %2d: sscells=%d subcells=%d totalVol=%.6f%s%n",
                              l, layer.size(), slayer.size(), vol, sb);
        }

        // ---- build the mesh for the "core" selection (layer 0) and for layer 0+1
        for (int upto = 0; upto < Math.min(3, all.size()); upto++) {
            Vector sel = new Vector();
            for (int l = 0; l <= upto; l++) {
                Vector layer = (Vector) all.elementAt(l);
                for (int c = 0; c < layer.size(); c++) sel.addElement(layer.elementAt(c));
            }
            SSCell[] cells = new SSCell[sel.size()];
            sel.copyInto(cells);
            Polyhedron out = st.getPolyhedron(cells);
            System.out.println("=== MESH layers 0.." + upto
                               + " cells=" + cells.length
                               + " vertices=" + out.vertices.length
                               + " faces=" + out.ifaces.length);

            File f = new File("../out/mesh_" + fname + "_" + polySym + "_" + stellSym + "_L" + upto + ".off");
            f.getParentFile().mkdirs();
            writeOFF(out, f);
            System.out.println("    wrote " + f.getPath());
        }

        System.out.println("=== DONE");
    }

    /** minimal OFF writer so the JS port can diff against identical geometry */
    static void writeOFF(Polyhedron p, File f) throws IOException {
        PrintWriter w = new PrintWriter(new FileOutputStream(f));
        w.println("OFF");
        w.println(p.vertices.length + " " + p.ifaces.length + " 0");
        for (int i = 0; i < p.vertices.length; i++) {
            w.printf("%.12f %.12f %.12f%n", p.vertices[i].x, p.vertices[i].y, p.vertices[i].z);
        }
        for (int i = 0; i < p.ifaces.length; i++) {
            int[] face = p.ifaces[i];
            w.print(face.length);
            for (int k = 0; k < face.length; k++) w.print(" " + face[k]);
            w.println();
        }
        w.close();
    }
}
