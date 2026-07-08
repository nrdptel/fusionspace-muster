import { describe, it, expect } from "vitest";
import { caseByDesignation, reloadById, reloadsForCase, allReloads } from "./graph";
import {
  resolveCase,
  resolveReload,
  shoppingList,
  fitLabel,
  certLabel,
  coverageFor,
  unlockSuggestions,
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
    expect(list.reusable.some((i) => i.name.includes("Reload Adapter System"))).toBe(true);
    expect(list.notes.some((n) => n.includes("38RAS") && n.toLowerCase().includes("spacer"))).toBe(true);
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

describe("Cesaroni Pro — the second system", () => {
  it("resolves a Pro case to its cartridge reloads and its spacer fits (max 2, 1–2 sizes down)", () => {
    const c = caseByDesignation("Pro38-3G");
    expect(c?.manufacturer).toBe("Cesaroni");
    const res = resolveCase(c!);
    expect(res.native.length).toBeGreaterThan(0);
    expect(res.native.every((f) => f.reload.manufacturer === "Cesaroni")).toBe(true);
    // Cesaroni's published rule: a 3G case flies 2G with 1 spacer and 1G with 2 spacers.
    expect(res.adapterAdvisory).toBe(false);
    expect(res.viaAdapter.every((f) => f.spacers <= 2 && f.reload.manufacturer === "Cesaroni")).toBe(true);
    expect(res.viaAdapter.some((f) => f.reload.caseInfo === "Pro38-2G" && f.spacers === 1)).toBe(true);
    expect(res.viaAdapter.some((f) => f.reload.caseInfo === "Pro38-1G" && f.spacers === 2)).toBe(true);
  });

  it("never offers a spacer fit more than two grain-sizes shorter", () => {
    const res = resolveCase(caseByDesignation("Pro38-6G")!);
    const reached = new Set(res.viaAdapter.map((f) => f.reload.caseInfo));
    expect(reached.has("Pro38-5G")).toBe(true); // 1 spacer
    expect(reached.has("Pro38-4G")).toBe(true); // 2 spacers
    expect(reached.has("Pro38-3G")).toBe(false); // 3 down — beyond the 2-spacer limit
  });

  it("Pro24 has no spacers, and Pro75 spacers are advisory", () => {
    const p24 = resolveCase(caseByDesignation("Pro24-3G")!);
    expect(p24.viaAdapter).toEqual([]);
    expect(p24.adapterAdvisory).toBe(false);
    const p75 = resolveCase(caseByDesignation("Pro75-4G")!);
    expect(p75.adapterAdvisory).toBe(true);
    expect(p75.viaAdapter).toEqual([]);
  });

  it("models the reusable hardware per diameter: Pro38 is case-only, Pro54 keeps a rear closure", () => {
    const p38 = shoppingList(caseByDesignation("Pro38-3G")!, resolveCase(caseByDesignation("Pro38-3G")!).native[0].reload, "native", 0);
    // Pro38: only the case is reusable — both closures ship in the reload.
    expect(p38.reusable.length).toBe(1);
    expect(p38.reusable[0].name).toContain("Pro38-3G case");
    const p54case = caseByDesignation("Pro54-3G")!;
    const p54 = shoppingList(p54case, resolveCase(p54case).native[0].reload, "native", 0);
    expect(p54.reusable.some((i) => i.name.includes("rear closure"))).toBe(true);
  });

  it("never crosses systems: a Cesaroni reload resolves only to Cesaroni hardware", () => {
    const ctiReloads = allReloads().filter((r) => r.manufacturer === "Cesaroni" && r.diameter === 38);
    for (const r of ctiReloads.slice(0, 20)) {
      const res = resolveReload(r);
      const cases = [res.native, ...res.viaAdapter].filter(Boolean).map((f) => f!.motorCase);
      expect(cases.every((c) => c.manufacturer === "Cesaroni")).toBe(true);
    }
  });

  it("and an AeroTech reload resolves only to AeroTech hardware", () => {
    const atReloads = allReloads().filter((r) => r.manufacturer === "AeroTech" && r.diameter === 38);
    for (const r of atReloads.slice(0, 20)) {
      const res = resolveReload(r);
      const cases = [res.native, ...res.viaAdapter].filter(Boolean).map((f) => f!.motorCase);
      expect(cases.every((c) => c.manufacturer === "AeroTech")).toBe(true);
    }
  });

  it("describes a Cesaroni reload as a single-use cartridge in the shopping list", () => {
    const r = allReloads().find((x) => x.manufacturer === "Cesaroni")!;
    const list = shoppingList(caseByDesignation(r.caseInfo)!, r, "native", 0);
    expect(list.consumable.name).toContain("cartridge");
    expect(list.consumable.detail).toContain("preassembled");
  });
});

describe("AeroTech 75 / 98 mm — the large motors", () => {
  it("resolves a 75 mm case to its own reloads, with a seal disc and the 75RAS advisory", () => {
    const c = caseByDesignation("RMS-75/5120");
    expect(c?.manufacturer).toBe("AeroTech");
    expect(c?.diameter).toBe(75);
    const res = resolveCase(c!);
    expect(res.native.length).toBeGreaterThan(0);
    expect(res.native.every((f) => f.reload.diameter === 75 && f.reload.manufacturer === "AeroTech")).toBe(true);
    // 75 mm has a Reload Adapter System, but it's advisory (not a resolved step).
    expect(res.viaAdapter).toEqual([]);
    expect(res.adapterAdvisory).toBe(true);
    expect(res.adapter?.designation).toBe("75RAS");
    const list = shoppingList(c!, res.native[0].reload, "native", 0);
    expect(list.reusable.some((i) => i.name.includes("forward closure"))).toBe(true);
    expect(list.reusable.some((i) => i.name.includes("seal disc"))).toBe(true);
  });

  it("98 mm is native-fit only (no adapter exists) and reaches past 20,000 N·s", () => {
    const big = caseByDesignation("RMS-98/20480");
    expect(big?.diameter).toBe(98);
    const res = resolveCase(big!);
    expect(res.native.length).toBeGreaterThan(0);
    expect(res.viaAdapter).toEqual([]);
    expect(res.adapterAdvisory).toBe(false);
    expect(res.adapter).toBeUndefined();
  });

  it("keeps 75 mm systems apart: a Cesaroni Pro75 reload never resolves to AeroTech 75 mm hardware", () => {
    const ctiPro75 = allReloads().filter((r) => r.manufacturer === "Cesaroni" && r.diameter === 75);
    expect(ctiPro75.length).toBeGreaterThan(0);
    for (const r of ctiPro75.slice(0, 15)) {
      const cases = [resolveReload(r).native, ...resolveReload(r).viaAdapter].filter(Boolean).map((f) => f!.motorCase);
      expect(cases.every((c) => c.manufacturer === "Cesaroni")).toBe(true);
    }
  });
});

describe("Loki Research — the third system (native-fit only)", () => {
  it("resolves a Loki case to its own reloads, with no spacer fits and no adapter", () => {
    const c = caseByDesignation("54/2800");
    expect(c?.manufacturer).toBe("Loki");
    expect(c?.system).toBe("Loki");
    const res = resolveCase(c!);
    expect(res.native.length).toBeGreaterThan(0);
    expect(res.native.every((f) => f.reload.manufacturer === "Loki" && f.fit === "native")).toBe(true);
    // Loki publishes no spacer system — every fit is native, no adapter, no advisory.
    expect(res.viaAdapter).toEqual([]);
    expect(res.adapter).toBeUndefined();
    expect(res.adapterAdvisory).toBe(false);
  });

  it("reuses BOTH closures: the shopping list lists the case, forward bulkhead, and graphite nozzle", () => {
    const c = caseByDesignation("54/2800")!;
    const r = reloadsForCase("54/2800")[0];
    const list = shoppingList(c, r, "native", 0);
    const names = list.reusable.map((i) => i.name);
    expect(names.some((n) => n.includes("54/2800 case"))).toBe(true);
    expect(names.some((n) => n.includes("forward bulkhead"))).toBe(true);
    expect(names.some((n) => n.includes("graphite nozzle"))).toBe(true);
    // The reload is a kit, and Loki's reload carries no nozzle/closures (they're reusable).
    expect(list.consumable.name).toContain("reload kit");
    expect(list.consumable.detail).toContain("reusable");
    // The throat-number safety constraint is surfaced as a note.
    expect(list.notes.some((n) => n.toLowerCase().includes("throat"))).toBe(true);
  });

  it("carries the 54 mm extended-bulkhead caveat on the case", () => {
    const c = caseByDesignation("54/1200")!;
    expect(c.notes?.toLowerCase()).toContain("extended bulkhead");
  });

  it("never crosses systems: a Loki reload resolves only to Loki hardware", () => {
    const loki = allReloads().filter((r) => r.manufacturer === "Loki");
    expect(loki.length).toBeGreaterThan(40);
    for (const r of loki) {
      const res = resolveReload(r);
      const cases = [res.native, ...res.viaAdapter].filter(Boolean).map((f) => f!.motorCase);
      expect(cases.length).toBeGreaterThan(0);
      expect(cases.every((c) => c.manufacturer === "Loki")).toBe(true);
      // No Loki reload should ever pick up a spacer fit.
      expect(res.viaAdapter).toEqual([]);
    }
  });
});

describe("coverageFor — what an owned kit can fly", () => {
  const n360 = reloadsForCase("RMS-38/360").length;
  const n240 = reloadsForCase("RMS-38/240").length;
  const n120 = reloadsForCase("RMS-38/120").length;

  it("a lone case flies only its own reloads", () => {
    const cov = coverageFor({ caseIds: ["rms-38-360"], adapterIds: [] });
    expect(cov.reloads.length).toBe(n360);
    expect(cov.advisoryDiameters).toEqual([]);
  });

  it("adding the owned adapter unlocks the case's spacer fits", () => {
    const cov = coverageFor({ caseIds: ["rms-38-360"], adapterIds: ["ras-38"] });
    // 360 natives + 240 (1 spacer) + 120 (2 spacers), all disjoint.
    expect(cov.reloads.length).toBe(n360 + n240 + n120);
  });

  it("the adapter does nothing until it's owned", () => {
    const without = coverageFor({ caseIds: ["rms-38-360"], adapterIds: [] });
    const withA = coverageFor({ caseIds: ["rms-38-360"], adapterIds: ["ras-38"] });
    expect(withA.reloads.length).toBeGreaterThan(without.reloads.length);
  });

  it("spacer fits already covered natively aren't double-counted", () => {
    // Own the 360 and 240 cases; the 240 reloads are already flyable natively, so adding the
    // adapter only nets the 120 reloads (the 360 case's 2-spacer step).
    const cov = coverageFor({ caseIds: ["rms-38-360", "rms-38-240"], adapterIds: ["ras-38"] });
    expect(cov.reloads.length).toBe(n360 + n240 + n120);
  });

  it("an owned advisory adapter (29 mm) is flagged, not counted", () => {
    const cov = coverageFor({ caseIds: ["rms-29-360"], adapterIds: ["ras-29"] });
    expect(cov.advisoryDiameters).toContain(29);
    // Only the 29/360 natives are counted — the 29RAS steps aren't resolved.
    expect(cov.reloads.length).toBe(reloadsForCase("RMS-29/360").length);
  });
});

describe("unlockSuggestions — what to buy next", () => {
  it("returns nothing for an empty kit", () => {
    expect(unlockSuggestions({ caseIds: [], adapterIds: [] })).toEqual([]);
  });

  it("suggests the 38RAS to a 38/360 owner, with a real added count", () => {
    const s = unlockSuggestions({ caseIds: ["rms-38-360"], adapterIds: [] });
    const ras = s.find((x) => x.id === "ras-38");
    expect(ras).toBeDefined();
    expect(ras!.kind).toBe("adapter");
    expect(ras!.added).toBeGreaterThan(0);
    expect(ras!.advisory).toBe(false);
  });

  it("ranks by reloads added, and every suggestion is currently unowned", () => {
    const owned = { caseIds: ["rms-38-360"], adapterIds: [] };
    const s = unlockSuggestions(owned, 10);
    for (let i = 1; i < s.length; i++) {
      // Non-advisory suggestions are sorted by `added` descending.
      if (!s[i].advisory && !s[i - 1].advisory) {
        expect(s[i].added).toBeLessThanOrEqual(s[i - 1].added);
      }
    }
    expect(s.every((x) => !owned.caseIds.includes(x.id) && !owned.adapterIds.includes(x.id))).toBe(true);
  });

  it("only suggests an adapter when a case in its diameter is owned", () => {
    // A 24 mm-only kit should never be told to buy a 38RAS.
    const s = unlockSuggestions({ caseIds: ["rms-24-40"], adapterIds: [] });
    expect(s.find((x) => x.id === "ras-38")).toBeUndefined();
  });

  it("suggests an advisory adapter to a 29/240 owner, phrased without a number", () => {
    const s = unlockSuggestions({ caseIds: ["rms-29-240"], adapterIds: [] }, 20);
    const ras29 = s.find((x) => x.id === "ras-29");
    expect(ras29).toBeDefined();
    expect(ras29!.advisory).toBe(true);
    expect(ras29!.added).toBe(0);
  });
});
