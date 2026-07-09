import { describe, it, expect } from "vitest";
import { applyFilter, propellantsOf, isNarrowing, byImpulse, DEFAULT_FILTER } from "./filter";
import type { ReloadFit } from "./resolve";
import type { Reload } from "./data/types";

function reload(over: Partial<Reload>): Reload {
  return {
    id: over.id ?? "r",
    designation: over.designation ?? "H100W",
    commonName: "H100",
    manufacturer: "AeroTech",
    system: "RMS",
    impulseClass: "H",
    diameter: 38,
    caseInfo: "RMS-38/240",
    avgThrustN: over.avgThrustN ?? 100,
    totImpulseNs: over.totImpulseNs ?? 200,
    propName: over.propName ?? "White Lightning",
    sparky: false,
    delays: "6,10,14",
    delayAdjustable: false,
    plugged: false,
    ejectionCharge: true,
    availability: over.availability ?? "regular",
    certOrg: "TRA",
    motorId: "x",
    tcUrl: "https://www.thrustcurve.org/",
  };
}
const fit = (r: Reload): ReloadFit => ({ reload: r, fit: "native", spacers: 0 });

const fits: ReloadFit[] = [
  fit(reload({ id: "a", designation: "H90R", propName: "Redline", totImpulseNs: 180, avgThrustN: 90 })),
  fit(reload({ id: "b", designation: "H120W", propName: "White Lightning", totImpulseNs: 240, avgThrustN: 120 })),
  fit(reload({ id: "c", designation: "H70W", propName: "White Lightning", totImpulseNs: 160, avgThrustN: 70, availability: "OOP" })),
];

describe("propellantsOf", () => {
  it("returns the distinct propellants, sorted", () => {
    expect(propellantsOf(fits)).toEqual(["Redline", "White Lightning"]);
  });
});

describe("applyFilter", () => {
  it("sorts by impulse ascending by default", () => {
    const out = applyFilter(fits, DEFAULT_FILTER);
    expect(out.map((f) => f.reload.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts by average thrust when asked", () => {
    const out = applyFilter(fits, { ...DEFAULT_FILTER, sort: "thrust" });
    expect(out.map((f) => f.reload.avgThrustN)).toEqual([70, 90, 120]);
  });

  it("filters by propellant", () => {
    const out = applyFilter(fits, { ...DEFAULT_FILTER, propellant: "White Lightning" });
    expect(out.map((f) => f.reload.id).sort()).toEqual(["b", "c"]);
  });

  it("hides out-of-production reloads when asked", () => {
    const out = applyFilter(fits, { ...DEFAULT_FILTER, inProductionOnly: true });
    expect(out.every((f) => f.reload.availability !== "OOP")).toBe(true);
    expect(out.some((f) => f.reload.id === "c")).toBe(false);
  });

  it("does not mutate the input", () => {
    const before = fits.map((f) => f.reload.id);
    applyFilter(fits, { ...DEFAULT_FILTER, sort: "thrust", propellant: "Redline" });
    expect(fits.map((f) => f.reload.id)).toEqual(before);
  });
});

describe("isNarrowing", () => {
  it("is false for the default and true once a filter is set", () => {
    expect(isNarrowing(DEFAULT_FILTER)).toBe(false);
    expect(isNarrowing({ ...DEFAULT_FILTER, propellant: "Redline" })).toBe(true);
    expect(isNarrowing({ ...DEFAULT_FILTER, inProductionOnly: true })).toBe(true);
  });
});

describe("byImpulse", () => {
  it("orders reloads by ascending total impulse, designation as a stable tiebreak", () => {
    const out = byImpulse([
      reload({ designation: "K200", totImpulseNs: 2000 }),
      reload({ designation: "H80", totImpulseNs: 200 }),
      reload({ designation: "H50", totImpulseNs: 200 }),
    ]);
    // 200 (H50 < H80 by designation), then 2000.
    expect(out.map((r) => r.designation)).toEqual(["H50", "H80", "K200"]);
  });

  it("does not mutate the input", () => {
    const input = [reload({ designation: "B", totImpulseNs: 300 }), reload({ designation: "A", totImpulseNs: 100 })];
    byImpulse(input);
    expect(input.map((r) => r.designation)).toEqual(["B", "A"]);
  });
});
