"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "@/components/PageShell";
import styles from "./CountdownNotes.module.css";

type CountdownNote = {
  id: string;
  title: string;
  note: string;
  targetISO: string;
  pinned: boolean;
  color: "blue" | "pink" | "mint" | "gold" | "lavender";
  createdAtISO: string;
  updatedAtISO: string;
};

type CountdownNotesStateV1 = {
  v: 1;
  tool: "countdown-notes";
  items: CountdownNote[];
  ui: {
    expandedIds: Record<string, boolean>;
  };
};

type EditDraft = {
  id?: string;
  title: string;
  note: string;
  targetISO: string;
  pinned: boolean;
  color: CountdownNote["color"];
};

const LS_KEY = "eventclocks:countdown-notes:v1";
const LS_EXPORT_SIG_KEY = "eventclocks:countdown-notes:lastExportSig:v1";

const DEFAULT_STATE: CountdownNotesStateV1 = {
  v: 1,
  tool: "countdown-notes",
  items: [],
  ui: {
    expandedIds: {},
  },
};

function sanitizeState(raw: any): CountdownNotesStateV1 {
  const base = DEFAULT_STATE;

  const items = Array.isArray(raw?.items)
    ? raw.items
        .map((it: any) => ({
          id: typeof it?.id === "string" ? it.id : cryptoRandomId(),
          title: typeof it?.title === "string" ? it.title : "",
          note: typeof it?.note === "string" ? it.note : "",
          targetISO: typeof it?.targetISO === "string" ? it.targetISO : "",
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
        }))
        .filter((it: CountdownNote) => it.title.trim() && it.targetISO)
    : [];

  return {
    ...base,
    ...raw,
    items,
    ui: {
      expandedIds:
        typeof raw?.ui?.expandedIds === "object" && raw?.ui?.expandedIds
          ? raw.ui.expandedIds
          : {},
    },
  };
}

function isValidColor(v: any): v is CountdownNote["color"] {
  return ["blue", "pink", "mint", "gold", "lavender"].includes(v);
}

function cryptoRandomId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `note_${Math.random().toString(36).slice(2, 10)}`;
  }
}

function nowISO() {
  return new Date().toISOString();
}

function stableStringify(obj: any) {
  const allKeys: string[] = [];
  JSON.stringify(obj, (k, v) => (allKeys.push(k), v));
  allKeys.sort();
  return JSON.stringify(obj, allKeys);
}

function computeSignature(state: CountdownNotesStateV1) {
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

function relativeLabel(targetISO: string, nowMs: number) {
  const d = parseDateTimeLocal(targetISO);
  if (!d) return "Invalid date";

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

function getStatusClass(targetISO: string, nowMs: number) {
  const d = parseDateTimeLocal(targetISO);
  if (!d) return "";
  if (d.getTime() < nowMs) return styles.statusPast;
  if (d.getTime() - nowMs <= 3 * 86_400_000) return styles.statusSoon;
  return styles.statusFuture;
}

function splitTarget(targetISO: string) {
  const raw = targetISO || "";
  const [date = "", time = ""] = raw.split("T");
  return { date, time };
}

function combineDateTimeLocal(date: string, time: string) {
  return date && time ? `${date}T${time}` : "";
}

function pad2(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

function getCountdownParts(targetISO: string, nowMs: number) {
  const d = parseDateTimeLocal(targetISO);
  if (!d) {
    return { days: "0", hours: "00", minutes: "00", seconds: "00", isPast: false };
  }

  let diff = Math.floor(Math.abs(d.getTime() - nowMs) / 1000);
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
    isPast: d.getTime() < nowMs,
  };
}

function colorClass(color: CountdownNote["color"]) {
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

function splitGroups(items: CountdownNote[], nowMs: number) {
  const upcoming = items.filter((it) => {
    const t = parseDateTimeLocal(it.targetISO)?.getTime() ?? 0;
    return t >= nowMs;
  });

  const expired = items.filter((it) => {
    const t = parseDateTimeLocal(it.targetISO)?.getTime() ?? 0;
    return t < nowMs;
  });

  upcoming.sort((a, b) => {
    const aTime = parseDateTimeLocal(a.targetISO)?.getTime() ?? 0;
    const bTime = parseDateTimeLocal(b.targetISO)?.getTime() ?? 0;

    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return aTime - bTime;
  });

  expired.sort((a, b) => {
    const aTime = parseDateTimeLocal(a.targetISO)?.getTime() ?? 0;
    const bTime = parseDateTimeLocal(b.targetISO)?.getTime() ?? 0;

    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return bTime - aTime;
  });

  return { upcoming, expired };
}

function downloadJson(filename: string, state: CountdownNotesStateV1) {
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
        <div key={`${ch}-${idx}`} className={styles.tile}>
          {ch}
        </div>
      ))}
    </div>
  );
}

