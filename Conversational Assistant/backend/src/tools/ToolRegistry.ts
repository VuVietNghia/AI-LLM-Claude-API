import { ITool, ToolResult } from './ITool.js';

export class ToolRegistry {
  private tools: Map<string, ITool> = new Map();

  register(tool: ITool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): ITool | undefined {
    return this.tools.get(name);
  }

  getOpenAIToolDefinitions(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  async execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        data: '',
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool with name '${name}' not found.`,
          userFriendly: `Không tìm thấy công cụ '${name}'.`,
        },
      };
    }

    const startTime = Date.now();
    try {
      const result = await tool.execute(args);
      const executionTimeMs = Date.now() - startTime;
      
      return {
        ...result,
        metadata: {
          ...result.metadata,
          executionTimeMs,
        },
      };
    } catch (err: any) {
      const executionTimeMs = Date.now() - startTime;
      return {
        success: false,
        data: '',
        error: {
          code: 'EXECUTION_ERROR',
          message: err.message || 'Unknown error occurred during tool execution.',
          userFriendly: `Đã xảy ra lỗi hệ thống khi chạy công cụ '${name}'.`,
        },
        metadata: { executionTimeMs },
      };
    }
  }
}
