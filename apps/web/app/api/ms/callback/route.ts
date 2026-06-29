import { exchangeCode, storeTokens } from "@/lib/microsoft/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return Response.redirect(new URL("/?ms=error", req.url));
  try {
    const tokens = await exchangeCode(code);
    await storeTokens(tokens);
  } catch {
    return Response.redirect(new URL("/?ms=error", req.url));
  }
  return Response.redirect(new URL("/?ms=connected", req.url));
}
