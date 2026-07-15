"use client";

import { useEffect, useState } from "react";
import { getAvailabilityFeed, availabilityOf, type Availability } from "@/lib/availability";

/** A best-effort "is it buyable right now?" signal for a reload, read from the Motor Finder's bulk
 *  availability feed (the sibling that owns cross-vendor stock). Availability only — no prices; the
 *  "Find it in stock" link beside it hands pricing off. It renders NOTHING until the feed resolves,
 *  and nothing at all offline, on any error, or for a reload the Motor Finder doesn't track — so it
 *  never blocks Muster's own (offline, bundled) answer. The whole page shares one feed fetch, so
 *  badging a case's ~30 reloads costs a single request. Hidden in print — a live stock state can't go
 *  onto paper without going stale the moment it prints. */
export default function AvailabilitySignal({
  manufacturer,
  designation,
}: {
  manufacturer: string;
  designation: string;
}) {
  const [data, setData] = useState<Availability | null>(null);

  useEffect(() => {
    let live = true;
    getAvailabilityFeed().then((f) => {
      if (live) setData(availabilityOf(f, { manufacturer, designation }));
    });
    return () => {
      live = false;
    };
  }, [manufacturer, designation]);

  if (!data) return null;

  const label = data.anyInStock
    ? `In stock · ${data.inStock} vendor${data.inStock === 1 ? "" : "s"}`
    : "Out of stock everywhere";

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
