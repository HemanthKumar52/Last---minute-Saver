import { runAgents } from "@/lib/agents/orchestrator";
import type { Task } from "@clutch/core";

export async function POST(req: Request) {
  const { task, tasks, now } = (await req.json().catch(() => ({}))) as {
    task?: Task;
    tasks?: Task[];
    now?: number;
  };
  if (!task?.title) return Response.json({ error: "missing task" }, { status: 400 });
  const result = await runAgents(
    task,
    Array.isArray(tasks) ? tasks : [task],
    typeof now === "number" ? now : Date.now(),
  );
  return Response.json(result);
}
