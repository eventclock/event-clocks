"use client";

import { useEffect, useState } from "react";
import HeroClockVignette from "./HeroClockVignette";

const STORAGE_KEY = "eventclocks:home-tool-orbit-layout:v1";

const tools = [
  ["/timezone", "Timezone", "Compare one date/time across multiple zones with DST-aware share links.", "Utility"],
  ["/meeting-overlap", "Meeting Overlap", "Find times that work for everyone across zones, weekends, and holidays.", "Planner"],
  ["/date-difference", "Date Difference", "Count calendar days, inclusive days, and weeks between two dates.", "Days"],
  ["/week-number", "Week Number", "Find ISO week number, day of year, quarter, and days left.", "ISO"],
  ["/time-since", "Time Since", "Live counter for time since or until a date.", "Live"],
  ["/countdown-notes", "Countdown Notes", "Attach notes to dates and watch each countdown live.", "Live"],
  ["/unix-time", "Unix Time", "Convert Unix timestamps to readable dates and back again.", "Epoch"],
  ["/countdown-tasks", "Countdown Tasks", "Track tasks with start dates, end deadlines, and delayed status.", "New"],
  ["/business-days", "Business Days", "Count workdays or add business days while excluding weekends and holidays.", "Workdays"],
  ["/holiday-long-weekend-planner", "Holiday Planner", "See upcoming holidays, countdowns, long weekends, and bridge-day opportunities.", "Holidays"],
  ["/smpte-timecode", "Timecode", "Convert SMPTE, frames, milliseconds, and real-time durations.", "Utility"],
  ["/cruise", "Cruise Planner", "A simple cruise timeline with reminders and a checklist.", "Timeline"],
  ["/wedding-plan", "Wedding Planner", "A wedding prep timeline with checkpoints and reminders.", "Checklist"],
  ["/tax-document-checklist", "Tax Checklist", "Gather tax documents with a calm, practical checklist.", "Checklist"],
] as const;

const layouts = [
  [
    "md:left-[4%] md:top-[16%]",
    "md:right-[4%] md:top-[16%]",
    "md:left-[16%] md:top-[4%]",
    "md:right-[16%] md:top-[4%]",
    "md:left-[2%] md:top-[40%]",
    "md:right-[2%] md:top-[40%]",
    "md:right-[17%] md:top-[29%]",
    "md:left-[4%] md:bottom-[12%]",
    "md:right-[4%] md:bottom-[12%]",
    "md:left-[28%] md:bottom-[13%]",
    "md:left-[40%] md:bottom-[-5%]",
    "md:left-[40%] md:top-[0%]",
    "md:left-[14%] md:top-[68%]",
    "md:right-[14%] md:top-[68%]",
  ],
  [
    "md:left-[3%] md:top-[25%]",
    "md:right-[3%] md:top-[25%]",
    "md:left-[10%] md:top-[7%]",
    "md:right-[10%] md:top-[7%]",
    "md:left-[4%] md:top-[49%]",
    "md:right-[4%] md:top-[49%]",
    "md:right-[24%] md:top-[16%]",
    "md:left-[8%] md:bottom-[7%]",
    "md:right-[8%] md:bottom-[7%]",
    "md:left-[26%] md:bottom-[17%]",
    "md:left-[41%] md:bottom-[-4%]",
    "md:left-[39%] md:top-[2%]",
    "md:left-[17%] md:top-[70%]",
    "md:right-[17%] md:top-[70%]",
  ],
  [
    "md:left-[6%] md:top-[11%]",
    "md:right-[6%] md:top-[11%]",
    "md:left-[22%] md:top-[2%]",
    "md:right-[22%] md:top-[2%]",
    "md:left-[1%] md:top-[34%]",
    "md:right-[1%] md:top-[34%]",
    "md:right-[20%] md:top-[45%]",
    "md:left-[3%] md:bottom-[18%]",
    "md:right-[3%] md:bottom-[18%]",
    "md:left-[24%] md:bottom-[9%]",
    "md:left-[41%] md:bottom-[-6%]",
    "md:left-[40%] md:top-[10%]",
    "md:left-[14%] md:top-[72%]",
    "md:right-[14%] md:top-[72%]",
  ],
];

export default function HomeToolOrbit() {
  const [layoutIndex, setLayoutIndex] = useState(0);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const saved = Number(localStorage.getItem(STORAGE_KEY));
        if (Number.isInteger(saved) && saved >= 0 && saved < layouts.length) {
          setLayoutIndex(saved);
        }
      } catch {
        // Optional preference.
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  function reshuffle() {
    setLayoutIndex((current) => {
      const next = (current + 1) % layouts.length;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Optional preference.
      }
      return next;
    });
  }

  return (
    <nav aria-label="Event Clocks tools" className="relative mx-auto mt-6 w-full max-w-5xl">
      <div className="relative min-h-[34rem] md:min-h-[46rem]">
        <div className="absolute inset-x-0 top-1/2 hidden -translate-y-1/2 md:block">
          <HeroClockVignette />
        </div>
        <div className="md:hidden">
          <HeroClockVignette />
        </div>

        <button
          type="button"
          onClick={reshuffle}
          className="absolute right-0 top-0 hidden h-9 w-9 items-center justify-center rounded-full border border-[#9a633b]/35 bg-white/42 text-[#85502f]/70 shadow-[0_6px_14px_rgba(81,51,35,0.05)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[#85502f]/55 hover:bg-white/68 hover:text-[#85502f] focus:outline-none focus:ring-4 focus:ring-amber-200/50 dark:border-[#bc8657]/30 dark:bg-white/6 dark:text-[#d6a06d]/70 dark:hover:bg-white/10 md:inline-flex"
          aria-label="Reshuffle tool layout"
          title="Reshuffle tool layout"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M16 3h5v5M4 20l5.8-5.8M21 3l-7.1 7.1M4 4l16 16M16 20h5v-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div className="grid gap-3 md:block">
          {tools.map(([href, title, desc, badge], index) => (
            <a
              key={href}
              href={href}
              className={`group/tool relative block rounded-full border border-[#9a633b]/55 bg-white/34 px-3.5 py-2 text-left shadow-[0_6px_14px_rgba(81,51,35,0.05)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:border-[#85502f]/70 hover:bg-white/60 hover:shadow-[0_10px_20px_rgba(81,51,35,0.08)] focus:outline-none focus:ring-4 focus:ring-amber-200/50 dark:border-[#bc8657]/35 dark:bg-white/5 dark:hover:bg-white/9 md:absolute md:w-44 ${layouts[layoutIndex][index]}`}
            >
              <span className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-[0.82rem] font-extrabold tracking-tight text-black/75 dark:text-white/80">
                    {title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-black/52 dark:text-white/52 md:hidden">
                    {desc}
                  </span>
                </span>
                <span className="shrink-0 text-[0.55rem] font-bold uppercase tracking-[0.18em] text-[#85502f]/62 dark:text-[#d6a06d]/58">
                  {badge}
                </span>
              </span>

              <span className="pointer-events-none absolute left-1/2 top-[calc(100%+0.6rem)] z-20 hidden w-64 -translate-x-1/2 rounded-2xl border border-black/10 bg-white/95 p-3 text-xs leading-relaxed text-black/62 opacity-0 shadow-xl backdrop-blur transition group-hover/tool:opacity-100 group-focus/tool:opacity-100 dark:border-white/10 dark:bg-neutral-950/95 dark:text-white/62 md:block">
                {desc}
              </span>
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
