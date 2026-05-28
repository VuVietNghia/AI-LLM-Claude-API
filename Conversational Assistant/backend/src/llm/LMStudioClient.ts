import OpenAI from 'openai';
import { config } from '../config/app.config.js';
import { ChatMessage, ToolDefinition, LLMStreamEvent, ToolCall } from './types.js';

export class LMStudioClient {
  private client: OpenAI;
  private modelId: string;

  constructor() {
    this.client = new OpenAI({
      baseURL: config.lmStudio.baseUrl,
      apiKey: 'lm-studio',
    });
    this.modelId = config.lmStudio.modelId;
  }

  /**
   * Non-streaming chat, mainly used for AI calculator mode
   */
  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: this.modelId,
        messages: messages as any,
        stream: false,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error: any) {
      console.error('[LMStudioClient] Chat error:', error.message);
      throw error;
    }
  }

  /**
   * Real streaming chat with tool calling support
   */
  async *chatStream(
    messages: ChatMessage[],
    tools?: ToolDefinition[]
  ): AsyncGenerator<LLMStreamEvent> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.modelId,
        messages: messages as any,
        tools: tools && tools.length > 0 ? tools as any : undefined,
        stream: true,
      });

      let toolCallsBuffer: Map<number, ToolCall> = new Map();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // Xử lý stream content
        if (delta.content) {
          yield { type: 'content', content: delta.content };
        }

        // Xử lý stream tool_calls
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const index = tc.index;
            if (!toolCallsBuffer.has(index)) {
              toolCallsBuffer.set(index, {
                id: tc.id || '',
                type: 'function',
                function: {
                  name: tc.function?.name || '',
                  arguments: tc.function?.arguments || '',
                },
              });
            } else {
              const existing = toolCallsBuffer.get(index)!;
              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.function.name += tc.function.name;
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            }
          }
        }
      }

      // Khi stream xong, kiểm tra buffer tool calls
      if (toolCallsBuffer.size > 0) {
        const toolCalls = Array.from(toolCallsBuffer.values());
        yield { type: 'tool_calls', tool_calls: toolCalls };
      }

      yield { type: 'done' };
    } catch (error: any) {
      console.error('[LMStudioClient] Stream error:', error.message);
      // Fallback: Nếu stream với tool bị lỗi, thử lại không có tools
      if (tools && tools.length > 0) {
        yield { type: 'error', error: 'Streaming with tools failed. Falling back to non-streaming or disabled tools.' };
      } else {
        yield { type: 'error', error: error.message };
      }
    }
  }
}
