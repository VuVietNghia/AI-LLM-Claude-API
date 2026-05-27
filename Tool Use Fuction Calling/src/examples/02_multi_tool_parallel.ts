import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { ToolRegistry } from "../ToolRegistry";
import { registerAllTools } from "../tools/toolDefinitions";

// ============================================================
// EXAMPLE 2 — Parallel Tool Use (Multiple Tools in 1 Response)
// ============================================================
//
// Khái niệm: Parallel Tool Calls
//
// Claude có thể gọi NHIỀU tools trong MỘT response khi:
//   - Các tools độc lập với nhau (không phụ thuộc vào kết quả của nhau)
//   - Claude nhận ra có thể lấy nhiều thông tin cùng lúc
//
// Ví dụ: "So sánh thời tiết Hà Nội và TP HCM"
//   → Claude sẽ gọi ĐỒNG THỜI:
//     - get_weather({ city: "Hanoi" })
//     - get_weather({ city: "Ho Chi Minh City" })
//   → Chờ cả 2 kết quả
//   → Compose câu trả lời so sánh
//
// Lợi ích: Giảm latency — 2 API calls cùng lúc thay vì tuần tự
//
// ============================================================

async function runParallelToolUse(): Promise<void> {
  console.log("=".repeat(60));
  console.log("⚡ EXAMPLE 2: Parallel Tool Use");
  console.log("=".repeat(60));

  const sdk = new Anthropic();
  const registry = new ToolRegistry();
  registerAllTools(registry);

  // ----------------------------------------------------------
  // Low-level API call để thấy rõ parallel tool calls
  // ----------------------------------------------------------
  const userMessage = "So sánh thời tiết giữa Hà Nội và TP Hồ Chí Minh hiện tại. Đồng thời tính tổng 123 + 456.";

  console.log(`\n📝 User: ${userMessage}`);
  console.log("\n[Round 1] Calling Claude...");

  // Round 1: Claude xác định cần gọi tools
  const round1 = await sdk.messages.create({
    model: "claude-haiku-3-5",
    max_tokens: 1024,
    tools: registry.getDefinitions() as Anthropic.Tool[],
    messages: [{ role: "user", content: userMessage }],
  });

  console.log(`  stop_reason: "${round1.stop_reason}"`);
  console.log(`  Content blocks: ${round1.content.length}`);

  if (round1.stop_reason !== "tool_use") {
    console.log("  Claude answered directly (no tools needed).");
    const text = round1.content.find((b) => b.type === "text");
    if (text?.type === "text") console.log(`  Response: ${text.text}`);
    return;
  }

  // Lọc ra tool_use blocks
  const toolUseBlocks = round1.content.filter(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );

  console.log(`\n🔧 Claude wants to call ${toolUseBlocks.length} tool(s) in PARALLEL:`);
  toolUseBlocks.forEach((b, i) =>
    console.log(`   [${i + 1}] ${b.name}(${JSON.stringify(b.input)})`),
  );

  // Execute tools — có thể chạy PARALLEL bằng Promise.all
  const startTime = Date.now();
  console.log("\n⚡ Executing tools in parallel...");

  const toolResults = await Promise.all(
    toolUseBlocks.map(async (block) => {
      const result = await registry.execute({
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      });
      return {
        type: "tool_result" as const,
        tool_use_id: result.tool_use_id,
        content: result.content,
        ...(result.is_error !== undefined && { is_error: result.is_error }),
      };
    }),
  );

  const elapsed = Date.now() - startTime;
  console.log(`  ✅ All tools done in ${elapsed}ms (parallel)`);

  // Round 2: Gửi tool results → Claude compose câu trả lời
  console.log("\n[Round 2] Sending results back to Claude...");

  const round2 = await sdk.messages.create({
    model: "claude-haiku-3-5",
    max_tokens: 1024,
    tools: registry.getDefinitions() as Anthropic.Tool[],
    messages: [
      { role: "user", content: userMessage },
      { role: "assistant", content: round1.content },
      { role: "user", content: toolResults },
    ],
  });

  const finalText = round2.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  console.log(`\n✅ Final Response:\n${finalText}`);
  console.log(`\n📊 Total tokens: ${round1.usage.input_tokens + round2.usage.input_tokens} in`);
}

runParallelToolUse().catch(console.error);
