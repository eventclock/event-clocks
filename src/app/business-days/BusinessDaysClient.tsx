"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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
import styles from "./business-days-ui.module.css";

type Mode = "range" | "add";

const LS_KEY = "eventclocks:business-days:v1";
const COMMON_ADD_PRESETS = [5, 10, 15, 20, 30];

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

function isWeekendUTC(ymd: string): boolean {
  const d = parseYYYYMMDDToUTCDate(ymd);
  const day = d.getUTCDay();
  return day === 0 || day === 6;
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

type CalculateOverrides = Partial<{
  mode: Mode;
  countryCode: string;
  excludeWeekends: boolean;
  startDate: string;
  endDate: string;
  addDays: number;
}>;

type ComputedContext =
  | {
      mode: "range";
      startDate: string;
      endDate: string;
      countryCode: string;
      excludeWeekends: boolean;
    }
  | {
      mode: "add";
      startDate: string;
      addDays: number;
      countryCode: string;
      excludeWeekends: boolean;
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
  const [computedContext, setComputedContext] = useState<ComputedContext | null>(null);

  const [holidayNamesByDate, setHolidayNamesByDate] = useState<Map<string, string[]>>(new Map());
  const [holidaySummary, setHolidaySummary] = useState<HolidaySummary>({
    status: "idle",
    years: [],
    perYear: {},
    message: "",
  });

  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<number | null>(null);

  const holidayCacheRef = useRef<Map<string, HolidayCacheEntry>>(new Map());
  const helpRef = useRef<HTMLDetailsElement | null>(null);
  const faqRef = useRef<HTMLDetailsElement | null>(null);
  const commonCalcRef = useRef<HTMLDivElement | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);

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

  function scrollToResults() {
    requestAnimationFrame(() => {
      const el = resultsRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const targetTop = window.scrollY + rect.top - 20;

      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });
    });
  }

  const countryOptions = useMemo(() => {
    return [...ISO_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  function getHolidayNames(date: string): string[] {
    const names = holidayNamesByDate.get(date);
    if (!names || names.length === 0) return [];

    const uniq: string[] = [];
    for (const n of names) {
      if (!uniq.includes(n)) uniq.push(n);
    }
    return uniq;
  }

  function renderHolidayLabel(date: string): string {
    const names = getHolidayNames(date);
    if (names.length === 0) return date;
    return `${date} — ${names.join(", ")}`;
  }

  function renderSkippedDateLabel(date: string): string {
    const weekend = isWeekendUTC(date);
    const holidayNames = getHolidayNames(date);
    const hasHoliday = holidayNames.length > 0;

    if (weekend && hasHoliday) {
      return `${date} — Weekend + Holiday: ${holidayNames.join(", ")}`;
    }
    if (weekend) {
      return `${date} — Weekend`;
    }
    if (hasHoliday) {
      return `${date} — Holiday: ${holidayNames.join(", ")}`;
    }
    return date;
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

  function summarizeHolidayStatus(
    years: number[],
    perYear: Record<number, HolidayLoadStatus>
  ): HolidaySummary {
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
    if (status === "empty") {
      message = `Holiday API returned no data for ${countryCode} (${yearLabel}). Results exclude weekends only.`;
    }
    if (status === "error") {
      message = `Holiday API error for ${countryCode} (${yearLabel}). Results exclude weekends only.`;
    }
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
        <div
          className={`mt-3 border border-black/10 bg-white/60 p-3 text-xs text-black/70 dark:border-white/10 dark:bg-white/5 dark:text-white/70 ${styles.softCard}`}
        >
          Loading holiday data…
        </div>
      );
    }

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
      <div className={`mt-3 border p-3 text-xs shadow-sm ${tone} ${styles.softCard}`}>
        <div className="font-bold">{label}</div>
        <div className="mt-1 opacity-90">{holidaySummary.message}</div>
      </div>
    );
  }

  async function buildHolidayProviderAndNameMap(
    country: string,
    startYYYYMMDD: string,
    endYYYYMMDD: string
  ) {
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

  async function onCalculate(override?: CalculateOverrides) {
    const effectiveMode = override?.mode ?? mode;
    const effectiveCountryCode = override?.countryCode ?? countryCode;
    const effectiveExcludeWeekends = override?.excludeWeekends ?? excludeWeekends;
    const effectiveStartDate = override?.startDate ?? startDate;
    const effectiveEndDate = override?.endDate ?? endDate;
    const effectiveAddDays = override?.addDays ?? addDays;

    setError("");
    setRangeResult(null);
    setAddResult(null);
    setComputedContext(null);
    setHolidayNamesByDate(new Map());
    setHolidaySummary({ status: "loading", years: [], perYear: {}, message: "" });
    setLoading(true);

    try {
      if (!effectiveCountryCode) throw new Error("Select a country.");
      if (!effectiveStartDate) throw new Error("Select a start date.");

      if (effectiveMode === "range") {
        if (!effectiveEndDate) throw new Error("Select an end date.");

        const { holidaySetProvider, mergedNames, years, perYear } =
          await buildHolidayProviderAndNameMap(
            effectiveCountryCode,
            effectiveStartDate,
            effectiveEndDate
          );

        const options: BizDayOptions = {
          excludeWeekends: effectiveExcludeWeekends,
          holidaySetProvider,
        };

        const result = businessDaysBetweenInclusive(
          effectiveStartDate,
          effectiveEndDate,
          effectiveCountryCode,
          options
        );

        setRangeResult(result);
        setHolidayNamesByDate(mergedNames);
        setHolidaySummary(summarizeHolidayStatus(years, perYear));
        setComputedContext({
          mode: "range",
          startDate: effectiveStartDate,
          endDate: effectiveEndDate,
          countryCode: effectiveCountryCode,
          excludeWeekends: effectiveExcludeWeekends,
        });
        return;
      }

      if (!Number.isFinite(effectiveAddDays) || effectiveAddDays < 0) {
        throw new Error("Add days must be 0 or greater.");
      }

      const startYear = parseYYYYMMDDToUTCDate(effectiveStartDate).getUTCFullYear();
      const endYearGuess = startYear + 2;
      const endGuess = toYYYYMMDD_UTC(new Date(Date.UTC(endYearGuess, 11, 31)));

      const { holidaySetProvider, mergedNames, years, perYear } =
        await buildHolidayProviderAndNameMap(
          effectiveCountryCode,
          effectiveStartDate,
          endGuess
        );

      const options: BizDayOptions = {
        excludeWeekends: effectiveExcludeWeekends,
        holidaySetProvider,
      };

      const result = addBusinessDays(
        effectiveStartDate,
        effectiveAddDays,
        effectiveCountryCode,
        options
      );

      setAddResult(result);
      setHolidayNamesByDate(mergedNames);
      setHolidaySummary(summarizeHolidayStatus(years, perYear));
      setComputedContext({
        mode: "add",
        startDate: effectiveStartDate,
        addDays: effectiveAddDays,
        countryCode: effectiveCountryCode,
        excludeWeekends: effectiveExcludeWeekends,
      });
    } catch (e: any) {
      setError(e?.message || "Something went wrong.");
      setComputedContext(null);
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

  async function applyPreset(days: number) {
    const today = todayYYYYMMDD();

    setActivePreset(days);
    setMode("add");
    setStartDate(today);
    setAddDays(days);

    await onCalculate({
      mode: "add",
      startDate: today,
      addDays: days,
    });

    requestAnimationFrame(() => {
      const el = commonCalcRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const targetTop = window.scrollY + rect.top - 20;

      window.scrollTo({
        top: targetTop,
        behavior: "smooth",
      });
    });
  }

  return (
    <PageShell
      title="Business Day Calculator"
      subtitle="Calculate working days between dates, or add business days — excluding weekends and country holidays."
    >
      <main className="mx-auto max-w-4xl px-6 py-6">
        <header className="mb-2">
          <div className="flex items-start justify-end gap-1">
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
          </div>
        </header>

        <section
          className={`border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 ${styles.sectionCard}`}
        >
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActivePreset(null);
                setMode("range");
              }}
              className={[
                `border shadow-sm ${styles.modeButton}`,
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
                `border shadow-sm ${styles.modeButton}`,
                mode === "add"
                  ? "border-violet-300/70 bg-violet-50 dark:border-violet-400/30 dark:bg-violet-500/10"
                  : "border-black/10 bg-white/70 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
              ].join(" ")}
            >
              Add Business Days
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
            <label className="block">
              <div className="mb-1 text-sm font-semibold text-black/80 dark:text-white/80">
                Start date
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full border border-black/10 bg-white/80 px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-violet-300 dark:border-white/10 dark:bg-white/5 ${styles.controlField} ${styles.valueField}`}
              />
            </label>

            {mode === "range" ? (
              <label className="block">
                <div className="mb-1 text-sm font-semibold text-black/80 dark:text-white/80">
                  End date
                </div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full border border-black/10 bg-white/80 px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-violet-300 dark:border-white/10 dark:bg-white/5 ${styles.controlField}  ${styles.valueField}`}
                />
              </label>
            ) : (
              <label className="block">
                <div className="mb-1 text-sm font-semibold text-black/80 dark:text-white/80">
                  Add business days
                </div>
                <input
                  type="number"
                  min={0}
                  value={addDays}
                  onChange={(e) => {
                    setActivePreset(null);
                    setAddDays(parseInt(e.target.value || "0", 10));
                  }}
                  className={`w-full border border-black/10 bg-white/80 px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-violet-300 dark:border-white/10 dark:bg-white/5 ${styles.controlField}`}
                />
              </label>
            )}

            <label className="block">
              <div className="mb-1 text-sm font-semibold text-black/80 dark:text-white/80">
                Country
              </div>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className={`w-full border border-black/10 bg-white/80 px-3 text-sm shadow-sm outline-none focus:ring-2 focus:ring-violet-300 dark:border-white/10 dark:bg-white/5 ${styles.controlField}`}
              >
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>

            <div className="block">
              <div className="mb-1 text-sm font-semibold text-transparent select-none">
                placeholder
              </div>

              <label
                className={`flex items-center gap-2 border border-black/10 bg-white/50 px-4 text-sm shadow-sm dark:border-white/10 dark:bg-white/5 ${styles.controlCard}`}
              >
                <input
                  type="checkbox"
                  checked={excludeWeekends}
                  onChange={(e) => setExcludeWeekends(e.target.checked)}
                />
                <span className="font-semibold text-black/80 dark:text-white/80">
                  Exclude weekends
                </span>
              </label>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={async () => {
                await onCalculate();
                scrollToResults();
              }}
              disabled={loading}
              className={[
                `text-white shadow-sm ${styles.primaryButton}`,
                loading ? "bg-violet-400" : "bg-violet-600 hover:bg-violet-700",
              ].join(" ")}
            >
              {loading ? "Calculating…" : "Calculate"}
            </button>

            {error ? (
              <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                {error}
              </span>
            ) : null}
          </div>

          <HolidayStatusBanner />

          <div
            ref={commonCalcRef}
            className="mt-5 border-t border-black/8 pt-4 dark:border-white/10"
          >
            <div className="text-sm font-bold text-black/80 dark:text-white/80">
              Common calculations
            </div>
            <p className={styles.presetHint}>
              Tap a preset to fill the calculator and run it automatically.
            </p>

            <div className={styles.presetRow}>
              {COMMON_ADD_PRESETS.map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => void applyPreset(days)}
                  className={[
                    styles.presetChip,
                    activePreset === days ? styles.presetChipActive : "",
                  ].join(" ")}
                  aria-pressed={activePreset === days}
                >
                  {days} business days from today
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          ref={resultsRef}
          id="business-days-results"
          className={`mt-6 border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 ${styles.sectionCard}`}
        >
          <h2 className="text-lg font-black">Results</h2>

          {!rangeResult && !addResult ? (
            <p className="mt-2 text-sm text-black/60 dark:text-white/60">
              Enter values above and click <span className="font-semibold">Calculate</span>.
            </p>
          ) : null}

          {rangeResult && computedContext?.mode === "range" ? (
            <p className="mt-2 text-[13px] italic text-black/55 dark:text-white/50">
              Business days counted from{" "}
              <span className="font-medium">{computedContext.startDate}</span> to{" "}
              <span className="font-medium">{computedContext.endDate}</span> in{" "}
              <span className="font-medium">{computedContext.countryCode}</span>
              {computedContext.excludeWeekends ? " (weekends excluded)" : ""}.
            </p>
          ) : null}

          {rangeResult ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div
                  className={`border-2 border-violet-400/80 bg-violet-100/70 p-4 shadow-md ring-2 ring-violet-300/60 dark:border-violet-400/40 dark:bg-violet-500/15 dark:ring-violet-400/20 ${styles.resultCard}`}
                >
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

                <div
                  className={`border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 ${styles.softCard}`}
                >
                  <div className="text-black/60 dark:text-white/60">Calendar days (inclusive)</div>
                  <div className="mt-1 text-xl font-bold">{rangeResult.calendarDays}</div>
                </div>

                <div
                  className={`border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 ${styles.softCard}`}
                >
                  <div className="text-black/60 dark:text-white/60">Weekend days excluded</div>
                  <div className="mt-1 text-xl font-bold">{rangeResult.weekendDaysExcluded}</div>
                </div>

                <div
                  className={`border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 ${styles.softCard}`}
                >
                  <div className="text-black/60 dark:text-white/60">Holiday days excluded</div>
                  <div className="mt-1 text-xl font-bold">{rangeResult.holidayDaysExcluded}</div>
                </div>
              </div>

              {rangeResult.holidaysHit.length > 0 ? (
                <div
                  className={`border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 ${styles.softCard}`}
                >
                  <div className="mb-2 font-bold">Holidays excluded</div>
                  <ul className="list-inside list-disc space-y-1">
                    {rangeResult.holidaysHit.map((d) => (
                      <li key={d}>{renderHolidayLabel(d)}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div
                  className={`border border-black/10 bg-white/70 p-4 text-black/60 dark:border-white/10 dark:bg-white/5 dark:text-white/60 ${styles.softCard}`}
                >
                  No holidays were excluded for that range (or holiday data was empty/unavailable).
                </div>
              )}
            </div>
          ) : null}

          {addResult && computedContext?.mode === "add" ? (
            <p className="mt-2 text-[13px] italic text-black/55 dark:text-white/50">
              From <span className="font-medium">{computedContext.startDate}</span>, adding{" "}
              <span className="font-medium">{computedContext.addDays}</span> business days in{" "}
              <span className="font-medium">{computedContext.countryCode}</span>
              {computedContext.excludeWeekends ? " (weekends excluded)" : ""}.
            </p>
          ) : null}

          {addResult ? (
            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div
                  className={`border-2 border-violet-400/80 bg-violet-100/70 p-4 shadow-md ring-2 ring-violet-300/60 dark:border-violet-400/40 dark:bg-violet-500/15 dark:ring-violet-400/20 ${styles.resultCard}`}
                >
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

                <div
                  className={`border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 ${styles.softCard}`}
                >
                  <div className="text-black/60 dark:text-white/60">
                    Days skipped (weekends + holidays)
                  </div>
                  <div className="mt-1 text-xl font-bold">{addResult.daysSkipped}</div>
                </div>
              </div>

              {addResult.skippedDates.length > 0 ? (
                <div
                  className={`border border-black/10 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5 ${styles.softCard}`}
                >
                  <div className="mb-2 font-bold">Skipped dates</div>
                  <ul className="list-inside list-disc space-y-1">
                    {addResult.skippedDates.map((d) => (
                      <li key={d}>{renderSkippedDateLabel(d)}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>

        <details
          ref={faqRef}
          className={`mt-6 border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 ${styles.sectionCard}`}
        >
          <summary className="cursor-pointer select-none text-sm font-bold text-black/80 dark:text-white/80">
            Quick FAQ
          </summary>

          <div className="mt-4 space-y-4 text-sm text-black/70 dark:text-white/70">
            <div>
              <div className="font-bold text-black/85 dark:text-white/85">What is a business day?</div>
              <p className="mt-1">
                A business day usually means Monday through Friday, excluding weekends and
                public holidays.
              </p>
            </div>

            <div>
              <div className="font-bold text-black/85 dark:text-white/85">
                How do I calculate 10 business days from today?
              </div>
              <p className="mt-1">
                Use <span className="font-semibold">Add Business Days</span>, keep today as
                the start date, enter <span className="font-semibold">10</span>, then click
                Calculate. You can also tap the preset button above.
              </p>
            </div>

            <div>
              <div className="font-bold text-black/85 dark:text-white/85">
                How do I calculate business days between two dates?
              </div>
              <p className="mt-1">
                Use <span className="font-semibold">Date Range</span>, choose the start and
                end dates, then calculate. The result shows business days, calendar days,
                weekends excluded, and holidays excluded.
              </p>
            </div>

            <div>
              <div className="font-bold text-black/85 dark:text-white/85">
                Do business days include weekends or holidays?
              </div>
              <p className="mt-1">
                Usually no. This calculator can exclude weekends and also attempts to exclude
                holidays for the selected country.
              </p>
            </div>
          </div>
        </details>

        <details
          ref={helpRef}
          className={`mt-6 border border-black/10 bg-white/60 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 ${styles.sectionCard}`}
        >
          <summary className="cursor-pointer select-none text-sm font-bold text-black/80 dark:text-white/80 flex items-center gap-2">
            How Business Day Calculator works
          </summary>

          <div className="mt-4 space-y-4 text-sm text-black/70 dark:text-white/70">
            <div>
              <div className="font-bold text-black/85 dark:text-white/85">What this tool does</div>
              <p className="mt-1">
                This calculator helps you count business days between two dates, or add
                business days to a starting date. A business day usually means weekdays
                (Monday–Friday), excluding weekends and public holidays.
              </p>
            </div>

            <div>
              <div className="font-bold text-black/85 dark:text-white/85">Weekends and holidays</div>
              <p className="mt-1">
                If “Exclude weekends” is enabled, Saturdays and Sundays are not counted as
                business days. For holidays, the page calls the holiday API for the selected
                country and relevant year(s). If the holiday API returns no data or errors,
                you’ll see a banner and results will exclude weekends only.
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

        <section className="mt-6">
          <div className="text-xs font-semibold text-black/50 dark:text-white/50">
            Related tools
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Link href="/time-since" className={styles.relatedTool}>
              Time Since
            </Link>

            <Link href="/timezone" className={styles.relatedTool}>
              Timezone Converter
            </Link>

            <Link href="/meeting-overlap" className={styles.relatedTool}>
              Meeting Overlap
            </Link>
          </div>
        </section>
      </main>
    </PageShell>
  );
}