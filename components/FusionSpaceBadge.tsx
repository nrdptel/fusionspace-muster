/** The FusionSpace horizontal lockup (Rev C: the four-cone mark before the wordmark), sized to
 * the brand's screen minimum — the cluster at least 24 px tall, so the lockup is 142×24. The
 * brand rules pick the variant by background: on light, a horizontal lockup under 32 px tall
 * uses the one-colour Void lockup (the thin gradient details are too faint there); on dark it's
 * the full Fusion gradient. Both images ship and the theme's `dark:` variant shows one, so the
 * swap follows the toggle and the OS fallback exactly like the rest of the chrome, with no
 * flash. Shared by the header eyebrow and the footer's "A FusionSpace project" line. */
export function FusionSpaceLockup() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/fusion-space-horizontal-void.svg"
        alt="FusionSpace"
        width={142}
        height={24}
        className="block h-6 w-auto dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/fusion-space-wordmark.svg"
        alt="FusionSpace"
        width={142}
        height={24}
        className="hidden h-6 w-auto dark:block"
      />
    </>
  );
}

/** Parent-brand eyebrow. Muster is one of several FusionSpace tools; this small
 * linked lockup sits above the product name to place it under the FusionSpace
 * brand and let people discover the other tools at fusionspace.co. Uses the
 * official FusionSpace lockup so the family reads as one. Mirrors the HPR Motor
 * Finder's badge. */
export default function FusionSpaceBadge({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://fusionspace.co"
      target="_blank"
      rel="noopener noreferrer"
      title="FusionSpace — free, polished tools for high-power rocketry"
      className={`group inline-flex w-fit items-center gap-1 transition hover:opacity-80 ${className}`}
    >
      <FusionSpaceLockup />
      <span
        aria-hidden
        className="text-xs text-zinc-400 opacity-0 transition group-hover:opacity-100 dark:text-zinc-500"
      >
        ↗
      </span>
    </a>
  );
}
