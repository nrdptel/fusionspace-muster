// The curated AeroTech RMS hardware graph — the bespoke, hand-sourced half of Muster.
//
// The reloads (lib/data/reloads.json) are a factual ThrustCurve mirror. This file is the
// part that takes judgment: which reusable parts each case needs, and the spacer rules
// that let a shorter reload fly in a longer case. Every node cites its source.
//
// Sourcing discipline (this drives real hardware buying, so it matters):
//   - Case → reload mapping is authoritative from ThrustCurve's per-motor `caseInfo`.
//   - Forward/aft closures are shared across every case length within a diameter — the
//     whole economy of the system — confirmed by an AeroTech reload instruction sheet.
//   - Spacer compatibility is only RESOLVED for 38 mm, whose case ladder steps by exactly
//     one grain length and whose full spacer chart AeroTech publishes. 29 mm and 54 mm have
//     a RAS too, but their case lengths aren't evenly spaced, so those carry an advisory
//     rather than a fabricated step table.
//   - Part numbers are included only where a manufacturer/vendor page confirmed them.

import type { AdapterSystem, HardwarePart, MotorCase } from "./types";

// --- Sources (referenced by id below) ---------------------------------------
const S = {
  rms38: "https://aerotech-rocketry.com/collections/a-rms-38-hardware",
  rms29: "https://aerotech-rocketry.com/collections/a-rms-29-hardware",
  rms54: "https://aerotech-rocketry.com/collections/a-rms-54-hardware",
  rms24: "https://apogeerockets.com/Rocket-Motors/AeroTech-Casings/24mm-Casings/Aerotech-RMS-24-40-Motor-Hardware",
  ras38Apogee:
    "https://www.apogeerockets.com/Rocket_Motors/AeroTech_Accessories/AeroTech_38mm_Reload_Adapter_System",
  ras38AeroTech:
    "https://aerotech-rocketry.com/products/product_5a773ba0-68eb-df1a-37bf-817f3077b35a",
  ras29: "https://aerotech-rocketry.com/products/product_55be7e62-30b0-ee39-6e36-62265b43fdc6",
  ras54: "https://www.siriusrocketry.biz/ishop/54mm-reload-adapter-system-585.html",
  reloadSheet: "https://www.apogeerockets.com/downloads/PDFs/AT-I599N-Instructions.pdf",
  case38_360:
    "https://www.apogeerockets.com/Rocket_Motors/Rouse-Tech_Casings/38mm_Casings/RMS-38_360_Casing",
  case38_720:
    "https://www.apogeerockets.com/Rocket_Motors/Rouse-Tech_Casings/38mm_Casings/RMS-38_720_Casing",
  case29range:
    "https://www.apogeerockets.com/Rocket_Motors/Rouse-Tech_Casings/29mm_Casings/RMS-29_40-120",
};

// --- Reusable parts ---------------------------------------------------------
// Forward + aft closures, one pair per diameter, shared across every case length.
export const PARTS: HardwarePart[] = [
  // 24 mm
  { id: "fc-24", kind: "forward-closure", name: "24 mm forward closure", diameter: 24, sources: [S.rms24] },
  { id: "ac-24", kind: "aft-closure", name: "24 mm aft closure", diameter: 24, sources: [S.rms24] },
  // 29 mm
  { id: "fc-29", kind: "forward-closure", name: "29 mm forward closure", diameter: 29, partNumber: "29FCC", sources: [S.rms29] },
  { id: "ac-29", kind: "aft-closure", name: "29 mm aft closure", diameter: 29, partNumber: "29AC2", sources: [S.rms29] },
  { id: "sd-29", kind: "seal-disc", name: "29 mm forward seal disc", diameter: 29, sources: [S.rms29], notes: "Required on the longer 29 mm cases (240 and up); usually included with the complete hardware set." },
  // 38 mm
  { id: "fc-38", kind: "forward-closure", name: "38 mm forward closure", diameter: 38, partNumber: "38FCC", sources: [S.rms38] },
  { id: "ac-38", kind: "aft-closure", name: "38 mm aft closure", diameter: 38, partNumber: "38AC2", sources: [S.rms38] },
  { id: "sd-38", kind: "seal-disc", name: "38 mm forward seal disc", diameter: 38, sources: [S.rms38, S.case38_720], notes: "Required on the longer 38 mm cases (480 and up); usually included with the complete hardware set." },
  // 54 mm
  { id: "fc-54", kind: "forward-closure", name: "54 mm forward closure", diameter: 54, partNumber: "54FCC", sources: [S.rms54] },
  { id: "ac-54", kind: "aft-closure", name: "54 mm aft closure", diameter: 54, partNumber: "54ACC", sources: [S.rms54] },
  { id: "sd-54", kind: "seal-disc", name: "54 mm forward seal disc", diameter: 54, partNumber: "54FSDSS", sources: [S.rms54], notes: "Required on the longer 54 mm cases (1280 and up); usually included with the complete hardware set." },
];

