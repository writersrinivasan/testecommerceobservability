"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { MapPin, Search, ShoppingCart, Menu, Activity, Sparkles } from "lucide-react";
import { CATEGORIES } from "@/lib/data/products";
import { cartCount, useApp } from "@/lib/store";
import { KeyStatusButton } from "@/components/ApiKeyDialog";

function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [cat, setCat] = useState(params.get("category") ?? "");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (cat) sp.set("category", cat);
    router.push(`/?${sp.toString()}`);
  };
  return (
    <form onSubmit={submit} className="flex flex-1 h-10 rounded-md overflow-hidden focus-within:ring-3 focus-within:ring-kart-orange">
      <select value={cat} onChange={(e) => setCat(e.target.value)} className="hidden sm:block bg-[#e6e6e6] text-xs text-gray-700 px-2 border-r border-gray-300 outline-none">
        <option value="">All</option>
        {CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search AgentKart" className="flex-1 px-3 text-black bg-white outline-none text-[15px] min-w-0" />
      <button className="bg-[#febd69] hover:bg-[#f3a847] px-3" aria-label="Search">
        <Search className="w-5 h-5 text-kart-navy" />
      </button>
    </form>
  );
}

export default function Header() {
  const cart = useApp((s) => s.cart);
  const setChatOpen = useApp((s) => s.setChatOpen);
  const count = cartCount(cart);
  return (
    <header className="sticky top-0 z-40">
      <div className="bg-kart-navy text-white flex items-center gap-2 sm:gap-4 px-3 py-2">
        <Link href="/" className="flex items-baseline px-2 py-1 border border-transparent hover:border-white rounded-sm shrink-0">
          <span className="text-2xl font-bold tracking-tight">agent</span>
          <span className="text-2xl font-bold tracking-tight text-kart-orange">kart</span>
          <span className="text-xs text-gray-300 ml-0.5">.ai</span>
        </Link>
        <div className="hidden md:flex items-end gap-1 px-2 py-1 border border-transparent hover:border-white rounded-sm leading-tight shrink-0">
          <MapPin className="w-4 h-4 mb-0.5" />
          <div>
            <div className="text-xs text-gray-300">Deliver to</div>
            <div className="text-sm font-bold">Chennai 600001</div>
          </div>
        </div>
        <Suspense fallback={<div className="flex-1 h-10 bg-white rounded-md" />}>
          <SearchBox />
        </Suspense>
        <Link href="/observatory" className="hidden lg:block px-2 py-1 border border-transparent hover:border-white rounded-sm leading-tight shrink-0">
          <div className="text-xs text-gray-300">Live AI traces</div>
          <div className="text-sm font-bold flex items-center gap-1">
            <Activity className="w-4 h-4 text-kart-orange" /> Observatory
          </div>
        </Link>
        <div className="hidden lg:block px-2 py-1 border border-transparent hover:border-white rounded-sm leading-tight shrink-0">
          <div className="text-xs text-gray-300">Returns</div>
          <div className="text-sm font-bold">&amp; Orders</div>
        </div>
        <Link href="/cart" className="flex items-end px-2 py-1 border border-transparent hover:border-white rounded-sm shrink-0">
          <div className="relative">
            <ShoppingCart className="w-8 h-8" />
            <span className="absolute -top-1 left-3.5 text-kart-orange font-bold text-base">{count}</span>
          </div>
          <span className="hidden sm:inline text-sm font-bold">Cart</span>
        </Link>
      </div>
      <nav className="bg-kart-navy2 text-white text-sm flex items-center gap-1 px-3 py-1.5 overflow-x-auto whitespace-nowrap">
        <span className="flex items-center gap-1 font-bold px-2 py-0.5 border border-transparent hover:border-white rounded-sm">
          <Menu className="w-4 h-4" /> All
        </span>
        <button onClick={() => setChatOpen(true)} className="flex items-center gap-1 font-bold px-2 py-0.5 border border-transparent hover:border-white rounded-sm text-kart-orange">
          <Sparkles className="w-4 h-4" /> Kart AI Assistant
        </button>
        {CATEGORIES.map((c) => (
          <Link key={c} href={`/?category=${encodeURIComponent(c)}`} className="px-2 py-0.5 border border-transparent hover:border-white rounded-sm">
            {c}
          </Link>
        ))}
        <span className="ml-auto shrink-0"><KeyStatusButton /></span>
        <Link href="/observatory" className="px-2 py-0.5 font-bold border border-transparent hover:border-white rounded-sm">
          🔭 Agent Observatory
        </Link>
      </nav>
    </header>
  );
}
