"use client";

import { parseCapture } from "@/lib/parse";
import { generateArtifact, type Task, type TaskInput, type Artifact } from "@clutch/core";

/** Extract tasks from raw text. Server uses AI when configured; otherwise heuristics. */
export async function extractTasks(text: string): Promise<{ tasks: TaskInput[]; ai: boolean }> {
  const now = Date.now();
  try {
    const r = await fetch("/api/ai/extract", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, now }),
    });
    if (!r.ok) throw new Error();
    const data = await r.json();
    if (Array.isArray(data.tasks) && data.tasks.length) {
      return { tasks: data.tasks, ai: !!data.ai };
    }
  } catch {
    // network/route failure → local heuristic
  }
  return { tasks: [parseCapture(text, now)], ai: false };
}

/** Generate the Save Me deliverable. Server uses AI when configured; otherwise the template. */
export async function fetchDraft(task: Task): Promise<Artifact & { ai: boolean }> {
  const now = Date.now();
  try {
    const r = await fetch("/api/ai/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ task, now }),
    });
    if (!r.ok) throw new Error();
    const data = await r.json();
    if (data && typeof data.body === "string") return data;
  } catch {
    // fall back to local template
  }
  return { ...generateArtifact(task, now), ai: false };
}

export type AiStatus = { configured: boolean; provider: string | null; model: string | null };

export async function fetchAiStatus(): Promise<AiStatus> {
  try {
    const r = await fetch("/api/ai/status");
    if (r.ok) return await r.json();
  } catch {
    // ignore
  }
  return { configured: false, provider: null, model: null };
}
