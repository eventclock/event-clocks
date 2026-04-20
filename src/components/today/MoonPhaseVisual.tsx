type Props = {
  phase: string;
};

function moonShadow(phase: string) {
  const normalized = phase.toLowerCase();

  if (normalized.includes("new")) return "inset 0 0 0 999px rgba(15, 23, 42, 0.88)";
  if (normalized.includes("full")) return "inset 0 0 0 999px rgba(255, 255, 255, 0)";
  if (normalized.includes("first")) return "inset -20px 0 0 rgba(15, 23, 42, 0.78)";
  if (normalized.includes("last")) return "inset 20px 0 0 rgba(15, 23, 42, 0.78)";
  if (normalized.includes("waxing crescent")) return "inset -31px 0 0 rgba(15, 23, 42, 0.86)";
  if (normalized.includes("waning crescent")) return "inset 31px 0 0 rgba(15, 23, 42, 0.86)";
  if (normalized.includes("waxing gibbous")) return "inset -8px 0 0 rgba(15, 23, 42, 0.54)";
  if (normalized.includes("waning gibbous")) return "inset 8px 0 0 rgba(15, 23, 42, 0.54)";

  return "inset -14px 0 0 rgba(15, 23, 42, 0.66)";
}

export default function MoonPhaseVisual({ phase }: Props) {
  return (
    <div
      aria-hidden="true"
      className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-slate-950/90 shadow-inner"
    >
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_25%,rgba(255,255,255,0.28),transparent_30%),radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.12),transparent_28%)]" />
      <div
        className="h-9 w-9 rounded-full bg-[radial-gradient(circle_at_32%_28%,#fff7d6,#d7dce7_58%,#a3adbe)] shadow-[0_0_16px_rgba(226,232,240,0.48)]"
        style={{ boxShadow: `${moonShadow(phase)}, 0 0 22px rgba(226,232,240,0.55)` }}
      />
    </div>
  );
}
