import type { IAIClient, ChatMessage } from './IAIClient';

export class MockClient implements IAIClient {
  id = 'mock-client';
  name = 'Mock Model (No Server Required)';

  async sendMessageStream(
    _messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<string> {
    const responseText = "Đây là phản hồi từ Mock Client. Tôi là một hệ thống giả lập nhằm mục đích kiểm thử UI và **Dependency Injection**. Thiết kế của bạn trông rất tuyệt và mượt mà! 🚀\n\n```typescript\nconsole.log('Hello World!');\n```";
    
    // Simulate streaming delay
    const words = responseText.split(' ');
    for (let i = 0; i < words.length; i++) {
      onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
      await new Promise(resolve => setTimeout(resolve, 60)); // 60ms delay per word
    }
    
    return responseText;
  }
}
