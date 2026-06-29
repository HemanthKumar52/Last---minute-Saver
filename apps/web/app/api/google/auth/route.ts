import { authUrl, googleConfigured } from "@/lib/google/server";

export function GET(req: Request) {
  if (!googleConfigured()) {
    return Response.redirect(new URL("/?google=notconfigured", req.url));
  }
  return Response.redirect(authUrl());
}
