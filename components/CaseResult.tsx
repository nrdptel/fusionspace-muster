"use client";

import type { MotorCase } from "@/lib/data/types";
import { partById } from "@/lib/graph";
import { resolveCase, type ReloadFit } from "@/lib/resolve";
import { formatImpulse } from "@/lib/format";
import ReloadRow from "./ReloadRow";

/** The result for "I have this case": the case's spec, the hardware it always needs, and
 *  every reload it can fly — grouped into direct fits and spacer fits. */
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
  const fwd = partById(motorCase.forwardClosure);
  const aft = partById(motorCase.aftClosure);
  const seal = motorCase.sealDisc ? partById(motorCase.sealDisc) : undefined;

  const oneSpacer = res.viaAdapter.filter((f) => f.spacers === 1);
  const twoSpacer = res.viaAdapter.filter((f) => f.spacers === 2);

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
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          To build any reload below you also need the{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{fwd?.name}</span> and{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">{aft?.name}</span>
          {seal ? (
            <>
              , plus the <span className="font-medium text-zinc-700 dark:text-zinc-300">{seal.name}</span>
            </>
          ) : null}
          . Those are reusable and shared across every {motorCase.diameter} mm case. Pick a reload
          for its full list.
        </p>
        {motorCase.notes && (
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{motorCase.notes}</p>
        )}
      </div>

      {/* Direct fits. */}
      <section className="mt-6">
        <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
          Reloads built for this case{" "}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">({res.native.length})</span>
        </h3>
        {res.native.length > 0 ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{res.native.map(row)}</div>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No reloads are listed for this case in the current data.
          </p>
        )}
      </section>

      {/* Spacer fits — 38 mm, resolved from the sourced 38RAS chart. */}
      {res.viaAdapter.length > 0 && (
        <section className="mt-8">
          <h3 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Also flies with spacers{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">
              ({res.viaAdapter.length}, via the {res.adapter?.designation})
            </span>
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Shorter reloads this longer case can fly with the {res.adapter?.name}. Confirm the
            spacer count against AeroTech&apos;s instructions.
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
        </section>
      )}

      {/* Advisory — 29/54 mm, where we don't resolve individual steps. */}
      {res.adapterAdvisory && res.adapter && (
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
          <span aria-hidden className="mt-0.5 shrink-0 text-base">
            ⓘ
          </span>
          <p>
            <strong className="font-semibold">
              This case can also fly some shorter reloads with the {res.adapter.designation}.
            </strong>{" "}
            {res.adapter.notes} The adapter is a {res.adapter.name.toLowerCase()} — a floating
            forward closure plus case spacers.
          </p>
        </div>
      )}
    </div>
  );
}
