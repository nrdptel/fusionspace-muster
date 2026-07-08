// Shared outbound links. The site origin resolves the same way the metadata,
// robots, and sitemap do — a fork can point it at its own domain with
// NEXT_PUBLIC_SITE_URL.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://muster.fusionspace.co";
export const HUB_URL = "https://fusionspace.co";
export const REPO_URL = "https://github.com/nrdptel/fusionspace-muster";
export const KOFI_URL = "https://ko-fi.com/nrdptel";

// Sibling Fusion Space tools, linked inline in the footer the way the live siblings do.
// The LIVE tools only — Debrief is still in development, so it isn't linked from a
// launch-ready tool. Muster is omitted (you're already here). The Motor Finder leads,
// since it's the closest neighbour: it tells you which reload to buy, Muster tells you
// what hardware that reload needs.
export const SIBLING_TOOLS = [
  { name: "Motor Finder", href: "https://motor.fusionspace.co", blurb: "Live motor stock & pricing" },
  { name: "Charge", href: "https://charge.fusionspace.co", blurb: "Ejection-charge calculator" },
  { name: "Window", href: "https://window.fusionspace.co", blurb: "Launch-weather board" },
] as const;

export const MOTOR_FINDER_URL = "https://motor.fusionspace.co";

/** Deep link to a reload's detail page on the HPR Motor Finder — its live cross-vendor
 *  stock and pricing. The Motor Finder uses `/motor/<manufacturer>/<designation>` and, like
 *  Muster, keys off the ThrustCurve catalog, so a Muster reload maps straight across. Closes
 *  the loop: Muster says what hardware a reload needs; the Motor Finder says where to buy it. */
export function checkStockUrl(reload: { manufacturer: string; designation: string }): string {
  const slug = reload.manufacturer.toLowerCase();
  return `${MOTOR_FINDER_URL}/motor/${slug}/${encodeURIComponent(reload.designation)}`;
}

// Data sources — credited in the footer and the methodology.
export const THRUSTCURVE_URL = "https://www.thrustcurve.org";
export const AEROTECH_URL = "https://www.aerotech-rocketry.com";
export const CESARONI_URL = "https://pro38.com";
export const LOKI_URL = "https://www.lokiresearch.com";
