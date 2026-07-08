// The compatibility resolver — pure functions over the hardware graph.
//
// Two directions:
//   resolveCase(case)   → every reload that case can fly (native + via spacers), grouped.
//   resolveReload(reload) → every case that reload can fly in (its own, + longer via spacers).
//
// And the shopping list for a chosen (case, reload) pair: the reusable hardware to own and
// the single-use reload to buy, plus the conservative notes that make this a shopping aid
// rather than an assembly guide.
//
// "fit" is never a bare boolean. Each result carries HOW it fits (native vs adapter, and
// how many spacers), and each reload carries its certification and production status — the
// two axes a flyer actually reasons about.

import {
  adapterById,
  allCases,
  caseByDesignation,
  partById,
  reloadsForCase,
} from "./graph";
import type { AdapterSystem, HardwarePart, MotorCase, Reload } from "./data/types";

export type FitKind = "native" | "adapter";

/** A reload that a given case can fly, and how. */
export interface ReloadFit {
  reload: Reload;
  fit: FitKind;
  /** 0 for native, 1–2 for an adapter fit. */
  spacers: number;
  adapter?: AdapterSystem;
}

/** A case that a given reload can fly in, and how. */
export interface CaseFit {
  motorCase: MotorCase;
  fit: FitKind;
  spacers: number;
  adapter?: AdapterSystem;
}

export interface CaseResolution {
  motorCase: MotorCase;
  /** Reloads built for this case. */
  native: ReloadFit[];
  /** Shorter reloads this case can fly with the adapter's spacers (38 mm only, resolved). */
  viaAdapter: ReloadFit[];
  /** The adapter for this diameter, when one exists (resolved or advisory). */
  adapter?: AdapterSystem;
  /** True when the diameter has an adapter but its steps aren't resolved (29/54 mm). */
  adapterAdvisory: boolean;
}

export interface ReloadResolution {
  reload: Reload;
  /** The case this reload is built for. */
  native?: CaseFit;
  /** Longer cases that can fly it with spacers. */
  viaAdapter: CaseFit[];
}

const byImpulse = (a: ReloadFit, b: ReloadFit) =>
  a.reload.totImpulseNs - b.reload.totImpulseNs || a.reload.designation.localeCompare(b.reload.designation);

/** Every reload a case can fly, grouped by native vs adapter fit. */
export function resolveCase(motorCase: MotorCase): CaseResolution {
  const native: ReloadFit[] = reloadsForCase(motorCase.designation).map((reload) => ({
    reload,
    fit: "native" as const,
    spacers: 0,
  }));

  const adapter = motorCase.adapter ? adapterById(motorCase.adapter) : undefined;
  const viaAdapter: ReloadFit[] = [];
  if (adapter && !adapter.advisoryOnly) {
    for (const rule of adapter.rules.filter((r) => r.baseCase === motorCase.designation)) {
      for (const reload of reloadsForCase(rule.fliesCase)) {
        viaAdapter.push({ reload, fit: "adapter", spacers: rule.spacers, adapter });
      }
    }
  }

  native.sort(byImpulse);
  // Adapter fits: fewest spacers first (simplest build), then by impulse.
  viaAdapter.sort((a, b) => a.spacers - b.spacers || byImpulse(a, b));

  return {
    motorCase,
    native,
    viaAdapter,
    adapter,
    adapterAdvisory: !!(adapter && adapter.advisoryOnly),
  };
}

/** Every case a reload can fly in — its own, plus any longer case that reaches it with spacers. */
export function resolveReload(reload: Reload): ReloadResolution {
  const nativeCase = caseByDesignation(reload.caseInfo);
  const native: CaseFit | undefined = nativeCase
    ? { motorCase: nativeCase, fit: "native", spacers: 0 }
    : undefined;

  const viaAdapter: CaseFit[] = [];
  for (const c of allCases()) {
    if (c.diameter !== reload.diameter) continue;
    const adapter = c.adapter ? adapterById(c.adapter) : undefined;
    if (!adapter || adapter.advisoryOnly) continue;
    for (const rule of adapter.rules) {
      if (rule.baseCase === c.designation && rule.fliesCase === reload.caseInfo) {
        viaAdapter.push({ motorCase: c, fit: "adapter", spacers: rule.spacers, adapter });
      }
    }
  }
  // Smallest (cheapest, simplest) case first.
  viaAdapter.sort((a, b) => a.motorCase.slot - b.motorCase.slot || a.spacers - b.spacers);

  return { reload, native, viaAdapter };
}

// --- Shopping list ----------------------------------------------------------

