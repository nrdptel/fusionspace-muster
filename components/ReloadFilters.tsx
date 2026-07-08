"use client";

import type { ReloadFilter } from "@/lib/filter";
import { Segmented } from "./ui";

/** Compact filter bar for a case's reload lists: sort by impulse or thrust, narrow by
 *  propellant, and hide out-of-production reloads. Shown only when a case flies enough
 *  reloads to be worth filtering. */
export default function ReloadFilters({
  value,
  onChange,
  propellants,
}: {
  value: ReloadFilter;
  onChange: (next: ReloadFilter) => void;
  propellants: string[];
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-zinc-200 bg-zinc-50/60 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/30">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Sort</span>
        <Segmented
          ariaLabel="Sort reloads"
          size="sm"
          value={value.sort}
          onChange={(v) => onChange({ ...value, sort: v as ReloadFilter["sort"] })}
          options={[
            { value: "impulse", label: "Impulse" },
            { value: "thrust", label: "Thrust" },
          ]}
        />
      </div>

      {propellants.length > 1 && (
        <label className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          Propellant
          <select
            value={value.propellant}
            onChange={(e) => onChange({ ...value, propellant: e.target.value })}
            aria-label="Filter by propellant"
            className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          >
            <option value="">All</option>
            {propellants.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={value.inProductionOnly}
          onChange={(e) => onChange({ ...value, inProductionOnly: e.target.checked })}
          className="h-3.5 w-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 dark:border-zinc-600"
        />
        In production only
      </label>
    </div>
  );
}