// --- Adapter systems (RAS) --------------------------------------------------
export const ADAPTERS: AdapterSystem[] = [
  {
    id: "ras-38",
    designation: "38RAS",
    name: "38 mm Reload Adapter System",
    manufacturer: "AeroTech",
    diameter: 38,
    partNumber: "60222",
    contents: [
      "Floating forward closure (38FFC)",
      "2× case spacers (38FCCS)",
      "Forward-closure retaining ring (38FCRR)",
    ],
    // AeroTech's published 38RAS chart. Each spacer takes up one grain length; a maximum
    // of two spacers per motor. Verbatim, so a shorter reload's fit is exact.
    rules: [
      { baseCase: "RMS-38/720", spacers: 1, fliesCase: "RMS-38/600" },
      { baseCase: "RMS-38/720", spacers: 2, fliesCase: "RMS-38/480" },
      { baseCase: "RMS-38/600", spacers: 1, fliesCase: "RMS-38/480" },
      { baseCase: "RMS-38/600", spacers: 2, fliesCase: "RMS-38/360" },
      { baseCase: "RMS-38/480", spacers: 1, fliesCase: "RMS-38/360" },
      { baseCase: "RMS-38/480", spacers: 2, fliesCase: "RMS-38/240" },
      { baseCase: "RMS-38/360", spacers: 1, fliesCase: "RMS-38/240" },
      { baseCase: "RMS-38/360", spacers: 2, fliesCase: "RMS-38/120" },
      { baseCase: "RMS-38/240", spacers: 1, fliesCase: "RMS-38/120" },
    ],
    advisoryOnly: false,
    sources: [S.ras38Apogee, S.ras38AeroTech],
    notes: "Works with the 38/240 through 38/720 cases. It does NOT work with the 38/1080 or 38/1320 cases. Maximum two spacers per motor.",
  },
  {
    id: "ras-29",
    designation: "29RAS",
    name: "29 mm Reload Adapter System",
    manufacturer: "AeroTech",
    diameter: 29,
    contents: [
      "Floating forward closure (29FFC)",
      "Case spacers (29FCCS)",
      "Forward-closure retaining ring (29FCRR)",
    ],
    rules: [],
    advisoryOnly: true,
    sources: [S.ras29],
    notes: "Fits the 29/180, 29/240, and 29/360 cases. Because the 29 mm case lengths aren't evenly spaced, Muster doesn't resolve individual spacer steps here — confirm the exact case/reload/spacer combination against AeroTech's instructions.",
  },
  {
    id: "ras-54",
    designation: "54RAS",
    name: "54 mm Reload Adapter System",
    manufacturer: "AeroTech",
    diameter: 54,
    contents: [
      "Floating forward closure (54FFCS)",
      "Case spacers (54FCCS), plus a short spacer (54SFCCS) for some combinations",
      "Forward-closure retaining ring",
    ],
    rules: [],
    advisoryOnly: true,
    sources: [S.ras54],
    notes: "Lets the longer 54 mm cases fly some shorter reloads. Because the 54 mm case lengths aren't evenly spaced, Muster doesn't resolve individual spacer steps here — confirm the exact case/reload/spacer combination against AeroTech's instructions.",
  },
];

// --- Cases ------------------------------------------------------------------
// A compact table drives the case list; the factory fills in the shared closures,
// seal-disc need, and adapter eligibility per the rules documented above.
type CaseSeed = {
  slot: number;
  slotLabel?: string;
  /** Explicit designation, when it can't be built as `RMS-{dia}/{slot}` (range cases). */
  designation?: string;
  maxImpulseNs: number;
  partNumber?: string;
  rangeCase?: boolean;
  sealDisc?: boolean;
  /** "resolve" = full spacer table (38 mm); "advisory" = RAS exists but not resolved; undefined = none. */
  adapter?: "resolve" | "advisory";
  sources: string[];
  notes?: string;
};

