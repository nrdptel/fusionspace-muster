import { RELOADS_SOURCE } from "@/lib/graph";
import { AEROTECH_URL, THRUSTCURVE_URL } from "@/lib/links";
import { Disclosure } from "./ui";

/** "Show your work" — the same transparency habit the siblings use. How compatibility is
 *  read, how the AeroTech RMS system works, and exactly where the data comes from. */
export default function Methodology() {
  return (
    <section id="methodology" className="mt-12">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        How Muster reads compatibility
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        Muster is a lookup over a small, sourced graph — reloads, the cases they&apos;re built
        for, the closures every case needs, and the spacer rules that let one case fly more than
        one reload. Nothing here is computed or inferred; it&apos;s the manufacturer&apos;s own
        hardware system, written down and made searchable. The reload&apos;s printed instructions
        are always the final authority.
      </p>

      <div className="mt-4">
        <Disclosure summary="How a reload fits a case — direct vs. spacer">
          <p>
            Every AeroTech RMS reload is built for one case length, shown as{" "}
            <span className="font-mono">RMS-38/360</span> and the like — the number is the
            case&apos;s approximate maximum total impulse in newton-seconds. A reload drops
            straight into that case: a <strong>direct fit</strong>.
          </p>
          <p>
            A <strong>longer</strong> case can fly a <strong>shorter</strong> reload too, by taking
            up the empty length with spacers. That&apos;s a <strong>spacer fit</strong>, and it
            needs AeroTech&apos;s Reload Adapter System (RAS): a floating forward closure plus one
            or two case spacers. Muster only resolves the exact spacer count for{" "}
            <strong>38&nbsp;mm</strong>, whose case lengths step by one grain each and whose full
            spacer chart AeroTech publishes. For 29&nbsp;mm and 54&nbsp;mm the case lengths
            aren&apos;t evenly spaced, so Muster flags that a RAS exists and points you to the
            instructions rather than asserting a step it can&apos;t source.
          </p>
          <p>
            The one exception is the mid-power <span className="font-mono">RMS-29/40-120</span>{" "}
            case: its shorter reloads carry their own spacers in the box, so it flies a whole range
            with no separate adapter.
          </p>
        </Disclosure>

        <Disclosure summary="What you own vs. what's in the reload">
          <p>
            The reusable metal <strong>hardware</strong> you buy once: the case, a forward closure,
            an aft closure (which holds the nozzle), and — on the longer cases — a forward seal
            disc. Within a diameter, the closures are shared across <em>every</em> case length,
            which is the whole economy of a reloadable system.
          </p>
          <p>
            Everything single-use is in the <strong>reload kit</strong>: the propellant grains, the
            liner, the nozzle, the o-rings, the delay element, the igniter, and (unless the reload
            is plugged) the ejection charge. You discard all of it after the flight and load a fresh
            kit next time.
          </p>
          <p>
            A <strong>plugged</strong> reload has no ejection charge and must be flown with
            electronic deployment and a plugged forward closure. A{" "}
            <strong>sparky</strong> (metal-loaded) propellant is often restricted at the field.
            Muster flags both.
          </p>
        </Disclosure>

        <Disclosure summary="Certification, and what it doesn't mean">
          <p>
            Each reload shows its certifying body — <strong>NAR</strong> or{" "}
            <strong>Tripoli (TRA)</strong> — as recorded by ThrustCurve, or a caution when none is
            listed. Certification is what lets you fly a motor at an insured launch; always confirm
            the current status with the certifying organization, since listings change.
          </p>
          <p>
            <strong>Out of production is not the same as decertified.</strong> An out-of-production
            reload stays flyable until stocks run out; Muster marks it so you know it may be hard to
            find, not that it&apos;s disallowed. Muster never marks a motor decertified on its own —
            that&apos;s a call for the cert organizations, and their notices are authoritative.
          </p>
        </Disclosure>

        <Disclosure summary="Where the data comes from">
          <p>
            The reload catalog — designations, impulse, thrust, delays, propellant, and
            certification — is mirrored from{" "}
            <a
              href={THRUSTCURVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400"
            >
              ThrustCurve
            </a>
            , the community motor database, and each reload links back to its page. The mapping of
            reload to case is ThrustCurve&apos;s own per-motor case field.
          </p>
          <p>
            The hardware graph — the cases, the closures, the seal-disc rules, and the{" "}
            <a
              href={AEROTECH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400"
            >
              AeroTech
            </a>{" "}
            Reload Adapter System spacer chart — is curated by hand from the manufacturer&apos;s and
            vendors&apos; published hardware, and every part and rule cites its source in the repo.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Reload data fetched {RELOADS_SOURCE.fetched}. {RELOADS_SOURCE.note}
          </p>
        </Disclosure>
      </div>
    </section>
  );
}