function CountdownClock({
  targetISO,
  nowMs,
}: {
  targetISO: string;
  nowMs: number;
}) {
  const parts = getCountdownParts(targetISO, nowMs);

  return (
    <div
      className={styles.clockWrap}
      aria-label={parts.isPast ? "Time since target" : "Time until target"}
    >
      <div className={styles.clockLabelsInline}>
        DAYS : HOURS : MINUTES : SECONDS
        </div>

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

function EditModal({
  open,
  draft,
  setDraft,
  onClose,
  onSave,
}: {
  open: boolean;
  draft: EditDraft;
  setDraft: React.Dispatch<React.SetStateAction<EditDraft>>;
  onClose: () => void;
  onSave: () => void;
}) {
  if (!open) return null;

  const colorOptions: Array<{
    value: CountdownNote["color"];
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
            {draft.id ? "Edit countdown note" : "Add countdown note"}
          </div>
          <button className={styles.btn} type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.formGrid}>
          <label className={styles.label}>
            <div className={styles.labelText}>Title</div>
            <input
              className={styles.input}
              value={draft.title}
              onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
              placeholder="Passport renewal"
            />
          </label>

          <label className={styles.label}>
            <div className={styles.labelText}>Note</div>
            <textarea
              className={styles.textarea}
              value={draft.note}
              onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
              placeholder="Optional details"
            />
          </label>

          <label className={styles.label}>
            <div className={styles.labelText}>Date and time</div>
            <input
              className={styles.input}
              type="datetime-local"
              value={draft.targetISO}
              onChange={(e) => setDraft((d) => ({ ...d, targetISO: e.target.value }))}
            />
          </label>

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

          <label
            className={styles.label}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <input
              type="checkbox"
              checked={draft.pinned}
              onChange={(e) => setDraft((d) => ({ ...d, pinned: e.target.checked }))}
            />
            <div className={styles.labelText} style={{ margin: 0 }}>
              Pin in its section
            </div>
          </label>

          <div className={styles.helper}>
            Pinned items stay first within Upcoming or Expired.
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
      aria-labelledby="countdown-notes-info-title"
    >
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <h2 id="countdown-notes-info-title" className={styles.modalTitle}>
            About this tool
          </h2>

          <button className={styles.btn} type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className={styles.aboutContent}>
          <p>
            <strong>Countdown Notes</strong> is a simple <strong>countdown timer and reminder tool</strong> that lets you attach notes to important dates and times. Watch the <strong>live countdown</strong> update for birthdays, deadlines, travel dates, and personal reminders.
          </p>

          <p>
            Upcoming countdowns appear first so you can focus on the next event. Expired notes are grouped below so past reminders stay accessible without cluttering active countdowns.
          </p>

          <p>
            Your data is stored locally in your browser on this device. You can export your countdown notes as a JSON backup and import them later.
          </p>
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
  onEdit,
  onDelete,
}: {
  title: string;
  items: CountdownNote[];
  expandedIds: Record<string, boolean>;
  nowMs: number;
  onToggleExpanded: (id: string) => void;
  onTogglePin: (id: string) => void;
  onEdit: (item: CountdownNote) => void;
  onDelete: (id: string) => void;
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
        const statusClass = getStatusClass(item.targetISO, nowMs);

        return (
          <div key={item.id} className={`${styles.card} ${colorClass(item.color)}`}>
            <div className={styles.row}>
              <div className={styles.rowLeft}>
                <button
                  className={styles.chevron}
                  type="button"
                  onClick={() => onToggleExpanded(item.id)}
                  aria-label={expanded ? "Collapse details" : "Expand details"}
                  aria-expanded={expanded}
                  title={expanded ? "Collapse" : "Expand"}
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
                      aria-label={item.pinned ? "Unpin note" : "Pin note"}
                      title={item.pinned ? "Unpin" : "Pin"}
                    >
                      {item.pinned ? "📌" : "Pin"}
                    </button>
                  </div>

                  <div className={styles.meta}>
                    <span>{formatDateTimeLong(item.targetISO)}</span>
                    <span>•</span>
                    <span className={statusClass}>{relativeLabel(item.targetISO, nowMs)}</span>
                  </div>
                </div>
              </div>

              <div className={styles.rowRight}>
                <CountdownClock targetISO={item.targetISO} nowMs={nowMs} />
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
                    <strong>Exact target:</strong> {formatDateTimeExact(item.targetISO)}
                  </div>
                  <div>
                    <strong>Status:</strong> {relativeLabel(item.targetISO, nowMs)}
                  </div>
                </div>

                <div className={styles.detailActions}>
                  <button className={styles.btn} type="button" onClick={() => onEdit(item)}>
                    Edit
                  </button>

                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    type="button"
                    onClick={() => onDelete(item.id)}
                  >
                    Delete
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

export default function CountdownNotesClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [state, setState] = useState<CountdownNotesStateV1>(DEFAULT_STATE);
  const [mounted, setMounted] = useState(false);
  const [nowMs, setNowMs] = useState(0);
  const [toast, setToast] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [draft, setDraft] = useState<EditDraft>({
    title: "",
    note: "",
    targetISO: "",
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

    let interval: any = null;
    let timeout: any = null;

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
    const t = window.setTimeout(() => setToast(""), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const currentSig = useMemo(() => computeSignature(state), [state]);
  const isExportCurrent = useMemo(
    () => !!lastExportSig && lastExportSig === currentSig,
    [lastExportSig, currentSig]
  );

  const { upcoming, expired } = useMemo(
    () => splitGroups(state.items, nowMs),
    [state.items, nowMs]
  );

  function openAdd() {
    const d = new Date();
    d.setMinutes(d.getMinutes() + 30);
    const iso = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(
      d.getDate()
    )}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

    setDraft({
      title: "",
      note: "",
      targetISO: iso,
      pinned: false,
      color: "blue",
    });
    setModalOpen(true);
  }

  function openEdit(item: CountdownNote) {
    setDraft({
      id: item.id,
      title: item.title,
      note: item.note,
      targetISO: item.targetISO,
      pinned: item.pinned,
      color: item.color,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  function saveDraft() {
    const title = draft.title.trim();
    const target = draft.targetISO;

    if (!title) {
      setToast("Title is required.");
      return;
    }

    if (!parseDateTimeLocal(target)) {
      setToast("Valid date and time required.");
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
                  targetISO: target,
                  pinned: draft.pinned,
                  color: draft.color,
                  updatedAtISO: nowISO(),
                }
              : it
          ),
        })
      );
      setToast("Updated.");
    } else {
      const item: CountdownNote = {
        id: cryptoRandomId(),
        title,
        note: draft.note,
        targetISO: target,
        pinned: draft.pinned,
        color: draft.color,
        createdAtISO: nowISO(),
        updatedAtISO: nowISO(),
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
    setToast("Deleted.");
  }

  function exportNotes() {
    downloadJson("eventclocks-countdown-notes.json", state);
    const sig = computeSignature(state);
    setLastExportSig(sig);
    try {
      localStorage.setItem(LS_EXPORT_SIG_KEY, sig);
    } catch {}
    setToast("Exported.");
  }

  async function importNotes(file: File) {
    try {
      const parsed = await readJsonFile(file);
      if (parsed?.tool !== "countdown-notes") throw new Error("Invalid file.");
      setState(sanitizeState(parsed));
      setLastExportSig("");
      try {
        localStorage.setItem(LS_EXPORT_SIG_KEY, "");
      } catch {}
      setToast("Imported.");
    } catch (err: any) {
      setToast(err?.message || "Import failed.");
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

  return (
    <PageShell
      title="Countdown Notes"
      subtitle="Attach notes to moments in time and watch the countdowns live."
    >
      <main className="mx-auto max-w-5xl px-6 py-6">
        <header className="mb-2">
          <div className="flex items-start justify-between gap-2">
            
          </div>
        </header>

        <section aria-hidden="true" className="sr-only">
          <h2>About Countdown Notes</h2>
          <p>
            Countdown Notes is a local browser-based tool for saving short notes tied
            to exact dates and times.
          </p>
          <ul>
            <li>Upcoming countdown notes are shown separately from expired ones.</li>
            <li>Pinned items stay first within their section.</li>
            <li>Each note shows a live days, hours, minutes, and seconds countdown.</li>
            <li>Data is stored locally in the browser and can be exported or imported as JSON.</li>
          </ul>
        </section>

        <div className={styles.wrap}>
          <div className={styles.topBar}>
            <div className={styles.actions}>
              <button className={styles.btn} type="button" onClick={openAdd}>
                + Add note
              </button>

              <button className={styles.btn} type="button" onClick={exportNotes}>
                Export
              </button>

              <button
                className={styles.btn}
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Import
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
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  await importNotes(f);
                  e.target.value = "";
                }}
              />
            </div>

            <div className={styles.actions}>
              <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="mt-1 inline-flex items-center justify-center rounded-full border border-black/15 bg-transparent text-[10px] font-bold text-black/60 shadow-sm hover:text-black/80 dark:border-white/15 dark:text-white/60 dark:hover:text-white/85"
              style={{
                fontSize: 13,
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
            </button>

              {!isExportCurrent && state.items.length > 0 ? (
                <span className={styles.badge}>Not exported</span>
              ) : null}
              {toast ? <span className={styles.badge}>{toast}</span> : null}

              
            </div>
          </div>

          {state.items.length === 0 ? (
            <div className={styles.card}>
              <div className={styles.empty}>
                No countdown notes yet. Add one to get started.
              </div>
            </div>
          ) : (
            <>
              <Section
                title="Upcoming"
                items={upcoming}
                expandedIds={state.ui.expandedIds}
                nowMs={nowMs}
                onToggleExpanded={toggleExpanded}
                onTogglePin={togglePin}
                onEdit={openEdit}
                onDelete={deleteItem}
              />

              <Section
                title="Expired"
                items={expired}
                expandedIds={state.ui.expandedIds}
                nowMs={nowMs}
                onToggleExpanded={toggleExpanded}
                onTogglePin={togglePin}
                onEdit={openEdit}
                onDelete={deleteItem}
              />
            </>
          )}
        </div>

        <EditModal
          open={modalOpen}
          draft={draft}
          setDraft={setDraft}
          onClose={closeModal}
          onSave={saveDraft}
        />

        <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

        {showResetConfirm ? (
          <div className={styles.modalBack}>
            <div className={styles.modalCard}>
              <div className={styles.modalHeader}>
                <div className={styles.modalTitle}>Reset countdown notes?</div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.helper}>
                  This clears the saved countdown notes on this device. Export first
                  if you want a backup.
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