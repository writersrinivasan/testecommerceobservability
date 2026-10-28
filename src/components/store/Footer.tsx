export default function Footer() {
  return (
    <footer className="mt-10 text-white text-sm">
      <a href="#" className="block bg-kart-navy3 hover:bg-[#485769] text-center py-4">Back to top</a>
      <div className="bg-kart-navy2 grid grid-cols-2 md:grid-cols-4 gap-6 px-8 md:px-24 py-10">
        {[
          ["Get to Know Us", ["About AgentKart", "Careers", "Press Releases", "AgentKart Science"]],
          ["Under the Hood", ["LangGraph Orchestration", "MCP Tool Servers", "RAG Knowledge Layer", "Groq LPU Inference"]],
          ["Let Us Help You", ["Your Account", "Returns Centre", "100% Purchase Protection", "Help"]],
          ["Demo", ["Agentic AI & Observability", "Workflow Management", "Built with Next.js", "For educational use"]],
        ].map(([title, links]) => (
          <div key={title as string}>
            <h4 className="font-bold mb-2">{title}</h4>
            <ul className="space-y-1.5 text-gray-300">
              {(links as string[]).map((l) => (
                <li key={l} className="hover:underline cursor-pointer">{l}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="bg-kart-navy text-center text-xs text-gray-400 py-6">
        <span className="font-bold text-white">agent<span className="text-kart-orange">kart</span></span> · A fictional store for demonstrating agentic AI. No real orders are placed.
      </div>
    </footer>
  );
}
