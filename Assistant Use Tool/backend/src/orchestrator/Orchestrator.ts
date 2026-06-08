import { ChatMessage } from '../llm/types.js';
import { ToolRegistry } from '../tools/ToolRegistry.js';
import { ProviderRegistry } from '../llm/ProviderRegistry.js';
import { config } from '../config/app.config.js';
import { ReadFileTool, WriteFileTool, ListDirectoryTool } from '../tools/FileReaderWriterTool.js';
import { CalculatorTool } from '../tools/CalculatorTool.js';
import { WebFetcherTool } from '../tools/WebFetcherTool.js';
import fs from 'fs/promises';
import path from 'path';

export type OrchestratorEvent = 
  | { type: 'content', content: string }
  | { type: 'tool_start', tool: { name: string, arguments: unknown } }
  | { type: 'tool_result', tool: { name: string, success: boolean, data: string } }
  | { type: 'tool_error', tool: { name: string, code: string, message: string, userFriendly: string } }
  | { type: 'error', message: string }
  | { type: 'done' };

export class Orchestrator {
  private providerRegistry: ProviderRegistry;
  private toolRegistry: ToolRegistry;
  private systemPrompt: string = '';

  constructor(providerRegistry: ProviderRegistry) {
    this.providerRegistry = providerRegistry;
    this.toolRegistry = new ToolRegistry();
    this.setupTools();
  }

  private setupTools() {
    this.toolRegistry.register(new CalculatorTool());
    this.toolRegistry.register(new ReadFileTool());
    this.toolRegistry.register(new WriteFileTool());
    this.toolRegistry.register(new ListDirectoryTool());
    this.toolRegistry.register(new WebFetcherTool());
  }

  async init() {
    try {
      const promptPath = path.resolve(process.cwd(), 'src/prompts/system.md');
      this.systemPrompt = await fs.readFile(promptPath, 'utf-8');
    } catch (e) {
      console.warn('System prompt file not found, using default inline prompt.');
      this.systemPrompt = 'Bạn là trợ lý AI. Bạn có các công cụ để giúp người dùng.';
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private truncateContext(messages: ChatMessage[]): ChatMessage[] {
    let totalTokens = this.estimateTokens(this.systemPrompt);
    const result: ChatMessage[] = [];
    
    if (messages.length > 0) {
       const last = messages[messages.length - 1];
       totalTokens += this.estimateTokens(typeof last.content === 'string' ? last.content : JSON.stringify(last.content));
       result.unshift(last);
    }

    for (let i = messages.length - 2; i >= 0; i--) {
      const msg = messages[i];
      const msgContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      const msgTokens = this.estimateTokens(msgContent);
      
      if (totalTokens + msgTokens > config.limits.maxContextTokens) {
        console.warn(`Context truncated. Removed ${i + 1} older messages.`);
        break;
      }
      
      totalTokens += msgTokens;
      result.unshift(msg);
    }

    return result;
  }

  async process(providerId: string, messages: ChatMessage[], onEvent: (event: OrchestratorEvent) => void) {
    const provider = this.providerRegistry.get(providerId) || this.providerRegistry.getDefault();
    
    let currentMessages = this.truncateContext([...messages]);
    currentMessages.unshift({ role: 'system', content: this.systemPrompt });

    const tools = this.toolRegistry.getOpenAIToolDefinitions();
    let steps = 0;
    const MAX_STEPS = 5;

    while (steps < MAX_STEPS) {
      steps++;
      let toolCallsToProcess: any[] = [];
      let assistantContent = '';

      const stream = provider.chatStream(currentMessages, tools);
      
      for await (const event of stream) {
        if (event.type === 'content') {
          assistantContent += event.content;
          onEvent({ type: 'content', content: event.content! });
        } else if (event.type === 'tool_calls') {
          toolCallsToProcess = event.tool_calls!;
        } else if (event.type === 'error') {
          onEvent({ type: 'error', message: event.error! });
          return;
        }
      }

      if (toolCallsToProcess.length > 0) {
        currentMessages.push({
          role: 'assistant',
          content: assistantContent,
          tool_calls: toolCallsToProcess
        });

        for (const tc of toolCallsToProcess) {
          const fnName = tc.function.name;
          const fnArgsStr = tc.function.arguments;
          
          let parsedArgs = {};
          try {
             parsedArgs = JSON.parse(fnArgsStr);
          } catch (e) {
             console.error(`Error parsing args for tool ${fnName}`, e);
          }

          onEvent({ type: 'tool_start', tool: { name: fnName, arguments: parsedArgs } });

          const result = await this.toolRegistry.execute(fnName, parsedArgs);

          if (result.success) {
            onEvent({ type: 'tool_result', tool: { name: fnName, success: true, data: result.data } });
            currentMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: fnName,
              content: result.data
            });
          } else {
            const err = result.error!;
            onEvent({ type: 'tool_error', tool: { name: fnName, code: err.code, message: err.message, userFriendly: err.userFriendly } });
            currentMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              name: fnName,
              content: `Lỗi công cụ: ${err.message}. Hướng dẫn: Đề xuất phương án khác hoặc giải thích lỗi cho người dùng.`
            });
          }
        }
      } else {
        break;
      }
    }

    if (steps >= MAX_STEPS) {
      onEvent({ type: 'error', message: 'Đạt giới hạn số vòng lặp công cụ tối đa.' });
    }

    onEvent({ type: 'done' });
  }
}
