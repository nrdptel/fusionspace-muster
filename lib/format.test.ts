import { describe, it, expect } from "vitest";
import { formatImpulse, formatThrust, formatDelays, motorLabel, propLabel, formatLength, formatWeight, dimensionsLabel } from "./format";
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

describe("formatLength", () => {
  it("rounds to whole millimetres", () => {
    expect(formatLength(191)).toBe("191 mm");
    expect(formatLength(337.4)).toBe("337 mm");
  });
});

describe("formatWeight", () => {
  it("uses grams below a kilogram", () => {
    expect(formatWeight(366)).toBe("366 g");
    expect(formatWeight(23.9)).toBe("24 g");
  });
  it("switches to kilograms and trims trailing zeros", () => {
    expect(formatWeight(1200)).toBe("1.2 kg");
    expect(formatWeight(2000)).toBe("2 kg");
    expect(formatWeight(1050)).toBe("1.05 kg");
    expect(formatWeight(32672)).toBe("32.7 kg");
  });
});

describe("dimensionsLabel", () => {
  it("joins every physical fact ThrustCurve carries", () => {
    expect(dimensionsLabel({ ...base, lengthMm: 191, totalWeightG: 366, propWeightG: 193.2 })).toBe(
      "191 mm long · 366 g loaded · 193 g propellant",
    );
  });
  it("omits fields that are missing", () => {
    expect(dimensionsLabel({ ...base, lengthMm: 125, propWeightG: 46 })).toBe("125 mm long · 46 g propellant");
    expect(dimensionsLabel({ ...base, totalWeightG: 480 })).toBe("480 g loaded");
  });
  it("returns null when nothing is known, so the row can be dropped", () => {
    expect(dimensionsLabel(base)).toBeNull();
  });
});
