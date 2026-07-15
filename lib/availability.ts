// Live availability from the Motor Finder — the sibling tool that owns cross-vendor stock. Muster
// stays what it is (a static, offline compatibility graph); this is a thin, optional signal on top:
// is a reload buyable right now, and at how many vendors?
//
// It reads ONE small static file — the Motor Finder's `availability.json`, rebuilt hourly and served
// with `Access-Control-Allow-Origin: *` — so Muster fetches it client-side (no server proxy, which the
// static/free-tier rules forbid) once per page and reuses it for every reload on the page, including a
// whole case's list. AVAILABILITY ONLY, never price: pricing stays the Motor Finder's job. Every
// failure path — offline, blocked, a motor the Motor Finder doesn't track, a changed feed shape —
// yields no badge, so Muster's own (bundled, offline) answer is never blocked.

export interface Availability {
  /** At least one vendor has the reload in stock. */
  anyInStock: boolean;
  /** How many vendors have it in stock. */
  inStock: number;
  /** Total vendors listing it. */
  vendors: number;
}

/** The Motor Finder's bulk availability feed: one JSON, keyed like its motor URLs. */
const FEED_URL = "https://motor.fusionspace.co/availability.json";
const TIMEOUT_MS = 6000;

interface Entry {
  vendors: number;
  inStock: number;
}

/** The feed's key for a reload: "<lowercase-manufacturer>/<designation>", matching the Motor Finder's
 *  own `/motor/<mfr>/<designation>` URLs (both keyed off the shared ThrustCurve identity). */
export function feedKey(reload: { manufacturer: string; designation: string }): string {
  return `${reload.manufacturer.toLowerCase()}/${reload.designation}`;
}

/** Look a reload up in a parsed feed. Returns null when the Motor Finder doesn't track it. */
export function availabilityOf(
  feed: Map<string, Entry>,
  reload: { manufacturer: string; designation: string },
): Availability | null {
  const entry = feed.get(feedKey(reload));
  if (!entry) return null;
  return { anyInStock: entry.inStock > 0, inStock: entry.inStock, vendors: entry.vendors };
}

/** Parse the feed JSON into a lookup map. Pure and tolerant: any unexpected shape (or a bad entry)
 *  is skipped, so a malformed feed degrades to "no badges" rather than a wrong or thrown result. */
export function parseFeed(json: unknown): Map<string, Entry> {
  const map = new Map<string, Entry>();
  if (!json || typeof json !== "object") return map;
  const motors = (json as { motors?: unknown }).motors;
  if (!motors || typeof motors !== "object") return map;
  for (const [key, value] of Object.entries(motors as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const { vendors, inStock } = value as { vendors?: unknown; inStock?: unknown };
    if (typeof vendors === "number" && typeof inStock === "number" && vendors >= 0 && inStock >= 0) {
      map.set(key, { vendors, inStock });
    }
  }
  return map;
}

// One fetch per page, shared by every badge on it (a case page renders ~30). Memoized as a promise so
// concurrent callers share the in-flight request; any failure resolves to an empty map.
let feed: Promise<Map<string, Entry>> | null = null;

export function getAvailabilityFeed(): Promise<Map<string, Entry>> {
  if (!feed) feed = loadFeed();
  return feed;
}

async function loadFeed(): Promise<Map<string, Entry>> {
  try {
    const res = await fetch(FEED_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return new Map();
    return parseFeed(await res.json());
  } catch {
    return new Map();
  }
}

/** Reset the memoized feed — for tests only. */
export function __resetAvailabilityFeed(): void {
  feed = null;
}
