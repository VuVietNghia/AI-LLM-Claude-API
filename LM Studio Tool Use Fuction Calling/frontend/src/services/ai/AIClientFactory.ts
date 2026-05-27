import type { IAIClient } from './IAIClient';
import { LMStudioClient } from './LMStudioClient';
import { MockClient } from './MockClient';

export class AIClientFactory {
  private clients: Map<string, IAIClient> = new Map();

  constructor() {
    // Đăng ký các AI Client có sẵn (Dependency Injection)
    const lmStudioGemma = new LMStudioClient('/api/v1', 'google/gemma-4-e4b');
    lmStudioGemma.id = 'lm-studio-gemma';
    lmStudioGemma.name = 'LM Studio (Gemma)';

    const lmStudioQwen = new LMStudioClient('/api/v1', 'qwen3.5-9b-uncensored-hauhaucs-aggressive');
    lmStudioQwen.id = 'lm-studio-qwen';
    lmStudioQwen.name = 'LM Studio (Qwen Uncensored)';

    const mock = new MockClient();
    
    this.clients.set(lmStudioGemma.id, lmStudioGemma);
    this.clients.set(lmStudioQwen.id, lmStudioQwen);
    this.clients.set(mock.id, mock);
  }

  getClient(id: string): IAIClient {
    const client = this.clients.get(id);
    if (!client) {
      console.warn(`Client ${id} not found, falling back to mock`);
      return this.clients.get('mock-client')!;
    }
    return client;
  }

  getAvailableClients(): { id: string; name: string }[] {
    return Array.from(this.clients.values()).map(c => ({ id: c.id, name: c.name }));
  }
}

// Export a singleton instance for simplicity in React
export const aiClientFactory = new AIClientFactory();
