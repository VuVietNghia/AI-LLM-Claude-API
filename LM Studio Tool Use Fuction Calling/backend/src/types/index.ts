export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  name?: string; // Tên tool hoặc tên user
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: any; // JSON Schema
  };
}

export interface ModelResponse {
  content: string;
  tool_calls?: ToolCall[];
}

export interface ModelInfo {
  id: string;
  name: string;
  supportsToolCalling: boolean;
}
