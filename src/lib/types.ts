// Shared types used by both the agent runtime (server) and the observatory UI (client).

export type SpanKind = "graph" | "node" | "llm" | "mcp" | "rag" | "guardrail";
export type SpanStatus = "running" | "ok" | "error";

export interface Span {
  id: string;
  parentId?: string;
  kind: SpanKind;
  name: string;
  startedAt: number;
  endedAt?: number;
  status: SpanStatus;
  input?: unknown;
  output?: unknown;
  meta?: Record<string, unknown>;
}

export interface CartItem {
  productId: string;
  qty: number;
}

export interface McpLogEntry {
  seq: number;
  ts: number;
  server: string;
  direction: "client→server" | "server→client";
  method?: string;
  payload: unknown;
}

export interface RagHit {
  id: string;
  title: string;
  score: number;
  vectorScore: number;
  keywordScore: number;
  snippet: string;
  point: [number, number];
}

export interface RagTrace {
  spanId: string;
  agent: string;
  collection: "products" | "knowledge";
  query: string;
  tokens: string[];
  queryVector: number[];
  queryPoint: [number, number];
  totalDocs: number;
  topK: number;
  filters: Record<string, unknown>;
  timings: { embedMs: number; searchMs: number; rerankMs: number };
  hits: RagHit[];
}

export interface RunMetrics {
  latencyMs: number;
  llmCalls: number;
  tokensIn: number;
  tokensOut: number;
  mcpCalls: number;
  ragQueries: number;
  nodesVisited: number;
  estCostUsd: number;
}

export type StreamEvent =
  | { type: "run_start"; runId: string; query: string; mode: "groq" | "simulated"; model: string; ts: number }
  | { type: "span_start"; span: Span }
  | { type: "span_end"; id: string; endedAt: number; status: SpanStatus; output?: unknown; meta?: Record<string, unknown> }
  | { type: "mcp"; entry: McpLogEntry }
  | { type: "rag"; trace: RagTrace }
  | { type: "state"; node: string; ts: number; state: Record<string, unknown> }
  | { type: "final"; answer: string; productIds: string[]; cart: CartItem[]; metrics: RunMetrics; ts: number }
  | { type: "error"; message: string; ts: number }
  | { type: "langsmith"; url: string; ts: number };

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
  productIds?: string[];
}
