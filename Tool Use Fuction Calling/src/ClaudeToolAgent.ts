import Anthropic from "@anthropic-ai/sdk";
import type {
  ToolUseConfig,
  AgentLoopResult,
  ToolUseBlock,
  ToolResult,
} from "./types";
import { MaxIterationsError } from "./types";
import type { ToolRegistry } from "./ToolRegistry";

// ============================================================
// CLAUDE TOOL AGENT — Agentic Loop Engine
// ============================================================
//
// ClaudeToolAgent quản lý toàn bộ vòng lặp tool use:
//
//   User Prompt
//       ↓
//   [1] Gọi Claude API với tools[]
//       ↓
//   [2] Claude trả về: text HOẶC tool_use block
//       ↓ (nếu tool_use)
//   [3] Execute tool(s) → lấy kết quả
//       ↓
//   [4] Gửi tool_result về Claude
//       ↓
//   [5] Lặp lại từ [2] đến khi stop_reason = "end_turn"
//       ↓
//   Final text response
//
// ============================================================

export class ClaudeToolAgent {
  private readonly sdk: Anthropic;
  private readonly config: ToolUseConfig;
  private readonly registry: ToolRegistry;

  constructor(registry: ToolRegistry, config: ToolUseConfig) {
    this.sdk = new Anthropic();
    this.config = config;
    this.registry = registry;
  }

  // ----------------------------------------------------------
  // PUBLIC: Chạy agentic loop cho một user prompt
  // ----------------------------------------------------------

  /**
   * Gửi prompt và thực hiện agentic loop đến khi có final answer.
   *
   * @param userPrompt - Câu hỏi / yêu cầu của user
   * @returns AgentLoopResult với final response và stats
   */
  async run(userPrompt: string): Promise<AgentLoopResult> {
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: userPrompt },
    ];

    let iterations = 0;
    let toolCallsCount = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    console.log(`\n${"─".repeat(60)}`);
    console.log(`🤖 User: ${userPrompt}`);
    console.log(`${"─".repeat(60)}`);

    // ----------------------------------------------------------
    // AGENTIC LOOP
    // ----------------------------------------------------------
    while (true) {
      iterations++;

      // Giới hạn vòng lặp để tránh infinite loop
      if (iterations > this.config.maxIterations) {
        throw new MaxIterationsError(this.config.maxIterations);
      }

      console.log(`\n[Iteration ${iterations}] Calling Claude...`);

      // [STEP 1] Gọi Claude API
      const response = await this.sdk.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        ...(this.config.systemPrompt && {
          system: this.config.systemPrompt,
        }),
        tools: this.registry.getDefinitions() as Anthropic.Tool[],
        messages,
      });

      // Cộng dồn token usage
      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;

      console.log(
        `  stop_reason: "${response.stop_reason}" | tokens: ${response.usage.input_tokens}/${response.usage.output_tokens}`,
      );

      // [STEP 2] Xử lý response theo stop_reason
      if (response.stop_reason === "end_turn") {
        // Claude đã có câu trả lời cuối cùng
        const finalText = this.extractText(response.content);
        console.log(`\n✅ Final response: ${finalText.substring(0, 200)}...`);

        return {
          finalResponse: finalText,
          toolCallsCount,
          iterations,
          totalInputTokens,
          totalOutputTokens,
        };
      }

      if (response.stop_reason === "tool_use") {
        // Claude muốn gọi một hoặc nhiều tools
        const toolUseBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
        );

        console.log(`  🔧 Claude wants to call ${toolUseBlocks.length} tool(s):`);
        toolUseBlocks.forEach((b) =>
          console.log(`     - ${b.name}(${JSON.stringify(b.input)})`),
        );

        toolCallsCount += toolUseBlocks.length;

        // [STEP 3] Execute tools (có thể parallel)
        const toolResults = await this.executeTools(toolUseBlocks);

        // [STEP 4] Thêm assistant message + tool_result vào history
        // Quan trọng: phải giữ nguyên content block của Claude
        messages.push({
          role: "assistant",
          content: response.content,
        });

        // Tool results được gửi với role "user" (quy định của Anthropic API)
        messages.push({
          role: "user",
          content: toolResults,
        });

        continue; // Tiếp tục vòng lặp
      }

      // stop_reason khác (max_tokens, stop_sequence...)
      console.warn(`⚠️  Unexpected stop_reason: "${response.stop_reason}"`);
      const partialText = this.extractText(response.content);
      return {
        finalResponse: partialText,
        toolCallsCount,
        iterations,
        totalInputTokens,
        totalOutputTokens,
      };
    }
  }

  // ----------------------------------------------------------
  // PRIVATE: Execute tools (sequential hoặc parallel)
  // ----------------------------------------------------------

  /**
   * Execute nhiều tool calls — sequential để dễ debug.
   * Đổi sang Promise.all() nếu muốn parallel.
   */
  private async executeTools(
    toolUseBlocks: Anthropic.ToolUseBlock[],
  ): Promise<Anthropic.ToolResultBlockParam[]> {
    const results: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUseBlocks) {
      const toolResult = await this.registry.execute({
        type: "tool_use",
        id: block.id,
        name: block.name,
        input: block.input as Record<string, unknown>,
      });

      results.push({
        type: "tool_result",
        tool_use_id: toolResult.tool_use_id,
        content: toolResult.content,
        ...(toolResult.is_error !== undefined && {
          is_error: toolResult.is_error,
        }),
      });
    }

    return results;
  }

  /**
   * Extract text từ content array của response.
   */
  private extractText(content: Anthropic.ContentBlock[]): string {
    return content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }
}
