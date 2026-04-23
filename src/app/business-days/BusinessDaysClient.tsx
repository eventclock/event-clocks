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

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
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

  const selectedCountryName = useMemo(() => {
    return countryOptions.find((c) => c.code === countryCode)?.name || countryCode;
  }, [countryCode, countryOptions]);

  const hasResult = Boolean(rangeResult || addResult);

  function getHolidayNames(date: string): string[] {
    const names = holidayNamesByDate.get(date);
    if (!names || names.length === 0) return [];

    const uniq: string[] = [];
    for (const n of names) {
      if (!uniq.includes(n)) uniq.push(n);
    }
    return uniq;
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

  function getPublicHolidaysInRange(startDate: string, endDate: string) {
    const [from, to] =
      startDate <= endDate ? [startDate, endDate] : [endDate, startDate];

    return [...holidayNamesByDate.entries()]
      .filter(([date]) => date >= from && date <= to)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, names]) => ({
        date,
        names: [...new Set(names)].sort((a, b) => a.localeCompare(b)),
      }));
  }

  function PublicHolidaysChecked({
    startDate,
    endDate,
  }: {
    startDate: string;
    endDate: string;
  }) {
    const holidays = getPublicHolidaysInRange(startDate, endDate);

    return (
      <div className={`mt-3 p-4 ${styles.softCard}`}>
        <div className={`mb-2 font-bold ${styles.softCardTitle}`}>Public holidays checked</div>
        {holidaySummary.status !== "ok" ? (
          <div
            className={[
              styles.holidayAuditNotice,
              holidaySummary.status === "error" ? styles.holidayAuditNoticeError : "",
            ].join(" ")}
          >
            {holidaySummary.message ||
              "We could not confirm the public holiday calendar for this date window."}
          </div>
        ) : null}
        {holidays.length > 0 ? (
          <ul className="list-inside list-disc space-y-1 text-sm">
            {holidays.map((holiday) => (
              <li key={holiday.date}>
                {holiday.date} — {holiday.names.join(", ")}
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.emptyHolidayText}>
            No public holidays were returned for this date window.
          </div>
        )}
      </div>
    );
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
    } catch (e: unknown) {
      const entry: HolidayCacheEntry = {
        set: new Set(),
        namesByDate: new Map(),
        status: "error",
        errorMessage: getErrorMessage(e, "Fetch failed"),
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
      return <div className={styles.holidayPill}>Loading holidays</div>;
    }

    const toneClass =
      holidaySummary.status === "ok"
        ? styles.holidayPillOk
        : holidaySummary.status === "empty" || holidaySummary.status === "partial"
        ? styles.holidayPillWarn
        : styles.holidayPillError;

    const label =
      holidaySummary.status === "ok"
        ? "Holidays loaded"
        : holidaySummary.status === "empty"
        ? "No holiday data"
        : holidaySummary.status === "partial"
        ? "Partial holiday data"
        : "Holiday API error";

    return (
      <div className={[styles.holidayPill, toneClass].join(" ")} title={holidaySummary.message}>
        {label}
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
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Something went wrong."));
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
      contentClassName={styles.pageContent}
    >
      <main className={styles.shell}>
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
              className={styles.infoButton}
              aria-label="About this tool"
              title="About this tool"
            >
              i
            </button>
          </div>
        </header>

        <section className={styles.sectionCard}>
          <div className={styles.calculatorHeader}>
            <div className={styles.modeGroup} aria-label="Calculation mode">
              <button
                type="button"
                onClick={() => {
                  setActivePreset(null);
                  setMode("range");
                }}
                className={[
                  styles.modeButton,
                  mode === "range" ? styles.modeButtonActive : styles.modeButtonIdle,
                ].join(" ")}
              >
                Date Range
              </button>

              <button
                type="button"
                onClick={() => setMode("add")}
                className={[
                  styles.modeButton,
                  mode === "add" ? styles.modeButtonActive : styles.modeButtonIdle,
                ].join(" ")}
              >
                Add Days
              </button>
            </div>

            {mode === "add" ? (
              <div className={styles.inlinePresets} aria-label="Common add-day presets">
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
                    {days} days
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.formGrid}>
            <label className={styles.dateField}>
              <div className={styles.fieldLabel}>Start date</div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`px-3 ${styles.controlField} ${styles.valueField}`}
              />
            </label>

            {mode === "range" ? (
              <label className={styles.dateField}>
                <div className={styles.fieldLabel}>End date</div>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`px-3 ${styles.controlField} ${styles.valueField}`}
                />
              </label>
            ) : (
              <label className={styles.dateField}>
                <div className={styles.fieldLabel}>Add business days</div>
                <input
                  type="number"
                  min={0}
                  value={addDays}
                  onChange={(e) => {
                    setActivePreset(null);
                    setAddDays(parseInt(e.target.value || "0", 10));
                  }}
                  className={`px-3 ${styles.controlField}`}
                />
              </label>
            )}

            <label className={styles.countryField}>
              <div className={styles.fieldLabel}>Public holiday calendar</div>
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className={`px-3 ${styles.controlField}`}
              >
                {countryOptions.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.weekendToggle}>
              <input
                type="checkbox"
                checked={excludeWeekends}
                onChange={(e) => setExcludeWeekends(e.target.checked)}
              />
              <span>Exclude weekends</span>
            </label>
          </div>

          <div className={styles.actionsBar}>
            <div className={styles.statusSlot}>
              <HolidayStatusBanner />

              {error ? (
                <span className={styles.errorText}>
                  {error}
                </span>
              ) : null}
            </div>

            <button
              type="button"
              onClick={async () => {
                await onCalculate();
                scrollToResults();
              }}
              disabled={loading}
              className={styles.primaryButton}
            >
              {loading ? "Calculating…" : "Calculate"}
            </button>
          </div>

          <div ref={commonCalcRef} />
        </section>

        {hasResult ? (
          <section
            ref={resultsRef}
            id="business-days-results"
            className={`mt-6 ${styles.sectionCard}`}
          >
            <div className={styles.sectionTitle}>Answer</div>
          {rangeResult && computedContext?.mode === "range" ? (
            <>
              <div className={styles.answerCard}>
                <div className={styles.answerLayout}>
                  <div>
                    <div className={styles.answerEyebrow}>Business days</div>
                    <div className={styles.answerValue}>
                      {rangeResult.businessDays}{" "}
                      <span className={styles.answerUnit}>
                        day{rangeResult.businessDays === 1 ? "" : "s"}
                      </span>
                    </div>
                    <p className={styles.answerLine}>
                      From <strong>{computedContext.startDate}</strong> to{" "}
                      <strong>{computedContext.endDate}</strong> using the{" "}
                      <strong>{selectedCountryName}</strong> holiday calendar
                      {computedContext.excludeWeekends ? ", with weekends excluded." : "."}
                    </p>
                  </div>

                  <div className={styles.miniTimeline} aria-hidden="true">
                    <div className={styles.timelineTrack}>
                      <div
                        className={styles.timelineFill}
                        style={{
                          width: `${Math.max(
                            6,
                            Math.min(
                              100,
                              (rangeResult.businessDays / Math.max(1, rangeResult.calendarDays)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    <div className={styles.timelineCaption}>
                      Counted against {rangeResult.calendarDays} calendar day
                      {rangeResult.calendarDays === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                <div className={styles.statGrid}>
                  <div className={styles.statChip}>
                    <div className={styles.statLabel}>Calendar days</div>
                    <div className={styles.statValue}>{rangeResult.calendarDays}</div>
                  </div>
                  <div className={styles.statChip}>
                    <div className={styles.statLabel}>Weekends skipped</div>
                    <div className={styles.statValue}>{rangeResult.weekendDaysExcluded}</div>
                  </div>
                  <div className={styles.statChip}>
                    <div className={styles.statLabel}>Holidays skipped</div>
                    <div className={styles.statValue}>{rangeResult.holidayDaysExcluded}</div>
                  </div>
                </div>
              </div>

              <PublicHolidaysChecked
                startDate={computedContext.startDate}
                endDate={computedContext.endDate}
              />
            </>
          ) : null}

          {addResult && computedContext?.mode === "add" ? (
            <>
              <div className={styles.answerCard}>
                <div className={styles.answerLayout}>
                  <div>
                    <div className={styles.answerEyebrow}>Result date</div>
                    <div className={styles.answerValue}>
                      {addResult.resultDate}
                    </div>
                    <p className={styles.answerLine}>
                      Starting on <strong>{computedContext.startDate}</strong>,{" "}
                      <strong>{computedContext.addDays}</strong> business day
                      {computedContext.addDays === 1 ? "" : "s"} lands here using the{" "}
                      <strong>{selectedCountryName}</strong> holiday calendar
                      {computedContext.excludeWeekends ? ", with weekends excluded." : "."}
                    </p>
                  </div>

                  <div className={styles.miniTimeline} aria-hidden="true">
                    <div className={styles.timelineTrack}>
                      <div
                        className={styles.timelineFill}
                        style={{
                          width: `${Math.max(
                            8,
                            Math.min(
                              100,
                              (addResult.addBusinessDays /
                                Math.max(1, addResult.addBusinessDays + addResult.daysSkipped)) *
                                100
                            )
                          )}%`,
                        }}
                      />
                    </div>
                    <div className={styles.timelineCaption}>
                      {addResult.daysSkipped} skipped day{addResult.daysSkipped === 1 ? "" : "s"}
                    </div>
                  </div>
                </div>

                <div className={styles.statGrid}>
                  <div className={styles.statChip}>
                    <div className={styles.statLabel}>Business days added</div>
                    <div className={styles.statValue}>{addResult.addBusinessDays}</div>
                  </div>
                  <div className={styles.statChip}>
                    <div className={styles.statLabel}>Skipped days</div>
                    <div className={styles.statValue}>{addResult.daysSkipped}</div>
                  </div>
                  <div className={styles.statChip}>
                    <div className={styles.statLabel}>Holiday calendar</div>
                    <div className={styles.statValue}>{computedContext.countryCode}</div>
                  </div>
                </div>
              </div>

              <PublicHolidaysChecked
                startDate={computedContext.startDate}
                endDate={addResult.resultDate}
              />

              {addResult.skippedDates.length > 0 ? (
                <div className={`mt-3 p-4 ${styles.softCard}`}>
                  <div className="mb-2 font-bold">Skipped dates</div>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {addResult.skippedDates.slice(0, 12).map((d) => (
                      <li key={d}>{renderSkippedDateLabel(d)}</li>
                    ))}
                  </ul>
                  {addResult.skippedDates.length > 12 ? (
                    <div className={styles.detailNote}>
                      Showing 12 of {addResult.skippedDates.length} skipped dates.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}
          </section>
        ) : null}

        <details ref={faqRef} className={`mt-6 ${styles.sectionCard} ${styles.infoSection}`}>
          <summary className={styles.infoSummary}>
            Quick FAQ
          </summary>

          <div className={styles.infoBody}>
            <div className={styles.infoItem}>
              <div className={styles.infoItemTitle}>What is a business day?</div>
              <p>
                A business day usually means Monday through Friday, excluding weekends and
                public holidays.
              </p>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoItemTitle}>
                How do I calculate 10 business days from today?
              </div>
              <p>
                Use <span className="font-semibold">Add Business Days</span>, keep today as
                the start date, enter <span className="font-semibold">10</span>, then click
                Calculate. You can also tap the preset button above.
              </p>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoItemTitle}>
                How do I calculate business days between two dates?
              </div>
              <p>
                Use <span className="font-semibold">Date Range</span>, choose the start and
                end dates, then calculate. The result shows business days, calendar days,
                weekends excluded, and holidays excluded.
              </p>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoItemTitle}>
                Do business days include weekends or holidays?
              </div>
              <p>
                Usually no. This calculator can exclude weekends and also attempts to exclude
                holidays for the selected country.
              </p>
            </div>
          </div>
        </details>

        <details ref={helpRef} className={`mt-6 ${styles.sectionCard} ${styles.infoSection}`}>
          <summary className={styles.infoSummary}>
            How Business Day Calculator works
          </summary>

          <div className={styles.infoBody}>
            <div className={styles.infoItem}>
              <div className={styles.infoItemTitle}>What this tool does</div>
              <p>
                This calculator helps you count business days between two dates, or add
                business days to a starting date. A business day usually means weekdays
                (Monday–Friday), excluding weekends and public holidays.
              </p>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoItemTitle}>Weekends and holidays</div>
              <p>
                If “Exclude weekends” is enabled, Saturdays and Sundays are not counted as
                business days. For holidays, the page calls the holiday API for the selected
                country and relevant year(s). If the holiday API returns no data or errors,
                you’ll see a banner and results will exclude weekends only.
              </p>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoItemTitle}>Tips</div>
              <ul className={styles.infoList}>
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
