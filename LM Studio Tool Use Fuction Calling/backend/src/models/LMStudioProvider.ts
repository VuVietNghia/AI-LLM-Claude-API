import { ChatMessage, ToolDefinition, ModelResponse } from '../types/index.js';
import { IModelProvider } from './IModelProvider.js';
import OpenAI from 'openai';

export class LMStudioProvider implements IModelProvider {
  id: string;
  name: string;
  supportsToolCalling: boolean;
  
  private client: OpenAI;
  private modelName: string;

  constructor(id: string, name: string, modelName: string, baseUrl: string) {
    this.id = id;
    this.name = name;
    this.modelName = modelName;
    this.supportsToolCalling = true;
    
    // Khởi tạo OpenAI client trỏ đến LM Studio Local Server
    this.client = new OpenAI({
      baseURL: baseUrl + '/v1',
      apiKey: 'lm-studio', // Dummy API key
    });
  }

  async chat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<string> {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.modelName,
        messages: messages as any,
        stream: true,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          onChunk(content);
        }
      }

      return fullResponse;
    } catch (error: any) {
      console.error(`[LMStudioProvider] Error in chat:`, error);
      const errMsg = `\n\n⚠️ **Lỗi kết nối LM Studio**: ${error.message}`;
      onChunk(errMsg);
      return errMsg;
    }
  }

  async chatWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    onChunk: (chunk: string) => void
  ): Promise<ModelResponse> {
    try {
      // LM Studio API hiện tại có thể không stream tool_calls hoàn hảo,
      // nên chúng ta sẽ không dùng stream khi có tools, hoặc xử lý stream tool_calls (phức tạp hơn).
      // Để đơn giản và chính xác với tool calling cục bộ, ta dùng non-streaming cho request này.
      
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: messages as any,
        tools: tools as any,
        stream: false,
      });

      const choice = response.choices[0];
      const message = choice.message;

      if (message.tool_calls && message.tool_calls.length > 0) {
        return {
          content: message.content || '',
          tool_calls: message.tool_calls as any,
        };
      }

      const content = message.content || '';
      // Simulate streaming to UI for consistency
      if (content) {
        const words = content.split(' ');
        for (let i = 0; i < words.length; i++) {
          onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
          await new Promise(r => setTimeout(r, 20));
        }
      }

      return { content };
    } catch (error: any) {
      console.error(`[LMStudioProvider] Error in chatWithTools:`, error);
      const errMsg = `\n\n⚠️ **Lỗi kết nối LM Studio**: ${error.message}`;
      onChunk(errMsg);
      return { content: errMsg };
    }
  }
}
