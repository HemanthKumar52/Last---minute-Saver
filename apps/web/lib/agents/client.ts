"use client";

import type { Task } from "@clutch/core";
import type { AgentRunResult } from "./types";

export async function runAgentsRemote(
  task: Task,
  tasks: Task[],
  now: number,
): Promise<AgentRunResult | null> {
  try {
    const r = await fetch("/api/agents/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task, tasks, now }),
    });
    if (r.ok) return await r.json();
  } catch {
    // ignore
  }
  return null;
}
