// Reconcile the committed reload mirror against the live ThrustCurve catalog.
//
// The reload catalog (lib/data/reloads.json) is a hand-refreshed static mirror of
// ThrustCurve — the largest body of safety-critical data in Muster. Its integrity
// *test* (lib/data/reloads.test.ts) proves the committed file is well-formed, but it
// can't see the one thing a static mirror is always at risk of: drift from the live
// source. A motor gets a new certification, an availability flips to out-of-production,
// a weight is corrected — and the mirror silently lags until someone notices.
//
// This is the reproducible refresh/audit tool that closes that gap. It fetches the
// in-scope reloads from the ThrustCurve API, applies the SAME scope + normalization the
// mirror uses, and diffs the result against the committed file — reporting motors that
// are new on ThrustCurve, motors the mirror carries that ThrustCurve no longer lists in
// scope, and any *material* field change on a matched motor. It's read-only: it prints a
// report and exits non-zero when it finds anything, so a maintainer runs it, reviews the
// findings against the reload's instructions, and applies only what's warranted (the same
// conservative bar every data change clears). It is NOT part of the build or CI — the
// static export stays hermetic and offline-buildable; this reaches the network only when
// a human runs `npm run reconcile`.
//
// Numeric comparison is tolerance-based on purpose. The stored values are rounded to the
// precision Muster displays (integer thrust, one-decimal impulse/weights, integer mm), so
// sub-unit rounding noise between an old fetch and a fresh one is not "drift" — only a
// change large enough to move a displayed number is worth a maintainer's eyes.

const API = "https://www.thrustcurve.org/api/v1/search.json";
const MIRROR_PATH = new URL("../lib/data/reloads.json", import.meta.url);

// Scope: the three currently-modeled systems, at the diameters Muster covers. A reload
// outside these — a smaller AeroTech single-use size, Loki's on-hold 98 mm — is out of
// scope by design, not missing. Kept here as the one authoritative statement of membership.
const SCOPE_DIAMETERS = {
  AeroTech: new Set([24, 29, 38, 54, 75, 98]),
  Cesaroni: new Set([24, 29, 38, 54, 75, 98]),
  Loki: new Set([38, 54, 76]),
};

// ThrustCurve spells the cert body out; the mirror stores the abbreviation the UI shows.
const CERT_ABBREV = {
  "National Association of Rocketry": "NAR",
  "Tripoli Rocketry Association, Inc.": "TRA",
  "Canadian Association of Rocketry": "CAR",
};

const round1 = (n) => Math.round(n * 10) / 10;

/** True when a raw ThrustCurve record is one Muster mirrors: a modeled brand, a covered
 *  diameter, and a case (the membership rule — a reload with no case can't be placed in the
 *  compatibility graph, so it isn't carried). */
export function inScope(m) {
  const brand = m.manufacturerAbbrev;
  const diameters = SCOPE_DIAMETERS[brand];
  return Boolean(diameters && m.caseInfo && diameters.has(m.diameter));
}

/** Map a raw ThrustCurve record to the mirror's normalized shape (minus the derived id/tcUrl,
 *  which are pure functions of manufacturer + designation). Rounds each number to the precision
 *  the mirror stores, so a comparison sees data, not float noise. */
export function normalize(m) {
  const plugged = String(m.delays ?? "").trim().toUpperCase() === "P";
  const out = {
    designation: m.designation,
    commonName: m.commonName,
    manufacturer: m.manufacturerAbbrev,
    impulseClass: m.impulseClass,
    diameter: m.diameter,
    caseInfo: m.caseInfo,
    avgThrustN: Math.round(m.avgThrustN),
    totImpulseNs: round1(m.totImpulseNs),
    lengthMm: m.length != null ? Math.round(m.length) : undefined,
    totalWeightG: m.totalWeightG != null ? round1(m.totalWeightG) : undefined,
    propWeightG: m.propWeightG != null ? round1(m.propWeightG) : undefined,
    propName: m.propInfo ?? null,
    sparky: Boolean(m.sparky),
    delays: String(m.delays ?? ""),
    delayAdjustable: Boolean(m.delayAdjustable),
    plugged,
    ejectionCharge: !plugged,
    availability: m.availability,
    certOrg: CERT_ABBREV[m.certOrg] ?? null,
    motorId: m.motorId,
  };
  // Propellant is a subset of the loaded weight; a source point where it isn't is a bad
  // record, not a figure to mirror (the mirror drops it rather than assert the impossible).
  if (out.propWeightG != null && out.totalWeightG != null && out.propWeightG > out.totalWeightG) {
    out.propWeightG = undefined;
  }
  return out;
}

