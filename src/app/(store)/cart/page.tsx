"use client";

import Link from "next/link";
import { formatINR, productById } from "@/lib/data/products";
import { cartCount, useApp } from "@/lib/store";
import ProductImage from "@/components/store/ProductImage";

export default function CartPage() {
  const { cart, setQty, removeFromCart, setChatOpen, send } = useApp();
  const lines = cart.map((i) => ({ ...i, p: productById(i.productId)! })).filter((l) => l.p);
  const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0);
  const count = cartCount(cart);

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6 grid lg:grid-cols-[1fr_300px] gap-6">
      <div className="bg-white p-5">
        <h1 className="text-3xl mb-1">Shopping Cart</h1>
        {lines.length === 0 ? (
          <div className="py-10 text-gray-600">
            Your AgentKart cart is empty. <Link href="/" className="text-kart-link hover:underline">Continue shopping</Link> or ask Kart AI to add something for you.
          </div>
        ) : (
          <>
            <div className="text-right text-sm text-gray-600 border-b pb-1">Price</div>
            {lines.map((l) => (
              <div key={l.productId} className="flex gap-4 py-4 border-b">
                <Link href={`/product/${l.p.id}`} className="w-36"><ProductImage product={l.p} /></Link>
                <div className="flex-1">
                  <Link href={`/product/${l.p.id}`} className="text-lg hover:text-kart-price">{l.p.title}</Link>
                  <div className="text-xs text-kart-green my-1">In stock</div>
                  <div className="flex items-center gap-3 text-sm mt-2">
                    <div className="flex items-center border-2 border-kart-yellow rounded-full overflow-hidden">
                      <button onClick={() => setQty(l.productId, l.qty - 1)} className="px-3 py-0.5 hover:bg-gray-100">−</button>
                      <span className="px-2 font-bold">{l.qty}</span>
                      <button onClick={() => setQty(l.productId, l.qty + 1)} className="px-3 py-0.5 hover:bg-gray-100">+</button>
                    </div>
                    <span className="text-gray-300">|</span>
                    <button onClick={() => removeFromCart(l.productId)} className="text-kart-link hover:underline text-xs">Delete</button>
                  </div>
                </div>
                <div className="font-bold text-lg">{formatINR(l.p.price * l.qty)}</div>
              </div>
            ))}
            <div className="text-right text-lg pt-2">Subtotal ({count} items): <b>{formatINR(subtotal)}</b></div>
          </>
        )}
      </div>
      <div className="bg-white p-5 h-fit space-y-3">
        <div className="text-lg">Subtotal ({count} items): <b>{formatINR(subtotal)}</b></div>
        <button disabled={!lines.length} onClick={() => { setChatOpen(true); void send("Checkout my cart with UPI"); }} className="btn-yellow w-full disabled:opacity-50">
          Proceed to Buy (via AI agent)
        </button>
        <button onClick={() => { setChatOpen(true); void send("Apply coupon WELCOME200 to my cart"); }} className="w-full text-sm rounded-full border border-gray-300 py-1.5 hover:bg-gray-50">
          🏷️ Apply WELCOME200 via MCP
        </button>
        <p className="text-xs text-gray-500">Checkout and coupons are executed by the Order agent through the <b>cart-mcp</b> and <b>orders-mcp</b> servers. Watch it in the Observatory.</p>
      </div>
    </div>
  );
}
