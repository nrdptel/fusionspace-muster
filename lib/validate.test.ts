import { describe, it, expect } from "vitest";
import { validateGraph, type GraphInput } from "./validate";
import { CASES as RMS_CASES, PARTS as RMS_PARTS, ADAPTERS as RMS_ADAPTERS } from "./data/hardware";
import { CTI_CASES, CTI_PARTS, CTI_ADAPTERS } from "./data/hardware-cti";
import { LOKI_CASES, LOKI_PARTS } from "./data/hardware-loki";
import reloadsDoc from "./data/reloads.json";
import type { AdapterSystem, HardwarePart, MotorCase, Reload } from "./data/types";

// --- Minimal fixtures: a valid two-case graph the tests then break one field at a time. ------

function mkPart(over: Partial<HardwarePart> = {}): HardwarePart {
  return { id: "fc-38", kind: "forward-closure", name: "38 mm forward closure", diameter: 38, sources: ["https://example.com/hw"], ...over };
}

function mkCase(over: Partial<MotorCase> = {}): MotorCase {
  return {
    id: "rms-38-360",
    designation: "RMS-38/360",
    manufacturer: "AeroTech",
    system: "RMS",
    diameter: 38,
    slot: 360,
    slotLabel: "360",
    rangeCase: false,
    maxImpulseNs: 360,
    forwardClosure: "fc-38",
    aftClosure: "ac-38",
    sources: ["https://example.com/case"],
    ...over,
  };
}

function mkAdapter(over: Partial<AdapterSystem> = {}): AdapterSystem {
  return {
    id: "ras-38",
    designation: "38RAS",
    name: "38 mm Reload Adapter System",
    manufacturer: "AeroTech",
    diameter: 38,
    contents: [],
    rules: [{ baseCase: "RMS-38/360", spacers: 1, fliesCase: "RMS-38/240" }],
    advisoryOnly: false,
    sources: ["https://example.com/ras"],
    ...over,
  };
}

function mkReload(over: Partial<Reload> = {}): Reload {
  return {
    id: "at-i161w",
    designation: "I161W",
    commonName: "I161",
    manufacturer: "AeroTech",
    system: "RMS",
    impulseClass: "I",
    diameter: 38,
    caseInfo: "RMS-38/360",
    avgThrustN: 161,
    totImpulseNs: 360,
    propName: "White Lightning",
    sparky: false,
    delays: "6,10,14",
    delayAdjustable: false,
    plugged: false,
    ejectionCharge: true,
    availability: "regular",
    certOrg: "TRA",
    motorId: "x",
    tcUrl: "https://www.thrustcurve.org/motors/AeroTech/I161W/",
    ...over,
  };
}

/** A complete, valid graph: a longer case + a shorter case it reaches with the adapter. */
function base(): GraphInput {
  return {
    cases: [
      mkCase(),
      mkCase({ id: "rms-38-240", designation: "RMS-38/240", slot: 240, slotLabel: "240", maxImpulseNs: 240, adapter: undefined }),
    ],
    parts: [mkPart(), mkPart({ id: "ac-38", kind: "aft-closure", name: "38 mm aft closure" })],
    adapters: [mkAdapter()],
    reloads: [
      mkReload(),
      mkReload({ id: "at-h128w", designation: "H128W", caseInfo: "RMS-38/240", impulseClass: "H", totImpulseNs: 240 }),
    ],
  };
}

// Give the longer case the adapter so the base graph exercises a real spacer rule.
function baseWithAdapter(): GraphInput {
  const g = base();
  g.cases[0].adapter = "ras-38";
  return g;
}

describe("validateGraph — the real merged graph", () => {
  it("passes with no violations", () => {
    const input: GraphInput = {
      cases: [...RMS_CASES, ...CTI_CASES, ...LOKI_CASES],
      parts: [...RMS_PARTS, ...CTI_PARTS, ...LOKI_PARTS],
      adapters: [...RMS_ADAPTERS, ...CTI_ADAPTERS],
      reloads: (reloadsDoc as { reloads: Reload[] }).reloads,
    };
    expect(() => validateGraph(input)).not.toThrow();
  });
});

describe("validateGraph — the base fixture is itself valid", () => {
  it("does not throw", () => {
    expect(() => validateGraph(base())).not.toThrow();
    expect(() => validateGraph(baseWithAdapter())).not.toThrow();
  });
});

