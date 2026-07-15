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
  await expect(page.getByRole("radio", { name: "I have a case" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "I have a reload" })).toBeVisible();

  // The intro line is built from the catalog: it names every current system and the diameter span.
  const intro = page.getByText(/Covering .* cases and .* reloads from \d+ to \d+ mm/);
  await expect(intro).toContainText("AeroTech RMS");
  await expect(intro).toContainText("Cesaroni Pro");
  await expect(intro).toContainText("Loki Research");
  await expect(intro).toContainText("24 to 98 mm");

  expect(errors).toEqual([]);
});

test("the mode toggle is a keyboard-navigable radio group", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const caseRadio = page.getByRole("radio", { name: "I have a case" });
  const reloadRadio = page.getByRole("radio", { name: "I have a reload" });
  await expect(caseRadio).toHaveAttribute("aria-checked", "true");

  // Arrow-key from the checked radio selects the next option and moves focus with it…
  await caseRadio.focus();
  await page.keyboard.press("ArrowRight");
  await expect(reloadRadio).toHaveAttribute("aria-checked", "true");
  await expect(reloadRadio).toBeFocused();
  await expect(page.getByRole("searchbox", { name: /Search reloads/ })).toBeVisible();

  // …and back the other way.
  await page.keyboard.press("ArrowLeft");
  await expect(caseRadio).toHaveAttribute("aria-checked", "true");
});

test("case → reloads → shopping list (the core loop)", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  // Default mode is "I have a case", 38 mm. Pick the flagship 38/360 case.
  await page.getByRole("button", { name: /RMS-38\/360/ }).first().click();

  // Its direct-fit reloads render; I161W is one of them.
  await expect(page.getByRole("heading", { name: /Reloads built for this case/ })).toBeVisible();
  const i161 = page.locator("#result").getByRole("button", { name: /I161W/ }).first();
  await expect(i161).toBeVisible();

  // A selection exposes a link to its canonical, standalone page.
  await expect(page.getByRole("link", { name: /Open as a page/ })).toHaveAttribute("href", "/case/rms-38-360");

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
  // The single-use reload cross-links to the Motor Finder for where to buy it.
  await expect(list.getByRole("link", { name: /Find it in stock/ })).toHaveAttribute(
    "href",
    "https://motor.fusionspace.co/motor/aerotech/I161W",
  );

  // Every reusable part cites where it comes from — the sourcing the tool's credibility rests on,
  // and the "each part links to its source" promise made on the home page.
  const caseItem = list.locator("li", { hasText: "RMS-38/360 case" });
  await expect(caseItem.getByText(/^Sources?:/)).toBeVisible();
  await expect(caseItem.getByRole("link").first()).toHaveAttribute("href", /^https?:\/\//);

  // The selection lives in the URL, so the view is shareable.
  await expect(page).toHaveURL(/have=case/);
  await expect(page).toHaveURL(/case=rms-38-360/);
  await expect(page).toHaveURL(/pick=at-i161w/);
});

test("selecting a result is announced to assistive tech via a polite live region", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  const status = page.locator("#tool [role=status]");

  // Picking a case announces a count, not the whole list.
  await page.getByRole("button", { name: /RMS-38\/360/ }).first().click();
  await expect(status).toHaveText(/RMS-38\/360 case selected\. \d+ reloads it can fly\./);

  // Drilling into a reload announces the shopping list is ready.
  await page.locator("#result").getByRole("button", { name: /I161W/ }).first().click();
  await expect(status).toHaveText("Shopping list ready: I161W in the RMS-38/360 case.");

  // The other direction announces a case count.
  await page.getByRole("radio", { name: "I have a reload" }).click();
  await page.getByRole("searchbox", { name: /Search reloads/ }).fill("I161W");
  await page.getByRole("button", { name: /I161W/ }).first().click();
  await expect(status).toHaveText(/I161W reload selected\. \d+ cases? fly it\./);
});

test("a shared link restores the exact view", async ({ page }) => {
  await page.goto("/?have=case&case=rms-38-360&pick=at-i161w", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: /To fly the I161W/ })).toBeVisible();
  await expect(page.locator("#shopping-list").getByText("RMS-38/360 case", { exact: true })).toBeVisible();
});

