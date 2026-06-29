import { ensureAccessToken, scanMail, microsoftConfigured } from "@/lib/microsoft/server";

export async function POST() {
  if (!microsoftConfigured()) return Response.json({ ok: true, simulated: true, emails: [] });
  const token = await ensureAccessToken();
  if (!token) return Response.json({ ok: true, simulated: true, emails: [] });

  try {
    const emails = await scanMail(token, 8);
    return Response.json({ ok: true, simulated: false, emails });
  } catch {
    return Response.json({ ok: true, simulated: true, emails: [] });
  }
}
