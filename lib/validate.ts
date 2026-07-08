// The graph's safety contract, as one pure function.
//
// Muster resolves hardware that people build and fly, so a wrong edge in the graph isn't a
// cosmetic bug — a shorter case told to fly a longer reload, or a plugged reload marked as
// carrying an ejection charge, is a path to a failed or dangerous flight. These invariants
// are the guardrails. `validateGraph` throws on the first violation, and `graph.ts` calls it
// on import — so a data mistake fails `next build` and can never reach the page.
//
// It's a pure function of its inputs (it builds its own indexes), which keeps it cheap to run
// on every import and easy to test against deliberately-broken graphs.

import type { AdapterSystem, HardwarePart, MotorCase, Reload } from "./data/types";

export interface GraphInput {
  cases: MotorCase[];
  parts: HardwarePart[];
  adapters: AdapterSystem[];
  reloads: Reload[];
}

/** True for a non-empty list of http(s) source URLs — the sourcing guarantee every node carries. */
function hasSources(sources: unknown): boolean {
  return (
    Array.isArray(sources) &&
    sources.length > 0 &&
    sources.every((s) => typeof s === "string" && /^https?:\/\//.test(s))
  );
}

/**
 * Validate the whole merged graph, throwing on the first violation with a message that names
 * the offending node. Grouped by what a failure would mean:
 *   - reference integrity — nothing points at a node that doesn't exist;
 *   - spacer safety — every adapter step fills a LONGER case with a SHORTER reload, 1–2 spacers;
 *   - identity — ids and designations are unique, so a lookup can't return the wrong part;
 *   - sourcing — every hardware node cites at least one source;
 *   - reload consistency — a reload agrees with its case on brand and diameter, and a plugged
 *     reload carries no ejection charge.
 */
export function validateGraph({ cases, parts, adapters, reloads }: GraphInput): void {
  const caseByDesignation = new Map<string, MotorCase>();
  for (const c of cases) caseByDesignation.set(c.designation, c);
  const partIds = new Set(parts.map((p) => p.id));
  const adapterIds = new Set(adapters.map((a) => a.id));

  // --- Reference integrity --------------------------------------------------
  // Every reload must land on a known case, or the reverse lookup is empty/wrong.
  for (const r of reloads) {
    if (!caseByDesignation.has(r.caseInfo)) {
      throw new Error(`graph: reload ${r.designation} references unknown case "${r.caseInfo}".`);
    }
  }
  // Every case's referenced parts/adapter must exist.
  for (const c of cases) {
    for (const ref of [c.forwardClosure, c.aftClosure, c.sealDisc].filter(Boolean) as string[]) {
      if (!partIds.has(ref)) throw new Error(`graph: case ${c.designation} references unknown part "${ref}".`);
    }
    if (c.adapter && !adapterIds.has(c.adapter)) {
      throw new Error(`graph: case ${c.designation} references unknown adapter "${c.adapter}".`);
    }
  }

  // --- Spacer safety --------------------------------------------------------
  for (const a of adapters) {
    // An advisory adapter carries no resolved steps; a resolved one must carry at least one.
    if (a.advisoryOnly && a.rules.length > 0) {
      throw new Error(`graph: adapter ${a.designation} is advisory-only but declares ${a.rules.length} spacer rule(s).`);
    }
    if (!a.advisoryOnly && a.rules.length === 0) {
      throw new Error(`graph: adapter ${a.designation} is resolved but declares no spacer rules.`);
    }
    for (const rule of a.rules) {
      const base = caseByDesignation.get(rule.baseCase);
      const flies = caseByDesignation.get(rule.fliesCase);
      if (!base || !flies) throw new Error(`graph: adapter ${a.designation} rule references unknown case.`);
      if (base.diameter !== a.diameter || flies.diameter !== a.diameter) {
        throw new Error(`graph: adapter ${a.designation} rule crosses diameters.`);
      }
      // The whole point of a spacer is to fly a SHORTER reload in a LONGER case. A rule that
      // stepped up would tell a flyer to load a longer reload than the case is built for.
      if (base.slot <= flies.slot) {
        throw new Error(
          `graph: adapter ${a.designation} rule ${rule.baseCase} → ${rule.fliesCase} does not step down ` +
            `(a spacer fit must fly a shorter reload in a longer case).`,
        );
      }
      if (rule.spacers !== 1 && rule.spacers !== 2) {
        throw new Error(`graph: adapter ${a.designation} rule ${rule.baseCase} → ${rule.fliesCase} uses ${rule.spacers} spacers (must be 1 or 2).`);
      }
    }
  }

  // --- Identity -------------------------------------------------------------
  // A duplicate id or designation makes a lookup ambiguous — reloadById/caseByDesignation could
  // silently return the wrong hardware.
  assertUnique(cases.map((c) => c.id), (id) => `graph: duplicate case id "${id}".`);
  assertUnique(cases.map((c) => c.designation), (d) => `graph: duplicate case designation "${d}".`);
  assertUnique(parts.map((p) => p.id), (id) => `graph: duplicate part id "${id}".`);
  assertUnique(adapters.map((a) => a.id), (id) => `graph: duplicate adapter id "${id}".`);
  assertUnique(reloads.map((r) => r.id), (id) => `graph: duplicate reload id "${id}".`);

  // --- Sourcing -------------------------------------------------------------
  // Every curated hardware node must cite a source; a claim without one has no business
  // driving a hardware purchase.
  for (const c of cases) if (!hasSources(c.sources)) throw new Error(`graph: case ${c.designation} has no valid source.`);
  for (const p of parts) if (!hasSources(p.sources)) throw new Error(`graph: part ${p.id} has no valid source.`);
  for (const a of adapters) if (!hasSources(a.sources)) throw new Error(`graph: adapter ${a.designation} has no valid source.`);

  // --- Reload consistency ---------------------------------------------------
  for (const r of reloads) {
    const c = caseByDesignation.get(r.caseInfo)!; // reference integrity above guarantees it exists
    if (c.manufacturer !== r.manufacturer) {
      throw new Error(`graph: reload ${r.designation} (${r.manufacturer}) is built for case ${c.designation} (${c.manufacturer}).`);
    }
    if (c.diameter !== r.diameter) {
      throw new Error(`graph: reload ${r.designation} (${r.diameter} mm) is built for case ${c.designation} (${c.diameter} mm).`);
    }
    // Plugged means no ejection charge — electronic deployment only. The two flags must agree,
    // because the shopping list keys its deployment advice off them.
    if (r.plugged === r.ejectionCharge) {
      throw new Error(`graph: reload ${r.designation} has inconsistent plugged/ejectionCharge flags (plugged=${r.plugged}, ejectionCharge=${r.ejectionCharge}).`);
    }
  }
}

function assertUnique(values: string[], message: (dupe: string) => string): void {
  const seen = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) throw new Error(message(v));
    seen.add(v);
  }
}
