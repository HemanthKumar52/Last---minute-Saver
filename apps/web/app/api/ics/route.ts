import { parseICS } from "@/lib/ics";
import type { TaskInput, BusyInterval } from "@clutch/core";

const DEADLINE_RE = /\b(due|deadline|assignment|submit|exam|quiz|paper|project|homework|hw)\b/i;

export async function POST(req: Request) {
  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url || !/^https?:\/\//i.test(url)) {
    return Response.json({ error: "a valid http(s) .ics URL is required" }, { status: 400 });
  }

  let text: string;
  try {
    const r = await fetch(url, { headers: { accept: "text/calendar, text/plain, */*" } });
    if (!r.ok) throw new Error(String(r.status));
    text = await r.text();
  } catch {
    return Response.json({ error: "could not fetch the calendar feed" }, { status: 502 });
  }

  const now = Date.now();
  const horizon = now + 45 * 86_400_000;
  const events = parseICS(text)
    .filter((e) => e.end > now && e.start < horizon)
    .sort((a, b) => a.start - b.start)
    .slice(0, 60);

  const busy: BusyInterval[] = [];
  const tasks: TaskInput[] = [];

  for (const e of events) {
    if (DEADLINE_RE.test(e.summary) || e.allDay) {
      // Looks like a deadline → import as a task.
      tasks.push({
        title: e.summary,
        category: DEADLINE_RE.test(e.summary) ? "assignment" : "other",
        deadline: e.start,
        hardDeadline: true,
        estEffortMin: 60,
        impact: 2,
        irreversible: false,
        source: "ics",
      });
    } else {
      // A timed commitment → import as busy time for the planner.
      busy.push({ start: e.start, end: e.end, label: e.summary });
    }
  }

  return Response.json({ tasks, busy, count: events.length });
}
