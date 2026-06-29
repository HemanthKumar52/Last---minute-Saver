import { authUrl, microsoftConfigured } from "@/lib/microsoft/server";

export function GET(req: Request) {
  if (!microsoftConfigured()) {
    return Response.redirect(new URL("/?ms=notconfigured", req.url));
  }
  return Response.redirect(authUrl());
}
