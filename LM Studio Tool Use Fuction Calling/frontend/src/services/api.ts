// ---- Vision / Multimodal Types ----
export type TextPart = { type: 'text'; text: string };
export type ImageUrlPart = { type: 'image_url'; image_url: { url: string } };
export type ContentPart = TextPart | ImageUrlPart;

export interface ModelInfo {
  id: string;
  name: string;
  supportsToolCalling: boolean;
  supportsVision: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  /** String cho text-only, ContentPart[] khi gửi kèm ảnh */
  content: string | ContentPart[];
  name?: string;
  tool_call_id?: string;
}

export interface ToolCallInfo {
  name: string;
  arguments: string | object;
}

const API_BASE = '/api';

export async function getModels(): Promise<ModelInfo[]> {
  const res = await fetch(`${API_BASE}/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return await res.json();
}

export async function sendChatMessage({
  modelId,
  messages,
  features,
  onChunk,
  onToolCallStart,
  onCacheHit,
  signal
}: {
  modelId: string;
  messages: ChatMessage[];
  features: { webSearch: boolean; fileReadWrite: boolean };
  onChunk: (chunk: string) => void;
  onToolCallStart: (toolCall: ToolCallInfo) => void;
  onCacheHit?: () => void;
  signal?: AbortSignal;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelId, messages, features }),
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
    
    // Parse SSE format: data: {...}\n\n
    let lines = buffer.split('\n\n');
    buffer = lines.pop() || ''; // Phần dư cuối (chưa thành 1 event hoàn chỉnh)

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.substring(6).trim();
        if (dataStr === '[DONE]') {
          return;
        }
        
        try {
          const data = JSON.parse(dataStr);
          if (data.type === 'chunk') {
            onChunk(data.content);
          } else if (data.type === 'tool_call') {
            onToolCallStart(data.content);
          } else if (data.type === 'cache_hit') {
            onCacheHit?.();
          } else if (data.type === 'error') {
            onChunk(data.content);
          }
        } catch (e) {
          console.error("Error parsing SSE data", dataStr, e);
        }
      }
    }
  }
}

