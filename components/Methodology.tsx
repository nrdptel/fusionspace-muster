import { RELOADS_SOURCE } from "@/lib/graph";
import { AEROTECH_URL, CESARONI_URL, LOKI_URL, THRUSTCURVE_URL } from "@/lib/links";
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
            Every reload is built for one case length. AeroTech RMS and Loki Research name it by
            impulse — <span className="font-mono">RMS-38/360</span> and{" "}
            <span className="font-mono">76/6000</span>, the number being the case&apos;s approximate
            newton-seconds — while Cesaroni Pro names it by grain count —{" "}
            <span className="font-mono">Pro38-3G</span>. A reload drops straight into its own case:
            a <strong>direct fit</strong>.
          </p>
          <p>
            A <strong>longer</strong> case can fly a <strong>shorter</strong> reload too, by taking
            up the empty length with spacers — a <strong>spacer fit</strong>. AeroTech uses its
            Reload Adapter System (RAS); Cesaroni sells case spacers. Both cap it at{" "}
            <strong>two spacers</strong>, so a case reaches only one or two sizes shorter. Muster
            resolves the exact count where the manufacturer publishes the rule — AeroTech{" "}
            <strong>38&nbsp;mm</strong> and Cesaroni <strong>Pro29/38/54</strong> — and elsewhere
            (AeroTech 29/54&nbsp;mm, Cesaroni Pro24/75/98 and the 6GXL cases) it flags that spacers
            exist and points you to the instructions rather than asserting a step it can&apos;t
            source. <strong>Loki Research</strong> publishes no spacer system at all, so its reloads
            are direct-fit only — each one matched to its own case.
          </p>
          <p>
            The mid-power <span className="font-mono">RMS-29/40-120</span> case is a special case:
            its shorter reloads carry their own spacers in the box, so it flies a whole range with
            no separate adapter.
          </p>
        </Disclosure>

        <Disclosure summary="Cross-brand crossloads (75 & 98 mm)">
          <p>
            Muster keeps the brands apart on purpose — their hardware doesn&apos;t interchange — with
            one sourced exception the manufacturers themselves publish: at{" "}
            <strong>75&nbsp;mm and 98&nbsp;mm</strong>, AeroTech RMS and Cesaroni Pro are deliberately
            cross-compatible. Cesaroni engineered its Pro75/98 reloads to share the RMS case and ships
            the o-rings for either brand, and AeroTech certified its own 75/98 reloads for Cesaroni
            hardware. Muster shows these as a distinct <strong>crossload</strong> caution — never a
            green &ldquo;direct fit&rdquo; — with each maker&apos;s own conditions attached.
          </p>
          <p>
            The two directions aren&apos;t symmetric. An AeroTech reload in a Cesaroni case is
            AeroTech&apos;s sanctioned &ldquo;crossload&rdquo; (a Medusa-nozzle reload needs a
            single-throat nozzle). A Cesaroni reload in an RMS case is something{" "}
            <strong>AeroTech advises against</strong> — the RMS case wants a forward seal disc the
            Cesaroni reload doesn&apos;t include, and AeroTech won&apos;t warranty it. Either way, a
            cross-brand motor has to be certified in the hardware it&apos;s flown in.
          </p>
          <p>
            Nothing at <strong>29/38/54&nbsp;mm</strong> is a crossload: no manufacturer or
            certification body sanctions it, and the closures and reload formats differ, so Muster
            doesn&apos;t show it — a wrong cross-brand pairing is exactly the kind of edge that ends
            in a CATO.
          </p>
        </Disclosure>

        <Disclosure summary="What you own vs. what's in the reload">
          <p>
            The reusable metal <strong>hardware</strong> you buy once, shared across every case
            length in a diameter. For AeroTech RMS that&apos;s the case, a forward closure, an aft
            closure, and — on the longer cases — a forward seal disc. Cesaroni Pro reuses less: on{" "}
            <strong>Pro38</strong> you reuse only the case (both closures ship in the reload), on
            Pro24/29/54 the case plus a rear closure, and on Pro75/98 the full set.{" "}
            <strong>Loki Research</strong> reuses the most — the case, the forward bulkhead, and the
            graphite nozzle all carry over, so its reload is only the liner, grains, o-rings, and a
            delay or smoke element. Loki&apos;s nozzle is sold by throat number and must match the
            reload; some longer 54&nbsp;mm reloads need its extended bulkhead.
          </p>
          <p>
            Everything single-use is in the reload. An AeroTech <strong>kit</strong> is assembled
            from parts — grains, liner, nozzle, o-rings, delay element, igniter, and (unless
            plugged) the ejection charge. A Cesaroni <strong>cartridge</strong> comes preassembled
            and loads as one piece. Either way you discard it after the flight and load a fresh one.
          </p>
          <p>
            A <strong>plugged</strong> reload has no ejection charge and must be flown with
            electronic deployment and a plugged forward closure — common on Cesaroni, which sells
            many reloads in both a delay and a plugged version. A <strong>sparky</strong>{" "}
            (metal-loaded) propellant is often restricted at the field. Muster flags both.
          </p>
        </Disclosure>

        <Disclosure summary="Certification, and what it doesn't mean">
          <p>
            Each reload shows its certifying body — <strong>NAR</strong>,{" "}
            <strong>Tripoli (TRA)</strong>, or <strong>CAR</strong> (the Canadian body that certifies
            most Cesaroni motors) — as recorded by ThrustCurve, or a caution when none is listed.
            Certification is what lets you fly a motor at an insured launch; always confirm the
            current status with the certifying organization, since listings change.
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
            The hardware graph — the cases, the closures, the seal-disc rules, and the spacer rules
            from{" "}
            <a
              href={AEROTECH_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400"
            >
              AeroTech
            </a>{" "}
            and{" "}
            <a
              href={CESARONI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400"
            >
              Cesaroni
            </a>
            , and{" "}
            <a
              href={LOKI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-500 dark:text-indigo-400"
            >
              Loki Research
            </a>{" "}
            — is curated by hand from each manufacturer&apos;s and its vendors&apos; published
            hardware, and every part and rule cites its source in the repo.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Reload data fetched {RELOADS_SOURCE.fetched}. {RELOADS_SOURCE.note}
          </p>
        </Disclosure>
      </div>
    </section>
  );
}
