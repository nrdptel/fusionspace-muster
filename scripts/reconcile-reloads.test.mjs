import { describe, it, expect } from "vitest";
import { inScope, normalize, materialDiff, diffMirror, EXACT_FIELDS, NUM_TOLERANCE } from "./reconcile-reloads.mjs";

// The scheduled reconcile (.github/workflows/reconcile.yml) is a safety mechanism: it watches the
// committed reload mirror for drift from live ThrustCurve and files an issue when the source moves.
// It's only trustworthy if its scope, normalization, and diff logic are right — a bug that reports a
// changed motor as "in sync," or drops an in-scope motor, would fail *silently* (a green run, no
// issue) and give false confidence. These exercise that logic directly, no network, so a regression
// fails CI instead of quietly blinding the monitor.

/** A raw ThrustCurve API record (the shape `inScope`/`normalize` consume). */
function raw(over = {}) {
  return {
    motorId: "id-1",
    manufacturerAbbrev: "AeroTech",
    designation: "I161W",
    commonName: "I161",
    impulseClass: "I",
    diameter: 38,
    caseInfo: "RMS-38/360",
    certOrg: "Tripoli Rocketry Association, Inc.",
    avgThrustN: 160.6,
    totImpulseNs: 328.74,
    length: 191,
    totalWeightG: 366.0,
    propWeightG: 193.2,
    propInfo: "White Lightning",
    sparky: false,
    delays: "6,8,10,12,14",
    delayAdjustable: false,
    availability: "regular",
    ...over,
  };
}

/** A normalized row (the shape `materialDiff`/`diffMirror` consume). */
function norm(over = {}) {
  return {
    motorId: "id-1",
    designation: "I161W",
    commonName: "I161",
    manufacturer: "AeroTech",
    impulseClass: "I",
    diameter: 38,
    caseInfo: "RMS-38/360",
    avgThrustN: 161,
    totImpulseNs: 328.7,
    lengthMm: 191,
    totalWeightG: 366,
    propWeightG: 193.2,
    propName: "White Lightning",
    sparky: false,
    delays: "6,8,10,12,14",
    delayAdjustable: false,
    plugged: false,
    ejectionCharge: true,
    availability: "regular",
    certOrg: "TRA",
    ...over,
  };
}

describe("inScope — the mirror's membership rule", () => {
  it("keeps a modeled brand at a covered diameter with a case", () => {
    expect(inScope(raw())).toBe(true);
    expect(inScope(raw({ manufacturerAbbrev: "Loki", diameter: 76, caseInfo: "76/6000" }))).toBe(true);
  });

  it("drops a diameter the tool doesn't cover", () => {
    expect(inScope(raw({ diameter: 18, caseInfo: "RMS-18/20" }))).toBe(false); // small AeroTech
    expect(inScope(raw({ manufacturerAbbrev: "Loki", diameter: 98, caseInfo: "98/12500" }))).toBe(false); // Loki 98 is on hold
  });

  it("drops a reload with no case — it can't be placed in the graph", () => {
    expect(inScope(raw({ caseInfo: "" }))).toBe(false);
    expect(inScope(raw({ caseInfo: undefined }))).toBe(false);
  });

  it("drops an unmodeled brand", () => {
    expect(inScope(raw({ manufacturerAbbrev: "Estes" }))).toBe(false);
  });
});

describe("normalize — mapping ThrustCurve's shape to the mirror's", () => {
  it("maps the renamed/derived fields and rounds to display precision", () => {
    const n = normalize(raw());
    expect(n.manufacturer).toBe("AeroTech"); // from manufacturerAbbrev
    expect(n.propName).toBe("White Lightning"); // from propInfo
    expect(n.certOrg).toBe("TRA"); // full cert-body name abbreviated
    expect(n.avgThrustN).toBe(161); // 160.6 -> whole newton
    expect(n.totImpulseNs).toBe(328.7); // 328.74 -> one decimal
    expect(n.lengthMm).toBe(191);
    expect(n.plugged).toBe(false);
    expect(n.ejectionCharge).toBe(true);
  });

  it("abbreviates each certifying body, and nulls an unknown/absent one", () => {
    expect(normalize(raw({ certOrg: "National Association of Rocketry" })).certOrg).toBe("NAR");
    expect(normalize(raw({ certOrg: "Canadian Association of Rocketry" })).certOrg).toBe("CAR");
    expect(normalize(raw({ certOrg: undefined })).certOrg).toBeNull();
    expect(normalize(raw({ certOrg: "Some Other Body" })).certOrg).toBeNull();
  });

  it("derives plugged / ejection-charge from the delays", () => {
    const plugged = normalize(raw({ delays: "P" }));
    expect(plugged.plugged).toBe(true);
    expect(plugged.ejectionCharge).toBe(false);
  });

  it("drops a propellant weight that exceeds the loaded weight — an impossible source point", () => {
    const n = normalize(raw({ totalWeightG: 52, propWeightG: 104 })); // the 25E75-17A shape
    expect(n.totalWeightG).toBe(52);
    expect(n.propWeightG).toBeUndefined();
  });

  it("coerces the boolean fields", () => {
    const n = normalize(raw({ sparky: undefined, delayAdjustable: 1 }));
    expect(n.sparky).toBe(false);
    expect(n.delayAdjustable).toBe(true);
  });
});

