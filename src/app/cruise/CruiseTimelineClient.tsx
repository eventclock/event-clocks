"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "@/components/PageShell";
import styles from "./cruise-ui.module.css";

type CruisePlanStateV1 = {
  v: 1;
  tool: "cruise-plan";

  sailingDateISO: string; // YYYY-MM-DD
  cruiseLengthDays: number;
  portCity?: string;

  // ---- Profile toggles (DO NOT DELETE) ----
  isFirstTime: boolean;
  isInternational: boolean;
  flyingToPort: boolean;
  hasKids: boolean;

  checklist: Record<string, { checked?: boolean; remark?: string }>;

  ui: {
    expandedTasks: Record<string, boolean>;
    calendarMonthISO: string; // YYYY-MM-01 (left month)
    showCompleted: boolean;

    showHowTo: boolean;
    showAbout: boolean;

    showCalendar: boolean;
  };
};

type CruiseToggleContext = {
  isFirstTime: boolean;
  isInternational: boolean;
  flyingToPort: boolean;
  hasKids: boolean;
};

type TaskCategory =
  | "reservations"
  | "travel"
  | "documents"
  | "payments"
  | "packing"
  | "embarkation";

type PlanTask = {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;

  recommendedOffsetDays: number;
  windowStartDays?: number;
  windowEndDays?: number;

  checklistItems: string[];
  appliesIf?: (ctx: CruiseToggleContext) => boolean;
};

type ComputedTask = {
  task: PlanTask;
  doBy: Date;
  daysUntil: number;
  inWindow: boolean;
  urgency: "overdue" | "inRange" | "soon" | "later";
};

const LS_KEY = "eventclocks:cruise-plan:v1";
const LS_EXPORT_SIG_KEY = "eventclocks:cruise-plan:lastExportSig:v1";

