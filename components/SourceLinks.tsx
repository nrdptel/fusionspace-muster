import { sourceHost } from "@/lib/links";

/** The "Source: host, host" provenance line, shared by every sourced node in the UI — the
 *  shopping list's reusable parts and reload, and the crossload cautions. Muster's credibility
 *  is its sourcing, so each part shows where it comes from, and it does so the same way
 *  everywhere. Links inherit the surrounding text colour, so it reads right in both the neutral
 *  list and the amber caution; server-safe (no hooks), and it prints — provenance belongs on the
 *  paper parts sheet too. */
export default function SourceLinks({
  sources,
  label,
  className = "",
}: {
  sources: string[];
  /** Override the auto "Source" / "Sources" heading. */
  label?: string;
  /** Wrapper classes — the caller sets the muted colour for its context. */
  className?: string;
}) {
  if (sources.length === 0) return null;
  const heading = label ?? (sources.length === 1 ? "Source" : "Sources");
  return (
    <p className={className}>
      {heading}:{" "}
      {sources.map((s, i) => (
        <span key={s}>
          {i > 0 ? ", " : ""}
          <a
            href={s}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-opacity hover:opacity-70"
          >
            {sourceHost(s)}
          </a>
        </span>
      ))}
    </p>
  );
}
