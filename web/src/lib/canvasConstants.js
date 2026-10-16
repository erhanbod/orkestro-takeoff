// Pure data constants for the Takeoff Canvas — render/zoom budgets, snap
// tuning, toolbar tool descriptors, and the flooring starter conditions.
// No DOM, no React, no functions: values only, moved verbatim from
// pages/TakeoffCanvas.jsx so the canvas and any future reader share one copy.
// (The one import is another values-only constant: the grout tile-geometry
// defaults from lib/coverage.js, so the CT-1 seed and the editor can't drift.)

import { groutCoverageSfPerBag } from "./coverage.js";
import { M2_PER_SF, M_PER_FT } from "./units";

export const MIN_SCALE = 0.03;
export const MAX_SCALE = 32;  // stage zoom is in raster px — with the 28MP base budget this keeps ≈ the old deep-zoom ceiling (detail view carries the crispness)
export const PANEL_GAP = 48;  // px between side-by-side sheets in a multi-sheet group
// Base raster: enough density for fit-to-view + the first stretch of zoom; sharpness
// past 1:1 comes from the DETAIL VIEW (region re-render), never from a giant full-sheet
// bitmap. Rastering to the browser caps would put a 36×24" sheet at 179MP ≈ 716MB of
// backing store per panel — a 4-up ≈ 2.9GB, which Chrome silently fails to keep
// composited (blank sheet at zoom-out, evicted chrome). Quantities are scale-free
// (verts are normalized and the render factor cancels in the area math), so the budget
// only trades memory for base-layer sharpness. Hi-Res opts a sheet INTO the auto
// budget per-user (the default stays the lean baseline raster).
export const QUALITY_CEILING = 8.0;                  // hard cap on render scale (≈576 px/in) — binds only on small pages now
export const MAX_CANVAS_DIM  = 16384;                // safe max side for a single canvas (Chrome/Firefox/Safari desktop)
export const MAX_CANVAS_AREA = 16384 * 16384 * 0.9;  // per-canvas pixel cap — the DETAIL view's density factor uses this
export const MAX_PANEL_AREA  = 28e6;                 // base-raster pixel budget per panel (~112MB RGBA; 4-up ≈ 450MB)
export const MARKUP_IMG_MAX = 1600;                  // px longest side of a stored image markup (capture AND upload downscale to this, then re-encode)
export const MAX_IMAGE_MARKUP_BYTES = 16 * 1024 * 1024;  // aggregate cap across a project's image markups — refuse a new one that would push the annotations blob past this
export const MARKUP_UPLOAD_MAX_BYTES = 25 * 1024 * 1024; // reject an upload FILE larger than this BEFORE decode (cheap OOM guard for a huge file)
export const MARKUP_DECODE_MAX_AREA = 40e6;          // reject a decoded upload above ~40M px — a 1600px annotation never needs more, and this bounds the transient RGBA allocation (NOT the 241M render-canvas cap)
// Detail view: once zoomed past the base raster's 1:1 IN DEVICE PIXELS, we overlay a
// crop of JUST the visible region, re-rendered from the PDF vectors at the current zoom —
// the way desktop CAD viewers do. Crispness becomes unbounded (up to the per-region canvas cap)
// without ever holding a giant full-sheet bitmap; the region is ~viewport-sized so the cap
// effectively never binds. Engage compares t.scale × devicePixelRatio (softness starts
// when the raster is upscaled in device px — on a 2× display that's t.scale 0.5, not 1).
export const DETAIL_ENGAGE = 1.15;  // engage once stage zoom × dpr passes ~1.15 (base raster starts to soften)
// Render this much extra region beyond the viewport so small pans don't
// expose an unfetched edge. 0.5 (4x the viewport's tile area) was the right
// number for the OLD single-region crop render (one pdf.js call regardless
// of margin size, so a bigger margin was nearly free); with #86's tile pool,
// margin scales the TILE COUNT quadratically ((1+2*margin)^2), and a fat
// margin was a real, measured contributor to "buffering takes forever" —
// dropped to 0.25 (2.25x area, ~44% fewer tiles than 0.5) once that shipped.
export const DETAIL_MARGIN = 0.25;
export const SYNC_MS = 90;          // React tf-mirror sync cadence during gestures (~11Hz)
export const GESTURE_MS = 140;      // wheel/pinch quiet window before the detail view re-renders
// A backgrounded/hidden tab can suspend pdf.js's render scheduling indefinitely (promise
// neither resolves nor rejects, no console error — Chrome throttles rAF-gated work in
// hidden tabs). The primary recovery for THAT case is the visibilitychange retry below —
// this is only a backstop for some other, unknown cause of a wedged render, so it's set
// long enough to never fire on a merely slow (not stuck) render — confirmed live: a large
// region under real CPU contention took 50+ seconds and still resolved on its own.
export const DETAIL_STALL_MS = 25000;

