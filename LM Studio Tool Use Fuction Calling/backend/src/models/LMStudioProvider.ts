import { ChatMessage, ToolDefinition, ModelResponse } from '../types/index.js';
import { IModelProvider } from './IModelProvider.js';
import OpenAI from 'openai';

export class LMStudioProvider implements IModelProvider {
  id: string;
  name: string;
  supportsToolCalling: boolean;
  supportsVision: boolean;
  
  private client: OpenAI;
  private modelName: string;

  constructor(id: string, name: string, modelName: string, baseUrl: string, supportsVision = false) {
    this.id = id;
    this.name = name;
    this.modelName = modelName;
    this.supportsToolCalling = true;
    this.supportsVision = supportsVision;
    
    // Khởi tạo OpenAI client trỏ đến LM Studio Local Server
    this.client = new OpenAI({
      baseURL: baseUrl + '/v1',
      apiKey: 'lm-studio', // Dummy API key
    });
  }

  private formatMessagesForLMStudio(messages: ChatMessage[]): any[] {
    // Pass messages as-is. LM Studio accepts the standard OpenAI format:
    // { type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }
    return messages as any[];
  }

  private debugLogMessages(messages: any[], caller: string) {
    console.log(`\n--- [LMStudioProvider] ${caller} PAYLOAD ---`);
    messages.forEach((msg, i) => {
      if (Array.isArray(msg.content)) {
        msg.content.forEach((part: any) => {
          if (part.type === 'image_url') {
            const url: string = part.image_url?.url || '';
            console.log(`  msg[${i}] image_url → length=${url.length}, prefix="${url.substring(0, 40)}"`);
          }
        });
      } else {
        console.log(`  msg[${i}] role=${msg.role}, content="${String(msg.content).substring(0, 80)}"`);
      }
    });
    console.log(`-------------------------------------------\n`);
  }

  async chat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<string> {
    try {
      const formattedMessages = this.formatMessagesForLMStudio(messages);
      this.debugLogMessages(formattedMessages, 'chat()');
      const stream = await this.client.chat.completions.create({
        model: this.modelName,
        messages: formattedMessages as any,
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
      const formattedMessages = this.formatMessagesForLMStudio(messages);
      const response = await this.client.chat.completions.create({
        model: this.modelName,
        messages: formattedMessages as any,
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
