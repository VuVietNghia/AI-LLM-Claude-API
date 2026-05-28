export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type OrchestratorEvent = 
  | { type: 'content', content: string }
  | { type: 'tool_start', tool: { name: string, arguments: any } }
  | { type: 'tool_result', tool: { name: string, success: boolean, data: string } }
  | { type: 'tool_error', tool: { name: string, code: string, message: string, userFriendly: string } }
  | { type: 'error', message: string }
  | { type: 'done' };

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  tool_events?: OrchestratorEvent[];
}

export interface Provider {
  id: string;
  name: string;
  modelId: string;
  available: boolean;
}
