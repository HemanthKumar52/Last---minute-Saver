/**
 * Provider-agnostic AI adapter (server-only — imported only by route handlers).
 * Configure via env; no provider is hardcoded:
 *   AI_PROVIDER = "openai" (default, OpenAI-compatible) | "gemini"
 *   AI_API_KEY  = <your key>
 *   AI_BASE_URL = optional override (e.g. https://api.groq.com/openai/v1, http://localhost:11434/v1)
 *   AI_MODEL    = model id (e.g. gpt-4o-mini, llama-3.3-70b-versatile, gemini-1.5-flash)
 * When AI_API_KEY is absent, callers fall back to the deterministic engine.
 */

interface AiConfig {
  provider: string;
  key: string;
  baseUrl: string;
  model: string;
}

export function aiConfig(): AiConfig {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  const key = process.env.AI_API_KEY || "";
  const model = process.env.AI_MODEL || (provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini");
  const baseUrl =
    process.env.AI_BASE_URL ||
    (provider === "gemini"
      ? "https://generativelanguage.googleapis.com/v1beta"
      : "https://api.openai.com/v1");
  return { provider, key, baseUrl, model };
}

export function aiConfigured(): boolean {
  // Configured if a key is set OR a custom base URL is set (e.g. a local keyless
  // gateway like OmniRoute at http://localhost:20128/v1).
  return !!(process.env.AI_API_KEY?.trim() || process.env.AI_BASE_URL?.trim());
}

export async function aiChat(opts: {
  system?: string;
  user: string;
  json?: boolean;
  maxTokens?: number;
}): Promise<string> {
  const c = aiConfig();
  if (!c.key && !process.env.AI_BASE_URL?.trim()) throw new Error("AI not configured");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25_000);
  try {
    return c.provider === "gemini"
      ? await geminiChat(c, opts, ctrl.signal)
      : await openaiChat(c, opts, ctrl.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function openaiChat(
  c: AiConfig,
  opts: { system?: string; user: string; json?: boolean; maxTokens?: number },
  signal: AbortSignal,
): Promise<string> {
  const body: Record<string, unknown> = {
    model: c.model,
    messages: [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      { role: "user", content: opts.user },
    ],
    temperature: 0.4,
    max_tokens: opts.maxTokens ?? 800,
  };
  if (opts.json) body.response_format = { type: "json_object" };

  const res = await fetch(`${c.baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      "content-type": "application/json",
      // Key optional — local gateways (OmniRoute) accept requests without one.
      ...(c.key ? { authorization: `Bearer ${c.key}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text().catch(() => "")).slice(0, 180)}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function geminiChat(
  c: AiConfig,
  opts: { system?: string; user: string; json?: boolean; maxTokens?: number },
  signal: AbortSignal,
): Promise<string> {
  const sys = opts.system ? `${opts.system}\n\n` : "";
  const url = `${c.baseUrl}/models/${c.model}:generateContent?key=${encodeURIComponent(c.key)}`;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: sys + opts.user }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: opts.maxTokens ?? 800,
      ...(opts.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`AI ${res.status}`);
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts.map((p: { text?: string }) => p.text ?? "").join("");
}
