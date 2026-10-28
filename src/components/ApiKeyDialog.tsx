"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { DEFAULT_GROQ_MODEL, groqHeaders, useApp } from "@/lib/store";

const FALLBACK_MODELS = [DEFAULT_GROQ_MODEL, "llama-3.1-8b-instant", "openai/gpt-oss-120b", "openai/gpt-oss-20b"];

export const maskKey = (k: string) => (k ? `${k.slice(0, 4)}…${k.slice(-4)}` : "");

// Status pill that opens the dialog. `dark` styles it for the Observatory.
export function KeyStatusButton({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  const { groqKey, groqModel, setKeyDialogOpen } = useApp();
  const on = Boolean(groqKey);
  const tone = on
    ? dark ? "border-purple-500 text-purple-200 bg-purple-950/50" : "border-emerald-400 text-emerald-200"
    : dark ? "border-amber-600 text-amber-200 bg-amber-950/40" : "border-kart-orange text-kart-orange";
  return (
    <button onClick={() => setKeyDialogOpen(true)} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold hover:brightness-125 ${tone}`} title="Bring your own Groq API key">
      <KeyRound className="w-3.5 h-3.5" />
      {compact ? (on ? "Groq" : "Add key") : on ? `Groq · ${groqModel}` : "Simulated LLM · Add Groq key"}
    </button>
  );
}

export default function ApiKeyDialog() {
  const { groqKey, groqModel, setGroq, keyDialogOpen, setKeyDialogOpen } = useApp();
  const [key, setKey] = useState("");
  const [model, setModel] = useState(groqModel);
  const [show, setShow] = useState(false);
  const [models, setModels] = useState<string[]>(FALLBACK_MODELS);
  const [status, setStatus] = useState<{ kind: "idle" | "checking" | "ok" | "error"; msg?: string }>({ kind: "idle" });

  useEffect(() => {
    if (!keyDialogOpen) return;
    setKey(groqKey);
    setModel(groqModel || DEFAULT_GROQ_MODEL);
    setStatus({ kind: "idle" });
    setShow(false);
  }, [keyDialogOpen, groqKey, groqModel]);

  if (!keyDialogOpen) return null;

  const verify = async () => {
    setStatus({ kind: "checking" });
    try {
      const res = await fetch("/api/groq/verify", { method: "POST", headers: groqHeaders(key.trim(), model) });
      const body = (await res.json()) as { ok: boolean; models?: string[]; error?: string };
      if (!body.ok) {
        setStatus({ kind: "error", msg: body.error ?? "Verification failed." });
        return false;
      }
      if (body.models?.length) {
        setModels(body.models);
        if (!body.models.includes(model)) setModel(body.models.includes(DEFAULT_GROQ_MODEL) ? DEFAULT_GROQ_MODEL : body.models[0]);
      }
      setStatus({ kind: "ok", msg: `Key works. ${body.models?.length ?? 0} chat models available.` });
      return true;
    } catch {
      setStatus({ kind: "error", msg: "Couldn't verify the key." });
      return false;
    }
  };

  const save = async () => {
    if (status.kind !== "ok" && !(await verify())) return;
    setGroq(key.trim(), model);
    setKeyDialogOpen(false);
  };

  const remove = () => {
    setGroq("", groqModel);
    setKey("");
    setKeyDialogOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4" onClick={() => setKeyDialogOpen(false)}>
      <div className="w-full max-w-md bg-white text-[#0f1111] rounded-xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-kart-navy text-white px-4 py-3 flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-kart-orange" />
          <div className="flex-1">
            <div className="font-bold">Bring your own Groq key</div>
            <div className="text-[11px] text-gray-300">Powers the LangGraph agents with a real LLM</div>
          </div>
          <button onClick={() => setKeyDialogOpen(false)} aria-label="Close"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-3 text-sm">
          <p className="text-gray-600 text-xs leading-relaxed">
            Your key is saved only in <b>this browser</b> (localStorage). It is sent with each chat request and forwarded to Groq for that request only. The server never stores or logs it.
            Get a free key at{" "}
            <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-kart-link hover:underline">console.groq.com/keys</a>.
          </p>
          <label className="block">
            <span className="text-xs font-bold">Groq API key</span>
            <div className="mt-1 flex items-center border border-gray-400 rounded-md focus-within:ring-2 focus-within:ring-kart-orange">
              <input
                type={show ? "text" : "password"}
                value={key}
                onChange={(e) => { setKey(e.target.value); setStatus({ kind: "idle" }); }}
                placeholder="gsk_…"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 px-3 py-2 outline-none rounded-md font-mono text-sm min-w-0"
              />
              <button type="button" onClick={() => setShow(!show)} className="px-2 text-gray-500" aria-label={show ? "Hide key" : "Show key"}>
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </label>
          <label className="block">
            <span className="text-xs font-bold">Model</span>
            <select value={model} onChange={(e) => setModel(e.target.value)} className="mt-1 w-full border border-gray-400 rounded-md px-2 py-2 bg-white">
              {[...new Set([model, ...models])].map((m) => <option key={m}>{m}</option>)}
            </select>
            <span className="text-[11px] text-gray-500">Pick a model that supports tool calling (the Order Agent needs it).</span>
          </label>
          {status.kind !== "idle" && (
            <div className={`flex items-start gap-1.5 text-xs rounded-md px-2 py-1.5 ${status.kind === "ok" ? "bg-emerald-50 text-emerald-800" : status.kind === "error" ? "bg-red-50 text-red-700" : "bg-gray-50 text-gray-600"}`}>
              {status.kind === "checking" ? <Loader2 className="w-4 h-4 animate-spin" /> : status.kind === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {status.kind === "checking" ? "Checking with Groq…" : status.msg}
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button onClick={verify} disabled={!key.trim() || status.kind === "checking"} className="rounded-full border border-gray-400 px-4 py-1.5 hover:bg-gray-50 disabled:opacity-40">Verify</button>
            <button onClick={save} disabled={!key.trim() || status.kind === "checking"} className="btn-yellow font-semibold disabled:opacity-40">Save &amp; use key</button>
            {groqKey && <button onClick={remove} className="ml-auto text-xs text-kart-link hover:underline">Remove key ({maskKey(groqKey)})</button>}
          </div>
          {!groqKey && <p className="text-[11px] text-gray-500">No key? The app still works in <b>Simulated LLM</b> mode with the same traces.</p>}
        </div>
      </div>
    </div>
  );
}
