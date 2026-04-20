import ForexCard from "./ForexCard";
import LiveCountdownTiles from "./LiveCountdownTiles";
import type { TodaySnapshot } from "@/lib/today/types";
import {
  todayCardClass,
  todayLabelClass,
} from "./todayCardStyles";
import styles from "@/app/today/today.module.css";

type Props = {
  snapshot: TodaySnapshot;
};

function FactCard({
  title,
  value,
  detail,
  children,
}: {
  title: string;
  value: string;
  detail?: string;
  children?: React.ReactNode;
}) {
  return (
    <article className={todayCardClass}>
      <div className={styles.sectionRule} />
      <div className="relative">
        <p className={todayLabelClass}>{title}</p>
        <p className="mt-2 text-[14px] font-semibold leading-snug text-black/82 dark:text-white/82">
          {value}
        </p>
        {children}
        {detail && (
          <p className="mt-2 text-[12px] leading-5 text-black/52 dark:text-white/52">
            {detail}
          </p>
        )}
      </div>
    </article>
  );
}

function formatTemperature(value: number | null) {
  return value === null ? null : `${Math.round(value)}°C`;
}

function formatWeekday(date: string) {
  const parsed = new Date(`${date}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("en", { weekday: "long" }).format(parsed);
}

export default function TodayFactsGrid({ snapshot }: Props) {
  const weatherValue =
    snapshot.weather.status === "available"
      ? [formatTemperature(snapshot.weather.temperatureC), snapshot.weather.condition]
          .filter(Boolean)
          .join(" and ") || "Available"
      : "Unavailable today";

  const holidayValue =
    snapshot.holiday.status === "available"
      ? snapshot.holiday.name ?? "Today is not a public holiday"
      : "We could not load holiday data";

  const sunValue =
    snapshot.sun.status === "available" && snapshot.sun.sunrise && snapshot.sun.sunset
      ? `${snapshot.sun.sunrise} / ${snapshot.sun.sunset}`
      : "Unavailable today";

  return (
    <section className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <FactCard
        title="Weather"
        value={weatherValue}
        detail={`Representative location: ${snapshot.weather.place}`}
      />
      <FactCard
        title="Holiday"
        value={holidayValue}
        detail={
          snapshot.holiday.nextHoliday
            ? `Next: ${snapshot.holiday.nextHoliday.name} on ${snapshot.holiday.nextHoliday.date}`
            : "Country-level public holiday lookup"
        }
      >
        {snapshot.holiday.nextHoliday && (
          <div className="mt-3 rounded-md border border-black/[0.06] bg-black/[0.025] p-2.5 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="m-0 text-[11px] font-bold text-black/72 dark:text-white/72">
              {snapshot.holiday.nextHoliday.name}
            </p>
            <p className="m-0 mt-0.5 text-[11px] text-black/48 dark:text-white/48">
              {snapshot.holiday.nextHoliday.date}
            </p>
            <LiveCountdownTiles
              targetIso={snapshot.holiday.nextHoliday.startsAtIso}
              label="Until holiday"
            />
          </div>
        )}
      </FactCard>
      <ForexCard forex={snapshot.forex} />
      <FactCard
        title="Sunrise / Sunset"
        value={sunValue}
        detail={`Times shown for ${snapshot.location.city}`}
      />
      <FactCard
        title="Daily Mantra"
        value={snapshot.mantra}
      />
      <FactCard
        title="Weekend Countdown"
        value={snapshot.weekend.label}
        detail={`Today is ${formatWeekday(snapshot.date)}`}
      >
        <LiveCountdownTiles
          targetIso={snapshot.weekend.saturdayStartsAtIso}
          label="Until Saturday"
        />
      </FactCard>
    </section>
  );
}
