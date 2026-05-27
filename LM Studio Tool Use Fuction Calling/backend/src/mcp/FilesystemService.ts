import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { IMCPService } from "./IMCPService.js";
import { ToolDefinition } from "../types/index.js";
import dotenv from "dotenv";

dotenv.config();

export class FilesystemService implements IMCPService {
  id = "filesystem";
  name = "Filesystem MCP";
  isEnabled = false;

  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private tools: ToolDefinition[] = [];

  async connect(): Promise<void> {
    if (this.client) return; // Đã connect

    const allowedDirsStr = process.env.ALLOWED_DIRECTORIES || "./";
    const allowedDirs = allowedDirsStr.split(",").map(d => d.trim()).filter(Boolean);

    this.transport = new StdioClientTransport({
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", ...allowedDirs],
    });

    this.client = new Client(
      { name: "lm-studio-mcp-client", version: "1.0.0" },
      { capabilities: {} }
    );

    try {
      await this.client.connect(this.transport);
      console.log(`[FilesystemService] Connected to MCP server. Allowed dirs: ${allowedDirs.join(", ")}`);

      // Lấy danh sách tools
      const listToolsResult = await this.client.listTools();
      if (listToolsResult && listToolsResult.tools) {
        this.tools = listToolsResult.tools.map((t: any) => ({
          type: "function",
          function: {
            name: t.name,
            description: t.description || "",
            parameters: t.inputSchema,
          },
        }));
      }
    } catch (err) {
      console.error(`[FilesystemService] Failed to connect:`, err);
      this.client = null;
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (this.transport) {
      await this.transport.close();
      this.transport = null;
      this.client = null;
      this.tools = [];
    }
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.isEnabled ? this.tools : [];
  }

  async executeTool(toolName: string, args: Record<string, unknown>): Promise<any> {
    if (!this.client || !this.isEnabled) {
      throw new Error(`FilesystemService is not connected or enabled.`);
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });
      return result;
    } catch (err) {
      console.error(`[FilesystemService] Error calling tool ${toolName}:`, err);
      throw err;
    }
  }
}
