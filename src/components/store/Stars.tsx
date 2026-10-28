export default function Stars({ rating, reviews }: { rating: number; reviews?: number }) {
  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-kart-link">{rating.toFixed(1)}</span>
      <span className="text-kart-orange tracking-tighter" aria-label={`${rating} out of 5 stars`}>
        {"★★★★★".split("").map((s, i) => (
          <span key={i} className={i < Math.round(rating) ? "" : "text-gray-300"}>{s}</span>
        ))}
      </span>
      {reviews != null && <span className="text-kart-link">({reviews.toLocaleString("en-IN")})</span>}
    </div>
  );
}
