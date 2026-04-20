"use client";

import { useState } from "react";
import type { ForexSnapshot } from "@/lib/today/types";
import {
  todayCardClass,
  todayLabelClass,
} from "./todayCardStyles";
import styles from "@/app/today/today.module.css";

type Props = {
  forex: ForexSnapshot;
};

type DisplayComparison = {
  anchor: ForexSnapshot["comparisons"][number]["anchor"];
  localCurrency: string;
  localToAnchorRate: number;
};

function formatRate(value: number) {
  if (!Number.isFinite(value) || value <= 0) return null;

  return new Intl.NumberFormat("en", {
    maximumFractionDigits: value >= 100 ? 2 : 4,
    minimumFractionDigits: value >= 10 ? 2 : 0,
  }).format(value);
}

function getLocalToAnchorRate(comparison: ForexSnapshot["comparisons"][number]) {
  if (
    Number.isFinite(comparison.localToAnchorRate) &&
    comparison.localToAnchorRate > 0
  ) {
    return comparison.localToAnchorRate;
  }

  const legacyRate = (comparison as unknown as { rate?: unknown }).rate;
  if (typeof legacyRate === "number" && Number.isFinite(legacyRate) && legacyRate > 0) {
    return 1 / legacyRate;
  }

  return null;
}

function getDisplayComparisons(forex: ForexSnapshot): DisplayComparison[] {
  return forex.comparisons
    .map((comparison) => {
      const localToAnchorRate = getLocalToAnchorRate(comparison);
      if (!localToAnchorRate) return null;

      return {
        anchor: comparison.anchor,
        localCurrency: comparison.localCurrency,
        localToAnchorRate,
      };
    })
    .filter((comparison): comparison is DisplayComparison => comparison !== null);
}

export default function ForexCard({ forex }: Props) {
  const [isInverse, setIsInverse] = useState(false);
  const comparisons = getDisplayComparisons(forex);
  const hasComparisons = forex.status === "available" && comparisons.length > 0;

  if (!hasComparisons) {
    return (
      <article className={todayCardClass}>
        <div className={styles.sectionRule} />
        <h3 className={`${todayLabelClass} relative`}>Forex</h3>
        <p className="relative mt-2 text-[14px] font-semibold leading-snug text-black/82 dark:text-white/82">
          Rates unavailable today
        </p>
      </article>
    );
  }

  const directionLabel = isInverse
    ? `Other currencies to ${forex.localCurrency}`
    : `${forex.localCurrency} to other currencies`;

  return (
    <article className={todayCardClass}>
      <div className={styles.sectionRule} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <h3 className={todayLabelClass}>Forex</h3>
          <p className="mt-2 text-[14px] font-semibold leading-snug text-black/82 dark:text-white/82">
            {forex.localCurrency} comparisons
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsInverse((value) => !value)}
          aria-label="Flip forex conversion direction"
          title="Flip conversion direction"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-black/10 bg-white/85 text-black/58 shadow-sm transition hover:border-black/20 hover:text-black dark:border-white/10 dark:bg-white/10 dark:text-white/65 dark:hover:border-white/25 dark:hover:text-white"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
          >
            <path d="M7 7h11l-3-3" />
            <path d="M18 7l-3 3" />
            <path d="M17 17H6l3 3" />
            <path d="M6 17l3-3" />
          </svg>
        </button>
      </div>

      <p className="relative m-0 mt-1.5 text-[10px] font-bold uppercase tracking-normal text-black/42 dark:text-white/42">
        {directionLabel}
      </p>

      <ul className="relative mt-2 space-y-1 text-[12px] font-semibold text-black/62 dark:text-white/62">
        {comparisons.map((comparison) => {
          const inverseRate = 1 / comparison.localToAnchorRate;
          const shownRate = isInverse
            ? formatRate(inverseRate)
            : formatRate(comparison.localToAnchorRate);

          if (!shownRate) return null;

          return (
            <li
              key={comparison.anchor}
              className="flex items-center justify-between gap-3 rounded-md bg-black/[0.025] px-2 py-1 dark:bg-white/[0.045]"
            >
              <span className="text-black/50 dark:text-white/50">
                {isInverse ? `1 ${comparison.anchor}` : `1 ${comparison.localCurrency}`}
              </span>
              <span className="text-right text-black/78 dark:text-white/78">
                {isInverse
                  ? `${shownRate} ${comparison.localCurrency}`
                  : `${shownRate} ${comparison.anchor}`}
              </span>
            </li>
          );
        })}
      </ul>

      {forex.asOf && (
        <p className="relative mt-1.5 text-[12px] leading-5 text-black/48 dark:text-white/48">
          Rate date: {forex.asOf}
        </p>
      )}
    </article>
  );
}
