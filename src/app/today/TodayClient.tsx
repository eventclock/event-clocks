"use client";

import TodayExtraCards from "@/components/today/TodayExtraCards";
import TodayFactsGrid from "@/components/today/TodayFactsGrid";
import TodayLocationControls from "@/components/today/TodayLocationControls";
import TodaySummaryCard from "@/components/today/TodaySummaryCard";
import type { TodaySnapshot } from "@/lib/today/types";
import styles from "./today.module.css";

type Props = {
  snapshot: TodaySnapshot;
};

export default function TodayClient({ snapshot }: Props) {
  return (
    <main className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Event Clocks daily</p>
          <h1 className={styles.title}>Today in Your Area</h1>
          <p className={styles.subtitle}>
            A simple daily snapshot based on your location.
          </p>
        </div>
      </header>

      <div className={styles.stack}>
        <TodayLocationControls snapshot={snapshot} />
        <TodaySummaryCard snapshot={snapshot} />
        <TodayFactsGrid snapshot={snapshot} />
        <TodayExtraCards snapshot={snapshot} />

        <p className={styles.dataNote}>
          Data refreshes daily and may vary by source availability.
        </p>

        {snapshot.providerErrors.length > 0 && (
          <section className={styles.warning}>
            Some sources were unavailable, so this snapshot used clear fallbacks for those fields.
          </section>
        )}
      </div>
    </main>
  );
}