test("the shopping list and the current view copy to the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?have=case&case=rms-38-360&pick=at-i161w", { waitUntil: "networkidle" });

  // Copy list → a plain-text shopping list, with the part number and the safety line intact.
  await page.locator("#shopping-list").getByRole("button", { name: "Copy list" }).click();
  await expect(page.getByRole("button", { name: "Copied ✓" })).toBeVisible();
  const listText = await page.evaluate(() => navigator.clipboard.readText());
  expect(listText).toContain("Muster — I161W in a RMS-38/360 case");
  expect(listText).toContain("38FCC"); // a reusable-part number is carried through
  expect(listText).toContain("I161W reload kit");
  expect(listText.split("\n").at(-1)).toContain("printed instructions"); // the authority line survives

  // Share this view → the current, selection-bearing URL.
  await page.getByRole("button", { name: "Share this view" }).click();
  await expect(page.getByRole("button", { name: "Link copied ✓" })).toBeVisible();
  const shared = await page.evaluate(() => navigator.clipboard.readText());
  expect(shared).toContain("case=rms-38-360");
  expect(shared).toContain("pick=at-i161w");
});

test("reload → cases, including a spacer fit that adds the adapter", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  await page.getByRole("radio", { name: "I have a reload" }).click();
  await page.getByRole("searchbox", { name: /Search reloads/ }).fill("I161W");

  // Pick the reload from the results.
  await page.getByRole("button", { name: /I161W/ }).first().click();
  await expect(page.getByRole("heading", { name: "Cases that fly it" })).toBeVisible();

  // The spec card cross-links to the Motor Finder for live stock and pricing.
  const stockLink = page.locator("#result").getByRole("link", { name: /Find it in stock/ });
  await expect(stockLink).toHaveAttribute(
    "href",
    "https://motor.fusionspace.co/motor/aerotech/I161W",
  );
  await expect(stockLink).toHaveAttribute("target", "_blank");

  // …and to ThrustCurve for the motor's own specs and thrust curve (provenance).
  await expect(page.locator("#result").getByRole("link", { name: /View on ThrustCurve/ })).toHaveAttribute(
    "href",
    "https://www.thrustcurve.org/motors/AeroTech/I161W/",
  );

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
  await page.getByRole("radio", { name: "Cesaroni Pro" }).click();

  // Pick a Pro38 3-grain case (the picker grid button; the kit planner also lists it, so first()).
  await page.getByRole("button", { name: /Pro38-3G/ }).first().click();
  await expect(page.getByRole("heading", { name: /Reloads built for this case/ })).toBeVisible();

  // Cesaroni's spacer rule resolves: a 3G case also flies 2G/1G reloads with spacers.
  await expect(page.locator("#result").getByText(/Also flies with spacers/)).toBeVisible();
  // Pro38 reuses only the case — both closures ship in the reload.
  await expect(page.locator("#result").getByText(/The reload includes its closures/)).toBeVisible();

  // Drill into the first (native) reload → the shopping list uses Cesaroni's cartridge wording.
  await page.locator("#result").getByRole("button", { name: /avg/ }).first().click();
  const list = page.locator("#shopping-list");
  await expect(list.getByText(/reload cartridge/)).toBeVisible();
  await expect(list.getByText("Pro38-3G case", { exact: true })).toBeVisible();
});

test("Loki Research: system toggle → case → native-only shopping list with both closures reusable", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  // Switch the case picker to the Loki Research system, then the 76 mm diameter.
  await page.getByRole("radio", { name: "Loki Research" }).click();
  await page.getByRole("radio", { name: "76 mm", exact: true }).first().click();

  // Pick a 76 mm Loki case (its designation is diameter/impulse, e.g. 76/6000).
  await page.getByRole("button", { name: /76\/6000/ }).first().click();
  await expect(page.getByRole("heading", { name: /Reloads built for this case/ })).toBeVisible();

  // Loki publishes no spacer system — there is no "Also flies with spacers" section.
  await expect(page.locator("#result").getByText(/Also flies with spacers/)).toHaveCount(0);

  // Drill into the first reload → the shopping list reuses BOTH closures (bulkhead + nozzle).
  await page.locator("#result").getByRole("button", { name: /avg/ }).first().click();
  const list = page.locator("#shopping-list");
  await expect(list.getByText(/76 mm forward bulkhead/)).toBeVisible();
  await expect(list.getByText(/76 mm graphite nozzle/)).toBeVisible();
  await expect(list.getByText(/reload kit/)).toBeVisible();
  // The cross-link to the Motor Finder works for Loki too (lowercase manufacturer slug).
  await expect(list.getByRole("link", { name: /Find it in stock/ })).toHaveAttribute(
    "href",
    /motor\.fusionspace\.co\/motor\/loki\//,
  );
});

