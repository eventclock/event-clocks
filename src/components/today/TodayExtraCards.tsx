import type { OptionalTodaySnapshot, TodaySnapshot } from "@/lib/today/types";
import MoonPhaseVisual from "./MoonPhaseVisual";
import {
  todayCardClass,
  todayLabelClass,
} from "./todayCardStyles";
import styles from "@/app/today/today.module.css";

type Props = {
  snapshot: TodaySnapshot;
};

function ExtraCard({
  item,
  latitude,
}: {
  item: OptionalTodaySnapshot;
  latitude: number;
}) {
  const value =
    item.status === "available" && item.value ? item.value : "Unavailable today";
  const isMoon = item.label === "Moon Phase";

  return (
    <article className={todayCardClass}>
      <div className={styles.sectionRule} />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <h3 className={todayLabelClass}>
            {item.label}
          </h3>
          <p className="mt-2 text-[14px] font-semibold leading-snug text-black/78 dark:text-white/78">
            {value}
          </p>
        </div>
        {isMoon && <MoonPhaseVisual phase={value} latitude={latitude} />}
      </div>
      {item.note && (
        <p className="relative mt-2 text-[12px] leading-5 text-black/50 dark:text-white/50">
          {item.note}
        </p>
      )}
    </article>
  );
}

export default function TodayExtraCards({ snapshot }: Props) {
  const extras = [
    snapshot.extras.airQuality,
    snapshot.extras.moonPhase,
    snapshot.extras.earthquakes,
    snapshot.extras.funFact,
    snapshot.extras.gas,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (extras.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {extras.map((item) => (
          <ExtraCard
            key={item.label}
            item={item}
            latitude={snapshot.location.latitude}
          />
        ))}
      </div>
    </section>
  );
}
