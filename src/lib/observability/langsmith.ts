// LangSmith integration. Configured entirely from server-side env vars (never exposed to
// the browser). When LANGSMITH_TRACING=true, LangChain/LangGraph auto-trace every graph
// node and Groq call; MCP tool calls and RAG retrievals are added via `traceable`.

import { Client } from "langsmith";
import { awaitAllCallbacks } from "@langchain/core/callbacks/promises";
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

export const langsmithEnabled = () => process.env.LANGSMITH_TRACING === "true" && Boolean(process.env.LANGSMITH_API_KEY);
export const langsmithProject = () => process.env.LANGSMITH_PROJECT || "default";

let client: Client | null = null;
const getClient = () => (client ??= new Client());

let projectId: string | null = null;

// Explicit tracer bound to our client, so flushTraces() waits on the right batch queue.
// (LangChain skips its default env tracer when one is already supplied.)
export const langsmithCallbacks = () => (langsmithEnabled() ? [new LangChainTracer({ client: getClient(), projectName: langsmithProject() })] : []);

// Waits until all trace batches for this request have been sent. Serverless functions
// can freeze as soon as the response ends, which would drop traces still in the queue.
export async function flushTraces() {
  if (!langsmithEnabled()) return;
  await awaitAllCallbacks();
  await getClient().awaitPendingTraceBatches();
}

// Deep link to the trace in the LangSmith UI, or null if it can't be resolved yet.
export async function langsmithTraceUrl(runId: string): Promise<string | null> {
  if (!langsmithEnabled()) return null;
  try {
    projectId ??= (await getClient().readProject({ projectName: langsmithProject() })).id;
    const res = await getClient().runs.getURL(runId, { project_id: projectId, trace_id: runId });
    return res.url ?? null;
  } catch (err) {
    console.error("[langsmith] could not resolve trace URL:", String(err).slice(0, 200));
    return null;
  }
}
