package vbulatov;

import java.io.*;
import java.util.*;

import pvs.polyhedra.*;
import pvs.polyhedra.stellation.PolyNames;
import pvs.utils.Output;

/**
 * Dumps the exact tables the Java program uses into JSON, so the JavaScript port
 * consumes identical data instead of re-deriving (and possibly mis-deriving) it.
 *
 *   symmetry.json  - every symmetry group: matrices, rotation axes, mirror planes, subgroups
 *   catalog.json   - the PolyNames catalog (categories -> {name, file, symmetry})
 *   geometry.json  - all 150 OFF polyhedra (vertices + faces), already made CCW
 */
public class ExportData {

    public static void main(String[] args) throws Exception {

        Output.out = new PrintStream(new ByteArrayOutputStream());
        new File("../web/data").mkdirs();

        exportSymmetry();
        exportCatalog();
        exportGeometry();
    }

    // ------------------------------------------------------------------ symmetry

    static void exportSymmetry() throws Exception {
        String[] names = Symmetry.getSymmetryNames();
        StringBuilder sb = new StringBuilder("{\n");
        for (int i = 0; i < names.length; i++) {
            String s = names[i];
            Matrix3D[] mats = Symmetry.getMatrices(s);
            Axis[] axes = Symmetry.getAxes(s);
            Plane[] planes = Symmetry.getSymmetryPlanes(s);
            String[] subs = Symmetry.getSubgroups(s);

            sb.append("  ").append(q(s)).append(": {\n");
            sb.append("    \"order\": ").append(mats.length).append(",\n");

            sb.append("    \"matrices\": [");
            for (int k = 0; k < mats.length; k++) {
                if (k > 0) sb.append(",");
                sb.append("\n      [");
                for (int r = 0; r < 3; r++)
                    for (int c = 0; c < 3; c++)
                        sb.append(r + c == 0 ? "" : ",").append(num(mats[k].m[r][c]));
                sb.append("]");
            }
            sb.append("\n    ],\n");

            sb.append("    \"axes\": [");
            for (int k = 0; k < axes.length; k++) {
                if (k > 0) sb.append(",");
                sb.append("\n      {\"order\":").append(axes[k].order)
                  .append(",\"v\":[").append(num(axes[k].vector.x)).append(",")
                  .append(num(axes[k].vector.y)).append(",")
                  .append(num(axes[k].vector.z)).append("]}");
            }
            sb.append("\n    ],\n");

            sb.append("    \"mirrors\": [");
            for (int k = 0; k < planes.length; k++) {
                if (k > 0) sb.append(",");
                sb.append("\n      {\"n\":[").append(num(planes[k].v.x)).append(",")
                  .append(num(planes[k].v.y)).append(",").append(num(planes[k].v.z))
                  .append("],\"d\":").append(num(planes[k].d)).append("}");
            }
            sb.append("\n    ],\n");

            sb.append("    \"subgroups\": [");
            for (int k = 0; k < subs.length; k++) {
                if (k > 0) sb.append(",");
                sb.append(q(subs[k]));
            }
            sb.append("]\n  }");
            if (i < names.length - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append("}\n");
        write("../web/data/symmetry.json", sb.toString());
        System.out.println("symmetry.json: " + names.length + " groups");
    }

    // ------------------------------------------------------------------ catalog

    static void exportCatalog() throws Exception {
        PolyNames pn = new PolyNames();
        String[] cats = pn.getCategories();
        StringBuilder sb = new StringBuilder("[\n");
        int total = 0;
        for (int c = 0; c < cats.length; c++) {
            sb.append("  {\"category\": ").append(q(cats[c])).append(", \"items\": [\n");
            int n = pn.getCategoryLength(c);
            for (int i = 0; i < n; i++) {
                sb.append("    {\"name\": ").append(q(pn.name(c, i)))
                  .append(", \"file\": ").append(q(pn.fname(c, i)))
                  .append(", \"symmetry\": ").append(q(pn.symmetry(c, i))).append("}");
                if (i < n - 1) sb.append(",");
                sb.append("\n");
                total++;
            }
            sb.append("  ]}");
            if (c < cats.length - 1) sb.append(",");
            sb.append("\n");
        }
        sb.append("]\n");
        write("../web/data/catalog.json", sb.toString());
        System.out.println("catalog.json: " + cats.length + " categories, " + total + " entries");
    }

    // ------------------------------------------------------------------ geometry

    static void exportGeometry() throws Exception {
        File dir = new File("resources/images/off");
        String[] files = dir.list();
        Arrays.sort(files);
        StringBuilder sb = new StringBuilder("{\n");
        int count = 0;
        for (String fn : files) {
            if (!fn.endsWith(".off")) continue;
            String key = fn.substring(0, fn.length() - 4);
            Polyhedron p = new Polyhedron();
            FileInputStream in = new FileInputStream(new File(dir, fn));
            try {
                p.readOFF(in);
                p.makeCCW();
            } catch (Exception e) {
                System.out.println("  SKIP " + fn + ": " + e);
                in.close();
                continue;
            }
            in.close();

            if (count++ > 0) sb.append(",\n");
            sb.append("  ").append(q(key)).append(": {\"v\": [");
            for (int i = 0; i < p.vertices.length; i++) {
                if (i > 0) sb.append(",");
                sb.append(num(p.vertices[i].x)).append(",")
                  .append(num(p.vertices[i].y)).append(",")
                  .append(num(p.vertices[i].z));
            }
            sb.append("], \"f\": [");
            for (int i = 0; i < p.ifaces.length; i++) {
                if (i > 0) sb.append(",");
                sb.append("[");
                for (int k = 0; k < p.ifaces[i].length; k++) {
                    if (k > 0) sb.append(",");
                    sb.append(p.ifaces[i][k]);
                }
                sb.append("]");
            }
            sb.append("]}");
        }
        sb.append("\n}\n");
        write("../web/data/geometry.json", sb.toString());
        System.out.println("geometry.json: " + count + " polyhedra");
    }

    // ------------------------------------------------------------------ helpers

    static String q(String s) { return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"") + "\""; }

    static String num(double d) {
        if (Math.abs(d) < 1e-13) return "0";
        String s = String.format(Locale.US, "%.15g", d);
        if (s.contains(".") && !s.contains("e") && !s.contains("E")) {
            s = s.replaceAll("0+$", "");
            if (s.endsWith(".")) s = s.substring(0, s.length() - 1);
        }
        return s;
    }

    static void write(String path, String s) throws IOException {
        File f = new File(path);
        f.getParentFile().mkdirs();
        Writer w = new OutputStreamWriter(new FileOutputStream(f), "UTF-8");
        w.write(s);
        w.close();
        System.out.println("wrote " + f.getCanonicalPath() + " (" + (s.length() / 1024) + " KB)");
    }
}