// Floating panels' berths, px. The Symbol Sweep review panel: position
// fixed, FLOAT_GAP from the WINDOW's right edge and below the top bar,
// SWEEP_PANEL_W wide. Inside the canvas: CANVAS_EDGE to its edges, and
// RAIL_CLEAR, the right clearance the live readout and the Zone check panel
// keep from the panel rail (right 14, 34 wide). The Zone check panel sits at
// right RAIL_CLEAR, bottom CANVAS_EDGE, ZONE_PANEL_W wide, as tall as its rows.
export const FLOAT_GAP = 12;
export const SWEEP_PANEL_W = 288;
export const CANVAS_EDGE = 14;
export const RAIL_CLEAR = 56;
export const ZONE_PANEL_W = 300;

import { SNAP_CELL } from "./takeoffConstants.ts";
export { SNAP_CELL };   // snap-grid bucket, raster px (Spline runs 12 — its budgeted raster is denser)

// toolbar menus — STACK-style: the menu face shows the armed tool
export const MEASURE_TOOLS = [
  { id: "oneclick", icon: "oneClick", label: "One-Click Area", shortcut: "O" },
  { id: "area", icon: "area", label: "Area", shortcut: "A" },
  { id: "rect", icon: "rectTool", label: "Rectangle", shortcut: "R" },
  { id: "linear", icon: "linear", label: "Linear", shortcut: "L" },
  { id: "surface", icon: "surface", label: "Surface Area", shortcut: "S" },
  { id: "count", icon: "count", label: "Count", shortcut: "C" },
  { id: "symbol", icon: "symbol", label: "Symbol — marquee ONE instance, count every placement (#264)", shortcut: "Y" },
];
export const CUT_TOOLS = [
  { id: "deduct", icon: "deduct", label: "Deduct shape", shortcut: "D" },
  { id: "deduct-rect", icon: "deductRect", label: "Deduct rectangle", shortcut: "⇧D" },
];
export const MARKUP_TOOLS = [
  { id: "highlighter", icon: "highlighter", label: "Highlighter", shortcut: "H" },
  { id: "cloud", icon: "cloud", label: "Revision cloud" },
  { id: "callout", icon: "callout", label: "Callout" },
  { id: "text", icon: "textNote", label: "Text note" },
  { id: "highlight", icon: "highlight", label: "Highlight box" },
  // N, not M — M is the push-to-talk dictation hold, globally
  { id: "dimension", icon: "dimension", label: "Dimension line", shortcut: "N" },
  { id: "image", icon: "image", label: "Image — marquee a region, or upload a file" },
];
export const MARKUP_IDS = MARKUP_TOOLS.map((t) => t.id);
// highlighter inks — literal hex (SVG attrs; CSS vars don't resolve there).
// The freehand TOOL is "highlighter" (the two-corner "highlight" box above is
// its own tool); its strokes persist as type:"highlight" + pts, the same
// record the pre-fork canvas wrote, so old saved strokes render unchanged —
// every reader discriminates on pts (stroke) vs rect (box).
export const HL_INKS = ["#ffd60a", "#ff9f0a", "#34c759", "#3fa9ff", "#ff6ea8"];
export const HL_SIZES = [["F", 8], ["M", 14], ["B", 22]];   // screen px at draw time

