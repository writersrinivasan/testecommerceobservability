// Minimal OpenTelemetry-style tracer. Spans nest automatically via AsyncLocalStorage
// and every event is streamed to the browser so the observatory can render it live.

import { AsyncLocalStorage } from "node:async_hooks";
import type { RunMetrics, Span, SpanKind, StreamEvent } from "@/lib/types";

// Rough Groq on-demand pricing (USD per 1M tokens) used for the cost estimate tile.
const PRICE_IN = 0.59;
const PRICE_OUT = 0.79;

export class Tracer {
  private als = new AsyncLocalStorage<string>();
  private seq = 0;
  readonly startedAt = Date.now();
  metrics = { llmCalls: 0, tokensIn: 0, tokensOut: 0, mcpCalls: 0, ragQueries: 0, nodesVisited: 0 };

  constructor(readonly runId: string, private emitFn: (e: StreamEvent) => void) {}

  emit(e: StreamEvent) {
    this.emitFn(e);
  }

  get currentSpanId() {
    return this.als.getStore();
  }

  async span<T>(
    kind: SpanKind,
    name: string,
    fn: (spanId: string) => Promise<T>,
    opts: { input?: unknown; meta?: Record<string, unknown>; output?: (r: T) => unknown; endMeta?: (r: T) => Record<string, unknown> } = {},
  ): Promise<T> {
    const id = `${this.runId}-s${++this.seq}`;
    const span: Span = { id, parentId: this.currentSpanId, kind, name, startedAt: Date.now(), status: "running", input: opts.input, meta: opts.meta };
    this.emit({ type: "span_start", span });
    if (kind === "node") this.metrics.nodesVisited++;
    try {
      const result = await this.als.run(id, () => fn(id));
      this.emit({ type: "span_end", id, endedAt: Date.now(), status: "ok", output: opts.output ? opts.output(result) : undefined, meta: opts.endMeta?.(result) });
      return result;
    } catch (err) {
      this.emit({ type: "span_end", id, endedAt: Date.now(), status: "error", output: { error: String(err) } });
      throw err;
    }
  }

  summary(): RunMetrics {
    const m = this.metrics;
    return {
      ...m,
      latencyMs: Date.now() - this.startedAt,
      estCostUsd: +((m.tokensIn * PRICE_IN + m.tokensOut * PRICE_OUT) / 1e6).toFixed(6),
    };
  }
}
