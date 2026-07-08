"use client";

import { useCallback, useEffect, useState } from "react";
import { caseById, reloadById } from "@/lib/graph";
import { resolveCase, resolveReload } from "@/lib/resolve";
import { parseState, toQuery, type AppState, type Mode } from "@/lib/state";
import { Segmented } from "./ui";
import CasePicker from "./CasePicker";
import ReloadPicker from "./ReloadPicker";
import CaseResult from "./CaseResult";
import ReloadResult from "./ReloadResult";
import HardwareList from "./HardwareList";

/** The tool. Two directions — start from a case or from a reload — both landing on a
 *  shopping list. The whole selection lives in the URL, so any view is a shareable link. */
export default function MusterApp() {
  const [state, setState] = useState<AppState>({ mode: "case" });
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  // Hydrate from the URL on mount (a shared/bookmarked view), then keep the two in sync.
  useEffect(() => {
    setState(parseState(window.location.search));
    setMounted(true);
  }, []);

  const update = useCallback((next: AppState) => {
    setState(next);
    const url = window.location.pathname + toQuery(next) + window.location.hash;
    window.history.replaceState(null, "", url);
  }, []);

  const setMode = (mode: Mode) => update({ mode });
  const setCase = (caseId: string) => update({ mode: "case", caseId, pick: undefined });
  const setReload = (reloadId: string) => update({ mode: "reload", reloadId, pick: undefined });
  const setPick = (pick: string) => update({ ...state, pick });

  const shareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  };

  // Resolve the shopping list for the current pick, recovering how it fits.
  let list: React.ReactNode = null;
  if (state.mode === "case" && state.caseId && state.pick) {
    const c = caseById(state.caseId);
    if (c) {
      const res = resolveCase(c);
      const fit = [...res.native, ...res.viaAdapter].find((f) => f.reload.id === state.pick);
      if (fit) list = <HardwareList motorCase={c} reload={fit.reload} fit={fit.fit} spacers={fit.spacers} />;
    }
  } else if (state.mode === "reload" && state.reloadId && state.pick) {
    const r = reloadById(state.reloadId);
    if (r) {
      const res = resolveReload(r);
      const fit = [res.native, ...res.viaAdapter].find((f) => f && f.motorCase.id === state.pick);
      if (fit) list = <HardwareList motorCase={fit.motorCase} reload={r} fit={fit.fit} spacers={fit.spacers} />;
    }
  }

  const selectedCase = state.caseId ? caseById(state.caseId) : undefined;
  const selectedReload = state.reloadId ? reloadById(state.reloadId) : undefined;
  const hasResult = (state.mode === "case" && selectedCase) || (state.mode === "reload" && selectedReload);

  // Render a stable shell until mounted so the first client paint matches the server HTML
  // (URL-derived selection is applied after hydration).
  const view = mounted ? state : ({ mode: "case" } as AppState);

  return (
    <section id="tool" className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          ariaLabel="Search direction"
          value={view.mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: "case", label: "I have a case" },
            { value: "reload", label: "I have a reload" },
          ]}
        />
        {hasResult && (
          <button
            type="button"
            onClick={shareLink}
            className="rounded-md border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {copied ? "Link copied ✓" : "Share this view"}
          </button>
        )}
      </div>

      <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/30 sm:p-5">
        {view.mode === "case" ? (
          <CasePicker value={view.caseId} onChange={setCase} />
        ) : (
          <ReloadPicker value={view.reloadId} onChange={setReload} />
        )}
      </div>

      <div id="result">
        {mounted && state.mode === "case" && selectedCase && (
          <CaseResult motorCase={selectedCase} pick={state.pick} onPick={setPick} />
        )}
        {mounted && state.mode === "reload" && selectedReload && (
          <ReloadResult reload={selectedReload} pick={state.pick} onPick={setPick} />
        )}
      </div>

      {list}
    </section>
  );
}
