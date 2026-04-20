"use client";

import { useEffect, useState } from "react";
import styles from "@/app/today/today.module.css";

type Props = {
  targetIso: string | null;
  label?: string;
};

type CountdownParts = {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  isPast: boolean;
};

function pad2(value: number) {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

function getParts(targetIso: string, nowMs: number): CountdownParts | null {
  const targetMs = new Date(targetIso).getTime();
  if (!Number.isFinite(targetMs)) return null;

  let diff = Math.floor(Math.abs(targetMs - nowMs) / 1000);
  const days = Math.floor(diff / 86_400);
  diff -= days * 86_400;
  const hours = Math.floor(diff / 3_600);
  diff -= hours * 3_600;
  const minutes = Math.floor(diff / 60);
  const seconds = diff - minutes * 60;

  return {
    days: String(days),
    hours: pad2(hours),
    minutes: pad2(minutes),
    seconds: pad2(seconds),
    isPast: targetMs < nowMs,
  };
}

function TileGroup({ value, fixed = false }: { value: string; fixed?: boolean }) {
  const digits = fixed ? value.padStart(2, "0").split("") : value.split("");

  return (
    <span
      className={`${styles.clockDigits} ${
        fixed ? styles.clockDigitsFixed : styles.clockDigitsDays
      }`}
    >
      {digits.map((digit, index) => (
        <span
          key={`${digit}-${index}`}
          className={styles.clockTile}
        >
          {digit}
        </span>
      ))}
    </span>
  );
}

export default function LiveCountdownTiles({ targetIso, label }: Props) {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setNowMs(Date.now()), 0);
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(interval);
    };
  }, []);

  if (!targetIso) return null;

  const parts = nowMs === null ? null : getParts(targetIso, nowMs);
  if (!parts) return null;

  return (
    <div className={styles.clock} aria-label={label}>
      {label && (
        <p className={styles.clockLabel}>
          {parts.isPast ? "Started" : label}
        </p>
      )}
      <div className={styles.clockRow}>
        <div className={styles.clockUnit}>
          <TileGroup value={parts.days} />
          <div className={styles.clockUnitLabel}>
            days
          </div>
        </div>
        <span className={styles.clockSeparator}>
          :
        </span>
        <div className={styles.clockUnit}>
          <TileGroup value={parts.hours} fixed />
          <div className={styles.clockUnitLabel}>
            hrs
          </div>
        </div>
        <span className={styles.clockSeparator}>
          :
        </span>
        <div className={styles.clockUnit}>
          <TileGroup value={parts.minutes} fixed />
          <div className={styles.clockUnitLabel}>
            min
          </div>
        </div>
        <span className={styles.clockSeparator}>
          :
        </span>
        <div className={styles.clockUnit}>
          <TileGroup value={parts.seconds} fixed />
          <div className={styles.clockUnitLabel}>
            sec
          </div>
        </div>
      </div>
    </div>
  );
}
