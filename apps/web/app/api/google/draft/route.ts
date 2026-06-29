import { ensureAccessToken, createDraft, googleConfigured } from "@/lib/google/server";

export async function POST(req: Request) {
  const { subject, body } = (await req.json().catch(() => ({}))) as {
    subject?: string;
    body?: string;
  };
  if (!body) return Response.json({ ok: false }, { status: 400 });

  if (!googleConfigured()) return Response.json({ ok: true, simulated: true });
  const token = await ensureAccessToken();
  if (!token) return Response.json({ ok: true, simulated: true });

  try {
    const d = await createDraft(token, subject || "Draft from Clutch", body);
    return Response.json({ ok: true, simulated: false, id: d.id });
  } catch {
    return Response.json({ ok: true, simulated: true });
  }
}
