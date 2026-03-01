"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import PageShell from "@/components/PageShell";

import {
  TAX_SEASON_YEAR,
  TAX_INCOME_YEAR,
  type TaxProfileAnswers,
  type ExpectedForm,
  buildExpectedForms,
} from "./taxRules";

/** ================
 * State + storage
 * ================ */

type ChecklistItem = { received?: boolean; remark?: string };

type TaxDocChecklistStateV1 = {
  v: 1;
  tool: "tax-document-checklist";
  seasonYear: number; // hardcoded season
  incomeYear: number;

  answers: TaxProfileAnswers;

  /** formId -> status */
  checklist: Record<string, ChecklistItem>;

  ui: {
    showHowTo: boolean;
    showAbout: boolean;
    showOnlyWaiting: boolean;
    showOnlyReceived: boolean;
  };
};

const LS_KEY = `eventclocks:tax-document-checklist:${TAX_SEASON_YEAR}:v1`;
const LS_EXPORT_SIG_KEY = `eventclocks:tax-document-checklist:lastExportSig:${TAX_SEASON_YEAR}:v1`;

/** Filing deadline (US federal typical) */
const FILING_DEADLINE_ISO = `${TAX_SEASON_YEAR}-04-15`;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function parseISODateLocal(iso: string) {
  const [y, m, d] = (iso || "").split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function daysUntil(iso: string) {
  const today = startOfToday();
  const dt = parseISODateLocal(iso);
  if (!dt) return null;
  const ms = 24 * 60 * 60 * 1000;
  return Math.round((dt.getTime() - today.getTime()) / ms);
}
function stableStringify(obj: any) {
  const allKeys: string[] = [];
  JSON.stringify(obj, (k, v) => (allKeys.push(k), v));
  allKeys.sort();
  return JSON.stringify(obj, allKeys);
}
function computeSignature(state: TaxDocChecklistStateV1) {
  return stableStringify(state);
}
function downloadJson(filename: string, state: TaxDocChecklistStateV1) {
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

const DEFAULT_ANSWERS: TaxProfileAnswers = {
  employedW2: false,
  freelance1099: false,
  soldStocks: false,
  crypto: false,
  bankInterest: true,
  dividends: false,
  retirementDistribution: false,
  unemployment: false,
  socialSecurity: false,
  paymentApps1099k: false,
  partnershipK1: false,

  mortgage: false,
  studentLoanInterest: false,
  tuition1098t: false,
  marketplaceInsurance1095a: false,
  employerInsurance1095c: false,
  otherCoverage1095b: false,

  iraContrib: false,
};

const DEFAULT_STATE: TaxDocChecklistStateV1 = {
  v: 1,
  tool: "tax-document-checklist",
  seasonYear: TAX_SEASON_YEAR,
  incomeYear: TAX_INCOME_YEAR,
  answers: DEFAULT_ANSWERS,
  checklist: {},
  ui: {
    showHowTo: false,
    showAbout: false,
    showOnlyWaiting: false,
    showOnlyReceived: false,
  },
};

function sanitizeState(raw: any): TaxDocChecklistStateV1 {
  const base = DEFAULT_STATE;

  const answersRaw = raw?.answers ?? {};
  const answers: TaxProfileAnswers = {
    ...base.answers,

    employedW2: !!answersRaw?.employedW2,
    freelance1099: !!answersRaw?.freelance1099,
    soldStocks: !!answersRaw?.soldStocks,
    crypto: !!answersRaw?.crypto,
    bankInterest: answersRaw?.bankInterest === undefined ? base.answers.bankInterest : !!answersRaw.bankInterest,
    dividends: !!answersRaw?.dividends,
    retirementDistribution: !!answersRaw?.retirementDistribution,
    unemployment: !!answersRaw?.unemployment,
    socialSecurity: !!answersRaw?.socialSecurity,
    paymentApps1099k: !!answersRaw?.paymentApps1099k,
    partnershipK1: !!answersRaw?.partnershipK1,

    mortgage: !!answersRaw?.mortgage,
    studentLoanInterest: !!answersRaw?.studentLoanInterest,
    tuition1098t: !!answersRaw?.tuition1098t,
    marketplaceInsurance1095a: !!answersRaw?.marketplaceInsurance1095a,
    employerInsurance1095c: !!answersRaw?.employerInsurance1095c,
    otherCoverage1095b: !!answersRaw?.otherCoverage1095b,

    iraContrib: !!answersRaw?.iraContrib,
  };

  const checklistRaw = typeof raw?.checklist === "object" && raw?.checklist ? raw.checklist : {};
  const checklist: Record<string, ChecklistItem> = {};
  for (const k of Object.keys(checklistRaw)) {
    const item = checklistRaw[k] || {};
    checklist[k] = { received: !!item.received, remark: typeof item.remark === "string" ? item.remark : "" };
  }

  return {
    ...base,
    ...raw,
    v: 1,
    tool: "tax-document-checklist",
    seasonYear: typeof raw?.seasonYear === "number" ? raw.seasonYear : base.seasonYear,
    incomeYear: typeof raw?.incomeYear === "number" ? raw.incomeYear : base.incomeYear,
    answers,
    checklist,
    ui: {
      ...base.ui,
      ...(typeof raw?.ui === "object" && raw?.ui ? raw.ui : {}),
      showHowTo: raw?.ui?.showHowTo === undefined ? base.ui.showHowTo : !!raw.ui.showHowTo,
      showAbout: raw?.ui?.showAbout === undefined ? base.ui.showAbout : !!raw.ui.showAbout,
      showOnlyWaiting: raw?.ui?.showOnlyWaiting === undefined ? base.ui.showOnlyWaiting : !!raw.ui.showOnlyWaiting,
      showOnlyReceived:
        raw?.ui?.showOnlyReceived === undefined ? base.ui.showOnlyReceived : !!raw.ui.showOnlyReceived,
    },
  };
}

/** ================
 * UI helpers
 * ================ */

type Tone = "ok" | "warn" | "late" | "neutral";

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const cls =
    tone === "late"
      ? "border-rose-200/70 bg-rose-50/80 text-rose-700"
      : tone === "warn"
      ? "border-amber-200/70 bg-amber-50/80 text-amber-900/80"
      : tone === "ok"
      ? "border-sky-200/70 bg-sky-50/80 text-sky-900/80"
      : "border-black/10 bg-white/60 text-black/70 dark:border-white/15 dark:bg-white/5 dark:text-white/70";

  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {children}
    </span>
  );
}

