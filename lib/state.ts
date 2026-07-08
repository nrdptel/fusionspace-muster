// URL state — the whole selection lives in the query string, so a resolved view is a
// link you can share or bookmark, matching the Motor Finder and Charge. Pure functions;
// the component owns the History API.
//
//   ?have=case&case=<id>      "I have this case — what fits it?"
//   ?have=reload&reload=<id>  "I want to fly this reload — what hardware?"
//   &pick=<reloadId|caseId>   the selected result within that view (for the shopping list)

export type Mode = "case" | "reload";

export interface AppState {
  mode: Mode;
  /** Selected case id (mode "case"). */
  caseId?: string;
  /** Selected reload id (mode "reload"). */
  reloadId?: string;
  /** The result the user drilled into, for the shopping list. */
  pick?: string;
}

export function parseState(search: string): AppState {
  const p = new URLSearchParams(search);
  const mode: Mode = p.get("have") === "reload" ? "reload" : "case";
  return {
    mode,
    caseId: p.get("case") || undefined,
    reloadId: p.get("reload") || undefined,
    pick: p.get("pick") || undefined,
  };
}

export function toQuery(state: AppState): string {
  const p = new URLSearchParams();
  p.set("have", state.mode);
  if (state.mode === "case" && state.caseId) p.set("case", state.caseId);
  if (state.mode === "reload" && state.reloadId) p.set("reload", state.reloadId);
  if (state.pick) p.set("pick", state.pick);
  const s = p.toString();
  return s ? `?${s}` : "";
}
