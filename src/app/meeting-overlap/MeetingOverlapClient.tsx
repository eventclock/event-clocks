"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "@/components/PageShell";
import { ISO_COUNTRIES } from "@/lib/isoCountries";

// ---- Types ----
type StepMinutes = 15 | 30 | 60;
type MeetingMinutes = 30 | 45 | 60 | 90 | 120;

type TZEntry = {
  id: string;
  tz: string;
  holidayCountry?: string; // ISO code (e.g. "PH"), optional
};

type LocalCell = {
  tz: string;
  localLabel: string;
  localHour: number;
  weekdayShort: string; // Mon/Tue/...
  isWeekend: boolean;
  holidayCountry?: string;
  localYmd: string;
  holidayName?: string;
};

type Row = {
  utcISO: string;
  utcLabel: string;
  locals: LocalCell[];
  isOverlap: boolean;
  weekendZones: number;
};

// ---- Utilities ----
function uid() {
  return Math.random().toString(16).slice(2) + Date.now().toString(16);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function clampInt(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function toUtcISO(date: Date) {
  const iso = date.toISOString();
  return iso.replace(".000Z", "Z");
}

function safeTimeZones(): string[] {
  const anyIntl = Intl as any;
  if (anyIntl?.supportedValuesOf) {
    try {
      return (anyIntl.supportedValuesOf("timeZone") as string[]).slice();
    } catch {
      // ignore
    }
  }
  return [
    "UTC",
    "America/Los_Angeles",
    "America/Denver",
    "America/Chicago",
    "America/New_York",
    "Europe/London",
    "Europe/Paris",
    "Asia/Manila",
    "Asia/Singapore",
    "Asia/Tokyo",
    "Australia/Sydney",
  ];
}

function isValidIanaTz(tz: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Friendly label + 24h hour + weekdayShort
 */
function formatInTimeZone(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const parts = dtf.formatToParts(date);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const weekday = part("weekday");
  const month = part("month");
  const day = part("day");
  const hourStr = part("hour");
  const minuteStr = part("minute");
  const dayPeriod = part("dayPeriod");

  let hour12 = parseInt(hourStr, 10);
  if (!Number.isFinite(hour12)) hour12 = 12;
  const isPM = dayPeriod.toUpperCase() === "PM";
  let hour24 = hour12 % 12;
  if (isPM) hour24 += 12;

  const label = `${weekday}, ${month} ${day} • ${parseInt(hourStr, 10)}:${minuteStr} ${dayPeriod}`;
  return { label, hour24, weekdayShort: weekday };
}

function isWeekendShort(weekdayShort: string) {
  const w = weekdayShort.toLowerCase();
  return w === "sat" || w === "sun";
}

/**
 * For interval validation: local minutes AND local date (ymd)
 */
function localDateTimeParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";

  const year = parseInt(get("year"), 10);
  const month = parseInt(get("month"), 10);
  const day = parseInt(get("day"), 10);
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);

  const minutes = hour * 60 + minute;
  const ymd = `${year}-${pad2(month)}-${pad2(day)}`;

  return { ymd, minutes, hour, minute, year };
}

// ---- localStorage helpers ----
const LS_FAVORITES_KEY = "eventclocks_meetingOverlap_favoriteTimeZones_v1";
const LS_TZ_COUNTRY_MAP_KEY = "eventclocks_meetingOverlap_tzCountryMap_v1";

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(LS_FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}

function saveFavorites(favs: string[]) {
  try {
    localStorage.setItem(LS_FAVORITES_KEY, JSON.stringify(favs));
  } catch {
    // ignore
  }
}

function loadTzCountryMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_TZ_COUNTRY_MAP_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      const kk = typeof k === "string" ? k.trim() : "";
      const vv = typeof v === "string" ? v.trim().toUpperCase() : "";
      if (kk && vv) out[kk] = vv;
    }
    return out;
  } catch {
    return {};
  }
}

