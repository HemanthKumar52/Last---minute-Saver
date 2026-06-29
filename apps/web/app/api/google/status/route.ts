import { googleConfigured, hasTokens } from "@/lib/google/server";

export async function GET() {
  return Response.json({ configured: googleConfigured(), connected: await hasTokens() });
}
