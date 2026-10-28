// LLM gateway (BYOK). Each request carries the shopper's own Groq API key; it is used only
// for that request and never stored or logged on the server. Without a key (or if a Groq
// call fails mid-demo) it falls back to a deterministic simulated response so the workflow
// and its traces still render. Every call is recorded as an "llm" span.

import { ChatGroq } from "@langchain/groq";
import type { BaseMessage } from "@langchain/core/messages";
import type { Tracer } from "./tracer";

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export interface LlmConfig {
  apiKey?: string;
  model: string;
}

export const llmMode = (llm: LlmConfig) => (llm.apiKey ? "groq" : "simulated") as "groq" | "simulated";

// Reads the BYOK headers sent by the browser.
export function llmConfigFromRequest(req: Request): LlmConfig {
  const apiKey = req.headers.get("x-groq-api-key")?.trim();
  const model = req.headers.get("x-groq-model")?.trim();
  return {
    apiKey: apiKey && /^[\w-]{20,200}$/.test(apiKey) ? apiKey : undefined,
    model: model && /^[\w.\/:-]{1,100}$/.test(model) ? model : DEFAULT_MODEL,
  };
}

export interface ToolDef {
  name: string;
  description?: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LlmResult {
  content: string;
  toolCalls: ToolCall[];
  simulated: boolean;
  usage?: { input?: number; output?: number };
  fallbackReason?: string;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const approxTokens = (s: string) => Math.ceil(s.length / 4);

const client = (llm: LlmConfig) => new ChatGroq({ apiKey: llm.apiKey, model: llm.model, temperature: 0.2, maxRetries: 1 });

const preview = (m: BaseMessage) => {
  const content = typeof m.content === "string" ? m.content : JSON.stringify(m.content);
  return { role: m.getType(), content: content.length > 600 ? content.slice(0, 600) + "…" : content };
};

export async function callLlm(
  tracer: Tracer,
  llm: LlmConfig,
  opts: { purpose: string; messages: BaseMessage[]; tools?: ToolDef[]; simulate: () => { content?: string; toolCalls?: ToolCall[] } },
): Promise<LlmResult> {
  const mode = llmMode(llm);
  return tracer.span(
    "llm",
    `${opts.purpose}`,
    async () => {
      const promptText = opts.messages.map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content))).join("\n");
      tracer.metrics.llmCalls++;

      if (mode === "groq") {
        try {
          const model = opts.tools?.length
            ? client(llm).bindTools(opts.tools.map((t) => ({ type: "function" as const, function: t })))
            : client(llm);
          const res = await model.invoke(opts.messages);
          const usage = res.usage_metadata;
          tracer.metrics.tokensIn += usage?.input_tokens ?? approxTokens(promptText);
          tracer.metrics.tokensOut += usage?.output_tokens ?? approxTokens(String(res.content));
          return {
            content: typeof res.content === "string" ? res.content : JSON.stringify(res.content),
            toolCalls: (res.tool_calls ?? []).map((tc, i) => ({ id: tc.id ?? `call_${i}`, name: tc.name, args: tc.args as Record<string, unknown> })),
            simulated: false,
            usage: { input: usage?.input_tokens, output: usage?.output_tokens },
          };
        } catch (err) {
          console.error("[groq] call failed, falling back to simulation:", err);
          const sim = opts.simulate();
          return { content: sim.content ?? "", toolCalls: sim.toolCalls ?? [], simulated: true, fallbackReason: String(err).slice(0, 300) };
        }
      }

      await sleep(250 + Math.random() * 400);
      const sim = opts.simulate();
      tracer.metrics.tokensIn += approxTokens(promptText);
      tracer.metrics.tokensOut += approxTokens((sim.content ?? "") + JSON.stringify(sim.toolCalls ?? []));
      return { content: sim.content ?? "", toolCalls: sim.toolCalls ?? [], simulated: true };
    },
    {
      input: { messages: opts.messages.map(preview), tools: opts.tools?.map((t) => t.name) },
      meta: { model: mode === "groq" ? llm.model : "simulated", provider: mode === "groq" ? "Groq" : "Simulator" },
      output: (r) => r,
    },
  );
}

export function parseJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}
