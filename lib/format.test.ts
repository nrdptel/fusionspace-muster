import { describe, it, expect } from "vitest";
import { formatImpulse, formatThrust, formatDelays, motorLabel, propLabel } from "./format";
import type { Reload } from "./data/types";

const base: Reload = {
  id: "at-h128w",
  designation: "H128W",
  commonName: "H128",
  impulseClass: "H",
  diameter: 38,
  caseInfo: "RMS-38/240",
  avgThrustN: 128,
  totImpulseNs: 240,
  propName: "White Lightning",
  sparky: false,
  delays: "6,10,14",
  delayAdjustable: false,
  plugged: false,
  ejectionCharge: true,
  availability: "regular",
  certOrg: "TRA",
  motorId: "x",
  tcUrl: "https://www.thrustcurve.org/motors/AeroTech/H128W/",
};

describe("formatImpulse", () => {
  it("rounds whole newton-seconds", () => {
    expect(formatImpulse(351.4)).toBe("351 N·s");
  });
  it("keeps one decimal for small motors", () => {
    expect(formatImpulse(8.75)).toBe("8.8 N·s");
  });
});

describe("formatThrust", () => {
  it("rounds newtons", () => {
    expect(formatThrust(244.6)).toBe("245 N");
  });
});

describe("formatDelays", () => {
  it("lists fixed delays with the unit", () => {
    expect(formatDelays(base)).toBe("6, 10, 14 s");
  });
  it("marks adjustable delays", () => {
    expect(formatDelays({ ...base, delayAdjustable: true })).toBe("6, 10, 14 s, adjustable");
  });
  it("names plugged reloads", () => {
    expect(formatDelays({ ...base, delays: "P", plugged: true })).toBe("Plugged (no ejection charge)");
  });
});

describe("motorLabel / propLabel", () => {
  it("builds the classic class+thrust label", () => {
    expect(motorLabel(base)).toBe("H128");
  });
  it("falls back to a dash when propellant is unknown", () => {
    expect(propLabel({ ...base, propName: null })).toBe("—");
  });
});