// How much a number must move to count as a real change rather than rounding noise. A stored
// value and a fresh fetch can land on opposite sides of a rounding boundary (a ~1232.5 mm length
// rounds to 1232 or 1233 depending on nothing that matters), so length allows 2 mm of slack — no
// real ThrustCurve length revision is that small. The others are already at display precision.
const NUM_TOLERANCE = { avgThrustN: 1, totImpulseNs: 0.5, lengthMm: 2, totalWeightG: 0.5, propWeightG: 0.5 };
// Categorical fields where any difference is material.
const EXACT_FIELDS = [
  "designation", "commonName", "manufacturer", "impulseClass", "diameter", "caseInfo",
  "propName", "sparky", "delays", "delayAdjustable", "plugged", "ejectionCharge",
  "availability", "certOrg",
];

/** The material differences between a committed row and a freshly-normalized one — an empty
 *  list means "the same motor, no change worth surfacing." */
export function materialDiff(committed, live) {
  const diffs = [];
  for (const f of EXACT_FIELDS) {
    const a = committed[f] ?? null;
    const b = live[f] ?? null;
    if (a !== b) diffs.push(`${f}: ${JSON.stringify(a)} -> ${JSON.stringify(b)}`);
  }
  for (const [f, tol] of Object.entries(NUM_TOLERANCE)) {
    const a = committed[f];
    const b = live[f];
    if (a == null && b == null) continue;
    if (a == null || b == null) diffs.push(`${f}: ${JSON.stringify(a ?? null)} -> ${JSON.stringify(b ?? null)}`);
    else if (Math.abs(a - b) >= tol) diffs.push(`${f}: ${a} -> ${b}`);
  }
  return diffs;
}

/** Partition the freshly-normalized live catalog against the committed mirror, keyed by motorId:
 *  motors new on ThrustCurve, motors the mirror carries that live scope no longer lists, and
 *  matched motors whose fields have materially changed. Pure — the testable heart of the audit,
 *  so a bug here (a missed change reported as "in sync") fails a unit test, not a flyer. */
export function diffMirror(committed, live) {
  const committedById = new Map(committed.map((r) => [r.motorId, r]));
  const liveById = new Map(live.map((r) => [r.motorId, r]));
  const added = live.filter((r) => !committedById.has(r.motorId));
  const removed = committed.filter((r) => !liveById.has(r.motorId));
  const changed = [];
  for (const l of liveById.values()) {
    const c = committedById.get(l.motorId);
    if (!c) continue;
    const diffs = materialDiff(c, l);
    if (diffs.length) changed.push({ committed: c, diffs });
  }
  return { added, removed, changed };
}

async function fetchReloads(brand) {
  const res = await fetch(API, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ manufacturer: brand, type: "reload", maxResults: 5000 }),
  });
  if (!res.ok) throw new Error(`ThrustCurve ${brand}: HTTP ${res.status}`);
  const json = await res.json();
  return json.results ?? [];
}

async function main() {
  const { readFileSync } = await import("node:fs");
  const mirror = JSON.parse(readFileSync(MIRROR_PATH, "utf8"));

  const raw = [];
  for (const brand of Object.keys(SCOPE_DIAMETERS)) raw.push(...(await fetchReloads(brand)));
  const live = raw.filter(inScope).map(normalize);
  const { added, removed, changed } = diffMirror(mirror.reloads, live);

  console.log(`ThrustCurve in-scope: ${live.length}   mirror: ${mirror.reloads.length}   (last fetched ${mirror._fetched})\n`);

  console.log(`New on ThrustCurve, not in the mirror: ${added.length}`);
  for (const m of added) console.log(`  + ${m.manufacturer} ${m.designation} — ${m.diameter}mm ${m.caseInfo}, ${m.certOrg ?? "uncertified"}, ${m.availability}`);

  console.log(`\nIn the mirror, no longer in ThrustCurve scope: ${removed.length}`);
  for (const m of removed) console.log(`  - ${m.manufacturer} ${m.designation} — ${m.diameter}mm ${m.caseInfo}`);

  console.log(`\nMaterial field changes on matched motors: ${changed.length}`);
  for (const { committed, diffs } of changed) console.log(`  ~ ${committed.manufacturer} ${committed.designation}: ${diffs.join(" | ")}`);

  const total = added.length + removed.length + changed.length;
  console.log(`\n${total === 0 ? "In sync — no material drift from ThrustCurve." : `${total} item(s) to review. Apply only what the reload's instructions and the cert org confirm.`}`);
  process.exitCode = total === 0 ? 0 : 1;
}

// Only hit the network when run directly, so the pure helpers above can be imported and tested.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exitCode = 2;
  });
}
