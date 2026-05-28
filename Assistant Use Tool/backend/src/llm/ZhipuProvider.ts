import OpenAI from 'openai';
import { config } from '../config/app.config.js';
import { ILLMProvider } from './ILLMProvider.js';
import { ChatMessage, ToolDefinition, LLMStreamEvent, ToolCall } from './types.js';

export class ZhipuProvider implements ILLMProvider {
  public id = 'zhipu-glm';
  public name = 'Zhipu AI (GLM)';
  public modelId: string;
  private client: OpenAI;

  constructor(modelId?: string) {
    this.modelId = modelId || config.zhipu.modelId;
    this.client = new OpenAI({
      baseURL: config.zhipu.baseUrl,
      apiKey: config.zhipu.apiKey,
    });
  }

  async isAvailable(): Promise<boolean> {
    return !!config.zhipu.apiKey;
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
      console.error('[ZhipuProvider] Stream error:', error.message);
      yield { type: 'error', error: error.message };
    }
  }
}
