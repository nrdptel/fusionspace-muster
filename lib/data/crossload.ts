// Cross-brand crossloads — the ONE place Muster's same-manufacturer rule bends, and only
// because the manufacturers themselves publish it.
//
// AeroTech and Cesaroni are otherwise incompatible (threaded aluminum vs. snap-ring / formed-rim
// closures, different reload formats). But at 75 mm and 98 mm the two are deliberately
// interchangeable: Cesaroni engineered its Pro75/Pro98 reloads to share the RMS case ID and
// closure engagement, publishes an exact case-size equivalence table, and ships the o-rings for
// either brand. AeroTech, in turn, certified its own 75/98 reloads for Cesaroni hardware (its
// "crossload" program). This is the only cross-brand loading either company sanctions — nothing
// at 29/38/54 mm is, so nothing there is modeled.
//
// A crossload is never shown as a resolved "fit"; it's a conservative, sourced advisory carrying
// each manufacturer's own conditions, because the two directions are NOT symmetric in their
// warnings (see the notes below).
//
// Sources:
//   Cesaroni FAQ (case equivalence table + o-ring rule + "must certify in the hardware used"):
//     https://pro38.com/frequently-asked-questions/
//   Cesaroni Pro75 instructions (parallel Pro75 / RMS assembly sections, o-ring kit rule):
//     https://pro38.com/wp-content/uploads/2024/11/Pro75_Instructions.pdf
//   AeroTech "AT Crossloads" (AeroTech reloads certified for Cesaroni hardware):
//     https://www.facebook.com/flyaerotech/posts/10153819878663955
//   AeroTech advisory against Cesaroni reloads in RMS hardware (add a forward seal disc; no warranty):
//     https://www.facebook.com/flyaerotech/posts/10154222698233955

export const CROSSLOAD_SOURCES = [
  "https://pro38.com/frequently-asked-questions/",
  "https://pro38.com/wp-content/uploads/2024/11/Pro75_Instructions.pdf",
  "https://www.facebook.com/flyaerotech/posts/10153819878663955",
];

/** One published case-size equivalence between an AeroTech RMS case and a Cesaroni Pro case. */
export interface CrossloadPair {
  /** AeroTech RMS case designation. */
  rms: string;
  /** Cesaroni Pro case designation of the same total impulse. */
  pro: string;
  diameter: 75 | 98;
}

// Verbatim from Cesaroni's published Pro↔RMS cross-reference (75 and 98 mm only). Only pairs
// where BOTH designations exist in the catalog are listed; the Pro 6GXL / 5G-98 and the
// AeroTech-only lengths (75/1280, 75/10240, 98/18000, 98/20480) have no published equivalent.
export const CROSSLOAD_PAIRS: CrossloadPair[] = [
  { rms: "RMS-75/2560", pro: "Pro75-2G", diameter: 75 },
  { rms: "RMS-75/3840", pro: "Pro75-3G", diameter: 75 },
  { rms: "RMS-75/5120", pro: "Pro75-4G", diameter: 75 },
  { rms: "RMS-75/6400", pro: "Pro75-5G", diameter: 75 },
  { rms: "RMS-75/7680", pro: "Pro75-6G", diameter: 75 },
  { rms: "RMS-98/2560", pro: "Pro98-1G", diameter: 98 },
  { rms: "RMS-98/5120", pro: "Pro98-2G", diameter: 98 },
  { rms: "RMS-98/7680", pro: "Pro98-3G", diameter: 98 },
  { rms: "RMS-98/10240", pro: "Pro98-4G", diameter: 98 },
  { rms: "RMS-98/15360", pro: "Pro98-6G", diameter: 98 },
];

// The two directions carry different manufacturer conditions — this is why a crossload can't be a
// single symmetric "fit".

/** An AeroTech reload flown in a Cesaroni case (AeroTech's sanctioned direction). */
export const NOTE_RMS_IN_CTI =
  "AeroTech certifies its 75 and 98 mm reloads for Cesaroni hardware (its “crossload” " +
  "program). A single-throat reload loads as-is; a Medusa-nozzle reload needs a single-throat " +
  "nozzle. Use the o-ring set specified for the Cesaroni case.";

/** A Cesaroni reload flown in an AeroTech RMS case (Cesaroni sanctions it; AeroTech advises against). */
export const NOTE_CTI_IN_RMS =
  "Cesaroni supplies the o-rings to fly its Pro75/98 reloads in RMS hardware — but AeroTech " +
  "recommends against it: an RMS case needs a forward seal disc and o-ring the Cesaroni reload " +
  "doesn’t include (forward-end overheating risk), and AeroTech won’t warranty the combination.";

/** Applies to both directions. */
export const NOTE_CERT =
  "A cross-brand motor must be certified in the hardware it’s flown in — treat this as a " +
  "starting point and build to the reload’s printed instructions.";
