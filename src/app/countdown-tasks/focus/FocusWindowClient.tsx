"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./FocusWindow.module.css";

type TaskColor = "blue" | "pink" | "mint" | "gold" | "lavender";

type FocusTask = {
  id: string;
  title: string;
  note: string;
  startISO: string;
  endISO: string;
  done: boolean;
  color: TaskColor;
};

function parseDateTimeLocal(value: string): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function getCountdownPartsFromMs(ms: number) {
  let diff = Math.floor(Math.max(0, ms) / 1000);

  const days = Math.floor(diff / 86400);
  diff -= days * 86400;
  const hours = Math.floor(diff / 3600);
  diff -= hours * 3600;
  const minutes = Math.floor(diff / 60);
  diff -= minutes * 60;
  const seconds = diff;

  return {
    days: String(days),
    hours: pad2(hours),
    minutes: pad2(minutes),
    seconds: pad2(seconds),
  };
}

function relativeFromNow(targetISO: string, nowMs: number) {
  const d = parseDateTimeLocal(targetISO);
  if (!d) return "at an invalid date";

  const diffMs = d.getTime() - nowMs;
  const abs = Math.abs(diffMs);

  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;

  if (abs < minute) {
    return diffMs >= 0 ? "in less than a minute" : "less than a minute ago";
  }

  if (abs < hour) {
    const n = Math.floor(abs / minute);
    return diffMs >= 0
      ? `in ${n} minute${n === 1 ? "" : "s"}`
      : `${n} minute${n === 1 ? "" : "s"} ago`;
  }

  if (abs < day) {
    const n = Math.floor(abs / hour);
    return diffMs >= 0
      ? `in ${n} hour${n === 1 ? "" : "s"}`
      : `${n} hour${n === 1 ? "" : "s"} ago`;
  }

  const n = Math.floor(abs / day);
  return diffMs >= 0
    ? `in ${n} day${n === 1 ? "" : "s"}`
    : `${n} day${n === 1 ? "" : "s"} ago`;
}

function relativePastOnly(targetISO: string, nowMs: number) {
  const d = parseDateTimeLocal(targetISO);
  if (!d) return "an invalid amount of time";

  const diffMs = Math.max(0, nowMs - d.getTime());
  const minute = 60_000;
  const hour = 3_600_000;
  const day = 86_400_000;

  if (diffMs < minute) return "less than a minute";

  if (diffMs < hour) {
    const n = Math.floor(diffMs / minute);
    return `${n} minute${n === 1 ? "" : "s"}`;
  }

  if (diffMs < day) {
    const n = Math.floor(diffMs / hour);
    return `${n} hour${n === 1 ? "" : "s"}`;
  }

  const n = Math.floor(diffMs / day);
  return `${n} day${n === 1 ? "" : "s"}`;
}

function getTaskPhase(
  item: FocusTask,
  nowMs: number
): "done" | "upcoming" | "active" | "delayed" {
  if (item.done) return "done";

  const start = parseDateTimeLocal(item.startISO)?.getTime();
  const end = parseDateTimeLocal(item.endISO)?.getTime();

  if (start == null || end == null) return "upcoming";
  if (nowMs < start) return "upcoming";
  if (nowMs >= start && nowMs < end) return "active";
  return "delayed";
}

function formatDateTimeLong(value: string) {
  const d = parseDateTimeLocal(value);
  if (!d) return "Invalid date";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function decodePayload(encoded: string | null): FocusTask | null {
  if (!encoded) return null;

  try {
    const json = decodeURIComponent(escape(window.atob(encoded)));
    const parsed = JSON.parse(json);

    if (
      typeof parsed?.title !== "string" ||
      typeof parsed?.startISO !== "string" ||
      typeof parsed?.endISO !== "string"
    ) {
      return null;
    }

    return {
      id: typeof parsed?.id === "string" ? parsed.id : "",
      title: parsed.title,
      note: typeof parsed?.note === "string" ? parsed.note : "",
      startISO: parsed.startISO,
      endISO: parsed.endISO,
      done: !!parsed?.done,
      color:
        parsed?.color === "pink" ||
        parsed?.color === "mint" ||
        parsed?.color === "gold" ||
        parsed?.color === "lavender"
          ? parsed.color
          : "blue",
    };
  } catch {
    return null;
  }
}

function useFocusTask(): FocusTask | null {
  const [task, setTask] = useState<FocusTask | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const payload = url.searchParams.get("payload");
    setTask(decodePayload(payload));
  }, []);

  return task;
}

