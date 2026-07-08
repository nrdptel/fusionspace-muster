import type { MetadataRoute } from "next";
import { allCases, allReloads } from "@/lib/graph";

export const dynamic = "force-static";

// Resolved against NEXT_PUBLIC_SITE_URL so a fork's sitemap points at its own
// domain, consistent with robots.ts, the metadata, and the siblings.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://muster.fusionspace.co";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  // Every case and reload has its own deep-linkable page — list them so they're discoverable,
  // not just the interactive home page.
  const cases: MetadataRoute.Sitemap = allCases().map((c) => ({
    url: `${siteUrl}/case/${c.id}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7,
  }));
  const reloads: MetadataRoute.Sitemap = allReloads().map((r) => ({
    url: `${siteUrl}/reload/${r.id}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.6,
  }));
  return [
    { url: `${siteUrl}/`, lastModified, changeFrequency: "monthly", priority: 1 },
    ...cases,
    ...reloads,
  ];
}
