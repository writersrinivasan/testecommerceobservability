"use client";

import { useState } from "react";
import type { RunView } from "@/lib/derive";
import JsonView from "./JsonView";

export interface ToolInfo {
  server: string;
  name: string;
  qualifiedName: string;
  description?: string;
  inputSchema: { properties?: Record<string, { type?: string; description?: string }>; required?: string[] };
}

const SERVER_META: Record<string, { icon: string; desc: string }> = {
  catalog: { icon: "🏷️", desc: "Product catalog & inventory" },
  cart: { icon: "🧺", desc: "Session cart & coupons" },
  orders: { icon: "📦", desc: "Checkout & order tracking" },
};

export default function McpPanel({ view, tools }: { view: RunView; tools: ToolInfo[] }) {
  const [server, setServer] = useState<string>("all");
  const [open, setOpen] = useState<number | null>(null);
  const log = view.mcp.filter((m) => server === "all" || m.server === server);
  const usedTools = new Set(view.spans.filter((s) => s.kind === "mcp").map((s) => s.name));

  return (
    <div className="grid grid-cols-[340px_1fr] h-full min-h-0">
      <div className="border-r border-obs-border overflow-auto scroll-thin p-3 space-y-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Tool registry · discovered via tools/list</div>
        {Object.entries(SERVER_META).map(([name, meta]) => (
          <div key={name} className="rounded-lg border border-obs-border bg-obs-panel2">
            <div className="px-3 py-2 border-b border-obs-border flex items-center gap-2">
              <span>{meta.icon}</span>
              <span className="font-mono text-sm text-cyan-300">{name}-mcp</span>
              <span className="text-[10px] text-slate-500 ml-auto">{meta.desc}</span>
            </div>
            <div className="p-2 space-y-1.5">
              {tools.filter((t) => t.server === name).map((t) => (
                <div key={t.name} className={`rounded px-2 py-1 text-xs ${usedTools.has(t.qualifiedName) ? "bg-cyan-950 ring-1 ring-cyan-500" : ""}`}>
                  <div className="font-mono text-slate-100">
                    {t.name}
                    <span className="text-slate-500">({Object.keys(t.inputSchema.properties ?? {}).join(", ")})</span>
                    {usedTools.has(t.qualifiedName) && <span className="ml-1 text-[9px] text-cyan-300">● called</span>}
                  </div>
                  <div className="text-[10px] text-slate-400">{t.description}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-col min-h-0">
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-obs-border text-xs">
          <span className="text-slate-500 mr-2">JSON-RPC wire log ({log.length} frames)</span>
          {["all", "catalog", "cart", "orders"].map((s) => (
            <button key={s} onClick={() => setServer(s)} className={`rounded px-2 py-0.5 ${server === s ? "bg-cyan-900 text-cyan-200" : "text-slate-400 hover:text-white"}`}>{s}</button>
          ))}
        </div>
        <div className="flex-1 overflow-auto scroll-thin font-mono text-xs">
          {log.map((m) => {
            const p = m.payload as { id?: number; method?: string; result?: unknown; error?: unknown; params?: { name?: string } };
            const label = m.method ? `${m.method}${p.params?.name ? ` → ${p.params.name}` : ""}` : p.error ? "error" : "result";
            const isReq = m.direction === "client→server";
            return (
              <div key={m.seq} className="border-b border-obs-border/60">
                <button onClick={() => setOpen(open === m.seq ? null : m.seq)} className="w-full flex items-center gap-2 px-3 py-1 hover:bg-obs-panel2 text-left">
                  <span className="text-slate-600 w-6 text-right">{m.seq}</span>
                  <span className={`w-28 shrink-0 ${isReq ? "text-amber-300" : "text-cyan-300"}`}>{isReq ? `agent → ${m.server}` : `${m.server} → agent`}</span>
                  <span className={isReq ? "text-slate-100" : "text-slate-400"}>{label}</span>
                  {p.id != null && <span className="text-slate-600">id:{p.id}</span>}
                </button>
                {open === m.seq && <div className="px-10 pb-2"><JsonView value={m.payload} /></div>}
              </div>
            );
          })}
          {!log.length && <div className="p-6 text-slate-500 font-sans text-sm">No MCP traffic yet. Every run performs initialize → tools/list handshakes with all three servers, then tools/call when agents act.</div>}
        </div>
      </div>
    </div>
  );
}
