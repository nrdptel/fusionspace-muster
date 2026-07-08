// Filtering and sorting for a case's reload lists. A busy case flies a lot of reloads
// (some fly 30+ once spacer fits are counted), so the result view lets you narrow by
// propellant and production status and sort by impulse or thrust. Pure and tested; the
// component owns the transient filter state.

import type { Reload } from "./data/types";
import type { ReloadFit } from "./resolve";

export type ReloadSort = "impulse" | "thrust";

export interface ReloadFilter {
  sort: ReloadSort;
  /** Propellant name to keep, or "" for all. */
  propellant: string;
  /** Hide out-of-production reloads. */
  inProductionOnly: boolean;
}

export const DEFAULT_FILTER: ReloadFilter = { sort: "impulse", propellant: "", inProductionOnly: false };

/** Distinct propellant names across a set of fits, sorted — the options for the dropdown. */
export function propellantsOf(fits: ReloadFit[]): string[] {
  return [...new Set(fits.map((f) => f.reload.propName).filter((p): p is string => !!p))].sort();
}

/** True when the filter is narrowing the set (i.e. not just the default sort). */
export function isNarrowing(f: ReloadFilter): boolean {
  return f.propellant !== "" || f.inProductionOnly;
}

function keep(r: Reload, f: ReloadFilter): boolean {
  if (f.propellant && r.propName !== f.propellant) return false;
  if (f.inProductionOnly && r.availability === "OOP") return false;
  return true;
}

/**
 * Filter and sort a list of fits without mutating the input. The caller pre-splits spacer
 * groups, so sorting within a group is safe; the key is impulse or average thrust, ascending,
 * with the designation as a stable tiebreak.
 */
export function applyFilter(fits: ReloadFit[], f: ReloadFilter): ReloadFit[] {
  const key = f.sort === "thrust" ? (x: ReloadFit) => x.reload.avgThrustN : (x: ReloadFit) => x.reload.totImpulseNs;
  return fits
    .filter((x) => keep(x.reload, f))
    .sort((a, b) => key(a) - key(b) || a.reload.designation.localeCompare(b.reload.designation));
}
