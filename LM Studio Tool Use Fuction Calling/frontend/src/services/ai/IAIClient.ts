export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface IAIClient {
  id: string;
  name: string;
  sendMessageStream(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void
  ): Promise<string>;
}
