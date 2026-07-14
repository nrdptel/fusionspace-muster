"use client";

import { useEffect, useState } from "react";
import { fetchAvailability, type Availability } from "@/lib/availability";

/** A best-effort "is it buyable right now?" signal for a reload, read live from the HPR Motor Finder
 *  (the sibling that owns cross-vendor stock). Availability only — no prices; the "where to buy" link
 *  beside it hands pricing off. It renders NOTHING until a fetch succeeds, and nothing at all offline
 *  or on any error, so it never blocks or delays Muster's own (offline, bundled) answer. Hidden in
 *  print — a paper sheet can't carry a live stock state without going stale the moment it's printed. */
export default function AvailabilitySignal({
  manufacturer,
  designation,
}: {
  manufacturer: string;
  designation: string;
}) {
  const [data, setData] = useState<Availability | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    let live = true;
    fetchAvailability({ manufacturer, designation }, ctrl.signal).then((a) => {
      if (live) setData(a);
    });
    return () => {
      live = false;
      ctrl.abort();
    };
  }, [manufacturer, designation]);

  if (!data) return null;

  const label = data.anyInStock
    ? `In stock now${data.inStock != null ? ` · ${data.inStock} vendor${data.inStock === 1 ? "" : "s"}` : ""}`
    : "Out of stock everywhere right now";

  return (
    <span
      className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium print:hidden"
      title="Live vendor availability from the HPR Motor Finder, refreshed hourly. Prices are on the Motor Finder."
    >
      <span
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${data.anyInStock ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"}`}
      />
      <span className={data.anyInStock ? "text-emerald-700 dark:text-emerald-400" : "text-zinc-500 dark:text-zinc-400"}>
        {label}
      </span>
    </span>
  );
}
