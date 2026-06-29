import type { Task, TaskCategory } from "./types";
import { remainingMin } from "./slack";
import { rankTasks } from "./rank";

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

export type Peak = "morning" | "afternoon" | "evening" | "night";

export interface BusyInterval {
  start: number;
  end: number;
  label?: string;
}

export interface PlannerPrefs {
  /** working window (local hours) the planner is allowed to schedule within */
  dayStartHour: number;
  dayEndHour: number;
  /** when the user does their best focused work — hard tasks gravitate here when there's slack */
  peak: Peak;
  /** longest single focus block before a break */
  maxFocusMin: number;
  /** gap inserted after each block */
  breakMin: number;
  /** how many days ahead to plan */
  horizonDays: number;
}

export const DEFAULT_PREFS: PlannerPrefs = {
  dayStartHour: 8,
  dayEndHour: 22,
  peak: "evening",
  maxFocusMin: 90,
  breakMin: 15,
  horizonDays: 5,
};

const PEAK_WINDOW: Record<Peak, [number, number]> = {
  morning: [6, 11],
  afternoon: [12, 16],
  evening: [17, 21],
  night: [20, 24],
};

export interface ScheduledBlock {
  taskId: string;
  title: string;
  category: TaskCategory;
  start: number;
  end: number;
  /** which chunk of a split task this is (1-based) */
  part: number;
  /** total chunks this task was split into */
  parts: number;
}

export interface PlanDay {
  date: number;
  label: string;
  blocks: ScheduledBlock[];
}

export interface UnscheduledItem {
  taskId: string;
  title: string;
  reason: string;
}

export interface PlanResult {
  days: PlanDay[];
  unscheduled: UnscheduledItem[];
  totalMin: number;
}

interface Slot {
  start: number;
  end: number;
}

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function inPeak(ms: number, peak: Peak): boolean {
  const h = new Date(ms).getHours();
  const [a, b] = PEAK_WINDOW[peak];
  return h >= a && h < b;
}

function dayLabel(date: number, now: number): string {
  const diff = Math.round((startOfDay(date) - startOfDay(now)) / DAY);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return new Date(date).toLocaleDateString(undefined, { weekday: "long" });
}

/** The free gaps inside the working window across the horizon, minus busy time. */
export function computeFreeSlots(now: number, prefs: PlannerPrefs, busy: BusyInterval[]): Slot[] {
  const slots: Slot[] = [];
  const today = startOfDay(now);
  for (let d = 0; d < prefs.horizonDays; d += 1) {
    const ds = today + d * DAY;
    let winStart = ds + prefs.dayStartHour * HOUR;
    const winEnd = ds + prefs.dayEndHour * HOUR;
    if (d === 0) winStart = Math.max(winStart, now);
    if (winStart >= winEnd) continue;

    let cursor = winStart;
    const dayBusy = busy
      .filter((b) => b.end > winStart && b.start < winEnd)
      .sort((a, b) => a.start - b.start);
    for (const b of dayBusy) {
      const bs = Math.max(b.start, winStart);
      if (bs > cursor) slots.push({ start: cursor, end: bs });
      cursor = Math.max(cursor, Math.min(b.end, winEnd));
    }
    if (cursor < winEnd) slots.push({ start: cursor, end: winEnd });
  }
  return slots.filter((s) => s.end - s.start >= 15 * MIN);
}

/**
 * Autonomous planner. Walks tasks in priority order and packs each task's remaining
 * effort into free slots BEFORE its deadline, splitting across slots/days and capping
 * each block at maxFocusMin. Tasks with slack gravitate toward the user's peak hours;
 * tight ones take the earliest fit. Anything that can't fit is surfaced as at-risk.
 */
export function planTasks(
  tasks: Task[],
  busy: BusyInterval[],
  now: number,
  prefs: PlannerPrefs,
): PlanResult {
  const ranked = rankTasks(tasks, now);
  const slots = computeFreeSlots(now, prefs, busy).map((s) => ({ ...s }));
  const horizonEnd = startOfDay(now) + prefs.horizonDays * DAY;
  const maxChunk = prefs.maxFocusMin * MIN;

  const blocks: ScheduledBlock[] = [];
  const unscheduled: UnscheduledItem[] = [];

  for (const task of ranked) {
    let remaining = remainingMin(task) * MIN;
    if (remaining <= 0) continue;

    const latest = Math.min(task.deadline ?? horizonEnd, horizonEnd);
    const slackMs = (task.deadline ?? horizonEnd) - now - remaining;
    const tight = slackMs < 1.5 * remaining || (task.deadline != null && task.deadline - now < DAY);

    const candidates = slots.filter((s) => s.start < latest && s.end - s.start >= 15 * MIN);
    candidates.sort((x, y) => {
      if (!tight) {
        const px = inPeak(x.start, prefs.peak) ? 0 : 1;
        const py = inPeak(y.start, prefs.peak) ? 0 : 1;
        if (px !== py) return px - py;
      }
      return x.start - y.start;
    });

    const taskBlocks: ScheduledBlock[] = [];
    for (const s of candidates) {
      if (remaining <= 0) break;
      let cursor = s.start;
      const limit = Math.min(s.end, latest);
      while (remaining > 0 && limit - cursor >= 15 * MIN) {
        const avail = limit - cursor;
        const chunk = Math.min(remaining, avail, maxChunk);
        taskBlocks.push({
          taskId: task.id,
          title: task.title,
          category: task.category,
          start: cursor,
          end: cursor + chunk,
          part: 0,
          parts: 0,
        });
        remaining -= chunk;
        cursor += chunk + prefs.breakMin * MIN;
      }
      s.start = Math.min(cursor, s.end); // consume the used portion
    }

    if (remaining > 0) {
      unscheduled.push({
        taskId: task.id,
        title: task.title,
        reason: task.deadline ? "won't fit before its deadline" : "no free time in the window",
      });
    }
    taskBlocks.forEach((b, i) => {
      b.part = i + 1;
      b.parts = taskBlocks.length;
    });
    blocks.push(...taskBlocks);
  }

  blocks.sort((a, b) => a.start - b.start);
  const byDay = new Map<number, ScheduledBlock[]>();
  for (const b of blocks) {
    const d = startOfDay(b.start);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(b);
  }
  const days: PlanDay[] = [...byDay.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([date, bl]) => ({ date, label: dayLabel(date, now), blocks: bl }));
  const totalMin = Math.round(blocks.reduce((s, b) => s + (b.end - b.start), 0) / MIN);

  return { days, unscheduled, totalMin };
}
