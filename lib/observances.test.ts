import { describe, it, expect } from "vitest";
import { observancesForDate, type Observance } from "./observances";

// The monthly observance bar (a thin accent rule at the top) and its footer line render on EVERY
// route, driven purely by the current month. A static export fixes the active month at build time
// and a scheduled monthly rebuild rolls it over — so a dropped month, a duplicated id, or a typo'd
// resource link would sit live until someone happened to notice. This guards that always-visible
// chrome: every month covered, ids unique, each entry complete, and every link a real https URL.

const ALL: Observance[] = Array.from({ length: 12 }, (_, m) =>
  observancesForDate(new Date(2026, m, 15)),
).flat();

describe("observancesForDate", () => {
  it("covers every month with at least one observance", () => {
    for (let m = 0; m < 12; m++) {
      expect(observancesForDate(new Date(2026, m, 15)).length, `month ${m}`).toBeGreaterThan(0);
    }
  });

  it("selects the list by calendar month", () => {
    // June carries Pride + Men's Mental Health; January is Blood Donor Month.
    expect(observancesForDate(new Date(2026, 5, 15)).map((o) => o.id)).toEqual(["pride", "mens-mental-health"]);
    expect(observancesForDate(new Date(2026, 0, 15)).map((o) => o.id)).toEqual(["blood-donor"]);
  });
});

describe("observance data integrity", () => {
  it("gives every observance a unique id (stable React keys across the bar and footer)", () => {
    const ids = ALL.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every observance an emoji and a message", () => {
    for (const o of ALL) {
      expect(o.emoji, o.id).toBeTruthy();
      expect(o.message.length, o.id).toBeGreaterThan(0);
    }
  });

  it("links only to real https resources, each with a visible label", () => {
    for (const o of ALL) {
      if (o.href) {
        expect(o.href, o.id).toMatch(/^https:\/\//);
        expect(o.hrefLabel, `${o.id} has a link but no label`).toBeTruthy();
      }
    }
  });

  it("gives every accent bar a background and a hover title", () => {
    for (const o of ALL) {
      if (o.bar) {
        expect(o.bar.background, o.id).toBeTruthy();
        expect(o.bar.title, o.id).toBeTruthy();
      }
    }
  });
});
