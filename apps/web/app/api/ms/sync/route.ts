import { ensureAccessToken, fetchCalendarBusy, microsoftConfigured } from "@/lib/microsoft/server";

export async function POST(req: Request) {
  const { days } = (await req.json().catch(() => ({}))) as { days?: number };
  const horizon = typeof days === "number" ? days : 5;

  if (!microsoftConfigured()) return Response.json({ ok: true, simulated: true, busy: [] });
  const token = await ensureAccessToken();
  if (!token) return Response.json({ ok: true, simulated: true, busy: [] });

  try {
    const busy = await fetchCalendarBusy(token, horizon);
    return Response.json({ ok: true, simulated: false, busy });
  } catch {
    return Response.json({ ok: true, simulated: true, busy: [] });
  }
}
