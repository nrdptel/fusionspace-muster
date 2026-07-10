import SiteHeader from "@/components/SiteHeader";
import MusterApp from "@/components/MusterApp";
import KitPlanner from "@/components/KitPlanner";
import Methodology from "@/components/Methodology";
import InstallHint from "@/components/InstallHint";
import Footer from "@/components/Footer";
import { allCases, allReloads, diameters, manufacturers, SYSTEM_LABEL } from "@/lib/graph";
import { SITE_DESCRIPTION } from "@/lib/seo";

// Mirror the origin the rest of the site derives (layout metadataBase, sitemap, robots) so a
// fork setting NEXT_PUBLIC_SITE_URL gets structured data pointing at its own domain too.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://muster.fusionspace.co";

const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Muster",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Any",
  url: siteUrl,
  // One canonical app description, shared with the page metadata/OG (lib/seo) — a test there holds
  // it to name every motor system, so the structured data can't drift a system behind the catalog.
  description: SITE_DESCRIPTION,
  featureList: [
    "Case → compatible reloads (direct and spacer fits)",
    "Reload → the cases and hardware to fly it",
    "Forward/aft closure and seal-disc requirements",
    "Certification and production status per reload",
    "Complete reusable-hardware shopping list",
    "Kit planner: what your owned hardware flies, and what to buy next",
    "Shareable links; works offline; installable",
  ],
  isAccessibleForFree: true,
  publisher: { "@type": "Organization", name: "Fusion Space", url: "https://fusionspace.co" },
};

export default function Page() {
  // The intro line is built from the graph, not hand-written, so it can't drift a system or a
  // diameter behind the catalog (the exact drift that shipped once with the meta description).
  const caseCount = allCases().length;
  const reloadCount = allReloads().length;
  const systemLabels = manufacturers().map((m) => SYSTEM_LABEL[m]);
  const dias = diameters();
  const [minDia, maxDia] = [dias[0], dias[dias.length - 1]];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
      {/* Keyboard shortcut past the header and controls straight to the tool. Hidden until
          focused (first tab stop), then shown. */}
      <a
        href="#tool"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-indigo-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to the tool
      </a>
      <script
        type="application/ld+json"
        // Escape "<" so a "</script>" in any field couldn't break out of the tag. Every field
        // is a static literal today, but this keeps the serialization safe by construction.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c") }}
      />

      <SiteHeader />

      {/* Safety is the headline, not the fine print. */}
      <div className="mt-8 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
        <span aria-hidden className="mt-0.5 shrink-0 text-base">
          ⚠
        </span>
        <p>
          <strong className="font-semibold">
            Muster is a shopping aid, not an assembly guide.
          </strong>{" "}
          A wrong pairing of case, closure, and reload is dangerous, so build only to the
          reload&apos;s own printed instructions — they&apos;re always the authority — and confirm
          every part with the manufacturer before you buy or fly. Compatibility here is only as
          current as the data behind it. Follow your certification and your range&apos;s rules.
        </p>
      </div>

      <p className="mt-6 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Covering{" "}
        {systemLabels.map((label, i) => (
          <span key={label}>
            {i > 0 && (i === systemLabels.length - 1 ? (systemLabels.length > 2 ? ", and " : " and ") : ", ")}
            <strong className="font-medium text-zinc-700 dark:text-zinc-300">{label}</strong>
          </span>
        ))}{" "}
        — {caseCount} cases and {reloadCount} reloads from {minDia} to {maxDia} mm. Pick your system
        and the case you own to see everything it flies, or search for a reload to see the hardware it
        needs. Everything resolves to one clear shopping list, and each part links to its source.
      </p>

      <MusterApp />
      <KitPlanner />
      <Methodology />
      <InstallHint />
      <Footer />
    </main>
  );
}
