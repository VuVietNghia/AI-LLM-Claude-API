import { AnthropicClient } from "../AnthropicClient";
import type { IAIClient } from "../types";

// ============================================================
// EXAMPLE 2 — Streaming SSE (Server-Sent Events)
// ============================================================
//
// Khái niệm: Streaming
//   - Thay vì chờ toàn bộ response, server gửi từng "delta" (chunk)
//   - Kỹ thuật này dùng SSE (Server-Sent Events) qua HTTP
//   - Event types quan trọng:
//       message_start         → bắt đầu message
//       content_block_start   → bắt đầu một content block (text/tool)
//       content_block_delta   → chunk nội dung (type: text_delta)
//       content_block_stop    → kết thúc content block
//       message_delta         → usage + stop_reason cuối cùng
//       message_stop          → stream kết thúc
//
// Lợi ích:
//   - UX tốt hơn: user thấy text xuất hiện dần (như ChatGPT)
//   - Giảm perceived latency
//   - Phù hợp với response dài
// ============================================================

async function runStreamingExample(client: IAIClient): Promise<void> {
  console.log("=".repeat(60));
  console.log("⚡ EXAMPLE 2: Streaming SSE");
  console.log(`   Model: ${client.getConfig().model}`);
  console.log("=".repeat(60));

  // --- 2a. Basic streaming ---
  console.log("\n[2a] Basic streaming (watch text appear token by token):");
  process.stdout.write("  🤖 Claude: ");

  const result1 = await client.sendMessageStream(
    "Write a short poem about TypeScript. Make it 4 lines.",
    (chunk) => {
      // onChunk: được gọi với mỗi text delta từ server
      process.stdout.write(chunk); // in ra ngay lập tức, không xuống dòng
    }
  );

  console.log(); // xuống dòng sau khi stream xong
  console.log(
    `  📊 Tokens: ${result1.inputTokens} in / ${result1.outputTokens} out`
  );

  // --- 2b. Streaming với progress tracking ---
  console.log("\n[2b] Streaming với character count tracking:");
  let charCount = 0;
  let wordCount = 0;

  process.stdout.write("  🤖 Claude: ");
  const result2 = await client.sendMessageStream(
    "Explain async/await in JavaScript in 3 paragraphs.",
    (chunk) => {
      process.stdout.write(chunk);
      charCount += chunk.length;
      wordCount += chunk.split(/\s+/).filter(Boolean).length;
    }
  );

  console.log();
  console.log(`  📈 Stats: ${charCount} chars, ~${wordCount} words`);
  console.log(
    `  📊 API Tokens: ${result2.inputTokens} in / ${result2.outputTokens} out`
  );

  // --- 2c. Collect toàn bộ stream vào 1 string ---
  console.log("\n[2c] Collect stream → full string:");
  let fullResponse = "";

  await client.sendMessageStream(
    "Name 3 JavaScript frameworks in one line.",
    (chunk) => {
      fullResponse += chunk; // gom lại
    }
  );

  console.log(`  ✅ Full response collected: "${fullResponse.trim()}"`);
}

async function main(): Promise<void> {
  require("dotenv").config();

  const client: IAIClient = new AnthropicClient({
    model: "claude-haiku-3-5",
    maxTokens: 1024,
  });

  await runStreamingExample(client);
}

main().catch(console.error);
