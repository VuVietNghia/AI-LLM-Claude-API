import express from 'express';
import cors from 'cors';
import { config } from './config/app.config.js';
import { Orchestrator } from './orchestrator/Orchestrator.js';

const app = express();
const port = config.port;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const orchestrator = new Orchestrator();

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: config.lmStudio.modelId });
});

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }

  // Setup SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  try {
    await orchestrator.process(messages, (event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    res.write(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`);
    res.write(`data: {"type": "done"}\n\n`);
  } finally {
    res.end();
  }
});

async function startServer() {
  await orchestrator.init();
  
  app.listen(port, () => {
    console.log(`Backend server running on http://localhost:${port}`);
  });
}

startServer().catch(console.error);
