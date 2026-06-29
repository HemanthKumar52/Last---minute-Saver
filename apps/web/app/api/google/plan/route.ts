import { ensureAccessToken, createTimedEvent, googleConfigured } from "@/lib/google/server";

interface Block {
  title: string;
  start: number;
  end: number;
}

export async function POST(req: Request) {
  const { blocks } = (await req.json().catch(() => ({}))) as { blocks?: Block[] };
  const list = Array.isArray(blocks) ? blocks : [];
  if (!list.length) return Response.json({ ok: false }, { status: 400 });

  if (!googleConfigured()) return Response.json({ ok: true, simulated: true, count: list.length });
  const token = await ensureAccessToken();
  if (!token) return Response.json({ ok: true, simulated: true, count: list.length });

  let created = 0;
  for (const b of list) {
    try {
      await createTimedEvent(token, b.title, b.start, b.end);
      created += 1;
    } catch {
      // continue best-effort
    }
  }
  return Response.json({ ok: true, simulated: false, count: created });
}
