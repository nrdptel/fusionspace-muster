import { describe, it, expect } from "vitest";
import { checkStockUrl, MOTOR_FINDER_URL, sourceHost, distinctSourceHosts } from "./links";
import { allReloads } from "./graph";

describe("distinctSourceHosts", () => {
  it("collapses two pages on the same domain to one labelled citation", () => {
    // The crossload case: Cesaroni's FAQ + Pro75 instructions are both pro38.com, and an AeroTech
    // announcement on facebook.com — the line should read "pro38.com, facebook.com", not repeat.
    const out = distinctSourceHosts([
      "https://pro38.com/frequently-asked-questions/",
      "https://pro38.com/wp-content/uploads/2024/11/Pro75_Instructions.pdf",
      "https://www.facebook.com/flyaerotech/posts/123",
    ]);
    expect(out.map((s) => s.host)).toEqual(["pro38.com", "facebook.com"]);
  });

  it("keeps the first URL for each host, in order", () => {
    const out = distinctSourceHosts([
      "https://pro38.com/a",
      "https://pro38.com/b",
    ]);
    expect(out).toEqual([{ host: "pro38.com", url: "https://pro38.com/a" }]);
  });

  it("passes distinct hosts through unchanged, and handles the empty list", () => {
    expect(distinctSourceHosts(["https://aerotech-rocketry.com/x", "https://apogeerockets.com/y"])).toHaveLength(2);
    expect(distinctSourceHosts([])).toEqual([]);
  });
});

describe("sourceHost", () => {
  it("strips the scheme, a leading www., and any path to a bare host label", () => {
    expect(sourceHost("https://www.aerotech-rocketry.com/products/hardware")).toBe("aerotech-rocketry.com");
    expect(sourceHost("https://www.thrustcurve.org/motors/AeroTech/I161W/")).toBe("thrustcurve.org");
  });

  it("keeps a meaningful subdomain that isn't www", () => {
    expect(sourceHost("https://pro38.com/products/")).toBe("pro38.com");
    expect(sourceHost("https://shop.aerotech-rocketry.com/x")).toBe("shop.aerotech-rocketry.com");
  });

  it("falls back to the raw string rather than throwing on a non-URL", () => {
    // A malformed source in the data must never crash a render — the label degrades, nothing more.
    expect(sourceHost("not a url")).toBe("not a url");
  });

  it("gives every hardware source in the catalog a non-empty label", () => {
    // Guards the whole graph: every sourced node renders a usable provenance link, catalog-wide.
    for (const r of allReloads()) {
      expect(sourceHost(r.tcUrl).length, `${r.designation} tcUrl host`).toBeGreaterThan(0);
    }
  });
});

describe("checkStockUrl", () => {
  it("deep-links an AeroTech reload with a lowercased manufacturer slug", () => {
    expect(checkStockUrl({ manufacturer: "AeroTech", designation: "I161W" })).toBe(
      "https://motor.fusionspace.co/motor/aerotech/I161W",
    );
  });

  it("deep-links a Cesaroni reload the same way", () => {
    expect(checkStockUrl({ manufacturer: "Cesaroni", designation: "3147K530" })).toBe(
      "https://motor.fusionspace.co/motor/cesaroni/3147K530",
    );
  });

  it("is built on the shared Motor Finder origin", () => {
    expect(checkStockUrl({ manufacturer: "AeroTech", designation: "H128W" })).toBe(
      `${MOTOR_FINDER_URL}/motor/aerotech/H128W`,
    );
  });

  it("percent-encodes a designation so an odd character can't break the URL", () => {
    // Some catalog designations carry a suffix; the path segment must stay a single, valid segment.
    expect(checkStockUrl({ manufacturer: "Cesaroni", designation: "P54-6GXL/A" })).toBe(
      "https://motor.fusionspace.co/motor/cesaroni/P54-6GXL%2FA",
    );
  });

  // The cross-link is a live integration with the sibling Motor Finder — it and Muster both key
  // off the same ThrustCurve designations. This guards the whole catalog so a future data refresh
  // can't introduce a reload whose designation silently breaks the outbound URL.
  it("produces a valid single-segment URL with a known manufacturer slug for every reload", () => {
    const slugs = new Set(["aerotech", "cesaroni", "loki"]);
    for (const r of allReloads()) {
      const u = new URL(checkStockUrl(r)); // throws if malformed
      expect(u.origin).toBe("https://motor.fusionspace.co");
      const parts = u.pathname.split("/").filter(Boolean); // ["motor", <slug>, <designation>]
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe("motor");
      expect(slugs.has(parts[1])).toBe(true);
      // The designation stays one non-empty, cleanly-encoded segment that decodes back exactly.
      expect(parts[2].length).toBeGreaterThan(0);
      expect(decodeURIComponent(parts[2])).toBe(r.designation);
    }
  });
});
