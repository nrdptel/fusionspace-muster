import { describe, it, expect } from "vitest";
import { SITE_TITLE, SITE_DESCRIPTION } from "./seo";
import { manufacturers, SYSTEM_LABEL } from "./graph";

describe("site metadata", () => {
  it("has a title and a description of a sensible length for search/social", () => {
    expect(SITE_TITLE).toMatch(/Muster/);
    // Search engines truncate around 160 chars; social cards tolerate more. Keep it in the
    // same band as the sibling tools (~230–290) rather than letting it run long.
    expect(SITE_DESCRIPTION.length).toBeGreaterThan(80);
    expect(SITE_DESCRIPTION.length).toBeLessThan(300);
  });

  // The drift guard: the description shipped once naming only two of the systems in the
  // catalog. Tie it to the data so a new motor system can't reach production while the
  // SEO/OG/Twitter copy still describes the old scope.
  it("names every motor system present in the graph", () => {
    for (const m of manufacturers()) {
      expect(SITE_DESCRIPTION).toContain(m);
      // The full system label (e.g. "Loki Research") should be what's written.
      expect(SITE_DESCRIPTION).toContain(SYSTEM_LABEL[m]);
    }
  });
});
