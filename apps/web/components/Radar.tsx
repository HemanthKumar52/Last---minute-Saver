import type { RadarState } from "@clutch/core";
import { cn } from "@/lib/cn";

const META: Record<RadarState, { label: string; color: string; soft: string }> = {
  green: { label: "On track", color: "var(--color-radar-green)", soft: "rgba(93,184,114,0.14)" },
  amber: { label: "At risk", color: "var(--color-radar-amber)", soft: "rgba(232,165,90,0.18)" },
  red: { label: "Critical", color: "var(--color-radar-red)", soft: "rgba(198,69,69,0.14)" },
};

export function RadarDot({ state, pulse = false, size = 10 }: { state: RadarState; pulse?: boolean; size?: number }) {
  const m = META[state];
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      {pulse && state === "red" && (
        <span
          className="absolute inset-0 animate-ping rounded-full"
          style={{ background: m.color, opacity: 0.55 }}
        />
      )}
      <span className="relative inline-block rounded-full" style={{ width: size, height: size, background: m.color }} />
    </span>
  );
}

export function RadarBadge({ state, className }: { state: RadarState; className?: string }) {
  const m = META[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.1em]",
        className,
      )}
      style={{ background: m.soft, color: m.color }}
    >
      <RadarDot state={state} pulse={state === "red"} size={7} />
      {m.label}
    </span>
  );
}

export function radarLabel(state: RadarState): string {
  return META[state].label;
}
