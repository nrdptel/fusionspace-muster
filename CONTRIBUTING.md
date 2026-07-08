# Contributing

Thanks for your interest! This is a personal hobby project, but issues and PRs
are welcome — especially corrections and additions to the hardware data, and
anything that makes a compatibility result clearer or safer.

## Project layout

This is a single Next.js app, statically exported. There is no backend.

- `app/` — the page, layout, metadata, robots/sitemap, and error/not-found pages.
- `components/` — the tool UI (pickers, results, shopping list), theme toggle,
  header, footer.
- `lib/` — the data and the resolver:
  - `lib/data/reloads.json` — the reload catalog, a mirror of ThrustCurve.
  - `lib/data/hardware.ts` — the curated hardware graph: cases, closures, seal
    discs, and the adapter/spacer rules. **Every node cites its source.**
  - `lib/graph.ts` — assembles the graph and validates it at build time.
  - `lib/resolve.ts` — the pure compatibility resolver, with tests alongside.

The resolver and the data are deliberately isolated from the UI so they can be
read and tested on their own — fitting for a tool whose credibility is the data.

## The data comes first

A wrong edge in the hardware graph can mean a wrong shopping list, so the bar for
data changes is high:

- **Cite a source** for every case, reload, closure, and spacer rule — the
  manufacturer (AeroTech) or a certification org, not a forum guess.
- **Never assert a spacer step you can't source.** The 38 mm chart is resolved
  because AeroTech publishes it; 29 mm and 54 mm stay advisory for a reason.
- Keep the framing conservative. The reload's printed instructions are always the
  authority; Muster is a shopping aid, and the copy should never imply otherwise.

## Setup

```bash
npm install
npm run dev   # http://localhost:3000
```

## Checks (run before opening a PR)

These mirror CI (`.github/workflows/test.yml`); all must pass.

```bash
npm run lint        # eslint
npm test            # vitest unit tests (resolver + formatting)
npm run build       # also type-checks and validates the graph (CI gate)
npm run test:e2e    # Playwright (incl. an axe accessibility audit) — run after a build
```

## Conventions

- Match the surrounding code's style, naming, and comment density.
- Keep commits focused; describe the *why* in the message.
- Never present a compatibility result as authoritative. Transparency about the
  source and a clear push toward the reload's instructions are core to this tool —
  keep them intact.
