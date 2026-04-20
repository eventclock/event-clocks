import type { OptionalTodaySnapshot } from "../types";

const SYNODIC_MONTH = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);

function phaseLabel(age: number) {
  if (age < 1.84566) return "New Moon";
  if (age < 5.53699) return "Waxing Crescent";
  if (age < 9.22831) return "First Quarter";
  if (age < 12.91963) return "Waxing Gibbous";
  if (age < 16.61096) return "Full Moon";
  if (age < 20.30228) return "Waning Gibbous";
  if (age < 23.99361) return "Last Quarter";
  if (age < 27.68493) return "Waning Crescent";
  return "New Moon";
}

export async function getMoonPhase(date: Date): Promise<OptionalTodaySnapshot | null> {
  const days = (date.getTime() - KNOWN_NEW_MOON) / 86_400_000;
  const age = ((days % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
  const illumination = Math.round(
    ((1 - Math.cos((2 * Math.PI * age) / SYNODIC_MONTH)) / 2) * 100,
  );

  return {
    status: "available",
    label: "Moon Phase",
    value: phaseLabel(age),
    note: `${illumination}% illuminated`,
  };
}
