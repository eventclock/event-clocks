"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "@/components/PageShell";

// ---- Types ----
type StepMinutes = 15 | 30 | 60;
type MeetingMinutes = 30 | 45 | 60 | 90 | 120;

type TZEntry = {
  id: string;
  tz: string;
};

type Row = {
  utcISO: string;
  utcLabel: string;
  locals: { tz: string; localLabel: string; localHour: number }[];
  isOverlap: boolean;
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
 * Friendly label + 24h hour for display.
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
  return { label, hour24 };
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

  return { ymd, minutes, hour, minute };
}

// ---- localStorage helpers ----
const LS_FAVORITES_KEY = "eventclocks_meetingOverlap_favoriteTimeZones_v1";

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

function minutesToHHMM(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function hhmmToMinutes(v: string) {
  const [hh, mm] = v.split(":").map((x) => parseInt(x, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return 0;
  return clampInt(hh * 60 + mm, 0, 23 * 60 + 45); // up to 23:45
}


// ---- Component ----
export default function MeetingOverlapClient() {
  const defaultTZ = "America/Los_Angeles";

  // ✅ Mounted gate to eliminate hydration warnings completely
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Load timeZones only on client
  const [timeZones, setTimeZones] = useState<string[]>([]);
  useEffect(() => {
    if (!mounted) return;
    setTimeZones(safeTimeZones());
  }, [mounted]);

  const tzInputRef = useRef<HTMLInputElement | null>(null);

  const [tzList, setTzList] = useState<TZEntry[]>([{ id: uid(), tz: defaultTZ }]);
  const [newTZInput, setNewTZInput] = useState<string>("Europe/London");
  const [tzInputError, setTzInputError] = useState<string>("");

  const [favorites, setFavorites] = useState<string[]>([]);
  useEffect(() => {
    if (!mounted) return;
    setFavorites(loadFavorites());
  }, [mounted]);

  const [baseDateLocal, setBaseDateLocal] = useState<string>("");
  useEffect(() => {
    if (!mounted) return;
    const now = new Date();
    setBaseDateLocal(`${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`);
  }, [mounted]);

  const [startMin, setStartMin] = useState<number>(8 * 60);   // 08:00
  const [endMin, setEndMin] = useState<number>(22 * 60);      // 22:00


  const [stepMinutes, setStepMinutes] = useState<StepMinutes>(30);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinutes>(60);

  const [businessHoursOnly, setBusinessHoursOnly] = useState<boolean>(false);
  const [sortMode, setSortMode] = useState<"utc" | "overlapFirst">("overlapFirst");

  useEffect(() => {
  if (startMin > endMin) setEndMin(startMin);
    }, [startMin, endMin]);


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
    setTzList((prev) => [...prev, { id: uid(), tz }]);

    requestAnimationFrame(() => {
      tzInputRef.current?.focus();
      tzInputRef.current?.select();
    });
  }

  function removeTZ(id: string) {
    setTzList((prev) => prev.filter((t) => t.id !== id));
  }

  function setTZ(id: string, tz: string) {
    const trimmed = tz.trim();
    if (!trimmed) return;
    if (!isValidIanaTz(trimmed)) return;

    setTzList((prev) => {
      if (prev.some((x) => x.id !== id && x.tz === trimmed)) return prev;
      return prev.map((t) => (t.id === id ? { ...t, tz: trimmed } : t));
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

    const list = tzList.map((t) => t.tz);

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

      const locals = list.map((tz) => {
        const { label, hour24 } = formatInTimeZone(utcDate, tz);
        return { tz, localLabel: label, localHour: hour24 };
      });

      const isOverlap = list.every((tz) => {
        const start = localDateTimeParts(utcDate, tz);
        const end = localDateTimeParts(utcEndDate, tz);

        if (start.ymd !== end.ymd) return false;

        if (businessHoursOnly) {
          const windowStart = 9 * 60;
          const windowEnd = 17 * 60;
          return start.minutes >= windowStart && end.minutes <= windowEnd;
        }

        const windowStart = startMin;
        const windowEnd = endMin;
        return start.minutes >= windowStart && end.minutes <= windowEnd;

      });

      const utcLabel = utcFmt.format(utcDate).replace(",", "") + " UTC";

      out.push({
        utcISO: toUtcISO(utcDate),
        utcLabel,
        locals,
        isOverlap,
      });
    }

    if (sortMode === "utc") return out;

    const firstTZ = tzList[0]?.tz;

    return out.slice().sort((a, b) => {
        if (a.isOverlap !== b.isOverlap) return a.isOverlap ? -1 : 1;

        const aStart = localDateTimeParts(new Date(a.utcISO), firstTZ).minutes;
        const bStart = localDateTimeParts(new Date(b.utcISO), firstTZ).minutes;

        return aStart - bStart;
    });
  }, [
    baseDateLocal,
    tzList,
    startMin,
    endMin,
    stepMinutes,
    meetingMinutes,
    businessHoursOnly,
    sortMode,
  ]);

  const overlapCount = useMemo(() => rows.filter((r) => r.isOverlap).length, [rows]);

  // ✅ Render a stable placeholder during SSR+hydration
  if (!mounted) {
    return (
      <PageShell title="Meeting Overlap" subtitle="Find times that work across multiple time zones.">
        <section className="rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="p-5">
            <div className="text-sm text-black/60">Loading planner…</div>
          </div>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell title="Meeting Overlap" subtitle="Find times that work across multiple time zones.">
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <section className="lg:col-span-2 rounded-2xl border border-black/10 bg-white shadow-sm">
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-black/90">Time zones</h2>
                  <p className="text-sm text-black/60">
                    Type a time zone (e.g., <span className="font-semibold">Asia/Manila</span>) then add it. Save favorites for one-click reuse.
                  </p>
                </div>

                <div className="hidden sm:flex items-center gap-2 rounded-full border border-black/10 px-3 py-1.5 bg-black/[0.02]">
                  <span className="text-xs font-medium text-black/60">Selected</span>
                  <span className="text-xs font-semibold text-black/80">{tzList.length}</span>
                </div>
              </div>

              <div className="mt-4">
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
                      placeholder="Type a time zone, e.g. Asia/Manila"
                      className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm
                                 focus:outline-none focus:ring-2 focus:ring-black/10"
                    />

                    {timeZones.length > 0 && (
                      <datalist id="iana-timezones">
                        {timeZones.map((tz) => (
                          <option key={tz} value={tz} />
                        ))}
                      </datalist>
                    )}

                    {tzInputError ? (
                      <div className="mt-1 text-xs font-semibold text-rose-600">{tzInputError}</div>
                    ) : (
                      <div className="mt-1 text-xs text-black/50">Tip: Start typing “America/” or “Asia/”.</div>
                    )}
                  </div>

                  <button
                    onClick={() => addTZ()}
                    disabled={!canAddTZ}
                    className="rounded-xl px-4 py-2 text-sm font-semibold shadow-sm border border-black/10
                               bg-black text-white disabled:bg-black/20 disabled:text-white/70 disabled:cursor-not-allowed
                               hover:bg-black/90 transition"
                  >
                    + Add
                  </button>

                  <button
                    onClick={() => toggleFavorite(newTZInput.trim())}
                    disabled={!newTZInput.trim() || !isValidIanaTz(newTZInput.trim())}
                    className="rounded-xl px-4 py-2 text-sm font-semibold shadow-sm border border-black/10 bg-white
                               disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/[0.03] transition"
                    title="Save/unsave this as a favorite"
                  >
                    ★ Favorite
                  </button>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-black/60">Favorites (saved in this browser)</div>
                    {favorites.length > 0 && (
                      <button
                        onClick={() => {
                          setFavorites([]);
                          saveFavorites([]);
                        }}
                        className="text-xs font-semibold text-black/60 hover:text-black/80 transition"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {favorites.length === 0 ? (
                    <div className="mt-2 text-sm text-black/50">No favorites yet. Add a time zone above, then click ★ Favorite.</div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {favorites.map((tz) => (
                        <div
                          key={tz}
                          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-black/[0.02] px-3 py-1.5"
                        >
                          <button
                            onClick={() => addFromFavorite(tz)}
                            className="text-xs font-semibold text-black/80 hover:text-black transition"
                            title="Add this time zone"
                          >
                            + {tz}
                          </button>
                          <button
                            onClick={() => toggleFavorite(tz)}
                            className="text-xs font-bold text-black/40 hover:text-black/70 transition"
                            title="Remove from favorites"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 space-y-2">
                {tzList.map((t) => {
                  const isFav = favorites.includes(t.tz);
                  return (
                    <div
                      key={t.id}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-black/10 bg-black/[0.02] p-3"
                    >
                      <div className="flex-1">
                        <input
                          value={t.tz}
                          onChange={(e) => setTZ(t.id, e.target.value)}
                          list="iana-timezones"
                          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm shadow-sm
                                     focus:outline-none focus:ring-2 focus:ring-black/10"
                        />
                      </div>

                      <button
                        onClick={() => toggleFavorite(t.tz)}
                        className="rounded-lg px-3 py-2 text-sm font-semibold border border-black/10 bg-white shadow-sm
                                   hover:bg-black/[0.03] transition"
                        title={isFav ? "Remove from favorites" : "Save to favorites"}
                      >
                        {isFav ? "★ Saved" : "☆ Save"}
                      </button>

                      <button
                        onClick={() => removeTZ(t.id)}
                        disabled={tzList.length <= 1}
                        className="rounded-lg px-3 py-2 text-sm font-semibold border border-black/10 bg-white shadow-sm
                                   disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black/[0.03] transition"
                        title={tzList.length <= 1 ? "Keep at least one time zone" : "Remove"}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-black/10 bg-white shadow-sm">
            <div className="p-5">
              <h2 className="text-lg font-semibold text-black/90">Settings</h2>
              <p className="text-sm text-black/60">
                Step controls how often we try a start time. Meeting length controls the interval we validate.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-black/70">Date</label>
                  <input
                    type="date"
                    value={baseDateLocal}
                    onChange={(e) => setBaseDateLocal(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-black/10"
                  />
                  <p className="mt-1 text-xs text-black/50">We scan the full UTC day of this date.</p>
                </div>

                <div>
                    <label className="text-xs font-semibold text-black/70">Start time</label>
                    <input
                        type="time"
                        step={15 * 60} // 15 minutes
                        value={minutesToHHMM(startMin)}
                        onChange={(e) => setStartMin(hhmmToMinutes(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm
                                focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                    </div>

                    <div>
                    <label className="text-xs font-semibold text-black/70">End time</label>
                    <input
                        type="time"
                        step={15 * 60} // 15 minutes
                        value={minutesToHHMM(endMin)}
                        onChange={(e) => setEndMin(hhmmToMinutes(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm
                                focus:outline-none focus:ring-2 focus:ring-black/10"
                    />
                    </div>


                <div>
                  <label className="text-xs font-semibold text-black/70">Start-time step</label>
                  <select
                    value={stepMinutes}
                    onChange={(e) => setStepMinutes(parseInt(e.target.value, 10) as StepMinutes)}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    <option value={60}>60 min</option>
                    <option value={30}>30 min</option>
                    <option value={15}>15 min</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-black/70">Meeting length</label>
                  <select
                    value={meetingMinutes}
                    onChange={(e) => setMeetingMinutes(parseInt(e.target.value, 10) as MeetingMinutes)}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm shadow-sm
                               focus:outline-none focus:ring-2 focus:ring-black/10"
                  >
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                    <option value={120}>120 min</option>
                  </select>
                </div>

                <div className="col-span-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={businessHoursOnly}
                    onChange={(e) => setBusinessHoursOnly(e.target.checked)}
                    className="h-4 w-4 rounded border-black/20"
                    id="businessHours"
                  />
                  <label htmlFor="businessHours" className="text-sm font-semibold text-black/70 cursor-pointer">
                    Business hours (9AM–5PM local)
                  </label>
                </div>

                <div className="col-span-2 rounded-xl border border-black/10 bg-black/[0.02] p-3">
                  <div className="text-xs font-semibold text-black/70">Ordering</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setSortMode("overlapFirst")}
                      className={[
                        "flex-1 rounded-lg px-3 py-2 text-sm font-semibold border shadow-sm transition",
                        sortMode === "overlapFirst"
                          ? "bg-black text-white border-black"
                          : "bg-white border-black/10 hover:bg-black/[0.03]",
                      ].join(" ")}
                    >
                      Overlap first
                    </button>
                    <button
                      onClick={() => setSortMode("utc")}
                      className={[
                        "flex-1 rounded-lg px-3 py-2 text-sm font-semibold border shadow-sm transition",
                        sortMode === "utc"
                          ? "bg-black text-white border-black"
                          : "bg-white border-black/10 hover:bg-black/[0.03]",
                      ].join(" ")}
                    >
                      UTC order
                    </button>
                  </div>
                </div>

                <div className="col-span-2">
                  <div className="rounded-xl border border-black/10 bg-white p-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-black/70">Overlap slots</span>
                      <span className="text-sm font-bold text-black/90">{overlapCount}</span>
                    </div>
                    <div className="mt-1 text-xs text-black/50">
                      Overlap rows are visually emphasized. Non-overlap rows are muted for scanning.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="rounded-2xl border border-black/10 bg-white shadow-sm overflow-hidden">
          <div className="p-5 border-b border-black/10">
            <h2 className="text-lg font-semibold text-black/90">Results</h2>
            <p className="text-sm text-black/60">Strong highlight indicates a valid overlap for the full meeting length.</p>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[900px] w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-black/10">
                <tr className="text-left">
                  {tzList.map((t) => (
                    <th key={t.id} className="px-4 py-3 font-semibold text-black/70">
                      {t.tz}
                    </th>
                  ))}
                  <th className="px-4 py-3 font-semibold text-black/70 w-[120px]">Status</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={tzList.length + 1} className="px-4 py-10 text-center text-black/50">
                      Choose a date and time zones to generate results.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => {
                    const zebra = idx % 2 === 0 ? "bg-black/[0.02]" : "bg-white";
                    const ok = r.isOverlap;

                    return (
                      <tr
                        key={r.utcISO}
                        className={[
                          "border-b border-black/5",
                          ok ? "bg-emerald-100/70" : zebra,
                          ok ? "shadow-[inset_4px_0_0_0_rgba(16,185,129,0.95)]" : "",
                          !ok ? "text-black/60" : "text-black/90",
                        ].join(" ")}
                      >
                        

                        {tzList.map((t) => {
                          const local = r.locals.find((x) => x.tz === t.tz);
                          return (
                            <td key={t.id} className={["px-4 py-3 whitespace-nowrap", ok ? "font-semibold" : ""].join(" ")}>
                              {local?.localLabel ?? "—"}
                            </td>
                          );
                        })}

                        <td className="px-4 py-3">
                          <span
                            className={[
                              "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold border",
                              ok
                                ? "bg-emerald-200 text-emerald-950 border-emerald-300"
                                : "bg-black/[0.03] text-black/60 border-black/10",
                            ].join(" ")}
                          >
                            {ok ? "OVERLAP" : "—"}
                          </span>
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
