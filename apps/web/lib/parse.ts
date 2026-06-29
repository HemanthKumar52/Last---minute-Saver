import type { TaskInput, TaskCategory, ImpactLevel } from "@clutch/core";

const MIN = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

/**
 * A light, dependency-free heuristic parser so quick-capture feels intelligent
 * before any AI is wired: it guesses a deadline, category, effort and stakes from
 * a single typed line. (Claude-grade extraction replaces this when a key is set.)
 */
export function parseCapture(raw: string, now: number): TaskInput {
  const text = raw.trim();
  const lower = text.toLowerCase();

  const deadline = guessDeadline(lower, now);
  const category = guessCategory(lower);
  const impact = guessImpact(lower);
  const irreversible = /\b(scholarship|flight|visa|court|deadline|final|rent|exam)\b/.test(lower);

  // Strip obvious time phrases from the title for tidiness.
  const title =
    text
      .replace(/\b(by|due|before|at)\s+\d{1,2}\s*(am|pm)\b/gi, "")
      .replace(/\b(tonight|today|tomorrow|tmrw|this evening|in \d+\s*(hours?|hrs?|minutes?|mins?))\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim() || text;

  return {
    title,
    category,
    deadline,
    hardDeadline: deadline != null,
    estEffortMin: defaultEffort(category),
    impact,
    irreversible,
    source: "quick-add",
  };
}

function guessDeadline(lower: string, now: number): number | null {
  let m: RegExpMatchArray | null;

  if ((m = lower.match(/in\s+(\d+)\s*(hours?|hrs?)/))) return now + Number(m[1]) * HOUR;
  if ((m = lower.match(/in\s+(\d+)\s*(minutes?|mins?)/))) return now + Number(m[1]) * MIN;
  if ((m = lower.match(/in\s+(\d+)\s*days?/))) return now + Number(m[1]) * DAY;

  const atTime = lower.match(/(?:by|at|before)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);

  if (/\btonight\b|\bthis evening\b/.test(lower)) return atToday(now, atTime ? hourFrom(atTime) : 21);
  if (/\btoday\b/.test(lower)) return atToday(now, atTime ? hourFrom(atTime) : 18);
  if (/\btomorrow\b|\btmrw\b/.test(lower)) return atToday(now, atTime ? hourFrom(atTime) : 17) + DAY;

  if (atTime) return atToday(now, hourFrom(atTime), minFrom(atTime));

  return null;
}

function hourFrom(m: RegExpMatchArray): number {
  let h = Number(m[1]);
  const mer = m[3];
  if (mer === "pm" && h < 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  return h;
}
function minFrom(m: RegExpMatchArray): number {
  return m[2] ? Number(m[2]) : 0;
}

function atToday(now: number, hour: number, minute = 0): number {
  const d = new Date(now);
  d.setHours(hour, minute, 0, 0);
  let ts = d.getTime();
  if (ts <= now) ts += DAY; // already past today → assume next day
  return ts;
}

function guessCategory(lower: string): TaskCategory {
  if (/\b(pay|bill|invoice|rent|subscription|renew)\b/.test(lower)) return "bill";
  if (/\b(email|reply|respond|send|message|follow up|follow-up)\b/.test(lower)) return "email";
  if (/\b(interview|screening)\b/.test(lower)) return "interview";
  if (/\b(meeting|call|standup|sync|1:1)\b/.test(lower)) return "meeting";
  if (/\b(assignment|essay|homework|read|submit|paper|problem set|lab|project|study)\b/.test(lower))
    return "assignment";
  return "other";
}

function guessImpact(lower: string): ImpactLevel {
  if (/\b(scholarship|exam|final|interview|rent|flight|visa|court|deadline)\b/.test(lower)) return 3;
  if (/\b(bill|assignment|meeting|report|submit)\b/.test(lower)) return 2;
  return 2;
}

function defaultEffort(category: TaskCategory): number {
  switch (category) {
    case "email":
      return 10;
    case "bill":
      return 5;
    case "interview":
      return 60;
    case "meeting":
      return 15;
    case "assignment":
      return 45;
    default:
      return 25;
  }
}
