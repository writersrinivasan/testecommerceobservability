import { llmConfigFromRequest } from "@/lib/agent/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NON_CHAT = /whisper|tts|guard|playai|orpheus|distil/i;

// BYOK check: validates the user's Groq key against Groq's model list. The key is
// forwarded to Groq only and never stored or logged.
export async function POST(req: Request) {
  const { apiKey } = llmConfigFromRequest(req);
  if (!apiKey) return Response.json({ ok: false, error: "That doesn't look like a Groq API key." }, { status: 400 });
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` }, cache: "no-store" });
    if (res.status === 401) return Response.json({ ok: false, error: "Groq rejected this key (401). Check that it's active." }, { status: 401 });
    if (!res.ok) return Response.json({ ok: false, error: `Groq returned HTTP ${res.status}.` }, { status: 502 });
    const body = (await res.json()) as { data?: { id: string; active?: boolean }[] };
    const models = (body.data ?? []).filter((m) => m.active !== false && !NON_CHAT.test(m.id)).map((m) => m.id).sort();
    return Response.json({ ok: true, models });
  } catch {
    return Response.json({ ok: false, error: "Couldn't reach Groq. Check your network connection." }, { status: 502 });
  }
}
