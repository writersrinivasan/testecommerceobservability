// MCP layer: three real Model Context Protocol servers (catalog, cart, orders) built with
// the official SDK. Each is connected to its own MCP client over an in-memory transport,
// and every JSON-RPC frame on the wire is captured so the observatory can display it.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { PRODUCTS, productById, formatINR } from "@/lib/data/products";
import { tokenize } from "@/lib/rag/vectorStore";
import type { CartItem, McpLogEntry } from "@/lib/types";

export interface Session {
  cart: CartItem[];
  coupon?: { code: string; discount: number };
  lastOrderId?: string;
}

const COUPONS: Record<string, { desc: string; calc: (cart: CartItem[]) => number }> = {
  WELCOME200: { desc: "₹200 off orders above ₹999", calc: (c) => (cartTotal(c) >= 999 ? 200 : 0) },
  SAVE10: {
    desc: "10% off electronics (max ₹1,000)",
    calc: (c) => Math.min(1000, Math.round(0.1 * cartTotal(c.filter((i) => ["Electronics", "Mobiles", "Computers"].includes(productById(i.productId)?.category ?? ""))))),
  },
  AGENTIC25: { desc: "25% off books", calc: (c) => Math.round(0.25 * cartTotal(c.filter((i) => productById(i.productId)?.category === "Books"))) },
};

const ORDERS: Record<string, { status: string; items: string[]; eta: string; history: string[] }> = {
  "AK-1001": { status: "Shipped", items: ["p01"], eta: "Arriving tomorrow by 9 PM", history: ["Ordered 24 Oct", "Packed 25 Oct", "Shipped from Bengaluru FC 26 Oct"] },
  "AK-1002": { status: "Delivered", items: ["p19", "p20"], eta: "Delivered on 22 Oct", history: ["Ordered 19 Oct", "Shipped 20 Oct", "Delivered 22 Oct"] },
  "AK-1003": { status: "Processing", items: ["p16"], eta: "Expected 31 Oct", history: ["Ordered 27 Oct", "Payment confirmed"] },
};

const WAREHOUSES = ["Bengaluru FC", "Chennai FC", "Mumbai FC", "Delhi NCR FC", "Hyderabad FC"];

function cartTotal(cart: CartItem[]) {
  return cart.reduce((s, i) => s + (productById(i.productId)?.price ?? 0) * i.qty, 0);
}

function cartView(s: Session) {
  const items = s.cart.map((i) => {
    const p = productById(i.productId)!;
    return { productId: p.id, title: p.title, qty: i.qty, unitPrice: p.price, lineTotal: p.price * i.qty };
  });
  const subtotal = cartTotal(s.cart);
  const discount = s.coupon ? COUPONS[s.coupon.code]?.calc(s.cart) ?? 0 : 0;
  return { items, subtotal, coupon: s.coupon?.code ?? null, discount, total: subtotal - discount, display: formatINR(subtotal - discount) };
}

const json = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data) }] });

function catalogServer() {
  const server = new McpServer({ name: "catalog-mcp", version: "1.0.0" });
  server.registerTool(
    "search_products",
    {
      description: "Keyword search over the product catalog. Returns product ids, titles and prices.",
      inputSchema: { query: z.string().describe("Search keywords"), maxPrice: z.number().optional().describe("Maximum price in INR") },
    },
    async ({ query, maxPrice }) => {
      const q = new Set(tokenize(query));
      const results = PRODUCTS.map((p) => ({ p, score: tokenize(`${p.title} ${p.tags.join(" ")} ${p.category}`).filter((t) => q.has(t)).length }))
        .filter((r) => r.score > 0 && (maxPrice == null || r.p.price <= maxPrice))
        .sort((a, b) => b.score - a.score || b.p.rating - a.p.rating)
        .slice(0, 5)
        .map(({ p }) => ({ id: p.id, title: p.title, price: p.price, rating: p.rating }));
      return json({ results });
    },
  );
  server.registerTool(
    "get_product",
    { description: "Get full details of a product by id (e.g. p01).", inputSchema: { productId: z.string() } },
    async ({ productId }) => json(productById(productId) ?? { error: `Unknown product ${productId}` }),
  );
  server.registerTool(
    "check_inventory",
    { description: "Check live stock level, fulfilment centre and delivery promise for a product.", inputSchema: { productId: z.string() } },
    async ({ productId }) => {
      const p = productById(productId);
      if (!p) return json({ error: `Unknown product ${productId}` });
      const n = parseInt(productId.slice(1), 10);
      const stock = (n * 37) % 60;
      return json({ productId, inStock: stock > 0, units: stock, warehouse: WAREHOUSES[n % WAREHOUSES.length], delivery: p.express ? "Tomorrow (Kart Express)" : "In 3-5 days" });
    },
  );
  return server;
}

