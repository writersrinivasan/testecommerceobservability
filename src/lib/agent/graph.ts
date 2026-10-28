// The AgentKart multi-agent workflow, built with LangGraph.
//
//   START → guardrail → supervisor ⇄ {product_search, recommendation, order_agent, support} → synthesizer → END
//
// The supervisor plans which specialists to run, then loops: each specialist reports back
// to the supervisor, which dispatches the next one until the plan is complete.

import { Annotation, END, START, StateGraph, type LangGraphRunnableConfig } from "@langchain/langgraph";
import { AIMessage, HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { CATEGORIES, PRODUCTS, formatINR, productById } from "@/lib/data/products";
import { search, tokenize, type CollectionName, type SearchOptions } from "@/lib/rag/vectorStore";
import type { McpHub, Session } from "@/lib/mcp/servers";
import type { ChatTurn } from "@/lib/types";
import { callLlm, parseJson, type LlmConfig, type ToolCall } from "./llm";
import type { Tracer } from "./tracer";
import { traceable } from "langsmith/traceable";

export const AGENTS = ["product_search", "recommendation", "order_agent", "support"] as const;
type AgentName = (typeof AGENTS)[number];

interface Entities {
  keywords?: string;
  category?: string;
  maxPrice?: number;
  orderId?: string;
  couponCode?: string;
}

interface Finding {
  agent: string;
  summary: string;
  data: unknown;
}

export interface Ctx {
  tracer: Tracer;
  llm: LlmConfig;
  hub: McpHub;
  session: Session;
}

const State = Annotation.Root({
  query: Annotation<string>(),
  history: Annotation<ChatTurn[]>(),
  safety: Annotation<{ passed: boolean; flags: string[] }>(),
  planned: Annotation<boolean>(),
  plan: Annotation<string[]>({ reducer: (_, b) => b, default: () => [] }),
  reasoning: Annotation<string>(),
  entities: Annotation<Entities>(),
  next: Annotation<string>(),
  completed: Annotation<string[]>({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  findings: Annotation<Finding[]>({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  productIds: Annotation<string[]>({ reducer: (a, b) => [...new Set([...a, ...b])], default: () => [] }),
  answer: Annotation<string>(),
});

type S = typeof State.State;
type Update = Partial<typeof State.Update>;

const getCtx = (config: LangGraphRunnableConfig) => config.configurable?.ctx as Ctx;

function node(name: string, fn: (s: S, ctx: Ctx) => Promise<Update>) {
  return async (state: S, config: LangGraphRunnableConfig) => {
    const ctx = getCtx(config);
    return ctx.tracer.span("node", name, () => fn(state, ctx), {
      input: { query: state.query, plan: state.plan, completed: state.completed },
      output: (u) => u,
    });
  };
}

// ---------- shared helpers: RAG + MCP calls, each traced as its own span ----------

async function retrieve(ctx: Ctx, agent: string, collection: CollectionName, query: string, opts: SearchOptions = {}) {
  return ctx.tracer.span(
    "rag",
    `retrieve:${collection}`,
    async (spanId) => {
      // Also recorded in LangSmith as a retriever run, nested under the calling agent node.
      const r = await traceable(async (q: string, o: SearchOptions) => search(collection, q, o), {
        name: `retrieve:${collection}`,
        run_type: "retriever",
        metadata: { agent, collection },
        processOutputs: (out) => ({
          documents: (out as ReturnType<typeof search>).hits.map((h) => ({ type: "Document", page_content: h.snippet, metadata: { id: h.id, title: h.title, score: h.score } })),
        }),
      })(query, opts);
      ctx.tracer.metrics.ragQueries++;
      ctx.tracer.emit({ type: "rag", trace: { spanId, agent, collection, query, filters: { ...opts }, ...r } });
      return r;
    },
    { input: { query, ...opts }, meta: { collection }, output: (r) => ({ hits: r.hits.map((h) => ({ id: h.id, title: h.title, score: h.score })) }) },
  );
}

async function mcpCall(ctx: Ctx, qualifiedName: string, args: Record<string, unknown>) {
  const [server, tool] = qualifiedName.split("__");
  return ctx.tracer.span(
    "mcp",
    qualifiedName,
    async () => {
      ctx.tracer.metrics.mcpCalls++;
      // Also recorded in LangSmith as a tool run, nested under the calling agent node.
      return traceable((a: Record<string, unknown>) => ctx.hub.call(qualifiedName, a), {
        name: qualifiedName,
        run_type: "tool",
        metadata: { protocol: "mcp", server, tool },
      })(args);
    },
    { input: args, meta: { server, tool }, output: (r) => r },
  );
}

const lastShownProducts = (history: ChatTurn[]) =>
  [...history].reverse().find((t) => t.role === "assistant" && t.productIds?.length)?.productIds ?? [];

// ---------- heuristics used by the simulator (no API key) ----------

function extractEntities(q: string): Entities {
  const l = q.toLowerCase();
  const price = l.match(/(?:under|below|less than|within|upto|up to|max|budget(?: of)?)\s*(?:rs\.?|₹|inr)?\s*([\d,]+)\s*(k)?/);
  const maxPrice = price ? parseInt(price[1].replace(/,/g, ""), 10) * (price[2] ? 1000 : 1) : undefined;
  const orderId = q.match(/\bAK-?\d{4}\b/i)?.[0].toUpperCase().replace(/^AK(\d)/, "AK-$1");
  const couponCode = q.match(/\b(WELCOME200|SAVE10|AGENTIC25)\b/i)?.[0].toUpperCase() ?? q.match(/\b(?:coupon|code)\s+([A-Z0-9]{4,})\b/i)?.[1]?.toUpperCase();
  const category = CATEGORIES.find((c) => l.includes(c.toLowerCase()));
  const mainClause = q.split(/\b(?:and|also)\s+(?:what|how|is|can|do|does|tell|apply|add|track)\b/i)[0];
  const keywords = mainClause.replace(price?.[0] ?? "", " ").replace(/\s+/g, " ").trim();
  return { keywords, maxPrice, orderId, couponCode, category };
}

function heuristicPlan(q: string): AgentName[] {
  const l = q.toLowerCase();
  const plan: AgentName[] = [];
  const productWords = new Set(PRODUCTS.flatMap((p) => p.tags.flatMap(tokenize)));
  const mentionsProduct = tokenize(q).some((t) => productWords.has(t));
  const order = /\b(add|remove|cart|checkout|check out|place (an |my |the )?order|coupon|apply|track|order status|where is my order|ak-?\d{4})\b/.test(l);
  const support = /\b(return|refund|policy|shipping|delivery|deliver|warranty|cod|cash on delivery|emi|cancel|exchange|damaged|broken|membership|plus|payment|pay)\b/.test(l);
  const recommend = /\b(recommend|suggest|similar|goes with|go with|also buy|complement|gift|accessor|pair)/.test(l);
  const searchIntent = /\b(show|find|search|looking for|need|want|under|below|cheap|budget|best|top|compare)\b/.test(l) || (mentionsProduct && !order);
  if (searchIntent && !order) plan.push("product_search");
  if (recommend) plan.push("recommendation");
  if (order) plan.push("order_agent");
  if (support) plan.push("support");
  if (!plan.length) plan.push(mentionsProduct ? "product_search" : "support");
  return plan;
}

const COMPLEMENTS: Record<string, string> = {
  laptop: "mouse keyboard backpack monitor", computer: "mouse keyboard monitor", headphone: "power bank earbuds",
  earbud: "power bank smartwatch", phone: "power bank earbuds smartwatch", smartphone: "power bank earbuds",
  running: "yoga fitness smartwatch", shoe: "yoga smartwatch fitness", gym: "dumbbells yoga smartwatch",
  coffee: "air fryer cookware", kitchen: "cookware air fryer coffee", book: "book learning", tv: "home entertainment",
  skincare: "hair care beauty", yoga: "dumbbells fitness", keyboard: "mouse monitor",
};

// ---------- nodes ----------

const guardrail = node("guardrail", async (s, ctx) =>
  ctx.tracer.span(
    "guardrail",
    "input_safety_checks",
    async () => {
      const flags: string[] = [];
      let q = s.query;
      if (/ignore (all |any )?(previous|prior|above) instructions|reveal (the |your )?system prompt|you are now|jailbreak|developer mode/i.test(q)) flags.push("prompt_injection");
      if (/\b(?:\d[ -]?){13,16}\b/.test(q)) {
        flags.push("pii:card_number_masked");
        q = q.replace(/\b(?:\d[ -]?){13,16}\b/g, "[CARD REDACTED]");
      }
      if (/\b[6-9]\d{9}\b/.test(q)) {
        flags.push("pii:phone_masked");
        q = q.replace(/\b[6-9]\d{9}\b/g, "[PHONE REDACTED]");
      }
      if (/\b(otp|cvv|pin)\b\s*[:=]?\s*\d{3,6}/i.test(q)) {
        flags.push("pii:secret_masked");
        q = q.replace(/\b(otp|cvv|pin)\b\s*[:=]?\s*\d{3,6}/gi, "$1 [REDACTED]");
      }
      const passed = !flags.includes("prompt_injection");
      return { query: q, safety: { passed, flags } };
    },
    { input: { query: s.query }, output: (r) => r.safety },
  ),
);

const supervisor = node("supervisor", async (s, ctx) => {
  let { plan, entities, reasoning } = s;
  if (!s.planned) {
    const recent = s.history.slice(-4).map((t) => `${t.role}: ${t.content.slice(0, 200)}${t.productIds?.length ? ` [products shown: ${t.productIds.join(", ")}]` : ""}`).join("\n");
    const res = await callLlm(ctx.tracer, ctx.llm, {
      purpose: "supervisor.plan",
      messages: [
        new SystemMessage(
          `You are the supervisor of a multi-agent e-commerce assistant for "AgentKart" (an Indian online store, prices in INR).
Decide which specialist agents must run, in order, to answer the shopper. Available agents:
- product_search: find products in the catalog (semantic RAG search, filters by price/category)
- recommendation: suggest complementary or similar products, gifts, accessories
- order_agent: cart and order actions via MCP tools (add/remove items, view cart, apply coupon, checkout, track orders like AK-1001)
- support: policies and FAQs via RAG (returns, refunds, shipping, COD, warranty, EMI, coupons list, membership)
Categories: ${CATEGORIES.join(", ")}.
Respond with ONLY a JSON object:
{"plan": ["agent", ...], "entities": {"keywords": string, "category": string|null, "maxPrice": number|null, "orderId": string|null, "couponCode": string|null}, "reasoning": "one sentence"}
Use 1-3 agents. "keywords" should be the product search phrase without price words.`,
        ),
        new HumanMessage(`${recent ? `Recent conversation:\n${recent}\n\n` : ""}Shopper: ${s.query}`),
      ],
      simulate: () => {
        const p = heuristicPlan(s.query);
        return { content: JSON.stringify({ plan: p, entities: extractEntities(s.query), reasoning: `Intent rules matched: ${p.join(" → ")}` }) };
      },
    });
    const parsed = parseJson<{ plan?: string[]; entities?: Record<string, unknown>; reasoning?: string }>(res.content);
    const validPlan = (parsed?.plan ?? []).filter((a): a is AgentName => (AGENTS as readonly string[]).includes(a)).slice(0, 3);
    plan = validPlan.length ? [...new Set(validPlan)] : heuristicPlan(s.query);
    const e = parsed?.entities ?? {};
    const fallback = extractEntities(s.query);
    entities = {
      keywords: (e.keywords as string) || fallback.keywords,
      category: (e.category as string) || fallback.category,
      maxPrice: typeof e.maxPrice === "number" ? e.maxPrice : fallback.maxPrice,
      orderId: (e.orderId as string) || fallback.orderId,
      couponCode: (e.couponCode as string) || fallback.couponCode,
    };
    reasoning = parsed?.reasoning ?? "Fallback heuristic plan";
  }
  const next = plan.find((a) => !s.completed.includes(a)) ?? "synthesizer";
  return { planned: true, plan, entities, reasoning, next };
});

const productSearch = node("product_search", async (s, ctx) => {
  const q = s.entities.keywords || s.query;
  let r = await retrieve(ctx, "product_search", "products", q, { topK: 4, maxPrice: s.entities.maxPrice, category: s.entities.category });
  if (!r.hits.length && s.entities.category) r = await retrieve(ctx, "product_search", "products", q, { topK: 4, maxPrice: s.entities.maxPrice });
  const top = r.hits.slice(0, 3);
  const stock = await Promise.all(top.map((h) => mcpCall(ctx, "catalog__check_inventory", { productId: h.id })));
  const products = top.map((h, i) => {
    const p = productById(h.id)!;
    return { id: p.id, title: p.title, price: formatINR(p.price), mrp: formatINR(p.mrp), rating: p.rating, relevance: h.score, stock: stock[i] };
  });
  return {
    completed: ["product_search"],
    productIds: products.map((p) => p.id),
    findings: [{ agent: "product_search", summary: products.length ? `Found ${products.length} matching products` : "No matching products in catalog", data: products }],
  };
});

const recommendation = node("recommendation", async (s, ctx) => {
  const seeds = s.productIds.length ? s.productIds.slice(0, 2) : ctx.session.cart.length ? ctx.session.cart.map((c) => c.productId) : lastShownProducts(s.history).slice(0, 1);
  const seedTokens = seeds.flatMap((id) => productById(id)?.tags.flatMap(tokenize) ?? []);
  const complement = [...new Set(seedTokens.map((t) => COMPLEMENTS[t]).filter(Boolean))].join(" ");
  const q = complement || s.entities.keywords || s.query;
  const r = await retrieve(ctx, "recommendation", "products", q, { topK: 3, excludeIds: [...seeds, ...s.productIds], maxPrice: s.entities.maxPrice });
  const recs = r.hits.map((h) => {
    const p = productById(h.id)!;
    return { id: p.id, title: p.title, price: formatINR(p.price), rating: p.rating, why: seeds.length ? `pairs well with ${productById(seeds[0])?.title}` : "matches the request" };
  });
  return {
    completed: ["recommendation"],
    productIds: recs.map((r) => r.id),
    findings: [{ agent: "recommendation", summary: `Recommended ${recs.length} products (strategy: ${complement ? "complementary items" : "semantic similarity"})`, data: { seeds, recommendations: recs } }],
  };
});

const FILLER = new Set(["add", "cart", "it", "one", "first", "second", "item", "product", "put", "buy", "that", "those", "these", "them", "too", "basket", "quantity"]);

const orderAgent = node("order_agent", async (s, ctx) => {
  // MCP tool schemas → LLM function definitions (drop the $schema key that function-calling APIs reject).
  const tools = ctx.hub.tools.map((t) => {
    const parameters = { ...t.inputSchema };
    delete parameters.$schema;
    return { name: t.qualifiedName, description: `[${t.server}-mcp] ${t.description ?? ""}`, parameters };
  });
  const shown = [...new Set([...s.productIds, ...lastShownProducts(s.history)])];
  const cartDesc = ctx.session.cart.length ? ctx.session.cart.map((c) => `${c.productId} x${c.qty}`).join(", ") : "empty";
  const messages: BaseMessage[] = [
    new SystemMessage(
      `You are the Order & Cart agent of AgentKart. Fulfil the shopper's request by calling the MCP tools available to you.
Product ids look like p01..p24. Current cart: ${cartDesc}.
Products recently shown to the shopper (in order): ${shown.map((id) => `${id} = ${productById(id)?.title}`).join("; ") || "none"}.
If you need a product id and it is not listed above, call catalog__search_products first. Order ids look like AK-1001.
When finished, reply with a short plain-text summary of what you did (no tool call).`,
    ),
    new HumanMessage(s.query),
  ];

  const l = s.query.toLowerCase();
  const observations: { tool: string; args: Record<string, unknown>; result: unknown }[] = [];
  const called = (name: string) => observations.some((o) => o.tool === name);
  let callSeq = 0;
  const tc = (name: string, args: Record<string, unknown>): { toolCalls: ToolCall[] } => ({ toolCalls: [{ id: `sim_${++callSeq}`, name, args }] });

  // Scripted ReAct policy used when running without an LLM.
  const simulate = () => {
    const e = s.entities;
    const meaningful = tokenize(s.query).filter((t) => !FILLER.has(t)).join(" ");
    const wantsAdd = /\b(add|put|buy)\b/.test(l);
    const ordinal = /\bsecond\b/.test(l) ? 1 : /\bthird\b/.test(l) ? 2 : 0;
    if (e.orderId && !called("orders__track_order")) return tc("orders__track_order", { orderId: e.orderId });
    if (wantsAdd && !called("cart__add_to_cart")) {
      if (shown.length && (!meaningful || ordinal || /\b(it|that|first|second|third)\b/.test(l))) return tc("cart__add_to_cart", { productId: shown[ordinal] ?? shown[0], quantity: 1 });
      const found = observations.find((o) => o.tool === "catalog__search_products")?.result as { results?: { id: string }[] } | undefined;
      if (!found) return tc("catalog__search_products", { query: e.keywords || s.query, ...(e.maxPrice ? { maxPrice: e.maxPrice } : {}) });
      if (found.results?.length) return tc("cart__add_to_cart", { productId: found.results[0].id, quantity: 1 });
    }
    if (/\bremove\b/.test(l) && !called("cart__remove_from_cart")) {
      const target = ctx.session.cart.find((c) => tokenize(productById(c.productId)?.title ?? "").some((t) => meaningful.includes(t)));
      if (target) return tc("cart__remove_from_cart", { productId: target.productId });
    }
    if (e.couponCode && !called("cart__apply_coupon")) return tc("cart__apply_coupon", { code: e.couponCode });
    if (/checkout|check out|place (an |my |the )?order/.test(l) && !called("orders__place_order")) return tc("orders__place_order", { paymentMethod: /cod|cash/.test(l) ? "COD" : "UPI" });
    if (!observations.length) return tc("cart__view_cart", {});
    return { content: `Completed ${observations.length} MCP tool call(s): ${observations.map((o) => o.tool).join(", ")}.` };
  };

  let summary = "";
  for (let step = 0; step < 5; step++) {
    const res = await callLlm(ctx.tracer, ctx.llm, { purpose: `order_agent.react_step_${step + 1}`, messages, tools, simulate });
    if (!res.toolCalls.length) {
      summary = res.content;
      break;
    }
    messages.push(new AIMessage({ content: res.content, tool_calls: res.toolCalls.map((c) => ({ id: c.id, name: c.name, args: c.args, type: "tool_call" as const })) }));
    for (const call of res.toolCalls) {
      let result: unknown;
      try {
        result = await mcpCall(ctx, call.name, call.args);
      } catch (err) {
        result = { error: String(err) };
      }
      observations.push({ tool: call.name, args: call.args, result });
      messages.push(new ToolMessage({ tool_call_id: call.id, content: JSON.stringify(result) }));
    }
  }

  const added = observations.filter((o) => o.tool === "cart__add_to_cart").map((o) => o.args.productId as string);
  const searched = (observations.find((o) => o.tool === "catalog__search_products")?.result as { results?: { id: string }[] })?.results?.map((r) => r.id) ?? [];
  return {
    completed: ["order_agent"],
    productIds: added.length ? added : searched.slice(0, 3),
    findings: [{ agent: "order_agent", summary: summary || `Executed ${observations.length} tool calls`, data: { actions: observations, cartAfter: ctx.session.cart } }],
  };
});

const support = node("support", async (s, ctx) => {
  const r = await retrieve(ctx, "support", "knowledge", s.query, { topK: 3 });
  return {
    completed: ["support"],
    findings: [{ agent: "support", summary: `Retrieved ${r.hits.length} knowledge base articles`, data: r.hits.map((h) => ({ source: h.id, title: h.title, relevance: h.score, text: h.snippet })) }],
  };
});

function templateAnswer(s: S) {
  const parts: string[] = [];
  for (const f of s.findings) {
    if (f.agent === "product_search" || f.agent === "recommendation") {
      const items = (f.agent === "product_search" ? f.data : (f.data as { recommendations: unknown[] }).recommendations) as { title: string; price: string; rating: number }[];
      if (!items.length) parts.push("I couldn't find a matching product — try different keywords or a higher budget.");
      else parts.push((f.agent === "product_search" ? "Here's what I found:" : "You might also like:") + "\n" + items.map((p) => `- **${p.title}** — ${p.price} (★ ${p.rating})`).join("\n"));
    } else if (f.agent === "support") {
      const hits = f.data as { source: string; title: string; text: string }[];
      if (hits[0]) parts.push(`**${hits[0].title}:** ${hits[0].text} [${hits[0].source}]`);
    } else if (f.agent === "order_agent") {
      const { actions } = f.data as { actions: { tool: string; result: Record<string, unknown> }[] };
      for (const a of actions) {
        const r = a.result ?? {};
        if (a.tool === "cart__add_to_cart" && r.ok) parts.push(`✅ Added to your cart. Cart total: ${(r.cart as { display: string }).display}`);
        else if (a.tool === "cart__view_cart") parts.push(`🛒 Your cart has ${(r.items as unknown[]).length} item(s), total ${r.display}.`);
        else if (a.tool === "cart__remove_from_cart") parts.push(r.ok ? "🗑️ Removed from your cart." : "That item wasn't in your cart.");
        else if (a.tool === "cart__apply_coupon") parts.push(r.ok ? `🏷️ Coupon ${r.applied} applied — new total ${(r.cart as { display: string }).display}.` : `⚠️ ${r.error}`);
        else if (a.tool === "orders__track_order") parts.push(r.error ? `⚠️ ${r.error}` : `📦 Order ${r.orderId}: **${r.status}** — ${r.eta}.`);
        else if (a.tool === "orders__place_order") parts.push(r.ok ? `🎉 Order **${r.orderId}** placed via ${r.paymentMethod} for ${r.display}.` : `⚠️ ${r.error}`);
      }
    }
  }
  return parts.join("\n\n") || "How can I help you shop today?";
}

const synthesizer = node("synthesizer", async (s, ctx) => {
  if (!s.safety.passed) {
    return { answer: "⚠️ I can't follow that instruction. I'm the AgentKart shopping assistant — I can help you find products, manage your cart, track orders and answer store policy questions." };
  }
  const res = await callLlm(ctx.tracer, ctx.llm, {
    purpose: "synthesizer.compose",
    messages: [
      new SystemMessage(
        `You are AgentKart's friendly shopping assistant. Write the final reply to the shopper using ONLY the findings from the specialist agents.
Rules: prices in ₹ exactly as given; never invent products, prices, orders or policies; under 130 words; use short markdown bullets with **bold** product names when listing products;
cite knowledge base articles inline like [KB-03] when you use them; if an action failed, say so plainly.`,
      ),
      new HumanMessage(`Shopper: ${s.query}\n\nAgent findings:\n${JSON.stringify(s.findings, null, 1).slice(0, 6000)}`),
    ],
    simulate: () => ({ content: templateAnswer(s) }),
  });
  return { answer: res.content.trim() || templateAnswer(s) };
});

export const workflow = new StateGraph(State)
  .addNode("guardrail", guardrail)
  .addNode("supervisor", supervisor)
  .addNode("product_search", productSearch)
  .addNode("recommendation", recommendation)
  .addNode("order_agent", orderAgent)
  .addNode("support", support)
  .addNode("synthesizer", synthesizer)
  .addEdge(START, "guardrail")
  .addConditionalEdges("guardrail", (s: S) => (s.safety.passed ? "supervisor" : "synthesizer"), ["supervisor", "synthesizer"])
  .addConditionalEdges("supervisor", (s: S) => s.next, [...AGENTS, "synthesizer"])
  .addEdge("product_search", "supervisor")
  .addEdge("recommendation", "supervisor")
  .addEdge("order_agent", "supervisor")
  .addEdge("support", "supervisor")
  .addEdge("synthesizer", END)
  .compile();

export type WorkflowState = S;
