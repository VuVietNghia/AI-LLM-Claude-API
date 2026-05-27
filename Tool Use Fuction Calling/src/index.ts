import "dotenv/config";
import { ToolRegistry } from "./ToolRegistry";
import { ClaudeToolAgent } from "./ClaudeToolAgent";
import { registerAllTools } from "./tools/toolDefinitions";

// ============================================================
// INDEX — Entry Point
// ============================================================

async function main(): Promise<void> {
  console.log("\n" + "🚀".repeat(30));
  console.log("  TOOL USE / FUNCTION CALLING — All Examples");
  console.log("  Bridge to MCP Protocol");
  console.log("🚀".repeat(30) + "\n");

  console.log("✅ Xem từng example chi tiết với:");
  console.log("   npm run example:basic-tool    → Basic Tool Use");
  console.log("   npm run example:multi-tool    → Parallel Tool Calls");
  console.log("   npm run example:validation    → Input Validation (Zod)");
  console.log("   npm run example:error-handling → Error Handling");
  console.log("   npm run example:agent-loop    → Agentic Loop\n");

  // Quick demo
  console.log("─".repeat(60));
  console.log("⚡ Quick Demo — Agentic Loop:");

  const registry = new ToolRegistry();
  registerAllTools(registry);

  const agent = new ClaudeToolAgent(registry, {
    model: "claude-haiku-3-5",
    maxTokens: 512,
    maxIterations: 5,
  });

  const result = await agent.run("Thời tiết Hà Nội hôm nay và tính 12 * 12");

  console.log(`\n✅ Final: ${result.finalResponse}`);
  console.log(`📊 Tools called: ${result.toolCallsCount} | Iterations: ${result.iterations}`);
}

main().catch(console.error);
