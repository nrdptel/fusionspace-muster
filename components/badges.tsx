import type { AdapterSystem, Reload } from "@/lib/data/types";
import { certLabel, fitLabel, type FitKind } from "@/lib/resolve";

/** A small status pill in the family's style. */
export function Pill({
  children,
  tone = "zinc",
  title,
}: {
  children: React.ReactNode;
  tone?: "zinc" | "emerald" | "indigo" | "amber";
  title?: string;
}) {
  const tones: Record<string, string> = {
    zinc: "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300",
    emerald:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    indigo: "border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Certification status. Certified reads reassuring (emerald); unlisted is a quiet caution. */
export function CertBadge({ reload }: { reload: Reload }) {
  if (!reload.certOrg) {
    return (
      <Pill tone="amber" title="No certifying organization is listed for this motor in ThrustCurve.">
        Cert unlisted
      </Pill>
    );
  }
  return (
    <Pill tone="emerald" title={`Certified by the ${reload.certOrg === "TRA" ? "Tripoli Rocketry Association" : reload.certOrg}. Confirm current status on ThrustCurve.`}>
      {certLabel(reload)}
    </Pill>
  );
}

/** Out-of-production flag — shown only when it applies. Deliberately not "decertified". */
export function AvailabilityBadge({ reload }: { reload: Reload }) {
  if (reload.availability !== "OOP") return null;
  return (
    <Pill tone="amber" title="Out of production — still flyable until stocks run out, but harder to find. Not the same as decertified.">
      Out of production
    </Pill>
  );
}

/** How the reload fits the case: a direct fit, or a spacer fit via the adapter. */
export function FitBadge({ fit, spacers, adapter }: { fit: FitKind; spacers: number; adapter?: AdapterSystem }) {
  if (fit === "native") {
    return (
      <Pill tone="emerald" title="Built for this case — no adapter needed.">
        Direct fit
      </Pill>
    );
  }
  return (
    <Pill tone="indigo" title={`Needs the ${adapter?.designation ?? "adapter"} floating forward closure and ${spacers} spacer${spacers === 1 ? "" : "s"}. Confirm against the instructions.`}>
      {fitLabel(fit, spacers, adapter)}
    </Pill>
  );
}

/** Plugged (electronic-deployment-only) flag. */
export function PluggedBadge({ reload }: { reload: Reload }) {
  if (reload.ejectionCharge) return null;
  return (
    <Pill tone="indigo" title="No ejection charge — fly with electronic deployment and a plugged forward closure.">
      Plugged
    </Pill>
  );
}

/** Sparky (metal-loaded) propellant flag — many fields restrict these. */
export function SparkyBadge({ reload }: { reload: Reload }) {
  if (!reload.sparky) return null;
  return (
    <Pill tone="amber" title="Sparky (metal-loaded) propellant — often restricted for fire risk. Check your field's rules.">
      Sparky
    </Pill>
  );
}
