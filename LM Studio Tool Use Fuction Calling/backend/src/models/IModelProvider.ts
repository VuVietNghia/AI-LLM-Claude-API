import { ChatMessage, ToolDefinition, ModelResponse } from '../types/index.js';

export interface IModelProvider {
  id: string;
  name: string;
  supportsToolCalling: boolean;
  supportsVision: boolean;

  /**
   * Chat thông thường không có tool calling (hoặc tự fallback nếu cần).
   */
  chat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<string>;

  /**
   * Chat với tool definitions (dùng cho hệ thống có MCP).
   */
  chatWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    onChunk: (chunk: string) => void
  ): Promise<ModelResponse>;
}
