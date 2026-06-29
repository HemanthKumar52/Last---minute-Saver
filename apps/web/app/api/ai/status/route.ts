import { aiConfig, aiConfigured } from "@/lib/ai/provider";

export async function GET() {
  const configured = aiConfigured();
  const c = aiConfig();
  return Response.json({
    configured,
    provider: configured ? c.provider : null,
    model: configured ? c.model : null,
  });
}
