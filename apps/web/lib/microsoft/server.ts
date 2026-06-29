import { cookies } from "next/headers";

/** Microsoft Graph connector — Outlook/Microsoft 365 calendar + mail.
 * Mirrors the Google connector: OAuth code flow, httpOnly cookie token store,
 * refresh-on-expiry, and read-only Graph calls. Degrades to demo mode when the
 * MS_CLIENT_ID / MS_CLIENT_SECRET env vars are absent. */

const SCOPES = [
  "openid",
  "profile",
  "offline_access",
  "User.Read",
  "Calendars.Read",
  "Mail.Read",
];
const COOKIE = "ms_tokens";
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

function tenant(): string {
  return process.env.MS_TENANT || "common";
}

export function microsoftConfigured(): boolean {
  return !!(process.env.MS_CLIENT_ID && process.env.MS_CLIENT_SECRET);
}

function redirectUri(): string {
  return process.env.MS_REDIRECT_URI || "http://localhost:3000/api/ms/callback";
}

export function authUrl(): string {
  const p = new URLSearchParams({
    client_id: process.env.MS_CLIENT_ID || "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    response_mode: "query",
    prompt: "select_account",
  });
  return `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/authorize?${p.toString()}`;
}

export async function exchangeCode(code: string): Promise<Tokens> {
  const body = new URLSearchParams({
    code,
    client_id: process.env.MS_CLIENT_ID || "",
    client_secret: process.env.MS_CLIENT_SECRET || "",
    redirect_uri: redirectUri(),
    grant_type: "authorization_code",
    scope: SCOPES.join(" "),
  });
  const r = await fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`, {
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
  if (tok.refresh_token && microsoftConfigured()) {
    try {
      const body = new URLSearchParams({
        refresh_token: tok.refresh_token,
        client_id: process.env.MS_CLIENT_ID || "",
        client_secret: process.env.MS_CLIENT_SECRET || "",
        grant_type: "refresh_token",
        scope: SCOPES.join(" "),
      });
      const r = await fetch(`https://login.microsoftonline.com/${tenant()}/oauth2/v2.0/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      });
      const j = await r.json();
      if (j.access_token) {
        const next = {
          ...tok,
          access_token: j.access_token,
          refresh_token: j.refresh_token ?? tok.refresh_token,
          expiry: Date.now() + (j.expires_in ?? 3600) * 1000,
        };
        store.set(COOKIE, JSON.stringify(next), COOKIE_OPTS);
        return j.access_token;
      }
    } catch {
      // fall through
    }
  }
  return tok.access_token ?? null;
}

/** Read busy intervals from the user's calendar over the next `days` (UTC). */
export async function fetchCalendarBusy(
  token: string,
  days: number,
): Promise<{ start: number; end: number; label: string }[]> {
  const start = new Date().toISOString();
  const end = new Date(Date.now() + days * 86_400_000).toISOString();
  const url =
    `https://graph.microsoft.com/v1.0/me/calendarView?` +
    `startDateTime=${encodeURIComponent(start)}&endDateTime=${encodeURIComponent(end)}` +
    `&$select=subject,start,end,showAs&$orderby=start/dateTime&$top=50`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, Prefer: 'outlook.timezone="UTC"' },
  });
  if (!res.ok) throw new Error(`graph calendar ${res.status}`);
  const data = await res.json();
  type Ev = {
    subject?: string;
    showAs?: string;
    start?: { dateTime?: string };
    end?: { dateTime?: string };
  };
  const events: Ev[] = data?.value ?? [];
  return events
    .filter((e) => e.showAs !== "free")
    .map((e) => ({
      // Graph returns naive UTC datetimes (no "Z") when Prefer UTC is set.
      start: Date.parse(`${e.start?.dateTime ?? ""}Z`),
      end: Date.parse(`${e.end?.dateTime ?? ""}Z`),
      label: e.subject || "Busy",
    }))
    .filter((b) => !Number.isNaN(b.start) && !Number.isNaN(b.end));
}

/** Pull recent mail subjects + previews to scan for deadlines (read-only). */
export async function scanMail(token: string, max = 8): Promise<string[]> {
  const url =
    `https://graph.microsoft.com/v1.0/me/messages?` +
    `$select=subject,bodyPreview,receivedDateTime&$orderby=receivedDateTime desc&$top=${max}`;
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`graph mail ${res.status}`);
  const data = await res.json();
  type Msg = { subject?: string; bodyPreview?: string };
  const msgs: Msg[] = data?.value ?? [];
  return msgs.map((m) => `${m.subject ?? ""} — ${m.bodyPreview ?? ""}`.trim());
}
