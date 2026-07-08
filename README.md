# Muster

[![test](https://github.com/nrdptel/fusionspace-muster/actions/workflows/test.yml/badge.svg)](https://github.com/nrdptel/fusionspace-muster/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Motor-hardware compatibility for high-power rocketry, at
[muster.fusionspace.co](https://muster.fusionspace.co).

Reloadable motor hardware is a graph, and it's easy to get lost in it: a case fits some
reloads directly and others only with spacers, each reload needs the right forward and aft
closures, and a few need a seal disc or a plugged closure. Muster makes that graph
interactive. Tell it a case you own and it shows every reload it can fly — directly or with
spacers — each reload's certification, and the complete list of reusable hardware to buy.
Or start from a reload and it works back to the cases and hardware that fly it.

**Muster is a shopping aid, not an assembly guide. The reload's own printed instructions are
always the authority on the hardware it needs** — build to them, and confirm every part with
the manufacturer before you buy or fly.

Part of [Fusion Space](https://fusionspace.co) — free, polished tools for high-power
rocketry. See also the [HPR Motor Finder](https://motor.fusionspace.co),
[Charge](https://charge.fusionspace.co), and [Window](https://window.fusionspace.co).

## What it does

The page works in two directions, chosen with one toggle:

- **I have a case** — pick a case you own and see every reload it flies. Reloads built for
  the case are **direct fits**; a longer case also flies shorter reloads as **spacer fits**,
  grouped by how many spacers they need. Each reload shows its total impulse, average thrust,
  propellant, delays, certifying body, and flags for plugged (no ejection charge) and sparky
  propellant.
- **I have a reload** — search by designation, class, or propellant and see the cases that
  fly it: its own case, plus any longer case that reaches it with the adapter and spacers.

Either way, picking a result builds the **shopping list**: the reusable hardware to own once
(case, forward and aft closures, a seal disc on the longer cases, the adapter for a spacer
fit) separated from the single-use reload to buy, with the part numbers and a plain-text copy
for a club chat or an order. Conservative notes flag a plugged reload, a sparky propellant,
an out-of-production reload, and every spacer fit.

Scope today is the full **AeroTech RMS** line — 24, 29, 38, and 54 mm — which is the messiest
and most-asked corner of the hobby. The 38 mm Reload Adapter System spacer chart is resolved
exactly; the model leaves clean room for CTI Pro and cross-brand work later.

- **Certification as a dimension, not a checkbox** — each reload carries its certifying body
  (NAR / Tripoli) or a caution when none is listed, and out-of-production is shown as its own
  status, never conflated with decertified.
- **Every fit is typed** — direct vs. spacer, and how many spacers, never a bare yes/no.
- **Sourced end to end** — the reload catalog is mirrored from ThrustCurve; the hardware
  graph (cases, closures, seal-disc rules, the 38RAS spacer chart) is curated by hand from
  the manufacturer's published hardware, and every part and rule cites its source in the repo.
- **Shareable** — the whole selection lives in the URL, so a resolved view is a link.
- **Private by default** — everything runs in your browser. No account, no server, no
  analytics or tracking of any kind.
- Installable, and works **offline** once loaded — the whole dataset ships with the page, so
  it works at a remote field or a vendor's booth with no signal.

## How the data works

Two halves meet in a small resolver:

- The **reload catalog** — designations, impulse, thrust, delays, propellant, and
  certification — is a static mirror of [ThrustCurve](https://www.thrustcurve.org)
  (`lib/data/reloads.json`), and the reload → case mapping is ThrustCurve's own per-motor
  case field.
- The **hardware graph** — cases, closures, seal-disc rules, and the AeroTech Reload Adapter
  System spacer table — is curated in `lib/data/hardware.ts`, with a source on every node.

Spacer compatibility is resolved only for 38 mm, whose case lengths step by exactly one grain
and whose full spacer chart AeroTech publishes; 29 mm and 54 mm carry an advisory instead of
a fabricated step. The resolver (`lib/resolve.ts`) is pure and tested, and the graph fails the
build on a dangling reference, because a wrong edge here is a safety problem, not a typo.

## Running locally

Static site built with Next.js and Tailwind, exported to plain HTML/CSS/JS. Everything runs
in the browser; there is no backend.

```
npm install
npm run dev      # local dev server
npm run build    # static export to ./out
npm test         # run the unit tests
npm run lint     # lint
```

## Deploying

Hosted on Cloudflare Pages as a fully static site. Build command `npm run build`, output
directory `out`. No Functions, no server-side code.

## Disclaimer

Personal, non-commercial project — not affiliated with any rocketry vendor, manufacturer, or
certification organization. Built for the hobby rocketry community.

## License

Released under the [MIT License](LICENSE) — fork it, modify it, deploy your own copy, no
attribution required.