function cartServer(s: Session) {
  const server = new McpServer({ name: "cart-mcp", version: "1.0.0" });
  server.registerTool("view_cart", { description: "View the shopper's current cart with totals.", inputSchema: {} }, async () => json(cartView(s)));
  server.registerTool(
    "add_to_cart",
    { description: "Add a product to the cart by product id.", inputSchema: { productId: z.string(), quantity: z.number().int().min(1).default(1) } },
    async ({ productId, quantity }) => {
      if (!productById(productId)) return json({ error: `Unknown product ${productId}` });
      const existing = s.cart.find((i) => i.productId === productId);
      if (existing) existing.qty += quantity ?? 1;
      else s.cart.push({ productId, qty: quantity ?? 1 });
      return json({ ok: true, added: productId, cart: cartView(s) });
    },
  );
  server.registerTool(
    "remove_from_cart",
    { description: "Remove a product from the cart by product id.", inputSchema: { productId: z.string() } },
    async ({ productId }) => {
      const before = s.cart.length;
      s.cart = s.cart.filter((i) => i.productId !== productId);
      return json({ ok: s.cart.length < before, cart: cartView(s) });
    },
  );
  server.registerTool(
    "apply_coupon",
    { description: "Apply a coupon code to the cart.", inputSchema: { code: z.string() } },
    async ({ code }) => {
      const c = COUPONS[code.toUpperCase()];
      if (!c) return json({ ok: false, error: `Coupon ${code} is invalid or expired`, validCodes: Object.keys(COUPONS) });
      const discount = c.calc(s.cart);
      if (discount <= 0) return json({ ok: false, error: `Cart is not eligible for ${code.toUpperCase()}: ${c.desc}` });
      s.coupon = { code: code.toUpperCase(), discount };
      return json({ ok: true, applied: code.toUpperCase(), description: c.desc, cart: cartView(s) });
    },
  );
  return server;
}

function ordersServer(s: Session) {
  const server = new McpServer({ name: "orders-mcp", version: "1.0.0" });
  server.registerTool(
    "track_order",
    { description: "Track an order by order id such as AK-1001.", inputSchema: { orderId: z.string() } },
    async ({ orderId }) => {
      const o = ORDERS[orderId.toUpperCase()];
      return json(o ? { orderId: orderId.toUpperCase(), ...o, items: o.items.map((id) => productById(id)?.title) } : { error: `Order ${orderId} not found` });
    },
  );
  server.registerTool(
    "place_order",
    { description: "Place an order for everything currently in the cart (checkout).", inputSchema: { paymentMethod: z.enum(["UPI", "Card", "COD"]).default("UPI") } },
    async ({ paymentMethod }) => {
      if (!s.cart.length) return json({ ok: false, error: "Cart is empty" });
      const view = cartView(s);
      const orderId = `AK-${2000 + Math.floor(Math.random() * 7000)}`;
      ORDERS[orderId] = { status: "Processing", items: s.cart.map((i) => i.productId), eta: "Expected in 2-4 days", history: ["Ordered just now"] };
      s.cart = [];
      s.coupon = undefined;
      s.lastOrderId = orderId;
      return json({ ok: true, orderId, paymentMethod, amountCharged: view.total, display: view.display });
    },
  );
  server.registerTool(
    "get_shipping_estimate",
    { description: "Estimate delivery time to an Indian pincode.", inputSchema: { pincode: z.string() } },
    async ({ pincode }) => {
      const metro = /^(11|40|56|60|50|70)/.test(pincode);
      return json({ pincode, sameDayEligible: metro, standard: metro ? "1-2 days" : "3-5 days" });
    },
  );
  return server;
}

export const MCP_SERVERS = ["catalog", "cart", "orders"] as const;
export type McpServerName = (typeof MCP_SERVERS)[number];

export interface McpToolInfo {
  server: McpServerName;
  name: string;
  qualifiedName: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

export class McpHub {
  private clients = new Map<McpServerName, Client>();
  tools: McpToolInfo[] = [];
  private seq = 0;

  constructor(private session: Session, private onMessage: (e: McpLogEntry) => void = () => {}) {}

  private tap(server: McpServerName, transport: InMemoryTransport, direction: McpLogEntry["direction"]) {
    const send = transport.send.bind(transport);
    transport.send = async (message, options) => {
      const m = message as { method?: string };
      this.onMessage({ seq: ++this.seq, ts: Date.now(), server, direction, method: m.method, payload: message });
      return send(message, options);
    };
  }

  async connect() {
    const factories: Record<McpServerName, () => McpServer> = {
      catalog: catalogServer,
      cart: () => cartServer(this.session),
      orders: () => ordersServer(this.session),
    };
    for (const name of MCP_SERVERS) {
      const [clientT, serverT] = InMemoryTransport.createLinkedPair();
      this.tap(name, clientT, "client→server");
      this.tap(name, serverT, "server→client");
      await factories[name]().connect(serverT);
      const client = new Client({ name: "agentkart-agent", version: "1.0.0" });
      await client.connect(clientT);
      this.clients.set(name, client);
      const { tools } = await client.listTools();
      for (const t of tools)
        this.tools.push({ server: name, name: t.name, qualifiedName: `${name}__${t.name}`, description: t.description, inputSchema: t.inputSchema as Record<string, unknown> });
    }
    return this;
  }

  async call(qualifiedName: string, args: Record<string, unknown>) {
    const [server, tool] = qualifiedName.split("__") as [McpServerName, string];
    const client = this.clients.get(server);
    if (!client) throw new Error(`No MCP server for ${qualifiedName}`);
    const res = await client.callTool({ name: tool, arguments: args });
    const text = (res.content as { type: string; text?: string }[]).map((c) => c.text ?? "").join("");
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  async close() {
    await Promise.all([...this.clients.values()].map((c) => c.close().catch(() => {})));
  }
}