function statusToneForForm(received: boolean, endISO: string) {
  if (received) return "ok" as const;

  const today = startOfToday();
  const end = parseISODateLocal(endISO);
  if (!end) return "neutral" as const;

  const ms = 24 * 60 * 60 * 1000;
  const days = Math.round((end.getTime() - today.getTime()) / ms);
  // If past typical end date, it’s likely already available.
  if (days < 0) return "late" as const;

  // We intentionally *do not* show a separate “coming soon” label anymore.
  // We keep a softer "warn" tone for <= 7 days if you want subtle visual hinting.
  if (days <= 7) return "warn" as const;

  return "neutral" as const;
}

function InfoTip({ text, ariaLabel }: { text: string; ariaLabel?: string }) {
  return (
    <span className="group relative inline-flex align-middle">
      <span
        className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full border border-black/15 text-[10px] font-black text-black/55 shadow-sm dark:border-white/20 dark:text-white/60"
        aria-label={ariaLabel || "More info"}
        title={ariaLabel || "More info"}
      >
        i
      </span>

      <span className="pointer-events-none absolute left-1/2 top-6 z-20 hidden w-72 -translate-x-1/2 rounded-xl border border-black/10 bg-white p-3 text-xs text-black/80 shadow-lg group-hover:block dark:border-white/15 dark:bg-[#111] dark:text-white/80">
        {text}
      </span>
    </span>
  );
}

function Divider() {
  return <div className="my-3 h-px w-full bg-black/5 dark:bg-white/10" />;
}

