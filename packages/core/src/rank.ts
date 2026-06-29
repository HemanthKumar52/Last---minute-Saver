import type { Task, RankedTask } from "./types";
import { scoreTask } from "./scoring";
import { radarState, slackHours, remainingMin } from "./slack";
import { buildReason } from "./reasons";

/** Is this task currently visible (not done, not actively snoozed)? */
export function isActive(task: Task, now: number): boolean {
  if (task.status === "done") return false;
  if (task.status === "snoozed" && (task.snoozedUntil ?? 0) > now) return false;
  return true;
}

/**
 * Rank the active tasks by the explainable score (desc), tie-breaking on the
 * nearer deadline. Returns enriched tasks ready for the UI — no extra computation
 * needed in the render path.
 */
export function rankTasks(tasks: Task[], now: number): RankedTask[] {
  const scored: RankedTask[] = tasks
    .filter((t) => isActive(t, now))
    .map((t) => {
      const breakdown = scoreTask(t, now);
      return {
        ...t,
        score: breakdown.total,
        breakdown,
        radar: radarState(t, now),
        reason: buildReason(t, now, breakdown),
        slack: slackHours(t, now),
        remainingMin: remainingMin(t),
        rank: 0,
      };
    });

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (a.deadline ?? Number.POSITIVE_INFINITY) - (b.deadline ?? Number.POSITIVE_INFINITY),
  );
  scored.forEach((t, i) => (t.rank = i + 1));
  return scored;
}

/** The single task to surface as "do this next", or null if nothing is active. */
export function doThisNext(tasks: Task[], now: number): RankedTask | null {
  return rankTasks(tasks, now)[0] ?? null;
}