const CASE_SEEDS: Record<24 | 29 | 38 | 54, CaseSeed[]> = {
  24: [
    { slot: 40, slotLabel: "20–40", designation: "RMS-R/C-24/20-40", maxImpulseNs: 40, rangeCase: true, sources: [S.rms24], notes: "Radio-control glider hardware; shorter reloads carry their own spacers." },
    { slot: 40, maxImpulseNs: 40, partNumber: "60001", sources: [S.rms24] },
    { slot: 60, maxImpulseNs: 60, sources: [S.rms24] },
  ],
  29: [
    { slot: 120, slotLabel: "40–120", designation: "RMS-29/40-120", maxImpulseNs: 120, rangeCase: true, partNumber: "60006", sources: [S.case29range], notes: "One mid-power case flies E16 through G138; the shorter reloads include their own spacers, so no separate adapter is needed." },
    { slot: 60, maxImpulseNs: 60, partNumber: "2960C", sources: [S.rms29] },
    { slot: 100, maxImpulseNs: 100, partNumber: "2910C", sources: [S.rms29] },
    { slot: 120, maxImpulseNs: 120, partNumber: "2912C", sources: [S.rms29] },
    { slot: 180, maxImpulseNs: 180, partNumber: "2918C", adapter: "advisory", sources: [S.rms29] },
    { slot: 240, maxImpulseNs: 240, partNumber: "2924C", sealDisc: true, adapter: "advisory", sources: [S.rms29] },
    { slot: 360, maxImpulseNs: 360, partNumber: "2936C", sealDisc: true, adapter: "advisory", sources: [S.rms29] },
  ],
  38: [
    { slot: 120, maxImpulseNs: 120, partNumber: "3812C", sources: [S.rms38] },
    { slot: 240, maxImpulseNs: 240, partNumber: "3824C", adapter: "resolve", sources: [S.rms38] },
    { slot: 360, maxImpulseNs: 360, partNumber: "3836C", adapter: "resolve", sources: [S.rms38, S.case38_360] },
    { slot: 480, maxImpulseNs: 480, partNumber: "3848C", sealDisc: true, adapter: "resolve", sources: [S.rms38] },
    { slot: 600, maxImpulseNs: 600, partNumber: "3860C", sealDisc: true, adapter: "resolve", sources: [S.rms38] },
    { slot: 720, maxImpulseNs: 697, sealDisc: true, adapter: "resolve", sources: [S.rms38, S.case38_720] },
    { slot: 1080, maxImpulseNs: 1080, partNumber: "3810C", sealDisc: true, sources: [S.rms38], notes: "The 38RAS adapter does not fit this case." },
    { slot: 1320, maxImpulseNs: 1320, sealDisc: true, sources: [S.rms38], notes: "The 38RAS adapter does not fit this case." },
  ],
  54: [
    { slot: 426, maxImpulseNs: 426, partNumber: "5442C", sources: [S.rms54] },
    { slot: 852, maxImpulseNs: 852, partNumber: "5485C", adapter: "advisory", sources: [S.rms54] },
    { slot: 1280, maxImpulseNs: 1280, partNumber: "5412C", sealDisc: true, adapter: "advisory", sources: [S.rms54] },
    { slot: 1706, maxImpulseNs: 1706, partNumber: "5417C", sealDisc: true, adapter: "advisory", sources: [S.rms54] },
    { slot: 2560, maxImpulseNs: 2560, partNumber: "5425C", sealDisc: true, adapter: "advisory", sources: [S.rms54] },
    { slot: 2800, maxImpulseNs: 2800, partNumber: "5428C", sealDisc: true, adapter: "advisory", sources: [S.rms54] },
  ],
};

function buildCases(): MotorCase[] {
  const cases: MotorCase[] = [];
  for (const dia of [24, 29, 38, 54] as const) {
    for (const seed of CASE_SEEDS[dia]) {
      const label = seed.slotLabel ?? String(seed.slot);
      // Designation must equal the reload's `caseInfo` verbatim, so range cases carry it
      // explicitly; the rest are the tidy `RMS-{dia}/{slot}` form.
      const designation = seed.designation ?? `RMS-${dia}/${seed.slot}`;
      const id = "rms-" + designation.replace(/^RMS-/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      cases.push({
        id,
        designation,
        manufacturer: "AeroTech",
        system: "RMS",
        diameter: dia,
        slot: seed.slot,
        slotLabel: label,
        rangeCase: !!seed.rangeCase,
        maxImpulseNs: seed.maxImpulseNs,
        partNumber: seed.partNumber,
        forwardClosure: `fc-${dia}`,
        aftClosure: `ac-${dia}`,
        sealDisc: seed.sealDisc ? `sd-${dia}` : undefined,
        adapter: seed.adapter ? `ras-${dia}` : undefined,
        adapterAdvisory: seed.adapter === "advisory" || undefined,
        sources: seed.sources,
        notes: seed.notes,
      });
    }
  }
  return cases;
}

export const CASES: MotorCase[] = buildCases();