const DEFAULT_DESCRIPTION =
  "Tasks are sorted by Do-by date. Expand tasks to check off items and add remarks. Export for a portable backup.";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDays(d: Date, days: number) {
  const out = new Date(d);
  out.setDate(out.getDate() + days);
  return out;
}
function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function parseISODateLocal(iso: string) {
  const [y, m, d] = (iso || "").split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function toMonthISO(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}-01`;
}
function parseMonthISO(iso: string) {
  return parseISODateLocal(iso);
}
function formatDateLong(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
function daysBetween(a: Date, b: Date) {
  const ms = 24 * 60 * 60 * 1000;
  const da = new Date(a);
  const db = new Date(b);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  return Math.round((db.getTime() - da.getTime()) / ms);
}
function stableStringify(obj: any) {
  const allKeys: string[] = [];
  JSON.stringify(obj, (k, v) => (allKeys.push(k), v));
  allKeys.sort();
  return JSON.stringify(obj, allKeys);
}
function computeSignature(state: CruisePlanStateV1) {
  return stableStringify(state);
}

function statusBadge(urgency: ComputedTask["urgency"]) {
  switch (urgency) {
    case "overdue":
      return { label: "Delayed", cls: "border-red-200 bg-red-50 text-red-700" };
    case "inRange":
      return { label: "In range", cls: "border-amber-200 bg-amber-50 text-amber-800" };
    case "soon":
      return { label: "Soon", cls: "border-blue-200 bg-blue-50 text-blue-800" };
    default:
      return { label: "Later", cls: "border-black/10 bg-white text-black/65" };
  }
}
function leftAccent(urgency: ComputedTask["urgency"]) {
  switch (urgency) {
    case "overdue":
      return "border-l-red-300";
    case "inRange":
      return "border-l-amber-300";
    case "soon":
      return "border-l-blue-300";
    default:
      return "border-l-black/10";
  }
}
function iconFor(urgency: ComputedTask["urgency"]) {
  switch (urgency) {
    case "overdue":
      return "⛔";
    case "inRange":
      return "🟡";
    case "soon":
      return "⏳";
    default:
      return "🗓️";
  }
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function isBetweenInclusive(d: Date, start: Date, end: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const s = new Date(start);
  s.setHours(0, 0, 0, 0);
  const e = new Date(end);
  e.setHours(0, 0, 0, 0);
  return x.getTime() >= s.getTime() && x.getTime() <= e.getTime();
}

const DEFAULT_STATE: CruisePlanStateV1 = {
  v: 1,
  tool: "cruise-plan",
  sailingDateISO: toISODate(addDays(startOfToday(), 60)),
  cruiseLengthDays: 7,
  portCity: "",

  // Profiles: keep defaults, but never delete these keys
  isFirstTime: true,
  isInternational: false,
  flyingToPort: false,
  hasKids: false,

  checklist: {},

  ui: {
    expandedTasks: {},
    calendarMonthISO: toMonthISO(new Date()),
    showCompleted: true,
    showHowTo: false,
    showAbout: false,
    showCalendar: false,
  },
};

function sanitizeState(raw: any): CruisePlanStateV1 {
  const base = DEFAULT_STATE;

  const sailingDateISO =
    typeof raw?.sailingDateISO === "string" && raw.sailingDateISO
      ? raw.sailingDateISO
      : base.sailingDateISO;

  const cruiseLengthDaysRaw = raw?.cruiseLengthDays;
  const cruiseLengthDaysNum = Number.isFinite(cruiseLengthDaysRaw)
    ? cruiseLengthDaysRaw
    : parseInt(String(cruiseLengthDaysRaw ?? ""), 10);
  const cruiseLengthDays = Math.max(
    1,
    Math.min(
      60,
      Number.isFinite(cruiseLengthDaysNum) ? cruiseLengthDaysNum : base.cruiseLengthDays
    )
  );

  const uiRaw = raw?.ui ?? {};
  return {
    ...base,
    ...raw,

    sailingDateISO,
    cruiseLengthDays,

    portCity: typeof raw?.portCity === "string" ? raw.portCity : base.portCity,

    // Profiles: force booleans and preserve defaults if missing
    isFirstTime: raw?.isFirstTime === undefined ? base.isFirstTime : !!raw.isFirstTime,
    isInternational: raw?.isInternational === undefined ? base.isInternational : !!raw.isInternational,
    flyingToPort: raw?.flyingToPort === undefined ? base.flyingToPort : !!raw.flyingToPort,
    hasKids: raw?.hasKids === undefined ? base.hasKids : !!raw.hasKids,

    checklist: typeof raw?.checklist === "object" && raw?.checklist ? raw.checklist : {},

    ui: {
      ...base.ui,
      ...(typeof uiRaw === "object" && uiRaw ? uiRaw : {}),
      expandedTasks:
        typeof uiRaw?.expandedTasks === "object" && uiRaw?.expandedTasks
          ? uiRaw.expandedTasks
          : base.ui.expandedTasks,

      calendarMonthISO:
        typeof uiRaw?.calendarMonthISO === "string" && uiRaw.calendarMonthISO
          ? uiRaw.calendarMonthISO
          : base.ui.calendarMonthISO,

      showCompleted: uiRaw?.showCompleted === undefined ? base.ui.showCompleted : !!uiRaw.showCompleted,
      showHowTo: uiRaw?.showHowTo === undefined ? base.ui.showHowTo : !!uiRaw.showHowTo,
      showAbout: uiRaw?.showAbout === undefined ? base.ui.showAbout : !!uiRaw.showAbout,
      showCalendar: uiRaw?.showCalendar === undefined ? base.ui.showCalendar : !!uiRaw.showCalendar,
    },
  };
}

/* =========================
   TASKS (passport + profile-based tasks restored)
========================= */

const PLAN_TASKS: PlanTask[] = [
  // Documents / passport
  {
    id: "passport-check",
    title: "Check passport validity (international)",
    description: "Many itineraries require passports valid for months beyond return date.",
    category: "documents",
    recommendedOffsetDays: 120,
    windowStartDays: 180,
    windowEndDays: 90,
    checklistItems: [
      "Confirm passport expiration date",
      "Check destination requirements (validity months)",
      "Renew if needed (buffer time)",
      "Make a photo copy + digital copy",
    ],
    appliesIf: (ctx) => ctx.isInternational,
  },

  // NEW: Name matching + backups (very common gotcha)
  {
    id: "docs-name-match",
    title: "Verify names match across documents",
    description: "Reservation name should match ID/passport to avoid check-in issues.",
    category: "documents",
    recommendedOffsetDays: 45,
    windowStartDays: 90,
    windowEndDays: 14,
    checklistItems: [
      "Confirm reservation name matches passport/ID",
      "If name changed: bring supporting document(s)",
      "Print + save digital copies of key docs",
    ],
  },

  {
    id: "travel-insurance",
    title: "Consider travel insurance",
    description: "Useful for cancellations, medical, and travel delays (optional).",
    category: "documents",
    recommendedOffsetDays: 75,
    windowStartDays: 120,
    windowEndDays: 45,
    checklistItems: ["Decide if needed", "Compare coverage", "Save policy details (if purchased)"],
  },

  // Payments / reservations
  {
    id: "final-payment",
    title: "Final cruise payment due (typical)",
    description: "Many cruise lines require final payment 90–120 days before sailing.",
    category: "payments",
    recommendedOffsetDays: 90,
    windowStartDays: 120,
    windowEndDays: 90,
    checklistItems: ["Check exact due date", "Confirm payment method", "Save confirmation"],
  },

  // NEW: Gratuities + onboard account (frequent question)
  {
    id: "gratuities-onboard-account",
    title: "Plan gratuities + onboard spending",
    description: "Understand auto-gratuities, extra tipping, and how onboard charges work.",
    category: "payments",
    recommendedOffsetDays: 21,
    windowStartDays: 45,
    windowEndDays: 7,
    checklistItems: [
      "Check if gratuities are prepaid or added daily",
      "Decide if you’ll tip extra (cash)",
      "Set a daily spend budget (drinks, specialty dining, spa)",
      "Confirm card-on-file for onboard account",
    ],
  },

  // NEW: Cash (ports + porters)
  {
    id: "cash-small-bills",
    title: "Get small cash bills for tips + ports",
    description: "Onboard is mostly cashless, but cash helps for porters, tours, and extras.",
    category: "payments",
    recommendedOffsetDays: 7,
    windowStartDays: 21,
    windowEndDays: 1,
    checklistItems: [
      "Bring small bills ($1/$5/$10)",
      "Set aside cash for porters + tour tips",
      "Keep a little emergency cash separate",
    ],
  },

  {
    id: "shore-excursions",
    title: "Book shore excursions",
    description: "Popular tours can sell out early.",
    category: "reservations",
    recommendedOffsetDays: 75,
    windowStartDays: 120,
    windowEndDays: 60,
    checklistItems: ["List ports", "Pick must-do tours", "Check cancellation policy", "Save confirmations"],
  },
  {
    id: "dining-reservations",
    title: "Reserve dining / specialty restaurants",
    description: "Prime dinner times often fill quickly.",
    category: "reservations",
    recommendedOffsetDays: 60,
    windowStartDays: 90,
    windowEndDays: 60,
    checklistItems: ["Pick dinner time", "Reserve specialty nights", "Note dietary needs", "Save confirmations"],
  },
  {
    id: "wifi-package",
    title: "Decide on Wi-Fi package",
    description: "Compare onboard internet options and pricing before sailing (optional but common).",
    category: "reservations",
    recommendedOffsetDays: 21,
    windowStartDays: 45,
    windowEndDays: 7,
    checklistItems: [
      "Check package options (per day vs full cruise)",
      "Decide per device vs multi-device",
      "Note pricing + promos (if any)",
      "Purchase or plan to buy onboard",
    ],
  },

  // Travel (conditional on flying)
  {
    id: "book-flights",
    title: "Book flights to port city",
    description: "If flying, arrive at least one day before embarkation.",
    category: "travel",
    recommendedOffsetDays: 60,
    checklistItems: ["Pick arrival airport", "Arrive day before", "Save confirmations"],
    appliesIf: (ctx) => ctx.flyingToPort,
  },
  {
    id: "hotel-night-before",
    title: "Book hotel (night before embarkation)",
    description: "Recommended if flying to reduce risk of missed departure.",
    category: "travel",
    recommendedOffsetDays: 45,
    checklistItems: ["Choose area near port", "Confirm check-in time", "Save confirmation"],
    appliesIf: (ctx) => ctx.flyingToPort,
  },

  // Embarkation (check-in)
  {
    id: "online-checkin",
    title: "Complete online check-in (typical)",
    description: "Upload documents and select arrival time if supported.",
    category: "embarkation",
    recommendedOffsetDays: 21,
    windowStartDays: 45,
    windowEndDays: 14,
    checklistItems: ["Upload documents", "Select boarding time", "Save boarding passes"],
  },

  // Kids (conditional)
  {
    id: "kids-docs",
    title: "Kids: documents + essentials",
    description: "Extra prep helps reduce surprises (optional).",
    category: "documents",
    recommendedOffsetDays: 21,
    checklistItems: ["IDs / school ID (if applicable)", "Meds + backup", "Snacks / activities", "Swim gear"],
    appliesIf: (ctx) => ctx.hasKids,
  },

  // Packing (extended)
  {
    id: "packing-start",
    title: "Start packing + buy missing items",
    description: "Start early to avoid last-minute runs.",
    category: "packing",
    recommendedOffsetDays: 7,
    windowStartDays: 14,
    windowEndDays: 5,
    checklistItems: [
      "Check weather + itinerary dress needs",
      "Buy sunscreen / aloe",
      "Buy seasickness meds (if needed)",
      "Buy travel-size toiletries",
      "Check shoes (walking + dinner)",
      "Set aside swimwear + cover-ups",
    ],
  },

  // NEW: Motion sickness plan (first-timer leaning)
  {
    id: "seasickness-plan",
    title: "Decide on motion-sickness plan",
    description: "Better to pack something before you need it.",
    category: "packing",
    recommendedOffsetDays: 7,
    windowStartDays: 21,
    windowEndDays: 2,
    checklistItems: ["Pick your option (bands/meds/ginger)", "Pack it in carry-on"],
    appliesIf: (ctx) => !!ctx.isFirstTime,
  },

  // NEW: Charging plan (outlets limited; first-timer leaning)
  {
    id: "charging-plan",
    title: "Plan charging setup (outlets are limited)",
    description: "Cabins often have few outlets; pack a simple charging setup.",
    category: "packing",
    recommendedOffsetDays: 7,
    windowStartDays: 21,
    windowEndDays: 2,
    checklistItems: [
      "Count devices + chargers",
      "Bring a USB hub (no clutter)",
      "Pack an extra-long cable",
      "Bring a small power bank for excursions",
    ],
    appliesIf: (ctx) => !!ctx.isFirstTime,
  },

  // NEW: Port-day kit (first-timer leaning)
  {
    id: "port-day-kit",
    title: "Prepare a simple port-day kit",
    description: "Make leaving the ship easy and low-stress.",
    category: "packing",
    recommendedOffsetDays: 3,
    windowStartDays: 7,
    windowEndDays: 1,
    checklistItems: [
      "Lanyard/wallet for cruise card",
      "Sunscreen + hat + sunglasses",
      "Refillable bottle (if allowed)",
      "Download offline maps/confirmations",
    ],
    appliesIf: (ctx) => !!ctx.isFirstTime,
  },

  {
    id: "packing-3days",
    title: "Laundry + finalize outfits",
    description: "Make sure your key outfits are clean and ready.",
    category: "packing",
    recommendedOffsetDays: 3,
    checklistItems: ["Laundry for outfits", "Set aside embarkation-day outfit", "Charge devices + find chargers"],
  },
  {
    id: "pack-carryon",
    title: "Pack carry-on essentials",
    description: "Meds, chargers, documents, change of clothes.",
    category: "packing",
    recommendedOffsetDays: 1,
    checklistItems: ["Medications", "Chargers + power bank", "Documents / IDs", "Change of clothes"],
  },
];

function computeTasks(state: CruisePlanStateV1): ComputedTask[] {
  const sailing = parseISODateLocal(state.sailingDateISO);
  if (!sailing) return [];
  const today = startOfToday();

  const ctx: CruiseToggleContext = {
    isFirstTime: state.isFirstTime,
    isInternational: state.isInternational,
    flyingToPort: state.flyingToPort,
    hasKids: state.hasKids,
  };

  const computed = PLAN_TASKS
    .filter((t) => (t.appliesIf ? t.appliesIf(ctx) : true))
    .map((t) => {
      const doBy = addDays(sailing, -t.recommendedOffsetDays);
      const daysUntil = daysBetween(today, doBy);

      const inWindow =
        typeof t.windowStartDays === "number" && typeof t.windowEndDays === "number"
          ? (() => {
              const winStart = addDays(sailing, -t.windowStartDays);
              const winEnd = addDays(sailing, -t.windowEndDays);
              return today >= winStart && today <= winEnd;
            })()
          : false;

      let urgency: ComputedTask["urgency"] = "later";
      if (today > doBy) urgency = "overdue";
      else if (inWindow) urgency = "inRange";
      else if (daysUntil >= 0 && daysUntil <= 7) urgency = "soon";
      else urgency = "later";

      return { task: t, doBy, daysUntil, inWindow, urgency };
    });

  computed.sort((a, b) => a.doBy.getTime() - b.doBy.getTime());
  return computed;
}

function taskCompletionRatio(state: CruisePlanStateV1, task: PlanTask) {
  const ids = task.checklistItems.map((_, idx) => `${task.id}::${idx}`);
  const done = ids.reduce((acc, id) => acc + (state.checklist[id]?.checked ? 1 : 0), 0);
  return { done, total: ids.length };
}
function isTaskFullyCompleted(state: CruisePlanStateV1, task: PlanTask) {
  const r = taskCompletionRatio(state, task);
  return r.total > 0 && r.done === r.total;
}

function downloadJson(filename: string, state: CruisePlanStateV1) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
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

/* Calendar helpers */
function getMonthGrid(monthStart: Date) {
  const first = new Date(monthStart);
  first.setHours(0, 0, 0, 0);
  const startDay = first.getDay();
  const gridStart = addDays(first, -startDay);

  const weeks: Date[][] = [];
  let cursor = gridStart;
  for (let w = 0; w < 6; w++) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return { weeks };
}

export default function CruiseTimelineClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const taskRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const infoRef = useRef<HTMLDivElement | null>(null);
  const [pendingInfoScroll, setPendingInfoScroll] = useState(false);
  const [flashTaskId, setFlashTaskId] = useState<string>("");

  const [state, setState] = useState<CruisePlanStateV1>(DEFAULT_STATE);
  const [toast, setToast] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.tool === "cruise-plan") setState(sanitizeState(parsed));
      } else {
        setState(sanitizeState(DEFAULT_STATE));
      }
    } catch {
      setState(sanitizeState(DEFAULT_STATE));
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(state));
      } catch {}
    }, 200);
    return () => window.clearTimeout(t);
  }, [state]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(""), 1600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const [lastExportSig, setLastExportSig] = useState("");
  useEffect(() => {
    try {
      setLastExportSig(localStorage.getItem(LS_EXPORT_SIG_KEY) || "");
    } catch {}
  }, []);

  useEffect(() => {
    if (!pendingInfoScroll) return;
    if (!state.ui.showHowTo && !state.ui.showAbout) return; // nothing visible yet

    // wait one frame so the panel is definitely in the DOM
    requestAnimationFrame(() => {
        infoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setPendingInfoScroll(false);
    });
    }, [pendingInfoScroll, state.ui.showHowTo, state.ui.showAbout]);

  const currentSig = useMemo(() => computeSignature(state), [state]);
  const isExportCurrent = useMemo(
    () => !!lastExportSig && lastExportSig === currentSig,
    [lastExportSig, currentSig]
  );

  const sailing = useMemo(() => parseISODateLocal(state.sailingDateISO), [state.sailingDateISO]);
  const today = useMemo(() => startOfToday(), []);
  const daysToGo = useMemo(() => (sailing ? daysBetween(today, sailing) : 0), [today, sailing]);

  const cruiseStart = sailing;
  const cruiseEnd = useMemo(() => {
    if (!sailing) return null;
    const len = Math.max(1, Math.min(60, Number.isFinite(state.cruiseLengthDays) ? state.cruiseLengthDays : 7));
    return addDays(sailing, len - 1);
  }, [sailing, state.cruiseLengthDays]);

  const computedTasks = useMemo(() => computeTasks(state), [state]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, ComputedTask[]>();
    const keys: string[] = [];
    for (const ct of computedTasks) {
      const k = toISODate(ct.doBy);
      if (!map.has(k)) keys.push(k);
      map.set(k, [...(map.get(k) ?? []), ct]);
    }
    return { map, keys };
  }, [computedTasks]);

  // ✅ Legend counts REMAINING tasks only (so it changes when you complete things)
  const statusCounts = useMemo(() => {
    const c = { overdue: 0, inRange: 0, soon: 0, later: 0 };
    for (const ct of computedTasks) {
      if (isTaskFullyCompleted(state, ct.task)) continue;
      c[ct.urgency] += 1;
    }
    return c;
  }, [computedTasks, state]);

  const remainingCount = useMemo(() => {
    return computedTasks.reduce((acc, ct) => acc + (isTaskFullyCompleted(state, ct.task) ? 0 : 1), 0);
  }, [computedTasks, state]);

  const completedCount = useMemo(() => {
    return computedTasks.reduce((acc, ct) => acc + (isTaskFullyCompleted(state, ct.task) ? 1 : 0), 0);
  }, [computedTasks, state]);

  const tasksByDoByISO = useMemo(() => {
    const map = new Map<string, ComputedTask[]>();
    for (const ct of computedTasks) {
      const k = toISODate(ct.doBy);
      map.set(k, [...(map.get(k) ?? []), ct]);
    }
    return map;
  }, [computedTasks]);

  function exportPlan() {
    downloadJson("eventclocks-cruise-plan.json", state);
    const sig = computeSignature(state);
    setLastExportSig(sig);
    try {
      localStorage.setItem(LS_EXPORT_SIG_KEY, sig);
    } catch {}
    setToast("Exported.");
  }

  async function importPlan(file: File) {
    try {
      const parsed = await readJsonFile(file);
      if (parsed?.tool !== "cruise-plan") throw new Error("Invalid plan file.");

      // IMPORTANT: sanitize keeps profile toggles even if older export missing them
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

  // Auto-collapse tasks when they become fully completed (keeps the list slim)
  useEffect(() => {
    setState((s) => {
      const expanded = { ...s.ui.expandedTasks };
      let changed = false;

      for (const ct of computeTasks(s)) {
        if (isTaskFullyCompleted(s, ct.task) && expanded[ct.task.id]) {
          expanded[ct.task.id] = false;
          changed = true;
        }
      }

      return changed ? sanitizeState({ ...s, ui: { ...s.ui, expandedTasks: expanded } }) : s;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.checklist]);

  function shiftCalendarMonth(deltaMonths: number) {
    const cur = parseMonthISO(state.ui.calendarMonthISO) ?? new Date();
    const next = new Date(cur.getFullYear(), cur.getMonth() + deltaMonths, 1);
    next.setHours(0, 0, 0, 0);
    setState((s) => sanitizeState({ ...s, ui: { ...s.ui, calendarMonthISO: toMonthISO(next) } }));
  }

  function toggleExpanded(taskId: string) {
    setState((s) =>
      sanitizeState({
        ...s,
        ui: { ...s.ui, expandedTasks: { ...s.ui.expandedTasks, [taskId]: !s.ui.expandedTasks[taskId] } },
      })
    );
  }

  function setChecklistChecked(itemId: string, checked: boolean) {
    setState((s) =>
      sanitizeState({
        ...s,
        checklist: { ...s.checklist, [itemId]: { ...s.checklist[itemId], checked } },
      })
    );
  }
  function setChecklistRemark(itemId: string, remark: string) {
    setState((s) =>
      sanitizeState({
        ...s,
        checklist: { ...s.checklist, [itemId]: { ...s.checklist[itemId], remark } },
      })
    );
  }

  function scrollToTask(taskId: string) {
    setState((s) =>
      sanitizeState({
        ...s,
        ui: { ...s.ui, expandedTasks: { ...s.ui.expandedTasks, [taskId]: true } },
      })
    );

    window.setTimeout(() => {
      const el = taskRefs.current[taskId];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setFlashTaskId(taskId);
        window.setTimeout(() => setFlashTaskId(""), 900);
      }
    }, 50);
  }

  const leftMonthStart = useMemo(() => {
    const m = parseMonthISO(state.ui.calendarMonthISO);
    return m ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  }, [state.ui.calendarMonthISO]);

  const rightMonthStart = useMemo(() => {
    const d = new Date(leftMonthStart.getFullYear(), leftMonthStart.getMonth() + 1, 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [leftMonthStart]);

  const leftGrid = useMemo(() => getMonthGrid(leftMonthStart), [leftMonthStart]);
  const rightGrid = useMemo(() => getMonthGrid(rightMonthStart), [rightMonthStart]);

  function MonthPanel({ monthStart, grid }: { monthStart: Date; grid: { weeks: Date[][] } }) {
    const title = monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    return (
      <div className={styles.card} style={{ padding: 10 }}>
        <div className={styles.monthTitle}>{title}</div>

        <div
          style={{
            marginTop: 8,
            border: "1px solid rgba(0,0,0,0.10)",
            borderRadius: 8,
            overflow: "hidden",
            background: "white",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              borderBottom: "1px solid rgba(0,0,0,0.10)",
              background: "rgba(0,0,0,0.02)",
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(0,0,0,0.55)",
            }}
          >
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} style={{ padding: "6px 8px" }}>
                {d}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {grid.weeks.flat().map((d) => {
              const iso = toISODate(d);
              const inThisMonth = d.getMonth() === monthStart.getMonth();

              const tasks = (tasksByDoByISO.get(iso) ?? []).filter((ct) =>
                state.ui.showCompleted ? true : !isTaskFullyCompleted(state, ct.task)
              );

              const hasTasks = tasks.length > 0;
              const sailDay = sailing ? sameDay(d, sailing) : false;

              const isCruiseDay = cruiseStart && cruiseEnd ? isBetweenInclusive(d, cruiseStart, cruiseEnd) : false;

              const mostUrgent = hasTasks
                ? tasks.reduce((acc, cur) => {
                    const order = { overdue: 0, inRange: 1, soon: 2, later: 3 } as const;
                    // If one is completed, treat it as least urgent
                    const aCompleted = isTaskFullyCompleted(state, acc.task);
                    const cCompleted = isTaskFullyCompleted(state, cur.task);
                    if (aCompleted && !cCompleted) return cur;
                    if (!aCompleted && cCompleted) return acc;
                    return order[cur.urgency] < order[acc.urgency] ? cur : acc;
                  }, tasks[0])
                : null;

              const dot =
                mostUrgent && isTaskFullyCompleted(state, mostUrgent.task)
                  ? "rgba(16,185,129,0.8)"
                  : mostUrgent?.urgency === "overdue"
                  ? "rgba(239,68,68,0.9)"
                  : mostUrgent?.urgency === "inRange"
                  ? "rgba(245,158,11,0.9)"
                  : mostUrgent?.urgency === "soon"
                  ? "rgba(59,130,246,0.9)"
                  : mostUrgent?.urgency === "later"
                  ? "rgba(0,0,0,0.25)"
                  : "transparent";

              const classNames = [
                styles.dayCell,
                !inThisMonth ? styles.dayCellMuted : "",
                isCruiseDay ? styles.cruiseDay : "",
                sailDay ? styles.sailDay : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div key={iso} className={classNames}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: inThisMonth ? "rgba(0,0,0,0.70)" : "rgba(0,0,0,0.35)",
                      }}
                    >
                      {d.getDate()}
                    </div>

                    {sailDay ? (
                      <span
                        className={styles.badge}
                        style={{
                          borderColor: "rgba(16,185,129,0.35)",
                          color: "rgba(16,185,129,0.95)",
                          background: "rgba(16,185,129,0.10)",
                        }}
                      >
                        Sail
                      </span>
                    ) : null}
                  </div>

                  {hasTasks ? (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: dot }} />
                      <div style={{ fontSize: 11, color: "rgba(0,0,0,0.55)" }}>
                        {tasks.length} task{tasks.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  ) : null}

                  {hasTasks ? (
                    <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 2 }}>
                      {tasks.slice(0, 2).map((ct) => {
                        const completed = isTaskFullyCompleted(state, ct.task);
                        return (
                          <button
                            key={ct.task.id}
                            className={styles.taskLink}
                            type="button"
                            onClick={() => scrollToTask(ct.task.id)}
                            title="Jump to task in list"
                          >
                            {completed ? "✅" : iconFor(ct.urgency)} {ct.task.title}
                          </button>
                        );
                      })}
                      {tasks.length > 2 ? (
                        <div style={{ fontSize: 11, color: "rgba(0,0,0,0.45)" }}>
                          +{tasks.length - 2} more
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.muted} style={{ marginTop: 8 }}>
          Tasks are shown on their Do-by dates.
        </div>
      </div>
    );
  }

  return (
    <PageShell title="Cruise Plan" subtitle="Date-sorted tasks with checklists and remarks.">
      <div className={styles.wrap}>
        <div className="mx-auto max-w-5xl space-y-4">
          {/* Top bar */}
          <div className={styles.row} style={{ justifyContent: "space-between" }}>
            <div className={styles.row}>
              <button
                className={styles.infoBtn}
                onClick={() => {
                    setState((s) => {
                    const nextShow = !s.ui.showHowTo;
                    return sanitizeState({ ...s, ui: { ...s.ui, showHowTo: true } });
                    });
                    window.setTimeout(() => {
                    infoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                }}
                type="button"
                title="How to use"
                >
                i
                </button>

              <button
                className={styles.btn + " " + styles.btnSmall}
                onClick={() => {
                    setState((s) => sanitizeState({ ...s, ui: { ...s.ui, showAbout: true } }));
                    window.setTimeout(() => {
                    infoRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }, 50);
                }}
                type="button"
                title="About"
                aria-label="About"
                >
                About
                </button>

              {toast ? <span className={styles.badge}>{toast}</span> : null}
            </div>

            <div className={styles.row}>
              <label className={`${styles.muted} ${styles.featureLabel}`}>
                <input
                    type="checkbox"
                    checked={!!state.ui.showCalendar}
                    onChange={(e) =>
                    setState((s) => sanitizeState({ ...s, ui: { ...s.ui, showCalendar: e.target.checked } }))
                    }
                />
                Show calendar
                
            </label>

              <button className={styles.btn + " " + styles.btnIcon} onClick={exportPlan} type="button" title="Export">
               Export ⬇️
              </button>

              <button
                className={styles.btn + " " + styles.btnIcon}
                onClick={() => fileInputRef.current?.click()}
                type="button"
                title="Import"
              >
               Import ⬆️
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  await importPlan(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Inputs + trip profile toggles */}
          <div className={styles.card}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label>
                <div className={styles.label}>Sailing date</div>
                <input
                  type="date"
                  value={state.sailingDateISO ?? ""}
                  onChange={(e) => {
                    const iso = e.target.value || "";
                    setState((s) =>
                      sanitizeState({
                        ...s,
                        sailingDateISO: iso,
                        ui: {
                          ...s.ui,
                          calendarMonthISO: parseISODateLocal(iso)
                            ? toMonthISO(parseISODateLocal(iso)!)
                            : s.ui.calendarMonthISO,
                        },
                      })
                    );
                  }}
                  className={styles.input}
                />
              </label>

              <label>
                <div className={styles.label}>Cruise length (days)</div>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={Number.isFinite(state.cruiseLengthDays) ? state.cruiseLengthDays : 7}
                  onChange={(e) => {
                    const n = parseInt(e.target.value || "7", 10);
                    const clamped = Math.max(1, Math.min(60, Number.isFinite(n) ? n : 7));
                    setState((s) => sanitizeState({ ...s, cruiseLengthDays: clamped }));
                  }}
                  className={styles.input}
                />
                <div className={styles.muted}>
                  {Math.max(0, (Number.isFinite(state.cruiseLengthDays) ? state.cruiseLengthDays : 7) - 1)} nights /{" "}
                  {Number.isFinite(state.cruiseLengthDays) ? state.cruiseLengthDays : 7} days
                </div>
              </label>

              <label>
                <div className={styles.label}>Port city (optional)</div>
                <input
                  value={state.portCity ?? ""}
                  onChange={(e) => setState((s) => sanitizeState({ ...s, portCity: e.target.value }))}
                  placeholder="e.g., Miami"
                  className={styles.input}
                />
              </label>
            </div>

            {/* PROFILES (always visible) */}
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-4">
              <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!!state.isFirstTime}
                  onChange={(e) => setState((s) => sanitizeState({ ...s, isFirstTime: e.target.checked }))}
                />
                First time cruising
              </label>

              <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!!state.isInternational}
                  onChange={(e) =>
                    setState((s) => sanitizeState({ ...s, isInternational: e.target.checked }))
                  }
                />
                International
              </label>

              <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!!state.flyingToPort}
                  onChange={(e) =>
                    setState((s) => sanitizeState({ ...s, flyingToPort: e.target.checked }))
                  }
                />
                Flying to port
              </label>

              <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={!!state.hasKids}
                  onChange={(e) => setState((s) => sanitizeState({ ...s, hasKids: e.target.checked }))}
                />
                With kids
              </label>
            </div>

            <div className={styles.row} style={{ marginTop: 10, justifyContent: "space-between" }}>
              <div className={styles.muted}>
                {sailing ? (
                  <>
                    <span style={{ fontWeight: 800, color: "rgba(0,0,0,0.75)" }}>Sailing:</span>{" "}
                    {formatDateLong(sailing)} • <span style={{ fontWeight: 800 }}>{daysToGo}</span> days to go
                  </>
                ) : (
                  "Enter a valid sailing date."
                )}
              </div>

              <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  type="checkbox"
                  checked={!!state.ui.showCompleted}
                  onChange={(e) =>
                    setState((s) => sanitizeState({ ...s, ui: { ...s.ui, showCompleted: e.target.checked } }))
                  }
                />
                Show completed
              </label>
            </div>

            <div className={styles.row} style={{ marginTop: 10, gap: 6, flexWrap: "wrap" }}>
              <span className={styles.muted} style={{ fontWeight: 800 }}>
                Legend:
              </span>
              <span className={styles.badge}>⛔ {statusCounts.overdue}</span>
              <span className={styles.badge}>🟡 {statusCounts.inRange}</span>
              <span className={styles.badge}>⏳ {statusCounts.soon}</span>
              <span className={styles.badge}>🗓️ {statusCounts.later}</span>

              <span className={styles.muted} style={{ marginLeft: 8 }}>
                Remaining: <b>{remainingCount}</b> • Completed: <b>{completedCount}</b>
              </span>

              {cruiseStart && cruiseEnd ? (
                <span
                  className={styles.badge}
                  style={{ borderColor: "rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.08)" }}
                >
                  Cruise days highlighted
                </span>
              ) : null}
            </div>
          </div>

          {/* Calendar */}
          {state.ui.showCalendar ? (
            <div>
              <div className={styles.calendarHeader}>
                <button className={styles.btn} onClick={() => shiftCalendarMonth(-1)} type="button">
                  ←
                </button>
                <div className={styles.calendarHeaderCenter}>Two-month view</div>
                <button className={styles.btn} onClick={() => shiftCalendarMonth(1)} type="button">
                  →
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <MonthPanel monthStart={leftMonthStart} grid={leftGrid} />
                <MonthPanel monthStart={rightMonthStart} grid={rightGrid} />
              </div>
            </div>
          ) : null}

          {/* List */}
          <div className="space-y-3">
            {tasksByDate.keys.map((dateISO) => {
              const date = parseISODateLocal(dateISO)!;
              const items = (tasksByDate.map.get(dateISO) ?? []).filter((ct) =>
                state.ui.showCompleted ? true : !isTaskFullyCompleted(state, ct.task)
              );
              if (items.length === 0) return null;

              return (
                <div key={dateISO} className={styles.card}>
                  <div className={styles.row} style={{ justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(0,0,0,0.75)" }}>
                      {formatDateLong(date)}
                    </div>
                    <div className={styles.muted}>Do-by</div>
                  </div>

                  <div className="space-y-2">
                    {items.map((ct) => {
                      const badge = statusBadge(ct.urgency);
                      const expanded = !!state.ui.expandedTasks[ct.task.id];
                      const ratio = taskCompletionRatio(state, ct.task);
                      const completed = isTaskFullyCompleted(state, ct.task);

                      return (
                        <div
                          key={ct.task.id}
                          ref={(el) => {
                            taskRefs.current[ct.task.id] = el;
                          }}
                          className={`rounded-md border border-black/10 bg-white px-3 py-2 border-l-4 ${
                            completed ? "border-l-emerald-200 opacity-80" : leftAccent(ct.urgency)
                          }`}
                          style={{
                            boxShadow: flashTaskId === ct.task.id ? "0 0 0 3px rgba(99,102,241,0.18)" : undefined,
                          }}
                        >
                          <div className={styles.row} style={{ justifyContent: "space-between" }}>
                            <div style={{ minWidth: 0 }}>
                              <div className={styles.row} style={{ gap: 6, flexWrap: "wrap" }}>
                                <div style={{ fontSize: 13, fontWeight: 800, color: "rgba(0,0,0,0.82)" }}>
                                  <span style={{ marginRight: 4 }}>{completed ? "✅" : iconFor(ct.urgency)}</span>
                                  {ct.task.title}
                                </div>

                                {completed ? (
                                  <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold border-emerald-200 bg-emerald-50 text-emerald-700">
                                    Completed
                                  </span>
                                ) : (
                                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                                    {badge.label}
                                  </span>
                                )}

                                <span className={styles.muted}>
                                  {completed
                                    ? "done"
                                    : ct.daysUntil >= 0
                                    ? `${ct.daysUntil}d left`
                                    : `${Math.abs(ct.daysUntil)}d late`}
                                </span>

                                <span className={styles.muted}>
                                  • {ratio.done}/{ratio.total}
                                </span>
                              </div>

                              <div className={styles.muted} style={{ marginTop: 2 }}>
                                {ct.task.description}
                              </div>
                            </div>

                            <button
                              className={styles.btn + " " + styles.btnSmall}
                              onClick={() => toggleExpanded(ct.task.id)}
                              type="button"
                            >
                              {expanded ? "Hide" : "Checklist"}
                            </button>
                          </div>

                          {expanded ? (
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                              {ct.task.checklistItems.map((label, idx) => {
                                const itemId = `${ct.task.id}::${idx}`;
                                const entry = state.checklist[itemId] || {};
                                return (
                                  <div
                                    key={itemId}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "1fr 1fr",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                    className="rounded-md border border-black/10 bg-white px-2 py-2"
                                  >
                                    <label
                                      style={{
                                        display: "flex",
                                        gap: 8,
                                        alignItems: "center",
                                        fontSize: 12,
                                        color: "rgba(0,0,0,0.75)",
                                      }}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={!!entry.checked}
                                        onChange={(e) => setChecklistChecked(itemId, e.target.checked)}
                                      />
                                      <span
                                        style={{
                                          textDecoration: entry.checked ? "line-through" : "none",
                                          opacity: entry.checked ? 0.6 : 1,
                                        }}
                                      >
                                        {label}
                                      </span>
                                    </label>

                                    <input
                                      value={entry.remark ?? ""}
                                      onChange={(e) => setChecklistRemark(itemId, e.target.value)}
                                      placeholder="Remark (optional)"
                                      className={styles.input}
                                      style={{ padding: "6px 8px", fontSize: 12 }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {!isExportCurrent ? (
                    <div className={styles.muted} style={{ marginTop: 10 }}>
                      Tip: export ⬇️ if you want a portable backup of your latest changes.
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div ref={infoRef} style={{ scrollMarginTop: 80 }} />

      {/* Bottom info panels (moved here so they don't steal space up top) */}
        {state.ui.showHowTo || state.ui.showAbout ? (
        <div ref={infoRef} style={{ scrollMarginTop: 80 }} className={styles.card}>
            {state.ui.showHowTo ? (
            <div>
                <div className={styles.sectionTitle}>How to use</div>
                <ul className={styles.bullets}>
                <li>Set sailing date + cruise length.</li>
                <li>Work top-to-bottom: earliest Do-by dates first.</li>
                <li>Expand tasks to check off items and add remarks.</li>
                <li>Use calendar items to jump to the task in the list.</li>
                <li>Export ⬇️ for a portable backup.</li>
                </ul>
            </div>
            ) : null}

            {state.ui.showAbout ? (
            <div style={{ marginTop: state.ui.showHowTo ? 14 : 0 }} className={styles.muted}>
                {DEFAULT_DESCRIPTION}
            </div>
            ) : null}
        </div>
        ) : null}
    </PageShell>
    
    
  );

  

  
}