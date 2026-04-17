"use client";

import { useEffect, useMemo, useState } from "react";

function toDatetimeLocalValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function formatDate(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "full",
    timeStyle: "long",
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}

export default function UnixTimeClient() {
  const [timestamp, setTimestamp] = useState("");
  const [unit, setUnit] = useState<"seconds" | "milliseconds">("seconds");
  const [dateTime, setDateTime] = useState("");

  useEffect(() => {
    const now = new Date();
    setTimestamp(String(Math.floor(now.getTime() / 1000)));
    setDateTime(toDatetimeLocalValue(now));
  }, []);

  const timestampResult = useMemo(() => {
    if (!timestamp.trim()) return null;

    const numeric = Number(timestamp);
    if (!Number.isFinite(numeric)) return null;

    const date = new Date(unit === "seconds" ? numeric * 1000 : numeric);
    if (Number.isNaN(date.getTime())) return null;

    return {
      local: formatDate(date),
      utc: formatDate(date, "UTC"),
    };
  }, [timestamp, unit]);

  const dateResult = useMemo(() => {
    if (!dateTime) return null;

    const date = new Date(dateTime);
    if (Number.isNaN(date.getTime())) return null;

    return {
      seconds: Math.floor(date.getTime() / 1000),
      milliseconds: date.getTime(),
    };
  }, [dateTime]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <section className="rounded-lg border border-black/10 bg-white/65 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
        <p className="m-0 text-xs font-extrabold text-sky-700/80 dark:text-sky-200/80">
          Epoch time
        </p>
        <h1 className="mt-2">Unix Time Converter</h1>
        <p className="max-w-2xl text-sm text-black/60 dark:text-white/60">
          Convert Unix timestamps into readable dates, or turn a local date and time into Unix
          seconds and milliseconds.
        </p>

        <section className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-black/10 bg-white/55 p-4 dark:border-white/10 dark:bg-white/5">
            <h2 className="m-0 text-sm font-black">Timestamp to date</h2>
            <div className="mt-4 grid gap-3">
              <input
                value={timestamp}
                onChange={(event) => setTimestamp(event.target.value)}
                inputMode="numeric"
                className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm text-black/80 dark:border-white/10 dark:bg-black dark:text-white/80"
              />
              <select
                value={unit}
                onChange={(event) => setUnit(event.target.value as "seconds" | "milliseconds")}
                className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm text-black/80 dark:border-white/10 dark:bg-black dark:text-white/80"
              >
                <option value="seconds">Seconds</option>
                <option value="milliseconds">Milliseconds</option>
              </select>
              <button
                type="button"
                onClick={() => {
                  const now = Date.now();
                  setTimestamp(String(unit === "seconds" ? Math.floor(now / 1000) : now));
                }}
                className="h-10 rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-bold text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100"
              >
                Use current time
              </button>
            </div>

            <ResultBlock
              lines={
                timestampResult
                  ? [
                      ["Local", timestampResult.local],
                      ["UTC", timestampResult.utc],
                    ]
                  : [["Result", "Enter a valid timestamp"]]
              }
            />
          </div>

          <div className="rounded-lg border border-black/10 bg-white/55 p-4 dark:border-white/10 dark:bg-white/5">
            <h2 className="m-0 text-sm font-black">Date to timestamp</h2>
            <div className="mt-4 grid gap-3">
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(event) => setDateTime(event.target.value)}
                className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm text-black/80 dark:border-white/10 dark:bg-black dark:text-white/80"
              />
              <button
                type="button"
                onClick={() => setDateTime(toDatetimeLocalValue(new Date()))}
                className="h-10 rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-bold text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-100"
              >
                Use current date-time
              </button>
            </div>

            <ResultBlock
              lines={
                dateResult
                  ? [
                      ["Seconds", String(dateResult.seconds)],
                      ["Milliseconds", String(dateResult.milliseconds)],
                    ]
                  : [["Result", "Enter a valid date-time"]]
              }
            />
          </div>
        </section>
      </section>
    </main>
  );
}

function ResultBlock({ lines }: { lines: [string, string][] }) {
  return (
    <dl className="mt-4 grid gap-2 rounded-lg border border-black/10 bg-white/70 p-3 text-sm dark:border-white/10 dark:bg-black/20">
      {lines.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs font-bold text-black/45 dark:text-white/45">{label}</dt>
          <dd className="m-0 mt-1 break-words font-semibold text-black/75 dark:text-white/75">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
