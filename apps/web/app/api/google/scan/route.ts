import { ensureAccessToken, scanGmail, googleConfigured } from "@/lib/google/server";

export async function POST() {
  if (!googleConfigured()) return Response.json({ ok: true, simulated: true, emails: [] });
  const token = await ensureAccessToken();
  if (!token) return Response.json({ ok: true, simulated: true, emails: [] });

  try {
    const emails = await scanGmail(token, 8);
    return Response.json({ ok: true, simulated: false, emails });
  } catch {
    return Response.json({ ok: true, simulated: true, emails: [] });
  }
}
