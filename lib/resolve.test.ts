import { describe, it, expect } from "vitest";
import { caseByDesignation, reloadById, reloadsForCase, allReloads } from "./graph";
import {
  resolveCase,
  resolveReload,
  shoppingList,
  fitLabel,
  certLabel,
} from "./resolve";

function requireCase(designation: string) {
  const c = caseByDesignation(designation);
  if (!c) throw new Error(`test setup: case ${designation} missing`);
  return c;
}

describe("resolveCase — native fits", () => {
  it("returns the reloads built for the case", () => {
    const c = requireCase("RMS-38/360");
    const res = resolveCase(c);
    const natives = reloadsForCase("RMS-38/360");
    expect(res.native.length).toBe(natives.length);
    expect(res.native.every((f) => f.fit === "native" && f.spacers === 0)).toBe(true);
    // Sorted ascending by total impulse.
    for (let i = 1; i < res.native.length; i++) {
      expect(res.native[i].reload.totImpulseNs).toBeGreaterThanOrEqual(res.native[i - 1].reload.totImpulseNs);
    }
  });
});

describe("resolveCase — 38 mm spacer fits (the sourced 38RAS chart)", () => {
  it("a 38/360 case flies its own reloads natively and 38/240 + 38/120 reloads via spacers", () => {
    const c = requireCase("RMS-38/360");
    const res = resolveCase(c);
    expect(res.adapter?.designation).toBe("38RAS");
    expect(res.adapterAdvisory).toBe(false);

    // Every adapter fit points at a shorter case, per the chart: 1 spacer → 240, 2 → 120.
    const oneSpacer = res.viaAdapter.filter((f) => f.spacers === 1);
    const twoSpacer = res.viaAdapter.filter((f) => f.spacers === 2);
    expect(oneSpacer.length).toBe(reloadsForCase("RMS-38/240").length);
    expect(twoSpacer.length).toBe(reloadsForCase("RMS-38/120").length);
    expect(oneSpacer.every((f) => f.reload.caseInfo === "RMS-38/240")).toBe(true);
    expect(twoSpacer.every((f) => f.reload.caseInfo === "RMS-38/120")).toBe(true);
  });

  it("a 38/720 case reaches 38/600 (1 spacer) and 38/480 (2 spacers) — never 38/360", () => {
    const res = resolveCase(requireCase("RMS-38/720"));
    const reached = new Set(res.viaAdapter.map((f) => f.reload.caseInfo));
    expect(reached.has("RMS-38/600")).toBe(true);
    expect(reached.has("RMS-38/480")).toBe(true);
    // 3 steps down would need 3 spacers — beyond the 2-spacer limit, so it must not appear.
    expect(reached.has("RMS-38/360")).toBe(false);
    expect(res.viaAdapter.every((f) => f.spacers <= 2)).toBe(true);
  });

  it("never offers a spacer fit for a longer reload than the case is rated for", () => {
    const res = resolveCase(requireCase("RMS-38/240"));
    // 38/240 can only step down to 38/120; it must not fly 360/480/... reloads.
    for (const f of res.viaAdapter) {
      expect(f.reload.totImpulseNs).toBeLessThanOrEqual(requireCase("RMS-38/240").maxImpulseNs + 1);
    }
  });

  it("the 38/1080 case has no adapter fits (38RAS doesn't fit it)", () => {
    const res = resolveCase(requireCase("RMS-38/1080"));
    expect(res.viaAdapter).toEqual([]);
    expect(res.adapter).toBeUndefined();
  });
});

describe("resolveCase — 29/54 mm are advisory, not resolved", () => {
  it("a 29/360 case exposes the 29RAS advisory but no resolved spacer fits", () => {
    const res = resolveCase(requireCase("RMS-29/360"));
    expect(res.adapterAdvisory).toBe(true);
    expect(res.adapter?.designation).toBe("29RAS");
    expect(res.viaAdapter).toEqual([]);
  });

  it("the 29/40-120 range case flies its many reloads natively, with no separate adapter", () => {
    const res = resolveCase(requireCase("RMS-29/40-120"));
    expect(res.native.length).toBeGreaterThan(5);
    expect(res.viaAdapter).toEqual([]);
    expect(res.adapterAdvisory).toBe(false);
  });
});

