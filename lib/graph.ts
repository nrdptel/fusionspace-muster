// Assembles the hardware graph: the curated cases/parts/adapters (lib/data/hardware.ts)
// joined to the ThrustCurve reload mirror (lib/data/reloads.json), with indexes for the
// resolver and a build-time sanity check so a data mistake fails the build instead of
// shipping a broken compatibility result.

import reloadsDoc from "./data/reloads.json";
import { CASES as RMS_CASES, PARTS as RMS_PARTS, ADAPTERS as RMS_ADAPTERS } from "./data/hardware";
import { CTI_CASES, CTI_PARTS, CTI_ADAPTERS } from "./data/hardware-cti";
import type { AdapterSystem, HardwarePart, Manufacturer, MotorCase, Reload } from "./data/types";
import { validateGraph } from "./validate";

// The full graph is every motor system merged. Cases/parts/adapters carry their manufacturer,
// and designations are distinct across systems, so nothing collides — a Cesaroni reload can't
// resolve to AeroTech hardware.
const CASES: MotorCase[] = [...RMS_CASES, ...CTI_CASES];
const PARTS: HardwarePart[] = [...RMS_PARTS, ...CTI_PARTS];
const ADAPTERS: AdapterSystem[] = [...RMS_ADAPTERS, ...CTI_ADAPTERS];

// The JSON is a faithful mirror; assert its shape once, here, at the boundary.
const RELOADS = (reloadsDoc.reloads as unknown as Reload[]).slice();

export const RELOADS_SOURCE = {
  name: reloadsDoc._source,
  url: reloadsDoc._sourceUrl,
  fetched: reloadsDoc._fetched,
  note: reloadsDoc._note,
};

const casesByDesignation = new Map<string, MotorCase>();
const casesById = new Map<string, MotorCase>();
for (const c of CASES) {
  casesByDesignation.set(c.designation, c);
  casesById.set(c.id, c);
}

const reloadsByCase = new Map<string, Reload[]>();
const reloadsById = new Map<string, Reload>();
for (const r of RELOADS) {
  reloadsById.set(r.id, r);
  const list = reloadsByCase.get(r.caseInfo);
  if (list) list.push(r);
  else reloadsByCase.set(r.caseInfo, [r]);
}

// A case's effective max impulse is at least its nominal rating, but never below the
// largest reload it actually flies — so the headline number can't contradict the list.
for (const c of CASES) {
  const natives = reloadsByCase.get(c.designation) ?? [];
  const maxReload = natives.reduce((m, r) => Math.max(m, r.totImpulseNs), 0);
  c.maxImpulseNs = Math.max(c.maxImpulseNs, Math.ceil(maxReload));
}

const partsById = new Map<string, HardwarePart>();
for (const p of PARTS) partsById.set(p.id, p);

const adaptersById = new Map<string, AdapterSystem>();
for (const a of ADAPTERS) adaptersById.set(a.id, a);

// --- Build-time integrity checks -------------------------------------------
// Runs on import (i.e. during `next build`), so a dangling reference, a reversed spacer rule,
// or a source-less node is caught before it can surface as a wrong result on the page. The
// full contract lives in ./validate. Cheap insurance for safety data.
validateGraph({ cases: CASES, parts: PARTS, adapters: ADAPTERS, reloads: RELOADS });

// --- Accessors --------------------------------------------------------------
export const allCases = (): MotorCase[] => CASES.slice();
export const allReloads = (): Reload[] => RELOADS.slice();
export const caseById = (id: string): MotorCase | undefined => casesById.get(id);
export const caseByDesignation = (d: string): MotorCase | undefined => casesByDesignation.get(d);
export const reloadById = (id: string): Reload | undefined => reloadsById.get(id);
export const reloadsForCase = (designation: string): Reload[] => (reloadsByCase.get(designation) ?? []).slice();
export const partById = (id: string): HardwarePart | undefined => partsById.get(id);
export const adapterById = (id: string): AdapterSystem | undefined => adaptersById.get(id);
export const allAdapters = (): AdapterSystem[] => ADAPTERS.slice();

/** Distinct diameters present, ascending. */
export const diameters = (): number[] => [...new Set(CASES.map((c) => c.diameter))].sort((a, b) => a - b);

/** Manufacturers present, in a stable display order (AeroTech first). */
export const manufacturers = (): Manufacturer[] => {
  const present = new Set(CASES.map((c) => c.manufacturer));
  return (["AeroTech", "Cesaroni"] as Manufacturer[]).filter((m) => present.has(m));
};

/** Diameters available for one manufacturer, ascending. */
export const diametersFor = (mfr: Manufacturer): number[] =>
  [...new Set(CASES.filter((c) => c.manufacturer === mfr).map((c) => c.diameter))].sort((a, b) => a - b);

/** The full system label for a manufacturer, e.g. "AeroTech RMS". */
export const SYSTEM_LABEL: Record<Manufacturer, string> = {
  AeroTech: "AeroTech RMS",
  Cesaroni: "Cesaroni Pro",
};
