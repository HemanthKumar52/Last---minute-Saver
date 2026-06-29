import { microsoftConfigured, hasTokens } from "@/lib/microsoft/server";

export async function GET() {
  return Response.json({ configured: microsoftConfigured(), connected: await hasTokens() });
}