export interface ShoppingItem {
  /** Display name. */
  name: string;
  /** Manufacturer part number, when known. */
  partNumber?: string;
  /** One-line role/detail. */
  detail?: string;
  sources: string[];
}

export interface ShoppingList {
  motorCase: MotorCase;
  reload: Reload;
  fit: FitKind;
  spacers: number;
  /** Reusable metal hardware to own. */
  reusable: ShoppingItem[];
  /** The single-use reload kit to buy. */
  consumable: ShoppingItem;
  /** Conservative, conditional advisories for this exact combination. */
  notes: string[];
}

function partItem(id: string | undefined, detail: string): ShoppingItem | null {
  if (!id) return null;
  const p: HardwarePart | undefined = partById(id);
  if (!p) return null;
  return { name: p.name, partNumber: p.partNumber, detail, sources: p.sources };
}

/**
 * The complete list to fly one reload in one case: the reusable hardware to own and the
 * single-use reload to buy, plus the notes that keep it honest.
 *
 * `fit`/`spacers` come from a ReloadFit/CaseFit; passing them keeps the list consistent with
 * the resolution the user actually picked (native vs adapter).
 */
export function shoppingList(
  motorCase: MotorCase,
  reload: Reload,
  fit: FitKind = "native",
  spacers = 0,
): ShoppingList {
  const reusable: ShoppingItem[] = [];

  const caseItem: ShoppingItem = {
    name: `${motorCase.designation} case`,
    partNumber: motorCase.partNumber,
    detail: `${motorCase.diameter} mm reusable motor case`,
    sources: motorCase.sources,
  };
  reusable.push(caseItem);

  const fwd = partItem(motorCase.forwardClosure, "Reusable; shared across every case length in this diameter");
  const aft = partItem(motorCase.aftClosure, "Reusable; holds the reload's single-use nozzle");
  if (fwd) reusable.push(fwd);
  if (aft) reusable.push(aft);

  const seal = partItem(motorCase.sealDisc, "Forward seal disc for the longer cases");
  if (seal) reusable.push(seal);

  const notes: string[] = [];

  const adapter = fit === "adapter" && motorCase.adapter ? adapterById(motorCase.adapter) : undefined;
  if (adapter) {
    reusable.push({
      name: `${adapter.designation} adapter`,
      partNumber: adapter.partNumber,
      detail:
        `${adapter.name} — a floating forward closure plus ` +
        `${spacers} case spacer${spacers === 1 ? "" : "s"} to fly this shorter reload`,
      sources: adapter.sources,
    });
    notes.push(
      `This is a spacer fit: it needs the ${adapter.designation} adapter and ` +
        `${spacers} spacer${spacers === 1 ? "" : "s"}. Confirm the spacer count against ` +
        `AeroTech's instructions before assembling.`,
    );
  }

  const consumable: ShoppingItem = {
    name: `${reload.designation} reload kit`,
    detail: "Single-use: grains, liner, nozzle, o-rings, delay element, igniter" +
      (reload.ejectionCharge ? ", and ejection charge" : " (no ejection charge)"),
    sources: [reload.tcUrl],
  };

  // Conservative, conditional advisories.
  if (reload.plugged || !reload.ejectionCharge) {
    notes.push(
      "This reload is plugged — it carries no ejection charge and must be flown with " +
        "electronic deployment (a timer or altimeter) and a plugged forward closure.",
    );
  }
  if (reload.availability === "OOP") {
    notes.push(
      "This reload is out of production. That is not the same as decertified — it stays " +
        "flyable until stocks run out — but it may be hard to find.",
    );
  }
  if (reload.sparky) {
    notes.push(
      "Sparky (metal-loaded) propellant: many ranges restrict these for fire risk. Check " +
        "your field's rules before flying.",
    );
  }
  notes.push("A dab of high-temperature o-ring grease is needed on assembly (it comes with most hardware sets).");

  return { motorCase, reload, fit, spacers, reusable, consumable, notes };
}

// --- Small helpers used by the UI ------------------------------------------

/** Human label for a fit, e.g. "Direct fit" or "With 1 spacer (38RAS)". */
export function fitLabel(fit: FitKind, spacers: number, adapter?: AdapterSystem): string {
  if (fit === "native") return "Direct fit";
  const s = `${spacers} spacer${spacers === 1 ? "" : "s"}`;
  return adapter ? `With ${s} (${adapter.designation})` : `With ${s}`;
}

/** Full certification phrase, e.g. "TRA certified" / "Unlisted". */
export function certLabel(reload: Reload): string {
  if (!reload.certOrg) return "Certification unlisted";
  return `${reload.certOrg} certified`;
}
