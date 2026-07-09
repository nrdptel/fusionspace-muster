import Link from "next/link";
import type { CrossloadReloadFit } from "@/lib/resolve";
import { NOTE_CERT } from "@/lib/data/crossload";
import { formatImpulse, propLabel } from "@/lib/format";
import { PluggedBadge, SparkyBadge } from "./badges";

/** The cross-brand crossload panel for a case: the foreign-brand reloads it can take by the
 *  manufacturers' published 75/98 mm crossloads. Deliberately amber and worded as a caution —
 *  never a resolved fit — carrying the direction-specific manufacturer note, the certification
 *  caveat, and the sources. Server-safe (no client hooks), so the interactive result and the
 *  static case page share it. */
export default function CrossloadReloads({
  fits,
  otherBrandLabel,
}: {
  fits: CrossloadReloadFit[];
  /** The system these foreign reloads come from, e.g. "Cesaroni Pro". */
  otherBrandLabel: string;
}) {
  if (fits.length === 0) return null;
  // Every crossload for one case shares the same direction note + sources.
  const { note, sources } = fits[0];

  return (
    <section className="mt-8 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-amber-900 dark:text-amber-200">
      <div className="flex items-start gap-3">
        <span aria-hidden className="mt-0.5 shrink-0 text-base">
          ⚠
        </span>
        <div>
          <h3 className="text-sm font-semibold tracking-tight">
            Cross-brand crossload{" "}
            <span className="font-normal opacity-80">
              ({fits.length} {otherBrandLabel} reload{fits.length === 1 ? "" : "s"})
            </span>
          </h3>
          <p className="mt-1 text-sm leading-relaxed">{note}</p>
          <p className="mt-2 text-xs leading-relaxed opacity-90">{NOTE_CERT}</p>
        </div>
      </div>

      <ul className="mt-4 grid list-none gap-1.5 sm:grid-cols-2">
        {fits.map((f) => (
          <li key={f.reload.id}>
            <Link
              href={`/reload/${f.reload.id}`}
              className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 rounded-md border border-amber-500/25 bg-white/60 px-2.5 py-1.5 transition hover:border-amber-500/60 dark:bg-zinc-900/40"
            >
              <span className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-medium text-zinc-800 dark:text-zinc-200">{f.reload.designation}</span>
                <PluggedBadge reload={f.reload} />
                <SparkyBadge reload={f.reload} />
              </span>
              <span className="text-[11px] tabular-nums text-zinc-600 dark:text-zinc-400">
                {formatImpulse(f.reload.totImpulseNs)} · {propLabel(f.reload)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs opacity-80">
        Source:{" "}
        {sources.map((s, i) => (
          <span key={s}>
            {i > 0 ? ", " : ""}
            <a href={s} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-100">
              {new URL(s).hostname.replace(/^www\./, "")}
            </a>
          </span>
        ))}
      </p>
    </section>
  );
}
