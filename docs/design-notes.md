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
unknown case, a **case no reload is built for** (an orphan case that would resolve to an empty
result), an adapter rule that crosses diameters *or steps the wrong way* (a longer reload into a
shorter case — the CATO-class edge), a duplicate id or designation, a hardware node with no
source, a case or reload whose **manufacturer and system disagree** (AeroTech↔RMS, Cesaroni↔Pro,
Loki↔Loki — the shopping list keys its wording off `system`, so a wrong tag would silently
mis-describe what you buy), or a reload whose brand/diameter disagrees with its case or whose
plugged and ejection-charge flags contradict each other. The contract is pure so it can be
unit-tested against deliberately-broken graphs, not just the real one. Cheap insurance for data
that drives hardware buying.

One check was **considered and rejected**: asserting a native reload's `totImpulseNs` never
exceeds its case's `maxImpulseNs`. It looked like a clean "case is rated for what it flies" guard,
but the data says otherwise — `maxImpulseNs` on the raw case records is a *nominal size label*
(the number in `RMS-38/360`), and Cesaroni cases carry `0` outright, so 350 of ~540 reloads sit
above their case's raw figure. `graph.ts` already resolves this by **lifting** each case's
`maxImpulseNs` to at least the largest reload it flies (so the displayed "up to ≈N·s" can't
contradict the list and is never `0` for a covered case) — which makes a strict ceiling check
either tautological (post-lift) or false (pre-lift). The orphan-case guard is the useful part of
that idea: it protects the *displayed* figure at its root by forbidding a case with no reloads.

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

