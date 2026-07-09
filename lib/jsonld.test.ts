import { describe, it, expect } from "vitest";
import { reloadJsonLd, caseJsonLd } from "./jsonld";
import { allReloads, allCases } from "./graph";
import { certLabel } from "./resolve";

const SITE = "https://muster.fusionspace.co";
const BRANDS = ["AeroTech", "Cesaroni", "Loki Research"];

// A schema.org node is only useful if it validates. These guard the invariants a rich-results
// crawler cares about — and, just as important for a safety-framed tool, that we never emit a
// price/stock Offer we don't have.
function product(graph: ReturnType<typeof reloadJsonLd>) {
  expect(graph["@context"]).toBe("https://schema.org");
  expect(Array.isArray(graph["@graph"])).toBe(true);
  const p = graph["@graph"].find((n) => n["@type"] === "Product") as Record<string, unknown>;
  const crumb = graph["@graph"].find((n) => n["@type"] === "BreadcrumbList");
  expect(p).toBeTruthy();
  expect(crumb).toBeTruthy();
  return p;
}

describe("reload structured data", () => {
  it("emits a Product mirroring the sibling shape, with no fabricated offers", () => {
    const r = allReloads().find((x) => x.propName && x.certOrg)!;
    const p = product(reloadJsonLd(r));

    expect(p["@type"]).toBe("Product");
    expect(p.sku).toBe(r.designation);
    expect(p.url).toBe(`${SITE}/reload/${r.id}`);
    expect((p.brand as { name: string }).name).toBe(
      r.manufacturer === "Loki" ? "Loki Research" : r.manufacturer,
    );
    expect(p.name).toContain(r.designation);
    // Muster has no price/stock data — a Product here must never carry an Offer.
    expect(JSON.stringify(p)).not.toMatch(/offer/i);

    const props = p.additionalProperty as { name: string; value: unknown }[];
    const byName = Object.fromEntries(props.map((x) => [x.name, x.value]));
    expect(byName["Impulse class"]).toBe(r.impulseClass);
    expect(byName["Total impulse"]).toBe(r.totImpulseNs);
    expect(byName["Certification"]).toBe(certLabel(r));
    expect(byName["Propellant"]).toBe(r.propName);
  });

  it("drops the propellant row when the reload has none", () => {
    const r = allReloads().find((x) => !x.propName);
    if (!r) return; // every reload happens to name a propellant — nothing to assert
    const p = product(reloadJsonLd(r));
    const names = (p.additionalProperty as { name: string }[]).map((x) => x.name);
    expect(names).not.toContain("Propellant");
  });

  it("holds for every reload in the catalog", () => {
    for (const r of allReloads()) {
      const p = product(reloadJsonLd(r));
      expect(p.sku).toBe(r.designation);
      expect(BRANDS).toContain((p.brand as { name: string }).name);
      expect(p.url).toBe(`${SITE}/reload/${r.id}`);
      expect(JSON.stringify(p)).not.toMatch(/offer/i);
      // No PropertyValue ever ships an empty/null value.
      for (const pv of p.additionalProperty as { value: unknown }[]) {
        expect(pv.value === null || pv.value === undefined || pv.value === "").toBe(false);
      }
    }
  });
});

describe("case structured data", () => {
  it("emits a Product with the designation as SKU and the part number as MPN", () => {
    const c = allCases().find((x) => x.partNumber)!;
    const p = product(caseJsonLd(c));

    expect(p["@type"]).toBe("Product");
    expect(p.sku).toBe(c.designation);
    expect(p.mpn).toBe(c.partNumber);
    expect(p.url).toBe(`${SITE}/case/${c.id}`);
    expect((p.brand as { name: string }).name).toBe(
      c.manufacturer === "Loki" ? "Loki Research" : c.manufacturer,
    );
    expect(JSON.stringify(p)).not.toMatch(/offer/i);

    const byName = Object.fromEntries(
      (p.additionalProperty as { name: string; value: unknown }[]).map((x) => [x.name, x.value]),
    );
    expect(byName["Diameter"]).toBe(c.diameter);
  });

  it("omits the MPN when no part number is confirmed", () => {
    const c = allCases().find((x) => !x.partNumber);
    if (!c) return;
    const p = product(caseJsonLd(c));
    expect(p.mpn).toBeUndefined();
    expect(p.sku).toBe(c.designation);
  });

  it("never ships a zero max-impulse rating, and holds for every case", () => {
    for (const c of allCases()) {
      const p = product(caseJsonLd(c));
      expect(p.sku).toBe(c.designation);
      expect(BRANDS).toContain((p.brand as { name: string }).name);
      const maxProp = (p.additionalProperty as { name: string; value: number }[]).find(
        (x) => x.name === "Maximum total impulse",
      );
      if (maxProp) expect(maxProp.value).toBeGreaterThan(0);
    }
  });
});
