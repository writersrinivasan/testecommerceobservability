import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentKart — Agentic AI Commerce Demo",
  description: "An e-commerce demo powered by a LangGraph multi-agent workflow, MCP tools and a RAG layer, with live observability.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
