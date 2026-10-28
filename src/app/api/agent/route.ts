import { workflow } from "@/lib/agent/graph";
import { Tracer } from "@/lib/agent/tracer";
import { llmConfigFromRequest, llmMode } from "@/lib/agent/llm";
import { McpHub, type Session } from "@/lib/mcp/servers";
import { productById } from "@/lib/data/products";
import type { CartItem, ChatTurn, StreamEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as { message: string; history?: ChatTurn[]; cart?: CartItem[] };
  const message = String(body.message ?? "").slice(0, 1000);
  const llm = llmConfigFromRequest(req);
  const runId = `run_${Date.now().toString(36)}`;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: StreamEvent) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      const tracer = new Tracer(runId, send);
      const session: Session = {
        cart: (body.cart ?? []).filter((c) => productById(c.productId)).map((c) => ({ productId: c.productId, qty: Math.max(1, c.qty | 0) })),
      };
      const hub = new McpHub(session, (entry) => send({ type: "mcp", entry }));
      const mode = llmMode(llm);
      send({ type: "run_start", runId, query: message, mode, model: mode === "groq" ? llm.model : "simulated", ts: Date.now() });

      try {
        const final = await tracer.span(
          "graph",
          "agentkart_workflow",
          async () => {
            await tracer.span("mcp", "mcp.initialize", () => hub.connect(), {
              meta: { server: "all" },
              output: (h) => ({ servers: 3, tools: h.tools.map((t) => t.qualifiedName) }),
            });
            let lastNode = "";
            let state: Record<string, unknown> = {};
            const iter = await workflow.stream(
              { query: message, history: (body.history ?? []).slice(-6) },
              { configurable: { ctx: { tracer, llm, hub, session } }, streamMode: ["updates", "values"], recursionLimit: 25 },
            );
            for await (const [mode, chunk] of iter as AsyncIterable<[string, Record<string, unknown>]>) {
              if (mode === "updates") lastNode = Object.keys(chunk)[0] ?? lastNode;
              else {
                state = chunk;
                const visible = { ...chunk };
                delete visible.history;
                send({ type: "state", node: lastNode || "__start__", ts: Date.now(), state: visible });
              }
            }
            return state;
          },
          { input: { message }, output: (s) => ({ answer: s.answer }) },
        );
        send({
          type: "final",
          answer: String(final.answer ?? ""),
          productIds: ((final.productIds as string[]) ?? []).slice(0, 6),
          cart: session.cart,
          metrics: tracer.summary(),
          ts: Date.now(),
        });
      } catch (err) {
        console.error(err);
        send({ type: "error", message: String(err), ts: Date.now() });
      } finally {
        await hub.close();
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
