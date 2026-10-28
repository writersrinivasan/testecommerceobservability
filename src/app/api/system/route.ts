import { workflow } from "@/lib/agent/graph";
import { DEFAULT_MODEL } from "@/lib/agent/llm";
import { McpHub } from "@/lib/mcp/servers";
import { embeddingInfo, vectorSpace } from "@/lib/rag/vectorStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Static system description for the observatory: MCP tool registry, vector space, LLM config.
export async function GET() {
  const hub = await new McpHub({ cart: [] }).connect();
  const tools = hub.tools;
  await hub.close();
  return Response.json({
    llm: { provider: "Groq", defaultModel: DEFAULT_MODEL, keyHandling: "BYOK" },
    mcp: { tools },
    rag: { ...embeddingInfo, points: vectorSpace() },
    graph: { mermaid: workflow.getGraph().drawMermaid() },
  });
}
