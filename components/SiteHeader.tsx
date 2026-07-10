import FusionSpaceBadge from "./FusionSpaceBadge";
import ThemeToggle from "./ThemeToggle";
import KofiButton from "./KofiButton";

export default function SiteHeader() {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-6 dark:border-zinc-800">
      <div>
        <FusionSpaceBadge className="mb-1.5" />
        <h1 className="text-2xl font-semibold tracking-tight">Muster</h1>
        <p className="mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
          Motor-hardware compatibility for high-power rocketry. Start from a reloadable case
          you own and see which reloads fit — directly or with spacers — the closures they
          need, and the full shopping list to fly. Or start from a reload and work back.
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2 print:hidden">
        <ThemeToggle />
        <KofiButton />
      </div>
    </header>
  );
}
