import "dotenv/config";
import { ToolRegistry } from "../ToolRegistry";
import { ClaudeToolAgent } from "../ClaudeToolAgent";
import { registerAllTools } from "../tools/toolDefinitions";

// ============================================================
// EXAMPLE 1 — Basic Tool Use (Single Tool Call)
// ============================================================
//
// Khái niệm: Tool Use / Function Calling
//
// Tool Use là cơ chế để Claude gọi các hàm bên ngoài.
// Thay vì tự "bịa" câu trả lời, Claude sẽ:
//   1. Nhận biết rằng cần dùng tool
//   2. Tạo ra tool_use block với tên tool và input
//   3. Client thực thi tool thật
//   4. Gửi kết quả về Claude
//   5. Claude compose câu trả lời cuối cùng
//
// Flow:
//   User: "Hôm nay Hà Nội thời tiết thế nào?"
//     → Claude: stop_reason="tool_use", tool="get_weather", input={city:"Hanoi"}
//     → Tool: { temperature: "32°C", humidity: "75%", ... }
//     → Claude: "Hôm nay Hà Nội nắng, 32°C, độ ẩm 75%..."
//
// ============================================================

async function runBasicToolUse(): Promise<void> {
  console.log("=".repeat(60));
  console.log("🔧 EXAMPLE 1: Basic Tool Use");
  console.log("=".repeat(60));

  // Bước 1: Tạo registry và đăng ký tools
  const registry = new ToolRegistry();
  registerAllTools(registry);

  console.log(`\n✅ Registered tools: ${registry.getToolNames().join(", ")}`);

  // Bước 2: Tạo agent
  const agent = new ClaudeToolAgent(registry, {
    model: "claude-haiku-3-5",
    maxTokens: 1024,
    maxIterations: 5,
    systemPrompt: "Bạn là trợ lý AI hữu ích. Sử dụng tools khi cần thiết để lấy thông tin chính xác.",
  });

  // Bước 3: Thử nghiệm với các câu hỏi cần tool
  const prompts = [
    "Thời tiết hiện tại ở Hà Nội như thế nào?",
    "Tính 2 mũ 10 cho tôi",
    "Tìm sách về TypeScript trong database",
  ];

  for (const prompt of prompts) {
    try {
      const result = await agent.run(prompt);
      console.log(`\n📊 Stats:`);
      console.log(`   Tool calls: ${result.toolCallsCount}`);
      console.log(`   Iterations: ${result.iterations}`);
      console.log(`   Tokens: ${result.totalInputTokens} in / ${result.totalOutputTokens} out`);
      console.log(`\n💬 Final Answer:\n   ${result.finalResponse}`);
      console.log("\n" + "─".repeat(60));
    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }
}

runBasicToolUse().catch(console.error);
