"use client";

import Link from "next/link";
import { Sparkles, X, Activity } from "lucide-react";
import { useApp } from "@/lib/store";
import ChatPanel from "./ChatPanel";
import { KeyStatusButton } from "@/components/ApiKeyDialog";

export default function ChatWidget() {
  const { chatOpen, setChatOpen } = useApp();
  return (
    <>
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)} className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-kart-navy2 text-white pl-3 pr-4 py-3 shadow-xl hover:bg-kart-navy3 border-2 border-kart-orange">
          <Sparkles className="w-5 h-5 text-kart-orange" />
          <span className="font-bold text-sm">Ask Kart AI</span>
        </button>
      )}
      {chatOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-white rounded-xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden">
          <div className="bg-kart-navy text-white px-3 py-2.5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-kart-orange" />
            <div className="flex-1 leading-tight">
              <div className="font-bold text-sm">Kart AI Assistant</div>
              <div className="text-[11px] text-gray-300">LangGraph agents · MCP tools · RAG</div>
            </div>
            <KeyStatusButton compact />
            <Link href="/observatory" className="flex items-center gap-1 text-xs bg-kart-navy3 hover:bg-[#485769] rounded px-2 py-1">
              <Activity className="w-3.5 h-3.5 text-kart-orange" /> Observatory
            </Link>
            <button onClick={() => setChatOpen(false)} aria-label="Close"><X className="w-5 h-5" /></button>
          </div>
          <ChatPanel />
        </div>
      )}
    </>
  );
}
