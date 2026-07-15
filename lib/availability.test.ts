import { describe, it, expect } from "vitest";
import { parseFeed, availabilityOf, feedKey } from "./availability";

// The availability feed is the Motor Finder's bulk JSON. The parser must be exact on well-formed data
// and safe (skip, never throw or invent a signal) on anything unexpected, and the lookup must key a
// reload the same way the Motor Finder keys its motor URLs.

describe("feedKey", () => {
  it("keys as <lowercase-manufacturer>/<designation>, matching the Motor Finder URLs", () => {
    expect(feedKey({ manufacturer: "AeroTech", designation: "I161W" })).toBe("aerotech/I161W");
    expect(feedKey({ manufacturer: "Cesaroni", designation: "123J456-15A" })).toBe("cesaroni/123J456-15A");
    expect(feedKey({ manufacturer: "Loki", designation: "H144-LW" })).toBe("loki/H144-LW");
  });
});

describe("parseFeed", () => {
  const feed = parseFeed({
    _generated: "2026-07-15T11:07:32Z",
    motors: {
      "aerotech/I161W": { vendors: 9, inStock: 4 },
      "cesaroni/123J456-15A": { vendors: 3, inStock: 0 },
      "loki/H144-LW": { vendors: 2, inStock: 2 },
      "aerotech/BAD": { vendors: "x", inStock: 1 }, // wrong type — skipped
      "aerotech/NEG": { vendors: -1, inStock: 0 }, // negative — skipped
      "aerotech/EMPTY": null, // not an object — skipped
    },
  });

  it("keeps every well-formed entry and skips malformed ones", () => {
    expect(feed.size).toBe(3);
    expect(feed.get("aerotech/I161W")).toEqual({ vendors: 9, inStock: 4 });
    expect(feed.has("aerotech/BAD")).toBe(false);
    expect(feed.has("aerotech/NEG")).toBe(false);
    expect(feed.has("aerotech/EMPTY")).toBe(false);
  });

  it("returns an empty map for anything that isn't a feed", () => {
    expect(parseFeed(null).size).toBe(0);
    expect(parseFeed("nope").size).toBe(0);
    expect(parseFeed({}).size).toBe(0);
    expect(parseFeed({ motors: "nope" }).size).toBe(0);
  });
});

describe("availabilityOf", () => {
  const feed = parseFeed({
    motors: {
      "aerotech/I161W": { vendors: 9, inStock: 4 },
      "cesaroni/123J456-15A": { vendors: 3, inStock: 0 },
      "loki/H144-LW": { vendors: 1, inStock: 1 },
    },
  });

  it("reports in-stock with the vendor count when a vendor has it", () => {
    expect(availabilityOf(feed, { manufacturer: "AeroTech", designation: "I161W" })).toEqual({
      anyInStock: true,
      inStock: 4,
      vendors: 9,
    });
  });

  it("reports out-of-stock when no vendor has it", () => {
    expect(availabilityOf(feed, { manufacturer: "Cesaroni", designation: "123J456-15A" })).toEqual({
      anyInStock: false,
      inStock: 0,
      vendors: 3,
    });
  });

  it("returns null for a reload the Motor Finder doesn't track", () => {
    expect(availabilityOf(feed, { manufacturer: "AeroTech", designation: "NOT-TRACKED" })).toBeNull();
  });
});
