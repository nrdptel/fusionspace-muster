import { test, expect } from "@playwright/test";

test("home loads cleanly and the header + safety note render", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/", { waitUntil: "networkidle" });

  await expect(page.getByRole("heading", { level: 1, name: "Muster" })).toBeVisible();
  // Safety is the headline, not the fine print.
  await expect(page.getByText("Muster is a shopping aid, not an assembly guide.")).toBeVisible();
  // The two directions are offered up front.
  await expect(page.getByRole("button", { name: "I have a case" })).toBeVisible();
  await expect(page.getByRole("button", { name: "I have a reload" })).toBeVisible();

  expect(errors).toEqual([]);
});

test("case → reloads → shopping list (the core loop)", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  // Default mode is "I have a case", 38 mm. Pick the flagship 38/360 case.
  await page.getByRole("button", { name: /RMS-38\/360/ }).first().click();

  // Its direct-fit reloads render; I161W is one of them.
  await expect(page.getByRole("heading", { name: /Reloads built for this case/ })).toBeVisible();
  const i161 = page.locator("#result").getByRole("button", { name: /I161W/ }).first();
  await expect(i161).toBeVisible();

  // The longer case's spacer fits are advertised via the 38RAS.
  await expect(page.getByText(/Also flies with spacers/)).toBeVisible();
  await expect(page.getByText(/38RAS/).first()).toBeVisible();

  // Drill into a reload → the shopping list appears with the case + closures.
  await i161.click();
  await expect(page.getByRole("heading", { name: /To fly the I161W/ })).toBeVisible();
  const list = page.locator("#shopping-list");
  await expect(list.getByText("RMS-38/360 case", { exact: true })).toBeVisible();
  await expect(list.getByText(/forward closure/)).toBeVisible();
  await expect(list.getByText(/aft closure/)).toBeVisible();
  await expect(list.getByText(/I161W reload kit/)).toBeVisible();

  // The selection lives in the URL, so the view is shareable.
  await expect(page).toHaveURL(/have=case/);
  await expect(page).toHaveURL(/case=rms-38-360/);
  await expect(page).toHaveURL(/pick=at-i161w/);
});

test("a shared link restores the exact view", async ({ page }) => {
  await page.goto("/?have=case&case=rms-38-360&pick=at-i161w", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /To fly the I161W/ })).toBeVisible();
  await expect(page.locator("#shopping-list").getByText("RMS-38/360 case", { exact: true })).toBeVisible();
});

test("reload → cases, including a spacer fit that adds the adapter", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await page.getByRole("button", { name: "I have a reload" }).click();
  await page.getByRole("searchbox", { name: /Search reloads/ }).fill("I161W");

  // Pick the reload from the results.
  await page.getByRole("button", { name: /I161W/ }).first().click();
  await expect(page.getByRole("heading", { name: "Cases that fly it" })).toBeVisible();

  // Its own case is a direct fit; a longer case reaches it with spacers.
  const result = page.locator("#result");
  await expect(result.getByRole("button", { name: /RMS-38\/360/ })).toBeVisible();
  const bigger = result.getByRole("button", { name: /RMS-38\/480/ });
  await expect(bigger).toBeVisible();

  // Choosing the bigger case pulls the 38RAS adapter into the list, with a spacer note.
  await bigger.click();
  const list = page.locator("#shopping-list");
  await expect(list.getByText(/Reload Adapter System/)).toBeVisible();
  await expect(list.getByText(/spacer/i).first()).toBeVisible();
});

test("Cesaroni Pro: system toggle → case → cartridge shopping list", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  // Switch the case picker to the Cesaroni Pro system.
  await page.getByRole("button", { name: "Cesaroni Pro" }).click();

  // Pick a Pro38 3-grain case (the picker grid button; the kit planner also lists it, so first()).
  await page.getByRole("button", { name: /Pro38-3G/ }).first().click();
  await expect(page.getByRole("heading", { name: /Reloads built for this case/ })).toBeVisible();

  // Cesaroni's spacer rule resolves: a 3G case also flies 2G/1G reloads with spacers.
  await expect(page.locator("#result").getByText(/Also flies with spacers/)).toBeVisible();
  // Pro38 reuses only the case — both closures ship in the reload.
  await expect(page.locator("#result").getByText(/The reload includes its closures/)).toBeVisible();

  // Drill into the first (native) reload → the shopping list uses Cesaroni's cartridge wording.
  await page.locator("#result").getByRole("button").first().click();
  const list = page.locator("#shopping-list");
  await expect(list.getByText(/reload cartridge/)).toBeVisible();
  await expect(list.getByText("Pro38-3G case", { exact: true })).toBeVisible();
});

test("AeroTech 75 mm: a large-motor case → reloads → shopping list with a seal disc", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  // Default system is AeroTech RMS; switch the diameter filter to 75 mm.
  await page.getByRole("button", { name: "75 mm", exact: true }).first().click();
  await page.getByRole("button", { name: /RMS-75\/5120/ }).first().click();
  await expect(page.getByRole("heading", { name: /Reloads built for this case/ })).toBeVisible();

  // Drill into the first reload → the list carries the case, both closures, and the seal disc.
  await page.locator("#result").getByRole("button").first().click();
  const list = page.locator("#shopping-list");
  await expect(list.getByText(/75 mm forward closure/)).toBeVisible();
  await expect(list.getByText("75 mm forward seal disc", { exact: true })).toBeVisible();
});

test("a plugged reload is flagged as electronic-deployment only", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "I have a reload" }).click();
  // H999N (38/360, Warp 9) is plugged — no ejection charge.
  await page.getByRole("searchbox", { name: /Search reloads/ }).fill("H999N");
  await page.getByRole("button", { name: /H999N/ }).first().click();
  await expect(page.getByText("Plugged", { exact: true }).first()).toBeVisible();
  await page.locator("#result").getByRole("button", { name: /RMS-38\/360/ }).first().click();
  await expect(
    page.locator("#shopping-list").getByText(/electronic deployment/),
  ).toBeVisible();
});
