// Self-contained RAG layer: a deterministic local embedding model (hashed TF-IDF with
// synonym expansion), an in-memory vector store per collection, hybrid re-ranking and
// a 2D PCA projection so the audience can *see* the vector space.

import { PRODUCTS, formatINR } from "@/lib/data/products";
import { KNOWLEDGE_BASE } from "@/lib/data/knowledge";
import type { RagHit } from "@/lib/types";

const DIM = 256;

const STOPWORDS = new Set(
  "a an the and or of to for in on with is are be can my me i you your it this that what how do does show find want need get some any under below above than from by at as about please also which best good".split(" "),
);

const SYNONYMS: Record<string, string[]> = {
  headphone: ["audio", "earbud"], earphone: ["earbud", "audio"], earbud: ["audio"],
  laptop: ["notebook", "computer"], notebook: ["laptop"], pc: ["computer"],
  phone: ["smartphone", "mobile"], mobile: ["smartphone", "phone"], cellphone: ["phone"],
  tv: ["television"], television: ["tv"],
  refund: ["return", "money"], return: ["refund"], money: ["refund"],
  delivery: ["shipping", "ship"], shipping: ["delivery"], ship: ["delivery"],
  workout: ["fitness", "gym"], exercise: ["fitness", "gym"], fitness: ["gym"],
  discount: ["coupon", "offer"], coupon: ["offer", "discount"], promo: ["coupon"],
  broken: ["damaged", "defective"], damaged: ["defective"],
  cancel: ["cancellation"], emi: ["payment"], pay: ["payment"],
  cooking: ["kitchen", "cook"], kitchen: ["cooking"],
  skin: ["skincare", "face"], hair: ["hair"],
};

function stem(w: string) {
  if (w.length > 4 && w.endsWith("ies")) return w.slice(0, -3) + "y";
  if (w.length > 4 && w.endsWith("ing")) return w.slice(0, -3);
  if (w.length > 3 && w.endsWith("es") && !w.endsWith("ses")) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .map(stem);
}

function expand(tokens: string[]) {
  const out = [...tokens];
  for (const t of tokens) for (const s of SYNONYMS[t] ?? []) out.push(s);
  return out;
}

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function features(tokens: string[]) {
  const f = [...tokens];
  for (let i = 0; i < tokens.length - 1; i++) f.push(tokens[i] + "_" + tokens[i + 1]);
  return f;
}

interface Doc {
  id: string;
  title: string;
  text: string;
  tokens: string[];
  vector: Float64Array;
  point: [number, number];
  meta: Record<string, unknown>;
}

class Collection {
  docs: Doc[] = [];
  idf = new Map<string, number>();
  pcs: Float64Array[] = [];
  mean = new Float64Array(DIM);
  scale = 1;

  constructor(raw: { id: string; title: string; text: string; meta?: Record<string, unknown> }[]) {
    const tokenized = raw.map((r) => expand(tokenize(r.title + " " + r.text)));
    const df = new Map<string, number>();
    for (const toks of tokenized) for (const f of new Set(features(toks))) df.set(f, (df.get(f) ?? 0) + 1);
    for (const [f, n] of df) this.idf.set(f, Math.log(1 + raw.length / n));
    this.docs = raw.map((r, i) => ({
      id: r.id, title: r.title, text: r.text, tokens: tokenized[i],
      vector: this.vectorize(tokenized[i]), point: [0, 0], meta: r.meta ?? {},
    }));
    this.fitPca();
  }

  vectorize(tokens: string[]): Float64Array {
    const v = new Float64Array(DIM);
    for (const f of features(tokens)) {
      const h = hash(f);
      const sign = h & 1 ? 1 : -1;
      v[h % DIM] += sign * (this.idf.get(f) ?? Math.log(1 + this.docs.length + 1));
    }
    let norm = 0;
    for (let i = 0; i < DIM; i++) norm += v[i] * v[i];
    norm = Math.sqrt(norm) || 1;
    for (let i = 0; i < DIM; i++) v[i] /= norm;
    return v;
  }

  // Top-2 principal components via power iteration (corpus is tiny, so this is instant).
  private fitPca() {
    const n = this.docs.length;
    for (const d of this.docs) for (let i = 0; i < DIM; i++) this.mean[i] += d.vector[i] / n;
    const X = this.docs.map((d) => d.vector.map((x, i) => x - this.mean[i]));
    for (let c = 0; c < 2; c++) {
      let v = new Float64Array(DIM).map((_, i) => Math.sin(i * (c + 1) + 1));
      for (let iter = 0; iter < 60; iter++) {
        const next = new Float64Array(DIM);
        for (const x of X) {
          let dot = 0;
          for (let i = 0; i < DIM; i++) dot += x[i] * v[i];
          for (let i = 0; i < DIM; i++) next[i] += dot * x[i];
        }
        for (const pc of this.pcs) {
          let dot = 0;
          for (let i = 0; i < DIM; i++) dot += next[i] * pc[i];
          for (let i = 0; i < DIM; i++) next[i] -= dot * pc[i];
        }
        const norm = Math.sqrt(next.reduce((s, x) => s + x * x, 0)) || 1;
        v = next.map((x) => x / norm);
      }
      this.pcs.push(v);
    }
    const raw = this.docs.map((d) => this.rawProject(d.vector));
    this.scale = Math.max(...raw.flat().map(Math.abs)) || 1;
    this.docs.forEach((d, i) => (d.point = [raw[i][0] / this.scale, raw[i][1] / this.scale]));
  }

