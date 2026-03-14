"use client";

import React, { useEffect, useMemo, useState, useRef} from "react";
import PageShell from "@/components/PageShell";
import styles from "./CountdownTasks.module.css";

type TaskColor = "blue" | "pink" | "mint" | "gold" | "lavender";

type CountdownTask = {
  id: string;
  title: string;
  note: string;
  startISO: string;
  endISO: string;
  done: boolean;
  pinned: boolean;
  color: TaskColor;
  createdAtISO: string;
  updatedAtISO: string;
  completedAtISO?: string;
};

type CountdownTasksStateV1 = {
  v: 1;
  tool: "countdown-tasks";
  items: CountdownTask[];
  ui: {
    expandedIds: Record<string, boolean>;
  };
};

type EditDraft = {
  id?: string;
  title: string;
  note: string;
  startISO: string;
  endISO: string;
  done: boolean;
  pinned: boolean;
  color: TaskColor;
};

const LS_KEY = "eventclocks:countdown-tasks:v1";
const LS_EXPORT_SIG_KEY = "eventclocks:countdown-tasks:lastExportSig:v1";

const DEFAULT_STATE: CountdownTasksStateV1 = {
  v: 1,
  tool: "countdown-tasks",
  items: [],
  ui: {
    expandedIds: {},
  },
};

function isValidColor(v: unknown): v is TaskColor {
  return ["blue", "pink", "mint", "gold", "lavender"].includes(String(v));
}

function cryptoRandomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `task_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function nowISO() {
  return new Date().toISOString();
}

function sanitizeState(raw: any): CountdownTasksStateV1 {
  const items = Array.isArray(raw?.items)
    ? raw.items
        .map((it: any) => ({
          id: typeof it?.id === "string" ? it.id : cryptoRandomId(),
          title: typeof it?.title === "string" ? it.title : "",
          note: typeof it?.note === "string" ? it.note : "",
          startISO: typeof it?.startISO === "string" ? it.startISO : "",
          endISO: typeof it?.endISO === "string" ? it.endISO : "",
          done: !!it?.done,
          pinned: !!it?.pinned,
          color: isValidColor(it?.color) ? it.color : "blue",
          createdAtISO:
            typeof it?.createdAtISO === "string"
              ? it.createdAtISO
              : new Date().toISOString(),
          updatedAtISO:
            typeof it?.updatedAtISO === "string"
              ? it.updatedAtISO
              : new Date().toISOString(),
          completedAtISO:
            typeof it?.completedAtISO === "string" ? it.completedAtISO : undefined,
        }))
        .filter(
          (it: CountdownTask) => it.title.trim() && it.startISO && it.endISO
        )
    : [];

  return {
    v: 1,
    tool: "countdown-tasks",
    items,
    ui: {
      expandedIds:
        typeof raw?.ui?.expandedIds === "object" && raw?.ui?.expandedIds
          ? raw.ui.expandedIds
          : {},
    },
  };
}

function stableStringify(obj: any) {
  const allKeys: string[] = [];
  JSON.stringify(obj, (k, v) => (allKeys.push(k), v));
  allKeys.sort();
  return JSON.stringify(obj, allKeys);
}

function computeSignature(state: CountdownTasksStateV1) {
  return stableStringify(state);
}

function parseDateTimeLocal(value: string): Date | null {
  if (!value || typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function formatDateTimeLong(value: string) {
  const d = parseDateTimeLocal(value);
  if (!d) return "Invalid date";
  return d.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateTimeExact(value: string) {
  const d = parseDateTimeLocal(value);
  if (!d) return "Invalid date";
  return d.toLocaleString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function getTaskPhase(
  item: CountdownTask,
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

function getStatusText(item: CountdownTask, nowMs: number) {
  const phase = getTaskPhase(item, nowMs);

  if (phase === "done") return "Completed";
  if (phase === "upcoming") return `Starts ${relativeFromNow(item.startISO, nowMs)}`;
  if (phase === "active") return `Ends ${relativeFromNow(item.endISO, nowMs)}`;
  return `Delayed by ${relativePastOnly(item.endISO, nowMs)}`;
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

function getPrimaryCountdown(item: CountdownTask, nowMs: number) {
  const phase = getTaskPhase(item, nowMs);
  const end = parseDateTimeLocal(item.endISO)?.getTime() ?? 0;

  if (phase === "upcoming") {
    return {
      label: `Starts ${relativeFromNow(item.startISO, nowMs)}`,
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
      label: "Time left",
      parts: getCountdownPartsFromMs(end - nowMs),
      delayed: false,
      done: false,
    };
  }

  if (phase === "delayed") {
    return {
      label: `Delayed by ${relativePastOnly(item.endISO, nowMs)}`,
      parts: getCountdownPartsFromMs(nowMs - end),
      delayed: true,
      done: false,
    };
  }

  return {
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
}

function colorClass(color: TaskColor) {
  switch (color) {
    case "pink":
      return styles.pastelPink;
    case "mint":
      return styles.pastelMint;
    case "gold":
      return styles.pastelGold;
    case "lavender":
      return styles.pastelLavender;
    default:
      return styles.pastelBlue;
  }
}

function getStatusClass(item: CountdownTask, nowMs: number) {
  const phase = getTaskPhase(item, nowMs);
  if (phase === "done") return styles.statusDone;
  if (phase === "delayed") return styles.statusDelayed;
  if (phase === "active") return styles.statusActive;
  return styles.statusUpcoming;
}

function splitTaskGroups(items: CountdownTask[], nowMs: number) {
  const open = items.filter((it) => !it.done);
  const completed = items.filter((it) => it.done);

  open.sort((a, b) => {
    const aPhase = getTaskPhase(a, nowMs);
    const bPhase = getTaskPhase(b, nowMs);

    const phaseRank: Record<string, number> = {
      delayed: 0,
      active: 1,
      upcoming: 2,
      done: 3,
    };

    if (phaseRank[aPhase] !== phaseRank[bPhase]) {
      return phaseRank[aPhase] - phaseRank[bPhase];
    }

    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;

    if (aPhase === "delayed" || aPhase === "active") {
      const aEnd = parseDateTimeLocal(a.endISO)?.getTime() ?? 0;
      const bEnd = parseDateTimeLocal(b.endISO)?.getTime() ?? 0;
      return aEnd - bEnd;
    }

    const aStart = parseDateTimeLocal(a.startISO)?.getTime() ?? 0;
    const bStart = parseDateTimeLocal(b.startISO)?.getTime() ?? 0;
    return aStart - bStart;
  });

  completed.sort((a, b) => {
    const aCompleted = parseDateTimeLocal(a.completedAtISO || "")?.getTime() ?? 0;
    const bCompleted = parseDateTimeLocal(b.completedAtISO || "")?.getTime() ?? 0;

    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return bCompleted - aCompleted;
  });

  return { open, completed };
}

function downloadJson(filename: string, state: CountdownTasksStateV1) {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function readJsonFile(file: File): Promise<any> {
  const text = await file.text();
  return JSON.parse(text);
}

function encodeTaskForFocus(item: CountdownTask) {
  const payload = {
    id: item.id,
    title: item.title,
    note: item.note,
    startISO: item.startISO,
    endISO: item.endISO,
    done: item.done,
    color: item.color,
  };

  const json = JSON.stringify(payload);

  if (typeof window !== "undefined" && "btoa" in window) {
    return window.btoa(unescape(encodeURIComponent(json)));
  }

  return "";
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.trashSvg}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4.8c0-.7.5-1.3 1.2-1.3h5.6c.7 0 1.2.6 1.2 1.3V6" />
      <path d="M19 6l-1 13.2c-.1.8-.7 1.3-1.5 1.3H7.5c-.8 0-1.4-.5-1.5-1.3L5 6" />
      <path d="M10 10.2v6.5" />
      <path d="M14 10.2v6.5" />
    </svg>
  );
}

function PostItIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={styles.postItSvg}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4.5h7.5l3 3V19.5H7z" />
      <path d="M14.5 4.5V7.5h3" />
      <path d="M9.5 11h5" />
      <path d="M9.5 14h5" />
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
  item,
  nowMs,
}: {
  item: CountdownTask;
  nowMs: number;
}) {
  const primary = getPrimaryCountdown(item, nowMs);

  return (
    <div
      className={`${styles.clockWrap} ${
        primary.delayed ? styles.clockWrapDelayed : ""
      } ${primary.done ? styles.clockWrapDone : ""}`}
      aria-label={primary.label}
    >
      <div
        className={`${styles.clockLabelsInline} ${
          primary.delayed ? styles.clockLabelsInlineDelayed : ""
        }`}
      >
        {primary.label}
      </div>

      <div className={styles.clockRow}>
        <DigitTiles value={primary.parts.days} />
        <div className={styles.colon}>:</div>
        <DigitTiles value={primary.parts.hours} fixed />
        <div className={styles.colon}>:</div>
        <DigitTiles value={primary.parts.minutes} fixed />
        <div className={styles.colon}>:</div>
        <DigitTiles value={primary.parts.seconds} fixed />
      </div>
    </div>
  );
}

function EditModal({
  open,
  draft,
  setDraft,
  modalError,
  onClose,
  onSave,
}: {
  open: boolean;
  draft: EditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EditDraft>>;
  modalError: string;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open) return null;

  const colorOptions: Array<{
    value: TaskColor;
    label: string;
    className: string;
  }> = [
    { value: "blue", label: "Soft blue", className: styles.swatchBlue },
    { value: "pink", label: "Soft pink", className: styles.swatchPink },
    { value: "mint", label: "Soft mint", className: styles.swatchMint },
    { value: "gold", label: "Soft gold", className: styles.swatchGold },
    { value: "lavender", label: "Soft lavender", className: styles.swatchLavender },
  ];

  return (
    <div className={styles.modalBack}>
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            {draft.id ? "Edit task" : "Add task"}
          </div>
          <button className={styles.btn} type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.formGrid}>
          {modalError ? (
            <div className={styles.modalError} role="alert">
              {modalError}
            </div>
          ) : null}

          <label className={styles.label}>
            <div className={styles.labelText}>Task title</div>
            <input
              className={styles.input}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Send invites"
            />
          </label>

          <label className={styles.label}>
            <div className={styles.labelText}>Notes</div>
            <textarea
              className={styles.textarea}
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              placeholder="Optional task details"
            />
          </label>

          <div className={styles.twoCol}>
            <label className={styles.label}>
              <div className={styles.labelText}>Start date and time</div>
              <input
                className={styles.input}
                type="datetime-local"
                value={draft.startISO}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, startISO: e.target.value }))
                }
              />
            </label>

            <label className={styles.label}>
              <div className={styles.labelText}>End date and time</div>
              <input
                className={styles.input}
                type="datetime-local"
                value={draft.endISO}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, endISO: e.target.value }))
                }
              />
            </label>
          </div>

          <div className={styles.label}>
            <div className={styles.labelText}>Card color</div>

            <div className={styles.swatchRow}>
              {colorOptions.map((opt) => {
                const active = draft.color === opt.value;

                return (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.swatchButton} ${opt.className} ${
                      active ? styles.swatchButtonActive : ""
                    }`}
                    onClick={() => setDraft((d) => ({ ...d, color: opt.value }))}
                    aria-label={opt.label}
                    title={opt.label}
                  >
                    <span className={styles.swatchInner} />
                  </button>
                );
              })}
            </div>
          </div>

          <label className={`${styles.label} ${styles.checkboxRow}`}>
            <input
              type="checkbox"
              checked={draft.pinned}
              onChange={(e) => setDraft((d) => ({ ...d, pinned: e.target.checked }))}
            />
            <div className={styles.labelText}>Pin in its section</div>
          </label>

          <label className={`${styles.label} ${styles.checkboxRow}`}>
            <input
              type="checkbox"
              checked={draft.done}
              onChange={(e) => setDraft((d) => ({ ...d, done: e.target.checked }))}
            />
            <div className={styles.labelText}>Mark as done</div>
          </label>

          <div className={styles.helper}>
            Keep the main page simple, then use a focus window for the tasks you want
            to watch closely.
          </div>

          <div className={styles.actions}>
            <button className={styles.btn} type="button" onClick={onSave}>
              Save
            </button>
            <button className={styles.btn} type="button" onClick={onClose}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className={styles.modalBack}
      role="dialog"
      aria-modal="true"
      aria-labelledby="countdown-tasks-info-title"
    >
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <h2 id="countdown-tasks-info-title" className={styles.modalTitle}>
            About this tool
          </h2>

          <button className={styles.btn} type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.aboutContent}>
        <p>
            <strong>Countdown Tasks</strong> helps you track tasks with a start time and an
            end deadline.
        </p>

        <p>
            Before a task begins, the timer shows how long until it starts. Once the
            start time is reached, the countdown automatically switches to time
            remaining until the end.
        </p>

        <p>
            If the timer reaches zero and the task is not marked complete, it becomes
            <strong> delayed</strong> and stays at the top until you mark it done or
            delete it.
        </p>

        <p>
            For tasks you want to monitor more closely, you can open a detached
            <strong> Focus Window</strong>. It keeps a single countdown visible in a
            clean sticky-note style view using the same task color.
        </p>

        <p>
            Your tasks are stored locally in your browser on this device. To keep a
  copy, you can <strong>save a backup</strong> or restore tasks using JSON.
        </p>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({
  item,
  onCancel,
  onConfirm,
}: {
  item: CountdownTask | null;
  onCancel: () => void;
  onConfirm: (id: string) => void;
}) {
  if (!item) return null;

  return (
    <div className={styles.modalBack}>
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>Delete task?</div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.helper}>
            This will permanently remove “{item.title}”.
          </div>

          <div className={styles.actions}>
            <button className={styles.btn} type="button" onClick={onCancel}>
              Cancel
            </button>
            <button
              className={`${styles.btn} ${styles.btnDanger}`}
              type="button"
              onClick={() => onConfirm(item.id)}
            >
              Yes, delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  expandedIds,
  nowMs,
  onToggleExpanded,
  onTogglePin,
  onToggleDone,
  onEdit,
  onAskDelete,
  onOpenFocusWindow,
}: {
  title: string;
  items: CountdownTask[];
  expandedIds: Record<string, boolean>;
  nowMs: number;
  onToggleExpanded: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleDone: (id: string) => void;
  onEdit: (item: CountdownTask) => void;
  onAskDelete: (item: CountdownTask) => void;
  onOpenFocusWindow: (item: CountdownTask) => void;
}) {
  if (items.length === 0) return null;

  return (
    <section className={styles.wrap}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionTitleWrap}>
          <div className={styles.sectionTitle}>{title}</div>
          <div className={styles.sectionRule} />
        </div>
        <span className={styles.sectionBadge}>{items.length}</span>
      </div>

      {items.map((item) => {
        const expanded = !!expandedIds[item.id];
        const phase = getTaskPhase(item, nowMs);
        const statusClass = getStatusClass(item, nowMs);
        const focusDisabled = phase === "delayed";

        return (
          <div
            key={item.id}
            className={`${styles.card} ${colorClass(item.color)} ${
              phase === "delayed" ? styles.cardDelayed : ""
            } ${phase === "done" ? styles.cardDone : ""}`}
          >
            <div className={styles.row}>
              <div className={styles.rowLeft}>
                <label
                  className={styles.doneCheckboxWrap}
                  aria-label={item.done ? "Mark task not done" : "Mark task done"}
                  title={item.done ? "Mark not done" : "Mark task done"}
                >
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => onToggleDone(item.id)}
                    className={styles.doneCheckbox}
                  />
                </label>

                <button
                  className={styles.chevron}
                  type="button"
                  onClick={() => onToggleExpanded(item.id)}
                  aria-label={expanded ? "Collapse details" : "Expand details"}
                  aria-expanded={expanded}
                  title={expanded ? "Collapse" : "Expand details"}
                >
                  {expanded ? "▾" : "▸"}
                </button>

                <div className={styles.rowMain}>
                  <div className={styles.titleRow}>
                    <div className={styles.title}>{item.title}</div>

                    <button
                      type="button"
                      onClick={() => onTogglePin(item.id)}
                      className={
                        item.pinned ? styles.pinIconButton : styles.pinTextButton
                      }
                      aria-label={item.pinned ? "Unpin task" : "Pin task"}
                      title={item.pinned ? "Unpin task" : "Pin task"}
                    >
                      {item.pinned ? "📌" : "Pin"}
                    </button>
                  </div>

                  <div className={styles.meta}>
                    <span>Start: {formatDateTimeLong(item.startISO)}</span>
                    <span>•</span>
                    <span>End: {formatDateTimeLong(item.endISO)}</span>
                    <span>•</span>
                    <span className={statusClass}>{getStatusText(item, nowMs)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.clockCol}>
                <CountdownClock item={item} nowMs={nowMs} />
              </div>

              <div className={styles.iconCol}>
                <button
                    type="button"
                    className={styles.postItButton}
                    onClick={() => onOpenFocusWindow(item)}
                    aria-label={`Open focus window for ${item.title}`}
                    title={focusDisabled ? "Focus window is only available before or during the task" : "Open focus window"}
                    disabled={focusDisabled}
                    >
                    <PostItIcon />
                </button>

                <button
                  type="button"
                  className={styles.trashButton}
                  onClick={() => onAskDelete(item)}
                  aria-label={`Delete ${item.title}`}
                  title="Delete task"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>

            {expanded ? (
              <div className={styles.details}>
                {item.note.trim() ? (
                  <div className={styles.noteBox}>{item.note}</div>
                ) : (
                  <div className={styles.detailMeta}>No details added.</div>
                )}

                <div className={styles.detailMeta}>
                  <div>
                    <strong>Start:</strong> {formatDateTimeExact(item.startISO)}
                  </div>
                  <div>
                    <strong>End:</strong> {formatDateTimeExact(item.endISO)}
                  </div>
                  <div>
                    <strong>Status:</strong> {getStatusText(item, nowMs)}
                  </div>
                </div>

                <div className={styles.detailActions}>
                  <button className={styles.btn} type="button" onClick={() => onEdit(item)}>
                    Edit
                  </button>
                    <button
                    className={styles.btn}
                    type="button"
                    onClick={() => onOpenFocusWindow(item)}
                    disabled={focusDisabled}
                    title={focusDisabled ? "Focus window is only available before or during the task" : "Open Focus Window"}
                    >
                    Open Focus Window
                    </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </section>
  );
}

export default function CountdownTasksClient() {
  const [state, setState] = useState<CountdownTasksStateV1>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [toast, setToast] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [modalError, setModalError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CountdownTask | null>(null);
  const [draft, setDraft] = useState<EditDraft>({
    title: "",
    note: "",
    startISO: "",
    endISO: "",
    done: false,
    pinned: false,
    color: "blue",
  });
  const [lastExportSig, setLastExportSig] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        setState(sanitizeState(JSON.parse(raw)));
      }
    } catch {
      setState(DEFAULT_STATE);
    }

    try {
      setLastExportSig(localStorage.getItem(LS_EXPORT_SIG_KEY) || "");
    } catch {}

    setNowMs(Date.now());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch {}
  }, [mounted, state]);

  useEffect(() => {
    if (!mounted) return;

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
  }, [mounted]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const currentSig = useMemo(() => computeSignature(state), [state]);
  const isExportCurrent = useMemo(
    () => !!lastExportSig && lastExportSig === currentSig,
    [lastExportSig, currentSig]
  );

  const { open, completed } = useMemo(
    () => splitTaskGroups(state.items, nowMs),
    [state.items, nowMs]
  );

  function makeLocalDateTimeValue(date: Date) {
    return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
      date.getDate()
    )}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  }

    function openFocusWindow(item: CountdownTask) {
    const phase = getTaskPhase(item, Date.now());

    if (phase === "delayed") {
        setToast("Focus window is only available before or during the task.");
        return;
    }

    try {
        const encoded = encodeTaskForFocus(item);
        const url = `/countdown-tasks/focus?payload=${encodeURIComponent(encoded)}`;
        const win = window.open(
        url,
        "_blank",
        "popup=yes,width=380,height=230,resizable=yes,scrollbars=no"
        );

        if (!win) {
        setToast("Popup blocked. Please allow popups for this site.");
        return;
        }

        win.focus();
    } catch {
        setToast("Could not open focus window.");
    }
    }

  function openAdd() {
    setModalError("");

    const start = new Date();
    start.setMinutes(start.getMinutes() + 30);

    const end = new Date(start.getTime());
    end.setHours(end.getHours() + 1);

    setDraft({
      title: "",
      note: "",
      startISO: makeLocalDateTimeValue(start),
      endISO: makeLocalDateTimeValue(end),
      done: false,
      pinned: false,
      color: "blue",
    });

    setModalOpen(true);
  }

  function openEdit(item: CountdownTask) {
    setModalError("");
    setDraft({
      id: item.id,
      title: item.title,
      note: item.note,
      startISO: item.startISO,
      endISO: item.endISO,
      done: item.done,
      pinned: item.pinned,
      color: item.color,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalError("");
    setModalOpen(false);
  }

  function saveDraft() {
    const title = draft.title.trim();
    const start = parseDateTimeLocal(draft.startISO);
    const end = parseDateTimeLocal(draft.endISO);

    setModalError("");

    if (!title) {
      setModalError("Title is required.");
      return;
    }

    if (!start || !end) {
      setModalError("Valid start and end dates are required.");
      return;
    }

    if (end.getTime() <= start.getTime()) {
      setModalError("End date must be after start date.");
      return;
    }

    if (draft.id) {
      setState((s) =>
        sanitizeState({
          ...s,
          items: s.items.map((it) =>
            it.id === draft.id
              ? {
                  ...it,
                  title,
                  note: draft.note,
                  startISO: draft.startISO,
                  endISO: draft.endISO,
                  done: draft.done,
                  pinned: draft.pinned,
                  color: draft.color,
                  updatedAtISO: nowISO(),
                  completedAtISO: draft.done
                    ? it.completedAtISO || nowISO()
                    : undefined,
                }
              : it
          ),
        })
      );
      setToast("Updated.");
    } else {
      const completedAtISO = draft.done ? nowISO() : undefined;

      const item: CountdownTask = {
        id: cryptoRandomId(),
        title,
        note: draft.note,
        startISO: draft.startISO,
        endISO: draft.endISO,
        done: draft.done,
        pinned: draft.pinned,
        color: draft.color,
        createdAtISO: nowISO(),
        updatedAtISO: nowISO(),
        completedAtISO,
      };

      setState((s) =>
        sanitizeState({
          ...s,
          items: [item, ...s.items],
          ui: {
            ...s.ui,
            expandedIds: { ...s.ui.expandedIds, [item.id]: false },
          },
        })
      );
      setToast("Added.");
    }

    setModalOpen(false);
    setModalError("");
  }

  function toggleExpanded(id: string) {
    setState((s) =>
      sanitizeState({
        ...s,
        ui: {
          ...s.ui,
          expandedIds: {
            ...s.ui.expandedIds,
            [id]: !s.ui.expandedIds[id],
          },
        },
      })
    );
  }

  function togglePin(id: string) {
    setState((s) =>
      sanitizeState({
        ...s,
        items: s.items.map((it) =>
          it.id === id ? { ...it, pinned: !it.pinned, updatedAtISO: nowISO() } : it
        ),
      })
    );
  }

  function toggleDone(id: string) {
    setState((s) =>
      sanitizeState({
        ...s,
        items: s.items.map((it) =>
          it.id === id
            ? {
                ...it,
                done: !it.done,
                updatedAtISO: nowISO(),
                completedAtISO: !it.done ? nowISO() : undefined,
              }
            : it
        ),
      })
    );
    setToast("Updated.");
  }

  function deleteItem(id: string) {
    setState((s) =>
      sanitizeState({
        ...s,
        items: s.items.filter((it) => it.id !== id),
        ui: {
          ...s.ui,
          expandedIds: Object.fromEntries(
            Object.entries(s.ui.expandedIds).filter(([k]) => k !== id)
          ),
        },
      })
    );
    setDeleteTarget(null);
    setToast("Deleted.");
  }

  function exportTasks() {
    downloadJson("eventclocks-countdown-tasks.json", state);
    const sig = computeSignature(state);
    setLastExportSig(sig);
    try {
      localStorage.setItem(LS_EXPORT_SIG_KEY, sig);
    } catch {}
    setToast("Saved.");
  }

  async function importTasks(file: File) {
    try {
        const parsed = await readJsonFile(file);

        if (parsed?.tool !== "countdown-tasks") {
        throw new Error("Invalid backup file.");
        }

        const nextState = sanitizeState(parsed);
        setState(nextState);

        setLastExportSig("");
        try {
        localStorage.setItem(LS_EXPORT_SIG_KEY, "");
        } catch {}

        setToast("Backup restored.");
    } catch (err: any) {
        console.error("Import error:", err);
        setToast(err?.message || "Restore failed.");
    }
    }

  function resetEverything() {
    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_EXPORT_SIG_KEY);
    } catch {}
    setState(DEFAULT_STATE);
    setLastExportSig("");
    setShowResetConfirm(false);
    setToast("Reset.");
  }
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <PageShell
      title="Countdown Tasks"
      subtitle="Track tasks with start windows, deadlines, live countdowns, delayed status, and optional detached focus windows."
    >
      <main className="mx-auto max-w-5xl px-6 py-6">
        <section aria-hidden="true" className="sr-only">
          <h2>About Countdown Tasks</h2>
          <p>
            Countdown Tasks is a local browser-based tool for tracking tasks with
            a start date and an end deadline.
          </p>
          <ul>
            <li>Before the task starts, it shows how long until the task begins.</li>
            <li>After the task starts, it shows time remaining until the deadline.</li>
            <li>If the deadline passes before completion, the task becomes delayed.</li>
            <li>Delayed tasks stay at the top until marked done or deleted.</li>
            <li>Focus windows open in separate draggable popup windows.</li>
          </ul>
        </section>

        <div className={styles.wrap}>
          <div className={styles.topBar}>
            <div className={styles.actions}>
              <button className={styles.btn} type="button" onClick={openAdd}>
                + Add task
              </button>

              <button className={styles.btn} type="button" onClick={exportTasks}>
                Save Backup
              </button>

              <button
                className={styles.btn}
                type="button"
                onClick={() => fileInputRef.current?.click()}
                >
                Restore Backup
              </button>

              <button
                className={`${styles.btn} ${styles.btnDanger}`}
                type="button"
                onClick={() => setShowResetConfirm(true)}
              >
                Reset
              </button>

              <input
                ref={fileInputRef}
                id="countdown-import-input"
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                    const input = e.target as HTMLInputElement;
                    const file = input.files?.[0] ?? null;

                    // Clear immediately so the same file can be selected again later
                    input.value = "";

                    if (!file) return;

                    try {
                    await importTasks(file);
                    } catch (err) {
                    console.error("Restore failed:", err);
                    setToast("Restore failed.");
                    }
                }}
                />
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => setInfoOpen(true)}
                className={styles.infoButton}
                aria-label="Info about this tool"
                title="About this tool"
              >
                i
              </button>

              {!isExportCurrent && state.items.length > 0 ? (
                <span className={styles.badge}>Not saved</span>
              ) : null}

              {toast ? <span className={styles.badge}>{toast}</span> : null}
            </div>
          </div>

          {/* <div className={styles.helperBanner}>
            Keep the main page simple. Open a Focus Window for tasks you want to
            watch on another screen.
          </div> */}

          {state.items.length === 0 ? (
            <div className={styles.card}>
              <div className={styles.empty}>
                No tasks yet. Add one to get started.
              </div>
            </div>
          ) : (
            <>
              <Section
                title="Open Tasks"
                items={open}
                expandedIds={state.ui.expandedIds}
                nowMs={nowMs}
                onToggleExpanded={toggleExpanded}
                onTogglePin={togglePin}
                onToggleDone={toggleDone}
                onEdit={openEdit}
                onAskDelete={setDeleteTarget}
                onOpenFocusWindow={openFocusWindow}
              />

              <Section
                title="Completed"
                items={completed}
                expandedIds={state.ui.expandedIds}
                nowMs={nowMs}
                onToggleExpanded={toggleExpanded}
                onTogglePin={togglePin}
                onToggleDone={toggleDone}
                onEdit={openEdit}
                onAskDelete={setDeleteTarget}
                onOpenFocusWindow={openFocusWindow}
              />
            </>
          )}
        </div>

        <EditModal
          open={modalOpen}
          draft={draft}
          setDraft={setDraft}
          modalError={modalError}
          onClose={closeModal}
          onSave={saveDraft}
        />

        <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

        <DeleteConfirmModal
          item={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={deleteItem}
        />

        {showResetConfirm ? (
          <div className={styles.modalBack}>
            <div className={styles.modalCard}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>Reset countdown tasks?</div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.helper}>
                  This clears the saved tasks on this device. Export first if you
                  want a backup.
                </div>

                <div className={styles.actions}>
                  <button
                    className={styles.btn}
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    type="button"
                    onClick={resetEverything}
                  >
                    Yes, reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </PageShell>
  );
}