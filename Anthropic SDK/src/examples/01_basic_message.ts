import { AnthropicClient } from "../AnthropicClient";
import type { IAIClient, MessageResult } from "../types";

// ============================================================
// EXAMPLE 1 — Basic Messages API (Single Turn)
// ============================================================
//
// Khái niệm: Messages API
//   - Endpoint POST /v1/messages
//   - Gửi một mảng messages (role: user | assistant)
//   - Trả về một Message object với content, usage, stop_reason
//
// Dependency Injection:
//   - Hàm runBasicExample nhận IAIClient thay vì tự tạo client
//   - → Có thể truyền bất kỳ implementation nào (Anthropic, mock, GPT...)
// ============================================================

/**
 * Business logic: chạy ví dụ basic message.
 * Không biết gì về implementation cụ thể — chỉ biết IAIClient.
 */
async function runBasicExample(client: IAIClient): Promise<void> {
  console.log("=".repeat(60));
  console.log("📨 EXAMPLE 1: Basic Messages API");
  console.log(`   Model: ${client.getConfig().model}`);
  console.log("=".repeat(60));

  // --- 1a. Simple one-shot message ---
  console.log("\n[1a] Simple question:");
  const result1 = await client.sendMessage(
    "Explain what a REST API is in 2 sentences."
  );
  printResult(result1);

  // --- 1b. Longer prompt ---
  console.log("\n[1b] Longer prompt:");
  const result2 = await client.sendMessage(
    "List 3 benefits of TypeScript over JavaScript. Use bullet points."
  );
  printResult(result2);

  // --- 1c. Hot-swap model lúc runtime ---
  console.log("\n[1c] Hot-swap to claude-haiku-3-5 (faster & cheaper):");
  client.setModel("claude-haiku-3-5");
  const result3 = await client.sendMessage(
    "What is 15 * 37? Just answer the number."
  );
  printResult(result3);
}

function printResult(result: MessageResult): void {
  console.log("  📝 Response:", result.content);
  console.log(
    `  📊 Tokens: ${result.inputTokens} in / ${result.outputTokens} out | stop: ${result.stopReason}`
  );
}

// ============================================================
// ENTRY POINT — inject dependency vào đây
// ============================================================
async function main(): Promise<void> {
  // Load env
  require("dotenv").config();

  // Tạo client với config cụ thể → inject vào business logic
  const client: IAIClient = new AnthropicClient({
    model: "claude-haiku-3-5",
    maxTokens: 512,
  });

  await runBasicExample(client);
}

main().catch(console.error);
