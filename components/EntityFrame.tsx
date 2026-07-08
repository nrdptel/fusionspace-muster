import Link from "next/link";
import FusionSpaceBadge from "./FusionSpaceBadge";
import ThemeToggle from "./ThemeToggle";
import Footer from "./Footer";

/** The shell for a standalone, deep-linked case or reload page: the same family chrome
 *  (brand eyebrow, theme toggle, footer) as the home page, but slimmer — the entity itself
 *  is the page's h1, so "Muster" here is a link home, not a heading. */
export default function EntityFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6 md:py-10">
      <header className="flex items-start justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
        <div>
          <FusionSpaceBadge className="mb-1.5" />
          <Link
            href="/"
            className="text-lg font-semibold tracking-tight text-zinc-900 hover:text-indigo-600 dark:text-zinc-100 dark:hover:text-indigo-400"
          >
            Muster
          </Link>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            Motor-hardware compatibility for high-power rocketry
          </p>
        </div>
        <ThemeToggle />
      </header>
      {children}
      <Footer />
    </main>
  );
}
