import Link from "next/link";
import { CATEGORIES, PRODUCTS } from "@/lib/data/products";
import { tokenize } from "@/lib/rag/vectorStore";
import ProductCard from "@/components/store/ProductCard";
import ProductImage from "@/components/store/ProductImage";
import HeroAskButton from "@/components/store/HeroAskButton";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string; category?: string }> }) {
  const { q, category } = await searchParams;
  const qTokens = q ? tokenize(q) : [];
  const results = PRODUCTS.filter((p) => !category || p.category === category).filter(
    (p) => !qTokens.length || tokenize(`${p.title} ${p.tags.join(" ")} ${p.category} ${p.brand}`).some((t) => qTokens.includes(t)),
  );
  const filtering = Boolean(q || category);

  return (
    <div className="max-w-[1500px] mx-auto">
      {!filtering && (
        <section className="relative">
          <div className="h-[400px] bg-gradient-to-r from-[#0f2a4a] via-[#1d4f7a] to-[#ff9900]/80 flex items-start pt-12 px-8 md:px-16 text-white">
            <div className="max-w-xl">
              <div className="text-sm uppercase tracking-widest text-kart-orange font-bold mb-2">Agentic AI Commerce</div>
              <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-3">Shop with a team of AI agents</h1>
              <p className="text-gray-200 mb-5">A supervisor agent plans, specialists search with RAG, act through MCP tools, and every step is traced live in the Observatory.</p>
              <div className="flex gap-3 flex-wrap">
                <HeroAskButton />
                <Link href="/observatory" className="rounded-full border border-white/70 px-5 py-2 text-sm font-bold hover:bg-white/10">🔭 Open Agent Observatory</Link>
              </div>
            </div>
            <div className="hidden lg:flex ml-auto gap-4 text-8xl opacity-90">🎧💻📱</div>
          </div>
          <div className="absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-kart-bg to-transparent" />
        </section>
      )}

      <div className={`px-4 ${filtering ? "pt-4" : "-mt-16 relative z-10"}`}>
        {!filtering && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {CATEGORIES.slice(0, 8).map((c) => {
              const items = PRODUCTS.filter((p) => p.category === c).slice(0, 4);
              return (
                <div key={c} className="bg-white p-4 flex flex-col">
                  <h2 className="text-lg font-bold mb-3">{c === "Books" ? "Learn Agentic AI" : `Top picks in ${c}`}</h2>
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    {items.map((p) => (
                      <Link key={p.id} href={`/product/${p.id}`} className="text-xs">
                        <ProductImage product={p} size="tile" />
                        <div className="truncate mt-1">{p.brand}</div>
                      </Link>
                    ))}
                  </div>
                  <Link href={`/?category=${encodeURIComponent(c)}`} className="text-sm text-kart-link hover:underline mt-3">See more</Link>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white p-4 mb-4">
          <div className="flex items-baseline gap-3 mb-1">
            <h2 className="text-xl font-bold">{filtering ? `Results${q ? ` for "${q}"` : ""}${category ? ` in ${category}` : ""}` : "Today's Deals"}</h2>
            <span className="text-sm text-gray-600">{results.length} items</span>
            {filtering && <Link href="/" className="text-sm text-kart-link hover:underline ml-auto">Clear filters</Link>}
          </div>
          {filtering && <p className="text-xs text-gray-500">Tip: this is plain keyword search. Ask Kart AI for semantic (RAG) search like “something to cut wrist pain while coding”.</p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {results.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
