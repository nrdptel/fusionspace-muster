"use client";

import { useEffect, useState } from "react";
import { allAdapters, allCases, diametersFor, manufacturers, SYSTEM_LABEL } from "@/lib/graph";
import { coverageFor, unlockSuggestions, type OwnedKit } from "@/lib/resolve";

const KEY = "muster.kit";

function loadKit(): OwnedKit {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { caseIds: [], adapterIds: [] };
    const p = JSON.parse(raw) as Partial<OwnedKit>;
    return {
      caseIds: Array.isArray(p.caseIds) ? p.caseIds.filter((x) => typeof x === "string") : [],
      adapterIds: Array.isArray(p.adapterIds) ? p.adapterIds.filter((x) => typeof x === "string") : [],
    };
  } catch {
    return { caseIds: [], adapterIds: [] };
  }
}

/** "Plan your kit" — a companion tool. Tell Muster the cases and adapters you own and it
 *  shows every reload your kit already flies and the highest-leverage thing to buy next.
 *  Purely derived from the same sourced graph as the lookup; owned hardware lives on the
 *  device (localStorage), like the family's other saved data. */
export default function KitPlanner() {
  const [kit, setKit] = useState<OwnedKit>({ caseIds: [], adapterIds: [] });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setKit(loadKit());
    setMounted(true);
  }, []);

  const persist = (next: OwnedKit) => {
    setKit(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage disabled — the choice still applies this session */
    }
  };

  const toggleCase = (id: string) => {
    const has = kit.caseIds.includes(id);
    persist({ ...kit, caseIds: has ? kit.caseIds.filter((x) => x !== id) : [...kit.caseIds, id] });
  };
  const toggleAdapter = (id: string) => {
    const has = kit.adapterIds.includes(id);
    persist({ ...kit, adapterIds: has ? kit.adapterIds.filter((x) => x !== id) : [...kit.adapterIds, id] });
  };
  const clear = () => persist({ caseIds: [], adapterIds: [] });

  // Stable empty shell until mounted, so the first client paint matches the server HTML.
  const view: OwnedKit = mounted ? kit : { caseIds: [], adapterIds: [] };
  const cases = allCases();
  const adapters = allAdapters();
  const cov = coverageFor(view);
  const suggestions = unlockSuggestions(view, 5);
  const ownedCount = view.caseIds.length + view.adapterIds.length;

  // Reloads flyable, grouped by diameter, for the summary breakdown.
  const byDiameter = new Map<number, number>();
  for (const r of cov.reloads) byDiameter.set(r.diameter, (byDiameter.get(r.diameter) ?? 0) + 1);

  return (
    <section id="kit" className="mt-14 border-t border-zinc-200 pt-10 dark:border-zinc-800">
      <p className="text-xs font-medium uppercase tracking-wide text-indigo-600 dark:text-indigo-400">
        Companion tool
      </p>
      <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Plan your kit
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Check off the hardware you own and Muster shows every reload it can already fly, and the
        one purchase that unlocks the most more. It stays on your device — nothing is uploaded.
      </p>

      {/* Owned-hardware selectors, grouped by system then diameter. */}
      <div className="mt-5 space-y-6">
        {manufacturers().map((mfr) => (
          <div key={mfr}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {SYSTEM_LABEL[mfr]}
            </p>
            <div className="space-y-3">
              {diametersFor(mfr).map((d) => {
                const dCases = cases.filter((c) => c.manufacturer === mfr && c.diameter === d);
                const dAdapters = adapters.filter((a) => a.manufacturer === mfr && a.diameter === d);
                return (
                  <fieldset key={d} className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                    <legend className="px-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {d} mm
                    </legend>
                    <div className="flex flex-wrap gap-2">
                      {dCases.map((c) => {
                        const on = view.caseIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleCase(c.id)}
                            className={
                              "rounded-lg border px-2.5 py-1.5 font-mono text-xs font-medium transition " +
                              (on
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "border-zinc-300 bg-white text-zinc-600 hover:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-indigo-500/60")
                            }
                          >
                            {on ? "✓ " : ""}
                            {c.designation}
                          </button>
                        );
                      })}
                      {dAdapters.map((a) => {
                        const on = view.adapterIds.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggleAdapter(a.id)}
                            title={a.name}
                            className={
                              "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition " +
                              (on
                                ? "border-indigo-500/60 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                                : "border-dashed border-zinc-300 bg-white text-zinc-600 hover:border-indigo-400 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:border-indigo-500/60")
                            }
                          >
                            {on ? "✓ " : "+ "}
                            {a.designation}
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {ownedCount === 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Select the cases and adapters you own to see what your kit flies.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Coverage. */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-5 dark:bg-emerald-500/5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                Your kit flies
              </h3>
              <button
                type="button"
                onClick={clear}
                className="text-xs font-medium text-zinc-500 underline underline-offset-2 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Clear
              </button>
            </div>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
              {cov.reloads.length}
              <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                reload{cov.reloads.length === 1 ? "" : "s"}
              </span>
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
              {[...byDiameter.entries()].sort((a, b) => a[0] - b[0]).map(([d, n]) => (
                <span key={d} className="tabular-nums">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">{d} mm</span> · {n}
                </span>
              ))}
            </div>
            {cov.advisoryDiameters.length > 0 && (
              <p className="mt-3 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
                Your {cov.advisoryDiameters.join(" & ")} mm adapter can fly additional shorter
                reloads that Muster doesn&apos;t resolve — confirm those against AeroTech&apos;s
                instructions.
              </p>
            )}
          </div>

          {/* Buy next. */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
            <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
              Unlock more
            </h3>
            {suggestions.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                You already own every case in your diameters — nothing left to add.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {suggestions.map((s) => (
                  <li
                    key={`${s.kind}-${s.id}`}
                    className="flex items-baseline justify-between gap-3 border-b border-zinc-100 pb-2 last:border-0 last:pb-0 dark:border-zinc-800/70"
                  >
                    <span className="min-w-0">
                      <span className="font-mono text-sm font-medium text-zinc-800 dark:text-zinc-200">
                        {s.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-zinc-500 dark:text-zinc-400">
                        {s.detail}
                      </span>
                    </span>
                    <span
                      className={
                        "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums " +
                        (s.advisory
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                          : "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300")
                      }
                    >
                      {s.advisory ? "+ some" : `+${s.added}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
