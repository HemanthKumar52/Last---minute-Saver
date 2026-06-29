"use client";

import type { RankedTask, BusyInterval } from "@clutch/core";

export interface GoogleStatus {
  configured: boolean;
  connected: boolean;
}

export async function googleStatus(): Promise<GoogleStatus> {
  try {
    const r = await fetch("/api/google/status");
    if (r.ok) return await r.json();
  } catch {
    // ignore
  }
  return { configured: false, connected: false };
}

export function connectGoogle(): void {
  if (typeof window !== "undefined") window.location.href = "/api/google/auth";
}

export async function syncCalendar(
  days = 5,
): Promise<{ busy: BusyInterval[]; simulated: boolean }> {
  try {
    const r = await fetch("/api/google/freebusy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ days }),
    });
    if (r.ok) {
      const d = await r.json();
      return { busy: d.busy ?? [], simulated: !!d.simulated };
    }
  } catch {
    // ignore
  }
  return { busy: [], simulated: true };
}

export async function scanInbox(): Promise<{ emails: string[]; simulated: boolean }> {
  try {
    const r = await fetch("/api/google/scan", { method: "POST" });
    if (r.ok) {
      const d = await r.json();
      return { emails: d.emails ?? [], simulated: !!d.simulated };
    }
  } catch {
    // ignore
  }
  return { emails: [], simulated: true };
}

export async function addFocusBlock(
  task: RankedTask,
): Promise<{ ok: boolean; simulated: boolean; link?: string }> {
  try {
    const r = await fetch("/api/google/event", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        task: {
          title: task.title,
          reason: task.reason,
          deadline: task.deadline,
          estEffortMin: task.remainingMin || task.estEffortMin,
        },
      }),
    });
    if (r.ok) return await r.json();
  } catch {
    // ignore
  }
  return { ok: true, simulated: true };
}

export async function addPlanToCalendar(
  blocks: { title: string; start: number; end: number }[],
): Promise<{ ok: boolean; simulated: boolean; count: number }> {
  try {
    const r = await fetch("/api/google/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
    if (r.ok) return await r.json();
  } catch {
    // ignore
  }
  return { ok: true, simulated: true, count: blocks.length };
}

export async function saveGmailDraft(
  subject: string,
  body: string,
): Promise<{ ok: boolean; simulated: boolean }> {
  try {
    const r = await fetch("/api/google/draft", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject, body }),
    });
    if (r.ok) return await r.json();
  } catch {
    // ignore
  }
  return { ok: true, simulated: true };
}
