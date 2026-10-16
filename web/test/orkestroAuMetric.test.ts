import { test } from "node:test";
import assert from "node:assert/strict";
import { detectScale, isoSheetSize, notedPaperSize, paperAdjustedScale, STANDARD_SCALES, isMetricScaleLabel, scaleFromLabel } from "../src/lib/sheets";
import { counterRows } from "../src/lib/liveCounter.js";
import { defaultRollSetup, rollQtyForUnit, rollUnitLabel } from "../src/lib/rollgoods.js";
import { mintRollSetup } from "../src/lib/rollTakeoff.js";
import { applyUnits, TABLE_PROFILE } from "../src/lib/reportColumns.js";
import { FLOORING_DEFAULTS } from "../src/lib/canvasConstants.js";

const MM = 72 / 25.4; // points per mm

test("metric presets include detail and site scales", () => {
  for (const l of ["1:5", "1:10", "1:1000"]) assert.ok(STANDARD_SCALES.some((s) => s.label === l), l);
  assert.equal(scaleFromLabel("1:10")?.label, "1:10");      // never its 1:100 neighbour
  assert.equal(scaleFromLabel("1:100")?.label, "1:100");
  assert.equal(scaleFromLabel("1:1000")?.label, "1:1000");
  assert.ok(isMetricScaleLabel("1:100"));
  assert.ok(!isMetricScaleLabel('1/8" = 1\'-0"'));
});

test("isoSheetSize reads A-series pages in either orientation", () => {
  assert.equal(isoSheetSize(420 * MM, 297 * MM), "A3");
  assert.equal(isoSheetSize(594 * MM, 841 * MM), "A1");
  assert.equal(isoSheetSize(612, 792), null); // US Letter
});

test("notedPaperSize finds '@ A1' / 'AT A3' after a ratio", () => {
  assert.equal(notedPaperSize(["SCALE 1:100 @ A1"]), "A1");
  assert.equal(notedPaperSize(["1:50 at A3"]), "A3");
  assert.equal(notedPaperSize(["1:100"]), null);
});

test("paperAdjustedScale: 1:100 @ A1 on an A3 sheet measures 1:200", () => {
  const adj = paperAdjustedScale("1:100", "A1", "A3")!;
  const s200 = STANDARD_SCALES.find((s) => s.label === "1:200")!;
  assert.ok(Math.abs(adj.upp - s200.upp) < 1e-12);
  assert.match(adj.label, /^1:200 /);
  assert.equal(paperAdjustedScale("1:100", "A1", "A1"), null);
  assert.equal(paperAdjustedScale('1/8" = 1\'-0"', "A1", "A3"), null);
});

test("detectScale applies the sheet-size correction on an A3 page", () => {
  const W = 420 * MM, H = 297 * MM;
  const VP = { width: W, height: H, transform: [1, 0, 0, 1, 0, 0] } as never;
  const item = (str: string, x: number, y: number) => ({ str, transform: [1, 0, 0, 1, x, y], width: str.length * 6, height: 8 });
  const d = detectScale({ items: [item("SCALE 1:100 @ A1", W * 0.8, H * 0.9)] } as never, VP)!;
  assert.ok(d);
  assert.deepEqual(d.paper, { noted: "A1", actual: "A3" });
  assert.match(d.label, /^1:200/);
  // without the note: plain 1:100
  const plain = detectScale({ items: [item("SCALE 1:100", W * 0.8, H * 0.9)] } as never, VP)!;
  assert.equal(plain.label, "1:100");
});

test("live counter shows m² / m in metric", () => {
  const totals = [{ id: "c", finish_tag: "CPT-1", color: "#000", shape_count: 1, total_sf: 1425.45, lf: 10, ea: 0 }];
  const [m] = counterRows(totals, "c", "metric");
  assert.equal(m.qtys[0].unit, "m²");
  assert.ok(Math.abs(m.qtys[0].qty - 132.43) < 0.01);
  assert.equal(m.qtys[1].unit, "m");
  const [i] = counterRows(totals, "c");
  assert.equal(i.qtys[0].unit, "SF");
});

test("metric roll goods: 3.66 m broadloom by the lm, 2 m sheet by the m²", () => {
  const c = defaultRollSetup("carpet", "metric");
  assert.ok(Math.abs(c.roll_width_ft * 0.3048 - 3.66) < 1e-9);
  assert.equal(c.price_unit, "lm");
  assert.equal(mintRollSetup("sheet_vinyl", "metric").price_unit, "m2");
  const orderFt = 10 / 0.3048; // 10 m off the roll
  assert.ok(Math.abs(rollQtyForUnit(orderFt, c.roll_width_ft, "lm") - 10) < 1e-9);
  assert.ok(Math.abs(rollQtyForUnit(orderFt, c.roll_width_ft, "m2") - 36.6) < 1e-9);
  assert.equal(rollUnitLabel("m2"), "m²");
  assert.equal(defaultRollSetup("carpet").price_unit, "sy"); // imperial untouched
});

test("metric column picker labels never say SF / LF / SY", () => {
  const headers = applyUnits(TABLE_PROFILE, "metric").map((c: any) => c.header).join("|");
  assert.ok(!/\b(SF|LF|SY)\b/.test(headers), headers);
});

