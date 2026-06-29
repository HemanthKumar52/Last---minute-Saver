import { aiChat, aiConfigured } from "@/lib/ai/provider";
import { parseCapture } from "@/lib/parse";
import type { TaskInput, TaskCategory, ImpactLevel } from "@clutch/core";

const CATEGORIES = ["assignment", "email", "bill", "interview", "meeting", "errand", "other"];

function system(nowIso: string): string {
  return `You are a task-extraction engine for a deadline-survival app. From the user's raw text (a brain-dump, a pasted email, or a list), extract the distinct ACTIONABLE tasks.
Return ONLY JSON of the form:
{"tasks":[{"title":"...","category":"assignment|email|bill|interview|meeting|errand|other","deadlineISO":"2026-06-30T17:00:00.000Z" or null,"estEffortMin":30,"impact":1|2|3,"hardDeadline":true,"irreversible":false}]}
Rules:
- The current time is ${nowIso}. Resolve relative dates ("tonight","tomorrow 5pm","in 2 hours","Friday") against it.
- impact: 3 = high stakes/irreversible (scholarship, exam, rent, flight, interview), 2 = normal, 1 = low.
- irreversible: true if missing it cannot be undone.
- hardDeadline: true for external deadlines, false for soft self-imposed ones.
- estEffortMin: realistic minutes of work.
- Keep titles short and action-oriented. Output JSON only, no prose.`;
}

function clampImpact(n: unknown): ImpactLevel {
  const v = Math.round(Number(n) || 2);
  return (v <= 1 ? 1 : v >= 3 ? 3 : 2) as ImpactLevel;
}

function normalize(raw: unknown): TaskInput[] {
  const arr = Array.isArray((raw as { tasks?: unknown[] })?.tasks)
    ? (raw as { tasks: unknown[] }).tasks
    : [];
  const out: TaskInput[] = [];
  for (const item of arr) {
    const t = item as Record<string, unknown>;
    if (!t || typeof t.title !== "string" || !t.title.trim()) continue;
    const cat = String(t.category ?? "other").toLowerCase();
    const deadlineISO = t.deadlineISO;
    let deadline: number | null = null;
    if (typeof deadlineISO === "string") {
      const ms = Date.parse(deadlineISO);
      if (!Number.isNaN(ms)) deadline = ms;
    }
    out.push({
      title: t.title.trim().slice(0, 140),
      category: (CATEGORIES.includes(cat) ? cat : "other") as TaskCategory,
      deadline,
      estEffortMin: Math.max(1, Math.round(Number(t.estEffortMin) || 30)),
      impact: clampImpact(t.impact),
      hardDeadline: t.hardDeadline === undefined ? deadline != null : Boolean(t.hardDeadline),
      irreversible: Boolean(t.irreversible),
      source: "ai-capture",
    });
  }
  return out;
}

export async function POST(req: Request) {
  const { text, now } = (await req.json().catch(() => ({}))) as { text?: string; now?: number };
  const input = (text ?? "").toString().trim();
  if (!input) return Response.json({ tasks: [], ai: false });

  const clock = typeof now === "number" ? now : Date.now();

  if (aiConfigured()) {
    try {
      const raw = await aiChat({
        system: system(new Date(clock).toISOString()),
        user: input,
        json: true,
        maxTokens: 700,
      });
      const tasks = normalize(JSON.parse(stripFences(raw)));
      if (tasks.length) return Response.json({ tasks, ai: true });
    } catch {
      // fall through to deterministic
    }
  }

  return Response.json({ tasks: [parseCapture(input, clock)], ai: false });
}

/** Some models wrap JSON in ```json fences despite instructions. */
function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}
