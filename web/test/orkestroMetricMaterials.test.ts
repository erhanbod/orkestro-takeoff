import { test } from "node:test";
import assert from "node:assert/strict";
import { conditionTotals } from "../src/lib/totals.js";
import { perToDisplay, perFromDisplay, basisLabels } from "../src/lib/units";
import { FLOORING_DEFAULTS } from "../src/lib/canvasConstants.js";
import { TABLE_PROFILE } from "../src/lib/reportColumns.js";
import { libPushPatch, matFieldOverridden } from "../src/lib/materials.js";

const M2_PER_SF = 0.09290304, M_PER_FT = 0.3048;

test("incl_waste orders a material off the waste-adjusted quantity; plain lines don't", () => {
  const sf = 100 / M2_PER_SF; // 100 m²
  const cond = { id: "c", finish_tag: "LVT-1", waste_pct: 10, materials: [
    { name: "LVT planks", per: 2.2 / M2_PER_SF, basis: "area", unit: "box", incl_waste: true },
    { name: "Adhesive", per: 4 / M2_PER_SF, basis: "area", unit: "L" },
  ] };
  const [r] = conditionTotals([cond], [{ id: "s", condition_id: "c", measure_role: "floor_area", computed: { area_sf: sf } }]);
  assert.equal(r.materials[0].qty, 50);   // 110 m² / 2.2 = 50 boxes
  assert.equal(r.materials[0].incl_waste, true);
  assert.equal(r.materials[1].qty, 25);   // 100 m² / 4 = 25 L, no waste
});

test("incl_waste on linear lengths rounds up whole lengths; never applies to counts", () => {
  const lf = 31.8 / M_PER_FT;
  const cond = { id: "c", finish_tag: "RB-1", waste_pct: 5, materials: [
    { name: "Skirting", per: 2.4 / M_PER_FT, basis: "linear", unit: "length", incl_waste: true },
    { name: "Stops", per: 1, basis: "count", unit: "ea", incl_waste: true },
  ] };
  const [r] = conditionTotals([cond], [
    { id: "s", condition_id: "c", measure_role: "linear", computed: { perimeter_lf: lf } },
    { id: "k", condition_id: "c", measure_role: "count", computed: { count: 3 } },
  ]);
  assert.equal(r.materials[0].qty, 14);   // 33.39 m / 2.4 = 13.9 → 14
  assert.equal(r.materials[1].qty, 3);
  assert.equal(r.materials[1].incl_waste, undefined);
});

test("metric coverage round-trips at the input edge", () => {
  const per = perFromDisplay(5, "area", "metric");
  assert.equal(perToDisplay(per, "area", "metric"), 5);
  assert.equal(perToDisplay(perFromDisplay(2.4, "linear", "metric"), "linear", "metric"), 2.4);
  assert.equal(perFromDisplay(7, "count", "metric"), 7);
  assert.equal(perToDisplay(250, "area", "imperial"), 250);
  assert.equal(basisLabels("metric").area, "floor m²");
});

test("AU seeds carry metric purchase units and an order line per finish", () => {
  const cpt = FLOORING_DEFAULTS.find((t: any) => t.finish_tag === "CPT-1")!;
  assert.ok(cpt.materials.some((m: any) => m.incl_waste && m.unit === "box"));
  assert.ok(!FLOORING_DEFAULTS.some((t: any) => t.materials.some((m: any) => m.unit === "gal")));
});

test("report table shows LF w/Waste by default", () => {
  const c = TABLE_PROFILE.find((x: any) => x.key === "lf_net")!;
  assert.equal(c.defaultVisible, true);
});

test("incl_waste rides the library link: override detection and push", () => {
  const lm = { id: "l", name: "Tiles", per: 10, basis: "area", unit: "box", incl_waste: true };
  assert.equal(matFieldOverridden({ name: "Tiles", per: 10, incl_waste: false }, lm, "incl_waste"), true);
  assert.equal(matFieldOverridden({ name: "Tiles", per: 10, incl_waste: true }, lm, "incl_waste"), false);
  const pushed = libPushPatch({ id: "m", name: "x", incl_waste: true }, { ...lm, incl_waste: undefined });
  assert.equal(pushed.incl_waste, undefined);
});
