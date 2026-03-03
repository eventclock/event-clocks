"use client";

import React, { useEffect, useMemo, useState } from "react";
import PageShell from "@/components/PageShell";
import styles from "./TimeSince.module.css";

type Unit = "years" | "months" | "days" | "hours" | "minutes" | "seconds";

const LS_KEY = "eventclocks:time-since:v4";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatWithCommas(n: number) {
  const parts = n.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

function nowAsDateTimeLocalString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${y}-${m}-${day}T${hh}:${mm}`;
}

function parseDateTimeLocal(value: string): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Calendar-safe adds (local time). Clamp day-of-month to avoid overflow.
 */
function addYearsLocal(date: Date, years: number): Date {
  const d = new Date(date.getTime());
  const y = d.getFullYear() + years;
  const m = d.getMonth();
  const day = d.getDate();

  const tmp = new Date(d.getTime());
  tmp.setFullYear(y, m, 1);

  const lastDay = new Date(y, m + 1, 0).getDate();
  tmp.setDate(Math.min(day, lastDay));
  tmp.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  return tmp;
}

function addMonthsLocal(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const total = d.getMonth() + months;

  const y = d.getFullYear() + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const day = d.getDate();

  const tmp = new Date(d.getTime());
  tmp.setFullYear(y, m, 1);

  const lastDay = new Date(y, m + 1, 0).getDate();
  tmp.setDate(Math.min(day, lastDay));
  tmp.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  return tmp;
}

function addDaysLocal(date: Date, days: number): Date {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

type Breakdown = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function computeCalendarBreakdown(start: Date, end: Date): Breakdown {
  let cursor = new Date(start.getTime());

  let years = 0;
  while (true) {
    const next = addYearsLocal(cursor, 1);
    if (next.getTime() <= end.getTime()) {
      years += 1;
      cursor = next;
    } else break;
  }

  let months = 0;
  while (true) {
    const next = addMonthsLocal(cursor, 1);
    if (next.getTime() <= end.getTime()) {
      months += 1;
      cursor = next;
    } else break;
  }

  let days = 0;
  while (true) {
    const next = addDaysLocal(cursor, 1);
    if (next.getTime() <= end.getTime()) {
      days += 1;
      cursor = next;
    } else break;
  }

  let remMs = end.getTime() - cursor.getTime();
  if (remMs < 0) remMs = 0;

  const hours = Math.floor(remMs / 3_600_000);
  remMs -= hours * 3_600_000;

  const minutes = Math.floor(remMs / 60_000);
  remMs -= minutes * 60_000;

  const seconds = Math.floor(remMs / 1_000);

  return { years, months, days, hours, minutes, seconds };
}

function toLocalReadable(d: Date): string {
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  const ss = pad2(d.getSeconds());
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

function relativeLabel(isFuture: boolean) {
  return isFuture ? "Time until" : "Time since";
}

/** Pads */
function TwoDigitTiles({ value }: { value: number }) {
  const s = String(Math.max(0, Math.floor(value))).padStart(2, "0");
  return (
    <div className={styles.unitDigits}>
      {s.split("").map((ch, idx) => (
        <div key={idx} className={styles.tile}>
          {ch}
        </div>
      ))}
    </div>
  );
}

export default function TimeSinceClient() {
  const [mounted, setMounted] = useState(false);

  // IMPORTANT: stable initial values to avoid hydration mismatch
  const [startValue, setStartValue] = useState<string>("");
  const [unit, setUnit] = useState<Unit>("seconds");
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [nowMs, setNowMs] = useState<number>(0);

  // Client-only init (restore + set "now")
  useEffect(() => {
    let restored = false;

    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<{
          startValue: string;
          unit: Unit;
          isRunning: boolean;
        }>;

        if (typeof parsed.startValue === "string") {
          setStartValue(parsed.startValue);
          restored = true;
        }
        if (parsed.unit) setUnit(parsed.unit);
        if (typeof parsed.isRunning === "boolean") setIsRunning(parsed.isRunning);
      }
    } catch {
      // ignore
    }

    if (!restored) {
      setStartValue(nowAsDateTimeLocalString());
    }

    setNowMs(Date.now());
    setMounted(true);
  }, []);

  // Persist (only after mount to avoid touching localStorage early)
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ startValue, unit, isRunning }));
    } catch {
      // ignore
    }
  }, [mounted, startValue, unit, isRunning]);

  // Ticking clock aligned to second boundary
  useEffect(() => {
    if (!mounted) return;
    if (!isRunning) return;

    let interval: any = null;
    let timeout: any = null;

    const tick = () => setNowMs(Date.now());
    const ms = Date.now();
    const toNextSecond = 1000 - (ms % 1000);

    timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 1000);
    }, toNextSecond);

    return () => {
      if (timeout) clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [mounted, isRunning]);

  // Close help on ESC + prevent scroll
  useEffect(() => {
    if (!helpOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHelpOpen(false);
    };
    window.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [helpOpen]);

  const startDate = useMemo(() => parseDateTimeLocal(startValue), [startValue]);

  const derived = useMemo(() => {
    // Before mount, keep everything stable
    if (!mounted) {
      return {
        valid: false as const,
        isFuture: false,
        breakdown: null as Breakdown | null,
        totals: {} as Record<Unit, { label: string; value: string; note?: string }>,
        nowLabel: "",
        inputLabel: "",
      };
    }

    if (!startDate) {
      const now = new Date(nowMs);
      return {
        valid: false as const,
        isFuture: false,
        breakdown: null as Breakdown | null,
        totals: {} as Record<Unit, { label: string; value: string; note?: string }>,
        nowLabel: toLocalReadable(now),
        inputLabel: "",
      };
    }

    const now = new Date(nowMs);
    const isFuture = startDate.getTime() > now.getTime();

    const start = isFuture ? now : startDate;
    const end = isFuture ? startDate : now;

    const diffMsAbs = Math.max(0, end.getTime() - start.getTime());
    const breakdown = computeCalendarBreakdown(start, end);

    // exact totals (ms-based)
    const totalSeconds = diffMsAbs / 1000;
    const totalMinutes = diffMsAbs / 60_000;
    const totalHours = diffMsAbs / 3_600_000;
    const totalDays = diffMsAbs / 86_400_000;

    // calendar-based fractional months/years
    const wholeMonths = breakdown.years * 12 + breakdown.months;

    const baseYM = (() => {
      let c = new Date(start.getTime());
      if (breakdown.years) c = addYearsLocal(c, breakdown.years);
      if (breakdown.months) c = addMonthsLocal(c, breakdown.months);
      return c;
    })();

    const nextMonth = addMonthsLocal(baseYM, 1);
    const monthSliceMs = Math.max(1, nextMonth.getTime() - baseYM.getTime());

    const remAfterYM = end.getTime() - baseYM.getTime();
    const monthFraction = Math.max(0, Math.min(0.999999, remAfterYM / monthSliceMs));

    const totalMonthsCalendar = wholeMonths + monthFraction;
    const totalYearsCalendar = breakdown.years + (breakdown.months + monthFraction) / 12;

    const totals: Record<Unit, { label: string; value: string; note?: string }> = {
      years: {
        label: "Total years",
        value: formatWithCommas(Number(totalYearsCalendar.toFixed(6))),
        note: "Calendar-based (months vary by length).",
      },
      months: {
        label: "Total months",
        value: formatWithCommas(Number(totalMonthsCalendar.toFixed(6))),
        note: "Calendar-based (month length varies).",
      },
      days: { label: "Total days", value: formatWithCommas(Number(totalDays.toFixed(6))) },
      hours: { label: "Total hours", value: formatWithCommas(Number(totalHours.toFixed(3))) },
      minutes: { label: "Total minutes", value: formatWithCommas(Number(totalMinutes.toFixed(2))) },
      seconds: { label: "Total seconds", value: formatWithCommas(Number(totalSeconds.toFixed(0))) },
    };

    return {
      valid: true as const,
      isFuture,
      breakdown,
      totals,
      nowLabel: toLocalReadable(now),
      inputLabel: toLocalReadable(startDate),
    };
  }, [mounted, startDate, nowMs]);

  // Always show one of the gradients
  const modeCardClass = derived.isFuture ? styles.cardUntil : styles.cardSince;

  const unitButtons: { key: Unit; label: string }[] = [
    { key: "years", label: "Years" },
    { key: "months", label: "Months" },
    { key: "days", label: "Days" },
    { key: "hours", label: "Hours" },
    { key: "minutes", label: "Minutes" },
    { key: "seconds", label: "Seconds" },
  ];

  return (
    <PageShell
      title="Time Since Calculator"
      subtitle="Watch time since (or until) a date/time count live — with totals in a single unit."
    >
      <main className="mx-auto max-w-4xl px-6 py-6">
        <header className="mb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm text-black/60 dark:text-white/60">
              Enter a date/time and watch the counter update every second.
            </div>

            <button
              type="button"
              onClick={() => setHelpOpen(true)}
              className="mt-1 inline-flex items-center justify-center rounded-full border border-black/15 bg-transparent text-[10px] font-bold text-black/60 shadow-sm hover:text-black/80 dark:border-white/15 dark:text-white/60 dark:hover:text-white/85"
              style={{
                fontSize: 13,
                border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: 999,
                width: 16,
                height: 16,
                lineHeight: "14px",
                textAlign: "center",
                background: "transparent",
                cursor: "pointer",
                opacity: 0.65,
                padding: 0,
              }}
              aria-label="Info about this tool"
              title="About this tool"
            >
              i
            </button>
          </div>
        </header>

        {/* SEO-visible help (in DOM, hidden) */}
        <section aria-hidden="true" className="sr-only">
          <h2>About this tool</h2>
          <p>
            This tool shows a calendar-style breakdown (years, months, days, then time) that updates
            every second.
          </p>
          <ul>
            <li>If your date/time is in the past, it counts up (time since).</li>
            <li>If your date/time is in the future, it counts down (time until).</li>
            <li>The “Total in …” toggle shows the full difference expressed in a single unit.</li>
          </ul>
        </section>

        {/* Controls */}
        <section className="mt-4 rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-end">
            <label className="block">
              <div className="text-xs font-semibold text-black/70 dark:text-white/70">
                Date / Time
              </div>
              <input
                type="datetime-local"
                value={startValue}
                onChange={(e) => setStartValue(e.target.value)}
                className="mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2 text-sm shadow-sm outline-none focus:border-black/30 dark:border-white/15 dark:bg-black/20 dark:text-white"
              />
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStartValue(nowAsDateTimeLocalString())}
                className={[
                  "mt-6 inline-flex items-center justify-center text-sm font-semibold text-black/80 dark:text-white/80",
                  styles.thinBtn,
                  "dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10",
                ].join(" ")}
              >
                Now
              </button>

              <button
                type="button"
                onClick={() => setIsRunning((v) => !v)}
                className={[
                  "mt-6 inline-flex items-center justify-center text-sm font-semibold text-black/80 dark:text-white/80",
                  styles.thinBtn,
                  "dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10",
                ].join(" ")}
              >
                {isRunning ? "Pause" : "Start"}
              </button>
            </div>

            <div className="text-xs text-black/60 dark:text-white/60 sm:text-right">
              <div>
                <span className="font-semibold text-black/70 dark:text-white/70">Now:</span>{" "}
                {mounted ? derived.nowLabel : "—"}
              </div>
              {startDate && (
                <div className="mt-1">
                  <span className="font-semibold text-black/70 dark:text-white/70">Input:</span>{" "}
                  {mounted ? derived.inputLabel : "—"}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Results */}
        <section
          className={[
            "mt-5 rounded-2xl border border-black/10 p-5 shadow-sm backdrop-blur dark:border-white/10",
            modeCardClass,
          ].join(" ")}
        >
          {!mounted ? (
            <div className="text-sm text-black/60 dark:text-white/60">Loading…</div>
          ) : !derived.valid || !derived.breakdown ? (
            <div className="text-sm text-black/60 dark:text-white/60">
              Enter a valid date/time to see results.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-black/50 dark:text-white/50">
                    {relativeLabel(derived.isFuture)}
                  </div>

                  <div className="mt-4" />

                  <div className={styles.padGrid}>
                    {/* LEFT: Years / Months / Days */}
                    <div className={styles.padBlock}>
                      <div className={[styles.labelsRow, styles.labelsLeft].join(" ")}>
                        <div className={styles.label}>Years</div>
                        <div className={styles.label}>Months</div>
                        <div className={styles.label}>Days</div>
                      </div>

                      <div className={styles.clockRow}>
                        <TwoDigitTiles value={derived.breakdown.years} />
                        <div className={styles.dash}>-</div>
                        <TwoDigitTiles value={derived.breakdown.months} />
                        <div className={styles.dash}>-</div>
                        <TwoDigitTiles value={derived.breakdown.days} />
                      </div>
                    </div>

                    {/* RIGHT: Clock HH:MM:SS */}
                    <div className={styles.padBlock}>
                      <div className={[styles.labelsRow, styles.labelsRight].join(" ")}>
                        <div className={styles.label}>Hours</div>
                        <div className={styles.label}>Minutes</div>
                        <div className={styles.label}>Seconds</div>
                      </div>

                      <div className={styles.clockRow}>
                        <TwoDigitTiles value={derived.breakdown.hours} />
                        <div className={styles.colon}>:</div>
                        <TwoDigitTiles value={derived.breakdown.minutes} />
                        <div className={styles.colon}>:</div>
                        <TwoDigitTiles value={derived.breakdown.seconds} />
                      </div>

                      <div className={styles.statusRight}>
                        Updates every second • {isRunning ? "running" : "paused"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Totals toggle */}
              <div className="mt-7">
                <div className="text-xs font-semibold text-black/70 dark:text-white/70">Total in</div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {unitButtons.map((b) => {
                    const active = unit === b.key;
                    return (
                      <button
                        key={b.key}
                        type="button"
                        onClick={() => setUnit(b.key)}
                        className={[
                          "text-sm font-semibold text-black/80 dark:text-white/80",
                          styles.thinBtn,
                          active ? styles.thinBtnActive : "",
                          "dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10",
                        ].join(" ")}
                      >
                        {b.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 rounded-xl border border-black/10 bg-white/70 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs font-semibold text-black/60 dark:text-white/60">
                    {derived.totals[unit].label}
                  </div>
                  <div className="mt-1 text-xl font-black tracking-tight">
                    {derived.totals[unit].value} {unit}
                  </div>
                  {derived.totals[unit].note ? (
                    <div className="mt-1 text-xs text-black/50 dark:text-white/50">
                      {derived.totals[unit].note}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Help modal */}
        {helpOpen ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <button
              type="button"
              aria-label="Close help"
              onClick={() => setHelpOpen(false)}
              className="absolute inset-0 bg-black/40"
            />

            <div className="relative w-full max-w-lg rounded-2xl border border-black/10 bg-white p-5 shadow-xl dark:border-white/10 dark:bg-zinc-950">
              <div className="flex items-start justify-between gap-3">
                <h3 id="help-title" className="text-base font-bold text-black/80 dark:text-white/85">
                  About this tool
                </h3>
                <button
                  type="button"
                  onClick={() => setHelpOpen(false)}
                  className={[
                    "text-xs font-semibold text-black/70 dark:text-white/70",
                    styles.thinBtn,
                    "dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10",
                  ].join(" ")}
                >
                  Close
                </button>
              </div>

              <div className="mt-3 space-y-2 text-sm text-black/70 dark:text-white/70">
                <p>
                  This tool shows a calendar-style breakdown (years, months, days, then time) that
                  updates every second.
                </p>
                <ul className="list-disc pl-5">
                  <li>If your date/time is in the past, it counts up (time since).</li>
                  <li>If your date/time is in the future, it counts down (time until).</li>
                  <li>The “Total in …” toggle shows the full difference expressed in a single unit.</li>
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </PageShell>
  );
}