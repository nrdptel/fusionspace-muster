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

// The case page is the other half of the printable sheet, and its safety-critical extra is the
// cross-brand crossload caution — a section that must survive to paper (a flyer at the bench needs
// the "AeroTech advises against this" warning, not just the green-light fits). Drive a crossload
// case (a content superset of a plain case) so the caution, the reload list, and the safety line
// are all covered, and confirm the interactive chrome still drops out.
test.describe("print — deep-link case page", () => {
  test("prints the parts sheet including the crossload caution, chrome dropped", async ({ page }) => {
    await page.emulateMedia({ media: "print" });
    await page.goto("/case/rms-98-5120", { waitUntil: "networkidle" });

    // Reference content a flyer needs on paper.
    await expect(page.getByRole("heading", { level: 1, name: "RMS-98/5120" })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Reloads built for this case/ })).toBeVisible();
    await expect(page.getByText("Muster is a shopping aid, not an assembly guide.")).toBeVisible();
    // The crossload caution is safety-critical: its warning and the "certify in the hardware it's
    // flown in" line must print, not just the plain fits.
    await expect(page.getByRole("heading", { name: /Cross-brand crossload/ })).toBeVisible();
    await expect(page.getByText(/AeroTech recommends against it/)).toBeVisible();
    await expect(page.getByText(/must be certified in the hardware/)).toBeVisible();

    // On-screen-only chrome is hidden in print: the CTA, the theme toggle, and the footer links.
    await expect(page.getByRole("link", { name: /Open in the interactive tool/ })).toBeHidden();
    await expect(page.getByRole("button", { name: /Color theme/i })).toBeHidden();
    await expect(page.getByRole("link", { name: "GitHub" })).toBeHidden();
  });

  test("the same case content is visible on screen (chrome only hides for print)", async ({ page }) => {
    await page.emulateMedia({ media: "screen" });
    await page.goto("/case/rms-98-5120", { waitUntil: "networkidle" });
    await expect(page.getByRole("link", { name: /Open in the interactive tool/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Color theme/i })).toBeVisible();
  });
});
