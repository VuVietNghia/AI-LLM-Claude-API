export interface ITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema object

  execute(args: Record<string, unknown>): Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data: string;
  error?: {
    code: string;
    message: string;
    userFriendly: string;
  };
  metadata?: {
    executionTimeMs: number;
    [key: string]: unknown;
  };
}
