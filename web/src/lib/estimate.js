// Estimate (AUD) — the Orkestro pricing layer over a finished takeoff.
//
// Quantities stay exactly as measured (lib/totals.js); this module only
// multiplies them by rates the estimator types in, so a takeoff with no rates
// is unchanged everywhere. Pure functions, node-tested.
//
// Where the money lives:
//   condition.pricing = { supply, labour }  $ per METRIC unit of the
//     condition's primary measure (m² for areas, m for linear runs, ea for
//     counts). Supply prices the waste-adjusted quantity (what you buy);
//     labour prices the measured quantity (what gets laid). Stored metric
//     because the rate is what a supplier quotes in AU; imperial screens
//     convert at the edge (rateToDisplay / rateFromDisplay).
//   material.price = $ per purchase unit (a box, a bag, a 2.4 m length) on a
//     buy-list line. The line cost is its rounded-up order qty × price, so
//     sundries and the finish itself can be priced off supplier price lists.
//   project estimate settings = { margin_pct, gst_registered } (saved with
//     the project in clientInfo.estimate).
//
// Money is rounded to cents at each line and summed from the rounded lines,
// so the printed lines always add up to the printed totals.

import { M2_PER_SF, M_PER_FT } from "./units";

export const GST_RATE = 0.1;

const cents = (v) => Math.round((Number(v) || 0) * 100) / 100;
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * The quantity a condition is priced on, in metric.
 * Area wins over linear, linear over count: a tile floor with a border strip
 * prices per m²; its border linear is a material line, not the rate basis.
 * @returns {{kind:"area"|"len"|"count"|null, unit:string, measured:number, net:number}}
 */
export function pricingBasis(row) {
  if (!row) return { kind: null, unit: "", measured: 0, net: 0 };
  if (row.total_sf > 0) return { kind: "area", unit: "m²", measured: row.total_sf * M2_PER_SF, net: row.total_sf_net * M2_PER_SF };
  if (row.lf > 0) return { kind: "len", unit: "m", measured: row.lf * M_PER_FT, net: row.lf_net * M_PER_FT };
  if (row.ea > 0) return { kind: "count", unit: "ea", measured: row.ea, net: row.ea };
  return { kind: null, unit: "", measured: 0, net: 0 };
}

/** Does this condition carry any price at all (rate or priced material line)? */
export function hasPricing(c) {
  if (!c) return false;
  if (num(c.pricing?.supply) || num(c.pricing?.labour)) return true;
  return (c.materials || []).some((m) => m && num(m.price));
}

/**
 * One estimate line per priced condition.
 * @param conditions live conditions (for pricing + material prices)
 * @param rows conditionTotals() output for the same conditions
 */
export function estimateRows(conditions, rows) {
  const byId = new Map((conditions || []).map((c) => [c.id, c]));
  const out = [];
  for (const r of rows || []) {
    const c = byId.get(r.id);
    if (!c || !hasPricing(c)) continue;
    const b = pricingBasis(r);
    const supplyRate = num(c.pricing?.supply), labourRate = num(c.pricing?.labour);
    const supply = cents(b.net * supplyRate);
    const labour = cents(b.measured * labourRate);
    // conditionTotals keeps material order and drops nameless lines; match it.
    const live = (c.materials || []).filter((m) => m && m.name);
    const materials = (r.materials || []).map((tm, i) => {
      const price = num(live[i]?.price);
      return { name: tm.name, unit: tm.unit, qty: tm.qty, price, cost: cents(tm.qty * price) };
    }).filter((m) => m.price > 0);
    const materialsCost = cents(materials.reduce((s, m) => s + m.cost, 0));
    out.push({
      id: r.id, finish_tag: r.finish_tag, color: r.color,
      kind: b.kind, unit: b.unit,
      qty_measured: Math.round(b.measured * 100) / 100,
      qty_net: Math.round(b.net * 100) / 100,
      supply_rate: supplyRate, supply,
      labour_rate: labourRate, labour,
      materials, materials_cost: materialsCost,
      total: cents(supply + labour + materialsCost),
    });
  }
  return out;
}

/** Totals block: subtotal → margin → ex GST → GST → inc GST. */
export function estimateSummary(lines, settings = {}) {
  const marginPct = Math.max(0, Number(settings.margin_pct) || 0);
  const gstOn = settings.gst_registered !== false;
  const supply = cents((lines || []).reduce((s, l) => s + l.supply, 0));
  const labour = cents((lines || []).reduce((s, l) => s + l.labour, 0));
  const materials = cents((lines || []).reduce((s, l) => s + l.materials_cost, 0));
  const subtotal = cents(supply + labour + materials);
  const margin = cents(subtotal * marginPct / 100);
  const exGst = cents(subtotal + margin);
  const gst = gstOn ? cents(exGst * GST_RATE) : 0;
  return { supply, labour, materials, subtotal, margin_pct: marginPct, margin, ex_gst: exGst, gst_registered: gstOn, gst, inc_gst: cents(exGst + gst) };
}

/** $1,234.50 — en-AU, always two decimals. */
export function fmtAud(v) {
  return (Number(v) || 0).toLocaleString("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── display edge: rates are stored per metric unit ──────────────────────────
/** stored $/m² | $/m → shown $/SF | $/LF on an imperial screen */
export function rateToDisplay(rate, kind, units) {
  const r = Number(rate) || 0;
  if (units !== "imperial") return r;
  if (kind === "area") return r * M2_PER_SF;
  if (kind === "len") return r * M_PER_FT;
  return r;
}
/** typed $/SF | $/LF → stored $/m² | $/m */
export function rateFromDisplay(rate, kind, units) {
  const r = Number(rate) || 0;
  if (units !== "imperial") return r;
  if (kind === "area") return r / M2_PER_SF;
  if (kind === "len") return r / M_PER_FT;
  return r;
}
export function rateUnitLabel(kind, units) {
  if (kind === "area") return units === "imperial" ? "SF" : "m²";
  if (kind === "len") return units === "imperial" ? "LF" : "m";
  if (kind === "count") return "ea";
  return units === "imperial" ? "SF" : "m²";
}

// ── exports ─────────────────────────────────────────────────────────────────
/** CSV block appended to the report CSV when anything is priced. */
export function estimateCsvRows(lines, summary) {
  const rows = [["Estimate (AUD)"], ["Finish", "Qty (w/Waste)", "Unit", "Supply $/unit", "Supply $", "Labour qty", "Labour $/unit", "Labour $", "Materials $", "Total ex GST $"]];
  for (const l of lines) {
    rows.push([l.finish_tag, l.qty_net, l.unit, l.supply_rate, l.supply, l.qty_measured, l.labour_rate, l.labour, l.materials_cost, l.total]);
  }
  rows.push(["Subtotal", "", "", "", summary.supply, "", "", summary.labour, summary.materials, summary.subtotal]);
  if (summary.margin) rows.push([`Margin ${summary.margin_pct}%`, "", "", "", "", "", "", "", "", summary.margin]);
  rows.push(["Total ex GST", "", "", "", "", "", "", "", "", summary.ex_gst]);
  rows.push([summary.gst_registered ? "GST 10%" : "GST (not registered)", "", "", "", "", "", "", "", "", summary.gst]);
  rows.push(["Total inc GST", "", "", "", "", "", "", "", "", summary.inc_gst]);
  return rows;
}

const csvCell = (v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
/** The estimate block as CSV text ("" when nothing is priced). */
export function estimateCsv(lines, summary) {
  if (!lines || !lines.length) return "";
  return estimateCsvRows(lines, summary).map((r) => r.map(csvCell).join(",")).join("\n");
}
