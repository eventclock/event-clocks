// src/app/timezone/TimezoneClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatInTimeZone,
  getLocalTimeZone,
  getUtcOffsetLabelAtUtc,
  zonedDateTimeLocalToUtc,
} from "@/lib/tz";
import TimezoneDatalist from "@/components/TimezoneDatalist";

const FALLBACK_TZS = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "Asia/Manila",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Hong_Kong",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney",
];

const DEFAULT_FAVORITES = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Asia/Manila",
  "Europe/London",
  "Asia/Tokyo",
];

const STORAGE_KEY = "tztool:v5";

const semantic = {
  input: "rgba(147,197,253,0.6)", // blue – user input
  compare: "rgba(196,181,253,0.6)", // purple – comparisons
  result: "rgba(167,243,208,0.6)", // green – output
  accent: "rgba(253,224,71,0.55)", // yellow – highlight
};

function toLocalDatetimeInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function getTimeZoneChoices(): string[] {
  const anyIntl = Intl as any;
  const supported = anyIntl?.supportedValuesOf?.("timeZone");
  if (Array.isArray(supported) && supported.length > 0) return supported;
  return FALLBACK_TZS;
}

function isValidIanaTz(tz: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

/**
 * Offset (ms) such that: localTimeInTZ = utcTime + offset
 * DST-aware because it's computed at the given UTC instant.
 */
function getOffsetMsAtUtc(timeZone: string, dateUtc: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(dateUtc);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);

  const y = get("year");
  const m = get("month");
  const d = get("day");
  const hh = get("hour");
  const mm = get("minute");
  const ss = get("second");

  const asUtcMs = Date.UTC(y, m - 1, d, hh, mm, ss);
  return asUtcMs - dateUtc.getTime();
}

function formatLocalDiffLabel(fromOffsetMs: number, targetOffsetMs: number): string {
  const diffMs = targetOffsetMs - fromOffsetMs;
  if (diffMs === 0) return "(±0h)";

  const sign = diffMs > 0 ? "+" : "−";
  const absMinutes = Math.round(Math.abs(diffMs) / 60000);

  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;

  if (minutes === 0) return `(${sign}${hours}h)`;
  return `(${sign}${hours}:${String(minutes).padStart(2, "0")}h)`;
}

type SavedState = {
  fromTz: string;
  targets: string[];
  favorites: string[];
};

function safeParse(json: string | null): SavedState | null {
  if (!json) return null;
  try {
    const obj = JSON.parse(json);
    if (!obj || typeof obj !== "object") return null;

    const fromTz = typeof obj.fromTz === "string" ? obj.fromTz : null;
    const targets = Array.isArray(obj.targets)
      ? obj.targets.filter((x: any) => typeof x === "string")
      : null;
    const favorites = Array.isArray(obj.favorites)
      ? obj.favorites.filter((x: any) => typeof x === "string")
      : null;

    if (!fromTz || !targets || !favorites) return null;
    return { fromTz, targets, favorites };
  } catch {
    return null;
  }
}

type SortKey = "tz" | "local" | "offset";
type SortDir = "asc" | "desc";

type Row = {
  tz: string;
  time: string;
  offset: string;
  diffLabel: string;
  targetOffsetMs: number;
  localMs: number;
};

function SortIndicator({
  active,
  dir,
}: {
  active: boolean;
  dir: SortDir;
}) {
  // Always reserve space so headers never change width.
  const symbol = active ? (dir === "asc" ? "▲" : "▼") : "↕";
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 14,
        textAlign: "center",
        opacity: active ? 0.9 : 0.35,
        marginLeft: 6,
        fontSize: 12,
      }}
      title="Sortable"
    >
      {symbol}
    </span>
  );
}

