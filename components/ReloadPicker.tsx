"use client";

import { useState } from "react";
import { allReloads, diameters } from "@/lib/graph";
import { formatImpulse, formatThrust, propLabel } from "@/lib/format";
import { Segmented } from "./ui";
import { SearchIcon } from "./icons";

/** Pick a reload: a diameter filter and a text search over designation, class, and
 *  propellant. Results are capped with a count so the list stays glanceable. */
export default function ReloadPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (reloadId: string) => void;
}) {
  const reloads = allReloads();
  const dias = diameters();
  const selected = reloads.find((r) => r.id === value);
  const [dia, setDia] = useState<number>(selected?.diameter ?? 38);
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();
  const matches = reloads.filter((r) => {
    if (r.diameter !== dia) return false;
    if (!needle) return true;
    return (
      r.designation.toLowerCase().includes(needle) ||
      r.commonName.toLowerCase().includes(needle) ||
      (r.propName ?? "").toLowerCase().includes(needle) ||
      r.impulseClass.toLowerCase() === needle
    );
  });

  const CAP = 60;
  const capped = matches.slice(0, CAP);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Which reload do you want to fly?
        </span>
        <Segmented
          ariaLabel="Reload diameter"
          value={String(dia)}
          onChange={(v) => setDia(Number(v))}
          options={dias.map((d) => ({ value: String(d), label: `${d} mm` }))}
        />
      </div>

      <div className="mt-3 flex items-center rounded-lg border border-zinc-300 bg-white transition focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 dark:border-zinc-700 dark:bg-zinc-900">
        <SearchIcon className="ml-3 h-4 w-4 shrink-0 text-zinc-400" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search designation, class, or propellant — e.g. H128, I, Redline"
          aria-label="Search reloads"
          className="w-full bg-transparent px-3 py-2 text-sm outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
        />
      </div>

      <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
        {matches.length} match{matches.length === 1 ? "" : "es"}
        {matches.length > CAP ? ` — showing the first ${CAP}` : ""}
      </p>

      <div className="mt-2 max-h-96 space-y-1.5 overflow-y-auto pr-1">
        {capped.map((r) => {
          const active = r.id === value;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onChange(r.id)}
              aria-pressed={active}
              className={
                "flex w-full items-baseline justify-between gap-3 rounded-lg border px-3 py-2 text-left transition " +
                (active
                  ? "border-indigo-500 bg-indigo-50/60 dark:border-indigo-500/70 dark:bg-indigo-950/30"
                  : "border-zinc-200 bg-white hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-indigo-500/60")
              }
            >
              <span className="min-w-0">
                <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {r.designation}
                </span>
                <span className="ml-2 text-xs text-zinc-600 dark:text-zinc-400">
                  {propLabel(r)} · {r.caseInfo}
                </span>
              </span>
              <span className="shrink-0 text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                {formatImpulse(r.totImpulseNs)} · {formatThrust(r.avgThrustN)}
              </span>
            </button>
          );
        })}
        {capped.length === 0 && (
          <p className="rounded-lg border border-dashed border-zinc-300 px-3 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No reloads match. Try a different diameter or search term.
          </p>
        )}
      </div>
    </div>
  );
}
