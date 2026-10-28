"use client";

import { useApp } from "@/lib/store";

export default function HeroAskButton() {
  const setChatOpen = useApp((s) => s.setChatOpen);
  return (
    <button onClick={() => setChatOpen(true)} className="btn-yellow !px-5 !py-2 font-bold text-black">✨ Ask Kart AI</button>
  );
}
