import type { Metadata } from "next";
import HomeToolOrbit from "./HomeToolOrbit";

export const metadata: Metadata = {
  title:
    "Event Clocks — Time Zone Converter, Meeting Overlap, Business Days, Date Difference, Week Number, Unix Time",
  description:
    "Simple planning tools for time zones, meeting scheduling, date differences, week numbers, Unix time, deadlines, live countdowns, and task tracking. Private, fast, and no accounts.",
  alternates: {
    canonical: "https://www.event-clocks.com/",
  },
  openGraph: {
    type: "website",
    url: "https://www.event-clocks.com/",
    title: "Event Clocks",
    description:
      "Simple planning tools for time zones, meeting scheduling, date differences, week numbers, Unix time, deadlines, live countdowns, and task tracking. Private, fast, and no accounts.",
    siteName: "Event Clocks",
  },
  twitter: {
    card: "summary",
    title: "Event Clocks",
    description:
      "Simple planning tools for time zones, meeting scheduling, date differences, week numbers, Unix time, deadlines, live countdowns, and task tracking. Private, fast, and no accounts.",
  },
};

export default function HomePage() {
  return (
    <main className="relative mx-auto max-w-6xl px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "Event Clocks",
            url: "https://www.event-clocks.com",
            description:
              "Planning tools for time zones, meetings, countdowns, deadlines, and date calculations.",
          }),
        }}
      />
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-white dark:bg-black" />
        <div className="absolute -top-40 left-1/2 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-violet-200/20 blur-3xl dark:bg-violet-500/10" />
        <div className="absolute top-28 -left-40 h-[26rem] w-[26rem] rounded-full bg-sky-200/18 blur-3xl dark:bg-sky-500/10" />
        <div className="absolute top-72 -right-40 h-[26rem] w-[26rem] rounded-full bg-emerald-200/16 blur-3xl dark:bg-emerald-500/10" />
      </div>

      <header className="mb-16 flex flex-col items-center pt-4 text-center sm:pt-6">
        <div className="max-w-3xl">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/45 px-4 py-1 text-xs font-semibold text-black/60 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white/60">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
            Fast • Private • No accounts
          </div>

          <h1 className="mt-6 text-4xl font-black tracking-tight sm:mt-7 sm:text-5xl">
            Event Clocks
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-lg leading-relaxed text-black/60 dark:text-white/60 sm:text-[1.00rem] sm:leading-[1.4]">
            Practical planning tools for time zones, meeting scheduling, countdowns, task tracking,
            and date deadlines — calm, quick, and dependable.
          </p>
        </div>
        <HomeToolOrbit />
      </header>

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-black/10 bg-white/45 p-5 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-black/75 dark:text-white/75">
            Weekend + holiday aware
          </div>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">
            Spot weekend hits and supported public holidays quickly.
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/45 p-5 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-black/75 dark:text-white/75">
            Shareable results
          </div>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">
            Send a link so others can view the same setup.
          </p>
        </div>

        <div className="rounded-2xl border border-black/10 bg-white/45 p-5 backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="text-sm font-semibold text-black/75 dark:text-white/75">
            Local-first
          </div>
          <p className="mt-2 text-sm text-black/55 dark:text-white/55">
            Preferences stay in your browser. No logins.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white/45 p-5 text-sm text-black/55 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white/55">
        Tip: Convert the time first, then use Meeting Overlap to pick a slot — or use Countdown
        Notes, Countdown Tasks, and Time Since when you want a live timer tied to a date or
        deadline.
      </section>
    </main>
  );
}
