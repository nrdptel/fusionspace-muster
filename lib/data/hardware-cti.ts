// The curated Cesaroni Pro (CTI) hardware graph — the second motor system.
//
// Cesaroni's Pro reload is a self-contained cartridge: the grains, liner, nozzle, and forward
// closure disc come preassembled as one loadable unit, so the flyer doesn't build up grains and
// o-rings the way AeroTech RMS requires. Cartridges are sized 1G–6G plus a longer "6GXL".
//
// What matters most here — and what a first pass gets wrong — is that the reusable hardware
// differs BY DIAMETER (confirmed against the manufacturer):
//   - Pro38: the flyer reuses ONLY the case; both closures ship in the reload.
//   - Pro24 / Pro29 / Pro54: the case + the rear (aft) closure; the forward closure ships in the reload.
//   - Pro75 / Pro98: the full set (case + forward + rear/nozzle-holder closure).
//
// Spacers: Cesaroni's own instruction sheets state "up to two spacers can be used to load
// smaller reloads in a casing one or two sizes larger than the reload." That published rule
// (max two spacers, one or two grain-sizes down) is resolved here for the standard Pro29/38/54
// cases — the same bar as the RMS 38 mm chart. Pro24 has no spacers; the 6GXL cases and the
// Pro75/98 spacers are left as advisories (their exact piece-counts aren't cleanly published).
//
// Sourcing: the case → reload mapping is authoritative from ThrustCurve. Hardware, spacer rule,
// and closure model are from Cesaroni's instruction PDFs and vendor hardware pages.

import type { AdapterSystem, Diameter, HardwarePart, MotorCase, SpacerRule } from "./types";

const S = {
  tc: "https://www.thrustcurve.org/manufacturers/Cesaroni%20Technology/",
  resources: "https://pro38.com/resources/",
  spacer29: "https://pro38.com/wp-content/uploads/2024/11/Pro29_Case_Spacer.pdf",
  spacer38: "https://pro38.com/wp-content/uploads/2024/11/Pro38_Case_Spacer.pdf",
  spacer54: "https://pro38.com/wp-content/uploads/2024/11/Pro54_Case_Spacer.pdf",
  hw24: "https://www.rocketarium.com/Cesaroni/Hardware/24",
  hw29: "https://www.rocketarium.com/Cesaroni/Hardware/29",
  hw38: "https://www.rocketarium.com/Cesaroni/Hardware/38",
  hw54: "https://www.rocketarium.com/Cesaroni/Hardware/54",
  hw7598: "https://www.apogeerockets.com/Rocket_Motors/Cesaroni_Casings/75mm_Casings/Cesaroni_75mm_3-Grain_Hardware_Set",
  // Rear-closure / forward-closure part-number pages (the hardware pages above list the sets;
  // these name each closure's PN).
  cl29: "https://www.rocketarium.com/High-Power-Rocketry/Cesaroni/Hardware/29/Closure",
  nh75: "https://pro38.com/products/p75-nozzle-holder-rear-closure-nh/",
  nh98: "https://www.sunward1.com/product/pro98-nozzle-holder-p98-nh/",
  fc98: "https://www.sunward1.com/product/pro98-forward-closure-p98-fc/",
};

// Grain lengths present per diameter (from ThrustCurve's case field). `xl` marks the longer
// 6-grain "6GXL" case, which is its own hardware.
type Grain = { g: number; xl?: boolean };
const LADDER: Record<Diameter, Grain[]> = {
  24: [{ g: 1 }, { g: 2 }, { g: 3 }, { g: 6 }],
  29: [{ g: 1 }, { g: 2 }, { g: 3 }, { g: 4 }, { g: 5 }, { g: 6 }, { g: 6, xl: true }],
  38: [{ g: 1 }, { g: 2 }, { g: 3 }, { g: 4 }, { g: 5 }, { g: 6 }, { g: 6, xl: true }],
  54: [{ g: 1 }, { g: 2 }, { g: 3 }, { g: 4 }, { g: 5 }, { g: 6 }, { g: 6, xl: true }],
  75: [{ g: 2 }, { g: 3 }, { g: 4 }, { g: 5 }, { g: 6 }, { g: 6, xl: true }],
  98: [{ g: 1 }, { g: 2 }, { g: 3 }, { g: 4 }, { g: 5 }, { g: 6 }, { g: 6, xl: true }],
};

