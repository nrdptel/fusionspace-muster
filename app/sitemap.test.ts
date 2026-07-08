import { describe, it, expect } from "vitest";
import sitemap from "./sitemap";
import { allCases, allReloads } from "@/lib/graph";

// Guard the deep-link surface: every case and reload has its own page, so every one must be in
// the sitemap. This fails if a new entity (or a whole new motor system) ships without becoming
// discoverable — the same drift class the meta-description guard covers, one level up.
describe("sitemap", () => {
  const entries = sitemap();
  const urls = new Set(entries.map((e) => e.url));
  const base = "https://muster.fusionspace.co";

  it("lists the home page", () => {
    expect(urls.has(`${base}/`)).toBe(true);
  });

  it("lists a page for every case", () => {
    for (const c of allCases()) expect(urls.has(`${base}/case/${c.id}`)).toBe(true);
  });

  it("lists a page for every reload", () => {
    for (const r of allReloads()) expect(urls.has(`${base}/reload/${r.id}`)).toBe(true);
  });

  it("has exactly home + every case + every reload, and no duplicates", () => {
    expect(entries.length).toBe(1 + allCases().length + allReloads().length);
    expect(urls.size).toBe(entries.length);
  });
});