export default function TimezoneClient() {
  // Kept for compatibility / future use; also makes your Intl fallback available.
  useMemo(() => getTimeZoneChoices(), []);
  const helpRef = useRef<HTMLDetailsElement | null>(null);

  const [fromTz, setFromTz] = useState(getLocalTimeZone());
  const [dtLocal, setDtLocal] = useState(""); // datetime-local

  const [targets, setTargets] = useState<string[]>(["Asia/Manila"]);
  const [newTarget, setNewTarget] = useState("");

  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES);

  const [copied, setCopied] = useState(false);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("offset");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Track whether dt was explicitly provided in the URL (share links)
  const hasDtFromUrlRef = useRef(false);

  // Load localStorage
  useEffect(() => {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY));
    if (saved) {
      if (isValidIanaTz(saved.fromTz)) setFromTz(saved.fromTz);

      const validTargets = saved.targets.filter(isValidIanaTz);
      if (validTargets.length > 0) setTargets(Array.from(new Set(validTargets)));

      const validFavs = saved.favorites.filter(isValidIanaTz);
      if (validFavs.length > 0) setFavorites(Array.from(new Set(validFavs)));
    }
  }, []);

  // Share-link support: ?from=...&dt=...&to=tz1,tz2,tz3
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const from = p.get("from");
    const dt = p.get("dt");
    const to = p.get("to");

    if (from && isValidIanaTz(from)) setFromTz(from);

    if (dt) {
      hasDtFromUrlRef.current = true;
      setDtLocal(dt);
    }

    if (to) {
      const list = to
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter(isValidIanaTz);
      if (list.length > 0) setTargets(Array.from(new Set(list)));
    }
  }, []);

  // Default datetime to "now" when entering the page (but do NOT override share-link dt)
  useEffect(() => {
    if (!dtLocal && !hasDtFromUrlRef.current) {
      setDtLocal(toLocalDatetimeInputValue(new Date()));
    }
  }, [dtLocal]);

  // Persist state
  useEffect(() => {
    const payload: SavedState = { fromTz, targets, favorites };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [fromTz, targets, favorites]);

  const utcDate = useMemo(() => {
    if (!dtLocal || !isValidIanaTz(fromTz)) return null;
    return zonedDateTimeLocalToUtc(dtLocal, fromTz);
  }, [dtLocal, fromTz]);

  const fromOffsetMs = useMemo(() => {
    if (!utcDate || !isValidIanaTz(fromTz)) return null;
    return getOffsetMsAtUtc(fromTz, utcDate);
  }, [utcDate, fromTz]);

  const fromRow = useMemo(() => {
    if (!utcDate) return null;
    return {
      tz: fromTz,
      time: formatInTimeZone(utcDate, fromTz),
      offset: getUtcOffsetLabelAtUtc(fromTz, utcDate),
    };
  }, [utcDate, fromTz]);

  const rows: Row[] = useMemo(() => {
    if (!utcDate || fromOffsetMs == null) return [];

    const uniqueTargets = Array.from(new Set(targets))
      .filter(isValidIanaTz)
      .filter((tz) => tz !== fromTz);

    return uniqueTargets.map((tz) => {
      const targetOffsetMs = getOffsetMsAtUtc(tz, utcDate);
      const localMs = utcDate.getTime() + targetOffsetMs;

      return {
        tz,
        time: formatInTimeZone(utcDate, tz),
        offset: getUtcOffsetLabelAtUtc(tz, utcDate),
        diffLabel: formatLocalDiffLabel(fromOffsetMs, targetOffsetMs),
        targetOffsetMs,
        localMs,
      };
    });
  }, [targets, utcDate, fromOffsetMs, fromTz]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    const cmp = (a: Row, b: Row) => {
      if (sortKey === "tz") return dir * a.tz.localeCompare(b.tz, "en");
      if (sortKey === "offset") return dir * (a.targetOffsetMs - b.targetOffsetMs);
      return dir * (a.localMs - b.localMs); // local
    };

    return [...rows].sort(cmp);
  }, [rows, sortKey, sortDir]);

  const onSort = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const addTarget = (tzOverride?: string) => {
    const tz = (tzOverride ?? newTarget).trim();
    if (!tz) return;
    if (!isValidIanaTz(tz)) return;

    setTargets((prev) => (prev.includes(tz) ? prev : [...prev, tz]));
    if (!tzOverride) setNewTarget("");
  };

  const removeTarget = (tz: string) => {
    setTargets((prev) => prev.filter((x) => x !== tz));
  };

  const addToFavorites = (tz: string) => {
    const v = tz.trim();
    if (!v || !isValidIanaTz(v)) return;
    setFavorites((prev) => (prev.includes(v) ? prev : [...prev, v]));
  };

  const removeFromFavorites = (tz: string) => {
    setFavorites((prev) => prev.filter((x) => x !== tz));
  };

  const toggleFavorite = (tz: string) => {
    const v = tz.trim();
    if (!v || !isValidIanaTz(v)) return;
    setFavorites((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  };

  const swapPrimary = () => {
    if (targets.length === 0) return;
    const first = targets[0];
    setTargets([fromTz, ...targets.slice(1)]);
    setFromTz(first);
  };

  const share = async () => {
    const u = new URL(window.location.href);
    u.searchParams.set("from", fromTz);
    if (dtLocal) u.searchParams.set("dt", dtLocal);
    if (targets.length > 0) u.searchParams.set("to", targets.join(","));
    await navigator.clipboard.writeText(u.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const canCompute = dtLocal.length > 0 && isValidIanaTz(fromTz);

  // Styles
  const inputCardStyle: React.CSSProperties = {
    border: `1.5px solid ${semantic.input}`,
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 6px 18px rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.02)",
  };

  const compareCardStyle: React.CSSProperties = {
    border: `1.5px solid ${semantic.compare}`,
    borderRadius: 12,
    padding: 14,
    boxShadow: "0 6px 18px rgba(0,0,0,0.10)",
    background: "rgba(255,255,255,0.02)",
  };

  const resultCardStyle: React.CSSProperties = {
    border: `2px solid ${semantic.result}`,
    borderRadius: 12,
    padding: 16,
    background: "rgba(255,255,255,0.03)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.10)",
  };

  const subCard: React.CSSProperties = {
    border: "1px solid rgba(196,181,253,0.45)",
    background: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    padding: 12,
  };

  const inputStyle: React.CSSProperties = {
    padding: 10,
    borderRadius: 8,
    border: "1px solid rgba(196,181,253,0.45)",
    background: "rgba(255,255,255,0.04)",
    width: "100%",
    outline: "none",
    WebkitAppearance: "none",
    appearance: "none",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    border: "1px solid rgba(196,181,253,0.55)",
    background: "rgba(255,255,255,0.06)",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontWeight: 700,
  };

  const buttonPrimaryStyle: React.CSSProperties = {
    ...buttonStyle,
    borderColor: "rgba(167,243,208,0.75)",
    background: "rgba(167,243,208,0.14)",
  };

  const chipBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: 12,
    lineHeight: 1,
  };

  const favoriteChip: React.CSSProperties = {
    ...chipBase,
    cursor: "pointer",
    border: "1px solid rgba(196,181,253,0.35)",
    background: "rgba(196,181,253,0.10)",
    fontWeight: 700,
  };

  const compareChip: React.CSSProperties = {
    ...chipBase,
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.04)",
  };

  const thClickable: React.CSSProperties = {
    padding: "10px 8px",
    borderBottom: "1px solid rgba(255,255,255,0.14)",
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  const rowSep = "1px solid rgba(255,255,255,0.12)";

  const stripeA = "rgba(255,255,255,0.028)";
  const stripeB = "rgba(255,255,255,0.00)";
  const hoverBg = "rgba(255,255,255,0.055)";

  // Help/SEO section styles (subtle, professional)
  const helpWrap: React.CSSProperties = {
    marginTop: 18,
    border: "1px solid rgba(0,0,0,0.08)",
    borderRadius: 12,
    padding: 14,
    background: "rgba(255,255,255,0.02)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
  };

  const helpSummary: React.CSSProperties = {
    cursor: "pointer",
    listStyle: "none",
    fontWeight: 800,
    fontSize: 13,
    opacity: 0.9,
    display: "flex",
    alignItems: "center",
    gap: 10,
  };

  const helpIcon: React.CSSProperties = {
    width: 22,
    height: 22,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(0,0,0,0.12)",
    fontSize: 12,
    fontWeight: 900,
    opacity: 0.85,
    flex: "0 0 auto",
  };

  const helpBody: React.CSSProperties = {
    marginTop: 12,
    display: "grid",
    gap: 14,
    fontSize: 13,
    lineHeight: 1.55,
    opacity: 0.82,
  };

  const helpH3: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 900,
    opacity: 0.95,
    marginBottom: 6,
  };

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>Timezone Converter
        <button
            type="button"
            onClick={() => {
                const el = helpRef.current;
                if (!el) return;
                el.open = true;
                el.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
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
            aria-label="Info about this tool"
            title="About this tool"
            >
            i
            </button></h1>
        </div>
      <div style={{ opacity: 0.75, marginBottom: 16 }}>
        Convert a date/time from one timezone and compare it across many timezones (DST-aware).
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        {/* INPUT */}
        <section style={inputCardStyle}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, opacity: 0.75 }}>
                Date & time (interpreted in “From” timezone)
              </label>
              <input
                type="datetime-local"
                value={dtLocal}
                onChange={(e) => setDtLocal(e.target.value)}
                style={inputStyle}
              />
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <label style={{ fontSize: 12, opacity: 0.75 }}>From timezone</label>
              <input
                list="tz-list"
                value={fromTz}
                onChange={(e) => setFromTz(e.target.value)}
                placeholder="e.g. America/Los_Angeles"
                style={inputStyle}
              />
            </div>
          </div>

          <TimezoneDatalist />

          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "space-between",
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <button
              onClick={swapPrimary}
              style={buttonStyle}
              title="Swap From with first comparison timezone"
            >
              Swap From ⇄ First Compare
            </button>

            <button onClick={share} style={buttonPrimaryStyle}>
              {copied ? "Copied link ✓" : "Copy share link"}
            </button>
          </div>
        </section>

        {/* FAVORITES + ADD + COMPARING */}
        <section style={compareCardStyle}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={subCard}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800, marginBottom: 8 }}>
                Add a timezone
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  list="tz-list"
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  placeholder="e.g. Europe/London"
                  style={{ ...inputStyle, flex: "1 1 340px" }}
                />

                <button onClick={() => addTarget()} style={buttonStyle}>
                  Add to Compare
                </button>

                <button
                  onClick={() => {
                    const v = newTarget.trim();
                    if (!v) return;
                    if (!isValidIanaTz(v)) return;
                    addToFavorites(v);
                    addTarget(v);
                  }}
                  style={buttonPrimaryStyle}
                  title="Adds timezone to favorites and comparison"
                >
                  Add & Favorite
                </button>

                <button
                  onClick={() => {
                    const v = newTarget.trim();
                    if (!v) return;
                    if (!isValidIanaTz(v)) return;
                    removeFromFavorites(v);
                  }}
                  style={buttonStyle}
                  title="Remove from favorites (uses the text box value)"
                >
                  Remove Favorite
                </button>
              </div>
            </div>

            {/* Favorites */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>
                  Favorites
                </div>
                <div style={{ fontSize: 12, opacity: 0.6 }}>
                  Click to add to comparison
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {favorites.map((tz) => (
                  <button
                    key={tz}
                    onClick={() => addTarget(tz)}
                    style={favoriteChip}
                    title="Add to comparison"
                  >
                    {tz}
                  </button>
                ))}
              </div>
            </div>

            {/* Comparing list */}
            <div style={subCard}>
              <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800, marginBottom: 8 }}>
                Comparing ({targets.length})
              </div>

              {targets.length === 0 ? (
                <div style={{ opacity: 0.6, fontSize: 13 }}>
                  No timezones yet. Click a favorite to start.
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {targets.map((tz) => {
                    const isFav = favorites.includes(tz);
                    return (
                      <div key={tz} style={compareChip}>
                        <span>{tz}</span>

                        <button
                          onClick={() => toggleFavorite(tz)}
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            opacity: 0.95,
                            fontSize: 14,
                            lineHeight: 1,
                          }}
                          title={isFav ? "Remove from favorites" : "Add to favorites"}
                        >
                          {isFav ? "★" : "☆"}
                        </button>

                        <button
                          onClick={() => removeTarget(tz)}
                          style={{
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            opacity: 0.8,
                            fontSize: 14,
                            lineHeight: 1,
                          }}
                          title="Remove from comparison"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RESULTS */}
        <section style={resultCardStyle}>
          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 10 }}>
            Results
          </div>

          {!canCompute ? (
            <div style={{ opacity: 0.75 }}>
              Pick a date/time and a valid “From” timezone to see conversions.
            </div>
          ) : !utcDate ? (
            <div style={{ color: "salmon" }}>Could not parse input.</div>
          ) : (
            <>
              <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 10 }}>
                UTC instant: <code>{utcDate.toISOString()}</code>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: 13,
                    tableLayout: "fixed",
                  }}
                >
                  <colgroup>
                    <col style={{ width: "45%" }} />
                    <col style={{ width: "40%" }} />
                    <col style={{ width: "15%" }} />
                  </colgroup>

                  <thead>
                    <tr style={{ textAlign: "left", opacity: 0.85 }}>
                      <th style={thClickable} onClick={() => onSort("tz")}>
                        Timezone
                        <SortIndicator active={sortKey === "tz"} dir={sortDir} />
                      </th>
                      <th style={thClickable} onClick={() => onSort("local")}>
                        Local time
                        <SortIndicator active={sortKey === "local"} dir={sortDir} />
                      </th>
                      <th style={thClickable} onClick={() => onSort("offset")}>
                        UTC offset
                        <SortIndicator active={sortKey === "offset"} dir={sortDir} />
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {fromRow && (
                      <tr style={{ borderLeft: `4px solid ${semantic.accent}` }}>
                        <td style={{ padding: "10px 8px", borderBottom: rowSep }}>
                          <strong>{fromRow.tz}</strong>{" "}
                          <span style={{ opacity: 0.7 }}>(From)</span>
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: rowSep }}>
                          <strong>{fromRow.time}</strong>
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: rowSep }}>
                          <strong>{fromRow.offset}</strong>
                        </td>
                      </tr>
                    )}

                    {sortedRows.map((r, idx) => (
                      <tr
                        key={r.tz}
                        style={{
                          background: idx % 2 === 0 ? stripeA : stripeB,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background = hoverBg;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.background =
                            idx % 2 === 0 ? stripeA : stripeB;
                        }}
                      >
                        <td style={{ padding: "10px 8px", borderBottom: rowSep }}>
                          {r.tz}
                        </td>

                        <td style={{ padding: "10px 8px", borderBottom: rowSep }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                            <span>{r.time}</span>
                            <span
                              style={{
                                fontSize: 12,
                                fontStyle: "italic",
                                opacity: 0.65,
                                whiteSpace: "nowrap",
                              }}
                              title={`Difference vs ${fromTz}`}
                            >
                              {r.diffLabel}
                            </span>
                          </div>
                        </td>

                        <td style={{ padding: "10px 8px", borderBottom: rowSep }}>
                          {r.offset}
                        </td>
                      </tr>
                    ))}

                    {sortedRows.length === 0 && (
                      <tr>
                        <td colSpan={3} style={{ padding: "10px 8px", opacity: 0.75 }}>
                          Add at least one comparison timezone.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div style={{ marginTop: 10, opacity: 0.75, fontSize: 12 }}>
            Tip: the italic value is the time difference vs the “From” timezone.
          </div>
        </section>

        {/* HELP / SEO CONTENT (collapsed by default, present in DOM) */}
        <details ref={helpRef} style={helpWrap}>
          <summary style={helpSummary}>
            <span style={helpIcon} aria-hidden="true">?</span>
            What is a timezone converter and how does it work?
          </summary>

          <div style={helpBody}>
            <div>
              <div style={helpH3}>What is a Timezone Converter?</div>
              <div>
                A timezone converter helps you compare the same date and time across multiple time zones instantly.
                It’s useful for scheduling meetings, coordinating with remote teams, and planning travel—especially
                when people are spread across different regions.
              </div>
              <div style={{ marginTop: 8 }}>
                This tool accounts for Daylight Saving Time (DST) automatically, so you don’t have to manually
                calculate offsets or worry about seasonal changes.
              </div>
            </div>

            <div>
              <div style={helpH3}>Why timezone differences matter</div>
              <div>
                A time that looks reasonable in one location can be outside working hours elsewhere. Even a one-hour
                DST shift can cause confusion if someone is using the wrong offset. Converting times reliably helps
                prevent missed meetings and incorrect calendar invites.
              </div>
            </div>

            <div>
              <div style={helpH3}>Common use cases</div>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Scheduling meetings across countries</li>
                <li>Planning international events and webinars</li>
                <li>Coordinating remote teams in multiple regions</li>
                <li>Checking time differences before travel</li>
                <li>Comparing UTC, GMT, PST, EST, and other time zones</li>
              </ul>
            </div>

            <div>
              <div style={helpH3}>How to use this tool</div>
              <div>
                Pick a base date/time and a “From” timezone, then add one or more comparison time zones. The results
                table shows the local time and UTC offset for each zone. Use the “Copy share link” button to send the
                exact setup to someone else.
              </div>
              <div style={{ marginTop: 8 }}>
                If you’re trying to find a meeting time that works for everyone, use the Meeting Overlap tool after
                you’ve confirmed the time zones here.
              </div>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}