"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Play, Square, Radio, ExternalLink } from "lucide-react";
import { useApp } from "@/lib/store";
import { derive, eventTs } from "@/lib/derive";
import ChatPanel from "@/components/store/ChatPanel";
import AgentGraph from "@/components/observatory/AgentGraph";
import TracePanel from "@/components/observatory/TracePanel";
import McpPanel, { type ToolInfo } from "@/components/observatory/McpPanel";
import RagPanel, { type VecPoint } from "@/components/observatory/RagPanel";
import StatePanel from "@/components/observatory/StatePanel";
import EventsPanel from "@/components/observatory/EventsPanel";
import ApiKeyDialog, { KeyStatusButton } from "@/components/ApiKeyDialog";

interface SystemInfo {
  langsmith: { enabled: boolean; project: string | null };
  mcp: { tools: ToolInfo[] };
  rag: { model: string; dimensions: number; points: VecPoint[] };
}

const TABS = [
  { id: "trace", label: "Trace Waterfall", color: "#ff9900" },
  { id: "mcp", label: "MCP Layer", color: "#22d3ee" },
  { id: "rag", label: "RAG Layer", color: "#34d399" },
  { id: "state", label: "Graph State", color: "#a78bfa" },
  { id: "events", label: "Event Stream", color: "#94a3b8" },
] as const;

