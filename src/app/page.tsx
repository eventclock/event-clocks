import type { Metadata } from "next";
import HeroClockVignette from "./HeroClockVignette";

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

const tools = [
  {
    href: "/timezone",
    title: "Timezone",
    desc: "Compare one date/time across multiple zones with DST-aware share links.",
    badge: "Most used",
    position: "md:left-[8%] md:top-[18%]",
  },
  {
    href: "/meeting-overlap",
    title: "Meeting Overlap",
    desc: "Find times that work for everyone across zones, weekends, and holidays.",
    badge: "Planner",
    position: "md:right-[8%] md:top-[18%]",
  },
  {
    href: "/time-since",
    title: "Time Since",
    desc: "Live counter for time since or until a date.",
    badge: "Live",
    position: "md:left-[7%] md:top-[45%]",
  },
  {
    href: "/countdown-notes",
    title: "Countdown Notes",
    desc: "Attach notes to dates and watch each countdown live.",
    badge: "Live",
    position: "md:right-[7%] md:top-[45%]",
  },
  {
    href: "/countdown-tasks",
    title: "Countdown Tasks",
    desc: "Track tasks with start dates, end deadlines, and delayed status.",
    badge: "New",
    position: "md:left-[12%] md:bottom-[12%]",
  },
  {
    href: "/business-days",
    title: "Business Days",
    desc: "Count workdays or add business days while excluding weekends and holidays.",
    badge: "Workdays",
    position: "md:right-[12%] md:bottom-[12%]",
  },
  {
    href: "/holiday-long-weekend-planner",
    title: "Holiday Planner",
    desc: "See upcoming holidays, countdowns, long weekends, and bridge-day opportunities.",
    badge: "Holidays",
    position: "md:right-[29%] md:bottom-[18%]",
  },
  {
    href: "/smpte-timecode",
    title: "Timecode",
    desc: "Convert SMPTE, frames, milliseconds, and real-time durations.",
    badge: "Utility",
    position: "md:left-[38%] md:bottom-[2%]",
  },
  {
    href: "/cruise",
    title: "Cruise Planner",
    desc: "A simple cruise timeline with reminders and a checklist.",
    badge: "Timeline",
    position: "md:left-[38%] md:top-[2%]",
  },
  {
    href: "/wedding-plan",
    title: "Wedding Planner",
    desc: "A wedding prep timeline with checkpoints and reminders.",
    badge: "Checklist",
    position: "md:left-[16%] md:top-[70%]",
  },
  {
    href: "/tax-document-checklist",
    title: "Tax Checklist",
    desc: "Gather tax documents with a calm, practical checklist.",
    badge: "Checklist",
    position: "md:right-[16%] md:top-[70%]",
  },
];

function ToolOrbit() {
  return (
    <nav aria-label="Event Clocks tools" className="relative mx-auto mt-6 w-full max-w-5xl">
      <div className="relative min-h-[34rem] md:min-h-[41rem]">
        <div className="absolute inset-x-0 top-1/2 hidden -translate-y-1/2 md:block">
          <HeroClockVignette />
        </div>
        <div className="md:hidden">
          <HeroClockVignette />
        </div>

        <div className="grid gap-3 md:block">
          {tools.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              className={`group/tool relative block rounded-full border border-[#9a633b]/55 bg-white/34 px-3.5 py-2 text-left shadow-[0_6px_14px_rgba(81,51,35,0.05)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-[#85502f]/70 hover:bg-white/60 hover:shadow-[0_10px_20px_rgba(81,51,35,0.08)] focus:outline-none focus:ring-4 focus:ring-amber-200/50 dark:border-[#bc8657]/35 dark:bg-white/5 dark:hover:bg-white/9 md:absolute md:w-44 ${tool.position}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span>
                    <span className="block text-[0.82rem] font-extrabold tracking-tight text-black/75 dark:text-white/80">
                    {tool.title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-black/52 dark:text-white/52 md:hidden">
                    {tool.desc}
                  </span>
                </span>
                <span className="shrink-0 text-[0.55rem] font-bold uppercase tracking-[0.18em] text-[#85502f]/62 dark:text-[#d6a06d]/58">
                  {tool.badge}
                </span>
              </span>

              <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.6rem)] z-20 hidden w-64 -translate-x-1/2 rounded-2xl border border-black/10 bg-white/95 p-3 text-xs leading-relaxed text-black/62 opacity-0 shadow-xl backdrop-blur transition group-hover/tool:opacity-100 group-focus/tool:opacity-100 dark:border-white/10 dark:bg-neutral-950/95 dark:text-white/62 md:block">
                {tool.desc}
              </span>
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

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
        <ToolOrbit />
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
