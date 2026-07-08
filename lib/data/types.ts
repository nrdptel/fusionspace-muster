// The Muster data model.
//
// Muster resolves motor-hardware compatibility over a small graph:
//
//     reload ──flies in──▶ case ──needs──▶ closures + (seal disc) + (adapter/spacers)
//
// The *reloads* are mirrored from ThrustCurve (lib/data/reloads.json) — a factual
// catalog of certified motors. The *hardware graph* (cases, closures, adapters, and
// the spacer rules that let a shorter reload fly in a longer case) is the curated,
// hand-sourced part, in lib/data/hardware.ts. Every node carries its sources.
//
// Safety note carried through the whole model: this is a shopping aid. A reload's own
// printed instructions are always the authority on the hardware it needs; Muster never
// asserts a combination the manufacturer doesn't support.

export type Diameter = 24 | 29 | 38 | 54 | 75 | 98;

export type ImpulseClass =
  | "A" | "B" | "C" | "D" | "E" | "F" | "G"
  | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O";

export type Manufacturer = "AeroTech" | "Cesaroni" | "Loki";
/** RMS = AeroTech's assembled reload system; Pro = Cesaroni's self-contained cartridge system;
 *  Loki = Loki Research's assembled reload system (case + reusable closures, like RMS). */
export type MotorSystem = "RMS" | "Pro" | "Loki";

/** Which body certified the motor, as recorded by ThrustCurve. `null` = unlisted/unknown. */
export type CertOrg = "NAR" | "TRA" | "CAR" | null;

/** Production/availability, mirrored from ThrustCurve. "regular" = in production;
 *  "OOP" = out of production (still flyable until stocks run out, per NAR policy —
 *  out of production is NOT the same as decertified). */
export type Availability = "regular" | "OOP";

/** A single-use reload. For AeroTech RMS and Loki Research it's a kit you assemble; for
 *  Cesaroni Pro it's a self-contained cartridge. Sourced from ThrustCurve; see
 *  lib/data/reloads.json. */
export interface Reload {
  /** Stable slug, e.g. "at-i161w" or "cti-117g69-14a". */
  id: string;
  /** Full designation, e.g. "I161W" (AeroTech) or "117G69-14A" (Cesaroni). */
  designation: string;
  /** ThrustCurve common name, e.g. "I161". */
  commonName: string;
  manufacturer: Manufacturer;
  system: MotorSystem;
  impulseClass: ImpulseClass;
  diameter: Diameter;
  /** The case this reload is built for, verbatim from ThrustCurve, e.g. "RMS-38/360" or "Pro38-3G". */
  caseInfo: string;
  /** Average thrust in newtons (the number in the designation). */
  avgThrustN: number;
  /** Total impulse in newton-seconds. */
  totImpulseNs: number;
  /** Propellant formulation name, e.g. "White Lightning", or null. */
  propName: string | null;
  /** A "sparky" (metal-loaded) propellant — many fields restrict these. */
  sparky: boolean;
  /** Delay options as printed, e.g. "6,8,10,12,14" or "P" (plugged). */
  delays: string;
  /** Whether the delay is drilled/adjustable. */
  delayAdjustable: boolean;
  /** Plugged: no ejection charge — electronic deployment only. */
  plugged: boolean;
  /** Whether the reload includes a motor ejection charge (false when plugged). */
  ejectionCharge: boolean;
  availability: Availability;
  certOrg: CertOrg;
  /** ThrustCurve motor id and page, for provenance. */
  motorId: string;
  tcUrl: string;
}

export type HardwareKind = "case" | "forward-closure" | "aft-closure" | "seal-disc" | "adapter" | "grease";

/** A reusable hardware part (everything except the single-use reload). */
export interface HardwarePart {
  id: string;
  kind: HardwareKind;
  /** Human name, e.g. "38 mm forward closure". */
  name: string;
  diameter: Diameter;
  /** Manufacturer part number, where confirmed. Omitted when unverified. */
  partNumber?: string;
  /** Source URLs backing this part and its role. */
  sources: string[];
  notes?: string;
}

/** One rung of an adapter's spacer table: with this many spacers, the case flies
 *  the reloads built for `fliesCase`. */
export interface SpacerRule {
  /** The base case (by designation), e.g. "RMS-38/720". */
  baseCase: string;
  /** Number of case spacers required (1 or 2). */
  spacers: number;
  /** The (shorter) case whose reloads this combination flies, e.g. "RMS-38/480". */
  fliesCase: string;
}

/** AeroTech's Reload Adapter System (RAS) for a diameter: a floating forward closure
 *  plus case spacers that let one long case fly shorter reloads. Only the 38 mm table
 *  is encoded as explicit spacer rules (its case ladder steps by exactly one grain, and
 *  AeroTech publishes the full chart). 29 mm and 54 mm carry an advisory instead, because
 *  their case lengths aren't evenly spaced and we won't assert a step we can't source. */
export interface AdapterSystem {
  id: string;
  /** e.g. "38RAS". */
  designation: string;
  name: string;
  manufacturer: Manufacturer;
  diameter: Diameter;
  partNumber?: string;
  /** Reusable parts the kit contains. */
  contents: string[];
  /** Explicit, sourced spacer table (38 mm only). Empty when advisory-only. */
  rules: SpacerRule[];
  /** True when the diameter has a RAS but we only advise, not resolve, its steps. */
  advisoryOnly: boolean;
  sources: string[];
  notes?: string;
}

/** A reusable motor case. */
export interface MotorCase {
  id: string;
  /** e.g. "RMS-38/360" — matches Reload.caseInfo exactly. */
  designation: string;
  manufacturer: Manufacturer;
  system: MotorSystem;
  diameter: Diameter;
  /** The numeric length/impulse index, e.g. 360. For range cases, the top of the range. */
  slot: number;
  /** Display for the slot, e.g. "360" or "40–120". */
  slotLabel: string;
  /** True for the mid-power range cases (29/40-120, R/C 24/20-40) whose shorter reloads
   *  carry their own spacers — no separate adapter hardware. */
  rangeCase: boolean;
  /** Approximate maximum total impulse (N·s). */
  maxImpulseNs: number;
  partNumber?: string;
  /** Reusable forward closure id, when the flyer reuses one. Some systems ship the forward
   *  closure inside the reload (Cesaroni Pro38 reuses only the case). */
  forwardClosure?: string;
  /** Reusable aft/rear closure id, when the flyer reuses one. */
  aftClosure?: string;
  /** Forward seal disc id, when this case needs one (longer cases do). */
  sealDisc?: string;
  /** Adapter system id available for this diameter, when this case can take spacers. */
  adapter?: string;
  /** True when an adapter exists for the diameter but we only advise (29/54 mm). */
  adapterAdvisory?: boolean;
  sources: string[];
  notes?: string;
}
