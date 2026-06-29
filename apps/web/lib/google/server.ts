import { cookies } from "next/headers";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/gmail.compose",
  "https://www.googleapis.com/auth/gmail.readonly",
];
const COOKIE = "g_tokens";
const COOKIE_OPTS = {
  httpOnly: true as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30,
  sameSite: "lax" as const,
};

interface Tokens {
  access_token?: string;
  refresh_token?: string;
  expiry?: number;
}

export function googleConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/google/callback";
}

export function authUrl(): string {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p.toString()}`;
}

export async function exchangeCode(code: string): Promise<Tokens> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
  });
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await r.json();
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expiry: Date.now() + (j.expires_in ?? 3600) * 1000,
  };
}

export async function storeTokens(tok: Tokens): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, JSON.stringify(tok), COOKIE_OPTS);
}

export async function hasTokens(): Promise<boolean> {
  const store = await cookies();
  return !!store.get(COOKIE)?.value;
}

/** Read the stored token, refreshing (and re-storing) it if expired. */
export async function ensureAccessToken(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  if (!raw) return null;
  let tok: Tokens;
  try {
    tok = JSON.parse(raw);
  } catch {
    return null;
  }
  if (tok.access_token && tok.expiry && Date.now() < tok.expiry - 60_000) {
    return tok.access_token;
  }
  if (tok.refresh_token && googleConfigured()) {
    try {
      const body = new URLSearchParams({
        refresh_token: tok.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        grant_type: "refresh_token",
      });
      const r = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
      const j = await r.json();
      if (j.access_token) {
        const next = { ...tok, access_token: j.access_token, expiry: Date.now() + (j.expires_in ?? 3600) * 1000 };
        store.set(COOKIE, JSON.stringify(next), COOKIE_OPTS);
        return j.access_token;
      }
    } catch {
      // fall through
    }
  }
  return tok.access_token ?? null;
}

export interface FocusBlockInput {
  title: string;
  reason?: string;
  deadline?: number | null;
  estEffortMin?: number;
}

/** Create a focus block ending at the deadline (backward-scheduled). */
export async function createEvent(token: string, task: FocusBlockInput): Promise<{ htmlLink?: string }> {
  const durMs = Math.max(30, task.estEffortMin || 30) * 60_000;
  const endMs = task.deadline ?? Date.now() + 60 * 60_000 + durMs;
  const startMs = endMs - durMs;
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        summary: `Clutch: ${task.title}`,
        description: `Focus block created by Clutch.${task.reason ? ` ${task.reason}` : ""}`,
        start: { dateTime: new Date(startMs).toISOString() },
        end: { dateTime: new Date(endMs).toISOString() },
        reminders: { useDefault: true },
      }),
    },
  );
  if (!res.ok) throw new Error(`calendar ${res.status}`);
  return res.json();
}

/** Create an event at an explicit start/end (used to push a whole plan). */
export async function createTimedEvent(
  token: string,
  summary: string,
  startMs: number,
  endMs: number,
): Promise<void> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      summary: `Clutch: ${summary}`,
      start: { dateTime: new Date(startMs).toISOString() },
      end: { dateTime: new Date(endMs).toISOString() },
      reminders: { useDefault: true },
    }),
  });
  if (!res.ok) throw new Error(`calendar ${res.status}`);
}

/** Read busy intervals from the primary calendar over the next `days`. */
export async function fetchFreeBusy(
  token: string,
  days: number,
): Promise<{ start: number; end: number; label: string }[]> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + days * 86_400_000).toISOString(),
      items: [{ id: "primary" }],
    }),
  });
  if (!res.ok) throw new Error(`freebusy ${res.status}`);
  const data = await res.json();
  const busy: { start: string; end: string }[] = data?.calendars?.primary?.busy ?? [];
  return busy
    .map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end), label: "Busy" }))
    .filter((b) => !Number.isNaN(b.start) && !Number.isNaN(b.end));
}

/** Pull recent email subjects + snippets to scan for deadlines (read-only). */
export async function scanGmail(token: string, max = 8): Promise<string[]> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${max}&q=${encodeURIComponent("newer_than:14d")}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok) throw new Error(`gmail ${listRes.status}`);
  const list = await listRes.json();
  const ids: string[] = (list.messages ?? []).map((m: { id: string }) => m.id).slice(0, max);
  const out: string[] = [];
  for (const id of ids) {
    const mRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=Subject`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    if (!mRes.ok) continue;
    const m = await mRes.json();
    const subject =
      (m.payload?.headers ?? []).find((h: { name: string }) => h.name === "Subject")?.value ?? "";
    out.push(`${subject} — ${m.snippet ?? ""}`);
  }
  return out;
}

/** Save a Gmail draft (never sends). */
export async function createDraft(token: string, subject: string, body: string): Promise<{ id?: string }> {
  const raw = `To: \r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}`;
  const encoded = Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ message: { raw: encoded } }),
  });
  if (!res.ok) throw new Error(`gmail ${res.status}`);
  return res.json();
}
