// src/app/timezone/TimezoneClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatInTimeZone,
  getLocalTimeZone,
  getUtcOffsetLabelAtUtc,
  zonedDateTimeLocalToUtc,
} from "@/lib/tz";
import { getTimeZoneMetadata } from "@/lib/timezones/metadata";
import TimezoneDatalist from "@/components/TimezoneDatalist";
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
};

function safeParse(json: string | null): SavedState | null {
  if (!json) return null;
  try {
    const obj: unknown = JSON.parse(json);
    if (!obj || typeof obj !== "object") return null;

    const saved = obj as Partial<Record<keyof SavedState, unknown>>;
    const fromTz = typeof saved.fromTz === "string" ? saved.fromTz : null;
    const targets = Array.isArray(saved.targets)
      ? saved.targets.filter((x): x is string => typeof x === "string")
      : null;

    if (!fromTz || !targets) return null;
    return { fromTz, targets };
  } catch {
    return null;
  }
}

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
  // Kept for compatibility / future use; also makes your Intl fallback available.
  useMemo(() => getTimeZoneChoices(), []);
  const helpRef = useRef<HTMLDetailsElement | null>(null);

  const [fromTz, setFromTz] = useState(getLocalTimeZone());
  const [dtLocal, setDtLocal] = useState(""); // datetime-local

  const [targets, setTargets] = useState<string[]>(["Asia/Manila"]);
  const [newTarget, setNewTarget] = useState("");

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
    const payload: SavedState = { fromTz, targets };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [fromTz, targets]);

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
    const metadata = getTimeZoneMetadata(fromTz);

    return {
      tz: fromTz,
      locationLabel: metadata.displayName,
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
      const metadata = getTimeZoneMetadata(tz);

      return {
        tz,
        locationLabel: metadata.displayName,
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
  const baseTimeZoneMetadata = getTimeZoneMetadata(fromTz);

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
        Convert a date/time from one timezone and compare it across many timezones (DST-aware).
      </p>

      <div className={styles.stack}>
        {/* SOURCE */}
        <section className={styles.section}>
          <div className={styles.sectionLabel}>Base time</div>
          <div className={styles.inputGrid}>
            <div className={styles.field}>
              <label className={styles.label}>Timezone</label>
              <input
                list="tz-list"
                value={fromTz}
                onChange={(e) => setFromTz(e.target.value)}
                placeholder="e.g. America/Los_Angeles"
                className={styles.input}
              />
              {isValidIanaTz(fromTz) && (
                <div className={styles.fieldHint}>
                  {baseTimeZoneMetadata.displayName}
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

          <TimezoneDatalist />

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
              list="tz-list"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              placeholder="e.g. Europe/London"
              className={`${styles.input} ${styles.addInput}`}
            />

            <button onClick={() => addTarget()} className={styles.button}>
              Add to Compare
            </button>
          </div>

          <div className={styles.selectedZone}>
            <div className={styles.selectedHeader}>
              <span>Selected</span>
              <span className={styles.selectedCount}>{targets.length}</span>
            </div>

            {targets.length === 0 ? (
              <div className={styles.muted}>
                No timezones yet. Add one above to start.
              </div>
            ) : (
              <div className={styles.chipRow}>
                {targets.map((tz) => (
                  <div key={tz} className={styles.chip}>
                    <span className={styles.chipText}>
                      <span>{tz}</span>
                      <span className={styles.chipMeta}>
                        {getTimeZoneMetadata(tz).displayName}
                      </span>
                    </span>

                    <button
                      onClick={() => removeTarget(tz)}
                      className={styles.iconButton}
                      title="Remove from comparison"
                    >
                      ×
                    </button>
                  </div>
                ))}
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
              Pick a date/time and a valid base timezone to see conversions.
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
                        Timezone
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
                              <strong>{fromRow.tz}</strong>{" "}
                              <span className={styles.fromLabel}>(Base)</span>
                            </div>
                            <div className={styles.tzMeta}>{fromRow.locationLabel}</div>
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
                        key={r.tz}
                        className={idx % 2 === 0 ? styles.rowAlt : styles.row}
                      >
                        <td className={styles.td}>
                          <div className={styles.tzCell}>
                            <div>{r.tz}</div>
                            <div className={styles.tzMeta}>{r.locationLabel}</div>
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
                          Add at least one comparison timezone.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <div className={styles.muted}>
            Tip: the italic value is the time difference vs the base timezone.
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
                A timezone converter helps you compare the same date and time across multiple time zones instantly.
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
                Pick a base date/time and timezone, then add one or more comparison time zones. The results
                table shows the local time and UTC offset for each zone. Use the “Copy share link” button to send the
                exact setup to someone else.
              </div>
              <div className={styles.helpParagraphGap}>
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
