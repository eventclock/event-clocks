"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ISO_COUNTRIES } from "@/lib/isoCountries";
import { toYYYYMMDD_UTC } from "@/lib/dateUtils";
import {
  deriveHolidaySummary,
  normalizeHoliday,
  planHolidays,
  splitPastAndUpcoming,
  uniqueHolidays,
  type PlannedHoliday,
} from "@/lib/holidayPlanner";
import styles from "./holiday-long-weekend-planner.module.css";

type LoadState = "idle" | "loading" | "ready" | "empty" | "error";

const LS_KEY = "eventclocks:holiday-long-weekend-planner:v1";

function isPublicHoliday(input: unknown) {
  if (!input || typeof input !== "object") return false;

  const types = (input as { types?: unknown }).types;
  return Array.isArray(types) && types.some((type) => type === "Public");
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function getTodayYYYYMMDD() {
  return toYYYYMMDD_UTC(new Date());
}

function localeCountryCode() {
  if (typeof navigator === "undefined") return "";

  const locale = navigator.languages?.[0] || navigator.language || "";

  try {
    const region = new Intl.Locale(locale).region;
    return typeof region === "string" ? region.toUpperCase() : "";
  } catch {
    const match = /[-_]([A-Za-z]{2})\b/.exec(locale);
    return match?.[1]?.toUpperCase() ?? "";
  }
}

function formatDate(ymd: string) {
  const [year, month, day] = ymd.split("-").map(Number);

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function countdownLabel(days: number) {
  if (days < 0) return "Past";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `${days} days`;
}

function countryName(code: string) {
  return ISO_COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

function isValidCountryCode(code: string) {
  return ISO_COUNTRIES.some((country) => country.code === code);
}

function isValidYear(value: number) {
  return Number.isInteger(value) && value >= 1970 && value <= 2100;
}

function tagClassName(tag: PlannedHoliday["tags"][number]) {
  if (tag === "Long weekend") return "longWeekend";
  if (tag === "4-day weekend") return "fourDayWeekend";
  if (tag === "Potential 4-day weekend") return "bridgeDay";
  if (tag === "Potential 9-day break") return "nineDayBreak";
  if (tag === "Potential year-end break") return "yearEndBreak";
  if (tag === "Weekend holiday") return "weekendHoliday";
  return "midweekHoliday";
}

function mergeHolidayNames(...names: string[]) {
  const merged = new Set<string>();

  for (const name of names) {
    for (const part of name.split(" / ")) {
      const trimmed = part.trim();
      if (trimmed) merged.add(trimmed);
    }
  }

  return Array.from(merged).join(" / ");
}

function mergeHolidaysByDate(holidays: PlannedHoliday[]) {
  const byDate = new Map<string, PlannedHoliday>();

  for (const holiday of holidays) {
    const existing = byDate.get(holiday.date);

    if (!existing) {
      byDate.set(holiday.date, {
        ...holiday,
        tags: [...holiday.tags],
      });
      continue;
    }

    byDate.set(holiday.date, {
      ...existing,
      name: mergeHolidayNames(existing.name, holiday.name),
      tags: Array.from(new Set([...existing.tags, ...holiday.tags])),
    });
  }

  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
      {detail ? <div className={styles.statDetail}>{detail}</div> : null}
    </div>
  );
}

function HolidayRow({ holiday }: { holiday: PlannedHoliday }) {
  return (
    <li className={styles.holidayRow}>
      <div className={styles.dateBlock}>
        <span className={styles.weekday}>{holiday.weekdayShort}</span>
        <span className={styles.dateText}>{formatDate(holiday.date)}</span>
      </div>

      <div className={styles.holidayMain}>
        <div className={styles.holidayName}>{holiday.name}</div>
        <div className={styles.holidayMeta}>
          <span>{holiday.weekday}</span>
          <span aria-hidden="true">·</span>
          <span>{countdownLabel(holiday.countdownDays)}</span>
        </div>
      </div>

      <div className={styles.tagList} aria-label={`${holiday.name} planning tags`}>
        {holiday.tags.map((tag) => (
          <span key={tag} className={`${styles.badge} ${styles[tagClassName(tag)]}`}>
            {tag}
          </span>
        ))}
      </div>
    </li>
  );
}

function EmptyState({
  countryCode,
  year,
}: {
  countryCode: string;
  year: number;
}) {
  return (
    <div className={styles.emptyState}>
      No holidays were returned for {countryName(countryCode)} in {year}. Try another country or
      year.
    </div>
  );
}

export default function HolidayLongWeekendPlannerClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [countryCode, setCountryCode] = useState("US");
  const [year, setYear] = useState(getCurrentYear);
  const [today, setToday] = useState(getTodayYYYYMMDD);
  const [holidays, setHolidays] = useState<PlannedHoliday[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [error, setError] = useState("");
  const [hasInitialized, setHasInitialized] = useState(false);

  const countryOptions = useMemo(() => {
    return [...ISO_COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  function updateUrl(nextCountryCode: string, nextYear: number) {
    const params = new URLSearchParams();
    params.set("country", nextCountryCode);
    params.set("year", String(nextYear));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  useEffect(() => {
    setToday(getTodayYYYYMMDD());

    try {
      const urlCountry = (searchParams.get("country") || "").toUpperCase();
      const urlYear = Number(searchParams.get("year"));

      if (isValidCountryCode(urlCountry)) setCountryCode(urlCountry);
      if (isValidYear(urlYear)) setYear(urlYear);

      if (isValidCountryCode(urlCountry) || isValidYear(urlYear)) {
        setHasInitialized(true);
        return;
      }

      const stored = localStorage.getItem(LS_KEY);

      if (stored) {
        const parsed = JSON.parse(stored) as Partial<{
          countryCode: string;
          year: number;
        }>;

        const storedCountry = parsed.countryCode?.toUpperCase();

        if (storedCountry && isValidCountryCode(storedCountry)) {
          setCountryCode(storedCountry);
        }

        if (typeof parsed.year === "number" && isValidYear(parsed.year)) {
          setYear(parsed.year);
        }

        setHasInitialized(true);
        return;
      }

      const detected = localeCountryCode();

      if (detected && isValidCountryCode(detected)) {
        setCountryCode(detected);
      }
    } catch {
      // graceful fallback
    } finally {
      setHasInitialized(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!hasInitialized) return;

    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ countryCode, year }));
    } catch {
      // preferences are helpful but optional
    }
  }, [countryCode, year, hasInitialized]);

  useEffect(() => {
    if (!hasInitialized) return;

    let cancelled = false;

    async function loadHolidays() {
      setLoadState("loading");
      setError("");

      try {
        async function fetchPublicHolidays(targetYear: number) {
          const response = await fetch(
            `/api/holidays?country=${encodeURIComponent(countryCode)}&year=${encodeURIComponent(
              targetYear
            )}`
          );

          if (!response.ok) {
            throw new Error(`Holiday data returned HTTP ${response.status}`);
          }

          const data = await response.json();

          return Array.isArray(data)
            ? data
                .filter(isPublicHoliday)
                .map(normalizeHoliday)
                .filter((holiday): holiday is NonNullable<typeof holiday> => !!holiday)
            : [];
        }

        const normalized = await fetchPublicHolidays(year);
        let planningContext = normalized;

        if (year < 2100) {
          try {
            const nextYearHolidays = await fetchPublicHolidays(year + 1);
            planningContext = [...normalized, ...nextYearHolidays];
          } catch {
            planningContext = normalized;
          }
        }

        if (cancelled) return;

        const planned = planHolidays(
          uniqueHolidays(normalized),
          today,
          uniqueHolidays(planningContext)
        );
        const mergedByDate = mergeHolidaysByDate(planned);

        setHolidays(mergedByDate);
        setLoadState(mergedByDate.length > 0 ? "ready" : "empty");
      } catch (err) {
        if (cancelled) return;

        setHolidays([]);
        setLoadState("error");
        setError(err instanceof Error ? err.message : "Holiday data could not be loaded.");
      }
    }

    loadHolidays();

    return () => {
      cancelled = true;
    };
  }, [countryCode, year, today, hasInitialized]);

  const { upcoming, past } = useMemo(() => splitPastAndUpcoming(holidays), [holidays]);
  const summary = useMemo(() => deriveHolidaySummary(holidays), [holidays]);
  const upcomingSummary = useMemo(() => deriveHolidaySummary(upcoming), [upcoming]);

  const nextHolidayDetail = summary.nextHoliday
    ? `${formatDate(summary.nextHoliday.date)} · ${countdownLabel(
        summary.nextHoliday.countdownDays
      )}`
    : "No upcoming holidays in this year";

  const currentYear = getCurrentYear();

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Public holidays · long weekends · bridge days</p>
          <h1>Holiday + Long Weekend Planner</h1>
          <p className={styles.subtitle}>
            Pick a country and year to see holidays by date, countdown, weekday, and planning
            opportunity.
          </p>
        </div>

        <div className={styles.controls}>
          <label className={styles.control}>
            <span>Country</span>
            <select
              value={countryCode}
              onChange={(e) => {
                const nextCountry = e.target.value;
                setCountryCode(nextCountry);
                updateUrl(nextCountry, year);
              }}
            >
              {countryOptions.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.control}>
            <span>Year</span>
            <input
              type="number"
              min="1970"
              max="2100"
              value={year}
              onChange={(e) => {
                const next = Number(e.target.value);
                if (Number.isFinite(next)) {
                  setYear(next);
                  updateUrl(countryCode, next);
                }
              }}
            />
          </label>
        </div>
      </section>

      <div className={styles.yearChips}>
        <button
          type="button"
          className={`${styles.yearChip} ${year === currentYear ? styles.yearChipActive : ""}`}
          onClick={() => {
            setYear(currentYear);
            updateUrl(countryCode, currentYear);
          }}
        >
          This year
        </button>

        <button
          type="button"
          className={`${styles.yearChip} ${
            year === currentYear + 1 ? styles.yearChipActive : ""
          }`}
          onClick={() => {
            const nextYear = currentYear + 1;
            setYear(nextYear);
            updateUrl(countryCode, nextYear);
          }}
        >
          Next year
        </button>

        <button
          type="button"
          className={styles.yearChip}
          onClick={() => {
            const nextYear = year - 1;
            setYear(nextYear);
            updateUrl(countryCode, nextYear);
          }}
        >
          −1 year
        </button>

        <button
          type="button"
          className={styles.yearChip}
          onClick={() => {
            const nextYear = year + 1;
            setYear(nextYear);
            updateUrl(countryCode, nextYear);
          }}
        >
          +1 year
        </button>
      </div>

      <section className={styles.summaryGrid}>
        <StatCard
          label="Next holiday"
          value={summary.nextHoliday?.name ?? "None left"}
          detail={nextHolidayDetail}
        />
        <StatCard
          label="Holidays left"
          value={String(summary.holidaysLeft)}
          detail={`Remaining in ${year}`}
        />
        <StatCard
          label="Long weekends left"
          value={String(upcomingSummary.longWeekendCount)}
          detail="3-day breaks"
        />
        <StatCard
          label="4-day weekends left"
          value={String(upcomingSummary.fourDayWeekendCount)}
          detail={
            upcomingSummary.yearEndBreakCount > 0
              ? `${upcomingSummary.yearEndBreakCount} year-end`
              : upcomingSummary.nineDayBreakCount > 0
                ? `${upcomingSummary.nineDayBreakCount} stretchable`
              : "Adjacent pairs"
          }
        />
        <StatCard
          label="Bridge days left"
          value={String(upcomingSummary.bridgeDayCount)}
          detail="Tue/Thu holidays"
        />
      </section>

      <section className={styles.panel}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Upcoming Holidays</h2>
            <p>
              {countryName(countryCode)} · {year}
            </p>
          </div>

          <span className={styles.countPill}>{upcoming.length} upcoming</span>
        </div>

        {loadState === "loading" && <div className={styles.emptyState}>Loading holidays...</div>}

        {loadState === "error" && (
          <div className={styles.emptyState}>Holiday data could not be loaded. {error}</div>
        )}

        {loadState === "empty" && <EmptyState countryCode={countryCode} year={year} />}

        {loadState === "ready" && upcoming.length === 0 && (
          <div className={styles.emptyState}>No upcoming holidays remain in {year}.</div>
        )}

        {upcoming.length > 0 && (
          <ul className={styles.holidayList}>
            {upcoming.map((holiday) => (
              <HolidayRow key={`${holiday.date}-${holiday.name}`} holiday={holiday} />
            ))}
          </ul>
        )}
      </section>

      <details className={styles.panel} open={past.length > 0 && upcoming.length === 0}>
        <summary className={styles.pastSummary}>
          <span>Past Holidays</span>
          <span>{past.length} past</span>
        </summary>

        {past.length > 0 ? (
          <ul className={styles.holidayList}>
            {past.map((holiday) => (
              <HolidayRow key={`${holiday.date}-${holiday.name}`} holiday={holiday} />
            ))}
          </ul>
        ) : (
          <div className={styles.emptyState}>No past holidays yet for this year.</div>
        )}
      </details>

      <section className={styles.infoGrid}>
        <article className={styles.infoBlock}>
          <h2>How the long weekend tags work</h2>
          <p>
            Holidays on Monday or Friday are marked as long weekends. Adjacent Monday-Tuesday or
            Thursday-Friday holiday pairs are marked as 4-day weekends, with a potential 9-day break
            cue when taking three surrounding weekdays could extend the time off. Late-December
            holidays also look ahead to New Year&apos;s Day when checking year-end break potential.
            Standalone Tuesday or Thursday holidays remain potential 4-day weekends.
          </p>
        </article>

        <article className={styles.infoBlock}>
          <h2>About observed holidays</h2>
          <p>
            Public holiday observance can vary by employer, region, and industry. Use this planner
            as a quick deterministic calendar check, then confirm local or workplace rules before
            booking time off.
          </p>
        </article>
      </section>
    </main>
  );
}
