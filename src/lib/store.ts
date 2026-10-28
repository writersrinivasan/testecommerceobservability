"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, ChatTurn, StreamEvent } from "./types";

export interface ChatMessage extends ChatTurn {
  id: string;
  runId?: string;
  pending?: boolean;
}

export interface Run {
  id: string;
  query: string;
  createdAt: number;
  events: StreamEvent[];
  done: boolean;
}

interface AppState {
  cart: CartItem[];
  messages: ChatMessage[];
  runs: Record<string, Run>;
  runOrder: string[];
  activeRunId?: string;
  chatOpen: boolean;
  busy: boolean;
  groqKey: string;
  groqModel: string;
  keyDialogOpen: boolean;
  setGroq: (key: string, model: string) => void;
  setKeyDialogOpen: (open: boolean) => void;
  addToCart: (productId: string, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  setChatOpen: (open: boolean) => void;
  setActiveRun: (id: string) => void;
  clearChat: () => void;
  send: (text: string) => Promise<void>;
}

export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export function groqHeaders(key: string, model: string): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (key) {
    h["x-groq-api-key"] = key;
    h["x-groq-model"] = model || DEFAULT_GROQ_MODEL;
  }
  return h;
}

let counter = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${++counter}`;

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      cart: [],
      messages: [],
      runs: {},
      runOrder: [],
      chatOpen: false,
      busy: false,
      groqKey: "",
      groqModel: DEFAULT_GROQ_MODEL,
      keyDialogOpen: false,
      setGroq: (groqKey, groqModel) => set({ groqKey, groqModel }),
      setKeyDialogOpen: (keyDialogOpen) => set({ keyDialogOpen }),

      addToCart: (productId, qty = 1) =>
        set((s) => {
          const existing = s.cart.find((i) => i.productId === productId);
          return {
            cart: existing
              ? s.cart.map((i) => (i.productId === productId ? { ...i, qty: i.qty + qty } : i))
              : [...s.cart, { productId, qty }],
          };
        }),
      setQty: (productId, qty) =>
        set((s) => ({ cart: qty <= 0 ? s.cart.filter((i) => i.productId !== productId) : s.cart.map((i) => (i.productId === productId ? { ...i, qty } : i)) })),
      removeFromCart: (productId) => set((s) => ({ cart: s.cart.filter((i) => i.productId !== productId) })),
      setChatOpen: (chatOpen) => set({ chatOpen }),
      setActiveRun: (activeRunId) => set({ activeRunId }),
      clearChat: () => set({ messages: [] }),

      send: async (text) => {
        if (get().busy || !text.trim()) return;
        const runId = uid("run");
        const assistantId = uid("msg");
        const history: ChatTurn[] = get().messages.filter((m) => !m.pending).map(({ role, content, productIds }) => ({ role, content, productIds }));
        set((s) => ({
          busy: true,
          activeRunId: runId,
          runOrder: [runId, ...s.runOrder].slice(0, 30),
          runs: { ...s.runs, [runId]: { id: runId, query: text, createdAt: Date.now(), events: [], done: false } },
          messages: [...s.messages, { id: uid("msg"), role: "user", content: text }, { id: assistantId, role: "assistant", content: "", pending: true, runId }],
        }));

        const push = (e: StreamEvent) => {
          set((s) => {
            const run = s.runs[runId];
            const patch: Partial<AppState> = { runs: { ...s.runs, [runId]: { ...run, events: [...run.events, e], done: run.done || e.type === "final" || e.type === "error" } } };
            if (e.type === "final") {
              patch.cart = e.cart;
              patch.messages = s.messages.map((m) => (m.id === assistantId ? { ...m, content: e.answer, productIds: e.productIds, pending: false } : m));
            } else if (e.type === "error") {
              patch.messages = s.messages.map((m) => (m.id === assistantId ? { ...m, content: `⚠️ Something went wrong: ${e.message}`, pending: false } : m));
            }
            return patch;
          });
        };

        try {
          const res = await fetch("/api/agent", {
            method: "POST",
            headers: groqHeaders(get().groqKey, get().groqModel),
            body: JSON.stringify({ message: text, history, cart: get().cart }),
          });
          if (!res.body) throw new Error(`HTTP ${res.status}`);
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const frames = buffer.split("\n\n");
            buffer = frames.pop() ?? "";
            for (const f of frames) if (f.startsWith("data: ")) push(JSON.parse(f.slice(6)));
          }
        } catch (err) {
          push({ type: "error", message: String(err), ts: Date.now() });
        } finally {
          set({ busy: false });
        }
      },
    }),
    {
      name: "agentkart",
      // The BYOK key lives only in this browser's localStorage and is sent per request.
      partialize: (s) => ({ cart: s.cart, groqKey: s.groqKey, groqModel: s.groqModel }),
    },
  ),
);

export const cartCount = (cart: CartItem[]) => cart.reduce((n, i) => n + i.qty, 0);
