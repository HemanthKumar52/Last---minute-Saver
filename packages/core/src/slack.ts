import type { Task, RadarState } from "./types";
import { clamp01, HOUR_MS } from "./util";

/** Minutes of work still remaining after accounting for progress. */
export function remainingMin(task: Task): number {
  return Math.max(0, Math.round(task.estEffortMin * (1 - clamp01(task.progress))));
}

/** Hours until the deadline; null if there is no deadline. */
export function hoursUntil(deadline: number | null, now: number): number | null {
  if (deadline == null) return null;
  return (deadline - now) / HOUR_MS;
}

/**
 * Slack = hours until deadline − hours of remaining work.
 * The core "can I still make it?" metric. null when there's no deadline.
 * Negative slack means it's already structurally too late unless you start right now.
 */
export function slackHours(task: Task, now: number): number | null {
  if (task.deadline == null) return null;
  const hoursLeft = (task.deadline - now) / HOUR_MS;
  const effortHrs = remainingMin(task) / 60;
  return hoursLeft - effortHrs;
}

/** GREEN (on track) / AMBER (getting tight) / RED (act now or miss it). */
export function radarState(task: Task, now: number): RadarState {
  if (task.status === "done") return "green";
  const slack = slackHours(task, now);
  if (slack == null) {
    // No hard deadline: a gentle stakes-based signal only.
    return task.impact >= 3 ? "amber" : "green";
  }
  const hoursLeft = (task.deadline! - now) / HOUR_MS;
  const effortHrs = remainingMin(task) / 60;
  if (slack <= 0.5 || hoursLeft <= 3) return "red";
  if (slack <= Math.max(effortHrs, 1) || hoursLeft <= 24) return "amber";
  return "green";
}

/**
 * Urgency in [0,1] for color interpolation (drives the Save Me coral→red blend).
 * 1 = no slack / overdue; decays toward 0 as buffer grows (τ = 24h).
 */
export function urgency01(task: Task, now: number): number {
  const slack = slackHours(task, now);
  if (slack == null) return task.impact >= 3 ? 0.25 : 0.05;
  if (slack <= 0) return 1;
  return Math.exp(-slack / 24);
}

/** Peak urgency across a set of tasks — what the Save Me button color tracks. */
export function peakUrgency(tasks: Task[], now: number): number {
  return tasks.reduce((max, t) => {
    if (t.status === "done") return max;
    return Math.max(max, urgency01(t, now));
  }, 0);
}
