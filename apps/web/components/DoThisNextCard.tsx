"use client";

import { motion } from "motion/react";
import { Check, AlarmClock, Volume2 } from "lucide-react";
import {
  urgency01,
  formatDeadline,
  type RankedTask,
  type ScoreBreakdown,
} from "@clutch/core";
import { RadarBadge } from "./Radar";
import { Countdown } from "./Countdown";
import { SaveMeButton } from "./SaveMeButton";
import { CATEGORY_ICON } from "./categoryIcon";
import { speak, ttsSupported } from "@/lib/voice";

export function DoThisNextCard({
  task,
  now,
  onSaveMe,
  onDone,
  onSnooze,
}: {
  task: RankedTask;
  now: number;
  onSaveMe: () => void;
  onDone: () => void;
  onSnooze: () => void;
}) {
  const urgency = urgency01(task, now);
  const Icon = CATEGORY_ICON[task.category];
  const color = `var(--color-radar-${task.radar})`;

  const readAloud = () =>
    speak(`Do this first: ${task.title}. ${formatDeadline(task.deadline ?? null, now)}. ${task.reason}`);

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-[22px] border border-hairline bg-canvas p-6 sm:p-7"
      style={{ boxShadow: "0 1px 2px rgba(20,20,19,0.04), 0 24px 56px -34px rgba(20,20,19,0.28)" }}
    >
      <span className="absolute inset-x-0 top-0 h-[3px]" style={{ background: color }} />

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-surface-cream-strong px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
            Do this next
          </span>
          <RadarBadge state={task.radar} />
        </div>
        <Countdown deadline={task.deadline} state={task.radar} size="lg" />
      </div>

      <div className="mt-4 flex items-start gap-3">
        <span
          className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "rgba(204,120,92,0.12)", color: "var(--color-action)" }}
        >
          <Icon size={18} />
        </span>
        <h2 className="text-[27px] leading-[1.12] text-ink sm:text-[30px]">{task.title}</h2>
      </div>

      <p className="mt-3 text-[15px] text-body">
        <span className="font-medium text-ink">Why now: </span>
        {task.reason}
      </p>

      <Breakdown breakdown={task.breakdown} />

      <div className="mt-6 flex flex-wrap items-center gap-2.5">
        <SaveMeButton urgency={urgency} onClick={onSaveMe} />
        <button
          type="button"
          onClick={onDone}
          className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-canvas px-4 py-3 text-sm font-medium text-ink transition-colors hover:bg-surface-soft"
        >
          <Check size={16} />
          Done
        </button>
        <button
          type="button"
          onClick={onSnooze}
          className="inline-flex items-center gap-1.5 rounded-xl border border-hairline bg-canvas px-4 py-3 text-sm font-medium text-muted transition-colors hover:bg-surface-soft"
        >
          <AlarmClock size={16} />
          Snooze 30m
        </button>
        {ttsSupported() && (
          <button
            type="button"
            onClick={readAloud}
            aria-label="Read this aloud"
            className="ml-auto inline-flex h-11 w-11 items-center justify-center rounded-xl border border-hairline bg-canvas text-muted transition-colors hover:bg-surface-soft"
          >
            <Volume2 size={17} />
          </button>
        )}
      </div>
    </motion.section>
  );
}

function Breakdown({ breakdown }: { breakdown: ScoreBreakdown }) {
  const items = [
    { k: "Time pressure", v: breakdown.urgency, max: 40 },
    { k: "Stakes", v: breakdown.impact, max: 35 },
    { k: "Quick win", v: breakdown.effort, max: 15 },
  ];
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {items.map((it) => (
        <span
          key={it.k}
          className="inline-flex items-center gap-2 rounded-lg border border-hairline-soft bg-surface-soft px-2.5 py-1.5"
        >
          <span className="text-[11px] font-medium text-muted">{it.k}</span>
          <span className="relative h-1.5 w-10 overflow-hidden rounded-full bg-hairline">
            <span
              className="absolute inset-y-0 left-0 rounded-full"
              style={{
                width: `${Math.min(100, (it.v / it.max) * 100)}%`,
                background: "var(--color-action)",
              }}
            />
          </span>
        </span>
      ))}
      <span
        className="ml-auto inline-flex items-center rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-muted"
        style={{ background: "rgba(20,20,19,0.04)" }}
      >
        priority {Math.round(breakdown.total)}
      </span>
    </div>
  );
}
