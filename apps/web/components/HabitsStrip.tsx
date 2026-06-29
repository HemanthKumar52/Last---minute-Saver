"use client";

import { Flame, Check } from "lucide-react";
import { currentStreak, weekProgress, isDoneToday, dayIndex, type Habit } from "@clutch/core";
import { useTaskStore } from "@/lib/data/store";

export function HabitsStrip({ now, variant = "full" }: { now: number; variant?: "full" | "rail" }) {
  const habits = useTaskStore((s) => s.habits);
  const checkIn = useTaskStore((s) => s.checkInHabit);
  if (!habits.length) return null;

  const rail = variant === "rail";
  return (
    <section className={rail ? "" : "mt-8"}>
      <h3 className="mb-3 px-1 text-[12px] font-medium uppercase tracking-[0.14em] text-muted-soft">
        Habits &amp; goals
      </h3>
      <div className={rail ? "grid grid-cols-1 gap-2" : "grid grid-cols-1 gap-2 sm:grid-cols-3"}>
        {habits.map((h) => (
          <HabitCard key={h.id} habit={h} now={now} onCheckIn={() => checkIn(h.id)} />
        ))}
      </div>
    </section>
  );
}

function HabitCard({ habit, now, onCheckIn }: { habit: Habit; now: number; onCheckIn: () => void }) {
  const streak = currentStreak(habit, now);
  const wp = weekProgress(habit, now);
  const doneToday = isDoneToday(habit, now);

  return (
    <div className="rounded-xl border border-hairline bg-surface-card p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[14.5px]">
          <span aria-hidden>{habit.emoji} </span>
          <span className="font-medium text-ink">{habit.title}</span>
        </span>
        <button
          type="button"
          onClick={() => !doneToday && onCheckIn()}
          aria-label={doneToday ? "Done today" : "Check in"}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
          style={
            doneToday
              ? { background: "var(--color-radar-green)", borderColor: "var(--color-radar-green)" }
              : { borderColor: "var(--color-hairline)" }
          }
        >
          <Check size={14} className={doneToday ? "text-white" : "text-muted opacity-50"} />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-[12px] text-muted">
        <span
          className="inline-flex items-center gap-1 font-medium"
          style={{ color: streak > 0 ? "var(--color-action)" : "var(--color-muted)" }}
        >
          <Flame size={13} />
          {streak}d
        </span>
        <span>·</span>
        <span>
          {wp.count}/{wp.target} this week
        </span>
      </div>

      <WeekDots habit={habit} now={now} />
    </div>
  );
}

function WeekDots({ habit, now }: { habit: Habit; now: number }) {
  const set = new Set(habit.completions.map(dayIndex));
  const today = dayIndex(now);
  return (
    <div className="mt-2.5 flex gap-1">
      {Array.from({ length: 7 }).map((_, i) => {
        const filled = set.has(today - (6 - i));
        return (
          <span
            key={i}
            className="h-1.5 flex-1 rounded-full"
            style={{ background: filled ? "var(--color-radar-green)" : "var(--color-hairline)" }}
          />
        );
      })}
    </div>
  );
}
