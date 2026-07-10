"use client";

import { useState } from "react";
import type { MotorCase, Reload } from "@/lib/data/types";
import { shoppingList, shoppingListText, type FitKind } from "@/lib/resolve";
import { formatImpulse, formatThrust, formatDelays, propLabel } from "@/lib/format";
import { checkStockUrl } from "@/lib/links";

/** The complete "what to buy to fly this" panel for a chosen case + reload. Splits the
 *  one-time reusable hardware from the single-use reload, and carries the conservative
 *  notes. A copy button puts a plain-text list on the clipboard for a club chat or an order. */
export default function HardwareList({
  motorCase,
  reload,
  fit,
  spacers,
}: {
  motorCase: MotorCase;
  reload: Reload;
  fit: FitKind;
  spacers: number;
}) {
  const list = shoppingList(motorCase, reload, fit, spacers);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shoppingListText(list));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  return (
    <section
      id="shopping-list"
      aria-label="Shopping list"
      className="mt-6 rounded-xl border border-indigo-500/30 bg-indigo-50/40 p-5 dark:border-indigo-500/25 dark:bg-indigo-950/20"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            To fly the {reload.designation}
          </h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            in a{" "}
            <span className="font-mono text-zinc-800 dark:text-zinc-200">{motorCase.designation}</span>{" "}
            case · {formatImpulse(reload.totImpulseNs)} · {formatThrust(reload.avgThrustN)} avg ·{" "}
            {propLabel(reload)} · delay {formatDelays(reload)}
          </p>
        </div>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 print:hidden"
        >
          {copied ? "Copied ✓" : "Copy list"}
        </button>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Reusable hardware to own
          </h4>
          <ul className="mt-2 space-y-2">
            {list.reusable.map((item, i) => (
              <li key={i} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.name}</span>
                  {item.partNumber && (
                    <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{item.partNumber}</span>
                  )}
                </div>
                {item.detail && (
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</p>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Single-use reload to buy
          </h4>
          <ul className="mt-2 space-y-2">
            <li className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                {list.consumable.name}
              </span>
              {list.consumable.detail && (
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{list.consumable.detail}</p>
              )}
              <a
                href={checkStockUrl(reload)}
                target="_blank"
                rel="noopener noreferrer"
                title={`See live stock and pricing for the ${reload.designation} on the HPR Motor Finder`}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
              >
                Check stock &amp; pricing
                <span aria-hidden>↗</span>
              </a>
            </li>
          </ul>

          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Before you buy
          </h4>
          <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            {list.notes.map((n, i) => (
              <li key={i} className="flex gap-2">
                <span aria-hidden className="mt-0.5 text-zinc-400 dark:text-zinc-600">
                  •
                </span>
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
