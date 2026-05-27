import { ChatMessage, ToolDefinition, ModelResponse } from '../types/index.js';
import { IModelProvider } from './IModelProvider.js';

export class MockProvider implements IModelProvider {
  id = 'mock-model';
  name = 'Mock Model (Offline)';
  supportsToolCalling = true;
  supportsVision = false;

  async chat(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const response = "Đây là phản hồi từ Mock Model. Nếu bạn đang test, xin chúc mừng, DI hoạt động tốt!";
    const words = response.split(' ');
    
    for (let i = 0; i < words.length; i++) {
      onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
      await new Promise(r => setTimeout(r, 50));
    }
    
    return response;
  }

  async chatWithTools(
    messages: ChatMessage[],
    tools: ToolDefinition[],
    onChunk: (chunk: string) => void
  ): Promise<ModelResponse> {
    const lastMessage = messages[messages.length - 1].content;
    // Lấy text từ content (có thể là string hoặc ContentPart[])
    const lastText = typeof lastMessage === 'string'
      ? lastMessage
      : lastMessage.filter(p => p.type === 'text').map(p => (p as any).text).join(' ');
    
    // Nếu user hỏi về tìm kiếm web, giả lập gọi tool web_search
    if (lastText.toLowerCase().includes('tìm kiếm') || lastText.toLowerCase().includes('search')) {
      const toolCallId = 'call_' + Math.random().toString(36).substring(7);
      return {
        content: '',
        tool_calls: [
          {
            id: toolCallId,
            type: 'function',
            function: {
              name: 'web_search',
              arguments: JSON.stringify({ query: 'dummy search' })
            }
          }
        ]
      };
    }

    // Nếu không, trả về text bình thường
    const content = await this.chat(messages, onChunk);
    return { content };
  }
}
