"use client";

import { formatCountdown, type RadarState } from "@clutch/core";
import { useNow } from "@/lib/hooks";
import { cn } from "@/lib/cn";

const COLOR: Record<RadarState, string> = {
  green: "var(--color-radar-green)",
  amber: "var(--color-radar-amber)",
  red: "var(--color-radar-red)",
};

const SIZE = { sm: "text-sm", md: "text-lg", lg: "text-[34px] leading-none" } as const;

export function Countdown({
  deadline,
  state,
  label = "Due in",
  size = "md",
  showLabel = true,
}: {
  deadline: number | null;
  state: RadarState;
  label?: string;
  size?: keyof typeof SIZE;
  showLabel?: boolean;
}) {
  const now = useNow(1000);

  if (deadline == null) {
    return <span className="font-mono text-sm text-muted">no deadline</span>;
  }

  const ms = deadline - now;
  const overdue = ms <= 0;
  const color = overdue ? "var(--color-radar-red)" : COLOR[state];

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      {showLabel && (
        <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-soft">
          {overdue ? "Overdue" : label}
        </span>
      )}
      <span className={cn("font-mono font-medium tabular-nums", SIZE[size])} style={{ color }}>
        {overdue ? "now" : formatCountdown(ms)}
      </span>
    </span>
  );
}
