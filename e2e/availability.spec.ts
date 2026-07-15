import { test, expect } from "@playwright/test";

// The availability signal reads the Motor Finder's bulk feed cross-origin. These drive it with the
// network mocked: it shows when the feed resolves, shows NOTHING (and never blocks the page) when the
// feed fails, and — the payoff of a bulk feed — badges a whole case's reload list from ONE request.

const FEED = {
  _generated: "2026-07-15T00:00:00Z",
  motors: { "aerotech/I161W": { vendors: 5, inStock: 3 } },
};

function mockFeed(json: unknown) {
  return (route: import("@playwright/test").Route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(json),
    });
}

test.describe("live availability signal", () => {
  test("shows in-stock on the reload page when the feed resolves", async ({ page }) => {
    await page.route(/availability\.json/, mockFeed(FEED));
    await page.goto("/reload/at-i161w", { waitUntil: "networkidle" });
    await expect(page.getByText("In stock · 3 vendors")).toBeVisible();
    await expect(page.getByRole("link", { name: /Find it in stock/ })).toBeVisible();
  });

  test("shows nothing and stays usable when the feed fails (offline)", async ({ page }) => {
    await page.route(/availability\.json/, (route) => route.abort());
    await page.goto("/reload/at-i161w", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1, name: "I161W" })).toBeVisible();
    await expect(page.getByText("Muster is a shopping aid, not an assembly guide.")).toBeVisible();
    await expect(page.getByText(/In stock ·|Out of stock everywhere/)).toHaveCount(0);
  });

  test("badges a case's reload list from a single feed request", async ({ page }) => {
    const feedRequests: string[] = [];
    await page.route(/availability\.json/, (route) => {
      feedRequests.push(route.request().url());
      return mockFeed(FEED)(route);
    });
    // RMS-38/360 flies the I161W (built for it), so its row on the case page gets a badge.
    await page.goto("/case/rms-38-360", { waitUntil: "networkidle" });
    await expect(page.getByText("In stock · 3 vendors").first()).toBeVisible();
    // The whole page shares one fetch, however many reloads it lists.
    expect(feedRequests.length).toBe(1);
  });
});
