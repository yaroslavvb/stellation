package vbulatov;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import java.util.Vector;

import javax.imageio.ImageIO;

import pvs.polyhedra.*;
import pvs.polyhedra.stellation.*;
import pvs.utils.Output;

/**
 * Headless reference renderer.
 *
 * Produces two PNGs that the JavaScript port must reproduce:
 *   1. the 2D stellation diagram of face 0 (all facets + the selected ones filled)
 *   2. a flat-shaded 3D view of the resulting stellated solid
 *
 * Run:  java -Djava.awt.headless=true -cp bin:resources vbulatov.ReferenceRender u27 Ih I 2
 */
public class ReferenceRender {

    static final int W = 900, H = 900;

    public static void main(String[] args) throws Exception {

        String fname    = args.length > 0 ? args[0] : "u27";
        String polySym  = args.length > 1 ? args[1] : "Ih";
        String stellSym = args.length > 2 ? args[2] : "I";
        int    upto     = args.length > 3 ? Integer.parseInt(args[3]) : 1;

        Output.out = new PrintStream(new ByteArrayOutputStream()); // silence the chatty core

        Polyhedron poly = new Polyhedron();
        FileInputStream in = new FileInputStream("resources/images/off/" + fname + ".off");
        poly.readOFF(in); poly.makeCCW(); in.close();

        StellationController ctrl = new StellationController(fname, stellSym);
        ctrl.setSymmetry(polySym + "/" + stellSym);
        ctrl.initPolyPlanes(poly);
        ctrl.createStellation(1000);
        ctrl.initSubcells();

        Stellation st = ctrl.getStellation();
        Vector all = ctrl.getAllCells();

        // ---- selection: every SSCell in layers 0..upto
        Vector sel = new Vector();
        for (int l = 0; l <= Math.min(upto, all.size() - 1); l++) {
            Vector layer = (Vector) all.elementAt(l);
            for (int c = 0; c < layer.size(); c++) sel.addElement(layer.elementAt(c));
        }
        SSCell[] cells = new SSCell[sel.size()];
        sel.copyInto(cells);

        String tag = fname + "_" + polySym + "_" + stellSym + "_L" + upto;
        new File("../out").mkdirs();

        // ================= 1. the 2D stellation diagram =================
        Object[][] facets = Stellation.getStellationDiagram(cells, 0);
        Stellation.Diagram d = st.createDiagram(0, 0, stellSym, facets);
        renderDiagram(d, new File("../out/diagram_" + tag + ".png"));
        System.out.println("diagram: ffaces=" + d.ffaces.length
                         + " selected=" + d.faces.length
                         + " axes=" + d.axes.length
                         + " symPlanes=" + d.planes.length);

        // ================= 2. the 3D solid =================
        Polyhedron mesh = st.getPolyhedron(cells);
        render3D(mesh, new File("../out/solid_" + tag + ".png"));
        System.out.println("solid: vertices=" + mesh.vertices.length + " faces=" + mesh.ifaces.length);
    }

    // ---------------------------------------------------------------- 2D diagram

