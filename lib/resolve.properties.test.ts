import { describe, it, expect } from "vitest";
import type { Reload } from "./data/types";
import { allCases, allReloads, caseByDesignation } from "./graph";
import { resolveCase, resolveReload, shoppingList } from "./resolve";

// Property tests over the WHOLE catalog, not spot cases. The build-time contract in
// ./validate guards the data graph; these guard the RESOLVER's output across every reload
// and case — the safety invariants a flyer relies on, checked for all ~540 reloads / ~88
// cases so a resolver-logic regression can't slip through on an un-sampled entry.

const RELOADS = allReloads();
const CASES = allCases();

describe("resolveReload — holds for every reload", () => {
  it("resolves each reload to a native case whose designation is its caseInfo", () => {
    for (const r of RELOADS) {
      const res = resolveReload(r);
      expect(res.native, `${r.designation} has no native case`).toBeTruthy();
      expect(res.native!.motorCase.designation).toBe(r.caseInfo);
      expect(res.native!.fit).toBe("native");
      expect(res.native!.spacers).toBe(0);
    }
  });

  it("never crosses brand or diameter — every case that flies a reload matches both", () => {
    for (const r of RELOADS) {
      const res = resolveReload(r);
      const cases = [res.native, ...res.viaAdapter].filter(Boolean).map((f) => f!.motorCase);
      for (const c of cases) {
        expect(c.manufacturer, `${r.designation} → ${c.designation} brand`).toBe(r.manufacturer);
        expect(c.diameter, `${r.designation} → ${c.designation} diameter`).toBe(r.diameter);
      }
    }
  });

  it("only ever fills a LONGER case with a shorter reload — spacer fits step up in length, 1–2 spacers", () => {
    for (const r of RELOADS) {
      const native = caseByDesignation(r.caseInfo)!;
      for (const f of resolveReload(r).viaAdapter) {
        // The base (owned) case must be longer than the reload's own case.
        expect(f.motorCase.slot, `${f.motorCase.designation} not longer than ${native.designation}`).toBeGreaterThan(native.slot);
        expect([1, 2]).toContain(f.spacers);
        expect(f.adapter, `${r.designation} spacer fit lacks an adapter`).toBeTruthy();
      }
    }
  });
});

describe("resolveCase — holds for every case", () => {
  it("native reloads are exactly the reloads built for the case, same brand + diameter", () => {
    for (const c of CASES) {
      const res = resolveCase(c);
      for (const f of res.native) {
        expect(f.fit).toBe("native");
        expect(f.spacers).toBe(0);
        expect(f.reload.caseInfo).toBe(c.designation);
        expect(f.reload.manufacturer).toBe(c.manufacturer);
        expect(f.reload.diameter).toBe(c.diameter);
      }
    }
  });

  it("spacer fits fly a shorter reload than the case, and never one already native to it", () => {
    for (const c of CASES) {
      const res = resolveCase(c);
      const nativeIds = new Set(res.native.map((f) => f.reload.id));
      for (const f of res.viaAdapter) {
        expect(f.fit).toBe("adapter");
        expect([1, 2]).toContain(f.spacers);
        expect(f.reload.manufacturer).toBe(c.manufacturer);
        expect(f.reload.diameter).toBe(c.diameter);
        // The reload's own (shorter) case is shorter than this one.
        const own = caseByDesignation(f.reload.caseInfo)!;
        expect(own.slot, `${c.designation} spacer-flies ${f.reload.designation} (not shorter)`).toBeLessThan(c.slot);
        // A spacer fit is never something the case already flies directly.
        expect(nativeIds.has(f.reload.id)).toBe(false);
      }
    }
  });

  it("round-trips: every reload a case flies lists that case back", () => {
    for (const c of CASES) {
      for (const f of [...resolveCase(c).native, ...resolveCase(c).viaAdapter]) {
        const back = resolveReload(f.reload);
        const designations = [back.native, ...back.viaAdapter].filter(Boolean).map((x) => x!.motorCase.designation);
        expect(designations, `${f.reload.designation} does not list ${c.designation}`).toContain(c.designation);
      }
    }
  });
});

