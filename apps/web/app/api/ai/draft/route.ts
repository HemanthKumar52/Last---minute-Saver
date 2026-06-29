import { aiChat, aiConfigured } from "@/lib/ai/provider";
import { generateArtifact, formatDeadline, type Task, type Artifact } from "@clutch/core";

const KIND_GUIDE: Record<Artifact["kind"], string> = {
  email:
    "Write a complete, ready-to-send email (include a Subject line). Warm, concise, professional. Sign off as Arwin.",
  outline:
    "Write a tight game-plan: a one-line framing, then 3 concrete numbered steps the user can start immediately. The first step must be tiny enough to beat the blank-page freeze.",
  brief:
    "Write a one-page prep brief: likely questions/points, the user's talking points, and a quick plan. Bullet form.",
  billSummary:
    "Write a crisp payment summary: what, amount placeholder, due date, where to pay, and a 2-step action list. Never claim to pay it.",
};

export async function POST(req: Request) {
  const { task, now } = (await req.json().catch(() => ({}))) as { task?: Task; now?: number };
  if (!task || !task.title) {
    return Response.json({ error: "missing task" }, { status: 400 });
  }
  const clock = typeof now === "number" ? now : Date.now();

  // Template is the source of truth for structure + grounding + the confirm label.
  const template = generateArtifact(task, clock);

  if (aiConfigured()) {
    try {
      const body = await aiChat({
        system:
          "You produce the actual deliverable a person needs to finish a task, so they can act in one tap. Output ONLY the deliverable content — no preamble, no explanation, no markdown fences. The user's name is Arwin.",
        user: `Task: ${task.title}
Category: ${task.category}
Deadline: ${formatDeadline(task.deadline ?? null, clock)}
${task.notes ? `Context: ${task.notes}\n` : ""}
${KIND_GUIDE[template.kind]}`,
        maxTokens: 700,
      });
      const clean = body.trim();
      if (clean.length > 20) {
        return Response.json({ ...template, body: clean, ai: true });
      }
    } catch {
      // fall through to template
    }
  }

  return Response.json({ ...template, ai: false });
}
