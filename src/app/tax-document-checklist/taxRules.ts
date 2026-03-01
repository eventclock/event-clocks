export const TAX_SEASON_YEAR = 2026 as const;
/**
 * “2026 filing season” typically means filing in 2026 for 2025 income.
 * Keep this hardcoded so you’re forced to review annually.
 */
export const TAX_INCOME_YEAR = 2025 as const;

export type TaxFormId =
  | "W2"
  | "1099-NEC"
  | "1099-MISC"
  | "1099-K"
  | "1099-INT"
  | "1099-DIV"
  | "1099-B"
  | "1099-R"
  | "1099-G"
  | "SSA-1099"
  | "1098"
  | "1098-E"
  | "1098-T"
  | "1095-A"
  | "1095-B"
  | "1095-C"
  | "5498"
  | "K-1";

export type FormAvailability = {
  /** Typical window start (local date in filing season year) */
  startISO: string; // YYYY-MM-DD
  /** Typical window end (local date in filing season year) */
  endISO: string; // YYYY-MM-DD
  /** Extra note for “late/corrections happen” */
  note?: string;
};

export type ExpectedForm = {
  id: TaxFormId;
  name: string;
  issuer: string;
  delivery: "Mail" | "Online" | "Either";
  availability: FormAvailability;
  why: string;
};

export type TaxProfileAnswers = {
  // Income
  employedW2: boolean;
  freelance1099: boolean;
  soldStocks: boolean;
  crypto: boolean;
  bankInterest: boolean;
  dividends: boolean;
  retirementDistribution: boolean;
  unemployment: boolean;
  socialSecurity: boolean;
  paymentApps1099k: boolean;
  partnershipK1: boolean;

  // Home / Education / Health
  mortgage: boolean;
  studentLoanInterest: boolean;
  tuition1098t: boolean;

  marketplaceInsurance1095a: boolean; // Marketplace coverage (1095-A)
  employerInsurance1095c: boolean; // Employer coverage (may receive 1095-C)
  otherCoverage1095b: boolean; // Other non-marketplace coverage (may receive 1095-B)

  // Contributions
  iraContrib: boolean;
};

function iso(y: number, m: number, d: number) {
  const mm = String(m).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
}

export function availabilityWindowFor(formId: TaxFormId): FormAvailability {
  const y = TAX_SEASON_YEAR;

  // These are “typical” availability windows.
  // Some issuers release online first, then mail.
  // Brokerages often issue corrected 1099s later.
  switch (formId) {
    case "W2":
      return { startISO: iso(y, 1, 15), endISO: iso(y, 1, 31), note: "Employers must furnish W-2 by Jan 31." };

    case "1099-INT":
    case "1099-DIV":
    case "1099-R":
    case "1099-G":
    case "1099-K":
    case "1098":
      return { startISO: iso(y, 1, 15), endISO: iso(y, 1, 31), note: "Commonly available by Jan 31." };

    case "SSA-1099":
      return { startISO: iso(y, 1, 1), endISO: iso(y, 1, 31), note: "Often arrives in January." };

    case "1098-E":
      return {
        startISO: iso(y, 1, 15),
        endISO: iso(y, 1, 31),
        note: "Student loan servicers commonly publish by Jan 31.",
      };

    case "1098-T":
      return {
        startISO: iso(y, 1, 15),
        endISO: iso(y, 2, 15),
        note: "Schools often publish by end of January; sometimes later.",
      };

    case "1095-A":
      return {
        startISO: iso(y, 1, 15),
        endISO: iso(y, 2, 15),
        note: "Marketplace 1095-A is important if you had Marketplace coverage.",
      };

    case "1095-B":
    case "1095-C":
      return {
        startISO: iso(y, 1, 15),
        endISO: iso(y, 3, 15),
        note: "Often provided for records. Federally, many people do not need to wait for 1095-B/1095-C to file.",
      };

    case "1099-B":
      return {
        startISO: iso(y, 2, 1),
        endISO: iso(y, 3, 15),
        note: "Brokerage consolidated 1099s often arrive mid-Feb; corrected versions can appear later.",
      };

    case "1099-NEC":
    case "1099-MISC":
      return { startISO: iso(y, 1, 15), endISO: iso(y, 1, 31), note: "Many payers furnish by Jan 31." };

    case "5498":
      return {
        startISO: iso(y, 4, 15),
        endISO: iso(y, 5, 31),
        note: "IRA contribution form 5498 is often issued after the contribution deadline.",
      };

    case "K-1":
      return {
        startISO: iso(y, 3, 1),
        endISO: iso(y, 4, 15),
        note: "K-1s often arrive around partnership deadlines; delays are common.",
      };

    default:
      return { startISO: iso(y, 1, 1), endISO: iso(y, 12, 31) };
  }
}

