// The curated Loki Research hardware graph — the third motor system.
//
// Loki's reloadable model is the simplest of the three, and the most reuse-heavy. Every Loki
// instruction sheet splits its parts into "Motor Hardware" (reusable, bought once) and a
// "Reload Kit" (single-use). Confirmed identical across 38/54/76 mm:
//   - Reusable Motor Hardware: the case, a graphite nozzle, a forward bulkhead (the forward
//     closure), a stainless nozzle washer, and two snap/retaining rings.
//   - Single-use Reload Kit: the liner tube, propellant grain(s), o-rings, and a delay or
//     smoke element — and, on some reloads, a black-powder ejection cap.
// So unlike AeroTech (nozzle is single-use) and unlike Cesaroni (both closures ship in the
// reload), Loki reuses BOTH closures and the nozzle; the reload contains no closures at all.
//
// Fit model: Loki publishes NO spacer or reload-adapter system — each reload is matched to one
// case size. So Loki is native-fit only; there are no adapters here. (A single case size does
// fly several same-impulse reloads, e.g. the 54/2800 flies K350/K830/L1400/L1040 — but that is
// native fit, not spacing a short load into a long case.)
//
// Two hard, per-reload safety constraints Loki states but that aren't in the catalog, carried
// as notes rather than resolved: the graphite nozzle is sold by throat number and the correct
// one must match the reload; and some longer 54 mm reloads need Loki's Extended Bulkhead rather
// than the standard one. Both are deferred to the reload's printed instructions.
//
// The 98 mm line is intentionally omitted: Loki has discontinued 98 mm hardware ("all production
// of 98 mm hardware is on hold"), so there is no case to buy — the lone 98/12500 reload is
// made-to-order for legacy hardware and isn't modeled here.
//
// Sourcing: case → reload mapping is authoritative from ThrustCurve; the hardware model, case
// lineup, and closure reuse are from Loki's own store pages and instruction PDFs.

import type { Diameter, HardwarePart, MotorCase } from "./types";

const S = {
  tc: "https://www.thrustcurve.org",
  store38: "https://lokiresearch.com/secure/store.asp?groupid=5520031443530",
  store54: "https://lokiresearch.com/secure/store.asp?groupid=521200312291168",
  store76: "https://lokiresearch.com/secure/store.asp?groupid=52120032164128",
  pdf38: "https://www.lokiresearch.com/images/Documents/38mm%20Spitfire.pdf",
  pdf54: "https://lokiresearch.com/Documents/54mm_K350_L1400_instructions.pdf",
  pdf76: "https://lokiresearch.com/Documents/76mm_Blue_instructions.pdf",
  case76dwg: "http://lokiresearch.com/Documents/76mm_case.pdf",
};

// Case sizes actually offered by Loki and referenced by ThrustCurve reloads, by diameter.
// The number is the case's approximate total impulse in newton-seconds.
const CASES_BY_DIA: Record<number, number[]> = {
  38: [120, 240, 480, 740, 1200],
  54: [1200, 2000, 2800, 4000],
  76: [3600, 6000, 8000],
};
const DIAMETERS = [38, 54, 76] as const;

const storeSrc: Record<number, string> = { 38: S.store38, 54: S.store54, 76: S.store76 };
const pdfSrc: Record<number, string> = { 38: S.pdf38, 54: S.pdf54, 76: S.pdf76 };

// Some longer 54 mm reloads need Loki's Extended Bulkhead + its matching rings, not the standard
// bulkhead — owning the case isn't enough on its own. Carried as a case note (per Loki's 54/2800
// "Combo", which bundles both bulkhead configs so it can fly all four of its reloads).
const EXT_BULKHEAD_NOTE =
  "Some longer 54 mm reloads (the heavier L/M loads) need Loki's Extended Bulkhead and its " +
  "matching retaining rings instead of the standard bulkhead — check the reload's instructions " +
  "before you rely on a closure you own.";

// Forward bulkhead (forward closure) + graphite nozzle (aft closure), one reusable pair per
// diameter, shared across every case length in that diameter (Loki's 76 mm case drawing:
// "other than length, all 76 mm cases are identical"). Loki has no separate forward seal disc —
// the reusable bulkhead's o-ring seals the forward end.
export const LOKI_PARTS: HardwarePart[] = DIAMETERS.flatMap((d) => [
  {
    id: `loki-fc-${d}`,
    kind: "forward-closure" as const,
    name: `${d} mm forward bulkhead`,
    diameter: d as Diameter,
    sources: [storeSrc[d], pdfSrc[d]],
    notes: "Reusable; shared across every case length in this diameter.",
  },
  {
    id: `loki-nz-${d}`,
    kind: "aft-closure" as const,
    name: `${d} mm graphite nozzle`,
    diameter: d as Diameter,
    sources: [storeSrc[d], pdfSrc[d]],
    notes:
      "Reusable graphite nozzle, sold by throat number — the correct throat for your reload is " +
      "in its instructions, and the wrong nozzle can cause a motor failure.",
  },
]);

export const LOKI_CASES: MotorCase[] = DIAMETERS.flatMap((d) =>
  CASES_BY_DIA[d].map((ns) => {
    const designation = `${d}/${ns}`; // matches ThrustCurve's caseInfo verbatim
    return {
      id: `loki-${d}-${ns}`,
      designation,
      manufacturer: "Loki" as const,
      system: "Loki" as const,
      diameter: d as Diameter,
      slot: ns,
      slotLabel: `${ns}`,
      rangeCase: false,
      maxImpulseNs: ns, // the case's own N·s rating; graph.ts lifts it if a reload exceeds it
      forwardClosure: `loki-fc-${d}`,
      aftClosure: `loki-nz-${d}`,
      // No seal disc, and no adapter — Loki publishes no spacer system, so every fit is native.
      sources: [S.tc, storeSrc[d], ...(d === 76 ? [S.case76dwg] : [])],
      notes: d === 54 ? EXT_BULKHEAD_NOTE : undefined,
    };
  }),
);