describe("resolveReload — reverse direction", () => {
  it("maps a reload to its native case and the longer cases that reach it with spacers", () => {
    // Pick any 38/240 reload.
    const r = reloadsForCase("RMS-38/240")[0];
    const res = resolveReload(r);
    expect(res.native?.motorCase.designation).toBe("RMS-38/240");
    const via = new Set(res.viaAdapter.map((f) => `${f.motorCase.designation}:${f.spacers}`));
    // From the chart: 38/360 + 1 spacer, 38/480 + 2 spacers reach a 38/240 reload.
    expect(via.has("RMS-38/360:1")).toBe(true);
    expect(via.has("RMS-38/480:2")).toBe(true);
    // Smallest case first.
    for (let i = 1; i < res.viaAdapter.length; i++) {
      expect(res.viaAdapter[i].motorCase.slot).toBeGreaterThanOrEqual(res.viaAdapter[i - 1].motorCase.slot);
    }
  });

  it("round-trips: every reload a case flies lists that case among its fits", () => {
    const c = requireCase("RMS-38/480");
    const res = resolveCase(c);
    for (const f of [...res.native, ...res.viaAdapter]) {
      const back = resolveReload(f.reload);
      const cases = [back.native, ...back.viaAdapter].filter(Boolean).map((x) => x!.motorCase.designation);
      expect(cases).toContain("RMS-38/480");
    }
  });
});

describe("shoppingList", () => {
  it("lists case + both closures for a simple native fit, and the reload as consumable", () => {
    const c = requireCase("RMS-38/240");
    const r = reloadsForCase("RMS-38/240")[0];
    const list = shoppingList(c, r, "native", 0);
    const names = list.reusable.map((i) => i.name);
    expect(names.some((n) => n.includes("RMS-38/240 case"))).toBe(true);
    expect(names.some((n) => n.includes("forward closure"))).toBe(true);
    expect(names.some((n) => n.includes("aft closure"))).toBe(true);
    expect(list.consumable.name).toContain(r.designation);
  });

  it("adds a forward seal disc for the longer cases", () => {
    const c = requireCase("RMS-38/480"); // needs a seal disc
    const r = reloadsForCase("RMS-38/480")[0];
    const list = shoppingList(c, r, "native", 0);
    expect(list.reusable.some((i) => i.name.includes("seal disc"))).toBe(true);
  });

  it("adds the adapter and a spacer note for a spacer fit", () => {
    const c = requireCase("RMS-38/360");
    const r = reloadsForCase("RMS-38/240")[0]; // flown in 38/360 with 1 spacer
    const list = shoppingList(c, r, "adapter", 1);
    expect(list.reusable.some((i) => i.name.includes("38RAS"))).toBe(true);
    expect(list.notes.some((n) => n.toLowerCase().includes("spacer"))).toBe(true);
  });

  it("flags a plugged reload as electronic-deployment only", () => {
    const plugged = allReloads().find((r) => r.plugged);
    expect(plugged).toBeDefined();
    const c = caseByDesignation(plugged!.caseInfo)!;
    const list = shoppingList(c, plugged!, "native", 0);
    expect(list.notes.some((n) => n.toLowerCase().includes("electronic deployment"))).toBe(true);
    expect(list.consumable.detail).toContain("no ejection charge");
  });

  it("flags an out-of-production reload without calling it decertified", () => {
    const oop = allReloads().find((r) => r.availability === "OOP");
    expect(oop).toBeDefined();
    const c = caseByDesignation(oop!.caseInfo)!;
    const list = shoppingList(c, oop!, "native", 0);
    const note = list.notes.find((n) => n.toLowerCase().includes("out of production"));
    expect(note).toBeDefined();
    expect(note!.toLowerCase()).toContain("not the same as decertified");
  });
});

describe("labels", () => {
  it("fitLabel reads naturally", () => {
    expect(fitLabel("native", 0)).toBe("Direct fit");
    const c = resolveCase(caseByDesignation("RMS-38/360")!);
    expect(fitLabel("adapter", 1, c.adapter)).toContain("1 spacer");
    expect(fitLabel("adapter", 2, c.adapter)).toContain("2 spacers");
  });

  it("certLabel reflects the certifying body", () => {
    const r = reloadById(allReloads().find((x) => x.certOrg === "TRA")!.id)!;
    expect(certLabel(r)).toBe("TRA certified");
    const unlisted = allReloads().find((x) => x.certOrg === null);
    if (unlisted) expect(certLabel(unlisted)).toBe("Certification unlisted");
  });
});
