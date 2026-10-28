import type { Product } from "@/lib/data/products";

export default function ProductImage({ product, size = "md" }: { product: Product; size?: "sm" | "tile" | "md" | "lg" }) {
  const dims = { sm: "h-14 w-14 text-3xl rounded-md", tile: "h-24 w-full text-5xl", md: "h-48 w-full text-7xl", lg: "h-96 w-full text-[10rem] rounded-lg" }[size];
  return (
    <div className={`${dims} flex items-center justify-center shrink-0`} style={{ background: `radial-gradient(circle at 50% 40%, #ffffff 0%, ${product.gradient[0]} 45%, ${product.gradient[1]} 100%)` }}>
      <span className="drop-shadow-lg select-none">{product.emoji}</span>
    </div>
  );
}
