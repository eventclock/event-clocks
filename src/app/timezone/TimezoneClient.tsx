// src/app/timezone/TimezoneClient.tsx
"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatInTimeZone,
  getLocalTimeZone,
  getUtcOffsetLabelAtUtc,
  zonedDateTimeLocalToUtc,
} from "@/lib/tz";
import { getTimeZoneMetadata } from "@/lib/timezones/metadata";
import styles from "./timezone.module.css";

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

const STORAGE_KEY = "tztool:v5";
const DEFAULT_FROM_TZ = "UTC";

function toLocalDatetimeInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function getTimeZoneChoices(): string[] {
  const intlWithSupportedValues = Intl as typeof Intl & {
    supportedValuesOf?: (key: "timeZone") => string[];
  };
  const supported = intlWithSupportedValues.supportedValuesOf?.("timeZone");
  if (Array.isArray(supported) && supported.length > 0) return supported;
  return FALLBACK_TZS;
}

function normalizeLookup(value: string) {
  return value.trim().toLowerCase().replace(/[_\s]+/g, " ");
}

function displayNameForTimeZone(timeZone: string) {
  return getTimeZoneMetadata(timeZone).displayName;
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

type SelectedPlace = {
  timeZone: string;
  label: string;
};

type SavedState = {
  fromTz: string;
  fromLabel?: string;
  targets: SelectedPlace[];
};

function normalizeSavedTarget(input: unknown): SelectedPlace | null {
  if (typeof input === "string") {
    return isValidIanaTz(input) ? { timeZone: input, label: displayNameForTimeZone(input) } : null;
  }

  if (!input || typeof input !== "object") return null;
  const candidate = input as Partial<SelectedPlace>;
  if (typeof candidate.timeZone !== "string" || !isValidIanaTz(candidate.timeZone)) return null;

  return {
    timeZone: candidate.timeZone,
    label:
      typeof candidate.label === "string" && candidate.label.trim()
        ? candidate.label.trim()
        : displayNameForTimeZone(candidate.timeZone),
  };
}

function safeParse(json: string | null): SavedState | null {
  if (!json) return null;
  try {
    const obj: unknown = JSON.parse(json);
    if (!obj || typeof obj !== "object") return null;

    const saved = obj as Partial<Record<keyof SavedState, unknown>>;
    const fromTz = typeof saved.fromTz === "string" ? saved.fromTz : null;
    const fromLabel = typeof saved.fromLabel === "string" ? saved.fromLabel : undefined;
    const targets = Array.isArray(saved.targets)
      ? saved.targets
          .map(normalizeSavedTarget)
          .filter((target): target is SelectedPlace => Boolean(target))
      : null;

    if (!fromTz || !targets) return null;
    return { fromTz, fromLabel, targets };
  } catch {
    return null;
  }
}

type CitySuggestion = {
  id: string;
  label: string;
  name: string;
  adminName: string;
  countryCode: string;
  countryName: string;
  timeZone: string;
  population: number;
};

type SortKey = "tz" | "local" | "offset";
type SortDir = "asc" | "desc";

type Row = {
  tz: string;
  locationLabel: string;
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
      className={`${styles.sortIndicator} ${active ? styles.sortIndicatorActive : ""}`}
      title="Sortable"
    >
      {symbol}
    </span>
  );
}

