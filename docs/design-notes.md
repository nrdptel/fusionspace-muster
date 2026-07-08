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
  impulse, thrust, delays, propellant, certification, and — crucially — ThrustCurve's own
  per-motor `caseInfo`, which *is* the authoritative reload → case mapping.
- **Hardware** (`lib/data/hardware.ts`) — the curated half: cases (with the closures they
  share, the seal-disc rule, and adapter eligibility), the forward/aft closures, the seal
  discs, and the Reload Adapter System with its spacer table. Every node cites a source.
- **Resolver** (`lib/resolve.ts`) — pure functions: `resolveCase`, `resolveReload`,
  `shoppingList`. `fit` is never a boolean — it carries *how* (direct vs. adapter) and *how
  many spacers*, and each reload carries certification + production status. Two axes, because
  those are the two a flyer actually reasons about.

`lib/graph.ts` joins the two and **validates at build time** — a reload pointing at an unknown
case, or an adapter rule crossing diameters, fails `next build`. Cheap insurance for data that
drives hardware buying.

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

AeroTech RMS end-to-end — 24 / 29 / 38 / 54 mm, ~24 cases and 133 reloads — because it's the
messiest and most-asked system, and depth beats breadth for a safety tool. The types are
brand-agnostic (`Manufacturer`, `MotorSystem`), so CTI Pro and cross-brand certification are a
data addition, not a rewrite.

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
