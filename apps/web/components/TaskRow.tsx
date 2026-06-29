"use client";

import { motion } from "motion/react";
import { Check, Zap } from "lucide-react";
import { formatDeadline, formatEffort, type RankedTask } from "@clutch/core";
import { RadarDot } from "./Radar";

export function TaskRow({
  task,
  now,
  onComplete,
  onSaveMe,
}: {
  task: RankedTask;
  now: number;
  onComplete: () => void;
  onSaveMe: () => void;
}) {
  const deadlineColor =
    task.radar === "green" ? "var(--color-muted)" : `var(--color-radar-${task.radar})`;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0, transition: { duration: 0.22 } }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="group flex items-center gap-3 rounded-xl border border-hairline bg-surface-card px-3.5 py-3"
    >
      <button
        type="button"
        onClick={onComplete}
        aria-label="Mark done"
        className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors hover:bg-surface-soft"
        style={{ borderColor: `var(--color-radar-${task.radar})` }}
      >
        <Check size={12} className="text-muted opacity-0 transition-opacity group-hover:opacity-60" />
      </button>

      <RadarDot state={task.radar} pulse={task.radar === "red"} />

      <div className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-ink">{task.title}</span>
        <p className="truncate text-[12.5px] text-muted">{task.reason}</p>
      </div>

      <div className="hidden shrink-0 text-right sm:block">
        <div className="text-[12px] font-medium" style={{ color: deadlineColor }}>
          {formatDeadline(task.deadline, now)}
        </div>
        <div className="text-[11px] text-muted-soft">
          {formatEffort(task.remainingMin || task.estEffortMin)} left
        </div>
      </div>

      <button
        type="button"
        onClick={onSaveMe}
        aria-label="Save me — draft this for me"
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-action hover:text-white"
      >
        <Zap size={15} />
      </button>
    </motion.li>
  );
}