function colorClass(color: TaskColor) {
  switch (color) {
    case "pink":
      return styles.pink;
    case "mint":
      return styles.mint;
    case "gold":
      return styles.gold;
    case "lavender":
      return styles.lavender;
    default:
      return styles.blue;
  }
}

function playAlarm(ctx: AudioContext) {
  const now = ctx.currentTime;

  const notes = [
    { freq: 880, start: 0, dur: 0.12 },
    { freq: 1174.66, start: 0.14, dur: 0.12 },
    { freq: 1567.98, start: 0.28, dur: 0.18 },
  ];

  notes.forEach((note) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(note.freq, now + note.start);

    gain.gain.setValueAtTime(0.0001, now + note.start);
    gain.gain.exponentialRampToValueAtTime(0.06, now + note.start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + note.start);
    osc.stop(now + note.start + note.dur);
  });
}

function BellIcon({ muted = false }: { muted?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.actionSvg}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 17H9c-1.7 0-3-1.3-3-3v-3.2c0-2.9 1.7-5.3 4.3-6.1V4a1.7 1.7 0 1 1 3.4 0v.7c2.6.8 4.3 3.2 4.3 6.1V14c0 1.7-1.3 3-3 3Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
      {muted ? <path d="M5 5l14 14" /> : null}
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.actionSvg}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function DigitTiles({
  value,
  fixed = false,
}: {
  value: string;
  fixed?: boolean;
}) {
  const digits = fixed ? value.padStart(2, "0").split("") : String(value).split("");

  return (
    <div
      className={`${styles.unitDigits} ${
        fixed ? styles.unitDigitsFixed : styles.unitDigitsDays
      }`}
    >
      {digits.map((ch, idx) => (
        <div
          key={`${ch}-${idx}`}
          className={`${styles.tile} ${ch === "-" ? styles.tilePlaceholder : ""}`}
        >
          {ch}
        </div>
      ))}
    </div>
  );
}

function CountdownClock({
  parts,
  label,
  delayed = false,
  done = false,
}: {
  parts: { days: string; hours: string; minutes: string; seconds: string };
  label: string;
  delayed?: boolean;
  done?: boolean;
}) {
  return (
    <div
      className={`${styles.clockWrap} ${delayed ? styles.clockWrapDelayed : ""} ${
        done ? styles.clockWrapDone : ""
      }`}
      aria-label={label}
    >
      {/* <div
        className={`${styles.clockLabelsInline} ${
          delayed ? styles.clockLabelsInlineDelayed : ""
        }`}
      >
        {label}
      </div> */}

      <div className={styles.clockRow}>
        <DigitTiles value={parts.days} />
        <div className={styles.colon}>:</div>
        <DigitTiles value={parts.hours} fixed />
        <div className={styles.colon}>:</div>
        <DigitTiles value={parts.minutes} fixed />
        <div className={styles.colon}>:</div>
        <DigitTiles value={parts.seconds} fixed />
      </div>
    </div>
  );
}

