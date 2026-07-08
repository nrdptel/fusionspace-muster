"use client";

import { useState } from "react";
import { allCases, diameters, reloadsForCase } from "@/lib/graph";
import { formatImpulse } from "@/lib/format";
import { Segmented } from "./ui";

/** Pick a case: a diameter filter, then the cases in that diameter as a chip grid. Keeps
 *  the whole AeroTech RMS case ladder visible at a glance without a long scroll. */
export default function CasePicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (caseId: string) => void;
}) {
  const cases = allCases();
  const dias = diameters();
  const selected = cases.find((c) => c.id === value);
  const [dia, setDia] = useState<number>(selected?.diameter ?? 38);

  const shown = cases.filter((c) => c.diameter === dia);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Which case do you have?
        </span>
        <Segmented
          ariaLabel="Case diameter"
          value={String(dia)}
          onChange={(v) => setDia(Number(v))}
          options={dias.map((d) => ({ value: String(d), label: `${d} mm` }))}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {shown.map((c) => {
          const count = reloadsForCase(c.designation).length;
          const active = c.id === value;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              aria-pressed={active}
              className={
                "rounded-lg border px-3 py-2.5 text-left transition " +
                (active
                  ? "border-indigo-500 bg-indigo-50/60 dark:border-indigo-500/70 dark:bg-indigo-950/30"
                  : "border-zinc-200 bg-white hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-indigo-500/60")
              }
            >
              <div className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {c.designation}
              </div>
              <div className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                ≈{formatImpulse(c.maxImpulseNs)} · {count} reload{count === 1 ? "" : "s"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
