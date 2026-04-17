"use client";

import { useMemo, useState } from "react";
import { addDaysUTC, parseYYYYMMDDToUTCDate, toYYYYMMDD_UTC } from "@/lib/dateUtils";

const DAY_MS = 24 * 60 * 60 * 1000;

function todayYYYYMMDD() {
  return toYYYYMMDD_UTC(new Date());
}

function daysBetween(start: string, end: string) {
  const startMs = parseYYYYMMDDToUTCDate(start).getTime();
  const endMs = parseYYYYMMDDToUTCDate(end).getTime();
  return Math.round((endMs - startMs) / DAY_MS);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parseYYYYMMDDToUTCDate(date));
}

export default function DateDifferenceClient() {
  const [startDate, setStartDate] = useState(todayYYYYMMDD);
  const [endDate, setEndDate] = useState(() => toYYYYMMDD_UTC(addDaysUTC(new Date(), 30)));

  const result = useMemo(() => {
    const signedDays = daysBetween(startDate, endDate);
    const absoluteDays = Math.abs(signedDays);
    const weeks = Math.floor(absoluteDays / 7);
    const remainingDays = absoluteDays % 7;
    const inclusiveDays = absoluteDays + 1;

    return { signedDays, absoluteDays, weeks, remainingDays, inclusiveDays };
  }, [startDate, endDate]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <section className="rounded-lg border border-black/10 bg-white/65 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <p className="m-0 text-xs font-extrabold text-sky-700/80 dark:text-sky-200/80">
          Calendar days
        </p>
        <h1 className="mt-2">Date Difference Calculator</h1>
        <p className="max-w-2xl text-sm text-black/60 dark:text-white/60">
          Count exact calendar days between two dates, including signed difference, inclusive days,
          and a weeks-plus-days breakdown.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2 text-xs font-bold text-black/55 dark:text-white/55">
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm text-black/80 dark:border-white/10 dark:bg-black dark:text-white/80"
            />
          </label>
          <label className="grid gap-2 text-xs font-bold text-black/55 dark:text-white/55">
            End date
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm text-black/80 dark:border-white/10 dark:bg-black dark:text-white/80"
            />
          </label>
        </div>

        <section className="mt-5 grid gap-3 sm:grid-cols-4">
          <ResultCard label="Days between" value={String(result.absoluteDays)} />
          <ResultCard label="Signed days" value={String(result.signedDays)} />
          <ResultCard label="Inclusive days" value={String(result.inclusiveDays)} />
          <ResultCard label="Weeks + days" value={`${result.weeks}w ${result.remainingDays}d`} />
        </section>

        <p className="mt-5 text-sm text-black/55 dark:text-white/55">
          From {formatDate(startDate)} to {formatDate(endDate)}.
        </p>
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
