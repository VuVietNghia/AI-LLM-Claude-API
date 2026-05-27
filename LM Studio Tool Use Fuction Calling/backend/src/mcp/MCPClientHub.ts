import { IMCPService } from "./IMCPService.js";
import { WebSearchService } from "./WebSearchService.js";
import { FilesystemService } from "./FilesystemService.js";
import { ToolDefinition } from "../types/index.js";

export class MCPClientHub {
  private services: Map<string, IMCPService> = new Map();

  constructor() {
    // Khởi tạo các services
    const webSearch = new WebSearchService();
    const filesystem = new FilesystemService();
    
    this.services.set(webSearch.id, webSearch);
    this.services.set(filesystem.id, filesystem);
  }

  async initAll(): Promise<void> {
    // Connect tất cả các server lúc khởi động backend
    for (const service of this.services.values()) {
      try {
        await service.connect();
      } catch (err) {
        console.error(`[MCPClientHub] Failed to init service ${service.id}`, err);
      }
    }
  }

  setServiceState(id: string, isEnabled: boolean): void {
    const service = this.services.get(id);
    if (service) {
      service.isEnabled = isEnabled;
    }
  }

  getActiveToolDefinitions(enabledServices: { webSearch: boolean, fileReadWrite: boolean }): ToolDefinition[] {
    // Update state trước khi lấy tools
    this.setServiceState("web-search", enabledServices.webSearch);
    this.setServiceState("filesystem", enabledServices.fileReadWrite);

    let tools: ToolDefinition[] = [];
    for (const service of this.services.values()) {
      tools = tools.concat(service.getToolDefinitions());
    }
    return tools;
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<any> {
    // Tìm service chứa tool này
    for (const service of this.services.values()) {
      const toolDef = service.getToolDefinitions().find(t => t.function.name === toolName);
      if (toolDef) {
        return await service.executeTool(toolName, args);
      }
    }
    throw new Error(`Tool ${toolName} not found in any enabled service.`);
  }
}

// Export singleton
export const mcpHub = new MCPClientHub();
