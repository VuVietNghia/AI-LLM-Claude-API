import "dotenv/config";
import { AnthropicClient } from "./AnthropicClient";
import type { IAIClient } from "./types";

// ============================================================
// INDEX — Chạy tất cả examples
// ============================================================

async function runAllExamples(): Promise<void> {
  console.log("\n" + "🚀".repeat(30));
  console.log("  ANTHROPIC SDK — All Examples");
  console.log("  Dependency Injection Pattern");
  console.log("🚀".repeat(30) + "\n");

  // ─── Inject dependency ────────────────────────────────────
  // Đây là điểm duy nhất bạn cần thay đổi để switch model:
  const defaultClient: IAIClient = new AnthropicClient({
    model: "claude-haiku-3-5", // ← đổi model tại đây
    maxTokens: 512,
  });

  console.log("\n✅ Xem từng example chi tiết với:");
  console.log("   npm run example:basic     → Basic Messages API");
  console.log("   npm run example:streaming → Streaming SSE");
  console.log("   npm run example:multiturn → Multi-Turn Conversations");
  console.log("   npm run example:system    → System Prompts");
  console.log("   npm run example:tokens    → Token Counting\n");

  // Quick demo
  console.log("─".repeat(60));
  console.log("⚡ Quick Demo (streaming):");
  process.stdout.write("🤖 Claude: ");

  await defaultClient.sendMessageStream(
    "In one sentence, what is the Anthropic Claude API?",
    (chunk) => process.stdout.write(chunk)
  );
  console.log("\n");
}

runAllExamples().catch(console.error);
