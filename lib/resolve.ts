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
  allAdapters,
  allCases,
  caseById,
  caseByDesignation,
  partById,
  reloadById,
  reloadsForCase,
} from "./graph";
import type { AdapterSystem, HardwarePart, MotorCase, Reload } from "./data/types";
import { CROSSLOAD_PAIRS, CROSSLOAD_SOURCES, NOTE_CTI_IN_RMS, NOTE_RMS_IN_CTI } from "./data/crossload";

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

/** A foreign-brand reload a case can take by a manufacturer-published crossload (75/98 mm only). */
export interface CrossloadReloadFit {
  reload: Reload;
  /** The manufacturer condition for loading this foreign reload into the resolved case. */
  note: string;
  sources: string[];
}

/** A foreign-brand case that can fly a reload by a manufacturer-published crossload. */
export interface CrossloadCaseFit {
  motorCase: MotorCase;
  note: string;
  sources: string[];
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
  /** Cross-brand reloads this case can take, per the manufacturers' published crossloads. */
  crossload: CrossloadReloadFit[];
}

export interface ReloadResolution {
  reload: Reload;
  /** The case this reload is built for. */
  native?: CaseFit;
  /** Longer cases that can fly it with spacers. */
  viaAdapter: CaseFit[];
  /** Cross-brand cases that can fly this reload, per the manufacturers' published crossloads. */
  crossload: CrossloadCaseFit[];
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

  // Cross-brand crossloads (75/98 mm only): the foreign case of the same published size, and
  // this case takes its reloads — with the note for loading a foreign reload into THIS brand.
  const crossload: CrossloadReloadFit[] = [];
  const pair = CROSSLOAD_PAIRS.find((p) => p.rms === motorCase.designation || p.pro === motorCase.designation);
  if (pair) {
    const foreignDesignation = motorCase.manufacturer === "AeroTech" ? pair.pro : pair.rms;
    const note = motorCase.manufacturer === "AeroTech" ? NOTE_CTI_IN_RMS : NOTE_RMS_IN_CTI;
    for (const reload of reloadsForCase(foreignDesignation)) {
      crossload.push({ reload, note, sources: CROSSLOAD_SOURCES });
    }
    crossload.sort(
      (a, b) =>
        a.reload.totImpulseNs - b.reload.totImpulseNs ||
        a.reload.designation.localeCompare(b.reload.designation),
    );
  }

