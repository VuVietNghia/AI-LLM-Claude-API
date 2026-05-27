import type { IAIClient, ChatMessage } from './IAIClient';

export class LMStudioClient implements IAIClient {
  id = 'lm-studio';
  name = 'LM Studio (Localhost:1234)';
  private baseUrl: string;
  private model: string;

  constructor(
    baseUrl: string = '/api/v1', 
    model: string = 'qwen3.5-9b-uncensored-hauhaucs-aggressive'
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async sendMessageStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<string> {
    try {
      // Lấy tin nhắn cuối cùng của user làm input
      const lastUserMessage = messages.filter(m => m.role === 'user').pop()?.content || '';

      const response = await fetch(`${this.baseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          input: lastUserMessage
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      let fullResponse = '';
      if (data.output && Array.isArray(data.output)) {
        // Handle new LM Studio array output format
        const messageBlock = data.output.find((block: any) => block.type === 'message');
        const reasoningBlock = data.output.find((block: any) => block.type === 'reasoning');
        
        if (messageBlock) {
          fullResponse = messageBlock.content;
        }
        
        // Bạn có thể hiển thị cả phần reasoning (Thinking Process) nếu muốn
        // if (reasoningBlock) {
        //   fullResponse = `> **Suy nghĩ:**\n> ${reasoningBlock.content.replace(/\n/g, '\n> ')}\n\n` + fullResponse;
        // }
      } else if (typeof data === 'string') {
        fullResponse = data;
      } else if (data.reply) {
        fullResponse = data.reply;
      } else if (data.content) {
        fullResponse = data.content;
      } else if (data.message?.content) {
        fullResponse = data.message.content;
      } else if (data.choices && data.choices[0]?.message?.content) {
        fullResponse = data.choices[0].message.content;
      } else if (data.response) {
        fullResponse = data.response;
      } else {
        fullResponse = JSON.stringify(data);
      }

      // Mô phỏng hiệu ứng streaming (do API trả về 1 cục json)
      const words = fullResponse.split(' ');
      for (let i = 0; i < words.length; i++) {
        onChunk(words[i] + (i < words.length - 1 ? ' ' : ''));
        await new Promise(resolve => setTimeout(resolve, 20)); // Delay 20ms mỗi từ
      }
      
      return fullResponse;
    } catch (error) {
      console.error("Error communicating with LM Studio:", error);
      const errorMsg = "\n\n⚠️ **Lỗi kết nối**: Không thể gọi tới API. Hãy chắc chắn server đang chạy ở http://localhost:1234 và đã bật CORS.";
      onChunk(errorMsg);
      return errorMsg;
    }
  }
}
