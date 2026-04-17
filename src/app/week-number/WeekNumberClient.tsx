"use client";

import { useMemo, useState } from "react";
import { parseYYYYMMDDToUTCDate, toYYYYMMDD_UTC } from "@/lib/dateUtils";

const DAY_MS = 24 * 60 * 60 * 1000;

function todayYYYYMMDD() {
  return toYYYYMMDD_UTC(new Date());
}

function getIsoWeek(dateString: string) {
  const date = parseYYYYMMDDToUTCDate(dateString);
  const day = date.getUTCDay() || 7;
  const thursday = new Date(date.getTime());
  thursday.setUTCDate(date.getUTCDate() + 4 - day);

  const isoYear = thursday.getUTCFullYear();
  const yearStart = new Date(Date.UTC(isoYear, 0, 1));
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / DAY_MS + 1) / 7);

  return { isoYear, week };
}

function getDayOfYear(dateString: string) {
  const date = parseYYYYMMDDToUTCDate(dateString);
  const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.floor((date.getTime() - start.getTime()) / DAY_MS) + 1;
}

function getDaysLeft(dateString: string) {
  const date = parseYYYYMMDDToUTCDate(dateString);
  const end = new Date(Date.UTC(date.getUTCFullYear(), 11, 31));
  return Math.round((end.getTime() - date.getTime()) / DAY_MS);
}

export default function WeekNumberClient() {
  const [date, setDate] = useState(todayYYYYMMDD);

  const result = useMemo(() => {
    const parsed = parseYYYYMMDDToUTCDate(date);
    const iso = getIsoWeek(date);

    return {
      ...iso,
      dayOfYear: getDayOfYear(date),
      quarter: Math.floor(parsed.getUTCMonth() / 3) + 1,
      daysLeft: getDaysLeft(date),
    };
  }, [date]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <section className="rounded-lg border border-black/10 bg-white/65 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <p className="m-0 text-xs font-extrabold text-sky-700/80 dark:text-sky-200/80">
          ISO calendar
        </p>
        <h1 className="mt-2">Week Number Calculator</h1>
        <p className="max-w-2xl text-sm text-black/60 dark:text-white/60">
          Pick a date to see its ISO week number, week-year, day of year, quarter, and remaining
          days in the year.
        </p>

        <label className="mt-5 grid max-w-xs gap-2 text-xs font-bold text-black/55 dark:text-white/55">
          Date
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm text-black/80 dark:border-white/10 dark:bg-black dark:text-white/80"
          />
        </label>

        <section className="mt-5 grid gap-3 sm:grid-cols-5">
          <ResultCard label="ISO week" value={String(result.week)} />
          <ResultCard label="ISO year" value={String(result.isoYear)} />
          <ResultCard label="Day of year" value={String(result.dayOfYear)} />
          <ResultCard label="Quarter" value={`Q${result.quarter}`} />
          <ResultCard label="Days left" value={String(result.daysLeft)} />
        </section>
      </section>
    </main>
  );
}

function ResultCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
      <div className="text-xs font-bold text-black/50 dark:text-white/50">{label}</div>
      <div className="mt-2 text-2xl font-black tracking-tight text-black/80 dark:text-white/80">
        {value}
      </div>
    </div>
  );
}