The **shared link itself** is the third artifact that leaves the site, and the pure encoder/decoder
behind it (`lib/state.ts`) is now round-trip tested catalog-wide (`lib/state.test.ts`). "A resolved
view is a link you can share" is a core promise, but that module had been the one load-bearing pure
file with no test: every real case and reload selection (with and without a picked result) must survive
`toQuery`→`parseState` unchanged; the encoder must never leak the *other* direction's id into the URL
(so a shared link can't resurrect a stale selection); and a hand-edited, `utm`-decorated, or
both-ids-set legacy link must self-heal to a canonical selection rather than corrupt the view. The
contract is deliberately opaque about whether an id *exists* — that's the resolver's job, and the
component already renders nothing for an unknown id — so the round-trip holds for any string, which is
what keeps a ThrustCurve refresh from quietly breaking sharing.

Underneath all of that sits the **mirror itself** — `lib/data/reloads.json`, the largest body of
safety-critical data and the one thing imported as *untyped* JSON, so the compiler never checks it.
`lib/data/reloads.test.ts` is its integrity contract, run in CI on every push: it doesn't re-fetch,
it holds the committed file to the shape a faithful ThrustCurve fetch produces, so a slip on the next
manual refresh fails the gate instead of shipping. It proves the provenance header is present with a
valid ISO `_fetched` date; that every `id` is the deterministic `"<at|cti|loki>-<slug(designation)>"`
(the id *is* the `/reload/<id>` deep-link slug, so it must be derivable and collision-free); that every
`tcUrl` resolves to that motor's own ThrustCurve page (a wrong one sends a flyer to the wrong specs)
and every `motorId` is present and unique; and — the part TypeScript can't do for a cast JSON import —
that every enumerated field (`manufacturer`, `diameter`, `availability`, `certOrg`) sits inside its
type's domain and every impulse class actually appears in its designation. Building this surfaced a
latent type gap: Loki markets its largest hardware as **76 mm** (AeroTech/Cesaroni use 75 mm), and the
`Diameter` union had omitted 76 — the Loki data compiled only because an `as Diameter` cast forced it
through. 76 is now in the union (and Cesaroni's grain ladder is keyed by *its* diameters, not the
whole union, so it stays exhaustive without demanding a 76 mm Cesaroni size that doesn't exist).

A second layer of the mirror contract guards the facts that are **derivable from a reload's own
fields**, so a mismatch is a mis-keyed refresh rather than a judgement call — the classes of error
that can steer a flyer to the wrong hardware, caught before the merged-graph contract even runs.
Each reload's `system` must be the one its manufacturer implies (AeroTech→RMS, Cesaroni→Pro,
Loki→Loki — the shopping list keys its wording off `system`); every reload must carry a `caseInfo`
(the membership rule); its `diameter` must equal the bore embedded in that `caseInfo` string
("RMS-38/360", "Pro38-3G", Loki "38/120" — a diameter that disagrees would make every fit computed
from it wrong); its `plugged`/`ejectionCharge` flags must agree with the delays (a `"P"` reload is
plugged and carries no ejection charge — a deployment-safety fact); and `avgThrustN` is stored as a
whole newton, the label convention. That last one closed a real inconsistency the reconcile below
surfaced: the Loki import had mirrored 13 reloads' average thrust at raw two-decimal precision
(`80.46`, `234.62`) while every AeroTech/Cesaroni row stored the rounded integer, so a stray
`avgThrustN` could have read back as "I234.62". Rounding those to whole newtons is display-invariant
(the UI already rounds thrust), and the invariant now prevents the drift from recurring.

The integrity *test* can't see the one thing a static mirror is always at risk of — **drift from the
live source** (a new certification, an availability flip, a corrected weight). That gap is closed by a
reproducible refresh/audit tool, `scripts/reconcile-reloads.mjs` (run via `npm run reconcile`). It
fetches the in-scope reloads from the ThrustCurve API, applies the *same* scope + normalization the
mirror uses — the one authoritative statement of membership (the three modeled brands, at the
diameters Muster covers, with a case) and of how each source field maps in — and diffs the result
against the committed file, reporting motors new on ThrustCurve, motors the mirror carries that
ThrustCurve no longer lists in scope, and any *material* field change (numeric comparison is
tolerance-based, so sub-unit rounding noise between two fetches isn't mistaken for a revision). It's
read-only and reaches the network only when a human runs it, so the static export stays hermetic and
CI stays offline; a maintainer runs it, reviews each finding against the reload's instructions and the
cert org, and applies only what's warranted. The **2026-07-15** run reconciled clean: 541 in scope on
both sides, zero additions, zero removals, zero material field changes — the catalog is current — and
its only finding, the Loki precision inconsistency above, is now fixed and guarded.

Freshness no longer depends on someone *remembering* to run it. A scheduled workflow
(`.github/workflows/reconcile.yml`, monthly + on-demand via `workflow_dispatch`) runs the same
reconcile against live ThrustCurve and turns drift into an **actionable GitHub issue** — the report,
verbatim, with a pointer to review each item against the instructions and the cert org before touching
the data. It's deliberately kept off the build/deploy path (that must stay hermetic and offline): this
is a separate maintenance job that reaches the network, and it never edits the mirror — a human still
makes every data change by hand. The workflow distinguishes *drift* (reconcile exit 1 → open or
comment on a single `data-drift` issue, so months of drift don't pile up duplicates) from an *error*
(exit ≥ 2, e.g. ThrustCurve unreachable → the job fails visibly rather than filing a misleading drift
report), and does nothing when the mirror is in sync.

A monitor is only as trustworthy as its own logic, so the reconcile's heart is **unit-tested**
(`scripts/reconcile-reloads.test.mjs`, run in CI — the vitest `include` was widened to pick up
`scripts/`). The scope rule, the ThrustCurve→mirror normalization, the tolerance-based `materialDiff`,
and the `diffMirror` partition are pure functions, exercised directly with synthetic records: an
in-scope brand at a covered diameter is kept and an 18 mm or Loki-98 motor dropped; each cert body
abbreviates and an impossible propellant-heavier-than-loaded weight is discarded; a 1 mm length wobble
reads as noise while an 8 mm one is a revision; new / withdrawn / changed motors partition by id. The
failure mode this guards is the quiet one — a bug that reports a *changed* motor as "in sync" would
sail through a green run and silently blind the monitor, which is worse than no monitor at all. (The
`diffMirror` partition was extracted out of the script's `main()` precisely so it could be tested
without the network.)

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

A **re-verification against Loki's current sources (2026-07)** — the newest system, and the last one
that hadn't been re-audited after its initial build — confirmed the whole model holds, with no
corrections. The 54 mm and 76 mm instruction sheets still split parts into a reusable "Motor Hardware"
set (**case + forward bulkhead + graphite nozzle**, verbatim) and a "Reload Kit" that carries no
closures or nozzle; the graphite nozzle is still throat-number-matched ("a number is engraved on each
nozzle… use the number listed in the table"); the store still sells a standalone **54 mm extended
bulkhead** for the longer reloads; **98 mm remains on hold** ("all production of 98 mm hardware is on
hold"), so the omission stands; 38/54/76 mm are still the only purchasable diameters (29 mm out of
production, 152 mm by request, 98 mm on hold); and Loki still publishes **no spacer/adapter system**.
All seven source links surfaced in the UI resolve (HTTP 200). Two additive findings were reviewed and
**deliberately not modeled**: (1) new *experimental* parts now listed in 54/76 mm (a hockey-puck
bulkhead, a nozzle carrier, extra retaining rings) — optional advanced hardware that changes no fit,
and modeling it would drift Muster toward a parts catalogue it isn't; and (2) a store note that
"all 38/1200 reloads are now sold as plugged motors with tracking smoke only" — a reload delay/plug
fact, which is ThrustCurve's to record and the printed instructions' to authorize, not the hardware
graph's. With this, **all three systems have now been re-verified against primary sources** (AeroTech
38RAS and Cesaroni spacers, the closures/seal discs, and now Loki).

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

The deferred, still-sourced neighbours (noted for later): Loki's 98 mm liner sets for foreign cases
(no published reload-level recipe), and RouseTech / Dr. Rocket as RMS aliases. The RouseTech/Dr. Rocket
aliasing was re-checked (2026-07) and stays deferred: even the AeroTech case pages Muster already cites
under a vendor's "Rouse-Tech Casings" section list the manufacturer as *AeroTech* and don't state the
licensing relationship, so it remains community-attested — not a crisp manufacturer statement to assert
against. Between this and the AMW review above, new *content* is effectively tapped out until a
cleanly-sourceable system or a first-party aliasing statement appears; the near-term value is in
hardening, tests, and consistency on what's already shipped.

### AMW (Animal Motor Works) — investigated 2026-07, deferred

A fourth motor system was the obvious next content lever, so AMW's sourcing was researched against
manufacturer and vendor pages before any build. The verdict is a clear **defer**, recorded here so it
doesn't get re-litigated until the facts change:

- **AMW no longer manufactures.** It operates today as a vendor/dealer (AMW/ProX, at amwprox.com), and
  its current "AMW"-branded reloads are Cesaroni-made — the AMW/CTI product lines merged years ago. So
  adding AMW would largely *duplicate* Cesaroni Pro nodes Muster already sources directly; some AMW
  reloads (e.g. the I297) even carry a Cesaroni `caseInfo` like `Pro38-5G` outright.
- **The classic AMW reloads aren't buyable.** The AMW/ProX store lists them pre-order only, with an
  explicit "no shipping until they are certified for NAR/TRA use" — which fails the shopping-aid rule
  of pointing only at hardware you can actually buy.
- **The reusable-hardware graph can't be sourced to our bar.** No reachable manufacturer or vendor page
  itemizes AMW's forward/aft closures, their part numbers, or a spacer system per diameter; 98 mm cases
  aren't sold anywhere; and the `ABC 75-xxxx` case strings in ThrustCurve's `caseInfo` map to nothing
  purchasable (they're a data artifact for the AMW 75 mm sizes, not a catalogued brand). What little AMW
  hardware is for sale is used/NOS and mostly out of stock at a single vendor — transient inventory, not
  the durable, every-node-cited catalog the safety contract needs.
- **The one manufacturer-sanctioned AMW edge isn't worth modeling.** The AMWPro75-ADAPT lets a Cesaroni
  Pro75 reload fly in an AMW 75 mm snap-ring case (per a Cesaroni-published instruction sheet), but it
  points *into* legacy AMW hardware a flyer must already own and adds no buyable node. AMW↔AeroTech RMS
  compatibility is only community-attested (shared snap-ring tube dimensions), not manufacturer-published
  — categorically weaker than the sanctioned AeroTech↔Cesaroni 75/98 crossloads the tool already models,
  and not to be treated the same way.

Revisit only if AMW republishes a first-party hardware catalog (cases + closures + part numbers) or a
retailer starts itemizing AMW closures in stock. Until then, the honest, conservative line holds: no
system whose hardware graph can't be fully sourced, and no pointer at hardware you can't buy.

### Gorilla Rocket Motors — investigated 2026-07, deferred

The other snap-ring reloadable maker sometimes floated as a fourth system (a live, separate company
from AMW and Loki, founded 2003). Architecturally it *would* fit Muster's case + reusable-closure +
reload model — unlike the hybrid makers — but on the two bars that matter it's a clear **defer**:

- **The whole line is out of production.** ThrustCurve lists 56 Gorilla reloads (38–152 mm, all with a
  `caseInfo`) and marks **every one OOP** — zero in production. A shopping aid pointing only at buyable
  hardware has nothing current to resolve to.
- **The company is dormant and has no catalog to source from.** gorillarocketmotors.com is a
  "back online soon" placeholder ("undergoing some major upgrades… limited reloads and hardware
  currently available"), with no working store, no listed cases/closures/part numbers, and orders only
  by email. The reusable-hardware graph can't be sourced to the every-node bar.

Revisit if Gorilla brings its store and a first-party hardware catalog back online.

### Content coverage, as of this assessment (2026-07)

With AMW, Gorilla, and RouseTech/Dr. Rocket all investigated and deferred, the content lane is
comprehensively assessed: **AeroTech RMS, Cesaroni Pro, and Loki Research are the currently-manufactured,
sourceable, reloadable HPR systems that fit Muster's model** — and Muster covers all three. Everything
else on ThrustCurve is out of scope by nature: the remaining HPR makers are **hybrids** (Hypertek,
Contrail, RATT Works, West Coast Hybrids, Sky Ripper — a tank/injector/grain architecture, not
case + closure + reload), or single-use / mid-power lines, or defunct/dormant brands whose hardware
isn't buyable or sourceable. So the catalog is effectively complete for the current market; a genuinely
new *system* now depends on an external change (a dormant maker returning with a published catalog, or a
new sourceable entrant), and near-term value stays in correctness, hardening, tests, and consistency on
what's shipped.

**Ecosystem watch (2026-07):** the hub now lists a new tool, **Loft** (loft.fusionspace.co), alongside
Debrief under "in development." Muster's footer links only the *live* siblings (Motor Finder, Charge,
Window — the `SIBLING_TOOLS` list in `lib/links.ts`), so nothing changes yet. When Loft actually goes
live, add it there — the one small consistency follow-up waiting on an external event. A head-tag audit
against the live siblings (2026-07) otherwise found parity — Muster carries the same OG/Twitter/PWA
markup and, on the home page, more structured data than the Motor Finder — with one drift since fixed:
the SVG favicon now declares `sizes="any"` in the head, matching the manifest and the siblings.

**Maturity note (2026-07):** the tool is at a plateau. Content is tapped out (new systems blocked on an
external change); the data is freshly audited — reconciled against live ThrustCurve on 2026-07-15 (clean, no drift) via
the reusable `npm run reconcile` tool, and **all three systems' hardware graphs now re-verified against
primary manufacturer sources** (AeroTech 38RAS + Cesaroni spacers, closures/seal discs, and Loki — the
last, 2026-07, holding with no corrections) — and now guarded on both the source mirror
(`lib/data/reloads.test.ts`, structure + derivable safety invariants) and the merged graph
(`lib/validate.ts`); the URL/sharing contract, the
resolver invariants, and the always-rendered observance chrome (`lib/observances.test.ts`) are all
tested; accessibility is axe-audited across the tool, kit planner, both deep-link pages, and a crossload
page in light and dark; and the **headline offline promise itself is now driven end-to-end**
(`e2e/offline.spec.ts`) — the suite loads the page, lets the service worker take control, cuts the
network, and asserts the tool still renders *and resolves a case* from cache, so a service-worker or
build-output regression that broke the field use case would fail CI instead of shipping. The head/PWA
markup is at sibling parity. Several substantial user-facing moves have
since come off this note by deliberate scope decision — **print** (paper parts sheet), **live
availability** from the Motor Finder, **reload physical dimensions**, and **per-part source links** in
the shopping list (delivering the "each part links to its source" promise the UI had only half-kept —
all below). The availability
badge now covers **case pages** too: once the Motor Finder published a **bulk `availability.json`**,
Muster switched from parsing each motor's ~110 KB page to one shared ~28 KB feed fetch, which retired
both the per-view cost and the single-reload scoping. Mirror **freshness is now automated** too — a
scheduled `reconcile.yml` workflow runs the reconcile monthly and files a `data-drift` issue if
ThrustCurve moves under the catalog, so the source-fidelity check no longer depends on memory (above).
Remaining known candidates are externally blocked or gated on a maintainer decision: a fourth motor
system and the Loft footer link (both wait on an external change); and physical **case-hardware**
dimensions (Tier 2 below — the part that would drift toward a spec sheet and can't yet be cleanly
sourced).
(`lib/og-mark.ts`, once listed here, is a generated base64 data-URI constant, not logic — nothing to
test.) Absent one of those unblocks, further work here is polish, not a needle-mover.

**Launch readiness (2026-07):** the hub still lists Muster under "in development," but Muster's own
side is **verified launch-ready** — a full pass over the launch-critical surfaces found no gap to fix:
the site is indexable (`robots.txt` allows all, matching the siblings) with a complete sitemap and
per-entity canonicals; the live HTML carries production-correct `og:*` / `twitter:*` / `canonical` /
`manifest` tags against `muster.fusionspace.co`; the OG card renders (a real 1200×630 PNG from the
family template); the manifest is complete (standalone, maskable 192/512 icons); the security headers
(`public/_headers`) are in place; and every launch asset serves 200 (OG, `icon.svg`, `apple-icon`,
PWA icons, manifest, `sw.js`, `robots.txt`). There is **no pre-launch/beta copy** anywhere in the tool.
One apparent gap was checked and dismissed: `/favicon.ico` 404s, but that's the **dominant family
convention** — the Motor Finder, Charge, and the hub all 404 on it and serve `/icon.svg` instead (only
Window carries a `.ico`), so Muster is correctly SVG-icon-only; adding a `favicon.ico` would diverge
from the siblings it mirrors, not align with them. The remaining launch steps are therefore **external
to this repo** and a maintainer's call: (1) flip Muster's hub entry from "in development" to live, and
(2) add Muster to the *launched* siblings' footers — the reciprocal of Muster's own `SIBLING_TOOLS`
list, using an entry shaped like the others, e.g. `{ name: "Muster", href:
"https://muster.fusionspace.co", blurb: "Motor-hardware compatibility" }`. When Muster is live, its own
footer (which lists only live siblings) needs no change — it already omits itself.

### Print — a paper parts sheet

Chosen off that maturity note as the first substantial user-facing capability: the tool had no print
styles at all, yet its whole job is a *shopping list*, and it's deliberately offline-capable "for a
remote field or a vendor's booth." Printing is the paper analog. A single `@media print` block in
`globals.css` makes any page a clean **black-on-white parts/reference sheet** regardless of the on-screen
theme — tinted panels and shadows flattened, ink not wasted — and `print:hidden` drops the on-screen-only
chrome (the theme toggle, the share/copy and "open in the tool" actions, the install/offline section, the
service-worker toast, the footer's link row, the monthly observance bar). The **deep-link `/case/[id]` and
`/reload/[id]` pages are the intended printable artifact** — self-contained static content — so a flyer can
`File → Print` a reload's page and get the hardware to buy, the part numbers, the conservative notes, and
the **safety authority line** (kept on paper by design) to take to the bench. No new data, no sourcing
risk — it's presentation of already-sourced content. An e2e test (`e2e/print.spec.ts`) drives the print
media type and asserts the split for **both** deep-link page types: reference content prints, interactive
chrome doesn't. The case-page test runs on a *crossload* case, so the safety-critical extra — the
cross-brand caution ("AeroTech advises against this") and its "certify in the hardware it's flown in" line
— is proven to survive to paper, not just the green-light fits. (An earlier by-hand print audit rendered
the pages to PDF and confirmed the chrome drops and the caution box carries; the case-page test locks that
in so a future `print:hidden` slip can't silently ship a CTA or an accent bar onto the sheet.)

### Live availability from the Motor Finder (the one online touch)

The suite's division of labour: **Muster owns compatibility** (its bespoke, static, offline hardware
graph); the **Motor Finder owns availability** (live cross-vendor stock and pricing). They've always
been stitched by a stable URL convention keyed on the shared ThrustCurve identity
(`/motor/<manufacturer>/<designation>`, `lib/links.ts`). This adds a *thin* read across that seam: a
best-effort **"in stock · N vendors" / "out of stock everywhere"** signal wherever a reload appears — its
shopping list, its deep-link page, and **every reload row on a case** (interactive and deep-link).

It reads the Motor Finder's **bulk availability feed** (`motor.fusionspace.co/availability.json`) — one
small JSON (~28 KB, ~600 motors), rebuilt hourly and served with `Access-Control-Allow-Origin: *`, so
Muster fetches it **client-side, no server proxy** (which the static/free-tier rules forbid) and no new
data mirror. It's keyed like the Motor Finder's motor URLs — `"<lowercase-manufacturer>/<designation>"`,
off the shared ThrustCurve identity — and each entry is a tiny `{vendors, inStock}` summary. The parser
and lookup (`parseFeed`, `availabilityOf`, pure and unit-tested; verified against the live feed) are
tolerant: a bad entry is skipped, an untracked reload returns null. Crucially the whole page shares **one
memoized fetch** (`getAvailabilityFeed`), so badging a case's ~30 reloads costs a single 28 KB request —
which is what let the badge move from single-reload surfaces onto case lists. (This replaced an earlier
approach that parsed each motor's ~110 KB page, one fetch per reload; the bulk feed the Motor Finder now
publishes made per-view parsing obsolete.) The design keeps Muster *Muster*, not a second storefront:

- **Availability only, never price.** Pricing stays the Motor Finder's authority; the "Find it in stock"
  link and a "Muster shows what to buy; the Motor Finder shows where and for how much" line hand it off.
  A safety-framed shopping aid shouldn't grow a price tag.
- **Pure progressive enhancement.** The bundled compatibility answer renders instantly; the signal is a
  best-effort effect that renders nothing until the feed resolves and **nothing at all on any failure** —
  offline, blocked, an untracked reload, or a changed feed shape all resolve to an empty map / `null`. The
  offline-at-the-field promise is untouched (the service worker already passes cross-origin fetches
  straight through), and an e2e test asserts the fail-silent path keeps the page fully usable.
- **Freshness-honest and print-safe.** A tooltip says "refreshed hourly," and the badge is `print:hidden`
  — a live stock state can't go onto paper without going stale the moment it prints.

The copy around the hand-off is sharpened so the "what vs where" split reads clearly: "Muster shows what
to buy; the Motor Finder shows where it's in stock and for how much." An e2e test drives the mocked feed
and asserts the in-stock badge on a reload page, the fail-silent path, and — the bulk feed's payoff — that
a **case page badges its whole reload list from a single feed request**.

### Reload physical dimensions — the fit-and-fly aid (Tier 1)

"Does this motor fit my mount, and how heavy is it for my CG?" is the one question about a reload the
tool couldn't answer, and the answer was already sitting in the source: ThrustCurve carries an
**assembled length, loaded weight, and propellant weight** on nearly every motor. So this is a data
augmentation, not new sourcing — the same mirror, three more fields per row, pulled from the same
ThrustCurve records the catalog already comes from. `lengthMm`, `totalWeightG`, and `propWeightG` are
**optional** on `Reload`, mirrored only where ThrustCurve carries the figure and **never inferred**;
today length covers all 541 reloads, the two weights ~535/539. They surface as one quiet line —
"191 mm long · 366 g loaded · 193 g propellant" — on the reload's spec card, its deep-link page, built
by a pure, tested `dimensionsLabel()` that omits any missing field and returns null (so the row drops
entirely) when none are known. `formatWeight` reads in grams up to a kilogram, then kg with trailing
zeros trimmed.

Two disciplines keep this from drifting into an unsourced spec sheet. First, the framing: the `Reload`
type comment states outright it's *a fit-and-fly aid, not a spec sheet* — length and weight for mount
fit and CG, nothing the printed instructions don't already state. Second, the mirror's integrity
contract (`lib/data/reloads.test.ts`) grew a guard for exactly the ways a future refresh could corrupt
these: every present physical field must be a positive finite number, **propellant weight can never
exceed the loaded weight it sits inside** (physically impossible — the one such ThrustCurve point,
25E75-17A with a propellant heavier than its whole motor, is dropped at augmentation rather than
mirrored), and length coverage must stay above 90% so a renamed key or a bad join can't silently gut
the field the UI leans on.

**Tier 2 — case-hardware dimensions** (a case's own length, diameter, and weight, for airframe/mount
sizing) stays deferred: unlike the reload figures, ThrustCurve doesn't carry them, so they'd be new
hand-sourced data per case — the genuine scope call that drifts toward a spec sheet. Revisit only if
that data can be sourced to the every-node bar the rest of the hardware graph holds.

### Every part cites its source, in the UI (not just the repo)

Muster's whole claim is that it's sourced — every hardware node carries a `sources` list, and the
build fails on a source-less part. But that provenance was only *half* surfaced: crossloads showed
their sources, and the home page promised "each part links to its source," yet the **shopping list
dropped them on the floor**. The resolver had been carrying `sources` on every `ShoppingItem` (the
case, each closure, the seal disc, the adapter, and the reload's ThrustCurve page) all along — the UI
just never rendered them. For a safety-framed shopping aid, that's the gap most worth closing: a flyer
should be able to click straight from "buy this closure" to the manufacturer/vendor page it's asserted
from, and check it, without taking Muster's word for it.

So each reusable part and the reload now show a small **"Source: host"** line — the same provenance
line the crossload cautions already used, now extracted into one shared `SourceLinks` component
(`components/SourceLinks.tsx`) that both the shopping list (interactive and the deep-link reload page)
and the two crossload panels render, so provenance looks and reads identically everywhere. The host
label comes from a pure, tested `sourceHost()` (`lib/links.ts`) that degrades to the raw string rather
than throwing on a malformed URL, and a catalog-wide test asserts every reload's source resolves to a
non-empty label. The line also **dedupes by host** (`distinctSourceHosts()`): a node can cite two
pages on one domain — the crossloads name Cesaroni's FAQ *and* its Pro75 instructions, both pro38.com
— which labelled by host alone read as a confusing "pro38.com, pro38.com"; the citation now attributes
each domain once (the full URL list stays in the data). This one was caught by a real-browser
screenshot pass, not a test — axe and HTTP checks can't see a doubled label. It's **print-safe** —
provenance belongs on the paper parts sheet you take to the bench — and e2e tests assert a reusable
part surfaces a real external source link and that the crossload line shows `pro38.com` exactly once.
The copy-list text is deliberately left terse (no URLs) — the on-screen and printed list carry the
links; the pasteable order stays clean.

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

The "I have a reload" **search picker** shares that ordering: its results run low-to-high by total
impulse (`byImpulse` in the same `lib/filter.ts`), so a diameter's reloads read H → I → J → K rather
than riding on whatever order the ThrustCurve mirror happens to carry — one consistent, scannable
order everywhere reloads are listed. An e2e test asserts the rendered picker order stays ascending.

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

These deep pages are the ones people actually share, so they carry a proper **social card**. That took
fixing a subtle trap: Next.js *replaces* — never deep-merges — a page's `openGraph`/`twitter` over the
root layout's, so the case and reload pages, which set their own title/description without re-stating the
image, were silently shipping an imageless `summary` card while only the home page shared richly. The
social metadata now flows through one `socialCard()` helper in `lib/seo.ts` that always attaches the
shared branded card image (the build-time `og/default.png`, the family template) and the
`summary_large_image` type — the layout and both deep pages all build their card through it, and a unit
test holds the contract so a page can't drop the image again. A shared link to any case or reload now
renders the same branded 1200×630 card, with the entity's name in the card copy.

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
tool, both deep-link pages, and a crossload page. A visitor's OS **"reduce motion"** setting is
honoured too (`globals.css`): the app's only motion is colour/opacity transitions — no movement or
animation — but someone who's asked their system for a static UI shouldn't have that ignored, so
under `prefers-reduced-motion` transitions collapse to instant (an e2e proves a normally-transitioning
control goes to ~0 duration under the preference — timing axe can't check).

One thing the axe audit *can't* see is a missing announcement: selecting a case or reload swaps a
whole result panel and shopping list into the page with no scroll or focus change, so a sighted user
sees it appear but a screen-reader user is told nothing — the markup is valid either way. A persistent
polite live region (`role="status"`, always in the DOM so a text change is announced) carries a terse
summary of what changed — "RMS-38/360 case selected. 12 reloads it can fly." then "Shopping list ready:
I161W in the RMS-38/360 case." — a count, never the whole list. An e2e test drives both directions and
asserts the announcement.

The reload **search** had the same silent-update problem, one step earlier: typing in the search box
re-filters the list and updates a "N matches" count, but a screen-reader user heard nothing — the
count was a plain paragraph. That count is now a polite live region too (`aria-live` on the visible
count, so there's one source of truth rather than a shadow sr-only node; plain `aria-live` rather than
`role="status"` keeps it distinct from the selection region above, which the e2e targets by role), so a
search over 500-plus reloads announces "12 matches" as the flyer types. An e2e test types a query and
asserts the announced number matches the rendered results.

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