const DIAMETERS = [24, 29, 38, 54, 75, 98] as const;
// Which diameters reuse a rear (aft) closure, and which reuse a forward closure.
const REAR_CLOSURE = new Set<number>([24, 29, 54, 75, 98]); // NOT 38 (both closures ship in the reload)
const FWD_CLOSURE = new Set<number>([75, 98]);
// Diameters whose standard spacer fits Cesaroni publishes a clean rule for.
const RESOLVED_SPACER = new Set<number>([29, 38, 54]);
// Diameters with a spacer system we only advise on (vendor-inferred, or Pro24 which has none).
const ADVISORY_SPACER = new Set<number>([75, 98]);

// `src` is the general hardware page (also used as the case source); `pnSrc`, when present, is the
// page that names the closure's exact part number, cited alongside it on the closure part.
const rearSrc: Record<number, { pn?: string; src: string; pnSrc?: string }> = {
  24: { src: S.hw24 },
  29: { pn: "P29-CL", src: S.hw29, pnSrc: S.cl29 },
  54: { pn: "P54-CL", src: S.hw54 },
  75: { pn: "P75-NH", src: S.hw7598, pnSrc: S.nh75 },
  98: { pn: "P98-NH", src: S.hw7598, pnSrc: S.nh98 },
};

export const CTI_PARTS: HardwarePart[] = [
  ...[...REAR_CLOSURE].map((d) => {
    const r = rearSrc[d];
    return {
      id: `cti-ac-${d}`,
      kind: "aft-closure" as const,
      name: `${d} mm Pro rear closure`,
      diameter: d as Diameter,
      partNumber: r?.pn,
      sources: r?.pnSrc ? [r.src, r.pnSrc] : [r?.src ?? S.tc],
      notes: "Reusable; shared across every case length in this diameter. The nozzle is part of the reload cartridge, not reusable.",
    };
  }),
  ...[...FWD_CLOSURE].map((d) => ({
    id: `cti-fc-${d}`,
    kind: "forward-closure" as const,
    name: `${d} mm Pro forward closure`,
    diameter: d as Diameter,
    partNumber: d === 75 ? "P75-FC" : "P98-FC",
    sources: [d === 98 ? S.fc98 : S.hw7598],
    notes: "Reusable on Pro75/98 (part of the hardware set); shared across case lengths.",
  })),
];

// Build the standard spacer rules for a resolved diameter from the official rule:
// a standard case of G grains flies (G-1) grains with one spacer and (G-2) grains with two.
function spacerRules(d: number): SpacerRule[] {
  const rules: SpacerRule[] = [];
  for (const { g, xl } of LADDER[d as Diameter]) {
    if (xl || g < 2) continue; // XL is advisory; a 1G case has nothing shorter
    if (g - 1 >= 1) rules.push({ baseCase: `Pro${d}-${g}G`, spacers: 1, fliesCase: `Pro${d}-${g - 1}G` });
    if (g - 2 >= 1) rules.push({ baseCase: `Pro${d}-${g}G`, spacers: 2, fliesCase: `Pro${d}-${g - 2}G` });
  }
  return rules;
}

const spacerSrc: Record<number, string> = { 29: S.spacer29, 38: S.spacer38, 54: S.spacer54 };