  return {
    motorCase,
    native,
    viaAdapter,
    adapter,
    adapterAdvisory: !!(adapter && adapter.advisoryOnly),
    crossload,
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
    // Same system only — a Cesaroni reload never fits AeroTech hardware, even at one diameter.
    if (c.manufacturer !== reload.manufacturer || c.diameter !== reload.diameter) continue;
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

  // Cross-brand crossloads (75/98 mm only): the foreign case of the same published size can fly
  // this reload, with the note for loading THIS reload into that foreign brand's hardware.
  const crossload: CrossloadCaseFit[] = [];
  const pair = CROSSLOAD_PAIRS.find((p) => p.rms === reload.caseInfo || p.pro === reload.caseInfo);
  if (pair) {
    const foreignCase = caseByDesignation(reload.manufacturer === "AeroTech" ? pair.pro : pair.rms);
    if (foreignCase) {
      const note = reload.manufacturer === "AeroTech" ? NOTE_RMS_IN_CTI : NOTE_CTI_IN_RMS;
      crossload.push({ motorCase: foreignCase, note, sources: CROSSLOAD_SOURCES });
    }
  }

  return { reload, native, viaAdapter, crossload };
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

  // Loki reuses both closures AND the graphite nozzle (the reload carries no closures at all),
  // so its aft-end part is a reusable nozzle, not a holder for a single-use one.
  const loki = reload.system === "Loki";
  const fwd = partItem(motorCase.forwardClosure, "Reusable; shared across every case length in this diameter");
  const aft = partItem(
    motorCase.aftClosure,
    loki
      ? "Reusable graphite nozzle — fit the throat size your reload's instructions specify"
      : "Reusable; holds the reload's single-use nozzle",
  );
  if (fwd) reusable.push(fwd);
  if (aft) reusable.push(aft);

  const seal = partItem(motorCase.sealDisc, "Reusable forward seal disc");
  if (seal) reusable.push(seal);

  const notes: string[] = [];

  const adapter = fit === "adapter" && motorCase.adapter ? adapterById(motorCase.adapter) : undefined;
  if (adapter) {
    reusable.push({
      name: adapter.name,
      partNumber: adapter.partNumber,
      detail: `${spacers} spacer${spacers === 1 ? "" : "s"} to load this shorter reload in the longer case`,
      sources: adapter.sources,
    });
    notes.push(
      `This is a spacer fit: it needs the ${adapter.designation} and ` +
        `${spacers} spacer${spacers === 1 ? "" : "s"}. Confirm the spacer count against the ` +
        `manufacturer's instructions before assembling.`,
    );
  }

  // The single-use unit differs by system: an RMS kit is assembled from parts; a Pro reload is a
  // preassembled cartridge that loads as one piece.
  const cartridge = reload.system === "Pro";
  const consumable: ShoppingItem = {
    name: `${reload.designation} reload ${cartridge ? "cartridge" : "kit"}`,
    detail:
      (cartridge
        ? "Single-use cartridge: preassembled grains, liner, nozzle, and forward closure — loads as one piece"
        : loki
          ? "Single-use: liner, propellant grains, o-rings, and the delay or smoke element (the nozzle and closures are reusable, not in the reload)"
          : "Single-use: grains, liner, nozzle, o-rings, delay element, igniter") +
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
  if (loki) {
    notes.push(
      "Loki's graphite nozzle is reusable and sold by throat number — the correct throat for " +
        "this reload is in its instructions, and the wrong one can cause a failure.",
    );
  }
  notes.push(
    cartridge
      ? "A little high-temperature grease on the closure threads and o-rings helps on assembly."
      : "A dab of high-temperature o-ring grease is needed on assembly (it comes with most hardware sets).",
  );

  return { motorCase, reload, fit, spacers, reusable, consumable, notes };
}

/** A plain-text rendering of a shopping list, for pasting into a club chat or an order. Kept pure
 *  and tested beside `shoppingList` rather than inline in the copy button: the exported text is a
 *  user-facing artifact, and its closing line — that the reload's printed instructions are the
 *  authority and Muster is only a shopping aid — is load-bearing safety framing that must never
 *  quietly fall out of a copied list. */
export function shoppingListText(list: ShoppingList): string {
  const lines: string[] = [];
  lines.push(`Muster — ${list.reload.designation} in a ${list.motorCase.designation} case`);
  lines.push("");
  lines.push("Reusable hardware to own:");
  for (const i of list.reusable) {
    lines.push(`  • ${i.name}${i.partNumber ? ` (${i.partNumber})` : ""}${i.detail ? ` — ${i.detail}` : ""}`);
  }
  lines.push("");
  lines.push("Single-use reload to buy:");
  lines.push(`  • ${list.consumable.name}${list.consumable.detail ? ` — ${list.consumable.detail}` : ""}`);
  lines.push("");
  lines.push("Notes:");
  for (const n of list.notes) lines.push(`  • ${n}`);
  lines.push("");
  lines.push("Always build to the reload's printed instructions. Muster is a shopping aid.");
  return lines.join("\n");
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

// --- Kit coverage -----------------------------------------------------------
// "I own this hardware — what can I already fly, and what should I buy next?" A pure
// extension of the resolver over a set of owned cases and adapters. Everything here is
// derived from the same validated graph, so it inherits its sourcing and can't invent a fit.

/** The cases and adapters a flyer owns. */
export interface OwnedKit {
  caseIds: string[];
  adapterIds: string[];
}

export interface Coverage {
  /** Distinct reloads the kit can fly, ascending by impulse. */
  reloads: Reload[];
  /** Diameters where an owned case has an owned-but-unresolved RAS (29/54 mm): extra
   *  shorter reloads are possible but not counted — surfaced as an advisory, never a number. */
  advisoryDiameters: number[];
}

/** The set of reload ids an owned kit can fly. Native fits from every owned case, plus
 *  spacer fits where the case's adapter is also owned and resolvable (38 mm). */
function coverageIds(owned: OwnedKit): Set<string> {
  const ownedCases = new Set(owned.caseIds);
  const ownedAdapters = new Set(owned.adapterIds);
  const ids = new Set<string>();
  for (const c of allCases()) {
    if (!ownedCases.has(c.id)) continue;
    const res = resolveCase(c);
    for (const f of res.native) ids.add(f.reload.id);
    if (c.adapter && ownedAdapters.has(c.adapter)) {
      const adapter = adapterById(c.adapter);
      if (adapter && !adapter.advisoryOnly) {
        for (const f of res.viaAdapter) ids.add(f.reload.id);
      }
    }
  }
  return ids;
}

/** Full coverage for an owned kit — the reloads it flies, plus any advisory diameters. */
export function coverageFor(owned: OwnedKit): Coverage {
  const ownedCases = new Set(owned.caseIds);
  const ownedAdapters = new Set(owned.adapterIds);
  const ids = coverageIds(owned);
  const reloads: Reload[] = [];
  for (const id of ids) {
    const r = reloadById(id);
    if (r) reloads.push(r);
  }
  reloads.sort((a, b) => a.diameter - b.diameter || a.totImpulseNs - b.totImpulseNs);

  const advisory = new Set<number>();
  for (const c of allCases()) {
    if (!ownedCases.has(c.id) || !c.adapter) continue;
    const adapter = adapterById(c.adapter);
    if (adapter && adapter.advisoryOnly && ownedAdapters.has(c.adapter)) advisory.add(c.diameter);
  }
  return { reloads, advisoryDiameters: [...advisory].sort((a, b) => a - b) };
}

export interface UnlockSuggestion {
  kind: "case" | "adapter";
  id: string;
  /** Human label, e.g. "RMS-38/720 case" or "38RAS adapter". */
  label: string;
  /** New reloads this purchase would unlock given the current kit. */
  added: number;
  /** True for an adapter whose spacer steps aren't resolved (29/54 mm) — `added` is 0 but
   *  it still unlocks shorter reloads; the UI phrases it as "some", not a count. */
  advisory: boolean;
  /** One-line reason. */
  detail: string;
}

/**
 * What to buy next: for each unowned case and adapter, how many *new* reloads it adds to the
 * current kit, ranked. Adapters are only suggested when the flyer already owns a case in that
 * diameter that the adapter helps (otherwise the adapter does nothing on its own).
 */
export function unlockSuggestions(owned: OwnedKit, limit = 5): UnlockSuggestion[] {
  if (owned.caseIds.length === 0) return [];
  const base = coverageIds(owned);
  const ownedCases = new Set(owned.caseIds);
  const ownedAdapters = new Set(owned.adapterIds);
  // Keyed by system+diameter so a "grow your kit" suggestion stays within a system you own —
  // owning an AeroTech 38 mm case never pitches you a Cesaroni Pro38 case.
  const key = (mfr: string, dia: number) => `${mfr}:${dia}`;
  const ownedKeys = new Set(
    allCases().filter((c) => ownedCases.has(c.id)).map((c) => key(c.manufacturer, c.diameter)),
  );
  const out: UnlockSuggestion[] = [];

  // Unowned cases in a system+diameter the flyer already owns. Adding a case brings its native
  // reloads (and its spacer fits if the matching adapter is owned); the set difference nets out
  // reloads already covered.
  for (const c of allCases()) {
    if (ownedCases.has(c.id)) continue;
    if (!ownedKeys.has(key(c.manufacturer, c.diameter))) continue;
    const next = coverageIds({ caseIds: [...owned.caseIds, c.id], adapterIds: owned.adapterIds });
    const added = next.size - base.size;
    if (added <= 0) continue;
    out.push({
      kind: "case",
      id: c.id,
      label: `${c.designation} case`,
      added,
      advisory: false,
      detail: `Adds ${added} reload${added === 1 ? "" : "s"} you can't fly yet.`,
    });
  }

  // Unowned adapters — only useful alongside an owned case that references them (which pins the
  // suggestion to the right system and diameter by construction).
  for (const a of allAdapters()) {
    if (ownedAdapters.has(a.id)) continue;
    const relevant = allCases().some((c) => ownedCases.has(c.id) && c.adapter === a.id);
    if (!relevant) continue;
    if (a.advisoryOnly) {
      out.push({
        kind: "adapter",
        id: a.id,
        label: `${a.designation} adapter`,
        added: 0,
        advisory: true,
        detail: `Lets your ${a.diameter} mm cases fly some shorter reloads (count not resolved — confirm against the instructions).`,
      });
      continue;
    }
    const next = coverageIds({ caseIds: owned.caseIds, adapterIds: [...owned.adapterIds, a.id] });
    const added = next.size - base.size;
    if (added <= 0) continue;
    out.push({
      kind: "adapter",
      id: a.id,
      label: `${a.designation} adapter`,
      added,
      advisory: false,
      detail: `Unlocks ${added} shorter reload${added === 1 ? "" : "s"} across your ${a.diameter} mm cases.`,
    });
  }

  // Rank the counted suggestions by reloads added; always keep room for the (few) advisory
  // adapters, which are worth surfacing even though their gain isn't a number.
  const advisory = out.filter((x) => x.advisory);
  const counted = out
    .filter((x) => !x.advisory)
    .sort((x, y) => y.added - x.added || x.label.localeCompare(y.label));
  return [...counted.slice(0, Math.max(0, limit - advisory.length)), ...advisory];
}

/** Look up a case or adapter for the owned-kit UI. */
export function ownableCase(id: string): MotorCase | undefined {
  return caseById(id);
}
