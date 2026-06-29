"use client";

import type { TaskInput, BusyInterval } from "@clutch/core";

export interface IcsImport {
  tasks: TaskInput[];
  busy: BusyInterval[];
  count: number;
  error?: string;
}

export async function importIcs(url: string): Promise<IcsImport> {
  try {
    const r = await fetch("/api/ics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const d = await r.json();
    if (!r.ok) return { tasks: [], busy: [], count: 0, error: d.error || "import failed" };
    return { tasks: d.tasks ?? [], busy: d.busy ?? [], count: d.count ?? 0 };
  } catch {
    return { tasks: [], busy: [], count: 0, error: "could not reach the feed" };
  }
}

export async function importNotion(
  token: string,
  databaseId: string,
): Promise<{ tasks: TaskInput[]; count: number; error?: string }> {
  try {
    const r = await fetch("/api/notion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, databaseId }),
    });
    const d = await r.json();
    if (!r.ok) return { tasks: [], count: 0, error: d.error || "Notion import failed" };
    return { tasks: d.tasks ?? [], count: d.count ?? 0 };
  } catch {
    return { tasks: [], count: 0, error: "could not reach Notion" };
  }
}

export interface ImapCredsInput {
  host: string;
  port?: number;
  secure?: boolean;
  user: string;
  password: string;
  mailbox?: string;
}

/** Scan an IMAP mailbox; returns the raw subject lines to feed the extractor. */
export async function scanImapMailbox(
  creds: ImapCredsInput,
): Promise<{ emails: string[]; error?: string }> {
  try {
    const r = await fetch("/api/imap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(creds),
    });
    const d = await r.json();
    if (!r.ok) return { emails: [], error: d.error || "IMAP scan failed" };
    return { emails: d.emails ?? [] };
  } catch {
    return { emails: [], error: "could not reach the mail server" };
  }
}
