import Anthropic from "@anthropic-ai/sdk";

// ============================================================
// TYPES & INTERFACES — Dependency Injection Contracts
// ============================================================

/**
 * Danh sách các model Claude được hỗ trợ.
 * Thêm model mới vào đây để mở rộng hệ thống.
 */
export type ClaudeModel =
  | "claude-opus-4-5"
  | "claude-sonnet-4-5"
  | "claude-haiku-3-5"
  | "claude-opus-4-0"
  | "claude-sonnet-4-0"
  | "claude-3-haiku-20240307";

/**
 * Cấu hình cho một phiên làm việc với Claude.
 * Đây là "hợp đồng" (contract) cho Dependency Injection.
 */
export interface AIClientConfig {
  model: ClaudeModel;
  maxTokens: number;
  temperature?: number; // 0.0 → 1.0 (default 1.0)
  systemPrompt?: string;
}

/**
 * Một tin nhắn trong cuộc hội thoại.
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Kết quả trả về từ một lần gọi Messages API.
 */
export interface MessageResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
}

// ============================================================
// INTERFACE — Port (Dependency Injection boundary)
// ============================================================

/**
 * Interface trừu tượng định nghĩa những gì một AI client phải làm.
 * Nhờ interface này, bạn có thể swap Claude ↔ GPT ↔ Gemini
 * mà không cần thay đổi business logic.
 */
export interface IAIClient {
  /** Gửi một tin nhắn đơn và nhận phản hồi đầy đủ */
  sendMessage(userMessage: string): Promise<MessageResult>;

  /** Gửi tin nhắn với streaming (Server-Sent Events) */
  sendMessageStream(
    userMessage: string,
    onChunk: (chunk: string) => void
  ): Promise<MessageResult>;

  /** Gửi nhiều tin nhắn (multi-turn conversation) */
  sendConversation(
    messages: ConversationMessage[]
  ): Promise<MessageResult>;

  /** Stream một multi-turn conversation */
  sendConversationStream(
    messages: ConversationMessage[],
    onChunk: (chunk: string) => void
  ): Promise<MessageResult>;

  /** Lấy cấu hình hiện tại */
  getConfig(): AIClientConfig;

  /** Thay đổi model đang dùng (hot-swap) */
  setModel(model: ClaudeModel): void;
}