// Flooring-first starter conditions seeded on a fresh workspace — line color +
// hatch chosen to read like the real finish; waste % is a sensible default you
// can change per condition (it's never auto-applied to the live readout, only
// the Report). Delete any you don't need.
// Each default also carries a couple of editable starter materials — quantities
// derive deterministically from measured area/linear ÷ a coverage rate you set
// (off the product data sheet). Delete/edit freely; they're just sensible seeds.
// Per-material-kind coverage presets (adhesive trowel notches, mortar trowels)
// and the grout-from-tile-geometry calculator live in lib/coverage.js —
// vendor-neutral, generic rates; always verify against the product data sheet.
// Expressed in TEMPLATE shape (finish_tag/waste_pct/materials, no fill — it
// defaults from color) so seeding and the Library run the same constructor.
// Orkestro (AU) seeds: metric purchase units. `per` stays stored against the
// internal basis (SF / LF per unit), so the AU rates are written in m² / m and
// converted here. Lines marked incl_waste are the finish itself (boxes, lengths)
// and order off the waste-adjusted quantity; sundries (adhesive) do not.
// Rates are generic starting points; set them from the product data sheet.
const M2 = (v) => v / M2_PER_SF;   // m² per unit → SF per unit
const LM = (v) => v / M_PER_FT;    // m per unit  → LF per unit
// Grout calculator geometry is stored in inches / lb (lib/coverage.js); this is
// a 600×600×10 mm porcelain tile, 3 mm joint, 5 kg bag, written in that contract.
const MM_IN = (mm) => Math.round((mm / 25.4) * 1000) / 1000;
const AU_TILE_GROUT = { tileL: MM_IN(600), tileW: MM_IN(600), tileT: MM_IN(10), joint: MM_IN(3), bagLbs: 11.023 };
export const FLOORING_DEFAULTS = [
  { finish_tag: "CPT-1", color: "#2f7d54", hatch: "speckle", waste_pct: 5,  materials: [                                                                                                  // Carpet tile
    { name: "Carpet tiles", per: M2(5), basis: "area", unit: "box", incl_waste: true, note: "20 × 500×500 tiles" },
    { name: "Tackifier adhesive", kind: "adhesive", per: M2(6), basis: "area", unit: "L" },
  ] },
  { finish_tag: "BRD-1", color: "#be185d", hatch: "dots",    waste_pct: 10, materials: [{ name: "Adhesive", kind: "adhesive", per: M2(4), basis: "area", unit: "L" }] },               // Broadloom carpet (roll goods)
  { finish_tag: "LVT-1", color: "#b8860b", hatch: "plank",   waste_pct: 8,  materials: [                                                                                                  // Luxury vinyl plank/tile
    { name: "LVT planks", per: M2(2.2), basis: "area", unit: "box", incl_waste: true },
    { name: "Adhesive", kind: "adhesive", per: M2(4), basis: "area", unit: "L" },
  ] },
  { finish_tag: "WD-1",  color: "#9a3412", hatch: "plank",   waste_pct: 10, materials: [                                                                                                  // Solid timber — glue-down + site-finished
    { name: "Timber flooring", per: M2(1.5), basis: "area", unit: "pack", incl_waste: true },
    { name: "Adhesive (wood, SMP)",     kind: "adhesive", per: M2(1.2), basis: "area", unit: "L", note: "6 mm V-notch" },
    { name: "Sealer (primer coat)",     per: M2(10), basis: "area", unit: "L", note: "1 prime coat" },
    { name: "Polyurethane (2K finish)", per: M2(3.3), basis: "area", unit: "L", note: "≈3 coats" },
  ] },
  { finish_tag: "VT-1",  color: "#2563eb", hatch: "checker", waste_pct: 5,  materials: [                                                                                                  // Vinyl composition tile
    { name: "Vinyl tiles", per: M2(4.2), basis: "area", unit: "box", incl_waste: true },
    { name: "Adhesive", kind: "adhesive", per: M2(8.5), basis: "area", unit: "L" },
  ] },
  { finish_tag: "SV-1",  color: "#0d9488", hatch: "solid",   waste_pct: 10, materials: [                                                                                                  // Sheet vinyl
    { name: "Adhesive", kind: "adhesive", per: M2(3.7), basis: "area", unit: "L" },
    // Seam welding is figured off the ROLL LAYOUT, never off a share of the
    // perimeter: basis "seam_lf" is the length where two cuts meet on the
    // floor (lib/rollgoods.js seamLfBySrc). It reads 0 until the condition
    // carries a roll setup — which is the honest answer, since nothing has
    // decided yet how the sheet gets cut.
    { name: "Heat-weld rod", per: LM(1), basis: "seam_lf", unit: "m", round: false, note: "runs the figured seams — set the roll width on this condition" },
  ] },
  { finish_tag: "CT-1",  color: "#9333ea", hatch: "grid",    waste_pct: 10, materials: [                                                                                                  // Ceramic / porcelain tile
    { name: "Tiles", per: M2(1.44), basis: "area", unit: "box", incl_waste: true, note: "600×600, 4 per box" },
    { name: "Tile adhesive (20 kg)", kind: "mortar", per: M2(4.5), basis: "area", unit: "bag", note: "10 mm square notch" },
    { name: "Grout (5 kg)", kind: "grout", per: groutCoverageSfPerBag(AU_TILE_GROUT), basis: "area", unit: "bag", grout: { ...AU_TILE_GROUT }, note: "600×600×10 mm tile @ 3 mm joint · 5 kg bag" },
  ] },
  { finish_tag: "RB-1",  color: "#475569", hatch: "horiz",   waste_pct: 5,  materials: [                                                                                                  // Rubber / resilient skirting (linear)
    { name: "Skirting", per: LM(2.4), basis: "linear", unit: "length", incl_waste: true, note: "2.4 m lengths" },
    { name: "Skirting adhesive", kind: "adhesive", per: LM(12), basis: "linear", unit: "tube" },
  ] },
  { finish_tag: "TR-1",  color: "#c96442", hatch: "vert",    waste_pct: 0,  materials: [                                                                                                  // Transitions / reducers (linear)
    { name: "Transition strip", per: LM(2.7), basis: "linear", unit: "length", incl_waste: true, note: "2.7 m lengths" },
  ] },
];
