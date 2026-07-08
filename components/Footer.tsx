import { observancesForDate } from "@/lib/observances";
import { HUB_URL, REPO_URL, THRUSTCURVE_URL, AEROTECH_URL, CESARONI_URL, LOKI_URL, SIBLING_TOOLS } from "@/lib/links";
import { GitHubIcon } from "./icons";

function Dot() {
  return (
    <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-700">
      ·
    </span>
  );
}

export default function Footer() {
  const observances = observancesForDate();
  return (
    <footer className="mt-20 border-t border-zinc-200 pt-6 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 md:mt-28">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
          >
            <GitHubIcon className="h-4 w-4 fill-current" />
            GitHub
          </a>
          {/* The other live Fusion Space tools, inline the way the siblings cross-link. */}
          {SIBLING_TOOLS.map((tool) => (
            <span key={tool.href} className="inline-flex items-center gap-x-4">
              <Dot />
              <a
                href={tool.href}
                target="_blank"
                rel="noopener noreferrer"
                title={tool.blurb}
                className="hover:text-zinc-800 dark:hover:text-zinc-200"
              >
                {tool.name}
              </a>
            </span>
          ))}
        </nav>
        <a
          href={HUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="Fusion Space — free, polished tools for high-power rocketry"
          className="group inline-flex items-center gap-1.5 transition hover:opacity-80"
        >
          <span>A</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/fusion-space-wordmark.svg"
            alt="Fusion Space"
            width={1598}
            height={281}
            className="h-5 w-auto"
          />
          <span>
            project{" "}
            <span aria-hidden className="opacity-0 transition group-hover:opacity-100">
              ↗
            </span>
          </span>
        </a>
      </div>

      <p className="mt-5 max-w-3xl leading-relaxed text-zinc-500 dark:text-zinc-400">
        <strong className="font-medium text-zinc-600 dark:text-zinc-300">
          The reload&apos;s own printed instructions are the authority on the hardware it
          needs — always build to them, and confirm parts against the manufacturer before
          you buy or fly.
        </strong>{" "}
        Muster is a shopping aid, not an assembly guide, and a compatibility result is only
        as current as the data behind it. Motor and certification data from{" "}
        <a
          href={THRUSTCURVE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ThrustCurve
        </a>{" "}
        and the manufacturers (
        <a
          href={AEROTECH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          AeroTech
        </a>
        ,{" "}
        <a
          href={CESARONI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Cesaroni
        </a>
        ,{" "}
        <a
          href={LOKI_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          Loki
        </a>
        ). Personal, non-commercial project — not affiliated with any rocketry
        organization, vendor, or manufacturer. Built for the hobby rocketry community.
      </p>

      {observances.length > 0 && (
        <div className="mt-5 space-y-1">
          {observances.map((o) => (
            <p key={o.id} className="text-zinc-500 dark:text-zinc-400">
              <span aria-hidden="true">{o.emoji}</span> {o.message}
              {o.href && (
                <>
                  {" "}
                  <a
                    href={o.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
                  >
                    {o.hrefLabel ?? "Learn more"} →
                  </a>
                </>
              )}
            </p>
          ))}
        </div>
      )}
    </footer>
  );
}
