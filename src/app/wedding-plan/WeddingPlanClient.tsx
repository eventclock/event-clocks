"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "@/components/PageShell";
import styles from "../cruise/cruise-ui.module.css";

type WeddingPlanStateV1 = {
  v: 1;
  tool: "wedding-plan";

  weddingDateISO: string; // YYYY-MM-DD

  // ---- Profile toggles ----
  isFirstTime: boolean; // keeps the copy beginner-friendly
  isFaithTraditional: boolean;
  isDestination: boolean;
  isLargeGuestList: boolean;

  checklist: Record<string, { checked?: boolean; remark?: string }>;

  ui: {
    expandedTasks: Record<string, boolean>;
    calendarMonthISO: string; // YYYY-MM-01
    showCompleted: boolean;

    showHowTo: boolean;
    showAbout: boolean;

    showCalendar: boolean;
  };
};

type WeddingProfileContext = {
  isFirstTime: boolean;
  isFaithTraditional: boolean;
  isDestination: boolean;
  isLargeGuestList: boolean;
};

type TaskCategory =
  | "foundation"
  | "vendors"
  | "guests"
  | "legal"
  | "logistics"
  | "dayof";

type PlanTask = {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;

  recommendedOffsetDays: number;
  windowStartDays?: number;
  windowEndDays?: number;

  checklistItems: string[];
  appliesIf?: (ctx: WeddingProfileContext) => boolean;
};

type ComputedTask = {
  task: PlanTask;
  doBy: Date;
  daysUntil: number;
  inWindow: boolean;
  urgency: "overdue" | "inRange" | "soon" | "later";
};

const LS_KEY = "eventclocks:wedding-plan:v1";
const LS_EXPORT_SIG_KEY = "eventclocks:wedding-plan:lastExportSig:v1";

const DEFAULT_DESCRIPTION =
  "Tasks are sorted by Do-by date. Expand items to check things off and add notes. Export for a portable backup.";

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
function computeSignature(state: WeddingPlanStateV1) {
  return stableStringify(state);
}

function statusBadge(urgency: ComputedTask["urgency"]) {
  switch (urgency) {
    case "overdue":
      // pastel red
      return { label: "Delayed", cls: "border-gray-200/70 bg-rose-50/70 text-rose-700" };
    case "inRange":
      // pastel yellow
      return { label: "In range", cls: "border-gray-200/70 bg-yellow-50/70 text-yellow-900/80" };
    case "soon":
      return { label: "Soon", cls: "border-gray-200/70 bg-sky-50/70 text-sky-900/80" };
    default:
      return { label: "Later", cls: "border-black/10 bg-white text-black/65" };
  }
}
function leftAccent(urgency: ComputedTask["urgency"]) {
  switch (urgency) {
    case "overdue":
      return "border-l-red-200";
    case "inRange":
      return "border-l-yellow-200";
    case "soon":
      return "border-l-blue-200";
    default:
      return "border-l-black/10";
  }
}
function UrgencyDot({ urgency }: { urgency: ComputedTask["urgency"] }) {
  const style: React.CSSProperties =
    urgency === "overdue"
      ? { background: "rgba(220, 38, 38, 0.35)", border: "1px solid rgba(185, 28, 28, 0.25)" }
      : urgency === "inRange"
      ? { background: "rgba(252, 211, 77, 0.22)", border: "1px solid rgba(161, 98, 7, 0.18)" }
      : urgency === "soon"
      ? { background: "rgba(50, 78, 170, 0.7)", border: "1px solid rgba(37, 99, 235, 0.18)" }
      : { background: "rgba(148, 163, 184, 0.22)", border: "1px solid rgba(100, 116, 139, 0.18)" };

  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: 10,
        height: 10,
        borderRadius: 999,
        verticalAlign: "middle",
        ...style,
      }}
    />
  );
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

