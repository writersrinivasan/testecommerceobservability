"use client";

import { useEffect, useState } from "react";
import type { RunView } from "@/lib/derive";

export interface VecPoint {
  id: string;
  collection: "products" | "knowledge";
  title: string;
  point: [number, number];
  label: string;
}

function Scatter({ points, query, hits }: { points: VecPoint[]; query: [number, number]; hits: Map<string, number> }) {
  const W = 420, H = 300, pad = 24;
  const sx = (x: number) => pad + ((x + 1.2) / 2.4) * (W - 2 * pad);
  const sy = (y: number) => H - pad - ((y + 1.2) / 2.4) * (H - 2 * pad);
  const [hover, setHover] = useState<VecPoint | null>(null);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <rect x={0} y={0} width={W} height={H} fill="#0a0f17" rx={8} />
      {[-1, 0, 1].map((g) => (
        <g key={g} stroke="#1e293b">
          <line x1={sx(g)} x2={sx(g)} y1={pad} y2={H - pad} />
          <line y1={sy(g)} y2={sy(g)} x1={pad} x2={W - pad} />
        </g>
      ))}
      {points.map((p) => hits.has(p.id) && (
        <line key={"l" + p.id} x1={sx(query[0])} y1={sy(query[1])} x2={sx(p.point[0])} y2={sy(p.point[1])} stroke="#34d399" strokeWidth={1 + 3 * (hits.get(p.id) ?? 0)} opacity={0.7} strokeDasharray="3 2" />
      ))}
      {points.map((p) => {
        const hit = hits.has(p.id);
        return (
          <circle key={p.id} cx={sx(p.point[0])} cy={sy(p.point[1])} r={hit ? 6 : 4} fill={hit ? "#34d399" : "#334155"} stroke={hit ? "#ecfdf5" : "none"} strokeWidth={1.5}
            onMouseEnter={() => setHover(p)} onMouseLeave={() => setHover(null)} className="cursor-pointer" />
        );
      })}
      <g transform={`translate(${sx(query[0])},${sy(query[1])})`}>
        <circle r={14} fill="#ff9900" opacity={0.18} className="animate-ping" />
        <path d="M0,-8 L2.4,-2.6 L8,-2.4 L3.6,1.4 L5,7.6 L0,4.2 L-5,7.6 L-3.6,1.4 L-8,-2.4 L-2.4,-2.6 Z" fill="#ff9900" />
      </g>
      <text x={pad} y={14} fill="#64748b" fontSize={10}>2D PCA projection of the embedding space · ★ = query</text>
      {hover && (
        <g transform={`translate(${Math.min(sx(hover.point[0]) + 8, W - 190)},${Math.max(sy(hover.point[1]) - 26, 18)})`}>
          <rect width={185} height={20} rx={4} fill="#1e293b" />
          <text x={6} y={14} fill="#e2e8f0" fontSize={10}>{hover.title.slice(0, 32)}</text>
        </g>
      )}
    </svg>
  );
}

