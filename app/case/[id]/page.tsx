import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { allCases, caseById, partById, SYSTEM_LABEL } from "@/lib/graph";
import { resolveCase, type ReloadFit } from "@/lib/resolve";
import { formatImpulse, formatThrust, propLabel } from "@/lib/format";
import { CertBadge, PluggedBadge, SparkyBadge, AvailabilityBadge, FitBadge } from "@/components/badges";
import CrossloadReloads from "@/components/CrossloadReloads";
import EntityFrame from "@/components/EntityFrame";
import { caseJsonLd } from "@/lib/jsonld";

// Every case id is known at build time; anything else 404s (no on-demand rendering on a
// static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return allCases().map((c) => ({ id: c.id }));
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://muster.fusionspace.co";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = caseById(id);
  if (!c) return {};
  const label = SYSTEM_LABEL[c.manufacturer];
  const title = `${c.designation} — reloads & hardware · Muster`;
  const description =
    `Every reload the ${label} ${c.designation} (${c.diameter} mm) case flies — direct and ` +
    `spacer fits — the closures it needs, and the complete hardware shopping list to fly.`;
  const path = `/case/${c.id}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, url: path, type: "website" },
    twitter: { title, description },
  };
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = caseById(id);
  if (!c) notFound();

  const res = resolveCase(c);
  const parts = [c.forwardClosure, c.aftClosure, c.sealDisc]
    .map((pid) => (pid ? partById(pid) : undefined))
    .filter(Boolean) as NonNullable<ReturnType<typeof partById>>[];

  const oneSpacer = res.viaAdapter.filter((f) => f.spacers === 1);
  const twoSpacer = res.viaAdapter.filter((f) => f.spacers === 2);

  const label = SYSTEM_LABEL[c.manufacturer];
  const toolHref = `/?have=case&case=${c.id}`;

  // The reloads this case flies (direct + spacer), deduped by id — a longer case can list a reload
  // at both one and two spacers, but it's one entry in the structured-data list. Crossloads stay
  // out: they're a separate cautioned section, not a resolved fit.
  const fliesById = new Map<string, string>();
  for (const f of [...res.native, ...res.viaAdapter]) fliesById.set(f.reload.id, f.reload.designation);
  const fliesReloads = [...fliesById].map(([id, name]) => ({ id, name }));
  const jsonLd = caseJsonLd(c, siteUrl, fliesReloads);

  const reloadRow = (f: ReloadFit) => (
    <li key={`${f.reload.id}-${f.spacers}`}>
      <Link
        href={`/reload/${f.reload.id}`}
        className="block rounded-lg border border-zinc-200 bg-white px-3.5 py-3 transition hover:border-indigo-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-indigo-500/60"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {f.reload.designation}
          </span>
          <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
            {formatImpulse(f.reload.totImpulseNs)} · {formatThrust(f.reload.avgThrustN)} avg · {propLabel(f.reload)}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <FitBadge fit={f.fit} spacers={f.spacers} adapter={f.adapter} />
          <CertBadge reload={f.reload} />
          <PluggedBadge reload={f.reload} />
          <SparkyBadge reload={f.reload} />
          <AvailabilityBadge reload={f.reload} />
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
        <span className="text-zinc-700 dark:text-zinc-300">{c.designation}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
          {c.designation}
        </h1>
        <span className="text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
          {label} · {c.diameter} mm · up to ≈{formatImpulse(c.maxImpulseNs)}
          {c.partNumber ? ` · P/N ${c.partNumber}` : ""}
        </span>
      </div>

      {parts.length > 0 ? (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Beyond the case, every reload below needs the{" "}
          {parts.map((p, i) => (
            <span key={p.id}>
              {i > 0 ? (i === parts.length - 1 ? ", plus the " : ", the ") : ""}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{p.name}</span>
            </span>
          ))}
          — reusable, and shared across every {c.diameter} mm case in the {label} line.
        </p>
      ) : (
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          The reload includes its closures — you reuse only the case.
        </p>
      )}
      {c.notes && <p className="mt-2 max-w-3xl text-xs text-zinc-500 dark:text-zinc-400">{c.notes}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          href={toolHref}
          className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          Open in the interactive tool
          <span aria-hidden>→</span>
        </Link>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          Pick a reload there for its full, copyable shopping list.
        </span>
      </div>

      <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-900 dark:text-amber-200">
        <strong className="font-semibold">Muster is a shopping aid, not an assembly guide.</strong>{" "}
        Build only to the reload&apos;s printed instructions — always the authority — and confirm
        every part with the manufacturer before you buy or fly.
      </p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
          Reloads built for this case{" "}
          <span className="font-normal text-zinc-500 dark:text-zinc-400">({res.native.length})</span>
        </h2>
        {res.native.length > 0 ? (
          <ul className="mt-3 grid list-none gap-2 sm:grid-cols-2">{res.native.map(reloadRow)}</ul>
        ) : (
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            No reloads are listed for this case in the current data.
          </p>
        )}
      </section>

      {res.viaAdapter.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
            Also flies with spacers{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">
              ({res.viaAdapter.length}, via the {res.adapter?.designation})
            </span>
          </h2>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Shorter reloads this longer case can fly with the {res.adapter?.name}. Confirm the
            spacer count against {c.manufacturer}&apos;s instructions.
          </p>
          {oneSpacer.length > 0 && (
            <>
              <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">With 1 spacer</h3>
              <ul className="mt-2 grid list-none gap-2 sm:grid-cols-2">{oneSpacer.map(reloadRow)}</ul>
            </>
          )}
          {twoSpacer.length > 0 && (
            <>
              <h3 className="mt-4 text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">With 2 spacers</h3>
              <ul className="mt-2 grid list-none gap-2 sm:grid-cols-2">{twoSpacer.map(reloadRow)}</ul>
            </>
          )}
        </section>
      )}

      {res.crossload.length > 0 && (
        <CrossloadReloads
          fits={res.crossload}
          otherBrandLabel={SYSTEM_LABEL[res.crossload[0].reload.manufacturer]}
        />
      )}
    </EntityFrame>
  );
}
