# Security Policy

This is a hobby project, but security reports are very welcome.

## Reporting a vulnerability

Please **report privately** — do not open a public issue for security problems.

Use GitHub's private vulnerability reporting:
[**Report a vulnerability**](https://github.com/nrdptel/fusionspace-muster/security/advisories/new)

Please include steps to reproduce and the impact you observed. I'll acknowledge
as soon as I can and work on a fix; since this is a side project, response times
are best-effort.

## Scope

This is a fully static site: there is no backend, no API, and no accounts. The
tool runs entirely in your browser over a dataset bundled with the page, and the
only thing it stores (your theme preference) stays in your browser's local
storage — nothing is uploaded.

In scope: the web app itself (the page, the client-side resolver and state
handling) and the build/deploy pipeline.

Out of scope: third-party services this integrates with (Cloudflare for hosting)
— report those to the respective vendor. A compatibility result that is wrong or
out of date is a **data** issue, not a security issue — please file it as a bug
with a manufacturer or cert-org source so the graph can be corrected.

## Known advisories

`npm audit` reports a **moderate** advisory in `postcss`, pulled in transitively
by Next.js. It concerns PostCSS's CSS *stringify* output and only affects
**build-time** processing of CSS. This project builds only its own first-party
Tailwind CSS (no untrusted CSS is processed), so there is no runtime exposure.
There is no fix available in the current Next.js major; it will clear when a
Next.js release bundles a patched PostCSS. Tracked, not a release blocker.
