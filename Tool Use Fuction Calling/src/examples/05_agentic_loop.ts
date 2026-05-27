import "dotenv/config";
import { ToolRegistry } from "../ToolRegistry";
import { ClaudeToolAgent } from "../ClaudeToolAgent";
import { registerAllTools } from "../tools/toolDefinitions";

// ============================================================
// EXAMPLE 5 — Agentic Loop (Multi-Step Reasoning)
// ============================================================
//
// Khái niệm: Agentic Loop
//
// "Agentic" = Claude tự quyết định cần làm gì để hoàn thành task.
//
// Không phải 1 lần gọi tool, mà là CHUỖI các bước:
//
//   User: "Tìm sách TypeScript rẻ nhất và tính tổng giá 3 cuốn đầu"
//
//   Bước 1: search_database({ query: "TypeScript", sort_by: "price_asc" })
//   Bước 2: Đọc kết quả... (3 cuốn: $30, $35, $45)
//   Bước 3: calculate({ operation: "add", a: 30, b: 35 })
//   Bước 4: calculate({ operation: "add", a: 65, b: 45 })
//   Bước 5: "Tổng giá 3 cuốn sách TypeScript rẻ nhất là $110"
//
// Mỗi bước Claude tự suy luận dựa trên kết quả trước.
// ClaudeToolAgent.run() xử lý toàn bộ vòng lặp này tự động.
//
// Cầu nối với MCP (Model Context Protocol):
//   Tool Use là nền tảng của MCP. MCP mở rộng khả năng này:
//   - Tools không chỉ là functions mà còn là resources, prompts
//   - MCP Server đăng ký tools → Claude tự khám phá
//   - Giao tiếp qua stdio hoặc HTTP/SSE
//
// ============================================================

async function runAgenticLoop(): Promise<void> {
  console.log("=".repeat(60));
  console.log("🤖 EXAMPLE 5: Agentic Loop (Multi-Step Reasoning)");
  console.log("=".repeat(60));

  const registry = new ToolRegistry();
  registerAllTools(registry);

  const agent = new ClaudeToolAgent(registry, {
    model: "claude-haiku-3-5",
    maxTokens: 2048,
    maxIterations: 10,
    systemPrompt: `Bạn là trợ lý AI thông minh với khả năng sử dụng tools.
Khi giải quyết bài toán phức tạp, hãy chia thành các bước nhỏ và sử dụng tools phù hợp.
Luôn giải thích từng bước bạn thực hiện.`,
  });

  // ----------------------------------------------------------
  // Test Case 1: Multi-step calculation
  // ----------------------------------------------------------
  console.log("\n🔵 Test Case 1: Multi-step calculation");
  console.log("─".repeat(50));

  try {
    const result1 = await agent.run(
      "Tính (2^8 + 3^4) * sqrt(144). Giải thích từng bước tính.",
    );

    console.log(`\n📊 Stats:`);
    console.log(`   Tool calls: ${result1.toolCallsCount}`);
    console.log(`   Iterations: ${result1.iterations}`);
    console.log(`   Total tokens: ${result1.totalInputTokens + result1.totalOutputTokens}`);
    console.log(`\n💬 Answer:\n${result1.finalResponse}`);
  } catch (err) {
    console.error(`❌ Error: ${err}`);
  }

  // ----------------------------------------------------------
  // Test Case 2: Research + Calculate (multi-domain)
  // ----------------------------------------------------------
  console.log("\n\n🟢 Test Case 2: Search + Calculate kết hợp");
  console.log("─".repeat(50));

  try {
    const result2 = await agent.run(
      "Tìm tất cả sách trong database, rồi tính tổng số tiền nếu mua hết. " +
      "Sau đó cho biết cuốn nào đắt nhất.",
    );

    console.log(`\n📊 Stats:`);
    console.log(`   Tool calls: ${result2.toolCallsCount}`);
    console.log(`   Iterations: ${result2.iterations}`);
    console.log(`\n💬 Answer:\n${result2.finalResponse}`);
  } catch (err) {
    console.error(`❌ Error: ${err}`);
  }

  // ----------------------------------------------------------
  // Test Case 3: Weather + Notification (workflow simulation)
  // ----------------------------------------------------------
  console.log("\n\n🟡 Test Case 3: Weather workflow simulation");
  console.log("─".repeat(50));

  try {
    const result3 = await agent.run(
      "Kiểm tra thời tiết Đà Nẵng. Nếu nhiệt độ trên 28°C thì gửi email " +
      "đến admin@example.com thông báo 'Nhiệt độ cao, cần bật điều hòa văn phòng'.",
    );

    console.log(`\n📊 Stats:`);
    console.log(`   Tool calls: ${result3.toolCallsCount}`);
    console.log(`   Iterations: ${result3.iterations}`);
    console.log(`\n💬 Answer:\n${result3.finalResponse}`);
  } catch (err) {
    console.error(`❌ Error: ${err}`);
  }

  // ----------------------------------------------------------
  // Test Case 4: No tools needed (direct answer)
  // ----------------------------------------------------------
  console.log("\n\n🟣 Test Case 4: Câu hỏi không cần tool");
  console.log("─".repeat(50));

  try {
    const result4 = await agent.run(
      "Tool Use trong AI là gì? Giải thích ngắn gọn.",
    );

    console.log(`\n📊 Stats:`);
    console.log(`   Tool calls: ${result4.toolCallsCount} (should be 0)`);
    console.log(`   Iterations: ${result4.iterations}`);
    console.log(`\n💬 Answer:\n${result4.finalResponse}`);
  } catch (err) {
    console.error(`❌ Error: ${err}`);
  }
}

runAgenticLoop().catch(console.error);
