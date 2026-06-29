/** Goal & habit tracking: lightweight streaks + weekly cadence. */

const DAY = 86_400_000;

export interface Habit {
  id: string;
  title: string;
  /** target completions per week */
  cadencePerWeek: number;
  /** epoch-ms timestamps of each completion */
  completions: number[];
  createdAt: number;
  emoji?: string;
}

/** Calendar-day index (local midnight) for a timestamp. */
export function dayIndex(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return Math.round(d.getTime() / DAY);
}

function completionDays(habit: Habit): Set<number> {
  return new Set(habit.completions.map(dayIndex));
}

export function isDoneToday(habit: Habit, now: number): boolean {
  return completionDays(habit).has(dayIndex(now));
}

/**
 * Consecutive-day streak ending today (or yesterday, as a grace day so the streak
 * doesn't "break" before the day is over).
 */
export function currentStreak(habit: Habit, now: number): number {
  const days = completionDays(habit);
  let idx = dayIndex(now);
  if (!days.has(idx)) {
    idx -= 1;
    if (!days.has(idx)) return 0;
  }
  let streak = 0;
  while (days.has(idx)) {
    streak += 1;
    idx -= 1;
  }
  return streak;
}

/** Completions within the trailing 7 days vs. the weekly target. */
export function weekProgress(habit: Habit, now: number): { count: number; target: number } {
  const today = dayIndex(now);
  const days = completionDays(habit);
  let count = 0;
  for (let i = 0; i < 7; i += 1) if (days.has(today - i)) count += 1;
  return { count, target: habit.cadencePerWeek };
}

export function makeSeedHabits(now: number): Habit[] {
  const day = (n: number) => (n === 0 ? now : now - n * DAY);
  return [
    {
      id: "h-run",
      title: "Evening run",
      cadencePerWeek: 4,
      emoji: "🏃",
      createdAt: now - 30 * DAY,
      completions: [day(1), day(2), day(4), day(6)],
    },
    {
      id: "h-read",
      title: "Read 20 pages",
      cadencePerWeek: 7,
      emoji: "📖",
      createdAt: now - 30 * DAY,
      completions: [day(0), day(1), day(2), day(3), day(4)],
    },
    {
      id: "h-water",
      title: "Drink 2L water",
      cadencePerWeek: 7,
      emoji: "💧",
      createdAt: now - 20 * DAY,
      completions: [day(1), day(2)],
    },
  ];
}
