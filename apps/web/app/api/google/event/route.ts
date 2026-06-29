import { ensureAccessToken, createEvent, googleConfigured, type FocusBlockInput } from "@/lib/google/server";

export async function POST(req: Request) {
  const { task } = (await req.json().catch(() => ({}))) as { task?: FocusBlockInput };
  if (!task?.title) return Response.json({ ok: false }, { status: 400 });

  if (!googleConfigured()) return Response.json({ ok: true, simulated: true });
  const token = await ensureAccessToken();
  if (!token) return Response.json({ ok: true, simulated: true });

  try {
    const ev = await createEvent(token, task);
    return Response.json({ ok: true, simulated: false, link: ev.htmlLink });
  } catch {
    return Response.json({ ok: true, simulated: true });
  }
}
