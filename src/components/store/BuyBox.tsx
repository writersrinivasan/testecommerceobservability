"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Product, formatINR } from "@/lib/data/products";
import { useApp } from "@/lib/store";

export default function BuyBox({ product }: { product: Product }) {
  const { addToCart, setChatOpen, send } = useApp();
  const [qty, setQty] = useState(1);
  const router = useRouter();
  return (
    <div className="border border-gray-300 rounded-lg p-4 h-fit text-sm space-y-3">
      <div className="text-2xl">{formatINR(product.price)}</div>
      <div>
        {product.express ? <><span className="font-bold text-[#00a8e1]">⚡ Kart Express</span> FREE delivery <b>Tomorrow</b>.</> : <>FREE delivery in <b>3-5 days</b>.</>}
      </div>
      <div className="text-lg text-kart-green">In stock</div>
      <label className="flex items-center gap-2">
        Quantity:
        <select value={qty} onChange={(e) => setQty(+e.target.value)} className="border rounded-md px-2 py-1 bg-gray-100">
          {[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
        </select>
      </label>
      <button onClick={() => addToCart(product.id, qty)} className="btn-yellow w-full">Add to Cart</button>
      <button onClick={() => { addToCart(product.id, qty); router.push("/cart"); }} className="btn-amber w-full">Buy Now</button>
      <button
        onClick={() => { setChatOpen(true); void send(`Suggest products that go well with the ${product.title}`); }}
        className="w-full rounded-full border border-kart-navy2 py-1.5 hover:bg-gray-50 font-medium"
      >
        ✨ Ask AI what pairs with this
      </button>
      <div className="text-xs text-gray-600">Ships from AgentKart · Sold by {product.brand} Retail</div>
    </div>
  );
}