export default function RagPanel({ view, points }: { view: RunView; points: VecPoint[] }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(Math.max(0, view.rag.length - 1)); }, [view.rag.length]);
  const t = view.rag[idx];

  if (!t)
    return <div className="p-6 text-sm text-slate-500">No retrievals in this run. Ask about products, recommendations or store policies to see the RAG pipeline.</div>;

  const hitScores = new Map(t.hits.map((h) => [h.id, h.score]));
  const maxAbs = Math.max(...t.queryVector.map(Math.abs), 0.01);
  const stages = [
    { label: "Query", value: `"${t.query.slice(0, 40)}${t.query.length > 40 ? "…" : ""}"` },
    { label: "Tokenize + expand", value: `${t.tokens.length} terms` },
    { label: "Embed", value: `${t.timings.embedMs} ms` },
    { label: "Vector search", value: `${t.totalDocs} docs · ${t.timings.searchMs} ms` },
    { label: "Hybrid re-rank", value: `${t.timings.rerankMs} ms` },
    { label: "Top-k context", value: `${t.hits.length} / k=${t.topK}` },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-obs-border text-xs">
        <span className="text-slate-500 mr-2">Retrievals</span>
        {view.rag.map((r, i) => (
          <button key={r.spanId} onClick={() => setIdx(i)} className={`rounded px-2 py-0.5 font-mono ${i === idx ? "bg-emerald-900 text-emerald-200" : "text-slate-400 hover:text-white"}`}>
            #{i + 1} {r.agent} → {r.collection}
          </button>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-[1fr_440px] min-h-0">
        <div className="overflow-auto scroll-thin p-3 space-y-3">
          <div className="flex items-stretch gap-1 overflow-x-auto scroll-thin">
            {stages.map((s, i) => (
              <div key={s.label} className="flex items-center gap-1">
                <div className="rounded-md border border-emerald-800 bg-emerald-950/40 px-2 py-1 min-w-[110px]">
                  <div className="text-[9px] uppercase tracking-wider text-emerald-400">{s.label}</div>
                  <div className="text-[11px] text-slate-200 font-mono truncate max-w-[170px]">{s.value}</div>
                </div>
                {i < stages.length - 1 && <span className="text-emerald-600">→</span>}
              </div>
            ))}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Query terms (with synonym expansion)</div>
            <div className="flex flex-wrap gap-1">{t.tokens.map((tok) => <span key={tok} className="text-[11px] font-mono bg-obs-panel2 border border-obs-border rounded px-1.5 text-slate-300">{tok}</span>)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Query embedding · 256 dims (green = +, red = −)</div>
            <div className="grid grid-cols-[repeat(64,minmax(0,1fr))] gap-px">
              {t.queryVector.map((x, i) => (
                <div key={i} className="h-2.5 rounded-[1px]" title={x.toString()} style={{ background: x === 0 ? "#111827" : x > 0 ? `rgba(52,211,153,${0.15 + 0.85 * (x / maxAbs)})` : `rgba(251,113,133,${0.15 + 0.85 * (-x / maxAbs)})` }} />
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Retrieved context {Object.keys(t.filters).length > 0 && <span className="normal-case font-mono text-slate-600">filters: {JSON.stringify(t.filters)}</span>}</div>
            <div className="space-y-1.5">
              {t.hits.map((h, i) => (
                <div key={h.id} className="rounded-md bg-obs-panel2 border border-obs-border p-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-emerald-300">#{i + 1}</span>
                    <span className="font-mono text-slate-500">{h.id}</span>
                    <span className="text-slate-100 truncate">{h.title}</span>
                    <span className="ml-auto font-mono text-emerald-300">{h.score.toFixed(3)}</span>
                  </div>
                  <div className="flex gap-3 mt-1 text-[10px] text-slate-400">
                    <Bar label="dense" v={h.vectorScore} color="#34d399" />
                    <Bar label="keyword" v={h.keywordScore} color="#22d3ee" />
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{h.snippet}</div>
                </div>
              ))}
              {!t.hits.length && <div className="text-xs text-slate-500">No documents passed the relevance threshold.</div>}
            </div>
          </div>
        </div>
        <div className="border-l border-obs-border p-2">
          <Scatter points={points.filter((p) => p.collection === t.collection)} query={t.queryPoint} hits={hitScores} />
        </div>
      </div>
    </div>
  );
}

function Bar({ label, v, color }: { label: string; v: number; color: string }) {
  return (
    <span className="flex items-center gap-1">
      {label}
      <span className="w-20 h-1.5 bg-slate-800 rounded overflow-hidden inline-block"><span className="block h-full" style={{ width: `${Math.min(100, v * 100)}%`, background: color }} /></span>
      <span className="font-mono">{v.toFixed(2)}</span>
    </span>
  );
}
