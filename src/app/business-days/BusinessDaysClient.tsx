"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "@/components/PageShell";
import { ISO_COUNTRIES } from "@/lib/isoCountries";
import {
  addBusinessDays,
  businessDaysBetweenInclusive,
  type BizDayOptions,
  type BizRangeResult,
  type AddBizResult,
} from "@/lib/businessDays";
import { parseYYYYMMDDToUTCDate, toYYYYMMDD_UTC } from "@/lib/dateUtils";

type Mode = "range" | "add";

const LS_KEY = "eventclocks:business-days:v1";

function todayYYYYMMDD(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function yearsBetweenInclusive(startYYYYMMDD: string, endYYYYMMDD: string): number[] {
  const s = parseYYYYMMDDToUTCDate(startYYYYMMDD).getUTCFullYear();
  const e = parseYYYYMMDDToUTCDate(endYYYYMMDD).getUTCFullYear();
  const out: number[] = [];
  for (let y = Math.min(s, e); y <= Math.max(s, e); y++) out.push(y);
  return out;
}

type HolidayApiItem = {
  date?: string;
  name?: string;
};

type HolidayLoadStatus = "ok" | "empty" | "error";

type HolidayCacheEntry = {
  set: Set<string>;
  namesByDate: Map<string, string[]>;
  status: HolidayLoadStatus;
  errorMessage?: string;
};

type HolidaySummary = {
  status: "idle" | "loading" | "ok" | "empty" | "partial" | "error";
  years: number[];
  perYear: Record<number, HolidayLoadStatus>;
  message: string;
};

export default function BusinessDaysPage() {
  const [mode, setMode] = useState<Mode>("range");

  const [countryCode, setCountryCode] = useState<string>("US");
  const [excludeWeekends, setExcludeWeekends] = useState<boolean>(true);

  const [startDate, setStartDate] = useState<string>(todayYYYYMMDD());
  const [endDate, setEndDate] = useState<string>(todayYYYYMMDD());
  const [addDays, setAddDays] = useState<number>(5);

  const [rangeResult, setRangeResult] = useState<BizRangeResult | null>(null);
  const [addResult, setAddResult] = useState<AddBizResult | null>(null);

  const [holidayNamesByDate, setHolidayNamesByDate] = useState<Map<string, string[]>>(new Map());
  const [holidaySummary, setHolidaySummary] = useState<HolidaySummary>({
    status: "idle",
    years: [],
    perYear: {},
    message: "",
  });

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const holidayCacheRef = useRef<Map<string, HolidayCacheEntry>>(new Map());
  const helpRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<{
        mode: Mode;
        countryCode: string;
        excludeWeekends: boolean;
        startDate: string;
        endDate: string;
        addDays: number;
      }>;

      if (parsed.mode) setMode(parsed.mode);
      if (parsed.countryCode) setCountryCode(parsed.countryCode);
      if (typeof parsed.excludeWeekends === "boolean") setExcludeWeekends(parsed.excludeWeekends);
      if (parsed.startDate) setStartDate(parsed.startDate);
      if (parsed.endDate) setEndDate(parsed.endDate);
      if (typeof parsed.addDays === "number") setAddDays(parsed.addDays);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({ mode, countryCode, excludeWeekends, startDate, endDate, addDays })
      );
    } catch {
      // ignore
    }
  }, [mode, countryCode, excludeWeekends, startDate, endDate, addDays]);

  const countryOptions = useMemo(() => {
    return [...ISO_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  function renderHolidayLabel(date: string): string {
    const names = holidayNamesByDate.get(date);
    if (!names || names.length === 0) return date;

    const uniq: string[] = [];
    for (const n of names) if (!uniq.includes(n)) uniq.push(n);

    return `${date} — ${uniq.join(", ")}`;
  }

  async function fetchHolidayCacheEntry(country: string, year: number): Promise<HolidayCacheEntry> {
    const key = `${country}:${year}`;
    const hit = holidayCacheRef.current.get(key);
    if (hit) return hit;

    try {
      const r = await fetch(
        `/api/holidays?country=${encodeURIComponent(country)}&year=${encodeURIComponent(year)}`
      );

      if (!r.ok) {
        const entry: HolidayCacheEntry = {
          set: new Set(),
          namesByDate: new Map(),
          status: "error",
          errorMessage: `HTTP ${r.status}`,
        };
        holidayCacheRef.current.set(key, entry);
        return entry;
      }

      const data = (await r.json()) as HolidayApiItem[];
      const arr = Array.isArray(data) ? data : [];

      if (arr.length === 0) {
        const entry: HolidayCacheEntry = { set: new Set(), namesByDate: new Map(), status: "empty" };
        holidayCacheRef.current.set(key, entry);
        return entry;
      }

      const set = new Set<string>();
      const namesByDate = new Map<string, string[]>();

      for (const h of arr) {
        const d = h?.date;
        if (!d || typeof d !== "string") continue;
        set.add(d);

        const nm = typeof h?.name === "string" && h.name.trim() ? h.name.trim() : "Holiday";
        const existing = namesByDate.get(d) || [];
        existing.push(nm);
        namesByDate.set(d, existing);
      }

      const status: HolidayLoadStatus = set.size === 0 ? "empty" : "ok";

      const entry: HolidayCacheEntry = { set, namesByDate, status };
      holidayCacheRef.current.set(key, entry);
      return entry;
    } catch (e: any) {
      const entry: HolidayCacheEntry = {
        set: new Set(),
        namesByDate: new Map(),
        status: "error",
        errorMessage: e?.message || "Fetch failed",
      };
      holidayCacheRef.current.set(key, entry);
      return entry;
    }
  }

  function summarizeHolidayStatus(years: number[], perYear: Record<number, HolidayLoadStatus>): HolidaySummary {
    const statuses = years.map((y) => perYear[y]);

    const hasOk = statuses.includes("ok");
    const hasEmpty = statuses.includes("empty");
    const hasError = statuses.includes("error");

    let status: HolidaySummary["status"] = "ok";
    if (hasError && !hasOk && !hasEmpty) status = "error";
    else if (!hasOk && hasEmpty && !hasError) status = "empty";
    else if (hasError) status = "partial";
    else status = "ok";

    const yearLabel = years.length === 1 ? `${years[0]}` : `${years[0]}–${years[years.length - 1]}`;

    let message = "";
    if (status === "ok") message = `Holidays loaded for ${countryCode} (${yearLabel}).`;
    if (status === "empty") message = `Holiday API returned no data for ${countryCode} (${yearLabel}). Results exclude weekends only.`;
    if (status === "error") message = `Holiday API error for ${countryCode} (${yearLabel}). Results exclude weekends only.`;
    if (status === "partial") {
      const okYears = years.filter((y) => perYear[y] === "ok");
      const emptyYears = years.filter((y) => perYear[y] === "empty");
      const errorYears = years.filter((y) => perYear[y] === "error");

      const parts: string[] = [];
      if (okYears.length) parts.push(`loaded: ${okYears.join(", ")}`);
      if (emptyYears.length) parts.push(`no data: ${emptyYears.join(", ")}`);
      if (errorYears.length) parts.push(`error: ${errorYears.join(", ")}`);

      message = `Holiday coverage is partial (${parts.join(" · ")}). Some holidays may not be excluded.`;
    }

    return { status, years, perYear, message };
  }

  function HolidayStatusBanner() {
    if (holidaySummary.status === "idle") return null;

    if (holidaySummary.status === "loading") {
      return (
        <div className="mt-3 rounded-xl border border-black/10 bg-white/60 p-3 text-xs text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70">
          Loading holiday data…
        </div>
      );
    }

    // Professional tones:
    // - ok: slate/neutral info
    // - empty/partial: amber warning
    // - error: red
    const tone =
      holidaySummary.status === "ok"
        ? "border-slate-200/70 bg-slate-50/60 text-slate-950 dark:border-slate-300/20 dark:bg-slate-400/10 dark:text-slate-100"
        : holidaySummary.status === "empty" || holidaySummary.status === "partial"
        ? "border-amber-200/70 bg-amber-50/60 text-amber-950 dark:border-amber-300/20 dark:bg-amber-400/10 dark:text-amber-100"
        : "border-red-200/70 bg-red-50/60 text-red-950 dark:border-red-300/20 dark:bg-red-400/10 dark:text-red-100";

    const label =
      holidaySummary.status === "ok"
        ? "Holidays loaded"
        : holidaySummary.status === "empty"
        ? "No holiday data"
        : holidaySummary.status === "partial"
        ? "Partial holiday data"
        : "Holiday API error";

    return (
      <div className={`mt-3 rounded-xl border p-3 text-xs shadow-sm ${tone}`}>
        <div className="font-bold">{label}</div>
        <div className="mt-1 opacity-90">{holidaySummary.message}</div>
      </div>
    );
  }

  async function buildHolidayProviderAndNameMap(country: string, startYYYYMMDD: string, endYYYYMMDD: string) {
    const years = yearsBetweenInclusive(startYYYYMMDD, endYYYYMMDD);

    const setByYear = new Map<number, Set<string>>();
    const mergedNames = new Map<string, string[]>();
    const perYear: Record<number, HolidayLoadStatus> = {};

    await Promise.all(
      years.map(async (y) => {
        const entry = await fetchHolidayCacheEntry(country, y);

        perYear[y] = entry.status;
        setByYear.set(y, entry.set);

        for (const [date, names] of entry.namesByDate.entries()) {
          const existing = mergedNames.get(date) || [];
          mergedNames.set(date, [...existing, ...names]);
        }
      })
    );

    const holidaySetProvider = (cc: string, year: number) => {
      void cc;
      return setByYear.get(year) || new Set<string>();
    };

    return { holidaySetProvider, mergedNames, years, perYear };
  }

  async function onCalculate() {
    setError("");
    setRangeResult(null);
    setAddResult(null);
    setHolidayNamesByDate(new Map());
    setHolidaySummary({ status: "loading", years: [], perYear: {}, message: "" });
    setLoading(true);

    try {
      if (!countryCode) throw new Error("Select a country.");
      if (!startDate) throw new Error("Select a start date.");

      if (mode === "range") {
        if (!endDate) throw new Error("Select an end date.");

        const { holidaySetProvider, mergedNames, years, perYear } = await buildHolidayProviderAndNameMap(
          countryCode,
          startDate,
          endDate
        );

        const options: BizDayOptions = { excludeWeekends, holidaySetProvider };

        const result = businessDaysBetweenInclusive(startDate, endDate, countryCode, options);

        setRangeResult(result);
        setHolidayNamesByDate(mergedNames);
        setHolidaySummary(summarizeHolidayStatus(years, perYear));
        return;
      }

      if (!Number.isFinite(addDays) || addDays < 0) throw new Error("Add days must be 0 or greater.");

      const startYear = parseYYYYMMDDToUTCDate(startDate).getUTCFullYear();
      const endYearGuess = startYear + 2;
      const endGuess = toYYYYMMDD_UTC(new Date(Date.UTC(endYearGuess, 11, 31)));

      const { holidaySetProvider, mergedNames, years, perYear } = await buildHolidayProviderAndNameMap(
        countryCode,
        startDate,
        endGuess
      );

      const options: BizDayOptions = { excludeWeekends, holidaySetProvider };

      const result = addBusinessDays(startDate, addDays, countryCode, options);

      setAddResult(result);
      setHolidayNamesByDate(mergedNames);
      setHolidaySummary(summarizeHolidayStatus(years, perYear));
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
      setHolidaySummary({
        status: "error",
        years: [],
        perYear: {},
        message: "Could not load holidays due to an error.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell title="Business Day Calculator">
      <main className="mx-auto max-w-4xl px-6 py-10">
        <header className="mb-8">
            <div className="flex items-start justify-between gap-4">
                <p className="mt-2 text-black/60 dark:text-white/60">
                Calculate working days between dates, or add business days — excluding weekends and country holidays.
                

                <button
                type="button"
                onClick={() => {
                    const el = helpRef.current;
                    if (!el) return;
                    el.open = true;
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className="mt-1 inline-flex items-center justify-center rounded-full border border-black/15 bg-transparent text-[10px] font-bold text-black/60 shadow-sm hover:text-black/80 dark:border-white/15 dark:text-white/60 dark:hover:text-white/85"
                style={{
                    fontSize: 13,
                    verticalAlign: "super",
                    marginLeft: 4,
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
                aria-label="About this tool"
                title="About this tool"
                >
                i
                </button>
                </p>
            </div>
            </header>

        <section className="rounded-2xl border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode("range")}
              className={[
                "rounded-xl px-3 py-2 text-sm font-semibold border shadow-sm",
                mode === "range"
                  ? "border-violet-300/70 bg-violet-50 dark:border-violet-400/30 dark:bg-violet-500/10"
                  : "border-black/10 bg-white/70 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
              ].join(" ")}
            >
              Date Range
            </button>
            <button
              type="button"
              onClick={() => setMode("add")}
              className={[
                "rounded-xl px-3 py-2 text-sm font-semibold border shadow-sm",
                mode === "add"
                  ? "border-violet-300/70 bg-violet-50 dark:border-violet-400/30 dark:bg-violet-500/10"
                  : "border-black/10 bg-white/70 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
              ].join(" ")}
            >
              Add Business Days
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm font-semibold text-black/80 dark:text-white/80">Start date</div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-violet-300 dark:border-white/10 dark:bg-white/5"
              />
            </label>

            {mode === "range" ? (
              <label className="block">
                <div className="mb-1 text-sm font-semibold text-black/80 dark:text-white/80">End date</div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-violet-300 dark:border-white/10 dark:bg-white/5"
                />
              </label>
            ) : (
              <label className="block">
                <div className="mb-1 text-sm font-semibold text-black/80 dark:text-white/80">Add business days</div>
                <input
                  type="number"
                  min={0}
                  value={addDays}
                  onChange={(e) => setAddDays(parseInt(e.target.value || "0", 10))}
                  className="w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-violet-300 dark:border-white/10 dark:bg-white/5"
                />
              </label>
            )}

            <label className="block">
              <div className="mb-1 text-sm font-semibold text-black/80 dark:text-white/80">Country</div>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="w-full rounded-xl border border-black/10 bg-white/80 px-3 py-2 text-sm shadow-sm outline-none focus:ring-2 focus:ring-violet-300 dark:border-white/10 dark:bg-white/5"
              >
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 rounded-xl border border-black/10 bg-white/50 px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-white/5">
              <input
                type="checkbox"
                checked={excludeWeekends}
                onChange={(e) => setExcludeWeekends(e.target.checked)}
              />
              <span className="font-semibold text-black/80 dark:text-white/80">Exclude weekends</span>
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onCalculate}
              disabled={loading}
              className={[
                "rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm",
                loading ? "bg-violet-400" : "bg-violet-600 hover:bg-violet-700",
              ].join(" ")}
            >
              {loading ? "Calculating…" : "Calculate"}
            </button>

            {error ? <span className="text-sm font-semibold text-red-600 dark:text-red-400">{error}</span> : null}
          </div>

          <HolidayStatusBanner />
        </section>

        <section className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5">
          <h2 className="text-lg font-black">Results</h2>

          {!rangeResult && !addResult ? (
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              Enter values above and click <span className="font-semibold">Calculate</span>.
            </p>
          ) : null}

          {rangeResult ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border-2 border-violet-400/80 bg-violet-100/70 p-4 shadow-md ring-2 ring-violet-300/60 dark:border-violet-400/40 dark:bg-violet-500/15 dark:ring-violet-400/20">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-extrabold uppercase tracking-wide text-violet-900/80 dark:text-violet-200/80">
                      Business Days
                    </div>
                    <span className="rounded-full border border-violet-300/70 bg-white/60 px-2 py-0.5 text-[11px] font-bold text-violet-900/70 dark:border-violet-300/20 dark:bg-white/10 dark:text-violet-200/70">
                      Result
                    </span>
                  </div>
                  <div className="mt-1 text-3xl font-black text-violet-950 dark:text-violet-200">
                    {rangeResult.businessDays}
                  </div>
                  <div className="mt-1 text-xs text-violet-900/60 dark:text-violet-200/60">
                    Working days in range
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-black/60 dark:text-white/60">Calendar days (inclusive)</div>
                  <div className="mt-1 text-xl font-bold">{rangeResult.calendarDays}</div>
                </div>

                <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-black/60 dark:text-white/60">Weekend days excluded</div>
                  <div className="mt-1 text-xl font-bold">{rangeResult.weekendDaysExcluded}</div>
                </div>

                <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-black/60 dark:text-white/60">Holiday days excluded</div>
                  <div className="mt-1 text-xl font-bold">{rangeResult.holidayDaysExcluded}</div>
                </div>
              </div>

              {rangeResult.holidaysHit.length > 0 ? (
                <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-2 font-bold">Holidays excluded</div>
                  <ul className="list-inside list-disc space-y-1">
                    {rangeResult.holidaysHit.map((d) => (
                      <li key={d}>{renderHolidayLabel(d)}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl border border-black/10 bg-white/70 p-4 text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60">
                  No holidays were excluded for that range (or holiday data was empty/unavailable).
                </div>
              )}
            </div>
          ) : null}

          {addResult ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl border-2 border-violet-400/80 bg-violet-100/70 p-4 shadow-md ring-2 ring-violet-300/60 dark:border-violet-400/40 dark:bg-violet-500/15 dark:ring-violet-400/20">
                  <div className="text-xs font-extrabold uppercase tracking-wide text-violet-900/80 dark:text-violet-200/80">
                    Result date
                  </div>
                  <div className="mt-1 text-2xl font-black text-violet-950 dark:text-violet-200">
                    {addResult.resultDate}
                  </div>
                  <div className="mt-1 text-xs text-violet-900/60 dark:text-violet-200/60">
                    After adding {addResult.addBusinessDays} business day(s)
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-black/60 dark:text-white/60">Days skipped (weekends + holidays)</div>
                  <div className="mt-1 text-xl font-bold">{addResult.daysSkipped}</div>
                </div>
              </div>

              {addResult.skippedDates.length > 0 ? (
                <div className="rounded-xl border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-2 font-bold">Skipped dates</div>
                  <ul className="list-inside list-disc space-y-1">
                    {addResult.skippedDates.map((d) => (
                      <li key={d}>{holidayNamesByDate.has(d) ? renderHolidayLabel(d) : d}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
        <details
            ref={helpRef}
            className="mt-6 rounded-2xl border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
            >
            <summary className="cursor-pointer select-none text-sm font-bold text-black/80 dark:text-white/80 flex items-center gap-2">
                <span
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-black/10 text-[11px] font-black text-black/60 dark:border-white/10 dark:text-white/60"
                aria-hidden="true"
                >
                i
                </span>
                How Business Day Calculator works
            </summary>

            <div className="mt-4 space-y-4 text-sm text-black/70 dark:text-white/70">
                <div>
                <div className="font-bold text-black/85 dark:text-white/85">What this tool does</div>
                <p className="mt-1">
                    This calculator helps you count business days between two dates, or add business days to a starting date.
                    A “business day” usually means weekdays (Monday–Friday), excluding weekends and public holidays.
                </p>
                </div>

                <div>
                <div className="font-bold text-black/85 dark:text-white/85">Weekends and holidays</div>
                <p className="mt-1">
                    If “Exclude weekends” is enabled, Saturdays and Sundays are not counted as business days. For holidays, the
                    page calls the holiday API for the selected country and relevant year(s). If the holiday API returns no data
                    or errors, you’ll see a banner and results will exclude weekends only.
                </p>
                </div>

                <div>
                <div className="font-bold text-black/85 dark:text-white/85">Tips</div>
                <ul className="mt-1 list-disc pl-5 space-y-1">
                    <li>Use Date Range to estimate working days in a project timeline.</li>
                    <li>Use Add Business Days for “deliver X business days after” deadlines.</li>
                    <li>If you cross multiple years, holiday coverage depends on each year’s API response.</li>
                </ul>
                </div>
            </div>
            </details>
      </main>
    </PageShell>
  );
}
