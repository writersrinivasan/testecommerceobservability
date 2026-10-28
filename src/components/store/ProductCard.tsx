"use client";

import Link from "next/link";
import { type Product, formatINR } from "@/lib/data/products";
import { useApp } from "@/lib/store";
import ProductImage from "./ProductImage";
import Stars from "./Stars";

export default function ProductCard({ product }: { product: Product }) {
  const addToCart = useApp((s) => s.addToCart);
  const off = Math.round((1 - product.price / product.mrp) * 100);
  return (
    <div className="bg-white flex flex-col rounded-sm overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/product/${product.id}`} className="bg-[#f7f7f7]">
        <ProductImage product={product} />
      </Link>
      <div className="p-3 flex flex-col gap-1 flex-1">
        <Link href={`/product/${product.id}`} className="text-[15px] leading-snug line-clamp-2 hover:text-kart-price">
          {product.title}
        </Link>
        <Stars rating={product.rating} reviews={product.reviews} />
        <div className="flex items-baseline gap-2">
          <span className="text-2xl">
            <sup className="text-xs">₹</sup>
            {product.price.toLocaleString("en-IN")}
          </span>
          <span className="text-xs text-gray-500">
            M.R.P: <s>{formatINR(product.mrp)}</s>
          </span>
          <span className="text-xs">({off}% off)</span>
        </div>
        {product.express ? (
          <div className="text-xs"><span className="font-bold text-[#00a8e1]">⚡ Kart Express</span> · FREE delivery <b>Tomorrow</b></div>
        ) : (
          <div className="text-xs text-gray-600">FREE delivery in 3-5 days</div>
        )}
        <button onClick={() => addToCart(product.id)} className="btn-yellow mt-auto self-start">Add to cart</button>
      </div>
    </div>
  );
}
