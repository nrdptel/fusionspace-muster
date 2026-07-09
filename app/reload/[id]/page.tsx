import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allReloads, reloadById, SYSTEM_LABEL } from "@/lib/graph";
import { resolveReload, shoppingList, certLabel, type CaseFit } from "@/lib/resolve";
import { formatImpulse, formatThrust, formatDelays, propLabel } from "@/lib/format";
import { checkStockUrl } from "@/lib/links";
import { CertBadge, PluggedBadge, SparkyBadge, AvailabilityBadge, FitBadge } from "@/components/badges";
import CrossloadCases from "@/components/CrossloadCases";
import EntityFrame from "@/components/EntityFrame";
import { reloadJsonLd } from "@/lib/jsonld";

export const dynamicParams = false;

export function generateStaticParams() {
  return allReloads().map((r) => ({ id: r.id }));
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://muster.fusionspace.co";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const r = reloadById(id);
  if (!r) return {};
  const label = SYSTEM_LABEL[r.manufacturer];
  const title = `${r.designation} — cases & hardware · Muster`;
  const description =
    `The ${label} cases that fly the ${r.designation} (class ${r.impulseClass}, ` +
    `${formatImpulse(r.totImpulseNs)}), the closures and any spacers it needs, its ` +
    `${certLabel(r).toLowerCase()} status, and the hardware to fly it.`;
  const path = `/reload/${r.id}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website" },
    twitter: { title, description },
  };
}

export default async function ReloadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = reloadById(id);
  if (!r) notFound();

  const res = resolveReload(r);
  const label = SYSTEM_LABEL[r.manufacturer];
  const toolHref = `/?have=reload&reload=${r.id}`;
  // The complete "what to buy" for the simplest (native-case) build, so the page answers the
  // question on its own; the tool has the copyable list and any spacer-fit variants.
  const nativeList = res.native ? shoppingList(res.native.motorCase, r, "native", 0) : null;

  // The cases that fly this reload (its own + longer ones via spacers), deduped by id. Crossloads
  // stay out — they're a separate cautioned section, not a resolved fit.
  const flyingById = new Map<string, string>();
  for (const f of [...(res.native ? [res.native] : []), ...res.viaAdapter]) {
    flyingById.set(f.motorCase.id, f.motorCase.designation);
  }
  const flyingCases = [...flyingById].map(([id, name]) => ({ id, name }));
  const jsonLd = reloadJsonLd(r, siteUrl, flyingCases);

  const caseRow = (f: CaseFit) => (
    <li key={`${f.motorCase.id}-${f.spacers}`}>
      <Link
        href={`/case/${f.motorCase.id}`}
        className="block rounded-lg border border-zinc-200 bg-white px-3.5 py-3 transition hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-indigo-500/60"
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
      </Link>
    </li>
  );

  return (
    <EntityFrame>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <nav aria-label="Breadcrumb" className="mt-6 text-xs text-zinc-500 dark:text-zinc-400">
        <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">Muster</Link>
        <span aria-hidden className="mx-1.5">/</span>
        <span className="text-zinc-700 dark:text-zinc-300">{r.designation}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {r.designation}
        </h1>
        <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
          {formatImpulse(r.totImpulseNs)} · {formatThrust(r.avgThrustN)} avg
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {label} · class {r.impulseClass} · {propLabel(r)} · delay {formatDelays(r)} · built for the{" "}
        {res.native ? (
          <Link href={`/case/${res.native.motorCase.id}`} className="font-mono text-indigo-600 hover:text-indigo-500 dark:text-indigo-400">
            {r.caseInfo}
          </Link>
        ) : (
          <span className="font-mono text-zinc-700 dark:text-zinc-300">{r.caseInfo}</span>
        )}{" "}
        case
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <CertBadge reload={r} />
        <PluggedBadge reload={r} />
        <SparkyBadge reload={r} />
        <AvailabilityBadge reload={r} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={toolHref}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Open in the interactive tool
          <span aria-hidden>→</span>
        </Link>
        <a
          href={checkStockUrl(r)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Check stock &amp; pricing
          <span aria-hidden>↗</span>
        </a>
        <a
          href={r.tcUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`The ${r.designation}'s full specs and thrust curve on ThrustCurve — the catalog Muster mirrors`}
          className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          View on ThrustCurve
          <span aria-hidden>↗</span>
        </a>
      </div>

      <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
        <strong className="font-semibold">Muster is a shopping aid, not an assembly guide.</strong>{" "}
        Build only to the reload&apos;s printed instructions — always the authority — and confirm
        every part with the manufacturer before you buy or fly.
      </p>

      {nativeList && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            What you need to fly it
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            The simplest build — in its own{" "}
            <span className="font-mono">{res.native!.motorCase.designation}</span> case. Reusable
            hardware you buy once, plus the single-use reload.
          </p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Reusable hardware to own
              </h3>
              <ul className="mt-2 list-none space-y-2">
                {nativeList.reusable.map((item, i) => (
                  <li key={i} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{item.name}</span>
                      {item.partNumber && (
                        <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">{item.partNumber}</span>
                      )}
                    </div>
                    {item.detail && <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{item.detail}</p>}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Single-use reload to buy
              </h3>
              <div className="mt-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
                <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">{nativeList.consumable.name}</span>
                {nativeList.consumable.detail && (
                  <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{nativeList.consumable.detail}</p>
                )}
              </div>
              {nativeList.notes.length > 0 && (
                <ul className="mt-3 list-none space-y-1.5 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {nativeList.notes.map((n, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="mt-0.5 text-zinc-400 dark:text-zinc-600">•</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
          Cases that fly it
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Its own case is the simplest; a longer case flies it too, with the adapter and spacers.
        </p>
        {res.native || res.viaAdapter.length > 0 ? (
          <ul className="mt-3 grid list-none gap-2 sm:grid-cols-2">
            {res.native && caseRow(res.native)}
            {res.viaAdapter.map(caseRow)}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No case is listed for this reload in the current data.
          </p>
        )}
      </section>

      <CrossloadCases fits={res.crossload} />
    </EntityFrame>
  );
}
