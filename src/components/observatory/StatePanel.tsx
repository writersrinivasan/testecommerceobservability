"use client";

import { useEffect, useState } from "react";
import type { RunView } from "@/lib/derive";
import JsonView from "./JsonView";

export default function StatePanel({ view }: { view: RunView }) {
  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(Math.max(0, view.states.length - 1)); }, [view.states.length]);
  const snap = view.states[idx];
  if (!snap) return <div className="p-6 text-sm text-slate-500">LangGraph state snapshots appear here after each super-step.</div>;
  const s = snap.state as { plan?: string[]; completed?: string[]; next?: string; reasoning?: string; entities?: unknown };
  return (
    <div className="grid grid-cols-[220px_1fr] h-full min-h-0">
      <div className="border-r border-obs-border overflow-auto scroll-thin py-1">
        <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-slate-500">Checkpoints</div>
        {view.states.map((st, i) => (
          <button key={i} onClick={() => setIdx(i)} className={`w-full text-left px-3 py-1 text-xs font-mono flex gap-2 ${i === idx ? "bg-obs-panel2 text-kart-orange" : "text-slate-300 hover:bg-obs-panel2"}`}>
            <span className="text-slate-600 w-4">{i}</span>{st.node}
          </button>
        ))}
      </div>
      <div className="overflow-auto scroll-thin p-3 space-y-3">
        {s.plan && s.plan.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Supervisor plan</div>
            <div className="flex items-center gap-1 flex-wrap">
              {s.plan.map((a, i) => (
                <span key={a} className="flex items-center gap-1">
                  <span className={`text-xs font-mono rounded px-2 py-0.5 border ${s.completed?.includes(a) ? "border-emerald-600 text-emerald-300 bg-emerald-950/50" : s.next === a ? "border-kart-orange text-kart-orange" : "border-obs-border text-slate-400"}`}>
                    {s.completed?.includes(a) ? "✓ " : s.next === a ? "▶ " : ""}{a}
                  </span>
                  {i < s.plan!.length - 1 && <span className="text-slate-600">→</span>}
                </span>
              ))}
              <span className="text-slate-600">→</span>
              <span className={`text-xs font-mono rounded px-2 py-0.5 border ${s.next === "synthesizer" ? "border-kart-orange text-kart-orange" : "border-obs-border text-slate-400"}`}>synthesizer</span>
            </div>
            {s.reasoning && <div className="text-xs text-slate-400 mt-1.5 italic">“{s.reasoning}”</div>}
          </div>
        )}
        <div className="bg-obs-bg rounded-md p-2 border border-obs-border"><JsonView value={snap.state} max={8000} /></div>
      </div>
    </div>
  );
}
