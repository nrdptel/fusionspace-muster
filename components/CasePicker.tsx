"use client";

import { useState } from "react";
import type { Manufacturer } from "@/lib/data/types";
import { allCases, caseById, diametersFor, manufacturers, reloadsForCase, SYSTEM_LABEL } from "@/lib/graph";
import { formatImpulse } from "@/lib/format";
import { Segmented } from "./ui";

/** Pick a case: choose a motor system, then a diameter, then the cases in it as a chip grid.
 *  The systems are kept separate because their hardware doesn't interchange across brands. */
export default function CasePicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (caseId: string) => void;
}) {
  const cases = allCases();
  const mfrs = manufacturers();
  const selected = value ? caseById(value) : undefined;
  const [mfr, setMfr] = useState<Manufacturer>(selected?.manufacturer ?? "AeroTech");

  const dias = diametersFor(mfr);
  const selectedDia = selected && selected.manufacturer === mfr ? selected.diameter : undefined;
  const [dia, setDia] = useState<number>(selectedDia ?? dias[dias.length >= 3 ? 2 : 0]);

  // Keep the diameter valid when the system changes.
  const effectiveDia = dias.includes(dia) ? dia : dias[0];
  const shown = cases.filter((c) => c.manufacturer === mfr && c.diameter === effectiveDia);

  const changeMfr = (m: Manufacturer) => {
    setMfr(m);
    const d = diametersFor(m);
    if (!d.includes(dia)) setDia(d[d.length >= 3 ? 2 : 0]);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Which case do you have?
        </span>
        {mfrs.length > 1 && (
          <Segmented
            ariaLabel="Motor system"
            value={mfr}
            onChange={(v) => changeMfr(v as Manufacturer)}
            options={mfrs.map((m) => ({ value: m, label: SYSTEM_LABEL[m] }))}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Case diameter"
          size="sm"
          value={String(effectiveDia)}
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