export function buildExpectedForms(ans: TaxProfileAnswers): ExpectedForm[] {
  const out: ExpectedForm[] = [];

  const push = (id: TaxFormId, name: string, issuer: string, delivery: ExpectedForm["delivery"], why: string) => {
    out.push({
      id,
      name,
      issuer,
      delivery,
      availability: availabilityWindowFor(id),
      why,
    });
  };

  // Income
  if (ans.employedW2) {
    push("W2", "W-2 (Wage and Tax Statement)", "Employer", "Either", "You indicated you were employed as an employee.");
  }

  if (ans.freelance1099) {
    push("1099-NEC", "1099-NEC (Nonemployee Compensation)", "Clients / Payers", "Either", "You indicated freelance/contract income.");
    // Note: We do NOT automatically add 1099-K here; it's driven by paymentApps1099k below.
  }

  if (ans.paymentApps1099k) {
    push("1099-K", "1099-K (Payment Card / Third-Party Network)", "PayPal / Venmo / Stripe / etc.", "Online", "You indicated platform / payment app income.");
  }

  if (ans.bankInterest) {
    push("1099-INT", "1099-INT (Interest Income)", "Banks / Credit unions", "Online", "You indicated bank interest.");
  }

  if (ans.dividends) {
    push("1099-DIV", "1099-DIV (Dividends and Distributions)", "Brokerage / fund companies", "Online", "You indicated dividends.");
  }

  if (ans.soldStocks || ans.crypto) {
    push("1099-B", "1099-B (Proceeds From Broker Transactions)", "Brokerage / exchange", "Online", "You indicated stock sales or crypto activity (often via brokerage/exchange tax docs).");
  }

  if (ans.retirementDistribution) {
    push("1099-R", "1099-R (Distributions From Pensions/IRAs)", "Retirement account provider", "Either", "You indicated retirement distributions.");
  }

  if (ans.unemployment) {
    push("1099-G", "1099-G (Certain Government Payments)", "State agency", "Either", "You indicated unemployment or other government payments.");
  }

  if (ans.socialSecurity) {
    push("SSA-1099", "SSA-1099 (Social Security Benefit Statement)", "Social Security Administration", "Either", "You indicated Social Security benefits.");
  }

  if (ans.partnershipK1) {
    push("K-1", "Schedule K-1 (Partnership/S-Corp/Trust)", "Entity issuing K-1", "Either", "You indicated K-1 income.");
  }

  // Home / education / health
  if (ans.mortgage) {
    push("1098", "1098 (Mortgage Interest Statement)", "Mortgage lender", "Either", "You indicated a mortgage.");
  }

  if (ans.studentLoanInterest) {
    push("1098-E", "1098-E (Student Loan Interest Statement)", "Loan servicer", "Online", "You indicated student loan interest.");
  }

  if (ans.tuition1098t) {
    push("1098-T", "1098-T (Tuition Statement)", "School / institution", "Online", "You indicated tuition / education expenses.");
  }

  if (ans.marketplaceInsurance1095a) {
    push("1095-A", "1095-A (Health Insurance Marketplace Statement)", "Marketplace", "Either", "You indicated Marketplace health insurance coverage.");
  }

  if (ans.employerInsurance1095c) {
    push("1095-C", "1095-C (Employer Health Insurance Offer and Coverage)", "Employer (applicable large employer)", "Either", "You indicated employer coverage (some people receive 1095-C for records).");
  }

  if (ans.otherCoverage1095b) {
    push("1095-B", "1095-B (Health Coverage)", "Insurer / coverage provider", "Either", "You indicated non-Marketplace coverage where a 1095-B may be provided for records.");
  }

  // Contributions
  if (ans.iraContrib) {
    push("5498", "5498 (IRA Contribution Information)", "IRA custodian", "Online", "You indicated IRA contributions (often issued later in spring).");
  }

  // De-dupe and stable sort by “typical end date”
  const seen = new Set<TaxFormId>();
  const unique = out.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true)));

  unique.sort((a, b) => a.availability.endISO.localeCompare(b.availability.endISO));
  return unique;
}