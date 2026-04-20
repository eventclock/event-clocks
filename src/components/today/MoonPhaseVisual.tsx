type Props = {
  phase: string;
  latitude: number;
};

function litShapePath(phase: string) {
  const normalized = phase.toLowerCase();

  if (normalized.includes("new")) return "";
  if (normalized.includes("full")) return "M28 8a20 20 0 1 0 0 40a20 20 0 0 0 0-40";

  if (normalized.includes("crescent")) {
    return [
      "M37 10",
      "C47 12 52 20 52 28",
      "C52 36 47 44 37 46",
      "C42 37 42 19 37 10",
      "Z",
    ].join(" ");
  }

  if (normalized.includes("first") || normalized.includes("last")) {
    return "M28 8a20 20 0 0 1 0 40Z";
  }

  if (normalized.includes("gibbous")) {
    return [
      "M24 8",
      "A20 20 0 1 1 24 48",
      "C38 42 44 35 44 28",
      "C44 21 38 14 24 8",
      "Z",
    ].join(" ");
  }

  return [
    "M37 10",
    "C47 12 52 20 52 28",
    "C52 36 47 44 37 46",
    "C42 37 42 19 37 10",
    "Z",
  ].join(" ");
}

function shouldFlip(phase: string, latitude: number) {
  const normalized = phase.toLowerCase();
  const southern = latitude < 0;
  const waning = normalized.includes("waning") || normalized.includes("last") || normalized.includes("third");

  return southern ? !waning : waning;
}

export default function MoonPhaseVisual({ phase, latitude }: Props) {
  const path = litShapePath(phase);
  const flip = shouldFlip(phase, latitude);

  return (
    <div
      aria-hidden="true"
      className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-black shadow-inner"
    >
      <svg
        viewBox="0 0 56 56"
        className="h-12 w-12 overflow-visible"
        style={{ transform: flip ? "scaleX(-1)" : undefined }}
      >
        <defs>
          <clipPath id="today-moon-disc">
            <circle cx="28" cy="28" r="20" />
          </clipPath>
          <radialGradient id="today-moon-dark" cx="34%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#1f2937" />
            <stop offset="60%" stopColor="#101827" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
          <radialGradient id="today-moon-light" cx="72%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#f6f1df" />
            <stop offset="48%" stopColor="#bbbdb7" />
            <stop offset="100%" stopColor="#71757a" />
          </radialGradient>
          <filter id="today-moon-soften" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="0.15" />
          </filter>
        </defs>

        <circle cx="28" cy="28" r="20" fill="url(#today-moon-dark)" />
        <g clipPath="url(#today-moon-disc)">
          {path && <path d={path} fill="url(#today-moon-light)" filter="url(#today-moon-soften)" />}
          <circle cx="21" cy="22" r="4.5" fill="#030712" opacity="0.16" />
          <circle cx="33" cy="18" r="3.4" fill="#f8fafc" opacity="0.08" />
          <circle cx="39" cy="34" r="5" fill="#030712" opacity="0.12" />
          <circle cx="26" cy="39" r="3" fill="#f8fafc" opacity="0.06" />
          <rect x="8" y="8" width="40" height="40" fill="rgba(0,0,0,0.12)" />
        </g>
        <circle
          cx="28"
          cy="28"
          r="20"
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      </svg>
    </div>
  );
}
