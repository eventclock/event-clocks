import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title:
    "Event Clocks — Time Zone Converter, Meeting Overlap, Business Days, Countdown Notes, Countdown Tasks, Time Since",
  description:
    "Simple planning tools for time zones, meeting scheduling, deadlines, live countdowns, task tracking, and time counters. Private, fast, and no accounts.",
  alternates: {
    canonical: "https://www.event-clocks.com/",
  },
  openGraph: {
    type: "website",
    url: "https://www.event-clocks.com/",
    title: "Event Clocks",
    description:
      "Simple planning tools for time zones, meeting scheduling, deadlines, live countdowns, task tracking, and time counters. Private, fast, and no accounts.",
    siteName: "Event Clocks",
  },
  twitter: {
    card: "summary",
    title: "Event Clocks",
    description:
      "Simple planning tools for time zones, meeting scheduling, deadlines, live countdowns, task tracking, and time counters. Private, fast, and no accounts.",
  },
};

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white/60 text-black/60 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white/60">
      {children}
    </span>
  );
}

function ToolCard({
  href,
  title,
  desc,
  icon,
  badge,
}: {
  href: string;
  title: string;
  desc: string;
  icon: React.ReactNode;
  badge?: string;
}) {
  return (
    <a
      href={href}
      className="group relative h-full rounded-2xl border border-black/10 bg-white/55 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Icon>{icon}</Icon>
          <div>
            <div className="text-lg font-extrabold tracking-tight">{title}</div>
            <div className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
              {desc}
            </div>
          </div>
        </div>

        {badge ? (
          <span className="shrink-0 rounded-full border border-black/10 bg-white/60 px-3 py-1 text-xs font-semibold text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
            {badge}
          </span>
        ) : null}
      </div>

      <div className="mt-6 text-sm font-semibold text-black/55 group-hover:text-black/75 dark:text-white/55 dark:group-hover:text-white/80">
        Open →
      </div>
    </a>
  );
}

export default function HomePage() {
  return (
    <main className="relative mx-auto max-w-5xl px-6 py-10">
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

      <header className="mb-14 pt-4 sm:pt-6">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/45 px-4 py-1 text-xs font-semibold text-black/60 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-white/60">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/70" />
          Fast • Private • No accounts
        </div>

        <h1 className="mt-6 text-4xl font-black tracking-tight sm:mt-7 sm:text-5xl">
          Event Clocks
        </h1>

        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-black/60 dark:text-white/60 sm:text-[1.00rem] sm:leading-[1.4]">
          Practical planning tools for time zones, meeting scheduling, countdowns, task tracking,
          and date deadlines — calm, quick, and dependable.
        </p>
      </header>

      <section className="mb-8">
        <div className="mb-3 text-sm font-semibold tracking-tight text-black/60 dark:text-white/60">
          Featured
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <a
              href="/timezone"
              className="group relative block h-full overflow-hidden rounded-2xl border border-black/10 bg-white/55 p-6 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/70 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 opacity-60"
                style={{
                  background:
                    "radial-gradient(800px circle at 10% 10%, rgba(167,139,250,0.18), transparent 45%), radial-gradient(700px circle at 90% 40%, rgba(125,211,252,0.16), transparent 40%)",
                }}
              />

              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <Icon>
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="opacity-80"
                    >
                      <path
                        d="M12 7v5l3 2"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </Icon>

                  <div>
                    <div className="text-2xl font-extrabold tracking-tight">
                      Timezone Converter
                    </div>
                    <div className="mt-2 text-sm leading-relaxed text-black/60 dark:text-white/60">
                      Compare one date/time across multiple zones — DST-aware, favorites, and share
                      links.
                    </div>
                  </div>
                </div>

                <span className="shrink-0 rounded-full border border-black/10 bg-white/60 px-3 py-1 text-xs font-semibold text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                  Most used
                </span>
              </div>

              <div className="relative mt-6 text-sm font-semibold text-black/55 group-hover:text-black/75 dark:text-white/55 dark:group-hover:text-white/80">
                Open →
              </div>
            </a>
          </div>

          <ToolCard
            href="/meeting-overlap"
            title="Meeting Overlap"
            desc="Find times that work for everyone — meeting length, step size, weekends, and holiday hints."
            badge="Planner"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
                <path
                  d="M4 7h16M7 4v16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path d="M9 9h11v11H9V9Z" stroke="currentColor" strokeWidth="2" />
              </svg>
            }
          />
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 text-sm font-semibold tracking-tight text-black/60 dark:text-white/60">
          Counters
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ToolCard
            href="/time-since"
            title="Time Since"
            desc="Live counter for time since or until a date — years, months, days, plus a ticking clock."
            badge="Live"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
                <path
                  d="M12 7v5l3 2"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
                <path
                  d="M7 2h10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            }
          />

          <ToolCard
            href="/countdown-notes"
            title="Countdown Notes"
            desc="Attach notes to dates and times, keep upcoming and expired items separate, and watch each countdown live."
            badge="Live"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
                <path
                  d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path
                  d="M12 11v3l2 1.5"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            }
          />

          <ToolCard
            href="/countdown-tasks"
            title="Countdown Tasks"
            desc="Track tasks with start dates, end deadlines, delayed status, and a live countdown once the task begins."
            badge="New"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
                <path
                  d="M9 11.5 11 13.5 15.5 9"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 12a8 8 0 1 1-4-6.93"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M16 3v4h4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 text-sm font-semibold tracking-tight text-black/60 dark:text-white/60">
          Calculators
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ToolCard
            href="/business-days"
            title="Business Days"
            desc="Count workdays between dates, or add business days — excluding weekends and supported holidays."
            badge="Workdays"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
                <path d="M7 3v3M17 3v3M4 8h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path
                  d="M6 6h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            }
          />

          <ToolCard
            href="/smpte-timecode"
            title="SMPTE Timecode"
            desc="Convert SMPTE labels to real-time milliseconds across multiple frame rates, with drop-frame support."
            badge="Utility"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <path
                  d="M8 4v16M16 4v16"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            }
          />
        </div>
      </section>

      <section className="mb-8">
        <div className="mb-3 text-sm font-semibold tracking-tight text-black/60 dark:text-white/60">
          Planners
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <ToolCard
            href="/cruise"
            title="Cruise Planner"
            desc="A simple cruise timeline with helpful reminders and a “don’t forget” checklist."
            badge="Timeline"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
                <path d="M12 22a10 10 0 1 0-10-10 10 10 0 0 0 10 10Z" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M14.5 9.5 10 14l-1 4 4-1 4.5-4.5-3-3Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />

          <ToolCard
            href="/wedding-plan"
            title="Wedding Planner"
            desc="A wedding prep timeline with sensible checkpoints, reminders, and a clean checklist."
            badge="Checklist"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
                <path d="M12 22a2 2 0 0 0 2-2H10a2 2 0 0 0 2 2Z" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            }
          />

          <ToolCard
            href="/tax-document-checklist"
            title="Tax Document Checklist"
            desc="Gather the right documents faster — a calm checklist you can work through confidently."
            badge="Checklist"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="opacity-80">
                <path
                  d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-6Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M14 2v6h6" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                <path d="M8 13h8M8 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            }
          />
        </div>
      </section>

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
