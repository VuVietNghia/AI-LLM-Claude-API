import { AnthropicClient } from "../AnthropicClient";
import type { ConversationMessage, IAIClient, MessageResult } from "../types";

// ============================================================
// EXAMPLE 3 — Multi-Turn Conversations
// ============================================================
//
// Khái niệm: Multi-Turn
//   - Anthropic API là STATELESS: server không lưu lịch sử
//   - Client phải tự quản lý conversation history
//   - Mỗi request gửi kèm TOÀN BỘ lịch sử (messages array)
//   - Thứ tự bắt buộc: user → assistant → user → assistant...
//   - Message đầu tiên PHẢI là "user"
//
// Pattern phổ biến:
//   messages = [...history, { role: "user", content: newMessage }]
//   → gửi lên API
//   → nhận assistant response
//   → thêm vào history: [...history, userMsg, assistantMsg]
// ============================================================

/**
 * ConversationManager: quản lý lịch sử hội thoại.
 * Inject IAIClient → không phụ thuộc vào implementation cụ thể.
 */
class ConversationManager {
  private history: ConversationMessage[] = [];
  private client: IAIClient;

  constructor(client: IAIClient) {
    this.client = client;
  }

  /** Gửi tin nhắn và tự động cập nhật lịch sử */
  async chat(userMessage: string): Promise<string> {
    // Thêm tin nhắn của user vào history
    this.history.push({ role: "user", content: userMessage });

    // Gửi toàn bộ history lên API
    const result = await this.client.sendConversation(this.history);

    // Thêm response của assistant vào history để lần sau dùng
    this.history.push({ role: "assistant", content: result.content });

    return result.content;
  }

  /** Stream version của chat() */
  async chatStream(
    userMessage: string,
    onChunk: (chunk: string) => void
  ): Promise<string> {
    this.history.push({ role: "user", content: userMessage });

    const result = await this.client.sendConversationStream(
      this.history,
      onChunk
    );

    this.history.push({ role: "assistant", content: result.content });
    return result.content;
  }

  getHistory(): ConversationMessage[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    console.log("  🗑️  History cleared.");
  }

  printHistory(): void {
    console.log(`\n  📚 Conversation History (${this.history.length} turns):`);
    this.history.forEach((msg, i) => {
      const icon = msg.role === "user" ? "👤" : "🤖";
      const preview = msg.content.substring(0, 80).replace(/\n/g, " ");
      console.log(`  [${i + 1}] ${icon} ${msg.role}: ${preview}...`);
    });
  }
}

// ============================================================
// EXAMPLE RUNNER
// ============================================================

async function runMultiTurnExample(client: IAIClient): Promise<void> {
  console.log("=".repeat(60));
  console.log("💬 EXAMPLE 3: Multi-Turn Conversations");
  console.log(`   Model: ${client.getConfig().model}`);
  console.log("=".repeat(60));

  const manager = new ConversationManager(client);

  // --- 3a. Hội thoại nhiều lượt ---
  console.log("\n[3a] Multi-turn chat (Claude nhớ context):");

  const turn1 = await manager.chat(
    "My name is Nghia and I'm learning TypeScript. " +
      "What's the most important concept to learn first?"
  );
  console.log(`  👤 User: My name is Nghia...`);
  console.log(`  🤖 Claude: ${turn1.substring(0, 120)}...`);

  const turn2 = await manager.chat(
    "Can you give me a simple code example for that concept?"
  );
  console.log(`\n  👤 User: Can you give me a simple code example?`);
  console.log(`  🤖 Claude: ${turn2.substring(0, 120)}...`);

  const turn3 = await manager.chat(
    "What's my name? (show that you remember our conversation)"
  );
  console.log(`\n  👤 User: What's my name?`);
  console.log(`  🤖 Claude: ${turn3.substring(0, 200)}`);

  // In history
  manager.printHistory();

  // --- 3b. Reset và bắt đầu hội thoại mới ---
  console.log("\n[3b] Reset history → new conversation:");
  manager.clearHistory();

  const newTurn = await manager.chat("Do you remember my name?");
  console.log(`  👤 User: Do you remember my name?`);
  console.log(`  🤖 Claude: ${newTurn.substring(0, 200)}`);

  // --- 3c. Stream multi-turn ---
  console.log("\n[3c] Streaming multi-turn:");
  manager.clearHistory();

  await manager.chat("I want to learn about Node.js streams.");

  process.stdout.write("  🤖 Claude (streaming): ");
  await manager.chatStream(
    "Give me a one-sentence summary of what you just told me.",
    (chunk) => process.stdout.write(chunk)
  );
  console.log();
}

async function main(): Promise<void> {
  require("dotenv").config();

  const client: IAIClient = new AnthropicClient({
    model: "claude-haiku-3-5",
    maxTokens: 1024,
  });

  await runMultiTurnExample(client);
}

main().catch(console.error);
