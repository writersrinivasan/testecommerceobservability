"use client";

export default function JsonView({ value, max = 4000 }: { value: unknown; max?: number }) {
  let text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  if (text === undefined) text = "—";
  if (text.length > max) text = text.slice(0, max) + "\n…";
  const html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?)/g, (m, str, colon, lit, num) => {
      if (str) return colon ? `<span class="text-sky-300">${str}</span>${colon}` : `<span class="text-amber-200">${str}</span>`;
      if (lit) return `<span class="text-purple-300">${lit}</span>`;
      if (num) return `<span class="text-emerald-300">${num}</span>`;
      return m;
    });
  return <pre className="text-[11px] leading-relaxed font-mono text-slate-300 whitespace-pre-wrap break-all" dangerouslySetInnerHTML={{ __html: html }} />;
}
