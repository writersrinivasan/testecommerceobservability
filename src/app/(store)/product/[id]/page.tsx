import { notFound } from "next/navigation";
import Link from "next/link";
import { PRODUCTS, formatINR, productById } from "@/lib/data/products";
import ProductImage from "@/components/store/ProductImage";
import Stars from "@/components/store/Stars";
import ProductCard from "@/components/store/ProductCard";
import BuyBox from "@/components/store/BuyBox";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ id: p.id }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = productById(id);
  if (!p) notFound();
  const off = Math.round((1 - p.price / p.mrp) * 100);
  const related = PRODUCTS.filter((x) => x.category === p.category && x.id !== p.id).slice(0, 4);

  return (
    <div className="bg-white">
      <div className="max-w-[1400px] mx-auto px-4 py-4">
        <div className="text-xs text-kart-link mb-3">
          <Link href="/" className="hover:underline">Home</Link> › <Link href={`/?category=${encodeURIComponent(p.category)}`} className="hover:underline">{p.category}</Link>
        </div>
        <div className="grid md:grid-cols-[1fr_1.2fr_300px] gap-8">
          <ProductImage product={p} size="lg" />
          <div>
            <h1 className="text-2xl leading-snug">{p.title}</h1>
            <Link href={`/?q=${encodeURIComponent(p.brand)}`} className="text-sm text-kart-link hover:underline">Visit the {p.brand} Store</Link>
            <div className="mt-1"><Stars rating={p.rating} reviews={p.reviews} /></div>
            <hr className="my-3" />
            <div className="flex items-baseline gap-2">
              <span className="text-2xl text-kart-price">-{off}%</span>
              <span className="text-3xl"><sup className="text-sm">₹</sup>{p.price.toLocaleString("en-IN")}</span>
            </div>
            <div className="text-sm text-gray-600">M.R.P.: <s>{formatINR(p.mrp)}</s> · Inclusive of all taxes</div>
            <div className="flex gap-3 my-4 text-xs text-center">
              {["Free Delivery", "10 days Replacement", "1 Year Warranty", "Secure transaction"].map((b) => (
                <div key={b} className="w-20 flex flex-col items-center gap-1 text-kart-link">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">✓</div>{b}
                </div>
              ))}
            </div>
            <hr className="my-3" />
            <h2 className="font-bold mb-1">About this item</h2>
            <p className="text-sm mb-2">{p.description}</p>
            <ul className="list-disc pl-5 text-sm space-y-1">
              {p.features.map((f) => <li key={f}>{f}</li>)}
            </ul>
          </div>
          <BuyBox product={p} />
        </div>
        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="text-xl font-bold mb-3">Related products</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{related.map((r) => <ProductCard key={r.id} product={r} />)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
