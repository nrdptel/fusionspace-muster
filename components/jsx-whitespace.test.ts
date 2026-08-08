import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** The JSX compiler (SWC, via Next) drops the LEADING space of a run of JSX text when that run
 *  both spans more than one source line and contains an HTML entity. It's the combination that
 *  bites — either alone is fine:
 *
 *    <p>… a distinct <strong>crossload</strong> caution — never a       ← space survives
 *       green direct fit — with each maker's own conditions.</p>
 *
 *    <p>… a distinct <strong>crossload</strong> caution — never a       ← space is EATEN
 *       green &ldquo;direct fit&rdquo; — with each maker&apos;s own conditions.</p>
 *
 *  The second renders as "crossloadcaution". That's invisible in review — the source has a space
 *  right there — and prose here is entity-dense (&apos; is mandatory under react/no-unescaped-
 *  entities, &nbsp; holds "38 mm" together), so the trap is easy to walk back into. The fix is an
 *  explicit {" "} at the boundary: a real expression, immune to whitespace folding.
 *
 *  This guards the whole JSX surface rather than the paragraphs that were wrong once, because the
 *  next occurrence will be in whichever component someone reflows next. If it fires, don't delete
 *  the space — move it into {" "}. */
describe("JSX text whitespace", () => {
  // A run of JSX text starts after a tag's `>` or an expression's `}` and ends at the next `<`
  // or `{`. Only a run that starts with a real space (not a newline) has a space to lose; the
  // lookbehind keeps arrow functions (`=>`) out of it.
  const RUN = /(?<![=-])[>}]([ \t][^<{]*)/g;
  const ENTITY = /&(?:[a-zA-Z]+|#\d+);/;

  // Comments describe this trap (and JSX comments are `{/* … */}`, which reads as a run), so blank
  // them before scanning or the guard flags its own documentation. Blanked rather than deleted so
  // offsets — and the line numbers reported below — still line up. `(?<!:)` spares `https://`.
  function stripComments(src: string): string {
    const blank = (m: string) => m.replace(/[^\n]/g, " ");
    return src.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(?<!:)\/\/[^\n]*/g, blank);
  }

  function jsxFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return jsxFiles(p);
      return e.name.endsWith(".tsx") ? [p] : [];
    });
  }

  it("never leaves a space where the compiler would eat it", () => {
    const root = path.resolve(__dirname, "..");
    const offenders: string[] = [];

    const files = ["components", "app"].flatMap((d) => jsxFiles(path.join(root, d)));

    for (const file of files) {
      const src = stripComments(readFileSync(file, "utf8"));
      for (const m of src.matchAll(RUN)) {
        const run = m[1];
        if (!run.includes("\n") || !ENTITY.test(run)) continue;
        const line = src.slice(0, m.index).split("\n").length;
        offenders.push(`${path.relative(root, file)}:${line} — "…${run.split("\n")[0].trim()}"`);
      }
    }

    const hint = `leading space would be dropped at render — use {" "} instead:\n${offenders.join("\n")}`;
    expect(offenders, hint).toEqual([]);
  });

  it("detects the pattern it's meant to catch", () => {
    // Proves the matcher still works if the regex is ever touched: the entity-carrying multi-line
    // run is flagged, the identical run without an entity is not.
    const bad = `<p>x <strong>b</strong> tail one\n  tail &apos;two</p>`;
    const good = `<p>x <strong>b</strong> tail one\n  tail two</p>`;
    const flags = (s: string) =>
      [...s.matchAll(RUN)].some(([, run]) => run.includes("\n") && ENTITY.test(run));

    expect(flags(bad)).toBe(true);
    expect(flags(good)).toBe(false);
  });
});
