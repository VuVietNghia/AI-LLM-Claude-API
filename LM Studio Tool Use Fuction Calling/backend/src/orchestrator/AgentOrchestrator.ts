import { mcpHub } from '../mcp/MCPClientHub.js';
import { modelRegistry } from '../config/models.config.js';
import { ChatMessage } from '../types/index.js';
import { PromptLoader } from './PromptLoader.js';

export class AgentOrchestrator {
  /**
   * Chạy luồng orchestrator:
   * 1. Lấy system prompt và tool definitions (nếu tools enabled)
   * 2. Gọi model
   * 3. Nếu model trả về tool calls -> thực thi -> gọi lại model
   * 4. Lặp lại đến khi model trả về text.
   */
  async process(
    modelId: string,
    messages: ChatMessage[],
    features: { webSearch: boolean; fileReadWrite: boolean },
    onChunk: (chunk: string) => void,
    onToolCallStart?: (toolCall: any) => void
  ): Promise<void> {
    
    const provider = modelRegistry.get(modelId);
    
    // Xây dựng system prompt
    const systemContent = await PromptLoader.buildSystemPrompt(features);
    
    // Gắn system prompt vào đầu danh sách messages
    let currentMessages: ChatMessage[] = [
      { role: 'system', content: systemContent },
      ...messages
    ];

    // Lấy tool definitions từ MCP Hub
    const tools = mcpHub.getActiveToolDefinitions(features);
    const hasTools = tools.length > 0;

    let MAX_STEPS = 5; // Tránh loop vô hạn
    let step = 0;

    while (step < MAX_STEPS) {
      step++;
      
      let response;
      if (hasTools && provider.supportsToolCalling) {
        response = await provider.chatWithTools(currentMessages, tools, onChunk);
      } else {
        response = { content: await provider.chat(currentMessages, onChunk) };
      }

      if (response.tool_calls && response.tool_calls.length > 0) {
        // Model yêu cầu gọi tool
        currentMessages.push({
          role: 'assistant',
          content: response.content || '',
          tool_calls: response.tool_calls
        });

        // Thực thi tất cả tool_calls
        for (const toolCall of response.tool_calls) {
          const fnName = toolCall.function.name;
          const fnArgs = toolCall.function.arguments; // JSON string
          
          if (onToolCallStart) {
            onToolCallStart({ name: fnName, arguments: fnArgs });
          }

          let argsObj = {};
          try {
            argsObj = typeof fnArgs === 'string' ? JSON.parse(fnArgs) : fnArgs;
          } catch (e) {
            console.error(`[Orchestrator] Failed to parse tool arguments: ${fnArgs}`);
          }

          let resultContent = "";
          try {
            const result = await mcpHub.executeTool(fnName, argsObj);
            // Result từ MCP thường nằm ở result.content, ta chuyển thành text
            if (result.content && Array.isArray(result.content)) {
              resultContent = result.content.map((c: any) => c.text).join("\n");
            } else if (typeof result === 'object') {
               resultContent = JSON.stringify(result);
            } else {
               resultContent = String(result);
            }
          } catch (e: any) {
            resultContent = `Lỗi khi thực thi tool: ${e.message}`;
          }

          // Push kết quả của tool call vào history để gọi tiếp model
          currentMessages.push({
            role: 'tool',
            content: resultContent,
            name: fnName,
            tool_call_id: toolCall.id
          });
        }
        
        // Loop lại để gọi model với kết quả của tool
      } else {
        // Không có tool call, coi như hoàn thành và đã stream output xong
        break;
      }
    }

    if (step >= MAX_STEPS) {
      onChunk('\n\n⚠️ Đã đạt giới hạn số vòng gọi tool (Max Steps).');
    }
  }
}
