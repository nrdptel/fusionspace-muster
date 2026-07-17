import { describe, it, expect } from "vitest";
import { SITE_TITLE, SITE_DESCRIPTION, OG_IMAGE, socialCard } from "./seo";
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

describe("socialCard", () => {
  // The regression this guards: the deep-link case/reload pages once returned their own
  // openGraph/twitter without an image. Next.js REPLACES (never merges) a page's social
  // metadata over the layout's, so those shared pages went out as imageless `summary` cards.
  // Every page now builds its card through socialCard — hold it to always carrying the image
  // and the large-image type, so a page can never silently drop them again.
  const card = socialCard({ title: "T", description: "D", url: "/case/example" });

  it("always carries the branded card image in Open Graph", () => {
    const images = card.openGraph?.images;
    expect(Array.isArray(images) && images.length).toBeTruthy();
    expect(JSON.stringify(images)).toContain(OG_IMAGE);
  });

  it("uses the large-image Twitter card with the same image", () => {
    expect(card.twitter?.card).toBe("summary_large_image");
    expect(JSON.stringify(card.twitter?.images)).toContain(OG_IMAGE);
  });

  it("passes the page's own title, description, and url through", () => {
    expect(card.openGraph?.title).toBe("T");
    expect(card.openGraph?.description).toBe("D");
    expect(card.openGraph && "url" in card.openGraph && card.openGraph.url).toBe("/case/example");
    expect(card.twitter?.title).toBe("T");
  });
});
