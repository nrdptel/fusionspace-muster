import { test, expect } from "@playwright/test";

// The live availability signal reads the Motor Finder cross-origin. These drive it with the network
// mocked: it must show when the fetch succeeds, and — the load-bearing property — must silently show
// NOTHING (and never block the page) when the fetch fails, so Muster's offline answer is untouched.

const IN_STOCK_PAGE =
  `<!doctype html><html><head><script type="application/ld+json">` +
  JSON.stringify({
    "@type": "Product",
    name: "AeroTech I161W",
    offers: {
      "@type": "AggregateOffer",
      offerCount: 3,
      availability: "https://schema.org/InStock",
      offers: [
        { "@type": "Offer", availability: "https://schema.org/InStock" },
        { "@type": "Offer", availability: "https://schema.org/OutOfStock" },
        { "@type": "Offer", availability: "https://schema.org/InStock" },
      ],
    },
  }) +
  `</script></head><body></body></html>`;

test.describe("live availability signal on the reload page", () => {
  test("shows in-stock when the Motor Finder fetch succeeds", async ({ page }) => {
    await page.route(/motor\.fusionspace\.co/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        headers: { "access-control-allow-origin": "*" },
        body: IN_STOCK_PAGE,
      }),
    );
    await page.goto("/reload/at-i161w", { waitUntil: "networkidle" });
    // 2 of the 3 mocked vendors are in stock.
    await expect(page.getByText("In stock now · 2 vendors")).toBeVisible();
    await expect(page.getByRole("link", { name: /Find it in stock/ })).toBeVisible();
  });

  test("shows nothing and stays usable when the fetch fails (offline)", async ({ page }) => {
    await page.route(/motor\.fusionspace\.co/, (route) => route.abort());
    await page.goto("/reload/at-i161w", { waitUntil: "networkidle" });
    // The reference content is unaffected...
    await expect(page.getByRole("heading", { level: 1, name: "I161W" })).toBeVisible();
    await expect(page.getByText("Muster is a shopping aid, not an assembly guide.")).toBeVisible();
    // ...and no availability signal is shown.
    await expect(page.getByText(/In stock now|Out of stock everywhere/)).toHaveCount(0);
  });
});
