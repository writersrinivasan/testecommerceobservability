"use client";

import { useMemo } from "react";
import { ReactFlow, Background, Controls, Handle, Position, MarkerType, type Edge, type Node, type NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { RunView, VizStatus } from "@/lib/derive";

type Kind = "agent" | "llm" | "mcp" | "rag" | "guard" | "terminal";

const COLORS: Record<Kind, string> = {
  agent: "#ff9900",
  llm: "#a78bfa",
  mcp: "#22d3ee",
  rag: "#34d399",
  guard: "#fb7185",
  terminal: "#94a3b8",
};

interface VizData extends Record<string, unknown> {
  label: string;
  sub?: string;
  icon: string;
  kind: Kind;
  status: VizStatus;
  calls?: number;
  detail?: string[];
}

interface LaneData extends Record<string, unknown> {
  label: string;
  color: string;
  w: number;
  h: number;
}

const sides = [Position.Top, Position.Bottom, Position.Left, Position.Right];

function VizNode({ data }: NodeProps<Node<VizData>>) {
  const color = COLORS[data.kind];
  const active = data.status !== "idle";
  if (data.kind === "terminal")
    return (
      <div className="rounded-full px-3 py-1 text-[11px] font-bold tracking-wider border-2" style={{ borderColor: active ? color : "#334155", color: active ? "#e2e8f0" : "#64748b", background: "#0f1621" }}>
        {data.label}
        {sides.map((p) => (
          <Handle key={p} type="source" position={p} id={p} className="!opacity-0" />
        ))}
        {sides.map((p) => (
          <Handle key={"t" + p} type="target" position={p} id={"t" + p} className="!opacity-0" />
        ))}
      </div>
    );
  return (
    <div
      className={`relative w-[150px] rounded-lg border-2 px-2.5 py-2 transition-all duration-300 ${data.status === "running" ? "node-running scale-105" : ""}`}
      style={{
        borderColor: active ? color : "#253247",
        background: data.status === "running" ? `${color}26` : "#0f1621",
        opacity: active ? 1 : 0.55,
        ["--ring" as string]: `${color}b0`,
      }}
    >
      {sides.map((p) => (
        <Handle key={p} type="source" position={p} id={p} className="!opacity-0" />
      ))}
      {sides.map((p) => (
        <Handle key={"t" + p} type="target" position={p} id={"t" + p} className="!opacity-0" />
      ))}
      <div className="flex items-center gap-1.5">
        <span className="text-base leading-none">{data.icon}</span>
        <span className="text-[12px] font-semibold text-slate-100 truncate">{data.label}</span>
        {data.status === "done" && <span className="ml-auto text-[10px]" style={{ color }}>✓</span>}
        {data.status === "error" && <span className="ml-auto text-[10px] text-red-400">✕</span>}
      </div>
      {data.sub && <div className="text-[10px] text-slate-400 mt-0.5 truncate">{data.sub}</div>}
      {data.detail && (
        <div className="mt-0.5 text-[9px] leading-tight font-mono text-slate-500 line-clamp-2">{data.detail.join(" · ")}</div>
      )}
      {!!data.calls && data.calls > 1 && (
        <span className="absolute -top-2 -right-2 text-[10px] font-bold rounded-full px-1.5 py-px text-black" style={{ background: color }}>×{data.calls}</span>
      )}
    </div>
  );
}

function LaneNode({ data }: NodeProps<Node<LaneData>>) {
  return (
    <div className="rounded-xl border border-dashed pointer-events-none" style={{ width: data.w, height: data.h, borderColor: `${data.color}55`, background: `${data.color}08` }}>
      <div className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5" style={{ color: data.color }}>{data.label}</div>
    </div>
  );
}

const nodeTypes = { viz: VizNode, lane: LaneNode };

type NodeDef = { id: string; x: number; y: number; label: string; icon: string; kind: Kind; sub?: string; detail?: string[] };

const LANES: { id: string; x: number; y: number; w: number; h: number; label: string; color: string }[] = [
  { id: "lane_llm", x: 400, y: -150, w: 340, h: 90, label: "LLM Gateway · Groq LPU", color: COLORS.llm },
  { id: "lane_graph", x: -50, y: -45, w: 1180, h: 270, label: "LangGraph · Supervisor Orchestration", color: COLORS.agent },
  { id: "lane_rag", x: -50, y: 245, w: 560, h: 255, label: "RAG Layer · Embeddings + Vector Store", color: COLORS.rag },
  { id: "lane_mcp", x: 530, y: 245, w: 600, h: 255, label: "MCP Layer · Model Context Protocol", color: COLORS.mcp },
];

function buildNodeDefs(toolsByServer: Record<string, string[]>, docCounts: Record<string, number>, model?: string): NodeDef[] {
  return [
    { id: "start", x: -30, y: 15, label: "START", icon: "", kind: "terminal" },
    { id: "guardrail", x: 50, y: -5, label: "Guardrail", icon: "🛡️", kind: "guard", sub: "PII mask · injection check" },
    { id: "supervisor", x: 300, y: -5, label: "Supervisor", icon: "🧭", kind: "agent", sub: "plans & routes agents" },
    { id: "synthesizer", x: 820, y: -5, label: "Synthesizer", icon: "✍️", kind: "agent", sub: "composes final answer" },
    { id: "end", x: 1050, y: 15, label: "END", icon: "", kind: "terminal" },
    { id: "support", x: 0, y: 120, label: "Support Agent", icon: "🛟", kind: "agent", sub: "policies via RAG" },
    { id: "recommendation", x: 200, y: 120, label: "Recommender", icon: "💡", kind: "agent", sub: "complements via RAG" },
    { id: "product_search", x: 420, y: 120, label: "Product Search", icon: "🔎", kind: "agent", sub: "RAG + MCP inventory" },
    { id: "order_agent", x: 650, y: 120, label: "Order Agent", icon: "🛒", kind: "agent", sub: "ReAct loop · MCP tools" },
    { id: "groq", x: 495, y: -122, label: "Groq LLM", icon: "🧠", kind: "llm", sub: model ?? "llama-3.3-70b-versatile" },
    { id: "rag_embed", x: -20, y: 335, label: "Embed Query", icon: "🧬", kind: "rag", sub: "hashed TF-IDF · 256d" },
    { id: "rag_products", x: 170, y: 280, label: "products index", icon: "🗂️", kind: "rag", sub: `${docCounts.products ?? 24} vectors · cosine` },
    { id: "rag_knowledge", x: 170, y: 395, label: "knowledge index", icon: "📚", kind: "rag", sub: `${docCounts.knowledge ?? 12} vectors · cosine` },
    { id: "rag_rerank", x: 350, y: 335, label: "Hybrid Re-rank", icon: "⚖️", kind: "rag", sub: "dense + keyword → top-k" },
    { id: "mcp_client", x: 570, y: 350, label: "MCP Client", icon: "🔌", kind: "mcp", sub: "JSON-RPC 2.0" },
    { id: "mcp_catalog", x: 800, y: 268, label: "catalog-mcp", icon: "🏷️", kind: "mcp", detail: toolsByServer.catalog },
    { id: "mcp_cart", x: 800, y: 345, label: "cart-mcp", icon: "🧺", kind: "mcp", detail: toolsByServer.cart },
    { id: "mcp_orders", x: 800, y: 422, label: "orders-mcp", icon: "📦", kind: "mcp", detail: toolsByServer.orders },
  ];
}

// [source, target, sourceHandle, targetHandle, kind]
const EDGE_DEFS: [string, string, string, string, Kind][] = [
  ["start", "guardrail", "right", "tleft", "agent"],
  ["guardrail", "supervisor", "right", "tleft", "agent"],
  ["guardrail", "synthesizer", "top", "ttop", "guard"],
  ["supervisor", "synthesizer", "right", "tleft", "agent"],
  ["synthesizer", "end", "right", "tleft", "agent"],
  ["supervisor", "support", "bottom", "ttop", "agent"],
  ["supervisor", "recommendation", "bottom", "ttop", "agent"],
  ["supervisor", "product_search", "bottom", "ttop", "agent"],
  ["supervisor", "order_agent", "bottom", "ttop", "agent"],
  ["supervisor", "groq", "top", "tleft", "llm"],
  ["order_agent", "groq", "top", "tbottom", "llm"],
  ["synthesizer", "groq", "top", "tright", "llm"],
  ["support", "rag_embed", "bottom", "ttop", "rag"],
  ["recommendation", "rag_embed", "bottom", "ttop", "rag"],
  ["product_search", "rag_embed", "bottom", "ttop", "rag"],
  ["product_search", "mcp_client", "bottom", "ttop", "mcp"],
  ["order_agent", "mcp_client", "bottom", "ttop", "mcp"],
  ["rag_embed", "rag_products", "right", "tleft", "rag"],
  ["rag_embed", "rag_knowledge", "right", "tleft", "rag"],
  ["rag_products", "rag_rerank", "right", "tleft", "rag"],
  ["rag_knowledge", "rag_rerank", "right", "tleft", "rag"],
  ["mcp_client", "mcp_catalog", "right", "tleft", "mcp"],
  ["mcp_client", "mcp_cart", "right", "tleft", "mcp"],
  ["mcp_client", "mcp_orders", "right", "tleft", "mcp"],
];

export default function AgentGraph({
  view,
  toolsByServer,
  docCounts,
}: {
  view: RunView | null;
  toolsByServer: Record<string, string[]>;
  docCounts: Record<string, number>;
}) {
  const nodeDefs = useMemo(() => buildNodeDefs(toolsByServer, docCounts, view?.model), [toolsByServer, docCounts, view?.model]);

  const nodes: Node[] = useMemo(
    () => [
      ...LANES.map((l) => ({ id: l.id, type: "lane", position: { x: l.x, y: l.y }, data: l, draggable: false, selectable: false, zIndex: -1 })),
      ...nodeDefs.map((d) => ({
        id: d.id,
        type: "viz",
        position: { x: d.x, y: d.y },
        data: { ...d, status: view?.nodeStatus[d.id] ?? "idle", calls: view?.nodeCalls[d.id] } satisfies VizData,
      })),
    ],
    [nodeDefs, view],
  );

  const edges: Edge[] = useMemo(
    () =>
      EDGE_DEFS.map(([s, t, sh, th, kind]) => {
        const key = [s, t].sort().join("~");
        const st = view?.edgeStatus[key] ?? "idle";
        const color = COLORS[kind];
        const live = st === "running";
        return {
          id: key,
          source: s,
          target: t,
          sourceHandle: sh,
          targetHandle: th,
          type: kind === "llm" ? "default" : "smoothstep",
          animated: live || (st === "done" && kind !== "agent"),
          style: {
            stroke: st === "idle" ? "#273449" : color,
            strokeWidth: live ? 3 : st === "done" ? 2 : 1.2,
            strokeDasharray: st === "idle" ? "4 4" : undefined,
            opacity: st === "idle" ? 0.7 : 1,
            filter: live ? `drop-shadow(0 0 4px ${color})` : undefined,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: st === "idle" ? "#273449" : color, width: 14, height: 14 },
        };
      }),
    [view],
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.06 }}
      minZoom={0.3}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      colorMode="dark"
      style={{ background: "transparent" }}
    >
      <Background color="#1e293b" gap={22} size={1} />
      <Controls showInteractive={false} position="bottom-right" />
    </ReactFlow>
  );
}

export const KIND_COLORS = COLORS;
