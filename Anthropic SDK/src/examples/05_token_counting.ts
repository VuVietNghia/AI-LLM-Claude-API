import { AnthropicClient } from "../AnthropicClient";
import type { IAIClient } from "../types";

// ============================================================
// EXAMPLE 5 — Token Counting & Cost Estimation
// ============================================================
//
// Khái niệm: Tokens
//   - LLM không đọc text theo từ hay ký tự mà theo "token"
//   - 1 token ≈ 4 ký tự tiếng Anh (≈ 0.75 từ)
//   - API trả về: usage.input_tokens + usage.output_tokens
//   - Chi phí tính theo tokens (xem pricing tại anthropic.com)
//
// Claude Pricing (approx, tháng 5/2026):
//   claude-opus-4-0:    $15/$75  per M tokens (in/out)
//   claude-sonnet-4-5:  $3/$15   per M tokens
//   claude-haiku-3-5:   $0.25/$1.25 per M tokens
//
// max_tokens:
//   - Số tokens TỐI ĐA cho output (không phải input)
//   - stop_reason = "max_tokens" → response bị cắt
//   - stop_reason = "end_turn"   → response hoàn chỉnh
// ============================================================

// Bảng giá gần đúng (USD per 1M tokens)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "claude-opus-4-7":          { input: 5.0,  output: 25.0 },
  "claude-sonnet-4-6":        { input: 3.0,   output: 15.0 },
  "claude-haiku-3-5":         { input: 0.25,  output: 1.25 },
  "claude-opus-4-0":          { input: 15.0,  output: 75.0 },
  "claude-sonnet-4-0":        { input: 3.0,   output: 15.0 },
  "claude-3-haiku-20240307":  { input: 0.25,  output: 1.25 },
};

function estimateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): string {
  const pricing = MODEL_PRICING[model] ?? { input: 3, output: 15 };
  const cost =
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output;
  return cost.toFixed(6);
}

async function runTokenExample(client: IAIClient): Promise<void> {
  console.log("=".repeat(60));
  console.log("💰 EXAMPLE 5: Token Counting & Cost Estimation");
  console.log("=".repeat(60));

  const prompts = [
    "Hi!",
    "Explain recursion in programming.",
    "Write a 200-word essay about the importance of clean code in software development.",
  ];

  console.log("\n[5a] Token counts for different prompt lengths:");
  for (const prompt of prompts) {
    const result = await client.sendMessage(prompt);
    const model = client.getConfig().model;
    const cost = estimateCost(model, result.inputTokens, result.outputTokens);

    console.log(`\n  Prompt: "${prompt.substring(0, 40)}..."`);
    console.log(`  Model: ${model}`);
    console.log(`  Input tokens:  ${result.inputTokens}`);
    console.log(`  Output tokens: ${result.outputTokens}`);
    console.log(`  Total tokens:  ${result.inputTokens + result.outputTokens}`);
    console.log(`  Est. cost:     $${cost} USD`);
    console.log(`  Stop reason:   ${result.stopReason}`);
  }

  // --- 5b. Demonstrate max_tokens truncation ---
  console.log("\n[5b] max_tokens truncation:");
  const tinyMaxClient: IAIClient = new AnthropicClient({
    model: "claude-haiku-3-5",
    maxTokens: 20, // rất nhỏ → sẽ bị cắt
  });

  const truncated = await tinyMaxClient.sendMessage(
    "Write a long story about a dragon."
  );
  console.log(`  max_tokens=20 → stop_reason: "${truncated.stopReason}"`);
  console.log(`  Output: "${truncated.content}"`);
  console.log(`  (response bị cắt vì chạm giới hạn max_tokens)`);

  // --- 5c. Model comparison: cùng prompt, khác model ---
  console.log("\n[5c] Same prompt, 3 different models:");
  const testPrompt = "Write one sentence about AI.";
  const modelsToTest = [
    "claude-haiku-3-5",
    "claude-sonnet-4-5",
  ] as const;

  for (const model of modelsToTest) {
    const modelClient: IAIClient = new AnthropicClient({
      model,
      maxTokens: 64,
    });
    const result = await modelClient.sendMessage(testPrompt);
    const cost = estimateCost(model, result.inputTokens, result.outputTokens);
    console.log(`\n  📊 ${model}:`);
    console.log(`     Tokens: ${result.inputTokens}/${result.outputTokens} | Cost: $${cost}`);
    console.log(`     Response: ${result.content.substring(0, 100)}`);
  }
}

async function main(): Promise<void> {
  require("dotenv").config();

  const client: IAIClient = new AnthropicClient({
    model: "claude-haiku-3-5",
    maxTokens: 512,
  });

  await runTokenExample(client);
}

main().catch(console.error);