export default function TimezoneClient() {
  const helpRef = useRef<HTMLDetailsElement | null>(null);
  const defaultFromLabel = displayNameForTimeZone(DEFAULT_FROM_TZ);

  const [timeZoneOptions, setTimeZoneOptions] = useState<string[]>(FALLBACK_TZS);
  const [fromTz, setFromTz] = useState(DEFAULT_FROM_TZ);
  const [fromLabel, setFromLabel] = useState(defaultFromLabel);
  const [fromInput, setFromInput] = useState(defaultFromLabel);
  const [dtLocal, setDtLocal] = useState(""); // datetime-local

  const [targets, setTargets] = useState<SelectedPlace[]>([
    { timeZone: "Asia/Manila", label: "Manila, Metro Manila, Philippines" },
  ]);
  const [newTarget, setNewTarget] = useState("");
  const [baseSuggestions, setBaseSuggestions] = useState<CitySuggestion[]>([]);
  const [targetSuggestions, setTargetSuggestions] = useState<CitySuggestion[]>([]);

  const [hasInitialized, setHasInitialized] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sorting
  const [sortKey, setSortKey] = useState<SortKey>("offset");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    setTimeZoneOptions(getTimeZoneChoices());
  }, []);

  const resolveTimeZoneInput = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (isValidIanaTz(trimmed)) return getTimeZoneMetadata(trimmed).canonicalTimeZone;

    const normalized = normalizeLookup(trimmed);
    return (
      timeZoneOptions.find((tz) => {
        const metadata = getTimeZoneMetadata(tz);
        return (
          normalizeLookup(metadata.displayName) === normalized ||
          normalizeLookup(metadata.cityName) === normalized ||
          normalizeLookup(metadata.canonicalTimeZone) === normalized
        );
      }) ?? null
    );
  };

  const findMatchingSuggestion = (value: string, suggestions: CitySuggestion[]) => {
    const normalized = normalizeLookup(value);
    return suggestions.find((suggestion) => normalizeLookup(suggestion.label) === normalized) ?? null;
  };

  const selectBasePlace = (place: SelectedPlace) => {
    setFromTz(place.timeZone);
    setFromLabel(place.label);
    setFromInput(place.label);
    setBaseSuggestions([]);
  };

  const selectTargetPlace = (place: SelectedPlace) => {
    setTargets((prev) =>
      prev.some((target) => target.timeZone === place.timeZone && target.label === place.label)
        ? prev
        : [...prev, place],
    );
    setNewTarget("");
    setTargetSuggestions([]);
  };

  const applyBaseInput = (value: string) => {
    setFromInput(value);

    const resolved = resolveTimeZoneInput(value);
    if (resolved) {
      setFromTz(resolved);
      setFromLabel(displayNameForTimeZone(resolved));
    }
  };

  const settleBaseInput = () => {
    const cityMatch = findMatchingSuggestion(fromInput, baseSuggestions);
    if (cityMatch) {
      selectBasePlace({ timeZone: cityMatch.timeZone, label: cityMatch.label });
      return;
    }

    const resolved = resolveTimeZoneInput(fromInput);
    if (resolved) {
      setFromTz(resolved);
      const label = displayNameForTimeZone(resolved);
      setFromLabel(label);
      setFromInput(label);
      return;
    }

    if (isValidIanaTz(fromTz)) {
      setFromInput(fromLabel);
    }
  };

  useEffect(() => {
    const query = fromInput.trim();
    if (query.length < 2 || query === fromLabel) {
      setBaseSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/timezone-cities?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { results?: CitySuggestion[] };
        setBaseSuggestions(Array.isArray(data.results) ? data.results : []);
      } catch {
        if (!controller.signal.aborted) setBaseSuggestions([]);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [fromInput, fromLabel]);

  useEffect(() => {
    const query = newTarget.trim();
    if (query.length < 2) {
      setTargetSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/timezone-cities?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { results?: CitySuggestion[] };
        setTargetSuggestions(Array.isArray(data.results) ? data.results : []);
      } catch {
        if (!controller.signal.aborted) setTargetSuggestions([]);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [newTarget]);

  // Browser-only initialization. Keep SSR and the first client render deterministic.
  useEffect(() => {
    const saved = safeParse(localStorage.getItem(STORAGE_KEY));
    const p = new URLSearchParams(window.location.search);
    const from = p.get("from");
    const dt = p.get("dt");
    const to = p.get("to");

    if (saved?.fromTz && isValidIanaTz(saved.fromTz)) {
      setFromTz(saved.fromTz);
      const label = saved.fromLabel || displayNameForTimeZone(saved.fromTz);
      setFromLabel(label);
      setFromInput(label);
    } else {
      const localTimeZone = getLocalTimeZone();
      const label = displayNameForTimeZone(localTimeZone);
      setFromTz(localTimeZone);
      setFromLabel(label);
      setFromInput(label);
    }

    if (saved && saved.targets.length > 0) setTargets(saved.targets);

    if (from && isValidIanaTz(from)) {
      setFromTz(from);
      const label = displayNameForTimeZone(from);
      setFromLabel(label);
      setFromInput(label);
    }

    if (dt) {
      setDtLocal(dt);
    } else {
      setDtLocal(toLocalDatetimeInputValue(new Date()));
    }

    if (to) {
      const list = to
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .filter(isValidIanaTz);
      if (list.length > 0) {
        setTargets(
          Array.from(new Set(list)).map((timeZone) => ({
            timeZone,
            label: displayNameForTimeZone(timeZone),
          })),
        );
      }
    }

    setHasInitialized(true);
  }, []);

  // Persist state
  useEffect(() => {
    if (!hasInitialized) return;
    const payload: SavedState = { fromTz, fromLabel, targets };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [hasInitialized, fromTz, fromLabel, targets]);

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
      locationLabel: fromLabel,
      time: formatInTimeZone(utcDate, fromTz),
      offset: getUtcOffsetLabelAtUtc(fromTz, utcDate),
    };
  }, [utcDate, fromTz, fromLabel]);

  const rows: Row[] = useMemo(() => {
    if (!utcDate || fromOffsetMs == null) return [];

    const uniqueTargets = Array.from(
      new Map(targets.map((target) => [`${target.timeZone}:${target.label}`, target])).values(),
    )
      .filter((target) => isValidIanaTz(target.timeZone))
      .filter((target) => target.timeZone !== fromTz || target.label !== fromLabel);

    return uniqueTargets.map((target) => {
      const tz = target.timeZone;
      const targetOffsetMs = getOffsetMsAtUtc(tz, utcDate);
      const localMs = utcDate.getTime() + targetOffsetMs;
      const metadata = getTimeZoneMetadata(tz);

      return {
        tz,
        locationLabel: target.label || metadata.displayName,
        time: formatInTimeZone(utcDate, tz),
        offset: getUtcOffsetLabelAtUtc(tz, utcDate),
        diffLabel: formatLocalDiffLabel(fromOffsetMs, targetOffsetMs),
        targetOffsetMs,
        localMs,
      };
    });
  }, [targets, utcDate, fromOffsetMs, fromTz, fromLabel]);

  const sortedRows = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    const cmp = (a: Row, b: Row) => {
      if (sortKey === "tz") return dir * a.locationLabel.localeCompare(b.locationLabel, "en");
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
    const cityMatch = tzOverride ? null : findMatchingSuggestion(newTarget, targetSuggestions);
    if (cityMatch) {
      selectTargetPlace({ timeZone: cityMatch.timeZone, label: cityMatch.label });
      return;
    }

    const tz = (tzOverride ?? resolveTimeZoneInput(newTarget) ?? newTarget).trim();
    if (!tz) return;
    if (!isValidIanaTz(tz)) return;

    const place = { timeZone: tz, label: displayNameForTimeZone(tz) };
    setTargets((prev) =>
      prev.some((target) => target.timeZone === place.timeZone && target.label === place.label)
        ? prev
        : [...prev, place],
    );
    if (!tzOverride) setNewTarget("");
  };

  const removeTarget = (place: SelectedPlace) => {
    setTargets((prev) =>
      prev.filter((target) => target.timeZone !== place.timeZone || target.label !== place.label),
    );
  };

  const swapPrimary = () => {
    if (targets.length === 0) return;
    const first = targets[0];
    setTargets([{ timeZone: fromTz, label: fromLabel }, ...targets.slice(1)]);
    setFromTz(first.timeZone);
    setFromLabel(first.label);
    setFromInput(first.label);
  };

  const share = async () => {
    const u = new URL(window.location.href);
    u.searchParams.set("from", fromTz);
    if (dtLocal) u.searchParams.set("dt", dtLocal);
    if (targets.length > 0) u.searchParams.set("to", targets.map((target) => target.timeZone).join(","));
    await navigator.clipboard.writeText(u.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const canCompute = dtLocal.length > 0 && isValidIanaTz(fromTz);

  return (
    <main className={styles.wrap}>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Timezone Converter</h1>
        <button
          type="button"
          onClick={() => {
            const el = helpRef.current;
            if (!el) return;
            el.open = true;
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className={styles.infoButton}
          aria-label="Info about this tool"
          title="About this tool"
        >
          i
        </button>
      </div>
      <p className={styles.subtitle}>
        Convert a date/time from one city or place and compare it across others (DST-aware).
      </p>

      <div className={styles.stack}>
        {/* SOURCE */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Base time</div>
          <div className={styles.inputGrid}>
            <div className={styles.field}>
              <label className={styles.label}>City / place</label>
              <input
                value={fromInput}
                onChange={(e) => applyBaseInput(e.target.value)}
                onBlur={settleBaseInput}
                placeholder="e.g. Los Angeles"
                className={styles.input}
              />
              {isValidIanaTz(fromTz) && (
                <div className={styles.fieldHint}>
                  {fromTz}
                </div>
              )}
              {baseSuggestions.length > 0 && (
                <div className={styles.suggestionList}>
                  {baseSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className={styles.suggestion}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() =>
                        selectBasePlace({
                          timeZone: suggestion.timeZone,
                          label: suggestion.label,
                        })
                      }
                    >
                      <span>{suggestion.label}</span>
                      <span>{suggestion.timeZone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>
                Date & time
              </label>
              <input
                type="datetime-local"
                value={dtLocal}
                onChange={(e) => setDtLocal(e.target.value)}
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.buttonRow}>
            <button
              onClick={swapPrimary}
              className={styles.button}
              title="Swap base timezone with first comparison timezone"
            >
              Swap first compare
            </button>

            <button onClick={share} className={styles.buttonPrimary}>
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        </section>

        {/* COMPARE */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Compare with</div>

          <div className={styles.addRow}>
            <input
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder="e.g. London"
              className={`${styles.input} ${styles.addInput}`}
            />

            <button onClick={() => addTarget()} className={styles.button}>
              Add to Compare
            </button>
          </div>
          {targetSuggestions.length > 0 && (
            <div className={styles.suggestionList}>
              {targetSuggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  className={styles.suggestion}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() =>
                    selectTargetPlace({
                      timeZone: suggestion.timeZone,
                      label: suggestion.label,
                    })
                  }
                >
                  <span>{suggestion.label}</span>
                  <span>{suggestion.timeZone}</span>
                </button>
              ))}
            </div>
          )}

          <div className={styles.selectedZone}>
            <div className={styles.selectedHeader}>
              <span>Selected</span>
              <span className={styles.selectedCount}>{targets.length}</span>
            </div>

            {targets.length === 0 ? (
              <div className={styles.muted}>
                No places yet. Add one above to start.
              </div>
            ) : (
              <div className={styles.chipRow}>
                {targets.map((target) => {
                  const metadata = getTimeZoneMetadata(target.timeZone);

                  return (
                    <div key={`${target.timeZone}:${target.label}`} className={styles.chip}>
                    <span className={styles.chipText}>
                      <span>{target.label || metadata.displayName}</span>
                      <span className={styles.chipMeta}>
                        {metadata.canonicalTimeZone}
                      </span>
                    </span>

                    <button
                      onClick={() => removeTarget(target)}
                      className={styles.iconButton}
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
        </section>

        {/* RESULTS */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>
            Results
          </div>

          {!canCompute ? (
            <div className={styles.muted}>
              Pick a date/time and a valid base city or place to see conversions.
            </div>
          ) : !utcDate ? (
            <div className={styles.errorText}>Could not parse input.</div>
          ) : (
            <>
              <div className={styles.muted}>
                UTC instant: <code>{utcDate.toISOString()}</code>
              </div>

              <div className={styles.tableWrap}>
                <table
                  className={styles.table}
                >
                  <colgroup>
                    <col className={styles.tzCol} />
                    <col className={styles.localCol} />
                    <col className={styles.offsetCol} />
                  </colgroup>

                  <thead>
                    <tr className={styles.headRow}>
                      <th className={styles.th} onClick={() => onSort("tz")}>
                        City / place
                        <SortIndicator active={sortKey === "tz"} dir={sortDir} />
                      </th>
                      <th className={styles.th} onClick={() => onSort("local")}>
                        Local time
                        <SortIndicator active={sortKey === "local"} dir={sortDir} />
                      </th>
                      <th className={styles.th} onClick={() => onSort("offset")}>
                        UTC offset
                        <SortIndicator active={sortKey === "offset"} dir={sortDir} />
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {fromRow && (
                      <tr className={styles.fromRow}>
                        <td className={styles.td}>
                          <div className={styles.tzCell}>
                            <div>
                              <strong>{fromRow.locationLabel}</strong>{" "}
                              <span className={styles.fromLabel}>(Base)</span>
                            </div>
                            <div className={styles.tzMeta}>{fromRow.tz}</div>
                          </div>
                        </td>
                        <td className={styles.td}>
                          <strong>{fromRow.time}</strong>
                        </td>
                        <td className={styles.td}>
                          <strong>{fromRow.offset}</strong>
                        </td>
                      </tr>
                    )}

                    {sortedRows.map((r, idx) => (
                      <tr
                        key={`${r.tz}:${r.locationLabel}`}
                        className={idx % 2 === 0 ? styles.rowAlt : styles.row}
                      >
                        <td className={styles.td}>
                          <div className={styles.tzCell}>
                            <div>{r.locationLabel}</div>
                            <div className={styles.tzMeta}>{r.tz}</div>
                          </div>
                        </td>

                        <td className={styles.td}>
                          <div className={styles.localCell}>
                            <span>{r.time}</span>
                            <span
                              className={styles.diffLabel}
                              title={`Difference vs ${fromTz}`}
                            >
                              {r.diffLabel}
                            </span>
                          </div>
                        </td>

                        <td className={styles.td}>
                          {r.offset}
                        </td>
                      </tr>
                    ))}

                    {sortedRows.length === 0 && (
                      <tr>
                        <td colSpan={3} className={styles.td}>
                          Add at least one comparison place.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className={styles.muted}>
            Tip: the italic value is the time difference vs the base city.
          </div>
        </section>

        {/* HELP / SEO CONTENT (collapsed by default, present in DOM) */}
        <details ref={helpRef} className={styles.helpWrap}>
          <summary className={styles.helpSummary}>
            <span className={styles.helpIcon} aria-hidden="true">?</span>
            What is a timezone converter and how does it work?
          </summary>

          <div className={styles.helpBody}>
            <div>
              <div className={styles.helpH3}>What is a Timezone Converter?</div>
              <div>
                A timezone converter helps you compare the same date and time across multiple places instantly.
                It’s useful for scheduling meetings, coordinating with remote teams, and planning travel—especially
                when people are spread across different regions.
              </div>
              <div className={styles.helpParagraphGap}>
                This tool accounts for Daylight Saving Time (DST) automatically, so you don’t have to manually
                calculate offsets or worry about seasonal changes.
              </div>
            </div>

            <div>
              <div className={styles.helpH3}>Why timezone differences matter</div>
              <div>
                A time that looks reasonable in one location can be outside working hours elsewhere. Even a one-hour
                DST shift can cause confusion if someone is using the wrong offset. Converting times reliably helps
                prevent missed meetings and incorrect calendar invites.
              </div>
            </div>

            <div>
              <div className={styles.helpH3}>Common use cases</div>
              <ul className={styles.helpList}>
                <li>Scheduling meetings across countries</li>
                <li>Planning international events and webinars</li>
                <li>Coordinating remote teams in multiple regions</li>
                <li>Checking time differences before travel</li>
                <li>Comparing UTC, GMT, PST, EST, and other time zones</li>
              </ul>
            </div>

            <div>
              <div className={styles.helpH3}>How to use this tool</div>
              <div>
                Pick a base date/time and city or timezone, then add one or more comparison places. The results
                table shows the local time and UTC offset for each zone. Use the “Copy share link” button to send the
                exact setup to someone else.
              </div>
              <div className={styles.helpParagraphGap}>
                If you’re trying to find a meeting time that works for everyone, use the Meeting Overlap tool after
                you’ve confirmed the places here.
              </div>
              <div className={styles.helpParagraphGap}>
                City suggestions are derived from the GeoNames cities15000 dataset; timezone conversion still uses
                the selected city’s IANA timezone.
              </div>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}
