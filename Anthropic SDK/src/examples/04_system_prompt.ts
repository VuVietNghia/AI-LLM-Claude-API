import { AnthropicClient } from "../AnthropicClient";
import type { IAIClient } from "../types";

// ============================================================
// EXAMPLE 4 — System Prompts & Personas
// ============================================================
//
// Khái niệm: System Prompt
//   - Là "hướng dẫn ngầm" gửi kèm mỗi request nhưng không hiển thị
//     trong conversation history với user
//   - Định nghĩa vai trò, ngữ cảnh, quy tắc, ngôn ngữ trả lời
//   - Không phải role "system" trong messages array — là field riêng
//   - Cú pháp SDK: { system: "...", messages: [...] }
//
// Dependency Injection:
//   - Mỗi "persona" là một AnthropicClient riêng với systemPrompt khác nhau
//   - Business logic (runExample) không quan tâm đến persona nào
// ============================================================

async function runSystemPromptExample(
  client: IAIClient,
  personaName: string
): Promise<void> {
  console.log(`\n  🎭 Persona: ${personaName}`);
  console.log(`     System: "${client.getConfig().systemPrompt?.substring(0, 60)}..."`);

  const response = await client.sendMessage(
    "How would you explain what you do to a 10-year-old?"
  );
  console.log(`  🤖 Response: ${response.content.substring(0, 200)}`);
}

async function main(): Promise<void> {
  require("dotenv").config();

  console.log("=".repeat(60));
  console.log("🎭 EXAMPLE 4: System Prompts & Personas");
  console.log("=".repeat(60));

  const baseConfig = {
    model: "claude-haiku-3-5" as const,
    maxTokens: 256,
  };

  // --- Inject các persona khác nhau vào cùng business logic ---

  // Persona 1: Vietnamese teacher
  const vietnameseTeacher: IAIClient = new AnthropicClient({
    ...baseConfig,
    systemPrompt:
      "Bạn là một giáo viên tiếng Việt thân thiện. " +
      "Luôn trả lời bằng tiếng Việt, dùng ngôn ngữ đơn giản, dễ hiểu. " +
      "Sử dụng ví dụ thực tế từ cuộc sống hàng ngày.",
  });

  // Persona 2: Senior developer
  const seniorDev: IAIClient = new AnthropicClient({
    ...baseConfig,
    systemPrompt:
      "You are a senior software engineer with 15 years of experience. " +
      "Be concise, technical, and focus on best practices. " +
      "Always mention potential pitfalls.",
  });

  // Persona 3: Marketing copywriter
  const copywriter: IAIClient = new AnthropicClient({
    ...baseConfig,
    systemPrompt:
      "You are an enthusiastic marketing copywriter. " +
      "Use persuasive language, emojis, and make everything sound exciting! " +
      "Focus on benefits and value propositions.",
  });

  await runSystemPromptExample(vietnameseTeacher, "Vietnamese Teacher");
  await runSystemPromptExample(seniorDev, "Senior Developer");
  await runSystemPromptExample(copywriter, "Marketing Copywriter");

  // --- 4b. Demonstrate hot-swap của model với cùng system prompt ---
  console.log("\n[4b] Same system prompt, different models:");

  const samePromptOpus: IAIClient = new AnthropicClient({
    model: "claude-haiku-3-5",
    maxTokens: 128,
    systemPrompt: "You are a poet. Answer everything with rhymes.",
  });

  const result = await samePromptOpus.sendMessage("What is programming?");
  console.log(`  🤖 claude-haiku-3-5 (poet): ${result.content}`);

  // Hot-swap sang model khác, giữ nguyên system prompt
  samePromptOpus.setModel("claude-sonnet-4-5");
  const result2 = await samePromptOpus.sendMessage("What is programming?");
  console.log(`\n  🤖 claude-sonnet-4-5 (poet): ${result2.content}`);
}

main().catch(console.error);
