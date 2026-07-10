import { test, expect } from "@playwright/test";

// A deep-link case/reload page is meant to print as a clean parts/reference sheet — the paper
// analog of the offline install, for the bench or the range. These drive the print media type and
// assert the split: the reference content (title, the hardware to buy, the safety line) prints,
// while the on-screen-only chrome (theme toggle, nav actions, footer links, the observance bar)
// drops out so no ink is wasted and nothing dead-clickable clutters the sheet.

test.describe("print — deep-link reload page", () => {
  test("keeps the reference content and drops the interactive chrome", async ({ page }) => {
    await page.emulateMedia({ media: "print" });
    await page.goto("/reload/at-i161w", { waitUntil: "networkidle" });

    // Reference content a flyer needs on paper.
    await expect(page.getByRole("heading", { level: 1, name: "I161W" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "What you need to fly it" })).toBeVisible();
    await expect(page.getByText("RMS-38/360 case", { exact: false }).first()).toBeVisible();
    // The safety framing must travel to paper.
    await expect(page.getByText("Muster is a shopping aid, not an assembly guide.")).toBeVisible();

    // On-screen-only chrome is hidden in print.
    await expect(page.getByRole("link", { name: /Open in the interactive tool/ })).toBeHidden();
    await expect(page.getByRole("link", { name: "GitHub" })).toBeHidden();
  });

  test("the same content is visible on screen (chrome only hides for print)", async ({ page }) => {
    await page.emulateMedia({ media: "screen" });
    await page.goto("/reload/at-i161w", { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: /Open in the interactive tool/ })).toBeVisible();
  });
});