  private rawProject(v: Float64Array): [number, number] {
    const p = this.pcs.map((pc) => {
      let s = 0;
      for (let i = 0; i < DIM; i++) s += (v[i] - this.mean[i]) * pc[i];
      return s;
    });
    return [p[0], p[1]];
  }

  project(v: Float64Array): [number, number] {
    const [x, y] = this.rawProject(v);
    const clamp = (n: number) => Math.max(-1.15, Math.min(1.15, n / this.scale));
    return [clamp(x), clamp(y)];
  }
}

const cosine = (a: Float64Array, b: Float64Array) => {
  let s = 0;
  for (let i = 0; i < DIM; i++) s += a[i] * b[i];
  return s;
};

const store = {
  products: new Collection(
    PRODUCTS.map((p) => ({
      id: p.id,
      title: p.title,
      text: `${p.category}. ${p.brand}. ${p.description} ${p.features.join(". ")}. ${p.tags.join(", ")}`,
      meta: { price: p.price, category: p.category },
    })),
  ),
  knowledge: new Collection(KNOWLEDGE_BASE.map((d) => ({ id: d.id, title: d.title, text: d.text }))),
};

export type CollectionName = keyof typeof store;

export interface SearchOptions {
  topK?: number;
  maxPrice?: number;
  category?: string;
  excludeIds?: string[];
}

export function search(collection: CollectionName, query: string, opts: SearchOptions = {}) {
  const col = store[collection];
  const topK = opts.topK ?? 4;

  const t0 = performance.now();
  const qTokens = expand(tokenize(query));
  const qVec = col.vectorize(qTokens);
  const t1 = performance.now();

  const candidates = col.docs
    .filter((d) => !opts.excludeIds?.includes(d.id))
    .filter((d) => opts.maxPrice == null || (d.meta.price as number) <= opts.maxPrice)
    .filter((d) => !opts.category || (d.meta.category as string)?.toLowerCase() === opts.category.toLowerCase())
    .map((d) => ({ d, vectorScore: cosine(qVec, d.vector) }))
    .sort((a, b) => b.vectorScore - a.vectorScore)
    .slice(0, topK * 3);
  const t2 = performance.now();

  // Hybrid re-rank: blend dense similarity with exact keyword overlap.
  const qSet = new Set(qTokens);
  const hits: RagHit[] = candidates
    .map(({ d, vectorScore }) => {
      const docSet = new Set(d.tokens);
      const overlap = [...qSet].filter((t) => docSet.has(t)).length;
      const keywordScore = qSet.size ? overlap / qSet.size : 0;
      return {
        id: d.id,
        title: d.title,
        score: +(0.75 * vectorScore + 0.25 * keywordScore).toFixed(4),
        vectorScore: +vectorScore.toFixed(4),
        keywordScore: +keywordScore.toFixed(4),
        snippet: d.text.length > 180 ? d.text.slice(0, 180) + "…" : d.text,
        point: d.point,
      };
    })
    .filter((h) => h.score > 0.02)
    .sort((a, b) => b.score - a.score)
    .filter((h, _, all) => h.score >= all[0].score * 0.45)
    .slice(0, topK);
  const t3 = performance.now();

  return {
    tokens: [...new Set(qTokens)],
    queryVector: Array.from(qVec).map((x) => +x.toFixed(3)),
    queryPoint: col.project(qVec),
    totalDocs: col.docs.length,
    topK,
    timings: { embedMs: +(t1 - t0).toFixed(2), searchMs: +(t2 - t1).toFixed(2), rerankMs: +(t3 - t2).toFixed(2) },
    hits,
  };
}

export function vectorSpace() {
  return (Object.keys(store) as CollectionName[]).flatMap((c) =>
    store[c].docs.map((d) => ({
      id: d.id,
      collection: c,
      title: d.title,
      point: d.point,
      label: c === "products" ? formatINR(d.meta.price as number) : d.id,
    })),
  );
}

export const embeddingInfo = { model: "local-hashed-tfidf-v1", dimensions: DIM, similarity: "cosine", reranker: "hybrid 0.75·dense + 0.25·keyword" };
