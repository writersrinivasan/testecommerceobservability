// Pure reducer: turns a run's raw event stream (or a prefix of it, during replay) into
// everything the observatory renders — span tree, graph node/edge status, MCP + RAG traces.

import type { McpLogEntry, RagTrace, RunMetrics, Span, StreamEvent } from "./types";

export type VizStatus = "idle" | "running" | "done" | "error";

export interface RunView {
  query: string;
  mode?: "groq" | "simulated";
  model?: string;
  startedAt: number;
  spans: Span[];
  spanById: Record<string, Span>;
  mcp: McpLogEntry[];
  rag: RagTrace[];
  states: { node: string; ts: number; state: Record<string, unknown> }[];
  final?: { answer: string; productIds: string[]; metrics: RunMetrics };
  error?: string;
  nodeStatus: Record<string, VizStatus>;
  nodeCalls: Record<string, number>;
  edgeStatus: Record<string, VizStatus>;
  liveMetrics: { llmCalls: number; mcpCalls: number; ragQueries: number; nodes: number; tokensIn: number; tokensOut: number };
}

export const eventTs = (e: StreamEvent) =>
  e.type === "span_start" ? e.span.startedAt : e.type === "span_end" ? e.endedAt : e.type === "mcp" ? e.entry.ts : e.type === "rag" ? 0 : e.ts;

function vizTargets(span: Span): string[] {
  switch (span.kind) {
    case "node":
      return [span.name];
    case "guardrail":
      return ["guardrail"];
    case "llm":
      return ["groq"];
    case "mcp": {
      const server = span.meta?.server as string;
      return server === "all" ? ["mcp_client", "mcp_catalog", "mcp_cart", "mcp_orders"] : ["mcp_client", `mcp_${server}`];
    }
    case "rag":
      return ["rag_embed", `rag_${span.meta?.collection}`, "rag_rerank"];
    default:
      return [];
  }
}

const rank: Record<VizStatus, number> = { idle: 0, done: 1, error: 2, running: 3 };
const merge = (a: VizStatus | undefined, b: VizStatus): VizStatus => (!a || rank[b] > rank[a] ? b : a);

export function derive(events: StreamEvent[]): RunView {
  const v: RunView = {
    query: "", startedAt: 0, spans: [], spanById: {}, mcp: [], rag: [], states: [],
    nodeStatus: {}, nodeCalls: {}, edgeStatus: {},
    liveMetrics: { llmCalls: 0, mcpCalls: 0, ragQueries: 0, nodes: 0, tokensIn: 0, tokensOut: 0 },
  };

  for (const e of events) {
    switch (e.type) {
      case "run_start":
        Object.assign(v, { query: e.query, mode: e.mode, model: e.model, startedAt: e.ts });
        break;
      case "span_start": {
        const s = { ...e.span };
        v.spans.push(s);
        v.spanById[s.id] = s;
        break;
      }
      case "span_end": {
        const s = v.spanById[e.id];
        if (s) Object.assign(s, { endedAt: e.endedAt, status: e.status, output: e.output, meta: { ...s.meta, ...e.meta } });
        break;
      }
      case "mcp":
        v.mcp.push(e.entry);
        break;
      case "rag":
        v.rag.push(e.trace);
        break;
      case "state":
        v.states.push({ node: e.node, ts: e.ts, state: e.state });
        break;
      case "final":
        v.final = { answer: e.answer, productIds: e.productIds, metrics: e.metrics };
        break;
      case "error":
        v.error = e.message;
        break;
    }
  }

  const status = (s: Span): VizStatus => (s.status === "running" ? "running" : s.status === "error" ? "error" : "done");
  const ancestorNode = (s: Span): string | undefined => {
    let p = s.parentId ? v.spanById[s.parentId] : undefined;
    while (p && p.kind !== "node") p = p.parentId ? v.spanById[p.parentId] : undefined;
    return p?.name;
  };
  const setEdge = (id: string, st: VizStatus) => (v.edgeStatus[id] = merge(v.edgeStatus[id], st));

  let prevNode = "start";
  if (v.startedAt) v.nodeStatus.start = "done";
  for (const s of v.spans) {
    const st = status(s);
    for (const t of vizTargets(s)) {
      v.nodeStatus[t] = merge(v.nodeStatus[t], st);
      if (s.kind !== "guardrail") v.nodeCalls[t] = (v.nodeCalls[t] ?? 0) + 1;
    }
    if (s.kind === "node") {
      v.liveMetrics.nodes++;
      const pair = [prevNode, s.name].sort().join("~");
      setEdge(pair, st);
      prevNode = s.name;
    } else if (s.kind === "llm" || s.kind === "mcp" || s.kind === "rag") {
      const owner = ancestorNode(s);
      const hub = s.kind === "llm" ? "groq" : s.kind === "mcp" ? "mcp_client" : "rag_embed";
      if (owner) setEdge(`${owner}~${hub}`, st);
      if (s.kind === "mcp") {
        const server = s.meta?.server as string;
        for (const sv of server === "all" ? ["catalog", "cart", "orders"] : [server]) setEdge(`mcp_client~mcp_${sv}`, st);
        if (server !== "all") v.liveMetrics.mcpCalls++;
      }
      if (s.kind === "rag") {
        const c = s.meta?.collection as string;
        setEdge(`rag_embed~rag_${c}`, st);
        setEdge(`rag_${c}~rag_rerank`, st);
        v.liveMetrics.ragQueries++;
      }
      if (s.kind === "llm") {
        v.liveMetrics.llmCalls++;
        const usage = (s.output as { usage?: { input?: number; output?: number } } | undefined)?.usage;
        v.liveMetrics.tokensIn += usage?.input ?? 0;
        v.liveMetrics.tokensOut += usage?.output ?? 0;
      }
    }
  }
  if (v.final) {
    v.nodeStatus.end = "done";
    setEdge(["end", prevNode].sort().join("~"), "done");
  }
  return v;
}