function AccordionItem({
  title,
  children,
  defaultOpen = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  // Controlled open state (and NOT passing defaultOpen to DOM) avoids the React warning.
  const [isOpen, setIsOpen] = React.useState<boolean>(defaultOpen);

  return (
    <details
      className="rounded-xl border border-black/10 bg-white/70 p-3 shadow-sm dark:border-white/15 dark:bg-white/5"
      open={isOpen}
      onToggle={(e) => setIsOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer select-none font-semibold text-black/80 dark:text-white/80">{title}</summary>
      <div className="mt-2 text-sm text-black/70 dark:text-white/70">{children}</div>
    </details>
  );
}

function cardClassesForTone(tone: Tone) {
  // Stronger "at-a-glance" separation between received vs waiting.
  if (tone === "ok") {
    return "border-sky-200/70 bg-sky-50/50 dark:border-white/15 dark:bg-white/5";
  }
  if (tone === "late") {
    return "border-rose-200/70 bg-rose-50/50 dark:border-white/15 dark:bg-white/5";
  }
  if (tone === "warn") {
    return "border-amber-200/70 bg-amber-50/50 dark:border-white/15 dark:bg-white/5";
  }
  return "border-black/10 bg-white dark:border-white/15 dark:bg-white/5";
}

function smallButtonCls() {
  return "rounded-lg border border-black/10 bg-white px-2.5 py-1 text-xs font-semibold text-black/75 shadow-sm hover:bg-black/5 dark:border-white/15 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10";
}

/** ================
 * Component
 * ================ */

export default function TaxDocumentChecklistClient() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const whatsNewRef = useRef<HTMLDivElement | null>(null);
  const faqRef = useRef<HTMLDivElement | null>(null);

  const [state, setState] = useState<TaxDocChecklistStateV1>(DEFAULT_STATE);
  const [toast, setToast] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [importYearNote, setImportYearNote] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.tool === "tax-document-checklist") setState(sanitizeState(parsed));
        else setState(sanitizeState(DEFAULT_STATE));
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

  const expectedForms: ExpectedForm[] = useMemo(() => buildExpectedForms(state.answers), [state.answers]);

  function setAnswer<K extends keyof TaxProfileAnswers>(key: K, value: boolean) {
    setState((s) => sanitizeState({ ...s, answers: { ...s.answers, [key]: value } }));
  }

  function toggleReceived(formId: string) {
    setState((s) =>
      sanitizeState({
        ...s,
        checklist: { ...s.checklist, [formId]: { ...s.checklist[formId], received: !s.checklist[formId]?.received } },
      })
    );
  }

  function setRemark(formId: string, remark: string) {
    setState((s) =>
      sanitizeState({
        ...s,
        checklist: { ...s.checklist, [formId]: { ...s.checklist[formId], remark } },
      })
    );
  }

  const currentSig = useMemo(() => computeSignature(state), [state]);
  const isExportCurrent = useMemo(() => !!lastExportSig && lastExportSig === currentSig, [lastExportSig, currentSig]);

  function resetEverything() {
    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_EXPORT_SIG_KEY);
    } catch {}
    setLastExportSig("");
    setImportYearNote("");
    setSearch("");
    setState(sanitizeState(DEFAULT_STATE));
    setToast("Reset.");
  }

  function exportPlan() {
    downloadJson(`eventclocks-tax-document-checklist-${TAX_SEASON_YEAR}.json`, state);
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
      if (parsed?.tool !== "tax-document-checklist") throw new Error("Invalid checklist file.");

      const incoming = sanitizeState(parsed);

      const inYear = Number(incoming?.seasonYear);
      if (inYear && inYear !== TAX_SEASON_YEAR) {
        setImportYearNote(`Imported data from ${inYear}. Some rules/thresholds may differ for ${TAX_SEASON_YEAR}.`);
      } else {
        setImportYearNote("");
      }

      setState(incoming);

      setLastExportSig("");
      try {
        localStorage.setItem(LS_EXPORT_SIG_KEY, "");
      } catch {}
      setToast("Imported.");
    } catch (err: any) {
      setToast(err?.message || "Import failed.");
    }
  }

  const receivedCount = useMemo(() => {
    return expectedForms.reduce((acc, f) => acc + (state.checklist[f.id]?.received ? 1 : 0), 0);
  }, [expectedForms, state.checklist]);

  const waitingCount = useMemo(() => expectedForms.length - receivedCount, [expectedForms.length, receivedCount]);

  const likelyAvailableNowCount = useMemo(() => {
    return expectedForms.reduce((acc, f) => {
      const received = !!state.checklist[f.id]?.received;
      if (received) return acc;
      const tone = statusToneForForm(false, f.availability.endISO);
      return acc + (tone === "late" ? 1 : 0);
    }, 0);
  }, [expectedForms, state.checklist]);

  const deadlineDays = useMemo(() => daysUntil(FILING_DEADLINE_ISO), []);
  const deadlineTone: Tone = useMemo(() => {
    if (deadlineDays === null) return "neutral";
    if (deadlineDays < 0) return "late";
    if (deadlineDays <= 14) return "warn";
    return "neutral";
  }, [deadlineDays]);

  const filteredForms = useMemo(() => {
    const q = search.trim().toLowerCase();

    return expectedForms.filter((f) => {
      const isReceived = !!state.checklist[f.id]?.received;

      if (state.ui.showOnlyWaiting && isReceived) return false;
      if (state.ui.showOnlyReceived && !isReceived) return false;

      if (!q) return true;

      const blob = `${f.id} ${f.name} ${f.issuer} ${f.delivery} ${f.why} ${f.availability.note || ""}`.toLowerCase();
      return blob.includes(q);
    });
  }, [expectedForms, search, state.ui.showOnlyWaiting, state.ui.showOnlyReceived, state.checklist]);

  // FAQ content for (a) UI accordions and (b) JSON-LD FAQ schema
  const faqItems = useMemo(
    () => [
      {
        q: "What is Marketplace insurance?",
        a: "Marketplace insurance means health coverage purchased through HealthCare.gov or your state’s ACA exchange (Obamacare/ACA). If you had Marketplace coverage—especially if you received a premium subsidy—you typically use Form 1095-A.",
      },
      {
        q: "Do I need to wait for 1095-B or 1095-C to file?",
        a: "For federal returns, many taxpayers do not need to wait for 1095-B or 1095-C. These are often provided for records. However, confirm any state-specific requirements that might apply to you.",
      },
      {
        q: "What if I never receive a form?",
        a: "You’re still responsible for reporting income you received, even if a form is missing. Check the issuer’s online portal, then contact them if needed. Keep your own records (paystubs, bank statements, invoices).",
      },
      {
        q: "Why does a form say 'corrected'?",
        a: "Some issuers (especially brokerages) may send corrected versions if they discover changes after the initial form is issued. If you see a corrected form, you may need to update what you entered in tax software.",
      },
      {
        q: "Is this tool storing my data?",
        a: "No. Your answers and checklist are saved only in your browser’s local storage. You can export a JSON backup and import it later to restore your checklist.",
      },
    ],
    []
  );

  const faqJsonLd = useMemo(() => {
    const obj = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems.map((x) => ({
        "@type": "Question",
        name: x.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: x.a,
        },
      })),
    };
    return JSON.stringify(obj);
  }, [faqItems]);

  return (
    <PageShell
      title={`Tax Document Checklist (${TAX_SEASON_YEAR} Filing Season)`}
      subtitle={`For ${TAX_INCOME_YEAR} income. Generate a personalized list of forms to expect and track what's missing.`}
    >
      <main className="mx-auto max-w-4xl px-6 py-6">
        {/* FAQ structured data (SEO) */}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd }} />

        {/* Top row: summary pills + jump links */}
        <div className="mb-4 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={waitingCount === 0 ? "ok" : "neutral"}>
              <span className="font-black">{expectedForms.length}</span> expected
            </Pill>
            <Pill tone={receivedCount > 0 ? "ok" : "neutral"}>
              <span className="font-black">{receivedCount}</span> received
            </Pill>
            <Pill tone={waitingCount > 0 ? "warn" : "ok"}>
              <span className="font-black">{waitingCount}</span> waiting
            </Pill>
            <Pill tone={likelyAvailableNowCount > 0 ? "late" : "neutral"}>
              <span className="font-black">{likelyAvailableNowCount}</span> likely available now
            </Pill>
            <Pill tone={deadlineTone}>
              Deadline: {FILING_DEADLINE_ISO}
              {deadlineDays !== null ? (
                <span className="ml-1 font-black">
                  ({deadlineDays < 0 ? `${Math.abs(deadlineDays)} days past` : `${deadlineDays} days left`})
                </span>
              ) : null}
            </Pill>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-black/60 dark:text-white/60">
            <button
              type="button"
              className="underline decoration-black/15 hover:text-black/80 dark:decoration-white/15 dark:hover:text-white/85"
              onClick={() => whatsNewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              What changed this year?
            </button>
            <button
              type="button"
              className="underline decoration-black/15 hover:text-black/80 dark:decoration-white/15 dark:hover:text-white/85"
              onClick={() => faqRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              FAQ
            </button>
          </div>
        </div>

        {/* Small control row */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={smallButtonCls()}
              onClick={() => setState((s) => sanitizeState({ ...s, ui: { ...s.ui, showHowTo: !s.ui.showHowTo } }))}
            >
              How it works
            </button>
            <button
              type="button"
              className={smallButtonCls()}
              onClick={() => setState((s) => sanitizeState({ ...s, ui: { ...s.ui, showAbout: !s.ui.showAbout } }))}
            >
              About
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={smallButtonCls()} onClick={exportPlan} title={isExportCurrent ? "Export is up to date" : "Export a backup JSON"}>
              {isExportCurrent ? "Export (saved)" : "Export"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importPlan(f);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
            />
            <button type="button" className={smallButtonCls()} onClick={() => fileInputRef.current?.click()}>
              Import
            </button>

            <button type="button" className={smallButtonCls()} onClick={() => setShowResetConfirm(true)}>
              Reset
            </button>
          </div>
        </div>

        {/* Optional toast */}
        {toast ? (
          <div className="mb-3 rounded-xl border border-black/10 bg-white/70 px-3 py-2 text-sm text-black/80 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-white/80">
            {toast}
          </div>
        ) : null}

        {importYearNote ? (
          <div className="mb-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-sm text-amber-900/80">
            {importYearNote}
          </div>
        ) : null}

        {/* How-to / About */}
        {(state.ui.showHowTo || state.ui.showAbout) && (
          <div className="mb-4 rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm dark:border-white/15 dark:bg-white/5">
            {state.ui.showHowTo ? (
              <div className="mb-3">
                <div className="text-sm font-black text-black/80 dark:text-white/80">How it works</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-black/70 dark:text-white/70">
                  <li>Answer the questions to generate an “Expected forms” checklist.</li>
                  <li>Mark items as received so the “missing vs have” status is obvious.</li>
                  <li>Use “Waiting / Received” filters and search to focus your list.</li>
                  <li>Export a JSON backup anytime. Import later to restore.</li>
                  <li>This is local-only: nothing is uploaded to a server.</li>
                </ul>
                <Divider />
                <div className="text-xs text-black/55 dark:text-white/55">
                  Tip: Search by number (e.g., “1099-B”) or issuer (“brokerage”, “employer”, “marketplace”).
                </div>
              </div>
            ) : null}

            {state.ui.showAbout ? (
              <div>
                <div className="text-sm font-black text-black/80 dark:text-white/80">About</div>
                <div className="mt-2 text-sm text-black/70 dark:text-white/70">
                  Updated for the {TAX_SEASON_YEAR} U.S. filing season. This tool lists commonly issued forms and typical
                  availability windows. Requirements and thresholds may change.
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Intake */}
        <section className="mb-5 rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm dark:border-white/15 dark:bg-white/5">
          <div>
            <div className="text-base font-black text-black/85 dark:text-white/85">Quick profile</div>
            <div className="text-sm text-black/60 dark:text-white/60">Check what applies to you.</div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Group title="Income">
              <Q checked={state.answers.employedW2} onChange={(v) => setAnswer("employedW2", v)} label="I had a W-2 job" />

              <QWithTip
                checked={state.answers.freelance1099}
                onChange={(v) => setAnswer("freelance1099", v)}
                label="I freelanced / did contract work"
                tip="If you were paid as an independent contractor, you may receive a 1099-NEC from clients (depending on rules/thresholds)."
              />

              <QWithTip
                checked={state.answers.paymentApps1099k}
                onChange={(v) => setAnswer("paymentApps1099k", v)}
                label="I received business payments via PayPal/Venmo/Stripe/etc."
                tip="This can lead to Form 1099-K depending on thresholds and how you were paid. Many platforms post this in your online account."
              />

              <Q checked={state.answers.bankInterest} onChange={(v) => setAnswer("bankInterest", v)} label="I earned bank interest" />
              <Q checked={state.answers.dividends} onChange={(v) => setAnswer("dividends", v)} label="I received dividends" />

              <QWithTip
                checked={state.answers.soldStocks}
                onChange={(v) => setAnswer("soldStocks", v)}
                label="I sold stocks/ETFs"
                tip="If you sold investments in a brokerage account, you often get a consolidated 1099 package that includes 1099-B and others."
              />

              <QWithTip
                checked={state.answers.crypto}
                onChange={(v) => setAnswer("crypto", v)}
                label="I had crypto activity"
                tip="Exchanges/brokerages may provide tax documents if you sold, traded, or had reportable activity."
              />

              <Q checked={state.answers.retirementDistribution} onChange={(v) => setAnswer("retirementDistribution", v)} label="I withdrew from retirement (1099-R)" />
              <Q checked={state.answers.unemployment} onChange={(v) => setAnswer("unemployment", v)} label="I received unemployment (1099-G)" />
              <Q checked={state.answers.socialSecurity} onChange={(v) => setAnswer("socialSecurity", v)} label="I received Social Security (SSA-1099)" />
              <Q checked={state.answers.partnershipK1} onChange={(v) => setAnswer("partnershipK1", v)} label="I expect a K-1" />
            </Group>

            <Group title="Home, education, health">
              <Q checked={state.answers.mortgage} onChange={(v) => setAnswer("mortgage", v)} label="I have a mortgage (1098)" />
              <Q checked={state.answers.studentLoanInterest} onChange={(v) => setAnswer("studentLoanInterest", v)} label="I paid student loan interest (1098-E)" />
              <Q checked={state.answers.tuition1098t} onChange={(v) => setAnswer("tuition1098t", v)} label="I paid tuition / expect 1098-T" />

              <QWithTip
                checked={state.answers.marketplaceInsurance1095a}
                onChange={(v) => setAnswer("marketplaceInsurance1095a", v)}
                label="I had Marketplace health insurance (1095-A)"
                tip="Marketplace insurance means you enrolled through HealthCare.gov or your state ACA exchange. If you had a premium subsidy, 1095-A is commonly important."
              />

              <QWithTip
                checked={state.answers.employerInsurance1095c}
                onChange={(v) => setAnswer("employerInsurance1095c", v)}
                label="I had employer health insurance (may receive 1095-C)"
                tip="1095-C is often provided by large employers for records. Federally, many people do not need to wait for it to file."
              />

              <QWithTip
                checked={state.answers.otherCoverage1095b}
                onChange={(v) => setAnswer("otherCoverage1095b", v)}
                label="I had other non-Marketplace coverage (may receive 1095-B)"
                tip="1095-B may be provided by an insurer/coverage provider for records. Federally, many people do not need to wait for it to file."
              />

              <QWithTip
                checked={state.answers.iraContrib}
                onChange={(v) => setAnswer("iraContrib", v)}
                label="I contributed to an IRA (5498 later)"
                tip="Form 5498 often arrives later in spring because contributions can be made up to the tax deadline."
              />
            </Group>
          </div>
        </section>

        {/* Checklist */}
        <section className="mb-6 rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm dark:border-white/15 dark:bg-white/5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-base font-black text-black/85 dark:text-white/85">Expected forms checklist</div>
              <div className="text-sm text-black/60 dark:text-white/60">
                Received items are tinted blue. Missing items stay neutral (or pink if likely already available).
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-black/70 dark:text-white/70">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-black/20"
                  checked={state.ui.showOnlyWaiting}
                  onChange={(e) =>
                    setState((s) => sanitizeState({ ...s, ui: { ...s.ui, showOnlyWaiting: e.target.checked, showOnlyReceived: false } }))
                  }
                />
                Waiting only
              </label>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-black/70 dark:text-white/70">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-black/20"
                  checked={state.ui.showOnlyReceived}
                  onChange={(e) =>
                    setState((s) => sanitizeState({ ...s, ui: { ...s.ui, showOnlyReceived: e.target.checked, showOnlyWaiting: false } }))
                  }
                />
                Received only
              </label>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="w-full sm:max-w-md">
              <label className="block text-xs font-black text-black/60 dark:text-white/60">Search</label>
              <input
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm text-black/80 shadow-sm outline-none focus:border-black/20 dark:border-white/15 dark:bg-white/5 dark:text-white/80"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder='Try "1099-B", "brokerage", "insurance"...'
              />
            </div>

            <div className="text-xs text-black/55 dark:text-white/55">
              Tip: You’re responsible for reporting all income received, even if a form wasn’t issued.
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {filteredForms.length === 0 ? (
              <div className="rounded-xl border border-black/10 bg-white p-3 text-sm text-black/70 shadow-sm dark:border-white/15 dark:bg-white/5 dark:text-white/70">
                No matches. Try clearing search or toggling filters.
              </div>
            ) : (
              filteredForms.map((f) => {
                const received = !!state.checklist[f.id]?.received;
                const tone = statusToneForForm(received, f.availability.endISO);

                const statusLabel = received
                  ? "Received"
                  : tone === "late"
                  ? "Likely available now"
                  : "Not expected yet";

                const cardCls = cardClassesForTone(tone);

                return (
                  <div key={f.id} className={`rounded-2xl border p-4 shadow-sm ${cardCls}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-black text-black/85 dark:text-white/85">{f.name}</div>
                          <span className="rounded-full border border-black/10 bg-black/5 px-2 py-0.5 text-xs font-black text-black/60 dark:border-white/15 dark:bg-white/10 dark:text-white/60">
                            {f.id}
                          </span>

                          <Pill tone={received ? "ok" : tone === "late" ? "late" : "neutral"}>{statusLabel}</Pill>
                        </div>

                        <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                          <span className="font-semibold text-black/70 dark:text-white/70">Issuer:</span> {f.issuer} ·{" "}
                          <span className="font-semibold text-black/70 dark:text-white/70">Delivery:</span> {f.delivery}
                        </div>

                        <div className="mt-1 text-sm text-black/60 dark:text-white/60">
                          <span className="font-semibold text-black/70 dark:text-white/70">Typical window:</span>{" "}
                          {f.availability.startISO} → {f.availability.endISO}
                          {f.availability.note ? (
                            <span className="ml-2 text-black/55 dark:text-white/55">({f.availability.note})</span>
                          ) : null}
                        </div>

                        <div className="mt-2 text-sm text-black/70 dark:text-white/70">{f.why}</div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className={smallButtonCls()}
                          onClick={() => toggleReceived(f.id)}
                        >
                          {received ? "Mark waiting" : "Mark received"}
                        </button>
                      </div>
                    </div>

                    {/* Notes: make it unmissable */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-black/70 dark:text-white/70">
                          Notes / follow-ups{" "}
                          <span className="font-normal text-black/50 dark:text-white/50">(optional)</span>
                        </label>

                        <span className="text-[11px] text-black/45 dark:text-white/45">Visible only on this device</span>
                      </div>

                      <div className="mt-1 rounded-xl border border-black/10 bg-white/80 shadow-sm focus-within:border-black/25 focus-within:ring-2 focus-within:ring-black/10 dark:border-white/15 dark:bg-white/5 dark:focus-within:border-white/25 dark:focus-within:ring-white/10">
                        <textarea
                          className="w-full resize-y rounded-xl bg-transparent px-3 py-2 text-sm text-black/80 placeholder:text-black/40 focus:outline-none dark:text-white/80 dark:placeholder:text-white/35"
                          rows={2}
                          value={state.checklist[f.id]?.remark ?? ""}
                          onChange={(e) => setRemark(f.id, e.target.value)}
                          placeholder='Write what you’re waiting on… e.g. “Brokerage says corrected 1099 posts next week.”'
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* What changed this year */}
        <section
          ref={whatsNewRef}
          className="mb-6 rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm dark:border-white/15 dark:bg-white/5"
          id="whats-new"
        >
          <div className="text-base font-black text-black/85 dark:text-white/85">
            What’s new for the {TAX_SEASON_YEAR} filing season
          </div>

          <div className="mt-2 text-sm text-black/70 dark:text-white/70">
            Key highlights for this filing season. Tax rules and reporting thresholds can change each year, so this section is reviewed and updated annually.
          </div>

          <div className="mt-4 space-y-4 text-sm text-black/70 dark:text-white/70">
            <div>
              <div className="font-black text-black/80 dark:text-white/80">Standard deduction and tax bracket adjustments</div>
              <div className="mt-1">
                The IRS typically adjusts federal tax brackets and standard deduction amounts for inflation each year. Review the official figures for this filing season.
              </div>
            </div>

            <div>
              <div className="font-black text-black/80 dark:text-white/80">Retirement contribution limit updates</div>
              <div className="mt-1">
                Contribution limits for IRAs and employer retirement plans may change annually. If you contributed during the tax year, expect documentation such as Form 5498 (often later).
              </div>
            </div>

            <div>
              <div className="font-black text-black/80 dark:text-white/80">1099-K reporting thresholds</div>
              <div className="mt-1">
                Payment platform reporting requirements have evolved in recent years. Confirm the current threshold and rules for this filing season if you received platform payments.
              </div>
            </div>

            <div>
              <div className="font-black text-black/80 dark:text-white/80">Health insurance tax forms (1095-A, 1095-B, 1095-C)</div>
              <div className="mt-1">
                If you had Marketplace coverage, Form 1095-A can be important for premium tax credit reconciliation. Forms 1095-B/1095-C may also be provided for records depending on coverage source.
              </div>
            </div>

            <div>
              <div className="font-black text-black/80 dark:text-white/80">Filing and extension deadline confirmation</div>
              <div className="mt-1">
                The federal filing deadline is typically April 15, but it can shift if it falls on a weekend or federal holiday. Verify the official deadline for this season.
              </div>
            </div>

            <div className="text-xs text-black/55 dark:text-white/55">Last updated: January {TAX_SEASON_YEAR}</div>
          </div>
        </section>

        {/* FAQ (accordion) */}
        <section
          ref={faqRef}
          className="mb-6 rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm dark:border-white/15 dark:bg-white/5"
          id="faq"
        >
          <div>
            <div className="text-base font-black text-black/85 dark:text-white/85">FAQ</div>
            <div className="text-sm text-black/60 dark:text-white/60">
              Quick answers for common terms and “do I need this?” questions.
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {faqItems.map((x, idx) => (
              <AccordionItem key={x.q} title={x.q} defaultOpen={idx === 0}>
                {x.a}
              </AccordionItem>
            ))}
          </div>

          <div className="mt-3 text-xs text-black/55 dark:text-white/55">
            Note: This FAQ is for general information only. Verify details for your situation using official guidance.
          </div>
        </section>

        {/* Disclaimer */}
        <section className="mb-10 rounded-2xl border border-black/10 bg-white/60 p-4 shadow-sm dark:border-white/15 dark:bg-white/5">
          <div className="text-sm font-black text-black/80 dark:text-white/80">Disclaimer</div>
          <div className="mt-2 text-sm text-black/70 dark:text-white/70">
            This tool provides general informational guidance only and does not constitute tax, legal, or financial advice. Tax regulations and
            reporting requirements may change annually. Always verify your specific situation with official IRS guidance or a licensed professional.
          </div>
        </section>

        {/* Reset confirmation */}
        {showResetConfirm ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-6">
            <div className="w-full max-w-md rounded-2xl border border-black/10 bg-white p-4 shadow-lg dark:border-white/15 dark:bg-[#0b0b0b]">
              <div className="text-sm font-black text-black/85 dark:text-white/85">Reset this checklist?</div>
              <div className="mt-2 text-sm text-black/70 dark:text-white/70">
                This clears your local answers and checklist for the {TAX_SEASON_YEAR} season.
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className={smallButtonCls()} onClick={() => setShowResetConfirm(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-black/10 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-sm hover:bg-rose-100/60 dark:border-white/15 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
                  onClick={() => {
                    setShowResetConfirm(false);
                    resetEverything();
                  }}
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </PageShell>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-3 shadow-sm dark:border-white/15 dark:bg-white/5">
      <div className="text-sm font-black text-black/80 dark:text-white/80">{title}</div>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function Q({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-black/70 dark:text-white/70">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-black/20"
      />
      <span>{label}</span>
    </label>
  );
}

function QWithTip({
  checked,
  onChange,
  label,
  tip,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  tip: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 text-sm text-black/70 dark:text-white/70">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-black/20"
      />
      <span>
        {label}
        <InfoTip text={tip} />
      </span>
    </label>
  );
}