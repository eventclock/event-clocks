// src/app/timezone/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatInTimeZone,
  getLocalTimeZone,
  getUtcOffsetLabelAtUtc,
  zonedDateTimeLocalToUtc,
} from "@/lib/tz";

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

  // "asUTC": interpret the TZ wall-clock output as if it were UTC
  const asUtcMs = Date.UTC(y, m - 1, d, hh, mm, ss);
  return asUtcMs - dateUtc.getTime();
}

/**
 * Creates a label like (+16h) or (−3:30h) representing:
 * target local clock time minus from local clock time at the same UTC instant.
 */
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

export default function TimezonePage() {
  const tzChoices = useMemo(() => getTimeZoneChoices(), []);

  const [fromTz, setFromTz] = useState(getLocalTimeZone());
  const [dtLocal, setDtLocal] = useState(""); // datetime-local

  const [targets, setTargets] = useState<string[]>(["Asia/Manila"]);
  const [newTarget, setNewTarget] = useState("");

  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES);

  const [copied, setCopied] = useState(false);

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
    if (dt) setDtLocal(dt);

    if (to) {
      const list = to
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter(isValidIanaTz);
      if (list.length > 0) setTargets(Array.from(new Set(list)));
    }
  }, []);

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

  const rows = useMemo(() => {
    if (!utcDate || fromOffsetMs == null) return [];

    // De-dupe targets AND avoid repeating the "from" timezone in comparison
    const uniqueTargets = Array.from(new Set(targets))
      .filter(isValidIanaTz)
      .filter((tz) => tz !== fromTz);

    return uniqueTargets.map((tz) => {
      const targetOffsetMs = getOffsetMsAtUtc(tz, utcDate);
      return {
        tz,
        time: formatInTimeZone(utcDate, tz),
        offset: getUtcOffsetLabelAtUtc(tz, utcDate),
        diffLabel: formatLocalDiffLabel(fromOffsetMs, targetOffsetMs),
      };
    });
  }, [targets, utcDate, fromOffsetMs, fromTz]);

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

  // Cards
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

  // Inputs/buttons
  const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid rgba(196,181,253,0.45)", // visible border
  background: "rgba(255,255,255,0.04)",
  width: "100%",
  outline: "none",
  WebkitAppearance: "none",
  appearance: "none",
};


  const buttonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 8,
  border: "1px solid rgba(196,181,253,0.55)", // stronger + matches purple card
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


  // Chips
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

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>
        Timezone Converter
      </h1>
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

          <datalist id="tz-list">
            {tzChoices.map((tz) => (
              <option key={tz} value={tz} />
            ))}
          </datalist>

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
            {/* Add timezone first (bordered) */}
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

            {/* Comparing list (management) */}
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
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ textAlign: "left", opacity: 0.85 }}>
                      <th style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                        Timezone
                      </th>
                      <th style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                        Local time
                      </th>
                      <th style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
                        UTC offset
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {fromRow && (
                      <tr style={{ borderLeft: `4px solid ${semantic.accent}` }}>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          <strong>{fromRow.tz}</strong>{" "}
                          <span style={{ opacity: 0.7 }}>(From)</span>
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          <strong>{fromRow.time}</strong>
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          <strong>{fromRow.offset}</strong>
                        </td>
                      </tr>
                    )}

                    {rows.map((r) => (
                      <tr key={r.tz}>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          {r.tz}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
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
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                          {r.offset}
                        </td>
                      </tr>
                    ))}

                    {rows.length === 0 && (
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
      </div>
    </main>
  );
}
