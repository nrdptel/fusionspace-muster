"use client";

import type { Reload } from "@/lib/data/types";
import { resolveReload, type CaseFit } from "@/lib/resolve";
import { formatImpulse, formatThrust, formatDelays, propLabel } from "@/lib/format";
import { AvailabilityBadge, CertBadge, FitBadge, PluggedBadge, SparkyBadge } from "./badges";

/** The result for "I want to fly this reload": the reload's spec and certification, then the
 *  cases that can fly it — its own case, and any longer case that reaches it with spacers. */
export default function ReloadResult({
  reload,
  pick,
  onPick,
}: {
  reload: Reload;
  /** Selected case id for the shopping list. */
  pick?: string;
  onPick: (caseId: string) => void;
}) {
  const res = resolveReload(reload);

  const caseRow = (f: CaseFit) => {
    const active = pick === f.motorCase.id;
    return (
      <button
        key={`${f.motorCase.id}-${f.spacers}`}
        type="button"
        onClick={() => onPick(f.motorCase.id)}
        aria-pressed={active}
        className={
          "w-full rounded-lg border px-3.5 py-3 text-left transition " +
          (active
            ? "border-indigo-500 bg-indigo-50/60 dark:border-indigo-500/70 dark:bg-indigo-950/30"
            : "border-zinc-200 bg-white hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-indigo-500/60")
        }
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {f.motorCase.designation}
          </span>
          <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
            {f.motorCase.diameter} mm{f.motorCase.partNumber ? ` · P/N ${f.motorCase.partNumber}` : ""}
          </span>
        </div>
        <div className="mt-2">
          <FitBadge fit={f.fit} spacers={f.spacers} adapter={f.adapter} />
        </div>
      </button>
    );
  };

  return (
    <div className="mt-6">
      {/* Reload spec + certification. */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-mono text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {reload.designation}
          </h2>
          <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
            {formatImpulse(reload.totImpulseNs)} · {formatThrust(reload.avgThrustN)} avg
          </span>
        </div>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Class {reload.impulseClass} · {propLabel(reload)} · delay {formatDelays(reload)} · built
          for the <span className="font-mono text-zinc-700 dark:text-zinc-300">{reload.caseInfo}</span> case
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <CertBadge reload={reload} />
          <PluggedBadge reload={reload} />
          <SparkyBadge reload={reload} />
          <AvailabilityBadge reload={reload} />
        </div>
      </div>

      <section className="mt-6">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
          Cases that fly it
        </h3>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Its own case is the simplest. A longer case flies it too, with the adapter and spacers —
          handy if you already own the bigger case. Pick one for the full list.
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {res.native && caseRow(res.native)}
          {res.viaAdapter.map(caseRow)}
        </div>

        {!res.native && res.viaAdapter.length === 0 && (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No case is listed for this reload in the current data.
          </p>
        )}
      </section>
    </div>
  );
}
