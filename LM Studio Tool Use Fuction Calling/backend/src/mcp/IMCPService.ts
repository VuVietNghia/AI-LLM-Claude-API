import { ToolDefinition } from '../types/index.js';

export interface IMCPService {
  id: string;
  name: string;
  isEnabled: boolean;

  /**
   * Khởi tạo kết nối tới MCP server
   */
  connect(): Promise<void>;

  /**
   * Đóng kết nối
   */
  disconnect(): Promise<void>;

  /**
   * Lấy danh sách các tools mà server này cung cấp
   */
  getToolDefinitions(): ToolDefinition[];

  /**
   * Thực thi một tool call với các tham số tương ứng
   */
  executeTool(toolName: string, args: Record<string, unknown>): Promise<any>;
}