export default function Observatory() {
  const { runs, runOrder, activeRunId, setActiveRun, busy } = useApp();
  const [sys, setSys] = useState<SystemInfo | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("trace");
  const [cursor, setCursor] = useState<number | null>(null);
  const [speed, setSpeed] = useState(0.5);
  const [, tick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/system").then((r) => r.json()).then(setSys).catch(() => {});
  }, []);

  const runId = activeRunId && runs[activeRunId] ? activeRunId : runOrder.find((id) => runs[id]);
  const run = runId ? runs[runId] : undefined;
  const allEvents = useMemo(() => run?.events ?? [], [run?.events]);
  const events = useMemo(() => (cursor == null ? allEvents : allEvents.slice(0, cursor)), [allEvents, cursor]);
  const view = useMemo(() => (run ? derive(events) : null), [run, events]);
  const running = !!run && !run.done && cursor == null;

  useEffect(() => {
    if (!running) return;
    const i = setInterval(() => tick((n) => n + 1), 150);
    return () => clearInterval(i);
  }, [running]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { stopReplay(); }, [runId]);

  function stopReplay() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setCursor(null);
  }

  function startReplay() {
    if (!allEvents.length) return;
    stopReplay();
    const step = (i: number) => {
      setCursor(i);
      if (i >= allEvents.length) {
        timer.current = setTimeout(() => setCursor(null), 600);
        return;
      }
      const prev = eventTs(allEvents[i - 1] ?? allEvents[0]) || 0;
      const cur = eventTs(allEvents[i]) || prev;
      const delay = Math.min(900, Math.max(25, (cur - prev) / speed));
      timer.current = setTimeout(() => step(i + 1), delay);
    };
    step(1);
  }

  const toolsByServer = useMemo(() => {
    const m: Record<string, string[]> = {};
    for (const t of sys?.mcp.tools ?? []) (m[t.server] ??= []).push(t.name);
    return m;
  }, [sys]);
  const docCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const p of sys?.rag.points ?? []) m[p.collection] = (m[p.collection] ?? 0) + 1;
    return m;
  }, [sys]);

  const fm = view?.final?.metrics;
  const lm = view?.liveMetrics;
  const latency = fm?.latencyMs ?? (view?.startedAt ? (cursor == null ? Date.now() : eventTs(events[events.length - 1]) || Date.now()) - view.startedAt : 0);
  const metrics = [
    { label: "End-to-end latency", value: `${latency.toLocaleString()} ms`, color: "#e2e8f0" },
    { label: "Agent nodes run", value: fm?.nodesVisited ?? lm?.nodes ?? 0, color: "#ff9900" },
    { label: "LLM calls", value: fm?.llmCalls ?? lm?.llmCalls ?? 0, color: "#a78bfa" },
    { label: "Tokens in / out", value: fm ? `${fm.tokensIn.toLocaleString()} / ${fm.tokensOut.toLocaleString()}` : lm ? `${lm.tokensIn} / ${lm.tokensOut}` : "0 / 0", color: "#a78bfa" },
    { label: "MCP tool calls", value: fm?.mcpCalls ?? lm?.mcpCalls ?? 0, color: "#22d3ee" },
    { label: "RAG retrievals", value: fm?.ragQueries ?? lm?.ragQueries ?? 0, color: "#34d399" },
    { label: "Est. cost", value: fm ? `$${fm.estCostUsd.toFixed(5)}` : "—", color: "#e2e8f0" },
  ];

  return (
    <div className="h-screen flex flex-col bg-obs-bg text-slate-200 overflow-hidden">
      <ApiKeyDialog />
      <header className="h-12 shrink-0 bg-kart-navy border-b border-obs-border flex items-center gap-3 px-3">
        <Link href="/" className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" /> Store</Link>
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold text-white">agent<span className="text-kart-orange">kart</span></span>
          <span className="text-sm font-semibold text-slate-300 ml-1">Agent Observatory</span>
        </div>
        <span className="text-[11px] text-slate-500 hidden xl:inline">LangGraph orchestration · MCP · RAG · live tracing</span>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <KeyStatusButton dark />
          {sys?.langsmith.enabled &&
            (view?.langsmithUrl ? (
              <a href={view.langsmithUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 rounded-full border border-teal-500 text-teal-200 bg-teal-950/40 px-2.5 py-1 font-semibold hover:brightness-125" title={`Open this trace in LangSmith (project: ${sys.langsmith.project})`}>
                <ExternalLink className="w-3.5 h-3.5" /> LangSmith trace
              </a>
            ) : (
              <span className="flex items-center gap-1 rounded-full border border-obs-border text-slate-400 px-2.5 py-1" title={`Traces are sent to LangSmith project "${sys.langsmith.project}"`}>
                <span className={`w-1.5 h-1.5 rounded-full ${running ? "bg-teal-400 animate-pulse" : "bg-teal-600"}`} /> LangSmith on
              </span>
            ))}
          <select value={runId ?? ""} onChange={(e) => setActiveRun(e.target.value)} className="bg-obs-panel2 border border-obs-border rounded px-2 py-1 max-w-[260px]">
            {!runOrder.length && <option value="">No runs yet</option>}
            {runOrder.filter((id) => runs[id]).map((id, i) => (
              <option key={id} value={id}>
                #{runOrder.length - i} {runs[id].done ? "✓" : "…"} {runs[id].query.slice(0, 38)}
              </option>
            ))}
          </select>
          <select value={speed} onChange={(e) => setSpeed(+e.target.value)} className="bg-obs-panel2 border border-obs-border rounded px-1 py-1" title="Replay speed">
            {[0.1, 0.25, 0.5, 1].map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
          {cursor == null ? (
            <button disabled={!run?.done} onClick={startReplay} className="flex items-center gap-1 rounded bg-kart-orange text-black font-bold px-2.5 py-1 disabled:opacity-40">
              <Play className="w-3.5 h-3.5" /> Replay
            </button>
          ) : (
            <button onClick={stopReplay} className="flex items-center gap-1 rounded bg-slate-200 text-black font-bold px-2.5 py-1">
              <Square className="w-3.5 h-3.5" /> Stop ({cursor}/{allEvents.length})
            </button>
          )}
        </div>
      </header>

      <div className="shrink-0 grid grid-cols-7 border-b border-obs-border bg-obs-panel">
        {metrics.map((m) => (
          <div key={m.label} className="px-3 py-2 border-r border-obs-border last:border-r-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">{m.label}</div>
            <div className="text-lg font-semibold font-mono" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-[360px_1fr] min-h-0">
        <aside className="border-r border-obs-border flex flex-col min-h-0 bg-obs-panel">
          <div className="px-3 py-2 border-b border-obs-border flex items-center gap-2 text-xs">
            <Radio className={`w-3.5 h-3.5 ${busy ? "text-red-400 animate-pulse" : "text-slate-500"}`} />
            <span className="font-semibold text-slate-300">Shopper chat</span>
            <span className="text-slate-500">{busy ? "workflow running…" : "send a prompt to trace it"}</span>
          </div>
          <div className="flex-1 min-h-0"><ChatPanel dark showTraceLink={false} /></div>
        </aside>

        <section className="flex flex-col min-h-0">
          <div className="flex-[1.5] min-h-[320px] relative border-b border-obs-border">
            {view?.query && (
              <div className="absolute top-2 left-3 z-10 text-xs bg-obs-panel/90 border border-obs-border rounded-md px-2 py-1 max-w-[60%] truncate">
                <span className="text-slate-500">query:</span> <span className="text-slate-100">{view.query}</span>
                {running && <span className="ml-2 text-red-400 animate-pulse">● LIVE</span>}
                {cursor != null && <span className="ml-2 text-kart-orange">▶ REPLAY {speed}×</span>}
              </div>
            )}
            <div className="absolute top-2 right-3 z-10 flex gap-3 text-[10px] text-slate-400 bg-obs-panel/90 border border-obs-border rounded-md px-2 py-1">
              {[["Agent", "#ff9900"], ["LLM", "#a78bfa"], ["MCP", "#22d3ee"], ["RAG", "#34d399"], ["Guardrail", "#fb7185"]].map(([l, c]) => (
                <span key={l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: c }} />{l}</span>
              ))}
            </div>
            <AgentGraph view={view} toolsByServer={toolsByServer} docCounts={docCounts} />
          </div>

          <div className="flex-1 min-h-[240px] flex flex-col bg-obs-panel">
            <div className="flex items-center border-b border-obs-border px-2 shrink-0">
              {TABS.map((t) => {
                const count = view ? { trace: view.spans.length, mcp: view.mcp.length, rag: view.rag.length, state: view.states.length, events: events.length }[t.id] : 0;
                return (
                  <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px ${tab === t.id ? "text-white" : "text-slate-500 border-transparent hover:text-slate-300"}`} style={{ borderColor: tab === t.id ? t.color : undefined }}>
                    {t.label} <span className="ml-1 text-[10px] font-mono" style={{ color: t.color }}>{count}</span>
                  </button>
                );
              })}
              {view?.final && (
                <span className="ml-auto text-[11px] text-slate-500 truncate max-w-[40%] pr-2">final: <span className="text-slate-300">{view.final.answer.replace(/\s+/g, " ").slice(0, 90)}…</span></span>
              )}
            </div>
            <div className="flex-1 min-h-0">
              {!view ? (
                <div className="h-full flex items-center justify-center text-sm text-slate-500">Ask Kart AI something in the chat to watch the agents work.</div>
              ) : tab === "trace" ? (
                <TracePanel view={view} />
              ) : tab === "mcp" ? (
                <McpPanel view={view} tools={sys?.mcp.tools ?? []} />
              ) : tab === "rag" ? (
                <RagPanel view={view} points={sys?.rag.points ?? []} />
              ) : tab === "state" ? (
                <StatePanel view={view} />
              ) : (
                <EventsPanel events={events} />
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
