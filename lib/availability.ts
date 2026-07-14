// Best-effort live availability for a reload, read from the HPR Motor Finder — the sibling tool
// that owns cross-vendor stock and pricing. Muster stays what it is (the compatibility graph, a
// static offline shopping aid); this is a thin, optional signal layered on top: is the reload
// actually buyable right now?
//
// It reads the Motor Finder's per-motor page, whose schema.org `AggregateOffer`/`Offer` JSON-LD is
// rebuilt hourly and served with `Access-Control-Allow-Origin: *`, so Muster can fetch it directly
// from the browser — no server proxy (which the static/free-tier rules forbid), no new data mirror.
// AVAILABILITY ONLY, never price: pricing stays the Motor Finder's job, and a safety-framed shopping
// aid shouldn't grow a price tag. Every failure path — offline, blocked, or a changed page shape —
// resolves to `null`, so the caller renders nothing and Muster's own answer is never blocked.

import { checkStockUrl } from "./links";

export interface Availability {
  /** At least one vendor has the reload in stock. */
  anyInStock: boolean;
  /** How many vendors have it in stock, when the per-vendor breakdown is present (else null). */
  inStock: number | null;
  /** Total vendors listing it. */
  vendors: number;
}

// schema.org availability values are URLs like "https://schema.org/InStock". "OutOfStock" does not
// contain "instock", so this cleanly matches in-stock only; anything else (limited, preorder,
// discontinued) counts as not-in-stock, which is the conservative read.
const IN_STOCK = /instock/i;

/**
 * Pull availability out of a Motor Finder per-motor page's schema.org JSON-LD. Pure and deliberately
 * tolerant: no block, invalid JSON, or no offers all return null so the UI shows nothing rather than
 * guessing. Prefers the per-vendor `Offer` breakdown (exact in-stock count); falls back to the
 * `AggregateOffer` summary when only that is present.
 */
export function extractAvailability(html: string): Availability | null {
  const block = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/i);
  if (!block) return null;
  let data: unknown;
  try {
    data = JSON.parse(block[1].replace(/\\u003c/gi, "<"));
  } catch {
    return null;
  }

  const offers: Array<{ availability?: unknown }> = [];
  let aggregate: { offerCount?: unknown; availability?: unknown } | undefined;
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!node || typeof node !== "object") return;
    const o = node as Record<string, unknown>;
    if (o["@type"] === "Offer") offers.push(o);
    if (o["@type"] === "AggregateOffer") aggregate = o;
    for (const v of Object.values(o)) walk(v);
  };
  walk(data);

  const inStockOf = (a: unknown) => typeof a === "string" && IN_STOCK.test(a);

  if (offers.length > 0) {
    const inStock = offers.filter((o) => inStockOf(o.availability)).length;
    return { anyInStock: inStock > 0, inStock, vendors: offers.length };
  }
  if (aggregate) {
    const vendors = typeof aggregate.offerCount === "number" ? aggregate.offerCount : 0;
    if (vendors <= 0) return null;
    return { anyInStock: inStockOf(aggregate.availability), inStock: null, vendors };
  }
  return null;
}

// A hung Motor Finder response shouldn't leave the app's one network request pending indefinitely.
// It's a best-effort supplementary signal, so bound the wait — a badge that would arrive many
// seconds late is no use, and the fail-silent path turns a timeout into "no badge" like any error.
const TIMEOUT_MS = 6000;

/**
 * Fetch live availability for a reload from the Motor Finder. Client-side against a CORS-open source,
 * bounded by a timeout and by the caller's own abort signal; any failure resolves to null (never
 * throws), so this is safe to call from a component effect and safe to run offline — it just yields
 * nothing.
 */
export async function fetchAvailability(
  reload: { manufacturer: string; designation: string },
  signal?: AbortSignal,
): Promise<Availability | null> {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort);
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(checkStockUrl(reload), { signal: ctrl.signal });
    if (!res.ok) return null;
    return extractAvailability(await res.text());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
