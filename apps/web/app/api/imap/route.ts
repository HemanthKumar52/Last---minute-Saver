import { scanImap, type ImapCreds } from "@/lib/imap/server";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<ImapCreds>;
  if (!body.host || !body.user || !body.password) {
    return Response.json({ error: "host, user and password are required" }, { status: 400 });
  }

  const { emails, error } = await scanImap({
    host: body.host,
    port: body.port,
    secure: body.secure,
    user: body.user,
    password: body.password,
    mailbox: body.mailbox,
  });

  if (error && emails.length === 0) {
    return Response.json({ error }, { status: 502 });
  }
  return Response.json({ emails, count: emails.length });
}