test("deep-linked case page: static content, cross-links to reloads, and a CTA into the tool", async ({ page }) => {
  await page.goto("/case/rms-38-360", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: "RMS-38/360" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Reloads built for this case/ })).toBeVisible();

  // Structured data: the case is a Product (mirroring the Motor Finder), with its designation as
  // the SKU — and, since Muster has no price data, carrying no Offer.
  const caseLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(caseLd).toContain('"@type":"Product"');
  expect(caseLd).toContain('"sku":"RMS-38/360"');
  expect(caseLd?.toLowerCase()).not.toContain("offer");
  // …and an ItemList of the reloads it flies, linking to their pages.
  expect(caseLd).toContain('"@type":"ItemList"');
  expect(caseLd).toContain('/reload/at-i161w');

  // A reload it flies links to that reload's own page.
  const reloadLink = page.getByRole("link", { name: /I161W/ }).first();
  await expect(reloadLink).toHaveAttribute("href", "/reload/at-i161w");

  // The CTA opens the interactive tool with this case pre-selected.
  await page.getByRole("link", { name: /Open in the interactive tool/ }).click();
  await expect(page).toHaveURL(/have=case&case=rms-38-360/);
  await expect(page.getByRole("heading", { name: /Reloads built for this case/ })).toBeVisible();
});

test("deep-linked reload page: cases that fly it link back, plus the stock cross-link", async ({ page }) => {
  await page.goto("/reload/at-i161w", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { level: 1, name: "I161W" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Cases that fly it" })).toBeVisible();

  // Structured data: the reload is a Product, keyed by designation, with no fabricated Offer.
  const reloadLd = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(reloadLd).toContain('"@type":"Product"');
  expect(reloadLd).toContain('"sku":"I161W"');
  expect(reloadLd?.toLowerCase()).not.toContain("offer");
  // …and an ItemList of the cases that fly it, linking to their pages.
  expect(reloadLd).toContain('"@type":"ItemList"');
  expect(reloadLd).toContain('/case/rms-38-360');

  // The page answers "what to buy" on its own: the reusable hardware + the reload kit.
  await expect(page.getByRole("heading", { name: "What you need to fly it" })).toBeVisible();
  const need = page.locator("section", { has: page.getByRole("heading", { name: "What you need to fly it" }) });
  await expect(need.getByText("RMS-38/360 case", { exact: true })).toBeVisible();
  await expect(need.getByText(/forward closure/)).toBeVisible();
  await expect(need.getByText(/I161W reload kit/)).toBeVisible();

  // Its own case links to that case's page.
  await expect(page.getByRole("link", { name: /RMS-38\/360/ }).first()).toHaveAttribute("href", "/case/rms-38-360");
  // The Motor Finder cross-link is present with the right target.
  await expect(page.getByRole("link", { name: /Find it in stock/ })).toHaveAttribute(
    "href",
    "https://motor.fusionspace.co/motor/aerotech/I161W",
  );
  // The ThrustCurve provenance link points at this motor's own catalog page.
  await expect(page.getByRole("link", { name: /View on ThrustCurve/ })).toHaveAttribute(
    "href",
    "https://www.thrustcurve.org/motors/AeroTech/I161W/",
  );
});

test("cross-brand crossload shows on a 98 mm case page, framed as a caution with the advisory", async ({ page }) => {
  await page.goto("/case/rms-98-5120", { waitUntil: "domcontentloaded" });
  const section = page.locator("section", { has: page.getByRole("heading", { name: /Cross-brand crossload/ }) });
  await expect(section).toBeVisible();
  // Lists a foreign (Cesaroni) reload linking to that reload's page…
  await expect(section.getByRole("link").first()).toHaveAttribute("href", /\/reload\/cti-/);
  // …and carries AeroTech's advisory-against note for this direction, plus a source.
  await expect(section.getByText(/AeroTech recommends against|forward seal disc/)).toBeVisible();
  await expect(section.getByRole("link", { name: /pro38\.com/ }).first()).toBeVisible();
});

test("cross-brand crossload shows on a reload page, pointing at the foreign case", async ({ page }) => {
  await page.goto("/reload/cti-4807l3150-p", { waitUntil: "domcontentloaded" });
  const section = page.locator("section", { has: page.getByRole("heading", { name: /Also flies cross-brand/ }) });
  await expect(section).toBeVisible();
  await expect(section.getByRole("link", { name: /RMS-98\/5120/ })).toHaveAttribute("href", "/case/rms-98-5120");
});

test("a busy case's reloads can be filtered and sorted", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /RMS-38\/360/ }).first().click();
  await expect(page.getByRole("heading", { name: /Reloads built for this case/ })).toBeVisible();

  const result = page.locator("#result");
  const rows = result.getByRole("button", { name: /·.*avg/ });
  const before = await rows.count();
  expect(before).toBeGreaterThan(4);

  // Narrowing by propellant reduces the list and switches the count to an "X of Y" label.
  await result.getByRole("combobox", { name: /Filter by propellant/ }).selectOption("White Lightning");
  await expect(result.getByText(/\d+ of \d+/).first()).toBeVisible();
  expect(await rows.count()).toBeLessThan(before);

  // Sorting by thrust keeps the (filtered) list populated.
  await result.getByRole("radio", { name: "Thrust" }).click();
  expect(await rows.count()).toBeGreaterThan(0);
});

