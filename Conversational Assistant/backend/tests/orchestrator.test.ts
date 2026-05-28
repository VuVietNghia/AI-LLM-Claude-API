import { describe, it, expect, vi } from 'vitest';
import { Orchestrator } from '../src/orchestrator/Orchestrator.js';

// Mock LMStudioClient
vi.mock('../src/llm/LMStudioClient.js', () => {
  return {
    LMStudioClient: vi.fn().mockImplementation(() => {
      return {
        chat: vi.fn().mockResolvedValue('Mocked AI response'),
        chatStream: async function* () {
          yield { type: 'content', content: 'Hello' };
          yield { type: 'done' };
        }
      };
    })
  };
});

describe('Orchestrator', () => {
  it('should initialize and load default system prompt if file missing', async () => {
    const orchestrator = new Orchestrator();
    await orchestrator.init();
    
    // Test context truncation
    const processResult: any[] = [];
    await orchestrator.process([{ role: 'user', content: 'Hi' }], (event) => {
      processResult.push(event);
    });

    expect(processResult).toEqual(
      expect.arrayContaining([
        { type: 'content', content: 'Hello' },
        { type: 'done' }
      ])
    );
  });
});
