import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: process.env.PORT || 3001,
  lmStudio: {
    baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
    // Hardcode models for 8GB VRAM
    modelId: process.env.MODEL_ID || 'qwen2.5-7b-instruct',
  },
  sandboxDirectory: process.env.SANDBOX_DIRECTORY || path.resolve(__dirname, '../../sandbox'),
  limits: {
    maxTokens: 16384,
    maxContextTokens: 12000,
    fileReadLimitBytes: 500 * 1024, // 500 KB
    webFetchTimeoutMs: 10000,
    webFetchLimitChars: 3000,
  }
};
