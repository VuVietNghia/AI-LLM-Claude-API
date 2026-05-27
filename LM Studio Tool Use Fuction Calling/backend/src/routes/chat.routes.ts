import { Router, Request, Response } from 'express';
import { AgentOrchestrator } from '../orchestrator/AgentOrchestrator.js';

export const chatRouter = Router();
const orchestrator = new AgentOrchestrator();

chatRouter.post('/', async (req: Request, res: Response) => {
  const { modelId, messages, features } = req.body;

  if (!modelId || !messages) {
    res.status(400).json({ error: 'Missing modelId or messages' });
    return;
  }

  // Cấu hình headers cho Server-Sent Events (SSE)
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const onChunk = (chunk: string) => {
    res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
  };

  const onToolCallStart = (toolCall: any) => {
    res.write(`data: ${JSON.stringify({ type: 'tool_call', content: toolCall })}\n\n`);
  };

  try {
    await orchestrator.process(
      modelId, 
      messages, 
      features || { webSearch: false, fileReadWrite: false }, 
      onChunk,
      onToolCallStart
    );
  } catch (error: any) {
    console.error('[Chat API] Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
  } finally {
    res.write(`data: [DONE]\n\n`);
    res.end();
  }
});
