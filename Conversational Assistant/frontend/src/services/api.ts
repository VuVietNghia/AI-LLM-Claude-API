import { ChatMessage, OrchestratorEvent } from '../types';

export async function sendChatRequest(
  messages: ChatMessage[],
  onEvent: (event: OrchestratorEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal
  });

  if (!res.ok) {
    throw new Error('Chat API error: ' + res.statusText);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('Stream reading not supported');

  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    
    let lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.substring(6).trim();
        if (!dataStr) continue;

        try {
          const event = JSON.parse(dataStr) as OrchestratorEvent;
          onEvent(event);
          if (event.type === 'done' || event.type === 'error') {
            return;
          }
        } catch (e) {
          console.error("Error parsing SSE data", dataStr, e);
        }
      }
    }
  }
}
