import { describe, it, expect } from "vitest";
import { checkStockUrl, MOTOR_FINDER_URL } from "./links";
import { allReloads } from "./graph";

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