describe("materialDiff — real change vs. rounding noise", () => {
  it("sees nothing between identical rows", () => {
    expect(materialDiff(norm(), norm())).toEqual([]);
  });

  it("flags any categorical change — the safety-relevant ones", () => {
    expect(materialDiff(norm(), norm({ certOrg: "NAR" }))).toHaveLength(1);
    expect(materialDiff(norm(), norm({ availability: "OOP" }))).toHaveLength(1);
    expect(materialDiff(norm(), norm({ caseInfo: "RMS-38/480" }))).toHaveLength(1);
    expect(materialDiff(norm(), norm({ plugged: true, ejectionCharge: false }))).toHaveLength(2);
  });

  it("ignores a sub-tolerance numeric wobble but flags a real revision", () => {
    expect(materialDiff(norm({ lengthMm: 1232 }), norm({ lengthMm: 1233 }))).toEqual([]); // 1 mm boundary
    expect(materialDiff(norm({ lengthMm: 1232 }), norm({ lengthMm: 1240 })).length).toBeGreaterThan(0);
    expect(materialDiff(norm(), norm({ totImpulseNs: 328.9 }))).toEqual([]); // 0.2 N·s < 0.5
    expect(materialDiff(norm(), norm({ totImpulseNs: 331 })).length).toBeGreaterThan(0);
  });

  it("flags a field appearing or disappearing", () => {
    expect(materialDiff(norm(), norm({ propWeightG: undefined })).length).toBeGreaterThan(0);
  });
});

describe("diffMirror — partitioning the catalog against the mirror", () => {
  it("reports nothing when the two match", () => {
    const rows = [norm({ motorId: "a" }), norm({ motorId: "b" })];
    const { added, removed, changed } = diffMirror(rows, rows.map((r) => ({ ...r })));
    expect(added).toEqual([]);
    expect(removed).toEqual([]);
    expect(changed).toEqual([]);
  });

  it("separates new, withdrawn, and changed motors by motorId", () => {
    const committed = [norm({ motorId: "a" }), norm({ motorId: "b", availability: "regular" })];
    const live = [norm({ motorId: "b", availability: "OOP" }), norm({ motorId: "c" })];
    const { added, removed, changed } = diffMirror(committed, live);
    expect(added.map((r) => r.motorId)).toEqual(["c"]);
    expect(removed.map((r) => r.motorId)).toEqual(["a"]);
    expect(changed).toHaveLength(1);
    expect(changed[0].committed.motorId).toBe("b");
    expect(changed[0].diffs[0]).toContain("availability");
  });
});

// The completeness guard on the drift detector itself. materialDiff only compares the fields listed
// in EXACT_FIELDS + NUM_TOLERANCE, but `normalize` decides which fields the mirror actually carries.
// If those drift apart, the monitor blinds itself *silently*: a field added to the mirror but not to
// the compare lists would drift on ThrustCurve with the reconcile still reporting "in sync," and a
// typo'd compare-field name would forever diff undefined-against-undefined and never fire. Neither
// shows up in any other test — a green run, no issue, false confidence. Tie the two together so a
// future field can't be mirrored without also being watched (motorId is the join key diffMirror
// matches on, not a change field, so it's the one normalized key that's intentionally not compared).
describe("field coverage — every mirrored field is actually watched for drift", () => {
  it("compares exactly the fields normalize() produces, minus the motorId join key", () => {
    const normalized = new Set(Object.keys(normalize(raw())));
    normalized.delete("motorId");
    const compared = new Set([...EXACT_FIELDS, ...Object.keys(NUM_TOLERANCE)]);
    // Sorted arrays give a readable diff naming the offending field on either kind of failure.
    expect([...compared].sort()).toEqual([...normalized].sort());
  });
});
