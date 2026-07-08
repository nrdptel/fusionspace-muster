// Display formatting. Small, pure, and tested — the numbers are load-bearing, so
// their formatting is kept in one auditable place.

import type { Reload } from "./data/types";

/** Total impulse, e.g. 351 → "351 N·s". Below 10, one decimal so small motors read right. */
export function formatImpulse(ns: number): string {
  const v = ns >= 10 ? Math.round(ns) : Math.round(ns * 10) / 10;
  return `${v} N·s`;
}

/** Average thrust, e.g. 245 → "245 N". */
export function formatThrust(n: number): string {
  return `${Math.round(n)} N`;
}

/** Delay options as a readable phrase. "P" is plugged; a list is joined with the unit. */
export function formatDelays(reload: Reload): string {
  if (reload.plugged || reload.delays === "P") return "Plugged (no ejection charge)";
  const parts = reload.delays.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return "—";
  const list = parts.length === 1 ? `${parts[0]} s` : `${parts.join(", ")} s`;
  return reload.delayAdjustable ? `${list}, adjustable` : list;
}

/** Impulse class and average thrust as the classic "H128" style label. */
export function motorLabel(reload: Reload): string {
  return `${reload.impulseClass}${reload.avgThrustN}`;
}

/** The propellant name, or a dash. */
export function propLabel(reload: Reload): string {
  return reload.propName ?? "—";
}
