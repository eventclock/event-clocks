import type { TodaySnapshot } from "@/lib/today/types";
import styles from "@/app/today/today.module.css";
import { todayLabelClass } from "./todayCardStyles";

type Props = {
  snapshot: TodaySnapshot;
};

function formatDateWithWeekday(date: string) {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "short" }).format(parsed);
  return `${weekday}, ${date}`;
}

export default function TodaySummaryCard({ snapshot }: Props) {
  return (
    <section className="relative overflow-hidden border-0 bg-transparent p-4 shadow-none">
      <div className={styles.sectionRule} />
      <div className="relative flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className={todayLabelClass}>
            Daily snapshot
          </p>
          <h2 className="mt-2 text-[15px] font-semibold leading-snug text-black/84 dark:text-white/84">
            {snapshot.location.city}
          </h2>
        </div>
        <div className="rounded-md border border-[#868f87]/90 bg-white/55 px-2.5 py-1.5 text-[12px] font-semibold text-black/62 shadow-sm dark:border-white/18 dark:bg-white/[0.06] dark:text-white/62">
          {formatDateWithWeekday(snapshot.date)}
        </div>
      </div>

      <p className="relative mt-3 max-w-4xl text-[13px] leading-6 text-black/62 dark:text-white/62">
        {snapshot.summary}
      </p>
    </section>
  );
}
