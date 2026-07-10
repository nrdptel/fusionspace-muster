import { describe, it, expect } from "vitest";
import { parseState, toQuery, type AppState } from "./state";
import { allCases, allReloads } from "./graph";

// Every shareable / bookmarkable view in Muster is just the query string round-tripping through
// these two pure functions: MusterApp reads parseState() on mount and writes toQuery() on every
// change. "A resolved view is a link you can share" is a core product promise, and this is the
// only pure module behind it that had no test — a refactor here, or a ThrustCurve refresh that
// renamed an id, could silently break sharing with nothing else to catch it. These lock the
// contract: the encoding is opaque about *what* an id means (that's the resolver's job, tested
// elsewhere), so a valid selection always survives the URL, catalog-wide.

// Well-formed selections: only the active mode's own id is set. Arbitrary string ids on purpose —
// parseState/toQuery never validate existence, so the contract must hold for any id, not just
// catalog ones.
const SAMPLES: AppState[] = [
  { mode: "case" },
  { mode: "reload" },
  { mode: "case", caseId: "some-case" },
  { mode: "reload", reloadId: "some-reload" },
  { mode: "case", caseId: "some-case", pick: "some-reload" },
  { mode: "reload", reloadId: "some-reload", pick: "some-case" },
];

describe("toQuery / parseState round-trip", () => {
  it("recovers a well-formed selection exactly", () => {
    for (const s of SAMPLES) {
      expect(parseState(toQuery(s))).toEqual(s);
    }
  });

  it("round-trips every real case selection, with and without a picked reload", () => {
    const somePick = allReloads()[0].id;
    for (const c of allCases()) {
      const bare: AppState = { mode: "case", caseId: c.id };
      expect(parseState(toQuery(bare))).toEqual(bare);
      // The shopping-list URL: a case plus the reload the user drilled into.
      const withPick: AppState = { mode: "case", caseId: c.id, pick: somePick };
      expect(parseState(toQuery(withPick))).toEqual(withPick);
    }
  });

  it("round-trips every real reload selection, with and without a picked case", () => {
    const somePick = allCases()[0].id;
    for (const r of allReloads()) {
      const bare: AppState = { mode: "reload", reloadId: r.id };
      expect(parseState(toQuery(bare))).toEqual(bare);
      const withPick: AppState = { mode: "reload", reloadId: r.id, pick: somePick };
      expect(parseState(toQuery(withPick))).toEqual(withPick);
    }
  });
});

describe("toQuery — mode-appropriate serialization", () => {
  it("emits only the active mode's id, never the other mode's (no stale-id leak)", () => {
    // A case view carrying a leftover reloadId must not serialize it — otherwise a shared link
    // could resurrect a selection from the other direction on the recipient's screen.
    expect(toQuery({ mode: "case", caseId: "c", reloadId: "r" })).toBe("?have=case&case=c");
    expect(toQuery({ mode: "reload", reloadId: "r", caseId: "c" })).toBe("?have=reload&reload=r");
  });

  it("always pins the mode: a canonical, non-empty query for every state", () => {
    // MusterApp writes `pathname + toQuery(state) + hash` on every change, so toQuery must always
    // encode the mode — the URL is never a bare path that would lose the search direction.
    for (const s of SAMPLES) {
      expect(toQuery(s)).toMatch(/^\?have=(case|reload)/);
    }
  });
});

describe("parseState — robust to hand-edited, stale, or decorated links", () => {
  it("defaults to case mode on an empty or unknown 'have'", () => {
    expect(parseState("").mode).toBe("case");
    expect(parseState("?have=banana").mode).toBe("case");
    expect(parseState("?have=reload").mode).toBe("reload");
  });

  it("treats an empty parameter value as absent", () => {
    const s = parseState("?have=case&case=&pick=");
    expect(s.caseId).toBeUndefined();
    expect(s.pick).toBeUndefined();
  });

  it("keeps the pick in both directions", () => {
    expect(parseState("?have=case&case=c&pick=p").pick).toBe("p");
    expect(parseState("?have=reload&reload=r&pick=p").pick).toBe("p");
  });

  it("ignores unrelated params a shared link picks up (utm, ref)", () => {
    const s = parseState("?have=reload&reload=r&utm_source=chat&ref=abc");
    expect(s).toEqual({ mode: "reload", reloadId: "r" });
  });

  it("self-heals a stray other-mode id on the next round-trip", () => {
    // A legacy or hand-edited link might carry both ids; the mode governs, and toQuery drops the
    // off-mode one, so re-serializing yields a clean, canonical selection.
    const parsed = parseState("?have=case&case=c&reload=r");
    expect(parsed.caseId).toBe("c");
    expect(parseState(toQuery(parsed))).toEqual({ mode: "case", caseId: "c" });
  });
});
