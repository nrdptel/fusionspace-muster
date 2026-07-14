import { describe, it, expect } from "vitest";
import { extractAvailability } from "./availability";

// The parser reads the Motor Finder's per-motor schema.org JSON-LD. It must be exact on well-formed
// data and safe (null, never a throw or a wrong signal) on anything unexpected, because a wrong
// "in stock" would mislead and a throw would break the effect calling it.

const page = (jsonLd: string) =>
  `<!doctype html><html><head><script type="application/ld+json">${jsonLd}</script></head><body></body></html>`;

const offer = (avail: string) => `{"@type":"Offer","availability":"https://schema.org/${avail}"}`;

describe("extractAvailability — per-vendor offers", () => {
  it("counts in-stock vendors from the individual offers", () => {
    const html = page(
      `{"@type":"Product","offers":{"@type":"AggregateOffer","offerCount":4,"availability":"https://schema.org/InStock",` +
        `"offers":[${offer("InStock")},${offer("OutOfStock")},${offer("InStock")},${offer("OutOfStock")}]}}`,
    );
    expect(extractAvailability(html)).toEqual({ anyInStock: true, inStock: 2, vendors: 4 });
  });

  it("reports out-of-stock-everywhere when no vendor has it", () => {
    const html = page(
      `{"@type":"AggregateOffer","offerCount":2,"availability":"https://schema.org/OutOfStock",` +
        `"offers":[${offer("OutOfStock")},${offer("OutOfStock")}]}`,
    );
    expect(extractAvailability(html)).toEqual({ anyInStock: false, inStock: 0, vendors: 2 });
  });
});

describe("extractAvailability — aggregate-only fallback", () => {
  it("uses the AggregateOffer summary when there is no per-vendor breakdown", () => {
    const html = page(`{"@type":"AggregateOffer","offerCount":7,"availability":"https://schema.org/InStock"}`);
    expect(extractAvailability(html)).toEqual({ anyInStock: true, inStock: null, vendors: 7 });
  });

  it("treats a zero/empty aggregate as no data", () => {
    expect(extractAvailability(page(`{"@type":"AggregateOffer","offerCount":0}`))).toBeNull();
  });
});

describe("extractAvailability — tolerant of anything unexpected", () => {
  it("returns null with no JSON-LD block", () => {
    expect(extractAvailability("<html><body>no data</body></html>")).toBeNull();
  });

  it("returns null on invalid JSON", () => {
    expect(extractAvailability(page("{ not json"))).toBeNull();
  });

  it("returns null when there are no offers at all", () => {
    expect(extractAvailability(page(`{"@type":"Product","name":"I161W"}`))).toBeNull();
  });

  it("does not mistake OutOfStock for in stock", () => {
    const html = page(`{"@type":"Product","offers":[${offer("OutOfStock")}]}`);
    expect(extractAvailability(html)).toEqual({ anyInStock: false, inStock: 0, vendors: 1 });
  });
});

describe("extractAvailability — the real Motor Finder page shape", () => {
  // A faithful reproduction of a live per-motor page's JSON-LD: a Product with a Brand, an
  // AggregateOffer carrying prices, and per-vendor Offers each with a price and an Organization
  // seller. The recursive walk must find the offers through that nesting and among the other node
  // types, and ignore the price fields — this guards it against the actual structure, not just the
  // stripped-down fixtures above. Mirrors the AeroTech I161W page (9 vendors, 4 in stock) verified live.
  const sellerOffer = (price: string, avail: string, seller: string) =>
    `{"@type":"Offer","price":"${price}","priceCurrency":"USD",` +
    `"availability":"https://schema.org/${avail}","seller":{"@type":"Organization","name":"${seller}"}}`;

  const realShape = page(
    `{"@context":"https://schema.org","@type":"Product","name":"AeroTech I161W","sku":"I161W",` +
      `"brand":{"@type":"Brand","name":"AeroTech"},` +
      `"offers":{"@type":"AggregateOffer","lowPrice":"45.00","highPrice":"69.49","offerCount":9,` +
      `"priceCurrency":"USD","availability":"https://schema.org/InStock","offers":[` +
      [
        sellerOffer("55.79", "InStock", "Balsa Machining Service"),
        sellerOffer("58.89", "InStock", "BuyRocketMotors.com"),
        sellerOffer("69.49", "OutOfStock", "AeroTech (direct)"),
        sellerOffer("69.49", "InStock", "Wildman Rocketry"),
        sellerOffer("61.99", "OutOfStock", "Performance Hobbies"),
        sellerOffer("61.99", "OutOfStock", "Animal Motor Works"),
        sellerOffer("61.99", "InStock", "Chris' Rocket Supplies"),
        sellerOffer("45.00", "OutOfStock", "Moto-Joe Rocketry"),
        sellerOffer("60.46", "OutOfStock", "Sirius Rocketry"),
      ].join(",") +
      `]}}`,
  );

  it("counts vendors and in-stock through the full nesting, ignoring prices and other node types", () => {
    expect(extractAvailability(realShape)).toEqual({ anyInStock: true, inStock: 4, vendors: 9 });
  });
});
