import OpenAI from 'openai';
import { config } from '../config/app.config.js';
import { ILLMProvider } from './ILLMProvider.js';
import { ChatMessage, ToolDefinition, LLMStreamEvent, ToolCall } from './types.js';

export class LMStudioProvider implements ILLMProvider {
  public id = 'lm-studio';
  public name = 'LM Studio (Local)';
  public modelId: string;
  private client: OpenAI;

  constructor() {
    this.modelId = config.lmStudio.modelId;
    this.client = new OpenAI({
      baseURL: config.lmStudio.baseUrl,
      apiKey: 'lm-studio', // LM Studio accepts any key
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${config.lmStudio.baseUrl}/models`);
      return response.ok;
    } catch {
      return false;
    }
  }

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
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          yield { type: 'content', content: delta.content };
        }

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

      if (toolCallsBuffer.size > 0) {
        const toolCalls = Array.from(toolCallsBuffer.values());
        yield { type: 'tool_calls', tool_calls: toolCalls };
      }

      yield { type: 'done' };
    } catch (error: any) {
      console.error('[LMStudioProvider] Stream error:', error.message);
      if (tools && tools.length > 0) {
        yield { type: 'error', error: 'Streaming with tools failed. Try again.' };
      } else {
        yield { type: 'error', error: error.message };
      }
    }
  }
}