function saveTzCountryMap(map: Record<string, string>) {
  try {
    localStorage.setItem(LS_TZ_COUNTRY_MAP_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function minutesToHHMM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function hhmmToMinutes(v: string) {
  const [hh, mm] = v.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return clampInt(hh * 60 + mm, 0, 23 * 60 + 45);
}

// ---- Info icon with click/tap tooltip ----
function InfoTip({ id, text }: { id: string; text: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const root = document.getElementById(id);
      if (root && !root.contains(target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [open, id]);

  return (
    <span id={id} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-sm border border-slate-200 text-[10px] font-bold text-slate-500 hover:text-slate-700"
        aria-label="Info"
        aria-expanded={open}
      >
        i
      </button>

      {open && (
        <div
          className="absolute z-20 top-6 left-0 w-72 rounded-md border border-slate-200 bg-white p-2 shadow-lg text-[11px] text-slate-700"
          role="tooltip"
        >
          {text}
        </div>
      )}
    </span>
  );
}

// ---- Country picker ----
function CountryPicker({
  value,
  onChange,
  id,
}: {
  value?: string; // ISO code or ""
  onChange: (code: string) => void;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = useMemo(() => {
    if (!value) return null;
    return ISO_COUNTRIES.find((c) => c.code === value) || null;
  }, [value]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return ISO_COUNTRIES.slice(0, 20);
    return ISO_COUNTRIES.filter((c) => {
      return c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query);
    }).slice(0, 30);
  }, [q]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      const el = document.getElementById(id);
      const target = e.target as HTMLElement | null;
      if (el && target && !el.contains(target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [open, id]);

  return (
    <div id={id} className="relative inline-flex items-center gap-2">
      <span className="text-slate-600">Holidays</span>

      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) setQ("");
        }}
        className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-50"
        title="Pick a holiday calendar (country)"
        aria-expanded={open}
      >
        {selected ? `${selected.name} (${selected.code})` : "No holidays"}
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div className="absolute z-30 top-7 left-0 w-[280px] rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="p-2 border-b border-slate-200">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Type a country (e.g. Philippines)"
              className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] focus:outline-none focus:ring-2 focus:ring-blue-100"
              autoFocus
            />
          </div>

          <div className="max-h-56 overflow-auto p-1">
            <button
              type="button"
              className="w-full text-left rounded-md px-2 py-1 text-[11px] hover:bg-slate-50 text-slate-700"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              No holidays
            </button>

            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                className="w-full text-left rounded-md px-2 py-1 text-[11px] hover:bg-slate-50 text-slate-800"
                onClick={() => {
                  onChange(c.code);
                  setOpen(false);
                }}
              >
                {c.name} <span className="text-slate-500">({c.code})</span>
              </button>
            ))}

            {filtered.length === 0 && <div className="px-2 py-2 text-[11px] text-slate-500">No matches.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ---- UI classes ----
const inputCls =
  "mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100";
const selectCls =
  "mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-100";

const btnBase =
  "inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed";

const btnNeutral = `${btnBase} bg-white border-slate-200 hover:bg-slate-50 text-slate-800`;
const btnPrimary = `${btnBase} bg-blue-900 border-blue-900 text-white hover:bg-blue-800 disabled:bg-slate-200 disabled:border-slate-200 disabled:text-white/70`;
const btnSuccessActive = `${btnBase} bg-green-900 border-green-900 text-white hover:bg-green-800`;
const btnSuccessIdle = `${btnBase} bg-white border-slate-200 hover:bg-slate-50 text-slate-800`;

const pillBase = "inline-flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] font-semibold leading-none";
const pillNeutral = `${pillBase} border-slate-200 bg-white text-slate-600`;
const pillOverlapLegend = `${pillBase} border-slate-200 bg-green-50 text-slate-800`;
const pillFavorite = `${pillBase} border-slate-200 bg-white text-slate-800 hover:bg-slate-50`;

const weekendBadge =
  "ml-2 inline-flex items-center rounded-sm border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600";

const holidayBadge =
  "ml-2 inline-flex items-center rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900";

// ---- Holidays: client cache + status ----
type HolidayItem = { date: string; name: string; types?: any };
type HolidayIndex = Record<string, Record<string, string>>; // country -> (YYYY-MM-DD -> name)
type HolidayCountryStatus = {
  state: "idle" | "loading" | "loaded" | "empty" | "error";
  message?: string;
  updatedAt?: number;
};

const HOLIDAY_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function ssGetJSON<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function ssSetJSON(key: string, value: any) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function useHolidayIndex(mounted: boolean, tzList: TZEntry[], baseDateLocal: string) {
  const [index, setIndex] = useState<HolidayIndex>({});
  const [countryStatus, setCountryStatus] = useState<Record<string, HolidayCountryStatus>>({});

  const wanted = useMemo(() => {
    const countries = Array.from(
      new Set(
        tzList
          .map((t) => (t.holidayCountry || "").trim().toUpperCase())
          .filter((c) => /^[A-Z]{2}$/.test(c))
      )
    );

    // We scan one UTC day, but local zones can land on adjacent days around the edges.
    // Year edge-case near Dec 31 / Jan 1 => include y-1 and y+1.
    const y = Number((baseDateLocal || "").slice(0, 4));
    const years = new Set<number>();
    if (Number.isFinite(y) && y >= 1970 && y <= 2100) {
      years.add(y);
      years.add(y - 1);
      years.add(y + 1);
    }

    return {
      countries,
      years: Array.from(years).filter((yy) => yy >= 1970 && yy <= 2100),
    };
  }, [tzList, baseDateLocal]);

  useEffect(() => {
    if (!mounted) return;
    if (wanted.countries.length === 0 || wanted.years.length === 0) return;

    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      // mark loading for selected countries
      setCountryStatus((prev) => {
        const next = { ...prev };
        for (const c of wanted.countries) next[c] = { state: "loading" };
        return next;
      });

      const now = Date.now();

      // 1) hydrate from sessionStorage (fixes reload)
      const hydrated: HolidayIndex = {};
      for (const country of wanted.countries) {
        for (const year of wanted.years) {
          const cacheKey = `eventclocks_holidays_${country}_${year}`;
          const cached = ssGetJSON<{ savedAt: number; data: HolidayItem[] }>(cacheKey);
          if (cached && typeof cached.savedAt === "number" && now - cached.savedAt < HOLIDAY_CACHE_TTL_MS) {
            if (!hydrated[country]) hydrated[country] = {};
            for (const h of cached.data || []) {
              if (h?.date && h?.name && !hydrated[country][h.date]) hydrated[country][h.date] = String(h.name);
            }
          }
        }
      }

      if (!cancelled && Object.keys(hydrated).length > 0) {
        setIndex((prev) => {
          const next: HolidayIndex = { ...prev };
          for (const c of Object.keys(hydrated)) {
            next[c] = { ...(next[c] || {}), ...(hydrated[c] || {}) };
          }
          return next;
        });
      }

      // 2) fetch missing or expired
      const tasks: Array<
        Promise<{ country: string; year: number; data: HolidayItem[]; ok: boolean; status?: number }>
      > = [];

      for (const country of wanted.countries) {
        for (const year of wanted.years) {
          const cacheKey = `eventclocks_holidays_${country}_${year}`;
          const cached = ssGetJSON<{ savedAt: number; data: HolidayItem[] }>(cacheKey);
          const isFresh = cached && typeof cached.savedAt === "number" && now - cached.savedAt < HOLIDAY_CACHE_TTL_MS;
          if (isFresh) continue;

          tasks.push(
            fetch(`/api/holidays?country=${encodeURIComponent(country)}&year=${encodeURIComponent(String(year))}`, {
              signal: controller.signal,
            }).then(async (r) => {
              if (!r.ok) return { country, year, data: [] as HolidayItem[], ok: false, status: r.status };
              const json = (await r.json()) as HolidayItem[];
              return { country, year, data: Array.isArray(json) ? json : [], ok: true };
            })
          );
        }
      }

      if (tasks.length === 0) {
        // everything was fresh from sessionStorage cache
        setCountryStatus((prev) => {
            const next = { ...prev };

            for (const c of wanted.countries) {
            // ✅ use hydrated content (what we just loaded) instead of stale React state
            const hasAny = Object.keys(hydrated?.[c] || {}).length > 0;

            next[c] = hasAny
                ? { state: "loaded", updatedAt: Date.now() }
                : { state: "empty", message: "No holidays returned for this country/year.", updatedAt: Date.now() };
            }

            return next;
        });

        return;
        }


      try {
        const results = await Promise.all(tasks);
        const hasAnyByCountry: Record<string, boolean> = {};
        const anyOkByCountry: Record<string, boolean> = {};
        const anyFailByCountry: Record<string, boolean> = {};

        for (const r of results) {
        anyOkByCountry[r.country] = anyOkByCountry[r.country] || r.ok;
        anyFailByCountry[r.country] = anyFailByCountry[r.country] || !r.ok;
        if (r.ok && Array.isArray(r.data) && r.data.length > 0) {
            hasAnyByCountry[r.country] = true;
        }
        }

        if (cancelled) return;

        // merge into index + persist raw lists
        setIndex((prev) => {
          const next: HolidayIndex = { ...prev };
          for (const res of results) {
            if (!next[res.country]) next[res.country] = {};
            for (const h of res.data) {
              if (h?.date && h?.name && !next[res.country][h.date]) next[res.country][h.date] = String(h.name);
            }
            ssSetJSON(`eventclocks_holidays_${res.country}_${res.year}`, { savedAt: Date.now(), data: res.data });
          }
          return next;
        });

        // update statuses
        setCountryStatus((prev) => {
        const next = { ...prev };
        for (const c of wanted.countries) {
            const failed = !!anyFailByCountry[c];
            const ok = !!anyOkByCountry[c];
            const hasAny = !!hasAnyByCountry[c];

            if (failed) {
            next[c] = {
                state: "error",
                message: "Could not load holidays (country may be unsupported).",
                updatedAt: Date.now(),
            };
            continue;
            }

            // If Nager/your API returned 200 but empty list(s), show EMPTY (not loaded)
            if (ok && !hasAny) {
            next[c] = {
                state: "empty",
                message: "No holidays returned for this country/year.",
                updatedAt: Date.now(),
            };
            continue;
            }

            next[c] = { state: "loaded", updatedAt: Date.now() };
        }
        return next;
        });

      } catch {
        if (cancelled) return;
        setCountryStatus((prev) => {
          const next = { ...prev };
          for (const c of wanted.countries) next[c] = { state: "error", message: "Network error.", updatedAt: Date.now() };
          return next;
        });
      }
    }

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [mounted, wanted.countries.join(","), wanted.years.join(","), baseDateLocal]);

  function getHolidayName(country: string, ymd: string): string {
    const c = (country || "").trim().toUpperCase();
    if (!c) return "";
    return index?.[c]?.[ymd] ?? "";
  }

  function getCountryStatus(country: string): HolidayCountryStatus {
    const c = (country || "").trim().toUpperCase();
    if (!c) return { state: "idle" };
    return countryStatus[c] || { state: "idle" };
  }

  return { getHolidayName, getCountryStatus };
}

function HolidayLoadPill({ status }: { status: HolidayCountryStatus }) {
  const base = "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold";

  if (status.state === "idle")
    return <span className={`${base} border-slate-200 bg-white text-slate-500`}>Not loaded</span>;

  if (status.state === "loading")
    return <span className={`${base} border-slate-200 bg-slate-50 text-slate-600`}>Loading…</span>;

  if (status.state === "empty")
    return (
      <span className={`${base} border-amber-200 bg-amber-50 text-amber-900`} title={status.message || "No data"}>
        No data
      </span>
    );

  if (status.state === "loaded")
    return <span className={`${base} border-emerald-200 bg-emerald-50 text-emerald-900`}>Loaded</span>;

  return (
    <span className={`${base} border-rose-200 bg-rose-50 text-rose-900`} title={status.message || "Error"}>
      Error
    </span>
  );
}


export default function MeetingOverlapClient() {
  const defaultTZ = "America/Los_Angeles";

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [timeZones, setTimeZones] = useState<string[]>([]);
  useEffect(() => {
    if (!mounted) return;
    setTimeZones(safeTimeZones());
  }, [mounted]);

  const tzInputRef = useRef<HTMLInputElement | null>(null);

  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    if (!mounted) return;
    setFavorites(loadFavorites());
  }, [mounted]);

  const [tzCountryMap, setTzCountryMap] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!mounted) return;
    setTzCountryMap(loadTzCountryMap());
  }, [mounted]);

  const [tzList, setTzList] = useState<TZEntry[]>([{ id: uid(), tz: defaultTZ }]);

  // Hydrate (or rehydrate) entries from stored tz->country mapping
  useEffect(() => {
    if (!mounted) return;
    setTzList((prev) =>
      prev.map((t) => {
        const tzKey = (t.tz || "").trim();
        const remembered = tzKey ? tzCountryMap[tzKey] : "";
        const current = (t.holidayCountry || "").trim();
        return { ...t, holidayCountry: current ? current : remembered || "" };
      })
    );
  }, [mounted, tzCountryMap]);

  const [newTZInput, setNewTZInput] = useState<string>("Europe/London");
  const [tzInputError, setTzInputError] = useState<string>("");

  const [baseDateLocal, setBaseDateLocal] = useState<string>("");
  useEffect(() => {
    if (!mounted) return;
    const now = new Date();
    setBaseDateLocal(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`);
  }, [mounted]);

  const [startMin, setStartMin] = useState<number>(8 * 60);
  const [endMin, setEndMin] = useState<number>(22 * 60);

  const [stepMinutes, setStepMinutes] = useState<StepMinutes>(30);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinutes>(60);

  const [businessHoursOnly, setBusinessHoursOnly] = useState<boolean>(false);
  const [weekdaysOnly, setWeekdaysOnly] = useState<boolean>(false);
  const [avoidHolidays, setAvoidHolidays] = useState<boolean>(false);

  const [sortMode, setSortMode] = useState<"utc" | "overlapFirst">("overlapFirst");

  useEffect(() => {
    if (startMin > endMin) setEndMin(startMin);
  }, [startMin, endMin]);

  // Holidays
  const { getHolidayName, getCountryStatus } = useHolidayIndex(mounted, tzList, baseDateLocal);

  const tzHolidayMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const t of tzList) m[(t.tz || "").trim()] = (t.holidayCountry || "").trim().toUpperCase();
    return m;
  }, [tzList]);

  const canAddTZ = useMemo(() => {
    const tz = newTZInput.trim();
    if (!tz) return false;
    if (tzList.some((t) => t.tz === tz)) return false;
    if (tzList.length >= 6) return false;
    return isValidIanaTz(tz);
  }, [newTZInput, tzList]);

  function addTZ(tzRaw?: string) {
    const tz = (tzRaw ?? newTZInput).trim();
    if (!tz) return;

    if (!isValidIanaTz(tz)) {
      setTzInputError("That doesn’t look like a valid IANA time zone (example: Asia/Manila).");
      return;
    }
    if (tzList.some((t) => t.tz === tz)) {
      setTzInputError("That time zone is already added.");
      return;
    }
    if (tzList.length >= 6) {
      setTzInputError("Max 6 time zones for now.");
      return;
    }

    setTzInputError("");

    const rememberedCountry = tzCountryMap[tz] ?? "";
    setTzList((prev) => [...prev, { id: uid(), tz, holidayCountry: rememberedCountry }]);

    requestAnimationFrame(() => {
      tzInputRef.current?.focus();
      tzInputRef.current?.select();
    });
  }

  function removeTZ(id: string) {
    setTzList((prev) => prev.filter((t) => t.id !== id));
  }

  // IMPORTANT: preserve holiday pairing when TZ changes + keep storage aligned
  function setTZ(id: string, tz: string) {
    const trimmed = tz.trim();
    if (!trimmed) return;
    if (!isValidIanaTz(trimmed)) return;

    setTzList((prev) => {
      const current = prev.find((x) => x.id === id);
      if (!current) return prev;
      if (prev.some((x) => x.id !== id && x.tz === trimmed)) return prev;
      if ((current.tz || "").trim() === trimmed) return prev;

      const oldTz = (current.tz || "").trim();
      const newTz = trimmed;
      const entryHoliday = (current.holidayCountry || "").trim().toUpperCase();
      const rememberedCountry = tzCountryMap[newTz] ?? "";

      if (entryHoliday) {
        setTzCountryMap((m) => {
          const next = { ...m };
          if (oldTz && next[oldTz]) delete next[oldTz];
          next[newTz] = entryHoliday;
          saveTzCountryMap(next);
          return next;
        });
      }

      return prev.map((t) =>
        t.id === id
          ? {
              ...t,
              tz: newTz,
              holidayCountry: entryHoliday ? entryHoliday : rememberedCountry,
            }
          : t
      );
    });
  }

  function setHolidayCountry(id: string, countryCode: string) {
    const code = (countryCode || "").trim().toUpperCase();

    setTzList((prev) => {
      const entry = prev.find((x) => x.id === id);
      if (!entry) return prev;

      const tzKey = (entry.tz || "").trim();

      setTzCountryMap((m) => {
        const next = { ...m };
        if (tzKey && code) next[tzKey] = code;
        else if (tzKey) delete next[tzKey];
        saveTzCountryMap(next);
        return next;
      });

      return prev.map((t) => (t.id === id ? { ...t, holidayCountry: code } : t));
    });
  }

  function toggleFavorite(tz: string) {
    const trimmed = tz.trim();
    if (!trimmed || !isValidIanaTz(trimmed)) return;

    setFavorites((prev) => {
      const exists = prev.includes(trimmed);
      const next = exists ? prev.filter((x) => x !== trimmed) : [...prev, trimmed].sort();
      saveFavorites(next);
      return next;
    });
  }

  function addFromFavorite(tz: string) {
    addTZ(tz);
  }

  const rows: Row[] = useMemo(() => {
    if (!baseDateLocal) return [];

    const [yy, mm, dd] = baseDateLocal.split("-").map((x) => parseInt(x, 10));
    if (!yy || !mm || !dd) return [];

    const startUtc = new Date(Date.UTC(yy, mm - 1, dd, 0, 0, 0));
    const endUtc = new Date(Date.UTC(yy, mm - 1, dd + 1, 0, 0, 0));

    const stepMs = stepMinutes * 60 * 1000;
    const meetingMs = meetingMinutes * 60 * 1000;

    const list = tzList.map((t) => (t.tz || "").trim());

    const utcFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const out: Row[] = [];

    for (let t = startUtc.getTime(); t < endUtc.getTime(); t += stepMs) {
      const utcDate = new Date(t);
      const utcEndDate = new Date(t + meetingMs);

      const locals: LocalCell[] = tzList.map((tzEntry) => {
        const tzName = (tzEntry.tz || "").trim();
        const cc = (tzEntry.holidayCountry || "").trim().toUpperCase();

        const { label, hour24, weekdayShort } = formatInTimeZone(utcDate, tzName);
        const lp = localDateTimeParts(utcDate, tzName);

        const holidayName = cc ? getHolidayName(cc, lp.ymd) : "";

        return {
          tz: tzName,
          localLabel: label,
          localHour: hour24,
          weekdayShort,
          isWeekend: isWeekendShort(weekdayShort),
          holidayCountry: cc,
          localYmd: lp.ymd,
          holidayName: holidayName || "",
        };
      });

      const weekendZones = locals.filter((x) => x.isWeekend).length;

      const isOverlap = list.every((tz) => {
        const start = localDateTimeParts(utcDate, tz);
        const end = localDateTimeParts(utcEndDate, tz);

        if (start.ymd !== end.ymd) return false;

        if (weekdaysOnly) {
          const wd = formatInTimeZone(utcDate, tz).weekdayShort;
          if (isWeekendShort(wd)) return false;
        }

        if (avoidHolidays) {
          const cc = tzHolidayMap[(tz || "").trim()] || "";
          if (cc) {
            const h = getHolidayName(cc, start.ymd);
            if (h) return false;
          }
        }

        if (businessHoursOnly) {
          const windowStart = 9 * 60;
          const windowEnd = 17 * 60;
          return start.minutes >= windowStart && end.minutes <= windowEnd;
        }

        const windowStart = startMin;
        const windowEnd = endMin;
        return start.minutes >= windowStart && end.minutes <= windowEnd;
      });

      out.push({
        utcISO: toUtcISO(utcDate),
        utcLabel: utcFmt.format(utcDate).replace(",", "") + " UTC",
        locals,
        isOverlap,
        weekendZones,
      });
    }

    if (sortMode === "utc") return out;

    const firstTZ = (tzList[0]?.tz || "").trim();

    return out.slice().sort((a, b) => {
      if (a.isOverlap !== b.isOverlap) return a.isOverlap ? -1 : 1;
      const aStart = localDateTimeParts(new Date(a.utcISO), firstTZ).minutes;
      const bStart = localDateTimeParts(new Date(b.utcISO), firstTZ).minutes;
      return aStart - bStart;
    });
  }, [
    baseDateLocal,
    tzList,
    tzHolidayMap,
    startMin,
    endMin,
    stepMinutes,
    meetingMinutes,
    businessHoursOnly,
    weekdaysOnly,
    avoidHolidays,
    sortMode,
    getHolidayName,
  ]);

  const overlapCount = useMemo(() => rows.filter((r) => r.isOverlap).length, [rows]);

  if (!mounted) {
    return (
      <PageShell title="Meeting Overlap" subtitle="Find times that work across multiple time zones.">
        <section className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="p-3">
            <div className="text-[11px] text-slate-600">Loading planner…</div>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell title="Meeting Overlap" subtitle="Find times that work across multiple time zones.">
      <div className="space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Time Zones */}
          <section className="lg:col-span-2 rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[13px] font-semibold text-slate-900">Time zones</h2>
                  <p className="mt-1 text-[11px] text-slate-600">
                    Add up to 6 time zones.
                    <InfoTip
                      id="tip-tz"
                      text="Use IANA format like Asia/Manila or America/New_York. Favorites are stored in this browser only."
                    />
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1 bg-white">
                  <span className="text-[11px] font-medium text-slate-600">Selected</span>
                  <span className="text-[11px] font-semibold text-slate-800">{tzList.length} / 6</span>
                </div>
              </div>

              <div className="mt-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <label className="sr-only">Add time zone</label>
                    <input
                      ref={tzInputRef}
                      value={newTZInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        setNewTZInput(v);
                        setTzInputError("");
                        if (timeZones.length > 0 && timeZones.includes(v)) {
                          requestAnimationFrame(() => tzInputRef.current?.select());
                        }
                      }}
                      onFocus={() => requestAnimationFrame(() => tzInputRef.current?.select())}
                      onClick={() => requestAnimationFrame(() => tzInputRef.current?.select())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addTZ();
                      }}
                      list="iana-timezones"
                      placeholder="Type a time zone (Asia/Manila)"
                      className={inputCls}
                    />

                    {timeZones.length > 0 && (
                      <datalist id="iana-timezones">
                        {timeZones.map((tz) => (
                          <option key={tz} value={tz} />
                        ))}
                      </datalist>
                    )}

                    {tzInputError ? (
                      <div className="mt-1 text-[11px] font-semibold text-rose-600">{tzInputError}</div>
                    ) : (
                      <div className="mt-1 text-[11px] text-slate-500">Example: America/Los_Angeles, Asia/Manila</div>
                    )}
                  </div>

                  <button onClick={() => addTZ()} disabled={!canAddTZ} className={btnPrimary}>
                    Add
                  </button>

                  <button
                    onClick={() => toggleFavorite(newTZInput.trim())}
                    disabled={!newTZInput.trim() || !isValidIanaTz(newTZInput.trim())}
                    className={btnNeutral}
                  >
                    ★ Favorite
                  </button>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-semibold text-slate-700 tracking-wide">Favorites</h3>
                    {favorites.length > 0 && (
                      <button
                        onClick={() => {
                          setFavorites([]);
                          saveFavorites([]);
                        }}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-700 transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {favorites.length === 0 ? (
                    <div className="mt-2 text-[11px] text-slate-500">No favorites yet.</div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {favorites.map((tz) => (
                        <div key={tz} className={pillFavorite}>
                          <button onClick={() => addFromFavorite(tz)} className="hover:text-slate-900">
                            + {tz}
                          </button>
                          <button
                            onClick={() => toggleFavorite(tz)}
                            className="font-bold text-slate-400 hover:text-slate-700"
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {tzList.map((t) => {
                  const isFav = favorites.includes(t.tz);
                  const cc = (t.holidayCountry || "").trim().toUpperCase();
                  const found = cc ? ISO_COUNTRIES.find((c) => c.code === cc) : null;
                  const countryLabel = found ? `${found.name} (${cc})` : "";

                  const status = cc ? getCountryStatus(cc) : { state: "idle" as const };

                  return (
                    <div key={t.id} className="rounded-md border border-slate-200 bg-white p-2 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex-1">
                          <input value={t.tz} onChange={(e) => setTZ(t.id, e.target.value)} list="iana-timezones" className={inputCls} />
                        </div>

                        <button onClick={() => toggleFavorite(t.tz)} className={btnNeutral}>
                          {isFav ? "★ Saved" : "☆ Save"}
                        </button>

                        <button onClick={() => removeTZ(t.id)} disabled={tzList.length <= 1} className={btnNeutral}>
                          Remove
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px]">
                        <CountryPicker
                          id={`country-${t.id}`}
                          value={cc}
                          onChange={(code) => setHolidayCountry(t.id, code)}
                        />

                        {cc ? <HolidayLoadPill status={status} /> : <span className="text-[10px] text-slate-500">No country selected</span>}

                        <span className="text-slate-500">
                          <InfoTip
                            id={`tip-holidays-${t.id}`}
                            text="Holiday data is fetched from /api/holidays (Nager.Date) and cached in this tab. If a country is unsupported, you may see Error."
                          />
                        </span>

                        {countryLabel && <span className="text-slate-500">Saved as {countryLabel}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Settings */}
          <section className="rounded-md border border-slate-200 bg-white shadow-sm">
            <div className="p-3">
              <h2 className="text-[13px] font-semibold text-slate-900">Time window</h2>
              <p className="mt-1 text-[11px] text-slate-600">
                Overlap requires the <span className="font-semibold">full meeting length</span> to fit in every person’s local window.
              </p>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[11px] font-semibold text-slate-700">
                    Scan date (UTC)
                    <InfoTip id="tip-date" text="We scan the full UTC day for this date. Local dates may differ by time zone." />
                  </label>
                  <input type="date" value={baseDateLocal} onChange={(e) => setBaseDateLocal(e.target.value)} className={inputCls} />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700">
                    Start (local)
                    <InfoTip id="tip-start" text="Window start in each person’s own local time." />
                  </label>
                  <input
                    type="time"
                    step={15 * 60}
                    value={minutesToHHMM(startMin)}
                    onChange={(e) => setStartMin(hhmmToMinutes(e.target.value))}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700">
                    End (local)
                    <InfoTip id="tip-end" text="Window end in each person’s own local time." />
                  </label>
                  <input
                    type="time"
                    step={15 * 60}
                    value={minutesToHHMM(endMin)}
                    onChange={(e) => setEndMin(hhmmToMinutes(e.target.value))}
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700">
                    Start-time step
                    <InfoTip id="tip-step" text="How often we try a new start time (example: every 30 minutes)." />
                  </label>
                  <select value={stepMinutes} onChange={(e) => setStepMinutes(parseInt(e.target.value, 10) as StepMinutes)} className={selectCls}>
                    <option value={60}>60 min</option>
                    <option value={30}>30 min</option>
                    <option value={15}>15 min</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-700">
                    Meeting length
                    <InfoTip id="tip-length" text="Overlap is true only if the entire meeting interval fits in all time zones." />
                  </label>
                  <select
                    value={meetingMinutes}
                    onChange={(e) => setMeetingMinutes(parseInt(e.target.value, 10) as MeetingMinutes)}
                    className={selectCls}
                  >
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </div>

                <div className="col-span-2 flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={businessHoursOnly}
                    onChange={(e) => setBusinessHoursOnly(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-sm border-slate-300"
                    id="businessHours"
                  />
                  <label htmlFor="businessHours" className="text-[11px] font-semibold text-slate-700 cursor-pointer leading-5">
                    Business hours (9AM–5PM local)
                    <InfoTip id="tip-biz" text="If enabled, your start/end window is ignored and replaced with 9AM–5PM for each person." />
                  </label>
                </div>

                <div className="col-span-2 flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={weekdaysOnly}
                    onChange={(e) => setWeekdaysOnly(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-sm border-slate-300"
                    id="weekdaysOnly"
                  />
                  <label htmlFor="weekdaysOnly" className="text-[11px] font-semibold text-slate-700 cursor-pointer leading-5">
                    Weekdays only (Mon–Fri local)
                    <InfoTip id="tip-weekdays" text="If enabled, overlap is valid only if the local day is Mon–Fri in every selected time zone." />
                  </label>
                </div>

                <div className="col-span-2 flex items-start gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={avoidHolidays}
                    onChange={(e) => setAvoidHolidays(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-sm border-slate-300"
                    id="avoidHolidays"
                  />
                  <label htmlFor="avoidHolidays" className="text-[11px] font-semibold text-slate-700 cursor-pointer leading-5">
                    Avoid holidays (local)
                    <InfoTip
                      id="tip-avoid-holidays"
                      text="If enabled, a slot is NOT considered overlap if it falls on a holiday in any selected time zone (based on its chosen holiday country)."
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Results */}
        <section className="rounded-md border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-200">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-2">
              <div>
                <h2 className="text-[13px] font-semibold text-slate-900">Results</h2>
                <p className="mt-1 text-[11px] text-slate-600">
                  Highlight means the <span className="font-semibold">full meeting</span> fits inside everyone’s local window.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="text-[11px] font-semibold text-slate-700">
                  Sort
                  <InfoTip id="tip-sort" text="Overlap-first groups valid times at the top. UTC order shows the full day chronologically." />
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setSortMode("overlapFirst")} className={sortMode === "overlapFirst" ? btnSuccessActive : btnSuccessIdle}>
                    Overlap first
                  </button>
                  <button onClick={() => setSortMode("utc")} className={sortMode === "utc" ? btnSuccessActive : btnSuccessIdle}>
                    UTC order
                  </button>
                </div>

                <div className="sm:ml-1 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700">
                  Overlap slots: <span className="text-slate-900">{overlapCount}</span>
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className={pillOverlapLegend}>
                <span className="h-2 w-2 rounded-full bg-green-800" />
                Overlap
              </span>
              <span className={pillNeutral}>
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                Not a fit
              </span>
              <span className={pillNeutral}>
                <span className="h-2 w-2 rounded-full bg-slate-400" />
                Weekend (local)
              </span>
              <span className={pillNeutral}>
                <span className="h-2 w-2 rounded-full bg-amber-600" />
                Holiday
              </span>
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[900px] w-full text-[11px]">
              <thead className="sticky top-0 bg-white border-b border-slate-200">
                <tr className="text-left">
                  {tzList.map((t) => (
                    <th key={t.id} className="px-2.5 py-2 font-semibold text-slate-700">
                      {t.tz}
                    </th>
                  ))}
                  <th className="px-2.5 py-2 font-semibold text-slate-700 w-[170px]">Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={tzList.length + 1} className="px-3 py-10 text-center text-slate-500">
                      Choose a date and time zones to generate results.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const zebra = idx % 2 === 0 ? "bg-white" : "bg-slate-50";
                    const ok = r.isOverlap;

                    return (
                      <tr
                        key={r.utcISO}
                        className={[
                          "border-b border-slate-100",
                          ok ? "bg-green-100/25" : zebra,
                          ok ? "shadow-[inset_5px_0_0_0_rgba(20,83,45,0.95)]" : "",
                          ok ? "text-slate-900" : "text-slate-600",
                        ].join(" ")}
                      >
                        {tzList.map((t) => {
                          const tzName = (t.tz || "").trim();
                          const local = r.locals.find((x) => x.tz === tzName);
                          const showWeekend = !!local?.isWeekend;
                          const showHoliday = !!local?.holidayName;

                          return (
                            <td key={t.id} className={["px-2.5 py-2 whitespace-nowrap", ok ? "font-semibold" : ""].join(" ")}>
                              <span>{local?.localLabel ?? "—"}</span>
                              {showWeekend && <span className={weekendBadge}>{local?.weekdayShort}</span>}
                              {showHoliday && <span className={holidayBadge}>{local?.holidayName}</span>}
                            </td>
                          );
                        })}

                        <td className="px-2.5 py-2">
                          <div className="flex items-center gap-2">
                            <span
                              className={[
                                "inline-flex items-center rounded-full px-2 py-1 text-[10px] font-bold border",
                                ok ? "bg-green-100 text-green-900 border-slate-200" : "bg-white text-slate-500 border-slate-200",
                              ].join(" ")}
                            >
                              {ok ? "OVERLAP" : "—"}
                            </span>

                            {r.weekendZones > 0 && <span className="text-[10px] font-semibold text-slate-600">Weekend zones: {r.weekendZones}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