test("AeroTech 75 mm: a large-motor case → reloads → shopping list with a seal disc", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  // Default system is AeroTech RMS; switch the diameter filter to 75 mm.
  await page.getByRole("radio", { name: "75 mm", exact: true }).first().click();
  await page.getByRole("button", { name: /RMS-75\/5120/ }).first().click();
  await expect(page.getByRole("heading", { name: /Reloads built for this case/ })).toBeVisible();

  // Drill into the first reload → the list carries the case, both closures, and the seal disc.
  await page.locator("#result").getByRole("button", { name: /avg/ }).first().click();
  const list = page.locator("#shopping-list");
  await expect(list.getByText(/75 mm forward closure/)).toBeVisible();
  await expect(list.getByText("75 mm forward seal disc", { exact: true })).toBeVisible();
});

test("a plugged reload is flagged as electronic-deployment only", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: "I have a reload" }).click();
  // H999N (38/360, Warp 9) is plugged — no ejection charge.
  await page.getByRole("searchbox", { name: /Search reloads/ }).fill("H999N");
  await page.getByRole("button", { name: /H999N/ }).first().click();
  await expect(page.getByText("Plugged", { exact: true }).first()).toBeVisible();
  await page.locator("#result").getByRole("button", { name: /RMS-38\/360/ }).first().click();
  await expect(
    page.locator("#shopping-list").getByText(/electronic deployment/),
  ).toBeVisible();
});

test("a sparky reload warns about field restrictions in the shopping list", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: "I have a reload" }).click();
  // H170M (38/360, Metalstorm) is sparky — metal-loaded, restricted at many fields for fire risk.
  await page.getByRole("searchbox", { name: /Search reloads/ }).fill("H170M");
  await page.getByRole("button", { name: /H170M/ }).first().click();
  await expect(page.getByText("Sparky", { exact: true }).first()).toBeVisible();
  await page.locator("#result").getByRole("button", { name: /RMS-38\/360/ }).first().click();
  // The load-bearing safety note — not just the badge — reaches the shopping list.
  await expect(
    page.locator("#shopping-list").getByText(/many ranges restrict these/i),
  ).toBeVisible();
});

test("the reload picker lists search results in ascending impulse order", async ({ page }) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: "I have a reload" }).click();
  // Default view is AeroTech, 38 mm — a broad spread of impulse classes, no selection yet, so the
  // only "N·s" rows on the page are the picker's results.
  const rows = await page.locator('#tool button:has-text("N·s")').allInnerTexts();
  expect(rows.length).toBeGreaterThan(5);
  const impulses = rows.map((t) => {
    const m = t.match(/([\d.]+)\s*N·s/);
    return m ? Number.parseFloat(m[1]) : NaN;
  });
  expect(impulses.every((n) => Number.isFinite(n))).toBe(true);
  // Rendered order must already be sorted ascending.
  expect(impulses).toEqual([...impulses].sort((a, b) => a - b));
});
