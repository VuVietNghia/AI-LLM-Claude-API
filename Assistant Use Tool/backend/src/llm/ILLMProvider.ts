import { ChatMessage, ToolDefinition, LLMStreamEvent } from './types.js';

export interface ILLMProvider {
  id: string;
  name: string;
  modelId: string;

  /**
   * Chạy stream chat completion có hỗ trợ tool calling
   */
  chatStream(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): AsyncGenerator<LLMStreamEvent>;

  /**
   * Kiểm tra model có đang available không
   */
  isAvailable(): Promise<boolean>;
}
