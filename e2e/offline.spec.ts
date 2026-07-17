import { test, expect } from "@playwright/test";

// Muster's headline promise is that it works offline — "at a remote field or a vendor's booth with no
// signal." The whole hardware graph ships with the page and a service worker (public/sw.js) caches the
// app shell, so once loaded online the tool keeps working with the network cut. That's the core use
// case, and until now nothing guarded it: a service-worker regression, a cache-name slip, or a change
// in the build output could silently break offline and no test would notice.
//
// This drives the real thing — load online so the worker installs and takes control, cut the network
// completely, then confirm the shell still renders AND the tool still resolves a compatibility result
// (all client-side over the bundled graph, no request leaves the page).

test("works offline once loaded: the tool still resolves with the network cut", async ({ page, context }) => {
  await page.goto("/", { waitUntil: "networkidle" });

  // Wait for the service worker to install and take control of this page.
  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), null, { timeout: 15_000 });
  // A controlled reload guarantees the shell is served from — and cached by — the worker.
  await page.reload({ waitUntil: "networkidle" });
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker?.controller))).toBe(true);

  // Cut the network entirely, then reload from cache.
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });

    // The app shell renders from the cache…
    await expect(page.getByRole("heading", { name: "Muster", level: 1 })).toBeVisible();

    // …and the tool is fully usable offline: pick a case and get a resolved reload list, computed
    // client-side over the bundled graph with no network at all.
    await page.getByRole("button", { name: /RMS-38\/360/ }).first().click();
    await expect(page.getByRole("heading", { name: /Reloads built for this case/ })).toBeVisible();
    await expect(page.locator("#result").getByRole("button", { name: /I161W/ }).first()).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
