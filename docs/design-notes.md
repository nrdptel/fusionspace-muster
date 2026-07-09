# Muster — design notes

My working read of how Muster fits Fusion Space, and the plan for it. Written down so it can
be corrected early rather than late. Not user-facing.

## 1. Fitting the family

Same hand as the hub, the Motor Finder, Charge, and Window — measured from those, not guessed:

- **Stack:** Next.js App Router, statically exported (`output: "export"`), Tailwind v4 with
  the stock `zinc` palette, Geist Sans + Geist Mono, TypeScript. Deployed to Cloudflare Pages
  via `cloudflare/wrangler-action`, `pages deploy out --project-name=fusionspace-muster
  --branch=main`. PWA manifest + service worker, full OG/Twitter meta, JSON-LD, the shared
  brand marks under `public/brand/`.
- **Palette:** `zinc` neutrals, `indigo` primary (buttons, focus ring, links, the selected
  state), `emerald` for a good/direct signal, `amber` for cautions. The brand mark's
  violet→blue gradient reads on both themes.
- **Chrome, reused verbatim:** the three-state theme toggle (`muster.theme`), the pre-paint
  theme script, the `FusionSpaceBadge` eyebrow, the Ko-fi "Tip" button, the footer (GitHub +
  sibling links + wordmark + non-affiliation line), the monthly observances bar, the
  service-worker update toast, and the OG card generated from the Motor Finder's exact
  template with only three strings changed.
- **Voice:** direct, a little warm, no hype. Safety is stated plainly and up top, not buried.
  Em dashes for asides.

State lives in the URL (a resolved view is a shareable link); the only `localStorage` is the
theme. No per-visitor server work — the whole dataset is bundled and the page resolves
client-side, which is what keeps it on Pages' free tier and makes offline trivial.

## 2. What Muster is, as a product

The first interactive answer to *what hardware do I need to fly this?* Reloadable motor
hardware is a compatibility graph — a case fits some reloads directly and others only with
spacers, each reload needs specific closures, some need a seal disc or a plugged closure — and
nobody had made that graph explorable. Muster does, both directions:

- **I have a case** → every reload it flies (direct + spacer fits) and the hardware for each.
- **I have a reload** → the cases and hardware that fly it, its own case and longer ones.

Both land on a **shopping list** that splits reusable hardware (buy once) from the single-use
reload (buy each flight), with part numbers and conservative notes.

### The data model (the bespoke value)

The whole thing is a small graph in `lib/`:

- **Reloads** (`lib/data/reloads.json`) — a static mirror of ThrustCurve: designation, class,
  impulse, thrust, delays, propellant, certification, the per-motor `tcUrl`, and — crucially —
  ThrustCurve's own per-motor `caseInfo`, which *is* the authoritative reload → case mapping. That
  `caseInfo` is also the mirror's **membership rule**: a reload with no case field can't be placed
  in the compatibility graph (Muster couldn't say what hardware it needs), and `validateGraph`
  enforces it — any reload whose `caseInfo` doesn't resolve to a known case fails `next build`. A
  2026-07 completeness audit against the live ThrustCurve API confirmed the mirror carries every
  in-scope reload (AeroTech 24–98 mm, Cesaroni 24–98 mm, Loki 38–76 mm); the only in-scope reloads
  it omits are three out-of-production motors ThrustCurve records with *no* `caseInfo` — correctly
  excluded, since inferring their case would be exactly the unsourced guess the safety rules forbid.
  Each reload's `tcUrl` is surfaced as a **"View on ThrustCurve"** link on its spec card and page,
  so a flyer can reach the authoritative specs and thrust curve — Muster mirrors ThrustCurve, so it
  should show its work.
- **Hardware** (`lib/data/hardware.ts`) — the curated half: cases (with the closures they
  share, the seal-disc rule, and adapter eligibility), the forward/aft closures, the seal
  discs, and the Reload Adapter System with its spacer table. Every node cites a source.
- **Resolver** (`lib/resolve.ts`) — pure functions: `resolveCase`, `resolveReload`,
  `shoppingList`. `fit` is never a boolean — it carries *how* (direct vs. adapter) and *how
  many spacers*, and each reload carries certification + production status. Two axes, because
  those are the two a flyer actually reasons about.

`lib/graph.ts` joins the two and **validates at build time** against a safety contract kept as
one pure, tested function (`lib/validate.ts`). It fails `next build` on a reload pointing at an
unknown case, an adapter rule that crosses diameters *or steps the wrong way* (a longer reload
into a shorter case — the CATO-class edge), a duplicate id or designation, a hardware node with
no source, or a reload whose brand/diameter disagrees with its case or whose plugged and
ejection-charge flags contradict each other. The contract is pure so it can be unit-tested
against deliberately-broken graphs, not just the real one. Cheap insurance for data that drives
hardware buying.

A second layer guards the **resolver's output**, not just the data: `lib/resolve.properties.test.ts`
runs the safety invariants over the *whole* catalog — every reload resolves to a native case that
matches its `caseInfo`; no fit ever crosses brand or diameter; every spacer fit fills a genuinely
longer case with a shorter reload (never the reverse) using one or two spacers and never a reload
the case already flies directly; the reload↔case mapping round-trips both ways; and every shopping
list names the case, carries a sourced reusable item, and names the reload. It also guards the
**conservative framing itself**, catalog-wide: every plugged reload's list flags electronic
deployment (and never claims an ejection charge), every sparky reload carries the field-restriction
warning, every out-of-production reload is flagged without being called decertified, every Loki
reload surfaces the graphite-nozzle throat constraint, and no reload ever ships a blank note — so a
resolver refactor can't quietly drop a load-bearing caution for a whole class of reloads. The
build-time contract catches a bad *node*; these catch a bad *edge in the resolver logic*, across all
~540 reloads and ~88 cases rather than a hand-picked sample.

Two user-facing artifacts that leave the site are guarded the same way. The **copy-list** text — what
someone pastes into a club chat or an order — is a pure `shoppingListText()` beside the resolver (not
inline in the button), tested to carry every part, and to *always* end with the conservative authority
line (build to the printed instructions; Muster is a shopping aid) so that framing can't quietly fall
out of a copy. The **Motor Finder cross-link** is checked across the whole catalog: every reload must
form a valid, single-segment URL with a known manufacturer slug, so a future ThrustCurve refresh can't
introduce a designation that silently breaks the outbound link. Both clipboard flows (copy list, share
view) are also driven in the e2e suite, which reads the clipboard back and asserts the contents.

### The one genuinely hard call: spacers

AeroTech has two different ways to fly a shorter reload in a longer case, and conflating them
would be a mistake:

1. **The mid-power `RMS-29/40-120`** range case: the shorter reloads carry their own spacers
   in the box. No separate hardware. Modeled as native fits.
2. **The high-power Reload Adapter System (RAS)**: a floating forward closure plus case
   spacers, sold per diameter (29RAS / 38RAS / 54RAS).

Muster **resolves exact spacer counts only for 38 mm.** Its case ladder (120 / 240 / 360 /
480 / 600 / 720) steps by exactly one grain length, and AeroTech publishes the full spacer
chart, so the fits are exact and encoded verbatim (`SpacerRule[]`, max two spacers). The 29 mm
and 54 mm case lengths aren't evenly spaced, so there is no clean per-step rule to derive —
those carry a sourced **advisory** ("this case flies some shorter reloads with the 29RAS;
confirm the exact combination against the instructions") rather than a fabricated table. The
honest, conservative line: resolve what's sourced, advise where it isn't, and never assert a
step I can't back.

Both resolved tables were re-verified against primary manufacturer sources (2026-07): AeroTech's
published 38RAS chart (every case→case step, the 38/240–720 range, and the 38/1080 / 38/1320
exclusion) and Cesaroni's own instruction sheets (the verbatim "up to two spacers, one or two
sizes shorter" rule for Pro29/38/54) — all confirmed correct. The audit surfaced only a stale
source link (AeroTech's 38RAS product page had 404'd; swapped for two live vendor pages that carry
the chart) and the **6GXL exception**, which the model already handles by leaving 6GXL cases
advisory rather than resolved — Cesaroni needs a dedicated XL spacer there (a regular spacer on
Pro29), not the standard step.

A follow-up audit of the **closures and seal discs** (2026-07) checked every asserted part number
and every seal-disc threshold against manufacturer/vendor pages: all confirmed correct, no value
wrong. It closed the remaining gaps by *adding* the part numbers that were still missing rather
than correcting any — the AeroTech 29 mm (29FSD) and 38 mm (38FSDSS, stainless, matching the
confirmed 54/75/98 FSDSS convention) forward seal discs, and the Cesaroni Pro29 rear closure
(P29-CL), Pro75/Pro98 rear closures (the nozzle holders P75-NH / P98-NH — deliberately *not*
P75-CL, which is only a retaining ring, the trap here), and the Pro98 forward closure (P98-FC).
Each new number cites the page that names it, kept separate from the general hardware-set page so a
case's own source isn't narrowed to a single closure listing.

### Safety, carried the way the family carries it

This is more safety-critical than the calculators — a wrong edge can mean an incompatible
build — so the framing leans hard on conservatism:

- The reload's **printed instructions are the authority**, stated at the top of the page, in
  the footer, on the shopping list, and in the issue template.
- **Certification is a dimension**, not a checkbox: NAR / TRA / unlisted, and out-of-production
  as its own status that is explicitly *not* decertified.
- Muster never marks a motor decertified on its own — that's the cert orgs' call.
- Only manufacturer-supported fits are ever shown; there are no "physically fits but nobody
  says so" edges.

### Scope

Three systems now: AeroTech RMS (24–98 mm), Cesaroni Pro (24–98 mm), and Loki Research (38–76 mm)
— ~88 cases and ~540 reloads. AeroTech came first because it's the messiest and most-asked;
Cesaroni followed because it's the other system most flyers own, and adding it proved the graph
really is brand-agnostic; Loki is the third-most-owned reload brand and a clean fit. Cross-brand
certification is a natural next step.

### Adding Cesaroni Pro (the second system)

The payoff of the `Manufacturer` / `MotorSystem` types: Cesaroni was a data addition, not a
rewrite. `lib/data/hardware-cti.ts` sits beside `hardware.ts`, `graph.ts` merges the two, and
the resolver gained one guard — same-manufacturer only — so a Cesaroni reload can't resolve to
AeroTech hardware even at a shared diameter. The reloads are the same ThrustCurve mirror,
tagged with `manufacturer`/`system`; the UI grew a system toggle in each picker and a system
grouping in the kit planner.

What the research corrected (and why sourcing matters): a first pass assumed Cesaroni worked like
AeroTech. It mostly doesn't. **Reusable hardware differs by diameter** — Pro38 reuses only the
case (both closures ship in the reload), Pro24/29/54 reuse the case plus a rear closure, Pro75/98
reuse the full set — so `forwardClosure`/`aftClosure` became optional on a case, and the shopping
list and case summary adapt. The **cartridge** is self-contained (grains + liner + nozzle + forward
disc preassembled), so the reload wording is system-aware. And the **spacer rule** is Cesaroni's
own published one — *up to two spacers, one or two grain-sizes shorter* — which, being clean and
sourced, is resolved for the standard Pro29/38/54 cases exactly like the RMS 38 mm chart; Pro24
(no spacers), the 6GXL cases, and Pro75/98 stay advisory. Many Cesaroni reloads ship in both a
delay and a plugged (`-P`) version, so the plugged/electronic-deployment flag earns its keep here.

### Adding Loki Research (the third system)

Loki was the cleanest addition yet, because the graph and the `Manufacturer`/`MotorSystem` types
were already built for it: `lib/data/hardware-loki.ts` sits beside the other two and `graph.ts`
merges all three. What research corrected was the *reuse model*, which is the opposite end of the
spectrum from Cesaroni. Every Loki instruction sheet splits its parts into reusable "Motor
Hardware" and a single-use "Reload Kit", and the reusable set is the largest of the three: the
case, the forward bulkhead, **and** the graphite nozzle all carry over — so unlike AeroTech (whose
nozzle is single-use) and unlike Cesaroni (which ships both closures inside the reload), a Loki
reload contains no closures at all, only the liner, grains, o-rings, and a delay/smoke element. The
shopping-list wording is system-aware for this.

The bigger discipline call was **fits**: Loki publishes no spacer or reload-adapter system, so Loki
is modeled **native-fit only** — no adapter nodes, no advisory. That's the honest read of the
sourcing, not a gap. Two per-reload constraints Loki states but that aren't in the ThrustCurve
catalog are carried as conservative notes rather than resolved: the graphite nozzle is sold by
throat number and must match the reload, and some longer 54 mm reloads need Loki's extended
bulkhead. Finally, Loki's **98 mm** hardware is discontinued ("all production on hold"), so the lone
98/12500 reload — made-to-order for legacy hardware, with no case to buy — is deliberately omitted;
a shopping aid shouldn't point you at hardware you can't purchase. Loki's build-time contract is the
same one every system passes (`lib/validate.ts`), and a Loki reload can no more resolve to AeroTech
or Cesaroni hardware than the reverse.

### Cross-brand crossloads (the one exception to the brand wall)

The whole graph is built on the rule that hardware never crosses brands — the resolver's
same-manufacturer guard, and a build-time check that no edge crosses it. There is exactly one
sanctioned exception, and it only exists because the manufacturers publish it: at **75 mm and
98 mm**, AeroTech RMS and Cesaroni Pro are deliberately cross-compatible. Cesaroni engineered its
Pro75/98 reloads to share the RMS case ID and closure engagement, publishes an exact case-size
equivalence table (Pro75-2G ≡ RMS-75/2560 … Pro98-6G ≡ RMS-98/15360), and ships the o-rings for
either brand; AeroTech certified its own 75/98 reloads for Cesaroni hardware ("AT Crossloads").

`lib/data/crossload.ts` holds those ten sourced pairs and nothing else — no 29/38/54 mm, where
nobody sanctions it and the closure formats differ (that's a CATO edge, not a feature). The
resolver adds a `crossload` list to each resolution by looking up the paired foreign case; the UI
renders it as a distinct **amber caution**, never a green fit, and — crucially — the two directions
carry *different* manufacturer notes: an AeroTech reload in a Cesaroni case is AeroTech's sanctioned
crossload (Medusa nozzles need a single-throat swap), while a Cesaroni reload in an RMS case is
something AeroTech formally *advises against* (needs an added forward seal disc, no warranty). Both
carry the cert caveat. `validateCrossloads` fails the build if a pair names a missing case, the wrong
brand, or a diameter other than 75/98. Sourced from Cesaroni's FAQ + Pro75 instructions and
AeroTech's crossload announcement and advisory — the research that turned up the AeroTech advisory
is why the two directions aren't shown as symmetric.

The deferred, still-sourced neighbours (noted for later): the Cesaroni Pro75→AMW75 adapter (needs
AMW hardware added first), Loki's 98 mm liner sets for foreign cases (no published reload-level
recipe), and RouseTech / Dr. Rocket as RMS aliases (licensed, but community-attested rather than a
crisp manufacturer statement).

### The kit planner (companion tool)

The lookup answers "given X, what fits?"; the planner answers "given everything I own, what can
I fly, and what should I buy next?" — a natural third question, placed after the main tool behind
a "Companion tool" divider (the same shape as Charge's vent-port helper). Check off the cases and
adapters you own; it counts every reload the kit flies and ranks the next purchase by how many
*new* reloads it unlocks.

It's a thin, pure extension of the resolver (`coverageFor`, `unlockSuggestions` in
`lib/resolve.ts`), so it inherits the graph's sourcing and can't invent a fit. Two properties make
it feel smart rather than mechanical, and both fall out of computing coverage as a **set**:

- Owning a longer case + the adapter already covers the shorter reloads, so the planner won't
  pitch you a shorter case whose reloads you can *already* fly — that suggestion nets zero and is
  dropped.
- The adapter's value is computed against your actual cases: "the 38RAS unlocks N shorter reloads
  across your 38 mm cases," where N excludes anything already covered.

Suggestions stay within the diameters you already own (a "grow your kit" tool, not a catalogue),
and a relevant advisory adapter (29/54 mm) is always surfaced — phrased as "some," never a
fabricated count. The owned kit lives in `localStorage` (`muster.kit`), like the family's other
per-device saved data; the lookup keeps the URL for sharing.

### Filtering the busy cases

Once the full 24–98 mm range across systems is in, a single case can fly a lot — 30-plus reloads once spacer
fits are counted. The case-result view grows a small filter bar (shown only past ~6 reloads): sort
by impulse or thrust, narrow by propellant, and hide out-of-production reloads, applied across the
direct and spacer groups with an "X of Y" count. It mirrors the Motor Finder's filtering habit,
the logic is a pure tested helper (`lib/filter.ts`), and the filter is transient view state (reset
per case via a React key) rather than part of the shareable URL selection.

### Deep-linkable case and reload pages

The interactive tool keeps its whole selection in the query string, which is great for sharing but
invisible to search: only the home page was ever in the sitemap. So every case and every reload now
also has its own **statically-generated page** — `app/case/[id]` and `app/reload/[id]`, one HTML file
each via `generateStaticParams` (≈630 pages, still a pure `output: "export"` — no server). Each page
server-renders the real resolved content (a case's reloads and hardware; a reload's cases, cert, and
the stock cross-link), carries its own `title`/description/canonical and a `BreadcrumbList`, and
cross-links its neighbours — a case page links to each reload's page and back — so the whole graph is
crawlable from the sitemap, which now lists them all. Every page leads with a CTA into the interactive
tool (the existing `?have=…` deep link), so search traffic lands on a real answer and can open the
live version. It mirrors the Motor Finder's per-motor pages, and the entity — not "Muster" — is each
page's `h1`. A `sitemap.test.ts` holds the sitemap to the data, so a new entity can't ship undiscoverable.

Each entity page also carries **schema.org structured data** (`lib/jsonld.ts`, pure and tested),
mirroring the Motor Finder again: one `@graph` per page with a `Product` node (name, SKU/MPN, brand,
category, and the entity's real facts as `additionalProperty` — impulse class, total impulse, thrust,
propellant, certification for a reload; diameter and max impulse for a case) plus the page's
`BreadcrumbList`. The one deliberate divergence from the Motor Finder is that Muster's Product carries
**no `offers`** — Muster has no price or stock data, and fabricating an Offer would be both unsourced
and misleading for a safety-framed shopping aid; the "check stock & pricing" link hands that job to the
Motor Finder, which does have it. `jsonld.test.ts` runs the Product invariants over the whole catalog
(valid brand, designation-as-SKU, no non-null-value property, and never an Offer), and the e2e suite
asserts the Product renders on a real case and reload page.

Each page also marks up **the list it actually is** with an `ItemList`: a case page carries the reloads
it flies, a reload page the cases that fly it, each a `ListItem` linking to that entity's own page (the
summary-of-links form Google recommends, not an inline `item`). It's built from the same resolved fits
the page renders, deduped by id (a longer case can list a reload at both one and two spacers, but it's
one entry), and crossloads are deliberately left out — they're a cautioned section, not a resolved fit,
so they don't belong in the page's list of what it flies. Accurate by construction: it's the on-page
content, not a new claim.

### Accessibility

The family's baseline, carried here: a skip-to-tool link, a single indigo `focus-visible` ring on
every interactive control, the mode/system/diameter/sort switches as real ARIA radio groups
(one tab stop, arrow keys move the selection), and the axe audit in CI over light and dark on the
tool, both deep-link pages, and a crossload page.

One thing the axe audit *can't* see is a missing announcement: selecting a case or reload swaps a
whole result panel and shopping list into the page with no scroll or focus change, so a sighted user
sees it appear but a screen-reader user is told nothing — the markup is valid either way. A persistent
polite live region (`role="status"`, always in the DOM so a text change is announced) carries a terse
summary of what changed — "RMS-38/360 case selected. 12 reloads it can fly." then "Shopping list ready:
I161W in the RMS-38/360 case." — a count, never the whole list. An e2e test drives both directions and
asserts the announcement.

## 3. Decisions (resolved)

- **Scope of v1:** the full AeroTech RMS line, both directions, the shopping list, and the
  certification dimension. 38 mm spacer fits resolved; 29/54 mm advisory.
- **Data:** reloads mirrored from ThrustCurve (static JSON, offline-friendly); hardware graph
  hand-curated with a source on every node.
- **Repo:** `nrdptel/fusionspace-muster`. **License:** MIT, mirroring the siblings.
- **Deploy:** GitHub Actions → Cloudflare Pages, production branch `main`, at
  `muster.fusionspace.co`, with a monthly scheduled rebuild so the observance rolls over.
- **PWA:** manifest + service worker + install hint, same pattern as Charge/Window. The
  dataset is bundled, so offline is the natural state, not an afterthought.
- **Repo hygiene mirrored:** CONTRIBUTING, SECURITY, issue templates, `_headers`,
  `wrangler.toml`, and CI (lint, unit tests, build-with-graph-validation, Playwright e2e with
  an axe audit).

The thing still worth another set of eyes is the **hardware data itself** — the case ratings,
the seal-disc thresholds, and especially the 38RAS chart. It's sourced and validated, but this
is exactly where a second reader with the instruction sheets in hand adds the most.
