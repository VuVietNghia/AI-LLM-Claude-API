import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { IMCPService } from "./IMCPService.js";
import { ToolDefinition } from "../types/index.js";
import dotenv from "dotenv";

dotenv.config();

export class WebSearchService implements IMCPService {
  id = "web-search";
  name = "Web Search MCP";
  isEnabled = false;

  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private tools: ToolDefinition[] = [];

  async connect(): Promise<void> {
    if (this.client) return; // Đã connect

    const provider = process.env.WEB_SEARCH_PROVIDER || "duckduckgo";
    const braveKey = process.env.BRAVE_API_KEY;

    let command = "npx";
    let args: string[] = [];
    let env = process.env as Record<string, string>;

    if (provider === "brave" && braveKey) {
      args = ["-y", "@modelcontextprotocol/server-brave-search"];
      env = { ...process.env, BRAVE_API_KEY: braveKey } as Record<string, string>;
    } else {
      // Dùng package @zhafron/mcp-web-search trên npm (miễn phí, tích hợp nhiều engine như DDG, Bing, SearXNG mà ít bị block hơn)
      args = ["-y", "@zhafron/mcp-web-search"];
    }

    this.transport = new StdioClientTransport({
      command,
      args,
      env,
    });

    this.client = new Client(
      { name: "lm-studio-mcp-client", version: "1.0.0" },
      { capabilities: {} }
    );

    try {
      await this.client.connect(this.transport);
      console.log(`[WebSearchService] Connected to MCP server (${provider})`);

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
      console.error(`[WebSearchService] Failed to connect:`, err);
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
      throw new Error(`WebSearchService is not connected or enabled.`);
    }

    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });
      return result;
    } catch (err) {
      console.error(`[WebSearchService] Error calling tool ${toolName}:`, err);
      throw err;
    }
  }
}
