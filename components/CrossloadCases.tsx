import Link from "next/link";
import type { CrossloadCaseFit } from "@/lib/resolve";
import { NOTE_CERT } from "@/lib/data/crossload";
import { SYSTEM_LABEL } from "@/lib/graph";
import SourceLinks from "./SourceLinks";

/** The cross-brand crossload panel for a reload: the foreign-brand case(s) it can fly in by the
 *  manufacturers' published 75/98 mm crossloads. Amber, a caution — never a resolved fit —
 *  carrying the direction-specific manufacturer note, the cert caveat, and the sources.
 *  Server-safe, so the interactive result and the static reload page share it. */
export default function CrossloadCases({ fits }: { fits: CrossloadCaseFit[] }) {
  if (fits.length === 0) return null;
  const { note, sources } = fits[0];

  return (
    <section className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 shrink-0 text-base">
          ⚠
        </span>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">Also flies cross-brand (crossload)</h3>
          <p className="mt-1 text-sm leading-relaxed">{note}</p>
          <p className="mt-2 text-xs leading-relaxed opacity-90">{NOTE_CERT}</p>
        </div>
      </div>

      <ul className="mt-4 grid list-none gap-1.5 sm:grid-cols-2">
        {fits.map((f) => (
          <li key={f.motorCase.id}>
            <Link
              href={`/case/${f.motorCase.id}`}
              className="flex flex-wrap items-baseline justify-between gap-x-2 rounded-md border border-amber-500/25 bg-white/60 px-2.5 py-1.5 transition hover:border-amber-500/60 dark:bg-zinc-900/40"
            >
              <span className="font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200">{f.motorCase.designation}</span>
              <span className="text-[11px] text-zinc-600 dark:text-zinc-400">{SYSTEM_LABEL[f.motorCase.manufacturer]}</span>
            </Link>
          </li>
        ))}
      </ul>

      <SourceLinks sources={sources} className="mt-3 text-xs opacity-80" />
    </section>
  );
}
