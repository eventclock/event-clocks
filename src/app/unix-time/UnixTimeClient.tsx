"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./unix-time.module.css";

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
    const timeout = window.setTimeout(() => {
      const now = new Date();
      setTimestamp(String(Math.floor(now.getTime() / 1000)));
      setDateTime(toDatetimeLocalValue(now));
    }, 0);

    return () => window.clearTimeout(timeout);
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
    <main className={styles.shell}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Epoch time</p>
        <h1 className={styles.title}>Unix Time Converter</h1>
        <p className={styles.subtitle}>
          Convert Unix timestamps into readable dates, or turn a local date and time into Unix
          seconds and milliseconds.
        </p>
      </section>

      <section className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelInner}>
            <h2 className={styles.panelTitle}>Timestamp to date</h2>
            <div className={styles.controls}>
              <input
                value={timestamp}
                onChange={(event) => setTimestamp(event.target.value)}
                inputMode="numeric"
                className={styles.input}
                aria-label="Unix timestamp"
              />
              <select
                value={unit}
                onChange={(event) => setUnit(event.target.value as "seconds" | "milliseconds")}
                className={styles.select}
                aria-label="Timestamp unit"
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
                className={styles.button}
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
        </div>

        <div className={styles.panel}>
          <div className={styles.panelInner}>
            <h2 className={styles.panelTitle}>Date to timestamp</h2>
            <div className={styles.controls}>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(event) => setDateTime(event.target.value)}
                className={styles.input}
                aria-label="Local date and time"
              />
              <button
                type="button"
                onClick={() => setDateTime(toDatetimeLocalValue(new Date()))}
                className={styles.button}
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
        </div>
      </section>
    </main>
  );
}

function ResultBlock({ lines }: { lines: [string, string][] }) {
  return (
    <dl className={styles.result}>
      {lines.map(([label, value]) => (
        <div key={label} className={styles.resultRow}>
          <dt className={styles.resultLabel}>{label}</dt>
          <dd className={styles.resultValue}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
