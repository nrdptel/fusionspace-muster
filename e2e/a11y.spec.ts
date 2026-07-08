import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Automated WCAG 2.0/2.1 A + AA audit of the tool in both light and dark themes, on the
// initial view and on a fully-populated result (case → reloads → shopping list) with the
// methodology disclosures open — so contrast and ARIA in the reached states are covered too.

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

async function audit(page: import("@playwright/test").Page, name: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  for (const v of violations) {
    const node = v.nodes[0];
    console.log(
      `\n[${v.impact}] ${name} :: ${v.id} — ${v.help}` +
        `\n  nodes: ${v.nodes.length} | ${(node?.target || []).join(" ")}` +
        `\n  html: ${(node?.html || "").slice(0, 140)}`,
    );
  }
  expect(violations.map((v) => v.id)).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test(`a11y: initial view (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { level: 1, name: "Muster" })).toBeVisible();
    await audit(page, `initial/${scheme}`);
  });

  test(`a11y: populated result + open disclosures (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/?have=case&case=rms-38-360&pick=at-i161w", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: /To fly the I161W/ })).toBeVisible();
    // Reveal the collapsed methodology + install disclosures so their contents are audited.
    await page.evaluate(() => document.querySelectorAll("details").forEach((d) => (d.open = true)));
    await expect(page.getByText(/How a reload fits a case/)).toBeVisible();
    await audit(page, `result/${scheme}`);
  });
}