test("AU tile seed: 20 kg adhesive and 5 kg grout, no imperial trowel notes", () => {
  const ct = FLOORING_DEFAULTS.find((t: any) => t.finish_tag === "CT-1")!;
  for (const m of ct.materials as any[]) assert.ok(!/″|lb\b/.test(m.note || ""), m.note);
  const grout = (ct.materials as any[]).find((m) => m.kind === "grout");
  const m2PerBag = grout.per * 0.09290304;
  assert.ok(m2PerBag > 20 && m2PerBag < 40, String(m2PerBag));
  assert.ok(!FLOORING_DEFAULTS.some((t: any) => t.finish_tag === "VCT-1"));
});

import { isValidAbn, formatAbn } from "../src/lib/abn.js";
test("ABN checksum and formatting", () => {
  assert.ok(isValidAbn("51 824 753 556"));     // ATO's published example
  assert.ok(!isValidAbn("51 824 753 557"));
  assert.ok(!isValidAbn("1234"));
  assert.equal(formatAbn("51824753556"), "51 824 753 556");
  assert.equal(formatAbn("abc"), "abc");
});

import { estimateRows, estimateSummary, estimateCsv, rateFromDisplay, rateToDisplay, fmtAud, hasPricing } from "../src/lib/estimate.js";
import { conditionTotals } from "../src/lib/totals.js";
test("estimate: supply on waste qty, labour on measured, priced buy-list lines, GST", () => {
  const sf = 100 / 0.09290304; // 100 m²
  const cond = { id: "c", finish_tag: "LVT-1", waste_pct: 10, pricing: { supply: 40, labour: 25 }, materials: [
    { name: "Adhesive", per: 4 / 0.09290304, basis: "area", unit: "L", price: 12.5 },
    { name: "Primer", per: 10 / 0.09290304, basis: "area", unit: "L" },
  ] };
  const rows = conditionTotals([cond], [{ id: "s", condition_id: "c", measure_role: "floor_area", computed: { area_sf: sf } }]);
  const [l] = estimateRows([cond], rows);
  assert.equal(l.unit, "m²");
  assert.equal(l.supply, 4400);        // 110 m² × $40
  assert.equal(l.labour, 2500);        // 100 m² × $25
  assert.equal(l.materials_cost, 312.5); // 25 L × $12.50; primer unpriced
  assert.equal(l.total, 7212.5);
  const s = estimateSummary([l], { margin_pct: 10 });
  assert.equal(s.margin, 721.25);
  assert.equal(s.ex_gst, 7933.75);
  assert.equal(s.gst, 793.38);
  assert.equal(s.inc_gst, 8727.13);
  assert.equal(estimateSummary([l], { gst_registered: false }).gst, 0);
  assert.match(estimateCsv([l], s), /Total inc GST,.*8727\.13/);
  assert.equal(fmtAud(1234.5), "$1,234.50");
});

test("estimate: unpriced conditions stay out; imperial rate edge round-trips", () => {
  assert.equal(hasPricing({ materials: [{ name: "x" }] }), false);
  assert.deepEqual(estimateRows([{ id: "c", materials: [] }], [{ id: "c", total_sf: 10 }]), []);
  const perSf = rateToDisplay(50, "area", "imperial");
  assert.ok(Math.abs(rateFromDisplay(perSf, "area", "imperial") - 50) < 1e-9);
  assert.equal(rateToDisplay(50, "area", "metric"), 50);
});

import { FITOUT_TEMPLATES } from "../src/lib/canvasConstants.js";
import { instantiateTemplate } from "../src/lib/canvasUtil.js";
test("fitout PT-1: a 10 m run of 2.7 m partition buys sensible quantities", () => {
  const c = instantiateTemplate(FITOUT_TEMPLATES.find((t: any) => t.finish_tag === "PT-1"));
  assert.ok(Math.abs(c.height_ft * 0.3048 - 2.7) < 1e-9);
  const wallSf = 27 / 0.09290304; // 10 m × 2.7 m
  const [r] = conditionTotals([c], [{ id: "s", condition_id: c.id, measure_role: "surface_area", computed: { area_sf: wallSf } }]);
  const q = Object.fromEntries(r.materials.map((m: any) => [m.name.split(" ")[0] + " " + m.name.split(" ")[1], m.qty]));
  assert.equal(q["Plasterboard 13"], 19);   // 54 m² board +10% / 3.24
  assert.equal(q["Steel stud"], 17);        // 27 / 1.62 → 16.7
  assert.equal(q["Track 92"], 7);           // 20 m of track / 3 m
});

test("fitout templates: unique tags, every material has a unit and coverage", () => {
  const tags = FITOUT_TEMPLATES.map((t: any) => t.finish_tag);
  assert.equal(new Set(tags).size, tags.length);
  for (const t of FITOUT_TEMPLATES as any[]) for (const m of t.materials) assert.ok(m.unit && m.per > 0, `${t.finish_tag} ${m.name}`);
  assert.ok(!tags.some((t: string) => FLOORING_DEFAULTS.some((f: any) => f.finish_tag === t)));
});
