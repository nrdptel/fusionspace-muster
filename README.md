# Muster

[![test](https://github.com/nrdptel/fusionspace-muster/actions/workflows/test.yml/badge.svg)](https://github.com/nrdptel/fusionspace-muster/actions/workflows/test.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Motor-hardware compatibility for high-power rocketry, at
[muster.fusionspace.co](https://muster.fusionspace.co).

Reloadable motor hardware is a graph, and it's easy to get lost in it: a case fits some
reloads directly and others only with spacers, each reload needs the right closures, and a few
need a seal disc or a plugged closure. Muster makes that graph interactive across **AeroTech
RMS**, **Cesaroni Pro**, and **Loki Research**. Tell it a case you own and it shows every reload it can fly —
directly or with spacers — each reload's certification, and the complete list of reusable
hardware to buy. Or start from a reload and it works back to the cases and hardware that fly it.

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

A companion **kit planner** turns the same graph on your own hardware: check off the cases and
adapters you own and it counts every reload your kit already flies, then ranks the single
purchase that unlocks the most more — and it won't suggest a case whose reloads you can already
reach with a spacer. Your kit stays on the device, nothing uploaded.

Scope today is **AeroTech RMS** (24–98 mm), **Cesaroni Pro** (24–98 mm), and **Loki Research**
(38–76 mm) — the systems most high-power flyers actually own. Choose the system with one toggle;
the hardware never interchanges across brands, and Muster won't let a result cross that line.
Spacer fits are resolved where the manufacturer publishes the rule (AeroTech 38 mm, Cesaroni
Pro29/38/54) and flagged as an advisory elsewhere; Loki publishes no spacer system, so its
reloads are direct-fit only. Cross-brand certification is a natural next step.

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
- The **hardware graph** — cases, closures, seal-disc rules, and spacer rules — is curated by
  hand: `lib/data/hardware.ts` for AeroTech RMS, `lib/data/hardware-cti.ts` for Cesaroni Pro, and
  `lib/data/hardware-loki.ts` for Loki Research, with a source on every node. Cases, closures, and
  adapters all carry their manufacturer, and a reload can never resolve to another brand's hardware.

Spacer compatibility is resolved only where the manufacturer publishes the rule — AeroTech
38 mm (its full spacer chart) and Cesaroni Pro29/38/54 (up to two spacers, one or two grain
sizes shorter). Everywhere else it's a sourced advisory rather than a fabricated step; Loki
Research publishes no spacer system, so its reloads are modeled direct-fit only. The
resolver (`lib/resolve.ts`) is pure and tested, and the graph is checked against a safety
contract (`lib/validate.ts`) on every build: a dangling reference, a spacer rule that steps the
wrong way (a longer reload into a shorter case), a source-less part, or a plugged reload that
still claims an ejection charge all fail `next build`, because a wrong edge here is a safety
problem, not a typo.

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