describe("validateGraph — reference integrity", () => {
  it("rejects a reload built for an unknown case", () => {
    const g = base();
    g.reloads[0].caseInfo = "RMS-38/999";
    expect(() => validateGraph(g)).toThrow(/references unknown case/);
  });

  it("rejects a case referencing an unknown part", () => {
    const g = base();
    g.cases[0].forwardClosure = "nope";
    expect(() => validateGraph(g)).toThrow(/references unknown part/);
  });

  it("rejects a case referencing an unknown adapter", () => {
    const g = base();
    g.cases[0].adapter = "nope";
    expect(() => validateGraph(g)).toThrow(/references unknown adapter/);
  });

  it("rejects an adapter rule pointing at an unknown case", () => {
    const g = baseWithAdapter();
    g.adapters[0].rules[0].fliesCase = "RMS-38/000";
    expect(() => validateGraph(g)).toThrow(/rule references unknown case/);
  });

  it("rejects an adapter rule that crosses diameters", () => {
    const g = baseWithAdapter();
    // Make the flown case a different diameter than the adapter.
    g.cases[1].diameter = 29;
    expect(() => validateGraph(g)).toThrow(/crosses diameters/);
  });
});

describe("validateGraph — spacer safety (the CATO-class checks)", () => {
  it("rejects a spacer rule that steps UP (longer reload in a shorter case)", () => {
    const g = baseWithAdapter();
    // Swap base/flies so the rule tries to fly the 360 reload in the 240 case.
    g.adapters[0].rules[0] = { baseCase: "RMS-38/240", spacers: 1, fliesCase: "RMS-38/360" };
    expect(() => validateGraph(g)).toThrow(/does not step down/);
  });

  it("rejects a rule requiring more than two spacers", () => {
    const g = baseWithAdapter();
    g.adapters[0].rules[0].spacers = 3;
    expect(() => validateGraph(g)).toThrow(/must be 1 or 2/);
  });

  it("rejects an advisory adapter that declares resolved rules", () => {
    const g = baseWithAdapter();
    g.adapters[0].advisoryOnly = true;
    expect(() => validateGraph(g)).toThrow(/advisory-only but declares/);
  });

  it("rejects a resolved adapter with no rules", () => {
    const g = baseWithAdapter();
    g.adapters[0].rules = [];
    expect(() => validateGraph(g)).toThrow(/resolved but declares no spacer rules/);
  });
});

describe("validateGraph — identity", () => {
  it("rejects a duplicate case id", () => {
    const g = base();
    g.cases[1].id = g.cases[0].id;
    expect(() => validateGraph(g)).toThrow(/duplicate case id/);
  });

  it("rejects a duplicate case designation", () => {
    const g = base();
    // A second case with the same designation but a distinct id — references still resolve, so
    // only the designation-uniqueness check should fire.
    g.cases.push(mkCase({ id: "rms-38-360-dupe" }));
    expect(() => validateGraph(g)).toThrow(/duplicate case designation/);
  });

  it("rejects a duplicate part id", () => {
    const g = base();
    g.parts.push(mkPart()); // a second "fc-38"
    expect(() => validateGraph(g)).toThrow(/duplicate part id/);
  });

  it("rejects a duplicate adapter id", () => {
    const g = baseWithAdapter();
    g.adapters.push(mkAdapter());
    expect(() => validateGraph(g)).toThrow(/duplicate adapter id/);
  });

  it("rejects a duplicate reload id", () => {
    const g = base();
    g.reloads[1].id = g.reloads[0].id;
    expect(() => validateGraph(g)).toThrow(/duplicate reload id/);
  });
});

describe("validateGraph — sourcing", () => {
  it("rejects a case with no sources", () => {
    const g = base();
    g.cases[0].sources = [];
    expect(() => validateGraph(g)).toThrow(/case RMS-38\/360 has no valid source/);
  });

  it("rejects a part with a non-URL source", () => {
    const g = base();
    g.parts[0].sources = ["see the sheet"];
    expect(() => validateGraph(g)).toThrow(/has no valid source/);
  });

  it("rejects an adapter with no sources", () => {
    const g = baseWithAdapter();
    g.adapters[0].sources = [];
    expect(() => validateGraph(g)).toThrow(/adapter 38RAS has no valid source/);
  });
});

describe("validateGraph — reload consistency", () => {
  it("rejects a reload whose brand disagrees with its case", () => {
    const g = base();
    g.reloads[0].manufacturer = "Cesaroni";
    expect(() => validateGraph(g)).toThrow(/is built for case .* \(AeroTech\)/);
  });

  it("rejects a reload whose diameter disagrees with its case", () => {
    const g = base();
    g.reloads[0].diameter = 54;
    expect(() => validateGraph(g)).toThrow(/mm\) is built for case/);
  });

  it("rejects a plugged reload that still claims an ejection charge", () => {
    const g = base();
    g.reloads[0].plugged = true; // ejectionCharge left true → inconsistent
    expect(() => validateGraph(g)).toThrow(/inconsistent plugged\/ejectionCharge/);
  });

  it("rejects a non-plugged reload with no ejection charge", () => {
    const g = base();
    g.reloads[0].ejectionCharge = false; // plugged left false → inconsistent
    expect(() => validateGraph(g)).toThrow(/inconsistent plugged\/ejectionCharge/);
  });
});
