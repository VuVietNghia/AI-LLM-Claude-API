import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const config = {
  port: process.env.PORT || 3001,
  lmStudio: {
    baseUrl: process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234/v1',
    modelId: process.env.LM_STUDIO_MODEL_ID || 'qwen2.5-7b-instruct',
  },
  zhipu: {
    baseUrl: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4/',
    apiKey: process.env.ZHIPU_API_KEY || '',
    modelId: process.env.ZHIPU_MODEL_ID || 'glm-4-flash',
  },
  sandboxDirectory: process.env.SANDBOX_DIRECTORY || path.resolve(__dirname, '../../../sandbox'),
  limits: {
    maxTokens: 16384,
    maxContextTokens: 12000,
    fileReadLimitBytes: 500 * 1024, // 500 KB
    webFetchTimeoutMs: 10000,
    webFetchLimitChars: 3000,
  }
};
