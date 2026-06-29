import { HOUR_MS, DAY_MS } from "./util";

/** Live ticking countdown. < 2 days → H:MM:SS (mono, tabular); otherwise "N days". */
export function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "0:00:00";
  const totalSec = Math.floor(msLeft / 1000);
  const days = Math.floor(totalSec / 86400);
  if (days >= 2) return `${days} days`;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Short human duration from hours: "45 min" | "6h" | "3 days". */
export function formatShortHours(hours: number): string {
  if (hours <= 0) return "now";
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 24) return `${Math.round(hours)}h`;
  const d = Math.round(hours / 24);
  return `${d} day${d > 1 ? "s" : ""}`;
}

/** Effort in minutes → "25 min" | "2h" | "1.5h". */
export function formatEffort(min: number): string {
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
}

/** Relative deadline phrasing for labels: "overdue" | "due in 2h 56m" | "due tomorrow" | "due in 4 days". */
export function formatDeadline(deadline: number | null, now: number): string {
  if (deadline == null) return "no deadline";
  const ms = deadline - now;
  if (ms <= 0) return "overdue";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `due in ${mins}m`;
  const hours = ms / HOUR_MS;
  if (hours < 24) {
    const h = Math.floor(hours);
    const m = Math.floor((ms - h * HOUR_MS) / 60000);
    return m > 0 ? `due in ${h}h ${m}m` : `due in ${h}h`;
  }
  const days = Math.round(ms / DAY_MS);
  if (days === 1) return "due tomorrow";
  return `due in ${days} days`;
}
