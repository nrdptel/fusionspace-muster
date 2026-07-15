import { describe, it, expect } from "vitest";
import reloadsDoc from "./reloads.json";
import type { Reload } from "./types";

// The reload catalog is a hand-refreshed static mirror of ThrustCurve — the single largest body of
// safety-critical data in Muster, and the one thing imported as untyped JSON, so TypeScript never
// checks it. This is the mirror's own integrity contract: every row faithfully structured, its
// provenance links resolvable, its ids derivable. It does NOT re-fetch — it holds what's committed
// to the shape the fetch is meant to produce, so a slip on the next manual refresh (a fat-fingered
// ThrustCurve URL, a duplicated motor id, a mis-slugged id that breaks a /reload/<id> deep link, an
// out-of-domain enum the JSON cast would hide) fails CI instead of shipping. The merged-graph safety
// contract (lib/validate.ts) guards the compatibility edges; this guards the source data itself.

const doc = reloadsDoc as {
  _source: string;
  _sourceUrl: string;
  _note: string;
  _fetched: string;
  reloads: Reload[];
};
const RELOADS = doc.reloads;

// The deterministic id/URL scheme the mirror follows: "<prefix>-<slug(designation)>", and the
// motor's own ThrustCurve page. Kept here so a refresh that diverges from the scheme is caught.
const ID_PREFIX: Record<Reload["manufacturer"], string> = { AeroTech: "at", Cesaroni: "cti", Loki: "loki" };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const MANUFACTURERS = new Set<Reload["manufacturer"]>(["AeroTech", "Cesaroni", "Loki"]);
const DIAMETERS = new Set([24, 29, 38, 54, 75, 76, 98]);
const AVAILABILITY = new Set(["regular", "OOP"]);
const CERT_ORGS = new Set(["NAR", "TRA", "CAR", null]);

describe("reloads mirror — provenance header", () => {
  it("credits ThrustCurve as the source", () => {
    expect(doc._source).toMatch(/ThrustCurve/);
    expect(doc._sourceUrl).toBe("https://www.thrustcurve.org");
    expect(doc._note).toBeTruthy();
  });

  it("records a well-formed ISO fetch date", () => {
    expect(doc._fetched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(doc._fetched))).toBe(false);
  });

  it("carries a non-trivial catalog", () => {
    expect(RELOADS.length).toBeGreaterThan(500);
  });
});

describe("reloads mirror — deterministic ids and provenance links", () => {
  it("derives every id as <prefix>-<slug(designation)>, unique across the catalog", () => {
    // The id IS the /reload/<id> deep-link slug, so it must be derivable and collision-free.
    const seen = new Set<string>();
    for (const r of RELOADS) {
      const prefix = ID_PREFIX[r.manufacturer];
      expect(prefix, `no id prefix for ${r.manufacturer}`).toBeTruthy();
      expect(r.id, `${r.designation} id`).toBe(`${prefix}-${slug(r.designation)}`);
      expect(seen.has(r.id), `duplicate id ${r.id}`).toBe(false);
      seen.add(r.id);
    }
  });

  it("points every tcUrl at that motor's own ThrustCurve page", () => {
    // The "View on ThrustCurve" provenance link — a wrong one sends a flyer to the wrong specs.
    for (const r of RELOADS) {
      expect(r.tcUrl).toBe(`https://www.thrustcurve.org/motors/${r.manufacturer}/${r.designation}/`);
    }
  });

  it("carries a unique ThrustCurve motor id on every reload", () => {
    const seen = new Set<string>();
    for (const r of RELOADS) {
      expect(r.motorId, `${r.designation} motorId`).toBeTruthy();
      expect(seen.has(r.motorId), `duplicate motorId ${r.motorId}`).toBe(false);
      seen.add(r.motorId);
    }
  });
});

describe("reloads mirror — field domains (the JSON is cast, not type-checked)", () => {
  it("keeps every enumerated field inside its type's domain", () => {
    for (const r of RELOADS) {
      expect(MANUFACTURERS.has(r.manufacturer), `${r.designation} manufacturer ${r.manufacturer}`).toBe(true);
      expect(DIAMETERS.has(r.diameter), `${r.designation} diameter ${r.diameter}`).toBe(true);
      expect(AVAILABILITY.has(r.availability), `${r.designation} availability ${r.availability}`).toBe(true);
      expect(CERT_ORGS.has(r.certOrg), `${r.designation} certOrg ${r.certOrg}`).toBe(true);
    }
  });

  it("labels each reload with an impulse class A–O that appears in its designation", () => {
    for (const r of RELOADS) {
      expect(r.impulseClass, `${r.designation} class`).toMatch(/^[A-O]$/);
      expect(
        r.designation.toLowerCase(),
        `${r.designation} does not contain its class ${r.impulseClass}`,
      ).toContain(r.impulseClass.toLowerCase());
    }
  });

  it("has positive impulse and thrust and non-empty names", () => {
    for (const r of RELOADS) {
      expect(r.totImpulseNs, `${r.designation} totImpulseNs`).toBeGreaterThan(0);
      expect(r.avgThrustN, `${r.designation} avgThrustN`).toBeGreaterThan(0);
      expect(r.designation.length, "empty designation").toBeGreaterThan(0);
      expect(r.commonName.length, `${r.designation} empty commonName`).toBeGreaterThan(0);
    }
  });
});

describe("reloads mirror — physical dimensions (optional, from ThrustCurve)", () => {
  // length / loaded weight / propellant weight are the fit-and-fly aid: each is optional, mirrored
  // only when ThrustCurve carries it, and never inferred. These guard that a refresh can't ship a
  // garbage figure (a negative length, a propellant heavier than the loaded motor it sits inside)
  // or silently drop the coverage the UI leans on.
  it("keeps every present physical field a positive number", () => {
    for (const r of RELOADS) {
      for (const field of ["lengthMm", "totalWeightG", "propWeightG"] as const) {
        const v = r[field];
        if (v != null) {
          expect(typeof v, `${r.designation} ${field} type`).toBe("number");
          expect(Number.isFinite(v), `${r.designation} ${field} finite`).toBe(true);
          expect(v, `${r.designation} ${field}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it("never lists propellant heavier than the loaded motor it sits inside", () => {
    // Propellant is a subset of the loaded weight; propWeightG > totalWeightG is physically
    // impossible and signals a mis-joined row (the one such point, 25E75-17A, is dropped upstream).
    for (const r of RELOADS) {
      if (r.propWeightG != null && r.totalWeightG != null) {
        expect(r.propWeightG, `${r.designation} propWeightG > totalWeightG`).toBeLessThanOrEqual(r.totalWeightG);
      }
    }
  });

  it("carries assembled length on the vast majority of the catalog", () => {
    // ThrustCurve lists a length for essentially every motor; the UI's dimensions row leans on it.
    // A refresh that silently dropped the field (a renamed key, a bad join) would crater this.
    const withLength = RELOADS.filter((r) => r.lengthMm != null).length;
    expect(withLength / RELOADS.length).toBeGreaterThan(0.9);
  });
});
