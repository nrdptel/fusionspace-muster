// Structured data (schema.org JSON-LD) for the deep-linkable case and reload pages.
//
// Kept here, pure and tested, rather than inline in the page components, so the shape is
// auditable and can't drift between the two pages. Each entity page emits one `@graph` with a
// `Product` (mirroring the HPR Motor Finder's per-motor Product node, so the family reads as one
// author) and the page's `BreadcrumbList`.
//
// One deliberate difference from the Motor Finder: Muster carries no price or stock data, so the
// Product has NO `offers`. Muster is a compatibility/shopping aid, not a store — inventing an
// Offer would be both unsourced and misleading. Every property below is a fact already in the
// graph.

import type { Manufacturer, MotorCase, Reload } from "./data/types";
import { certLabel } from "./resolve";
import { formatImpulse, formatThrust } from "./format";

const DEFAULT_SITE = "https://muster.fusionspace.co";

// The manufacturer's company/brand name — distinct from the *system* label (e.g. "AeroTech RMS"),
// which names the reload system, not the maker. The brand is the company that makes the product.
const BRAND: Record<Manufacturer, string> = {
  AeroTech: "AeroTech",
  Cesaroni: "Cesaroni",
  Loki: "Loki Research",
};

interface PropertyValue {
  "@type": "PropertyValue";
  name: string;
  value: string | number;
  unitText?: string;
}

/** A schema.org PropertyValue, or null to drop the row when the value is absent. */
function prop(
  name: string,
  value: string | number | null | undefined,
  unitText?: string,
): PropertyValue | null {
  if (value === null || value === undefined || value === "") return null;
  return { "@type": "PropertyValue", name, value, ...(unitText ? { unitText } : {}) };
}

function breadcrumb(siteUrl: string, name: string, path: string) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Muster", item: `${siteUrl}/` },
      { "@type": "ListItem", position: 2, name, item: `${siteUrl}${path}` },
    ],
  };
}

/** A related entity to link in an ItemList — a case a reload flies in, or a reload a case flies. */
export interface RelatedEntity {
  id: string;
  name: string;
}

/** A schema.org ItemList linking to the detail pages this page lists. The case page IS a list of
 *  the reloads it flies, and the reload page a list of the cases that fly it — this marks up that
 *  primary content the way Google recommends for a summary-of-links page (ListItem `url`, not an
 *  inline `item`). */
function itemList(name: string, siteUrl: string, kind: "case" | "reload", items: RelatedEntity[]) {
  return {
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${siteUrl}/${kind}/${it.id}`,
      name: it.name,
    })),
  };
}

/** The `@graph` (Product + BreadcrumbList, plus an ItemList of the cases that fly it) for a
 *  reload's deep-link page. */
export function reloadJsonLd(r: Reload, siteUrl: string = DEFAULT_SITE, casesThatFlyIt: RelatedEntity[] = []) {
  const url = `${siteUrl}/reload/${r.id}`;
  const brand = BRAND[r.manufacturer];
  const description =
    `The ${brand} ${r.designation} is a class ${r.impulseClass} high-power rocket motor reload ` +
    `(${formatImpulse(r.totImpulseNs)}, ${formatThrust(r.avgThrustN)} average thrust` +
    `${r.propName ? `, ${r.propName} propellant` : ""}). See the cases and reusable hardware that fly it.`;

  const product = {
    "@type": "Product",
    "@id": `${url}#product`,
    name: `${brand} ${r.designation}`,
    sku: r.designation,
    category: "High-power rocket motor reload",
    brand: { "@type": "Brand", name: brand },
    url,
    description,
    additionalProperty: [
      prop("Impulse class", r.impulseClass),
      prop("Total impulse", r.totImpulseNs, "N·s"),
      prop("Average thrust", r.avgThrustN, "N"),
      prop("Diameter", r.diameter, "mm"),
      prop("Propellant", r.propName),
      prop("Certification", certLabel(r)),
    ].filter((p): p is PropertyValue => p !== null),
  };

  const graph: Record<string, unknown>[] = [product, breadcrumb(siteUrl, r.designation, `/reload/${r.id}`)];
  if (casesThatFlyIt.length > 0) {
    graph.push(itemList(`Cases that fly the ${r.designation}`, siteUrl, "case", casesThatFlyIt));
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

/** The `@graph` (Product + BreadcrumbList, plus an ItemList of the reloads it flies) for a case's
 *  deep-link page. */
export function caseJsonLd(c: MotorCase, siteUrl: string = DEFAULT_SITE, reloadsItFlies: RelatedEntity[] = []) {
  const url = `${siteUrl}/case/${c.id}`;
  const brand = BRAND[c.manufacturer];
  const description =
    `The ${brand} ${c.designation} is a ${c.diameter} mm reusable high-power rocket motor case. ` +
    `See every reload it flies and the closures and hardware each needs.`;

  const product = {
    "@type": "Product",
    "@id": `${url}#product`,
    name: `${brand} ${c.designation} case`,
    // The designation is the case's SKU; where a distinct manufacturer part number is confirmed,
    // it's the MPN (e.g. designation "RMS-38/480", part number "3848C").
    sku: c.designation,
    ...(c.partNumber ? { mpn: c.partNumber } : {}),
    category: "Reusable high-power rocket motor case",
    brand: { "@type": "Brand", name: brand },
    url,
    description,
    additionalProperty: [
      prop("Diameter", c.diameter, "mm"),
      // Cesaroni cases get their max impulse filled from the reloads at graph assembly; guard so a
      // not-yet-filled 0 never ships as a rating.
      c.maxImpulseNs > 0 ? prop("Maximum total impulse", c.maxImpulseNs, "N·s") : null,
    ].filter((p): p is PropertyValue => p !== null),
  };

  const graph: Record<string, unknown>[] = [product, breadcrumb(siteUrl, `${c.designation} case`, `/case/${c.id}`)];
  if (reloadsItFlies.length > 0) {
    graph.push(itemList(`Reloads the ${c.designation} case flies`, siteUrl, "reload", reloadsItFlies));
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
