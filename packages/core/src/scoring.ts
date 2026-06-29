import type { Task, ScoreBreakdown } from "./types";
import { slackHours, remainingMin } from "./slack";
import { clamp01, round1, HOUR_MS } from "./util";

/** Component weights — the score is the sum, capped at 100. Tuneable per-user later. */
export const WEIGHTS = { urgency: 40, impact: 35, effort: 15, proximity: 10 } as const;

const IMPACT_BASE: Record<1 | 2 | 3, number> = { 1: 8, 2: 18, 3: 28 };

/**
 * The explainable priority score. Deterministic and auditable — every point is
 * traceable to a named factor, so the UI can always answer "why is this #1?".
 */
export function scoreTask(task: Task, now: number): ScoreBreakdown {
  // — Urgency (0..40): slack decays exponentially; soft deadlines count less.
  let urgency: number;
  const slack = slackHours(task, now);
  if (slack == null) {
    urgency = 5;
  } else if (slack <= 0) {
    urgency = WEIGHTS.urgency;
  } else {
    urgency = WEIGHTS.urgency * Math.exp(-slack / 24);
  }
  if (!task.hardDeadline) urgency *= 0.7; // self-imposed deadlines pull less

  // — Impact (0..35): base consequence + irreversibility bump.
  const impact = Math.min(
    WEIGHTS.impact,
    IMPACT_BASE[task.impact] + (task.irreversible ? 7 : 0),
  );

  // — Effort (0..15): quick-win boost; shorter remaining work is easier to start.
  const remain = remainingMin(task);
  const effort = WEIGHTS.effort * (1 - clamp01(remain / 180));

  // — Proximity (0..10): a hard near-term cliff that reinforces "today".
  let proximity = 0;
  if (task.deadline != null) {
    const hoursLeft = (task.deadline - now) / HOUR_MS;
    if (hoursLeft <= 6) proximity = 10;
    else if (hoursLeft <= 24) proximity = 6;
    else if (hoursLeft <= 72) proximity = 3;
  }

  const total = urgency + impact + effort + proximity;
  return {
    urgency: round1(urgency),
    impact: round1(impact),
    effort: round1(effort),
    proximity: round1(proximity),
    total: round1(total),
  };
}