    static void renderDiagram(Stellation.Diagram d, File outFile) throws IOException {

        // extent over all facets, in the diagram's XY plane
        double max = 1e-9;
        for (SFace f : d.ffaces)
            for (Vector3D v : f.vertices)
                max = Math.max(max, Math.max(Math.abs(v.x), Math.abs(v.y)));

        double scale = (Math.min(W, H) * 0.46) / max;

        BufferedImage img = new BufferedImage(W, H, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(Color.WHITE);
        g.fillRect(0, 0, W, H);

        // selected facets, filled
        g.setColor(new Color(0xFF, 0xC8, 0x50));
        for (SFace f : d.faces) fill(g, f, scale);

        // all facets, outlined
        g.setColor(new Color(0x30, 0x30, 0x30));
        g.setStroke(new BasicStroke(1f));
        for (SFace f : d.ffaces) stroke(g, f, scale);

        // selected facets, outlined heavier
        g.setColor(new Color(0xC0, 0x40, 0x00));
        g.setStroke(new BasicStroke(2f));
        for (SFace f : d.faces) stroke(g, f, scale);

        // symmetry axes
        for (Axis a : d.axes) {
            if (a == null) continue;
            int x = px(a.vector.x, scale), y = py(a.vector.y, scale);
            g.setColor(new Color(0x00, 0x60, 0xC0));
            int r = a.order == 2 ? 4 : a.order == 3 ? 6 : 8;
            g.fillOval(x - r, y - r, 2 * r, 2 * r);
        }

        g.dispose();
        ImageIO.write(img, "png", outFile);
        System.out.println("wrote " + outFile.getPath());
    }

    static int px(double x, double s) { return (int) Math.round(W / 2.0 + x * s); }
    static int py(double y, double s) { return (int) Math.round(H / 2.0 - y * s); }

    static Polygon toPoly(SFace f, double s) {
        Polygon p = new Polygon();
        for (Vector3D v : f.vertices) p.addPoint(px(v.x, s), py(v.y, s));
        return p;
    }
    static void fill(Graphics2D g, SFace f, double s)   { g.fillPolygon(toPoly(f, s)); }
    static void stroke(Graphics2D g, SFace f, double s) { g.drawPolygon(toPoly(f, s)); }

    // ---------------------------------------------------------------- 3D solid

    static void render3D(Polyhedron p, File outFile) throws IOException {

        BufferedImage img = new BufferedImage(W, H, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(new Color(0x12, 0x14, 0x1A));
        g.fillRect(0, 0, W, H);

        // rotate into a pleasant 3/4 view
        double ax = Math.toRadians(-22), ay = Math.toRadians(28);
        double[][] pts = new double[p.vertices.length][3];
        double rad = 1e-9;
        for (int i = 0; i < p.vertices.length; i++) {
            Vector3D v = p.vertices[i];
            double x = v.x, y = v.y, z = v.z;
            double x1 =  x * Math.cos(ay) + z * Math.sin(ay);
            double z1 = -x * Math.sin(ay) + z * Math.cos(ay);
            double y2 =  y * Math.cos(ax) - z1 * Math.sin(ax);
            double z2 =  y * Math.sin(ax) + z1 * Math.cos(ax);
            pts[i] = new double[]{x1, y2, z2};
            rad = Math.max(rad, Math.sqrt(x * x + y * y + z * z));
        }
        double s = (Math.min(W, H) * 0.42) / rad;

        // painter's algorithm: sort faces back-to-front by centroid depth
        Integer[] order = new Integer[p.ifaces.length];
        final double[] depth = new double[p.ifaces.length];
        for (int i = 0; i < p.ifaces.length; i++) {
            double zc = 0;
            for (int k : p.ifaces[i]) zc += pts[k][2];
            depth[i] = zc / p.ifaces[i].length;
            order[i] = i;
        }
        java.util.Arrays.sort(order, (a, b) -> Double.compare(depth[a], depth[b]));

        double[] light = norm(new double[]{-0.4, 0.6, 1.0});

        for (int oi = 0; oi < order.length; oi++) {
            int[] face = p.ifaces[order[oi]];
            if (face.length < 3) continue;
            double[] a = pts[face[0]], b = pts[face[1]], c = pts[face[2]];
            double[] n = norm(cross(sub(b, a), sub(c, b)));
            double lam = Math.max(0, dot(n, light));
            boolean front = n[2] > 0;
            int base = front ? 0xE0 : 0x60;
            int v = (int) Math.round(40 + base * (0.25 + 0.75 * lam));
            v = Math.min(255, v);

            Polygon poly = new Polygon();
            for (int k : face) poly.addPoint(px(pts[k][0], s), py(pts[k][1], s));
            g.setColor(new Color(v, (int)(v * 0.80), (int)(v * 0.55)));
            g.fillPolygon(poly);
            g.setColor(new Color(0x20, 0x18, 0x10));
            g.setStroke(new BasicStroke(1f));
            g.drawPolygon(poly);
        }

        g.dispose();
        ImageIO.write(img, "png", outFile);
        System.out.println("wrote " + outFile.getPath());
    }

    static double[] sub(double[] a, double[] b) { return new double[]{a[0]-b[0], a[1]-b[1], a[2]-b[2]}; }
    static double[] cross(double[] a, double[] b) {
        return new double[]{a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]};
    }
    static double dot(double[] a, double[] b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
    static double[] norm(double[] a) {
        double l = Math.sqrt(dot(a, a));
        if (l < 1e-12) return new double[]{0,0,1};
        return new double[]{a[0]/l, a[1]/l, a[2]/l};
    }
}
