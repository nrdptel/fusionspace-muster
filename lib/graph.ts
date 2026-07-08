// Assembles the hardware graph: the curated cases/parts/adapters (lib/data/hardware.ts)
// joined to the ThrustCurve reload mirror (lib/data/reloads.json), with indexes for the
// resolver and a build-time sanity check so a data mistake fails the build instead of
// shipping a broken compatibility result.

import reloadsDoc from "./data/reloads.json";
import { CASES, PARTS, ADAPTERS } from "./data/hardware";
import type { AdapterSystem, HardwarePart, MotorCase, Reload } from "./data/types";

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
// Runs on import (i.e. during `next build`), so a dangling reference is caught before
// it can surface as a wrong or empty result on the page. Cheap insurance for safety data.
(function validate() {
  // Every reload must land on a known case.
  for (const r of RELOADS) {
    if (!casesByDesignation.has(r.caseInfo)) {
      throw new Error(`graph: reload ${r.designation} references unknown case "${r.caseInfo}".`);
    }
  }
  // Every case's referenced parts/adapter must exist.
  for (const c of CASES) {
    for (const ref of [c.forwardClosure, c.aftClosure, c.sealDisc].filter(Boolean) as string[]) {
      if (!partsById.has(ref)) throw new Error(`graph: case ${c.designation} references unknown part "${ref}".`);
    }
    if (c.adapter && !adaptersById.has(c.adapter)) {
      throw new Error(`graph: case ${c.designation} references unknown adapter "${c.adapter}".`);
    }
  }
  // Every adapter spacer rule must point at real cases in the same diameter.
  for (const a of ADAPTERS) {
    for (const rule of a.rules) {
      const base = casesByDesignation.get(rule.baseCase);
      const flies = casesByDesignation.get(rule.fliesCase);
      if (!base || !flies) throw new Error(`graph: adapter ${a.designation} rule references unknown case.`);
      if (base.diameter !== a.diameter || flies.diameter !== a.diameter) {
        throw new Error(`graph: adapter ${a.designation} rule crosses diameters.`);
      }
    }
  }
  // Case ids must be unique.
  const ids = new Set<string>();
  for (const c of CASES) {
    if (ids.has(c.id)) throw new Error(`graph: duplicate case id "${c.id}".`);
    ids.add(c.id);
  }
})();

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
