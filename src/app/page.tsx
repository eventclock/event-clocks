import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: {
    canonical: "https://www.event-clocks.com/",
  },
};

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      {/* Header */}
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Event Clocks</h1>
          <p className="mt-2 text-lg text-black/60 dark:text-white/60">
            Simple tools for planning events, meetings, and schedules across time zones.
          </p>
        </div>

        <nav className="flex flex-wrap gap-2">
          <a
            className="rounded-xl border border-violet-200/70 bg-white/60 px-3 py-2 text-sm font-semibold text-black/80 shadow-sm backdrop-blur hover:bg-white/80 dark:border-violet-300/20 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
            href="/timezone"
          >
            Timezone Converter
          </a>

          <a
            className="rounded-xl border border-emerald-200/70 bg-white/60 px-3 py-2 text-sm font-semibold text-black/80 shadow-sm backdrop-blur hover:bg-white/80 dark:border-emerald-300/20 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
            href="/meeting-overlap"
          >
            Meeting Overlap
          </a>

          {/* NEW: Business Days */}
          <a
            className="rounded-xl border border-sky-200/70 bg-white/60 px-3 py-2 text-sm font-semibold text-black/80 shadow-sm backdrop-blur hover:bg-white/80 dark:border-sky-300/20 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
            href="/business-days"
          >
            Business Days
          </a>

          <a
            className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm font-semibold text-black/70 shadow-sm backdrop-blur hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
            href="/about"
          >
            About
          </a>
          <a
            className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm font-semibold text-black/70 shadow-sm backdrop-blur hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
            href="/privacy"
          >
            Privacy
          </a>
          <a
            className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm font-semibold text-black/70 shadow-sm backdrop-blur hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
            href="/terms"
          >
            Terms
          </a>
          <a
            className="rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm font-semibold text-black/70 shadow-sm backdrop-blur hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
            href="/contact"
          >
            Contact
          </a>
        </nav>
      </header>

      {/* Hero cards */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Timezone Converter */}
        <a
          href="/timezone"
          className="group rounded-2xl border-2 border-sky-200/70 bg-white/60 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-sky-300/20 dark:bg-white/5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-extrabold tracking-tight">Timezone Converter</div>
              <div className="mt-2 text-sm text-black/60 dark:text-white/60">
                Compare one date/time across many timezones — DST-aware, with favorites and share links.
              </div>
            </div>

            <span className="rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              DST-aware
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-violet-200/70 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900 dark:border-violet-300/20 dark:bg-violet-400/10 dark:text-violet-200">
              Favorites
            </span>
            <span className="rounded-full border border-sky-200/70 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900 dark:border-sky-300/20 dark:bg-sky-400/10 dark:text-sky-200">
              Multi-timezone compare
            </span>
            <span className="rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200">
              Share link
            </span>
          </div>

          <div className="mt-6 text-sm font-semibold text-black/70 group-hover:text-black dark:text-white/70 dark:group-hover:text-white">
            Open tool →
          </div>
        </a>

        {/* Meeting Overlap */}
        <a
          href="/meeting-overlap"
          className="group rounded-2xl border-2 border-emerald-200/70 bg-white/60 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-300/20 dark:bg-white/5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-extrabold tracking-tight">Meeting Overlap</div>
              <div className="mt-2 text-sm text-black/60 dark:text-white/60">
                Find meeting times that work for everyone across multiple time zones — with step size, meeting length,
                weekends, and holidays.
              </div>
            </div>

            <span className="rounded-full border border-sky-200/70 bg-sky-50 px-3 py-1 text-xs font-bold text-sky-900 dark:border-sky-300/20 dark:bg-sky-400/10 dark:text-sky-200">
              Planner
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              Overlap-first
            </span>
            <span className="rounded-full border border-violet-200/70 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900 dark:border-violet-300/20 dark:bg-violet-400/10 dark:text-violet-200">
              Weekdays filter
            </span>
            <span className="rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200">
              Holiday badges
            </span>
          </div>

          <div className="mt-6 text-sm font-semibold text-black/70 group-hover:text-black dark:text-white/70 dark:group-hover:text-white">
            Open tool →
          </div>
        </a>

        {/* NEW: Business Day Calculator */}
        <a
          href="/business-days"
          className="group rounded-2xl border-2 border-violet-200/70 bg-white/60 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md dark:border-violet-300/20 dark:bg-white/5"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-extrabold tracking-tight">Business Day Calculator</div>
              <div className="mt-2 text-sm text-black/60 dark:text-white/60">
                Count working days between two dates, or add business days — excluding weekends and country holidays.
              </div>
            </div>

            <span className="rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-900 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200">
              Workdays
            </span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-sky-200/70 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900 dark:border-sky-300/20 dark:bg-sky-400/10 dark:text-sky-200">
              Date range
            </span>
            <span className="rounded-full border border-violet-200/70 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-900 dark:border-violet-300/20 dark:bg-violet-400/10 dark:text-violet-200">
              Add business days
            </span>
            <span className="rounded-full border border-amber-200/70 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-200">
              Holiday-aware
            </span>
          </div>

          <div className="mt-6 text-sm font-semibold text-black/70 group-hover:text-black dark:text-white/70 dark:group-hover:text-white">
            Open tool →
          </div>
        </a>
      </section>

      {/* Quick highlights */}
      <section className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-bold text-black/80 dark:text-white/80">Weekend-aware</div>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            See which slots land on Saturday/Sunday per person — helpful for cross-region scheduling.
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-bold text-black/80 dark:text-white/80">Holiday flags</div>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Tag local public holidays (when supported) and optionally avoid them in overlap results.
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-bold text-black/80 dark:text-white/80">Fast + private</div>
          <p className="mt-2 text-sm text-black/60 dark:text-white/60">
            Favorites and country selections stay in your browser. No accounts required.
          </p>
        </div>
      </section>

      {/* Holiday disclaimer */}
      <section className="mt-4 rounded-2xl border border-amber-200/60 bg-amber-50/60 p-5 text-sm text-amber-950 shadow-sm backdrop-blur dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100">
        <div className="font-semibold">Holiday coverage note</div>
        <p className="mt-1 text-amber-900/80 dark:text-amber-100/80">
          Holiday tags use a public holiday dataset. Some countries/regions may be missing, incomplete, or return no
          data — you’ll see a “No data” or “Error” indicator when that happens.
        </p>
      </section>

      {/* More tools */}
      <section className="mt-4 rounded-2xl border-2 border-violet-200/70 bg-white/60 p-6 shadow-sm backdrop-blur dark:border-violet-300/20 dark:bg-white/5">
        <div className="text-xl font-extrabold tracking-tight">More Tools (Planned)</div>
        <p className="mt-2 text-sm text-black/60 dark:text-white/60">
          The goal is a small, high-quality set of utilities that stay fast and simple.
        </p>

        <ul className="mt-4 space-y-2 text-sm text-black/75 dark:text-white/75">
          <li className="flex gap-2">
            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-sky-300 dark:bg-sky-400" />
            World clock dashboard (pin multiple cities)
          </li>
          <li className="flex gap-2">
            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-emerald-300 dark:bg-emerald-400" />
            Calendar-friendly export (copy to calendar)
          </li>
          <li className="flex gap-2">
            <span className="mt-1 inline-block h-2 w-2 rounded-full bg-amber-300 dark:bg-amber-400" />
            Shareable “best time to meet” pages (SEO-friendly)
          </li>
        </ul>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            className="rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm font-semibold text-black/70 shadow-sm hover:bg-white/90 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:hover:bg-white/10"
            href="/contact"
          >
            Suggest a feature
          </a>
        </div>
      </section>

      {/* Footer note */}
      <section className="mt-6 rounded-2xl border border-black/10 bg-white/50 p-5 text-sm text-black/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white/60">
        Tip: Use Timezone Converter to compare times, then use Meeting Overlap to pick a slot that works for everyone —
        and double-check weekends/holidays before sending the invite.
      </section>
    </main>
  );
}
