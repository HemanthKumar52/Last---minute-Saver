import {
  rankTasks,
  radarState,
  slackHours,
  buildReason,
  generateArtifact,
  formatDeadline,
  type Task,
  type TaskCategory,
} from "@clutch/core";
import { aiChat, aiConfigured } from "@/lib/ai/provider";
import type { AgentStep, AgentRunResult } from "./types";

const CATS: TaskCategory[] = ["assignment", "email", "bill", "interview", "meeting", "errand", "other"];

const METHOD_BY_TYPE: Record<TaskCategory, string> = {
  assignment: "Decompose → outline → draft → review",
  email: "Draft a reply in your voice → one-tap send",
  bill: "Summarize amount + due + pay link → remind",
  interview: "Research → likely questions → talking points",
  meeting: "Agenda + prep notes + calendar block",
  errand: "Checklist + best time block",
  other: "Break into the next concrete action",
};

function stripFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

async function llmJson(system: string, user: string): Promise<Record<string, unknown> | null> {
  if (!aiConfigured()) return null;
  try {
    const out = await aiChat({ system, user, json: true, maxTokens: 300 });
    return JSON.parse(stripFences(out));
  } catch {
    return null;
  }
}

/**
 * The Coordinator. For one task it assigns a working context, runs the specialist
 * agents in sequence (each LLM-driven when OmniRoute is up, deterministic guardrail
 * otherwise), then CLEARS the context — ready for the next task.
 */
export async function runAgents(task: Task, allTasks: Task[], now: number): Promise<AgentRunResult> {
  const steps: AgentStep[] = [];
  const ctx: Record<string, unknown> = {};
  const push = (s: AgentStep) => steps.push(s);

  // 1.a — Context agent: assemble + assign this task's working context.
  const ranked = rankTasks(allTasks.length ? allTasks : [task], now);
  const rank = Math.max(1, ranked.findIndex((t) => t.id === task.id) + 1);
  const deadlineText = formatDeadline(task.deadline ?? null, now);
  ctx.task = { title: task.title, deadlineText, effort: task.estEffortMin, rank };
  push({
    agent: "context",
    title: "Context agent",
    summary: `Assigned context · ${deadlineText} · ~${task.estEffortMin}m · ranked #${rank}`,
    output: ctx.task as Record<string, unknown>,
    source: "rule",
  });

  // 2 — Prioritizer: where does this sit, and why.
  push({
    agent: "prioritizer",
    title: "Prioritizer agent",
    summary: `#${rank} of ${ranked.length} — ${buildReason(task, now)}`,
    output: { rank, of: ranked.length },
    source: "rule",
  });

  // 2.a — Classifier: task type.
  let type = task.category;
  let typeSource: "ai" | "rule" = "rule";
  const cj = await llmJson(
    'Classify the task into exactly one of: assignment, email, bill, interview, meeting, errand, other. Return {"type":"..."}.',
    task.title,
  );
  if (cj && typeof cj.type === "string" && CATS.includes(cj.type as TaskCategory)) {
    type = cj.type as TaskCategory;
    typeSource = "ai";
  }
  ctx.type = type;
  push({ agent: "classifier", title: "Classifier agent", summary: `Type: ${type}`, output: { type }, source: typeSource });

  // 2.b — Methodology: how to complete it.
  let methodology = METHOD_BY_TYPE[type];
  let methodSource: "ai" | "rule" = "rule";
  const mj = await llmJson(
    `Pick the best methodology to COMPLETE a ${type} task. Return {"methodology":"short imperative name","why":"one short line"}.`,
    task.title,
  );
  if (mj && typeof mj.methodology === "string") {
    methodology = mj.methodology;
    methodSource = "ai";
    ctx.methodologyWhy = mj.why;
  }
  ctx.methodology = methodology;
  push({ agent: "methodology", title: "Methodology agent", summary: methodology, output: { methodology, why: mj?.why }, source: methodSource });

  // 1.b — SLA watchdog: continuous slack/SLA (deterministic, the safety rail).
  const radar = radarState(task, now);
  const slack = slackHours(task, now);
  const sla = radar === "red" ? "breach risk" : radar === "amber" ? "at risk" : "on track";
  push({
    agent: "sla",
    title: "SLA watchdog",
    summary: `${sla} · ${slack == null ? "no deadline" : `${slack.toFixed(1)}h slack`}`,
    output: { radar, slack, sla },
    source: "rule",
  });

  // 2.c — Notification strategy.
  const strategy = radar === "red" ? "escalate now" : radar === "amber" ? "firm nudge" : "gentle reminder";
  let notifyMsg = `${task.title} — ${deadlineText}.`;
  const nj = await llmJson(
    `Write ONE short push-notification line nudging the user, tone="${strategy}". Return {"message":"..."}.`,
    `${task.title} — ${deadlineText}`,
  );
  if (nj && typeof nj.message === "string") notifyMsg = nj.message;
  push({
    agent: "notification",
    title: "Notification agent",
    summary: `${strategy} — “${notifyMsg}”`,
    output: { strategy, message: notifyMsg },
    source: nj?.message ? "ai" : "rule",
  });

  // #1 — Task agent (executor): produce the actual deliverable.
  const tmpl = generateArtifact(task, now);
  let body = tmpl.body;
  let execSource: "ai" | "rule" = "rule";
  if (aiConfigured()) {
    try {
      const out = await aiChat({
        system:
          "You produce the actual deliverable a person needs to finish a task, ready to act in one tap. Output ONLY the deliverable content, no preamble. The user's name is Arwin.",
        user: `Task: ${task.title}\nType: ${type}\nDeadline: ${deadlineText}\nMethodology: ${methodology}`,
        maxTokens: 600,
      });
      if (out.trim().length > 20) {
        body = out.trim();
        execSource = "ai";
      }
    } catch {
      // keep template
    }
  }
  push({
    agent: "executor",
    title: "Task agent (executor)",
    summary: `Produced the ${tmpl.kind} deliverable (${body.length} chars)`,
    output: { kind: tmpl.kind },
    source: execSource,
  });

  // 2.d — Presenter: how to display.
  const surface =
    tmpl.kind === "email" ? "Artifact panel (review & send)" : type === "meeting" ? "Calendar block" : "Artifact panel";
  push({ agent: "presenter", title: "Presenter agent", summary: `Display via ${surface}`, output: { surface }, source: "rule" });

  // Coordinator — clear the context, ready for the next task.
  const cleared = Object.keys(ctx).length;
  push({
    agent: "coordinator",
    title: "Coordinator",
    summary: `Task handled → cleared ${cleared} context keys, ready for the next task`,
    output: { cleared },
    source: "rule",
  });

  return {
    taskId: task.id,
    taskTitle: task.title,
    steps,
    type,
    methodology,
    radar,
    sla,
    notify: { strategy, message: notifyMsg },
    presenter: { surface },
    artifact: { kind: tmpl.kind, body },
    aiUsed: steps.some((s) => s.source === "ai"),
  };
}
