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

/** Assembled motor length, e.g. 191 → "191 mm". */
export function formatLength(mm: number): string {
  return `${Math.round(mm)} mm`;
}

/** A motor weight: grams up to a kilo, then kg with trailing zeros trimmed. 366 → "366 g",
 *  1200 → "1.2 kg", 32672 → "32.7 kg". */
export function formatWeight(g: number): string {
  if (g < 1000) return `${Math.round(g)} g`;
  const kg = g / 1000;
  const s = (kg < 10 ? kg.toFixed(2) : kg.toFixed(1)).replace(/\.?0+$/, "");
  return `${s} kg`;
}

/** The physical "does it fit / how heavy" line for a reload, built only from the fields ThrustCurve
 *  actually carries — e.g. "191 mm long · 366 g loaded · 193 g propellant". Null when none are known,
 *  so the UI can omit the row entirely rather than show a blank. */
export function dimensionsLabel(reload: Reload): string | null {
  const parts: string[] = [];
  if (reload.lengthMm != null) parts.push(`${formatLength(reload.lengthMm)} long`);
  if (reload.totalWeightG != null) parts.push(`${formatWeight(reload.totalWeightG)} loaded`);
  if (reload.propWeightG != null) parts.push(`${formatWeight(reload.propWeightG)} propellant`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
