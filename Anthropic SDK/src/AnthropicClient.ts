import Anthropic from "@anthropic-ai/sdk";
import type {
  AIClientConfig,
  ClaudeModel,
  ConversationMessage,
  IAIClient,
  MessageResult,
} from "./types";

// ============================================================
// CONCRETE IMPLEMENTATION — AnthropicClient
// ============================================================

/**
 * Concrete implementation của IAIClient sử dụng Anthropic SDK.
 *
 * Dependency Injection Pattern:
 *   - Nhận config qua constructor (Constructor Injection)
 *   - Implement interface IAIClient → dễ dàng mock / swap
 *
 * @example
 *   const client = new AnthropicClient({ model: "claude-sonnet-4-5", maxTokens: 1024 });
 *   const result = await client.sendMessage("Hello!");
 */
export class AnthropicClient implements IAIClient {
  private readonly sdk: Anthropic;
  private config: AIClientConfig;

  /**
   * Constructor Injection:
   * Config được "tiêm" vào từ bên ngoài — client không tự quyết định model.
   */
  constructor(config: AIClientConfig) {
    this.config = config;
    // SDK tự đọc ANTHROPIC_API_KEY từ process.env
    this.sdk = new Anthropic();
  }

  // ----------------------------------------------------------
  // PUBLIC: Thay đổi model lúc runtime (hot-swap)
  // ----------------------------------------------------------

  getConfig(): AIClientConfig {
    return { ...this.config };
  }

  setModel(model: ClaudeModel): void {
    console.log(`🔄 Model switched: ${this.config.model} → ${model}`);
    this.config = { ...this.config, model };
  }

  // ----------------------------------------------------------
  // 1. BASIC MESSAGE — single turn, blocking
  // ----------------------------------------------------------

  async sendMessage(userMessage: string): Promise<MessageResult> {
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: userMessage },
    ];

    const response = await this.sdk.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      ...(this.config.systemPrompt && {
        system: this.config.systemPrompt,
      }),
      messages,
    });

    return this.mapResponse(response);
  }

  // ----------------------------------------------------------
  // 2. STREAMING — Server-Sent Events (SSE)
  // ----------------------------------------------------------

  async sendMessageStream(
    userMessage: string,
    onChunk: (chunk: string) => void
  ): Promise<MessageResult> {
    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: userMessage },
    ];

    /**
     * stream() trả về một AsyncIterable của các events.
     * Có 3 cách stream:
     *   a) .stream() + for-await (dùng ở đây — phổ biến nhất)
     *   b) .stream().on("text", cb) — event-based
     *   c) .stream().finalMessage() — đợi complete
     */
    const stream = await this.sdk.messages.stream({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      ...(this.config.systemPrompt && {
        system: this.config.systemPrompt,
      }),
      messages,
    });

    // Duyệt từng text delta khi server gửi về
    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        onChunk(chunk.delta.text);
      }
    }

    // Lấy final message (đầy đủ metadata) sau khi stream xong
    const finalMessage = await stream.finalMessage();
    return this.mapResponse(finalMessage);
  }

  // ----------------------------------------------------------
  // 3. MULTI-TURN CONVERSATION — blocking
  // ----------------------------------------------------------

  async sendConversation(
    messages: ConversationMessage[]
  ): Promise<MessageResult> {
    // Map ConversationMessage → Anthropic.MessageParam
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await this.sdk.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      ...(this.config.systemPrompt && {
        system: this.config.systemPrompt,
      }),
      messages: anthropicMessages,
    });

    return this.mapResponse(response);
  }

  // ----------------------------------------------------------
  // 4. MULTI-TURN CONVERSATION — streaming
  // ----------------------------------------------------------

  async sendConversationStream(
    messages: ConversationMessage[],
    onChunk: (chunk: string) => void
  ): Promise<MessageResult> {
    const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const stream = await this.sdk.messages.stream({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      ...(this.config.systemPrompt && {
        system: this.config.systemPrompt,
      }),
      messages: anthropicMessages,
    });

    for await (const chunk of stream) {
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        onChunk(chunk.delta.text);
      }
    }

    const finalMessage = await stream.finalMessage();
    return this.mapResponse(finalMessage);
  }

  // ----------------------------------------------------------
  // PRIVATE HELPER — map SDK response → MessageResult
  // ----------------------------------------------------------

  private mapResponse(response: Anthropic.Message): MessageResult {
    const textBlock = response.content.find((b) => b.type === "text");
    return {
      content: textBlock?.type === "text" ? textBlock.text : "",
      model: response.model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      stopReason: response.stop_reason,
    };
  }
}
