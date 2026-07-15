"use client";

import type { AdapterSystem, Reload } from "@/lib/data/types";
import type { FitKind } from "@/lib/resolve";
import { formatImpulse, formatThrust, formatDelays, propLabel } from "@/lib/format";
import { AvailabilityBadge, CertBadge, FitBadge, PluggedBadge, SparkyBadge } from "./badges";
import AvailabilitySignal from "./Availability";

/** One reload as a selectable row: designation + specs + status badges. Used in the
 *  case→reloads list. Clicking picks it for the shopping list. */
export default function ReloadRow({
  reload,
  fit,
  spacers,
  adapter,
  selected,
  onSelect,
}: {
  reload: Reload;
  fit: FitKind;
  spacers: number;
  adapter?: AdapterSystem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={
        "w-full rounded-lg border px-3.5 py-3 text-left transition " +
        (selected
          ? "border-indigo-500 bg-indigo-50/60 dark:border-indigo-500/70 dark:bg-indigo-950/30"
          : "border-zinc-200 bg-white hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-indigo-500/60")
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-mono text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {reload.designation}
        </span>
        <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
          {formatImpulse(reload.totImpulseNs)} · {formatThrust(reload.avgThrustN)} avg
        </span>
      </div>
      <div className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
        {propLabel(reload)} · delay {formatDelays(reload)}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <FitBadge fit={fit} spacers={spacers} adapter={adapter} />
        <CertBadge reload={reload} />
        <PluggedBadge reload={reload} />
        <SparkyBadge reload={reload} />
        <AvailabilityBadge reload={reload} />
        <AvailabilitySignal manufacturer={reload.manufacturer} designation={reload.designation} />
      </div>
    </button>
  );
}
