// Tiny markdown renderer for assistant replies: **bold**, bullet lists, [KB-xx] citations.
import { Fragment } from "react";

function inline(text: string, dark: boolean) {
  return text.split(/(\*\*[^*]+\*\*|\[KB-\d+\])/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (/^\[KB-\d+\]$/.test(part))
      return (
        <span key={i} className={`inline-block text-[10px] font-mono px-1 py-px rounded mx-0.5 align-middle ${dark ? "bg-emerald-900 text-emerald-300" : "bg-emerald-100 text-emerald-800"}`} title="Retrieved by the RAG layer">
          {part.slice(1, -1)}
        </span>
      );
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export default function Markdown({ text, dark = false }: { text: string; dark?: boolean }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="space-y-2">
      {blocks.map((b, i) => {
        const lines = b.split("\n").filter(Boolean);
        if (lines.every((l) => /^\s*([-*•]|\d+\.)\s+/.test(l)))
          return (
            <ul key={i} className="list-disc pl-4 space-y-0.5">
              {lines.map((l, j) => (
                <li key={j}>{inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, ""), dark)}</li>
              ))}
            </ul>
          );
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l.replace(/^#+\s*/, ""), dark)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
