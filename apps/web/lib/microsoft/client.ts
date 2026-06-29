"use client";

import type { BusyInterval } from "@clutch/core";

export interface MicrosoftStatus {
  configured: boolean;
  connected: boolean;
}

export async function microsoftStatus(): Promise<MicrosoftStatus> {
  try {
    const r = await fetch("/api/ms/status");
    if (r.ok) return await r.json();
  } catch {
    // ignore
  }
  return { configured: false, connected: false };
}

export function connectMicrosoft(): void {
  if (typeof window !== "undefined") window.location.href = "/api/ms/auth";
}

export async function syncMicrosoftCalendar(
  days = 5,
): Promise<{ busy: BusyInterval[]; simulated: boolean }> {
  try {
    const r = await fetch("/api/ms/sync", {
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

export async function scanMicrosoftInbox(): Promise<{ emails: string[]; simulated: boolean }> {
  try {
    const r = await fetch("/api/ms/scan", { method: "POST" });
    if (r.ok) {
      const d = await r.json();
      return { emails: d.emails ?? [], simulated: !!d.simulated };
    }
  } catch {
    // ignore
  }
  return { emails: [], simulated: true };
}
