"use client";

import { useState } from "react";
import type { MotorCase } from "@/lib/data/types";
import { partById, SYSTEM_LABEL } from "@/lib/graph";
import { resolveCase, type ReloadFit } from "@/lib/resolve";
import { formatImpulse } from "@/lib/format";
import { applyFilter, propellantsOf, isNarrowing, DEFAULT_FILTER } from "@/lib/filter";
import ReloadRow from "./ReloadRow";
import ReloadFilters from "./ReloadFilters";
import CrossloadReloads from "./CrossloadReloads";

/** The result for "I have this case": the case's spec, the hardware it always needs, and
 *  every reload it can fly — grouped into direct fits and spacer fits, with a filter/sort bar
 *  for the busy cases. */
export default function CaseResult({
  motorCase,
  pick,
  onPick,
}: {
  motorCase: MotorCase;
  pick?: string;
  onPick: (reloadId: string) => void;
}) {
  const res = resolveCase(motorCase);
  const fwd = motorCase.forwardClosure ? partById(motorCase.forwardClosure) : undefined;
  const aft = motorCase.aftClosure ? partById(motorCase.aftClosure) : undefined;
  const seal = motorCase.sealDisc ? partById(motorCase.sealDisc) : undefined;
  const extras = [fwd, aft, seal].filter(Boolean) as NonNullable<typeof fwd>[];

  const [filter, setFilter] = useState(DEFAULT_FILTER);

  const totalReloads = res.native.length + res.viaAdapter.length;
  const showFilters = totalReloads >= 6;
  const propellants = propellantsOf([...res.native, ...res.viaAdapter]);
  const narrowing = isNarrowing(filter);

  const native = applyFilter(res.native, filter);
  const oneSpacer = applyFilter(res.viaAdapter.filter((f) => f.spacers === 1), filter);
  const twoSpacer = applyFilter(res.viaAdapter.filter((f) => f.spacers === 2), filter);
  const spacerShown = oneSpacer.length + twoSpacer.length;

  const count = (shown: number, total: number) => (narrowing ? `${shown} of ${total}` : `${total}`);

  const row = (f: ReloadFit) => (
    <ReloadRow
      key={`${f.reload.id}-${f.spacers}`}
      reload={f.reload}
      fit={f.fit}
      spacers={f.spacers}
      adapter={f.adapter}
      selected={pick === f.reload.id}
      onSelect={() => onPick(f.reload.id)}
    />
  );

  return (
    <div className="mt-6">
      {/* Case spec + the hardware every reload in it shares. */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="font-mono text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            {motorCase.designation}
          </h2>
          <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
            {motorCase.diameter} mm · up to ≈{formatImpulse(motorCase.maxImpulseNs)}
            {motorCase.partNumber ? ` · P/N ${motorCase.partNumber}` : ""}
          </span>
        </div>
        {extras.length > 0 ? (
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            To build any reload below you also need the{" "}
            {extras.map((p, i) => (
              <span key={p.id}>
                {i > 0 ? (i === extras.length - 1 ? ", plus the " : ", the ") : ""}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">{p.name}</span>
              </span>
            ))}
            . Those are reusable and shared across every {motorCase.diameter} mm case. Pick a reload
            for its full list.
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            The reload includes its closures — you reuse only the case. Pick a reload for its full
            list.
          </p>
        )}
        {motorCase.notes && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{motorCase.notes}</p>
        )}
      </div>

      {showFilters && (
        <ReloadFilters value={filter} onChange={setFilter} propellants={propellants} />
      )}

      {/* Direct fits. */}
      <section className="mt-6">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
          Reloads built for this case{" "}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">({count(native.length, res.native.length)})</span>
        </h3>
        {res.native.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No reloads are listed for this case in the current data.
          </p>
        ) : native.length > 0 ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{native.map(row)}</div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No reloads match these filters.</p>
        )}
      </section>

      {/* Spacer fits — resolved from the sourced spacer chart (38 mm RMS, Cesaroni Pro29/38/54). */}
      {res.viaAdapter.length > 0 && (
        <section className="mt-8">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Also flies with spacers{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">
              ({count(spacerShown, res.viaAdapter.length)}, via the {res.adapter?.designation})
            </span>
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Shorter reloads this longer case can fly with the {res.adapter?.name}. Confirm the
            spacer count against {motorCase.manufacturer}&apos;s instructions.
          </p>
          {oneSpacer.length > 0 && (
            <>
              <h4 className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                With 1 spacer
              </h4>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">{oneSpacer.map(row)}</div>
            </>
          )}
          {twoSpacer.length > 0 && (
            <>
              <h4 className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                With 2 spacers
              </h4>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">{twoSpacer.map(row)}</div>
            </>
          )}
          {spacerShown === 0 && (
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No spacer fits match these filters.</p>
          )}
        </section>
      )}

      {/* Advisory — where we don't resolve individual steps (RMS 29/54, Cesaroni Pro24/75/98). */}
      {res.adapterAdvisory && res.adapter && (
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
          <span aria-hidden className="mt-0.5 shrink-0 text-base">
            ⓘ
          </span>
          <p>
            <strong className="font-semibold">
              This case can also fly some shorter reloads with the {res.adapter.designation}.
            </strong>{" "}
            {res.adapter.notes}
          </p>
        </div>
      )}

      {res.crossload.length > 0 && (
        <CrossloadReloads
          fits={res.crossload}
          otherBrandLabel={SYSTEM_LABEL[res.crossload[0].reload.manufacturer]}
        />
      )}
    </div>
  );
}