const DEFAULT_STATE: WeddingPlanStateV1 = {
  v: 1,
  tool: "wedding-plan",
  weddingDateISO: toISODate(addDays(startOfToday(), 365)),

  // Profiles
  isFirstTime: true,
  isFaithTraditional: false,
  isDestination: false,
  isLargeGuestList: false,

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

function sanitizeState(raw: any): WeddingPlanStateV1 {
  const base = DEFAULT_STATE;

  const weddingDateISO =
    typeof raw?.weddingDateISO === "string" && raw.weddingDateISO
      ? raw.weddingDateISO
      : base.weddingDateISO;

  const uiRaw = raw?.ui ?? {};
  return {
    ...base,
    ...raw,

    weddingDateISO,

    // Profiles
    isFirstTime: raw?.isFirstTime === undefined ? base.isFirstTime : !!raw.isFirstTime,
    isFaithTraditional:
      raw?.isFaithTraditional === undefined ? base.isFaithTraditional : !!raw.isFaithTraditional,
    isDestination: raw?.isDestination === undefined ? base.isDestination : !!raw.isDestination,
    isLargeGuestList:
      raw?.isLargeGuestList === undefined ? base.isLargeGuestList : !!raw.isLargeGuestList,

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
   TASKS (wedding timeline template)
========================= */

const PLAN_TASKS: PlanTask[] = [
  // ---- Foundation (for complete beginners) ----
  {
    id: "decide-what-matters",
    title: "Decide what matters most",
    description:
      "Weddings can get expensive. Decide early where you want to spend more and where you’re okay spending less.",
    category: "foundation",
    recommendedOffsetDays: 365,
    windowStartDays: 420,
    windowEndDays: 300,
    checklistItems: [
      "Pick your top 3 priorities (examples: food, photos, venue, guest comfort, music)",
      "Pick 1–2 areas you’re okay keeping simple (examples: decor, favors, extras)",
      "Write down your priorities so you can say “yes/no” faster later",
    ],
    appliesIf: (ctx) => ctx.isFirstTime,
  },
  {
    id: "set-budget",
    title: "Set a budget you will stick to",
    description: "A budget prevents surprise spending. You can adjust later, but set a starting number.",
    category: "foundation",
    recommendedOffsetDays: 365,
    windowStartDays: 420,
    windowEndDays: 300,
    checklistItems: [
      "Decide the maximum total amount you want to spend",
      "List who is contributing (you, family, etc.)",
      "Set aside a small buffer (around 10%) for unexpected costs",
      "Write down your rough split (venue, food, photo, attire, misc.)",
    ],
    appliesIf: (ctx) => ctx.isFirstTime,
  },
  {
    id: "estimate-guest-count",
    title: "Estimate guest count",
    description: "Guest count affects venue size and food cost. Start with a rough range (like 50–80).",
    category: "guests",
    recommendedOffsetDays: 350,
    windowStartDays: 420,
    windowEndDays: 270,
    checklistItems: [
      "List must-invite family",
      "List close friends",
      "Decide if plus-ones are allowed",
      "Pick a rough range (example: 60–90 guests)",
    ],
  },

  // ---- Big bookings ----
  {
    id: "choose-venue",
    title: "Choose and book your wedding location",
    description:
      "Your venue determines your date, your guest capacity, and many of your major costs. Book this early.",
    category: "vendors",
    recommendedOffsetDays: 300,
    windowStartDays: 365,
    windowEndDays: 240,
    checklistItems: [
      "Search venues in your area (or your destination location)",
      "Compare at least 3 options (photos, price, capacity, rules)",
      "Confirm your preferred date is available",
      "Ask what’s included (tables, chairs, catering, coordinator, etc.)",
      "Review the contract carefully",
      "Pay the deposit to lock the date",
    ],
  },
  {
    id: "photo-video",
    title: "Book photographer (and videographer if you want)",
    description: "Popular photographers book early. This is often a top priority for couples.",
    category: "vendors",
    recommendedOffsetDays: 270,
    windowStartDays: 330,
    windowEndDays: 210,
    checklistItems: [
      "Look at portfolios and pick a style you like",
      "Compare packages and pricing",
      "Confirm availability for your date",
      "Ask about delivery timeline (when you’ll get photos)",
      "Sign the contract and pay deposit",
    ],
  },
  {
    id: "catering",
    title: "Plan the food (catering or venue menu)",
    description: "Food is usually one of the biggest costs. Decide the style and confirm price per guest.",
    category: "vendors",
    recommendedOffsetDays: 240,
    windowStartDays: 300,
    windowEndDays: 180,
    checklistItems: [
      "Confirm if the venue includes catering or you need an outside caterer",
      "Schedule a tasting (if available)",
      "Pick service style (buffet, plated, family-style, etc.)",
      "Ask about dietary restrictions (vegetarian, allergies, etc.)",
      "Estimate cost per guest and what it includes",
    ],
  },
  {
    id: "attire",
    title: "Choose wedding attire and schedule fittings",
    description: "Ordering and alterations take time. Start early so nothing is rushed.",
    category: "logistics",
    recommendedOffsetDays: 240,
    windowStartDays: 300,
    windowEndDays: 150,
    checklistItems: [
      "Choose attire (dress/suit/outfit) and place your order",
      "Schedule fittings/alterations",
      "Choose shoes and accessories",
      "Set a final pickup date",
    ],
  },

  // ---- Guest communication ----
  {
    id: "save-the-dates",
    title: "Send save-the-dates (optional but helpful)",
    description: "This gives guests a heads-up, especially if travel is involved.",
    category: "guests",
    recommendedOffsetDays: 180,
    windowStartDays: 240,
    windowEndDays: 120,
    checklistItems: [
      "Finalize your guest list version 1",
      "Collect addresses/emails",
      "Send save-the-dates (mail or digital)",
    ],
  },
  {
    id: "entertainment",
    title: "Book music (DJ or band)",
    description: "Entertainment helps set the mood for the reception.",
    category: "vendors",
    recommendedOffsetDays: 180,
    windowStartDays: 240,
    windowEndDays: 120,
    checklistItems: [
      "Decide DJ vs live band",
      "Confirm availability",
      "Sign contract and pay deposit",
      "Share basic preferences (must-play / do-not-play)",
    ],
  },

  // ---- Legal and ceremony ----
  {
    id: "marriage-license",
    title: "Research marriage license requirements",
    description:
      "This is the legal paperwork required to get married. Requirements vary by city/state/country.",
    category: "legal",
    recommendedOffsetDays: 90,
    windowStartDays: 120,
    windowEndDays: 30,
    checklistItems: [
      "Check your local marriage license requirements",
      "List required documents (IDs, birth certs, etc.)",
      "Note deadlines or waiting periods",
      "Plan your appointment date",
    ],
  },
  {
    id: "invitations",
    title: "Send invitations and track RSVPs",
    description: "Invites give guests the details and an RSVP deadline so you can finalize headcount.",
    category: "guests",
    recommendedOffsetDays: 120,
    windowStartDays: 150,
    windowEndDays: 60,
    checklistItems: [
      "Set an RSVP deadline (usually 4–6 weeks before the wedding)",
      "Send invitations (mail or digital)",
      "Track RSVP responses",
      "Follow up with non-responders after 1–2 weeks",
    ],
  },

  // ---- Final month ----
  {
    id: "confirm-vendors",
    title: "Confirm all vendors and timing",
    description: "In the last month, confirm times, payments, and any final details so nothing surprises you.",
    category: "logistics",
    recommendedOffsetDays: 30,
    windowStartDays: 45,
    windowEndDays: 7,
    checklistItems: [
      "Confirm arrival times and setup needs",
      "Confirm final balances and payment dates",
      "Share your day-of timeline",
      "Give each vendor a day-of contact person",
    ],
  },
  {
    id: "seating",
    title: "Finalize seating and headcount",
    description: "Once RSVPs are in, finalize your guest count and seating plan (if needed).",
    category: "guests",
    recommendedOffsetDays: 30,
    windowStartDays: 45,
    windowEndDays: 7,
    checklistItems: [
      "Confirm final headcount",
      "Create seating plan (if your wedding uses assigned tables/seats)",
      "Prepare place cards (optional)",
    ],
  },

  // ---- Final week ----
  {
    id: "final-payments",
    title: "Prepare final payments",
    description: "Make sure you know what is due and how it will be paid.",
    category: "logistics",
    recommendedOffsetDays: 7,
    windowStartDays: 14,
    windowEndDays: 1,
    checklistItems: [
      "Confirm remaining balances",
      "Prepare envelopes or payment method",
      "List who hands payments on the day",
    ],
  },
  {
    id: "wedding-kit",
    title: "Pack wedding essentials",
    description: "Small checklist so you don’t forget important items on the day.",
    category: "logistics",
    recommendedOffsetDays: 7,
    windowStartDays: 14,
    windowEndDays: 1,
    checklistItems: [
      "Rings",
      "Marriage license / paperwork",
      "Vendor contact list",
      "Emergency kit (band-aids, safety pins, etc.)",
    ],
  },
  {
    id: "rehearsal",
    title: "Do a quick ceremony run-through (optional)",
    description: "A simple rehearsal reduces confusion on the day.",
    category: "dayof",
    recommendedOffsetDays: 1,
    windowStartDays: 3,
    windowEndDays: 1,
    checklistItems: [
      "Confirm who is attending the rehearsal",
      "Review ceremony order (who walks when)",
      "Confirm ceremony timing",
    ],
  },
  {
    id: "wedding-day",
    title: "Wedding day",
    description: "Keep it simple: eat, hydrate, delegate, and enjoy.",
    category: "dayof",
    recommendedOffsetDays: 0,
    windowStartDays: 0,
    windowEndDays: 0,
    checklistItems: ["Eat something", "Stay hydrated", "Delegate coordination", "Enjoy the day"],
  },

  // ---- Profile add-ons ----
  {
    id: "faith-meet-leader",
    title: "Meet with your ceremony leader (faith/tradition)",
    description:
      "If your wedding follows faith or cultural traditions, there may be required steps before the ceremony.",
    category: "legal",
    recommendedOffsetDays: 270,
    windowStartDays: 330,
    windowEndDays: 180,
    checklistItems: [
      "Contact the ceremony leader/institution",
      "Confirm availability on your wedding date",
      "Ask about required preparation steps and deadlines",
    ],
    appliesIf: (ctx) => ctx.isFaithTraditional,
  },
  {
    id: "faith-prep",
    title: "Complete required preparation (faith/tradition)",
    description: "Some traditions require counseling, classes, or seminars before the wedding.",
    category: "legal",
    recommendedOffsetDays: 240,
    windowStartDays: 300,
    windowEndDays: 150,
    checklistItems: [
      "Ask if counseling/classes are required",
      "Schedule sessions",
      "Complete all sessions",
      "Keep proof of completion if needed",
    ],
    appliesIf: (ctx) => ctx.isFaithTraditional,
  },
  {
    id: "faith-docs",
    title: "Submit required documents (faith/tradition)",
    description: "Your ceremony venue may require documents before confirming your ceremony.",
    category: "legal",
    recommendedOffsetDays: 180,
    windowStartDays: 240,
    windowEndDays: 90,
    checklistItems: [
      "Ask what documents are required",
      "Gather required records",
      "Submit paperwork before deadline",
    ],
    appliesIf: (ctx) => ctx.isFaithTraditional,
  },

  {
    id: "dest-laws",
    title: "Research marriage laws for your destination",
    description: "Laws vary by country/location. Confirm requirements early to avoid surprises.",
    category: "legal",
    recommendedOffsetDays: 300,
    windowStartDays: 365,
    windowEndDays: 210,
    checklistItems: [
      "Check legal requirements for the destination location",
      "Confirm required documents and timelines",
      "Check if translations/notarization are needed",
    ],
    appliesIf: (ctx) => ctx.isDestination,
  },
  {
    id: "dest-guest-travel",
    title: "Coordinate guest travel (destination)",
    description: "Help guests plan travel by sharing hotel and transport info early.",
    category: "guests",
    recommendedOffsetDays: 240,
    windowStartDays: 300,
    windowEndDays: 120,
    checklistItems: [
      "Research nearby hotels",
      "Reserve a room block (optional)",
      "Share travel info (airport, transport, dates) with guests",
    ],
    appliesIf: (ctx) => ctx.isDestination,
  },

  {
    id: "large-logistics",
    title: "Plan logistics for a large guest list (150+)",
    description: "More guests usually means more coordination and staffing.",
    category: "logistics",
    recommendedOffsetDays: 180,
    windowStartDays: 240,
    windowEndDays: 90,
    checklistItems: [
      "Confirm venue capacity and crowd flow",
      "Consider guest transportation/parking",
      "Confirm catering staff count",
      "Consider a day-of coordinator (optional)",
    ],
    appliesIf: (ctx) => ctx.isLargeGuestList,
  },
];

function computeTasks(state: WeddingPlanStateV1): ComputedTask[] {
  const wedding = parseISODateLocal(state.weddingDateISO);
  if (!wedding) return [];
  const today = startOfToday();

  const ctx: WeddingProfileContext = {
    isFirstTime: state.isFirstTime,
    isFaithTraditional: state.isFaithTraditional,
    isDestination: state.isDestination,
    isLargeGuestList: state.isLargeGuestList,
  };

  const computed = PLAN_TASKS
    .filter((t) => (t.appliesIf ? t.appliesIf(ctx) : true))
    .map((t) => {
      const doBy = addDays(wedding, -t.recommendedOffsetDays);
      const daysUntil = daysBetween(today, doBy);

      const inWindow =
        typeof t.windowStartDays === "number" && typeof t.windowEndDays === "number"
          ? (() => {
              const winStart = addDays(wedding, -t.windowStartDays);
              const winEnd = addDays(wedding, -t.windowEndDays);
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

function taskCompletionRatio(state: WeddingPlanStateV1, task: PlanTask) {
  const ids = task.checklistItems.map((_, idx) => `${task.id}::${idx}`);
  const done = ids.reduce((acc, id) => acc + (state.checklist[id]?.checked ? 1 : 0), 0);
  return { done, total: ids.length };
}
function isTaskFullyCompleted(state: WeddingPlanStateV1, task: PlanTask) {
  const r = taskCompletionRatio(state, task);
  return r.total > 0 && r.done === r.total;
}

function downloadJson(filename: string, state: WeddingPlanStateV1) {
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

  const month = first.getMonth();
  const monthEnd = new Date(first.getFullYear(), month + 1, 0);
  monthEnd.setHours(0, 0, 0, 0);

  const startDay = first.getDay(); // 0=Sun
  const gridStart = addDays(first, -startDay);

  const weeks: Date[][] = [];
  let cursor = gridStart;

  // Build week rows until we've covered the month end.
  // This yields 4–6 rows depending on the month shape.
  while (true) {
    const week: Date[] = [];
    for (let d = 0; d < 7; d++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);

    const lastDayInWeek = week[6];
    if (lastDayInWeek.getTime() >= monthEnd.getTime()) break;
    if (weeks.length >= 6) break;
  }

  return { weeks };
}

export default function WeddingPlanClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const taskRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const infoRef = useRef<HTMLDivElement | null>(null);
  const [pendingInfoScroll, setPendingInfoScroll] = useState(false);
  const [flashTaskId, setFlashTaskId] = useState<string>("");

  const [state, setState] = useState<WeddingPlanStateV1>(DEFAULT_STATE);
  const [toast, setToast] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [openRemark, setOpenRemark] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Keep the page calm on load: never default tasks open.
        // (Users can still expand manually during this session.)
        if (parsed?.tool === "wedding-plan")
          setState(sanitizeState({
            ...parsed,
            ui: { ...(parsed.ui ?? {}), expandedTasks: {} },
          }));
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

  function resetEverything() {
    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_EXPORT_SIG_KEY);
    } catch {}
    setLastExportSig("");
    setOpenRemark({});
    setState(sanitizeState(DEFAULT_STATE));
    setToast("Reset.");
  }

  const wedding = useMemo(() => parseISODateLocal(state.weddingDateISO), [state.weddingDateISO]);
  const today = useMemo(() => startOfToday(), []);
  const daysToGo = useMemo(() => (wedding ? daysBetween(today, wedding) : 0), [today, wedding]);
  const isShortTimeline = useMemo(() => (wedding ? daysBetween(today, wedding) <= 120 : false), [today, wedding]);
  const cruiseStart = wedding;
  const cruiseEnd = wedding;

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
    downloadJson("eventclocks-wedding-plan.json", state);
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
      if (parsed?.tool !== "wedding-plan") throw new Error("Invalid plan file.");

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


  function goToTodayMonth() {
    const t = startOfToday();
    const m = new Date(t.getFullYear(), t.getMonth(), 1);
    m.setHours(0, 0, 0, 0);
    setState((s) => sanitizeState({ ...s, ui: { ...s.ui, calendarMonthISO: toMonthISO(m) } }));
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
  const leftGrid = useMemo(() => getMonthGrid(leftMonthStart), [leftMonthStart]);

  function MonthPanel({ monthStart, grid, onToday }: { monthStart: Date; grid: { weeks: Date[][] }; onToday?: () => void }) {
    const title = monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });

    return (
      <div className={styles.card} style={{ padding: 10 }}>
        <div className={styles.monthTitle}>{title}</div>

        <div
          style={{
            marginTop: 8,
            border: "0.5px solid rgba(0, 0, 0, 0.77)",
            borderRadius: 8,
            overflow: "hidden",
            background: "white",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              borderBottom: "0.5px solid rgba(0,0,0,0.16)",
              background: "rgba(0,0,0,0.02)",
              fontSize: 11,
              fontWeight: 700,
              color: "rgba(0, 0, 0, 0.3)",
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

              const tasks = (inThisMonth ? (tasksByDoByISO.get(iso) ?? []) : []).filter((ct) =>
                state.ui.showCompleted ? true : !isTaskFullyCompleted(state, ct.task)
              );

              const hasTasks = tasks.length > 0;
              const sailDay = wedding ? sameDay(d, wedding) : false;

              const todayISO = toISODate(startOfToday());
              const isToday = inThisMonth && iso === todayISO;

              const isCruiseDay = inThisMonth && cruiseStart && cruiseEnd ? isBetweenInclusive(d, cruiseStart, cruiseEnd) : false;

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
                  ? "rgba(217,119,6,0.55)"
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
                <div
                  key={iso}
                  className={classNames}
                  style={{
                    background: !inThisMonth
                      ? "rgba(0, 0, 0, 0.11)"
                      : isCruiseDay
                      ? "rgba(20, 150, 110, 0.10)"
                      : hasTasks
                      ? (() => {
                          // Color-coded day highlight based on the most urgent (non-completed) task on that day.
                          const u =
                            mostUrgent && !isTaskFullyCompleted(state, mostUrgent.task) ? mostUrgent.urgency : null;
                          if (u === "overdue") return "rgba(244, 169, 169, 0.11)"; // matte pale red
                          if (u === "inRange") return "rgba(254, 240, 138, 0.13)"; // matte pale yellow
                          return "rgba(191, 219, 254, 0.27)"; // matte pale blue (soon/later)
                        })()
                      : "transparent",
                    border: "none",
                    boxShadow: (() => {
                      // Slightly darker but thinner-feeling grid lines
                      const u =
                        mostUrgent && !isTaskFullyCompleted(state, mostUrgent.task) ? mostUrgent.urgency : null;

                      const baseLine = !inThisMonth
                        ? "inset 0 0 0 0.5px rgba(0, 0, 0, 0.1)"
                        : "inset 0 0 0 0.5px rgba(0, 0, 0, 0.22)";

                      const urgencyRing =
                        !inThisMonth || !hasTasks
                          ? ""
                          : u === "overdue"
                          ? ", inset 0 0 0 0.75px rgba(248, 113, 113, 0.17)"
                          : u === "inRange"
                          ? ", inset 0 0 0 0.75px rgba(217,119,6,0.22)"
                          : ", inset 0 0 0 0.75px rgba(59,130,246,0.24)";

                      const cruise = isCruiseDay && inThisMonth ? ", inset 0 0 0 0.75px rgba(20, 150, 111, 0.14)" : "";
                      const today = isToday ? ", inset 0 0 0 1px rgba(98, 26, 26, 0.42)" : "";
                      return baseLine + urgencyRing + cruise + today;
                    })(),
                  }}
>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: !inThisMonth ? "rgba(0,0,0,0.35)" : isToday ? "rgba(127, 29, 29, 0.92)" : "rgba(0,0,0,0.70)",
                      }}
                    >
                      {inThisMonth ? d.getDate() : ""}
                    </div>

                    {isToday && inThisMonth ? (
                      <span
                        className={styles.badge}
                        style={{
                          borderColor: "rgba(0,0,0,0.20)",
                          color: "rgba(153,27,27,0.95)",
                          background: "rgba(248, 238, 238, 0.1)",
                        }}
                      >
                        Today
                      </span>
                    ) : null}

                    {sailDay && inThisMonth ? (
                      <span
                        className={styles.badge}
                        style={{
                          borderColor: "rgba(0,0,0,0.20)",
                          color: "rgba(24, 142, 103, 0.55)",
                          background: "rgba(16,185,129,0.10)",
                        }}
                      >
                        Wedding Day
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
                            style={{
                              textAlign: "left",
                              display: "-webkit-box",
                              WebkitBoxOrient: "vertical" as any,
                              WebkitLineClamp: 2,
                              overflow: "hidden",
                            }}
                            type="button"
                            onClick={() => scrollToTask(ct.task.id)}
                            title="Jump to task in list"
                          >
                            {completed ? "✅" : <UrgencyDot urgency={ct.urgency} />} {ct.task.title}
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

        <div className={styles.muted} style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 10 }}>
          {onToday ? (
            <button className={styles.btn + " " + styles.btnSmall} onClick={onToday} type="button">
              Today
            </button>
          ) : null}
          <span>Tasks are shown on their Do-by dates.</span>
        </div>
      </div>
    );
  }

  return (
    <PageShell title="Wedding Plan" subtitle="A timeline to keep everything on track before you get married.">
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
                    return sanitizeState({ ...s, ui: { ...s.ui, showHowTo: nextShow } });
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
                className={styles.btn + " " + styles.btnSmall + " " + "text-xs"}
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
              {/* Left-align the "Not exported" signal so the Export/Import button group stays visually balanced. */}
              {!isExportCurrent ? (
                <span
                  className="ml-2 rounded-full border border-black-200/70 bg-yellow-50/70 px-2 py-0.5 text-[11px] font-semibold text-yellow-900/70"
                  title="You have changes that haven’t been exported yet"
                >
                  Not exported
                </span>
              ) : null}

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
                Calendar
                
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

              <button
                className={styles.btn + " " + styles.btnIcon}
                onClick={() => setShowResetConfirm(true)}
                type="button"
                title="Reset"
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
                  await importPlan(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {/* Reset confirmation */}
          {showResetConfirm ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
              <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-xl">
                <div className="text-sm font-extrabold text-black/85">Reset this wedding plan?</div>
                <div className="mt-1 text-xs text-black/60">
                  This clears the saved wedding plan on this device. You can export first if you want a backup.
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className={styles.btn + " " + styles.btnSmall}
                    type="button"
                    onClick={() => setShowResetConfirm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.btn + " " + styles.btnSmall}
                    type="button"
                    onClick={() => {
                      setShowResetConfirm(false);
                      resetEverything();
                    }}
                    style={{ borderColor: "rgba(244, 63, 94, 0.35)", background: "rgba(244, 63, 94, 0.08)" }}
                  >
                    Yes, reset
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Short timeline hint */}
          {isShortTimeline ? (
            <div className={styles.card} style={{ padding: 10, background: "rgba(244, 82, 82, 0.02)", fontSize: 11 }}>
              Your wedding day is approaching. Focus on red and yellow tasks first.
            </div>
          ) : null}
          
                    {/* Inputs + profiles */}
          <div className={styles.card}>
            <div className="grid grid-cols-1 gap-3">
              <label>
                <div className={styles.label}>Wedding Date</div>
                <input
                  type="date"
                  value={state.weddingDateISO ?? ""}
                  onChange={(e) => {
                    const iso = e.target.value || "";
                    setState((s) =>
                      sanitizeState({
                        ...s,
                        weddingDateISO: iso,
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

              {/* Profiles (optional) */}
              <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!state.isFaithTraditional}
                    onChange={(e) =>
                      setState((s) => sanitizeState({ ...s, isFaithTraditional: e.target.checked }))
                    }
                  />
                  Faith or traditional ceremony
                </label>

                <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!state.isDestination}
                    onChange={(e) => setState((s) => sanitizeState({ ...s, isDestination: e.target.checked }))}
                  />
                  Destination wedding
                </label>

                <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={!!state.isLargeGuestList}
                    onChange={(e) =>
                      setState((s) => sanitizeState({ ...s, isLargeGuestList: e.target.checked }))
                    }
                  />
                  Large guest list (150+)
                </label>
              </div>

              <label className={styles.muted} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                <input
                  type="checkbox"
                  checked={!!state.isFirstTime}
                  onChange={(e) => setState((s) => sanitizeState({ ...s, isFirstTime: e.target.checked }))}
                />
                First time planning (beginner-friendly hints)
              </label>
            </div>

            <div className={styles.row} style={{ marginTop: 10, justifyContent: "space-between" }}>
              <div className={styles.muted}>
                {wedding ? (
                  <>
                    <span style={{ fontWeight: 900, color: "rgba(0,0,0,0.82)", fontSize: 14 }}>Wedding Date:</span>{" "}
                    {formatDateLong(wedding)} • <span className={styles.badge} style={{ borderColor: "rgba(0,0,0,0.20)", background: "rgba(153,27,27,0.06)", color: "rgba(127,29,29,0.92)", fontWeight: 800 }}>{daysToGo} days to go</span>
                  </>
                ) : (
                  "Enter a valid wedding date."
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
              <span className={styles.badge} style={{ borderColor: "rgba(0,0,0,0.20)", background: "rgba(0,0,0,0.02)" }}>
            <UrgencyDot urgency="overdue" /> Overdue: <b>{statusCounts.overdue}</b>
            </span>

            <span className={styles.badge} style={{ borderColor: "rgba(0,0,0,0.20)", background: "rgba(0,0,0,0.02)" }}>
            <UrgencyDot urgency="inRange" /> Due soon: <b>{statusCounts.inRange}</b>
            </span>

            <span className={styles.badge} style={{ borderColor: "rgba(0,0,0,0.20)", background: "rgba(0,0,0,0.02)" }}>
            <UrgencyDot urgency="soon" /> Coming up: <b>{statusCounts.soon}</b>
            </span>

            <span className={styles.badge} style={{ borderColor: "rgba(0,0,0,0.20)", background: "rgba(0,0,0,0.02)" }}>
            <UrgencyDot urgency="later" /> Later: <b>{statusCounts.later}</b>
            </span>

              <span className={styles.muted} style={{ marginLeft: 8 }}>
                Remaining: <b>{remainingCount}</b> • Completed: <b>{completedCount}</b>
              </span>
            </div>
          </div>

          {/* Calendar */}
          {state.ui.showCalendar ? (
            <div>
              <div className={styles.calendarHeader}>
                <button className={styles.btn} onClick={() => shiftCalendarMonth(-1)} type="button">
                  ←
                </button>
                <div className={styles.calendarHeaderCenter} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "rgba(0,0,0,0.65)" }}>
                    {leftMonthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                  </span>
                </div>
                <button className={styles.btn} onClick={() => shiftCalendarMonth(1)} type="button">
                  →
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <MonthPanel monthStart={leftMonthStart} grid={leftGrid} onToday={goToTodayMonth} />
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
                          className={`rounded-lg border border-black/10 bg-white/60 px-3 py-2 border-l-4 ${
                            completed ? "border-l-green-200 opacity-90" : leftAccent(ct.urgency)
                          }`}
                          style={{
                            boxShadow: flashTaskId === ct.task.id ? "0 0 0 3px rgba(99,102,241,0.18)" : undefined,
                          }}
                        >
                          <div className={styles.row} style={{ justifyContent: "space-between" }}>
                            <div style={{ minWidth: 0 }}>
                              <div className={styles.row} style={{ gap: 6, flexWrap: "wrap" }}>
                                <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(0,0,0,0.82)", lineHeight: "16px" }}>
                                  <span style={{ marginRight: 4 }}>{completed ? "✅" : <UrgencyDot urgency={ct.urgency} />}</span>
                                  {ct.task.title}
                                </div>

                                {completed ? (
                                  <span className="rounded-full border px-2 py-0.5 text-[11px] font-semibold border-gray-200 bg-emerald-50 text-emerald-700">
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

                            {/* Chevron toggle (compact). Keeps the layout calm and still clearly interactive. */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                toggleExpanded(ct.task.id);
                              }}
                              aria-label={expanded ? "Collapse checklist" : "Expand checklist"}
                              aria-expanded={expanded}
                              title={expanded ? "Collapse" : "Expand"}
                              className={styles.btn + " " + styles.btnSmall}
                              style={{
                                width: 30,
                                height: 26,
                                padding: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 14,
                                lineHeight: "14px",
                                opacity: 0.9,
                              }}
                            >
                              {expanded ? "▾" : "▸"}
                            </button>
                          </div>

                          {expanded ? (
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                              {ct.task.checklistItems.map((label, idx) => {
                                const itemId = `${ct.task.id}::${idx}`;
                                const entry = state.checklist[itemId] || {};
                                const noteOpen = !!openRemark[itemId] || !!(entry.remark && entry.remark.trim());
                                return (
                                  <div key={itemId} className="py-2 border-t border-black/5 first:border-t-0">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                      <label
                                        style={{
                                          display: "flex",
                                          gap: 8,
                                          alignItems: "center",
                                          fontSize: 12,
                                          color: "rgba(0,0,0,0.78)",
                                          lineHeight: "16px",
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

                                      <button
                                        type="button"
                                        className={styles.btn + " " + styles.btnSmall}
                                        style={{ fontSize: 11, padding: "4px 8px", opacity: 0.85 }}
                                        onClick={() =>
                                          setOpenRemark((m) => ({ ...m, [itemId]: !(m[itemId] ?? false) }))
                                        }
                                        title={noteOpen ? "Hide note" : "Add a note"}
                                      >
                                        {noteOpen ? "Note" : "+ Note"}
                                      </button>
                                    </div>

                                    {noteOpen ? (
                                      <div className="mt-2">
                                        <input
                                          value={entry.remark ?? ""}
                                          onChange={(e) => setChecklistRemark(itemId, e.target.value)}
                                          placeholder="Short note (optional)"
                                          className={styles.input}
                                          style={{
                                            padding: "6px 8px",
                                            fontSize: 12,
                                            height: 30,
                                            maxWidth: 520,
                                          }}
                                        />
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>




          {/* Info / About */}
          <div className="mx-auto max-w-5xl" ref={infoRef}>
            <div className={styles.card} style={{ padding: 14 }}>
                <div className={styles.sectionTitle} style={{ fontSize: 14 }}>Info</div>
                <div className={styles.muted} style={{ marginTop: 4 }}>
                  Beginner-friendly tips so you know what to do next. (General guidance — always confirm local rules and venue policies.)
                </div>

                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  <details open={state.ui.showHowTo}>
                    <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 12 }}>How to use this planner</summary>
                    <div className={styles.muted} style={{ marginTop: 8, display: "grid", gap: 8 }}>
                      <div><b>1)</b> Pick your <b>Wedding Date</b>. Everything is generated relative to that date.</div>
                      <div><b>2)</b> Start with <b>red</b> and <b>yellow</b> tasks. Red is overdue. Yellow is “do soon”.</div>
                      <div><b>3)</b> Click the <b>chevron</b> (▸) to open a task and check items off.</div>
                      <div><b>4)</b> Use <b>Notes</b> inside checklist items to save names, prices, contact info, and decisions.</div>
                      <div><b>5)</b> Use <b>Export</b> for a portable backup. Use <b>Import</b> to restore it later.</div>
                      <div><b>Short timeline?</b> If your wedding is soon, many early tasks will show as red — that’s expected. Focus on what you can still book or decide now.</div>
                    </div>
                  </details>

                  <details open={state.ui.showAbout}>
                    <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 12 }}>About, privacy, and what gets saved</summary>
                    <div className={styles.muted} style={{ marginTop: 8, display: "grid", gap: 8 }}>
                      <div><b>Local-only:</b> Your plan is saved in your browser on this device. There is no account and nothing is sent to a server by this page.</div>
                      <div><b>Reset:</b> The Reset button clears the saved plan on this device so you can start fresh.</div>
                      <div><b>Profiles:</b> Profiles add extra tasks for common scenarios. They don’t remove the core timeline.</div>
                      <div><b>Notes:</b> Keep notes simple (vendor name, quote, due date, link). You can paste URLs too.</div>
                    </div>
                  </details>

                  <details>
                    <summary style={{ cursor: "pointer", fontWeight: 700, fontSize: 12 }}>What do the profiles add?</summary>
                    <div className={styles.muted} style={{ marginTop: 8, display: "grid", gap: 8 }}>
                      <div><b>Faith or traditional ceremony</b>: preparation steps, documents, and ceremony rules.</div>
                      <div><b>Destination wedding</b>: location rules, guest travel coordination, and legal recognition checks.</div>
                      <div><b>Large guest list (150+)</b>: staffing, guest flow, and logistics tasks.</div>
                    </div>
                  </details>
                </div>
              </div>
          </div>

          {/* Wedding basics / FAQ */}
          <div className="mx-auto max-w-5xl">
            <div className={styles.card} style={{ padding: 14 }}>
              <div className={styles.sectionTitle} style={{ fontSize: 14 }}>Wedding basics (FAQ)</div>
              <div className={styles.muted} style={{ marginTop: 4 }}>
                Quick answers to common beginner questions. Keep it simple: book the big items early, then confirm details closer to the date.
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 12 }}>What should we do first?</summary>
                  <div className={styles.muted} style={{ marginTop: 6 }}>
                    Start with <b>budget</b>, a rough <b>guest count</b>, and your <b>venue</b>. Those three decisions control most costs and your available dates.
                  </div>
                </details>

                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 12 }}>What are the “big things” to book early?</summary>
                  <div className={styles.muted} style={{ marginTop: 6 }}>
                    Venue, photographer/videographer, and catering (if not included). If you want a specific date/season, book earlier.
                  </div>
                </details>

                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 12 }}>If our wedding is only 3 months away, is this still usable?</summary>
                  <div className={styles.muted} style={{ marginTop: 6 }}>
                    Yes. Many early tasks will show as <b>red</b> (overdue). That’s not “failure” — it’s a priority filter. Focus on booking venue, catering, and a photographer first.
                  </div>
                </details>

                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 12 }}>When should we get the marriage license?</summary>
                  <div className={styles.muted} style={{ marginTop: 6 }}>
                    Many locations have a validity window (it must be used within a certain number of days). Check your local requirements: IDs, fees, appointments, and waiting periods.
                  </div>
                </details>

                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 12 }}>What’s a realistic RSVP deadline?</summary>
                  <div className={styles.muted} style={{ marginTop: 6 }}>
                    Typically <b>3–6 weeks</b> before the wedding, so you can finalize headcount and seating. For destination travel, consider an earlier deadline.
                  </div>
                </details>

                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 12 }}>How do vendor payments usually work?</summary>
                  <div className={styles.muted} style={{ marginTop: 6 }}>
                    Many vendors take a deposit upfront and the remaining balance close to the event. Save your payment schedule in Notes and prepare labeled envelopes if you’ll pay on the day.
                  </div>
                </details>

                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 12 }}>Do we need a coordinator?</summary>
                  <div className={styles.muted} style={{ marginTop: 6 }}>
                    Not required, but helpful if you have many vendors, a large guest list, or a complex venue. A “day-of coordinator” can be enough without becoming a full planning service.
                  </div>
                </details>

                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 12 }}>What should be in a simple day-of timeline?</summary>
                  <div className={styles.muted} style={{ marginTop: 6 }}>
                    Hair/makeup start, getting-ready photos, travel time, ceremony start, cocktail hour, reception milestones (entrance, speeches, first dance, cake), and vendor load-out. Share it with vendors and key helpers.
                  </div>
                </details>

                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 12 }}>What should we write in Notes?</summary>
                  <div className={styles.muted} style={{ marginTop: 6 }}>
                    Vendor name, contact info, quote amount, deposit paid, due date, contract link, and any key decisions (menu chosen, package selected). Keep it short and searchable.
                  </div>
                </details>

                <details>
                  <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: 12 }}>How do we avoid forgetting something important?</summary>
                  <div className={styles.muted} style={{ marginTop: 6 }}>
                    Use the calendar as your “radar”: days with tasks are highlighted. Aim to clear red tasks first, then keep yellow tasks small and steady each week.
                  </div>
                </details>
              </div>
            </div>
          </div>


    </PageShell>

    
    
  );

  

  
}
