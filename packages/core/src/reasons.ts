import type { Task, ScoreBreakdown } from "./types";
import { slackHours, hoursUntil, remainingMin } from "./slack";
import { formatShortHours, formatEffort } from "./time";

/**
 * Build a short, human-readable justification for a task's rank from its dominant
 * factors. This is the deterministic fallback; an optional Claude pass can rewrite
 * it into warmer prose, but the *facts* always come from the score breakdown.
 */
export function buildReason(task: Task, now: number, _breakdown?: ScoreBreakdown): string {
  const parts: string[] = [];
  const slack = slackHours(task, now);
  const hoursLeft = hoursUntil(task.deadline, now);
  const remain = remainingMin(task);

  // 1) The time story (most salient first).
  if (hoursLeft != null && hoursLeft <= 0) {
    parts.push("overdue");
  } else if (slack != null && slack <= 0) {
    parts.push("no time buffer left — start now");
  } else if (hoursLeft != null && hoursLeft <= 48) {
    parts.push(`due in ${formatShortHours(hoursLeft)}`);
  }

  // 2) The stakes.
  if (task.hardDeadline) parts.push("hard external deadline");
  if (task.irreversible) parts.push("can't be undone");
  else if (task.impact >= 3) parts.push("high stakes");

  // 3) The "just do it" nudge.
  if (remain > 0 && remain <= 30) parts.push(`only ${remain} min of work`);
  else if (remain > 0 && parts.length < 3) parts.push(`${formatEffort(remain)} of work left`);

  return parts.slice(0, 3).join(" · ") || "no deadline pressure yet";
}