export default function FocusWindowClient() {
  const task = useFocusTask();
  const audioContextRef = useRef<AudioContext | null>(null);

  const [nowMs, setNowMs] = useState(0);
  const [armed, setArmed] = useState(false);
  const [alarmFired, setAlarmFired] = useState({
    started: false,
    ended: false,
  });

  useEffect(() => {
    setNowMs(Date.now());

    let interval: ReturnType<typeof setInterval> | null = null;
    let timeout: ReturnType<typeof setTimeout> | null = null;

    const tick = () => setNowMs(Date.now());
    const ms = Date.now();
    const toNextSecond = 1000 - (ms % 1000);

    timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 1000);
    }, toNextSecond);

    return () => {
      if (timeout) clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  const phase = useMemo(() => {
    if (!task) return "upcoming" as const;
    return getTaskPhase(task, nowMs);
  }, [task, nowMs]);

  const clock = useMemo(() => {
    if (!task) {
      return {
        title: "Loading",
        subline: "",
        label: "Loading",
        parts: { days: "-", hours: "--", minutes: "--", seconds: "--" },
        delayed: false,
        done: false,
      };
    }

    const endMs = parseDateTimeLocal(task.endISO)?.getTime() ?? 0;

    if (phase === "upcoming") {
      return {
        title: "Starts in",
        subline: relativeFromNow(task.startISO, nowMs),
        label: "Starts soon",
        parts: {
          days: "-",
          hours: "--",
          minutes: "--",
          seconds: "--",
        },
        delayed: false,
        done: false,
      };
    }

    if (phase === "active") {
      return {
        title: "Time left",
        subline: relativeFromNow(task.endISO, nowMs),
        label: "Time left",
        parts: getCountdownPartsFromMs(endMs - nowMs),
        delayed: false,
        done: false,
      };
    }

    if (phase === "delayed") {
      return {
        title: "Ended",
        subline: `Delayed by ${relativePastOnly(task.endISO, nowMs)}`,
        label: "Ended",
        parts: getCountdownPartsFromMs(nowMs - endMs),
        delayed: true,
        done: false,
      };
    }

    return {
      title: "Completed",
      subline: "Marked done",
      label: "Completed",
      parts: {
        days: "0",
        hours: "00",
        minutes: "00",
        seconds: "00",
      },
      delayed: false,
      done: true,
    };
  }, [task, phase, nowMs]);

  useEffect(() => {
    if (!task) return;

    if (phase === "upcoming") {
      document.title = `${task.title} — Starts soon`;
      return;
    }

    if (phase === "active") {
      document.title = `${task.title} — In progress`;
      return;
    }

    if (phase === "delayed") {
      document.title = `⏰ ${task.title} — Ended`;
      return;
    }

    document.title = `✓ ${task.title} — Completed`;
  }, [task, phase]);

async function toggleAlarm() {
  if (phase === "delayed") return;

  if (armed) {
    setArmed(false);
    return;
  }

  if (typeof window === "undefined") return;

  const AudioCtor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;

  if (!AudioCtor) return;

  try {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioCtor();
    }

    if (audioContextRef.current.state === "suspended") {
      await audioContextRef.current.resume();
    }

    playAlarm(audioContextRef.current);
    setArmed(true);
  } catch {}
}

  useEffect(() => {
    if (!task || !armed || !audioContextRef.current) return;

    const startMs = parseDateTimeLocal(task.startISO)?.getTime();
    const endMs = parseDateTimeLocal(task.endISO)?.getTime();

    if (!startMs || !endMs) return;

    if (nowMs >= startMs && nowMs < endMs && !alarmFired.started) {
      playAlarm(audioContextRef.current);
      setAlarmFired((prev) => ({ ...prev, started: true }));
    }

    if (nowMs >= endMs && !alarmFired.ended) {
      playAlarm(audioContextRef.current);
      setAlarmFired((prev) => ({ ...prev, ended: true }));
    }
  }, [task, armed, nowMs, alarmFired]);

  if (!task) {
    return (
      <main className={`${styles.viewport} ${styles.blue}`}>
        <div className={`${styles.note} `}>
          <div className={styles.inner}>
            <button
              className={`${styles.iconButton} ${styles.closeFloating}`}
              onClick={() => window.close()}
              aria-label="Close"
              title="Close"
            >
              <CloseIcon />
            </button>

            <h1 className={styles.title}>Task not found</h1>
            <p className={styles.noteText}>
              Open this from the main countdown tasks page.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.viewport}>
      <div
        className={`${styles.note} ${colorClass(task.color)} ${
          phase === "delayed" ? styles.noteEnded : ""
        } ${phase === "done" ? styles.noteDone : ""}`}
      >
        <div className={styles.inner}>
          <div className={styles.floatingActions}>
           <button
            className={`${styles.iconButton} ${armed ? styles.iconButtonActive : ""}`}
            onClick={toggleAlarm}
            title={phase === "delayed" ? "Alarm is unavailable for ended tasks" : armed ? "Disable alarm" : "Enable alarm"}
            aria-label={phase === "delayed" ? "Alarm unavailable" : armed ? "Disable alarm" : "Enable alarm"}
            disabled={phase === "delayed"}
            >
            <BellIcon muted={!armed || phase === "delayed"} />
            </button>

            <button
              className={styles.iconButton}
              onClick={() => window.close()}
              title="Close"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>

          <h1 className={styles.title}>{task.title}</h1>

          {/* {task.note.trim() ? <p className={styles.noteText}>{task.note}</p> : null} */}

          <div className={styles.statusBlock}>
            <div className={styles.headline}>{clock.title}</div>
            <div className={styles.subline}>{clock.subline}</div>
          </div>

          <CountdownClock
            parts={clock.parts}
            label={clock.label}
            delayed={clock.delayed}
            done={clock.done}
          />

          <div className={styles.metaStack}>
            <div>Start · {formatDateTimeLong(task.startISO)}</div>
            <div>End · {formatDateTimeLong(task.endISO)}</div>
          </div>
        </div>
      </div>
    </main>
  );
}