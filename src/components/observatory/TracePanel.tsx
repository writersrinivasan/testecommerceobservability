"use client";

import { useMemo, useState } from "react";
import type { RunView } from "@/lib/derive";
import type { Span } from "@/lib/types";
import JsonView from "./JsonView";

export const SPAN_COLORS: Record<string, string> = {
  graph: "#94a3b8", node: "#ff9900", llm: "#a78bfa", mcp: "#22d3ee", rag: "#34d399", guardrail: "#fb7185",
};

export default function TracePanel({ view }: { view: RunView }) {
  const [selected, setSelected] = useState<string | null>(null);
  const now = Date.now();
  const start = view.spans[0]?.startedAt ?? view.startedAt;
  const end = Math.max(start + 1, ...view.spans.map((s) => s.endedAt ?? now));
  const total = end - start;

  const rows = useMemo(() => {
    const children = new Map<string | undefined, Span[]>();
    for (const s of view.spans) children.set(s.parentId, [...(children.get(s.parentId) ?? []), s]);
    const out: { span: Span; depth: number }[] = [];
    const walk = (pid: string | undefined, depth: number) => {
      for (const s of children.get(pid) ?? []) {
        out.push({ span: s, depth });
        walk(s.id, depth + 1);
      }
    };
    walk(undefined, 0);
    return out;
  }, [view.spans]);

  const sel = selected ? view.spanById[selected] : null;

  return (
    <div className="grid grid-cols-[1fr_380px] h-full min-h-0">
      <div className="overflow-auto scroll-thin">
        <div className="sticky top-0 bg-obs-panel z-10 grid grid-cols-[minmax(260px,1fr)_70px_2fr] text-[10px] uppercase tracking-wider text-slate-500 px-3 py-1.5 border-b border-obs-border">
          <span>Span</span><span className="text-right pr-2">ms</span>
          <span className="flex justify-between"><span>0</span><span>{total} ms</span></span>
        </div>
        {rows.map(({ span: s, depth }) => {
          const dur = (s.endedAt ?? now) - s.startedAt;
          const left = ((s.startedAt - start) / total) * 100;
          const width = Math.max(0.6, (dur / total) * 100);
          const color = SPAN_COLORS[s.kind];
          return (
            <button
              key={s.id}
              onClick={() => setSelected(s.id)}
              className={`w-full grid grid-cols-[minmax(260px,1fr)_70px_2fr] items-center px-3 py-1 text-xs hover:bg-obs-panel2 ${selected === s.id ? "bg-obs-panel2" : ""}`}
            >
              <span className="flex items-center gap-1.5 truncate text-left" style={{ paddingLeft: depth * 14 }}>
                <span className="text-[9px] font-bold uppercase rounded px-1 py-px text-black shrink-0" style={{ background: color }}>{s.kind}</span>
                <span className="text-slate-200 truncate font-mono">{s.name}</span>
                {s.meta?.provider === "Simulator" && <span className="text-[9px] text-slate-500">sim</span>}
                {s.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-kart-orange animate-pulse" />}
                {s.status === "error" && <span className="text-red-400">✕</span>}
              </span>
              <span className="text-right pr-2 font-mono text-slate-400">{dur}</span>
              <span className="relative h-3.5">
                <span className={`absolute top-0 h-full rounded-sm ${s.status === "running" ? "animate-pulse" : ""}`} style={{ left: `${left}%`, width: `${width}%`, background: color, opacity: 0.85 }} />
              </span>
            </button>
          );
        })}
        {!rows.length && <div className="p-6 text-sm text-slate-500">No spans yet — send a message to start a run.</div>}
      </div>
      <div className="border-l border-obs-border overflow-auto scroll-thin p-3">
        {sel ? (
          <div className="space-y-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-500">Span</div>
              <div className="font-mono text-sm text-white break-all">{sel.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {sel.kind} · {(sel.endedAt ?? now) - sel.startedAt} ms · {sel.status}
              </div>
            </div>
            {sel.meta && Object.keys(sel.meta).length > 0 && <Section title="Attributes"><JsonView value={sel.meta} /></Section>}
            <Section title="Input"><JsonView value={sel.input} /></Section>
            <Section title="Output"><JsonView value={sel.output} /></Section>
          </div>
        ) : (
          <div className="text-xs text-slate-500">Click a span to inspect its input, output and attributes — like LangSmith / OpenTelemetry trace views.</div>
        )}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">{title}</div>
      <div className="bg-obs-bg rounded-md p-2 border border-obs-border">{children}</div>
    </div>
  );
}