describe("shoppingList — holds for every case + its native reload", () => {
  it("always lists the case, at least one reusable item, the reload, and a source on everything", () => {
    for (const c of CASES) {
      const first = resolveCase(c).native[0];
      if (!first) continue; // a case with no listed reloads has no shopping list to build
      const list = shoppingList(c, first.reload, "native", 0);
      expect(list.reusable.length).toBeGreaterThan(0);
      expect(list.reusable.some((i) => i.name.includes(`${c.designation} case`))).toBe(true);
      expect(list.consumable.name).toContain(first.reload.designation);
      for (const item of [...list.reusable, list.consumable]) {
        expect(item.sources.length, `${item.name} has no source`).toBeGreaterThan(0);
        for (const s of item.sources) expect(s).toMatch(/^https?:\/\//);
      }
    }
  });
});

describe("shoppingList — the conservative safety notes fire for every reload that needs them", () => {
  // Muster frames conservatively (a wrong or missing warning is a safety problem, not a typo).
  // These notes are the load-bearing cautions a flyer relies on; the spot tests above check one
  // example each, but a resolver refactor could silently drop a note for a whole *class* of
  // reloads. Guard each across the WHOLE catalog, keyed off the same flag the note is.
  const listFor = (r: Reload) => shoppingList(caseByDesignation(r.caseInfo)!, r, "native", 0);

  it("every plugged reload is flagged electronic-deployment-only, and never claims an ejection charge", () => {
    const plugged = RELOADS.filter((r) => !r.ejectionCharge);
    expect(plugged.length).toBeGreaterThan(0);
    for (const r of plugged) {
      const list = listFor(r);
      expect(
        list.notes.some((n) => n.toLowerCase().includes("electronic deployment")),
        `${r.designation} lacks the electronic-deployment note`,
      ).toBe(true);
      const detail = (list.consumable.detail ?? "").toLowerCase();
      expect(detail).toContain("no ejection charge");
      expect(detail).not.toContain(", and ejection charge");
    }
  });

  it("every sparky reload carries the field-restriction warning", () => {
    const sparky = RELOADS.filter((r) => r.sparky);
    expect(sparky.length).toBeGreaterThan(0);
    for (const r of sparky) {
      const notes = listFor(r).notes.map((n) => n.toLowerCase());
      expect(
        notes.some((n) => n.includes("sparky") && n.includes("restrict")),
        `${r.designation} lacks the sparky field-restriction note`,
      ).toBe(true);
    }
  });

  it("every out-of-production reload is flagged, and never called decertified", () => {
    const oop = RELOADS.filter((r) => r.availability === "OOP");
    expect(oop.length).toBeGreaterThan(0);
    for (const r of oop) {
      const note = listFor(r).notes.find((n) => n.toLowerCase().includes("out of production"));
      expect(note, `${r.designation} lacks the out-of-production note`).toBeTruthy();
      expect(note!.toLowerCase()).toContain("not the same as decertified");
    }
  });

  it("every Loki reload surfaces the graphite-nozzle throat-number constraint", () => {
    const loki = RELOADS.filter((r) => r.system === "Loki");
    expect(loki.length).toBeGreaterThan(0);
    for (const r of loki) {
      expect(
        listFor(r).notes.some((n) => n.toLowerCase().includes("throat")),
        `${r.designation} lacks the graphite-nozzle throat note`,
      ).toBe(true);
    }
  });

  it("no reload ever ships a blank or non-string note", () => {
    for (const r of RELOADS) {
      for (const n of listFor(r).notes) {
        expect(typeof n).toBe("string");
        expect(n.trim().length, `${r.designation} has a blank note`).toBeGreaterThan(0);
      }
    }
  });
});
