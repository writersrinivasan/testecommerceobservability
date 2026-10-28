"use client";

import type { StreamEvent } from "@/lib/types";
import { eventTs } from "@/lib/derive";

const COLOR: Record<string, string> = { run_start: "text-slate-200", span_start: "text-amber-300", span_end: "text-emerald-300", mcp: "text-cyan-300", rag: "text-green-300", state: "text-purple-300", final: "text-white", error: "text-red-400" };

function describe(e: StreamEvent) {
  switch (e.type) {
    case "run_start": return `run ${e.runId} · mode=${e.mode} · model=${e.model}`;
    case "span_start": return `${e.span.kind}:${e.span.name}`;
    case "span_end": return `${e.id} · ${e.status}`;
    case "mcp": return `${e.entry.direction} ${e.entry.server} ${e.entry.method ?? "response"}`;
    case "rag": return `${e.trace.collection} · ${e.trace.hits.length} hits for "${e.trace.query.slice(0, 50)}"`;
    case "state": return `checkpoint after ${e.node}`;
    case "final": return `answer (${e.answer.length} chars) · ${e.metrics.latencyMs} ms`;
    case "error": return e.message;
  }
}

export default function EventsPanel({ events }: { events: StreamEvent[] }) {
  const t0 = events[0] ? eventTs(events[0]) : 0;
  return (
    <div className="h-full overflow-auto scroll-thin font-mono text-[11px] p-2">
      {events.map((e, i) => (
        <div key={i} className="flex gap-3 px-1 hover:bg-obs-panel2">
          <span className="text-slate-600 w-14 text-right">+{Math.max(0, (eventTs(e) || t0) - t0)}ms</span>
          <span className={`w-20 ${COLOR[e.type]}`}>{e.type}</span>
          <span className="text-slate-300 truncate">{describe(e)}</span>
        </div>
      ))}
      {!events.length && <div className="p-4 text-slate-500 font-sans text-sm">Raw server-sent events will stream here.</div>}
    </div>
  );
}
