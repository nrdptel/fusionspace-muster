import type { Metadata } from "next";

// The site's title and social/search description, kept here (not inline in the layout) so a
// test can hold them to the data: the description must name every motor system Muster ships,
// so a new system can't silently ship without the SEO/OG/Twitter copy catching up. This is the
// exact drift that shipped once — the description lagged a system behind the catalog.

export const SITE_TITLE = "Muster — HPR motor-hardware compatibility";

export const SITE_DESCRIPTION =
  "Motor-hardware compatibility for high-power rocketry. Pick a reloadable case — AeroTech RMS, " +
  "Cesaroni Pro, or Loki Research — and see the reloads it flies, the closures and spacers each " +
  "needs, their certification, and the full hardware shopping list. Or start from a reload and " +
  "work back.";

// The shared branded card image, pre-generated at build by scripts/gen-og.mjs from the HPR
// Motor Finder's exact template so the family reads as one. Resolved absolutely against the
// layout's metadataBase.
export const OG_IMAGE = "/og/default.png";

/**
 * The Open Graph + Twitter fields for a page, ALWAYS carrying the branded card image and the
 * large-image card type.
 *
 * Centralised deliberately: Next.js *replaces* (does not deep-merge) a page's `openGraph` /
 * `twitter` over the root layout's, so a page that returns its own without re-stating the image
 * silently ships an imageless `summary` card — which is exactly what the deep-link case and
 * reload pages did, the very pages people share. Every page builds its social metadata through
 * here so the image can't be dropped again, and a unit test holds this contract.
 *
 * `url` is the page's canonical path (e.g. "/case/rms-38-360"), resolved against metadataBase.
 */
export function socialCard({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      siteName: "Muster",
      title,
      description,
      url,
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
  };
}