export const CTI_ADAPTERS: AdapterSystem[] = [
  ...[...RESOLVED_SPACER].map((d) => ({
    id: `cti-spacer-${d}`,
    designation: `Pro${d} spacer`,
    name: `Cesaroni Pro${d} case spacer`,
    manufacturer: "Cesaroni" as const,
    diameter: d as Diameter,
    contents: ["One or two case spacers to take up the unused grain length in a longer case"],
    rules: spacerRules(d),
    advisoryOnly: false,
    sources: [spacerSrc[d], S.resources],
    notes: "Cesaroni allows up to two spacers, flying a reload one or two grain-sizes shorter. Confirm the spacer count against Cesaroni's instructions.",
  })),
  ...[...ADVISORY_SPACER].map((d) => ({
    id: `cti-spacer-${d}`,
    designation: `Pro${d} spacer`,
    name: `Cesaroni Pro${d} case spacer`,
    manufacturer: "Cesaroni" as const,
    diameter: d as Diameter,
    contents: ["Case spacer(s) to take up the unused grain length in a longer case"],
    rules: [],
    advisoryOnly: true,
    sources: [S.resources],
    notes: `A longer Pro${d} case flies shorter reloads with spacers, but Muster doesn't resolve the exact step for Pro${d} — confirm against Cesaroni's instructions.`,
  })),
];

// Pro38 (case-only) needs no note — the case-result summary already says the reload includes its
// closures. Pro24/29/54 reuse a rear closure but ship the forward closure in the reload, which the
// summary doesn't convey, so those carry a note.
const REAR_ONLY_NOTE = "The forward closure ships with the reload; you reuse the case and the rear closure.";
const XL_NOTE = "This longer 6GXL case also flies 6G and 5G reloads with a case spacer (a regular spacer on Pro29; an XL spacer on Pro38/54) — confirm the exact spacer setup against Cesaroni's instructions.";

function buildCtiCases(): MotorCase[] {
  const cases: MotorCase[] = [];
  for (const d of DIAMETERS) {
    const grains = LADDER[d];
    const minG = Math.min(...grains.map((x) => x.g));
    for (const { g, xl } of grains) {
      const designation = xl ? `Pro${d}-6GXL` : `Pro${d}-${g}G`;
      const resolved = RESOLVED_SPACER.has(d);
      const advisory = ADVISORY_SPACER.has(d);
      // Standard case in a resolved diameter → the resolved spacer adapter (unless it's the
      // smallest, with nothing shorter). Any case in an advisory diameter → the advisory adapter.
      // 6GXL cases in resolved diameters carry a note instead of a resolved fit.
      let adapter: string | undefined;
      let adapterAdvisory: true | undefined;
      if (advisory) {
        adapter = `cti-spacer-${d}`;
        adapterAdvisory = true;
      } else if (resolved && !xl && g > minG) {
        adapter = `cti-spacer-${d}`;
      }
      const notes = xl && resolved
        ? XL_NOTE
        : REAR_CLOSURE.has(d) && !FWD_CLOSURE.has(d)
          ? REAR_ONLY_NOTE
          : undefined;
      cases.push({
        id: "cti-" + designation.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        designation,
        manufacturer: "Cesaroni",
        system: "Pro",
        diameter: d as Diameter,
        slot: xl ? 6.5 : g, // XL sorts just after 6G
        slotLabel: xl ? "6GXL" : `${g}G`,
        rangeCase: false,
        // Filled from the reloads at graph-assembly time (Cesaroni cases have no single N·s rating).
        maxImpulseNs: 0,
        forwardClosure: FWD_CLOSURE.has(d) ? `cti-fc-${d}` : undefined,
        aftClosure: REAR_CLOSURE.has(d) ? `cti-ac-${d}` : undefined,
        adapter,
        adapterAdvisory,
        sources: [S.tc, d === 38 ? S.hw38 : rearSrc[d]?.src ?? S.resources],
        notes,
      });
    }
  }
  return cases;
}

export const CTI_CASES: MotorCase[] = buildCtiCases();
