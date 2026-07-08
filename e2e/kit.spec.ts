import { test, expect } from "@playwright/test";

test("kit planner: coverage grows with owned hardware, and persists", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  const kit = page.locator("#kit");
  await expect(kit.getByRole("heading", { name: "Plan your kit" })).toBeVisible();
  await expect(kit.getByText(/Select the cases and adapters you own/)).toBeVisible();

  // Own a 38/360 case → it flies its 11 direct-fit reloads.
  await kit.getByRole("button", { name: /RMS-38\/360/ }).click();
  await expect(kit.getByText("Your kit flies")).toBeVisible();
  await expect(kit.getByText(/11\s*reloads/)).toBeVisible();

  // Add the 38RAS adapter → the 38/240 and 38/120 spacer fits become flyable (11 + 6 + 4 = 21).
  await kit.getByRole("button", { name: /38RAS/ }).click();
  await expect(kit.getByText(/21\s*reloads/)).toBeVisible();

  // It suggests the next purchase.
  await expect(kit.getByRole("heading", { name: "Unlock more" })).toBeVisible();

  // Persists across a reload (localStorage).
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("#kit").getByText(/21\s*reloads/)).toBeVisible();

  // Clear resets to the empty state.
  await page.locator("#kit").getByRole("button", { name: "Clear" }).click();
  await expect(page.locator("#kit").getByText(/Select the cases and adapters you own/)).toBeVisible();
});
