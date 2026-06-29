/** Generic IMAP mailbox scan — works with any provider (Gmail app-password,
 * Fastmail, iCloud, self-hosted Dovecot, corporate Exchange-over-IMAP, …).
 *
 * Credentials are passed per-request and NEVER stored — the route holds them
 * only for the lifetime of one fetch. `imapflow` is lazy-imported so the rest
 * of the app builds and runs even when the optional dependency is absent. */

export interface ImapCreds {
  host: string;
  port?: number;
  secure?: boolean;
  user: string;
  password: string;
  mailbox?: string;
}

export interface ImapScanResult {
  emails: string[];
  error?: string;
}

export async function scanImap(creds: ImapCreds, max = 12): Promise<ImapScanResult> {
  if (!creds.host || !creds.user || !creds.password) {
    return { emails: [], error: "host, user and password are required" };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ImapFlow: any;
  try {
    ({ ImapFlow } = await import("imapflow"));
  } catch {
    return {
      emails: [],
      error: "IMAP support isn't installed on the server (run: pnpm add imapflow).",
    };
  }

  const port = creds.port ?? 993;
  const client = new ImapFlow({
    host: creds.host,
    port,
    secure: creds.secure ?? port === 993,
    auth: { user: creds.user, pass: creds.password },
    logger: false,
    socketTimeout: 15_000,
  });

  const emails: string[] = [];
  try {
    await client.connect();
    const lock = await client.getMailboxLock(creds.mailbox || "INBOX");
    try {
      const total: number = client.mailbox?.exists ?? 0;
      if (total > 0) {
        const start = Math.max(1, total - max + 1);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for await (const msg of client.fetch(`${start}:*`, { envelope: true })) {
          const subject: string = msg.envelope?.subject?.trim() || "";
          const from: string =
            msg.envelope?.from?.[0]?.name || msg.envelope?.from?.[0]?.address || "";
          if (subject) emails.push(from ? `${subject} — from ${from}` : subject);
        }
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (e) {
    try {
      await client.close();
    } catch {
      // ignore
    }
    const msg = e instanceof Error ? e.message : "connection failed";
    return { emails, error: `Couldn't reach that mailbox: ${msg}` };
  }

  return { emails: emails.reverse() };
}
