import { ModelRegistry } from '../models/ModelRegistry.js';
import { LMStudioProvider } from '../models/LMStudioProvider.js';
import { MockProvider } from '../models/MockProvider.js';
import dotenv from 'dotenv';

dotenv.config();

const baseUrl = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234';

// Setup Model Registry DI Container
export const modelRegistry = new ModelRegistry();

// Mock Provider for testing UI and fallback
modelRegistry.register(new MockProvider());

// LM Studio Providers (Thêm các model cụ thể của user)
modelRegistry.register(
  new LMStudioProvider(
    'qwen-uncensored',
    'Qwen Uncensored (LM Studio)',
    'qwen3.5-9b-uncensored', // Tên model trong thư mục của LM Studio (nên config linh hoạt hơn về sau nếu cần)
    baseUrl
  )
);

modelRegistry.register(
  new LMStudioProvider(
    'gemma-4',
    'Gemma 4 (LM Studio)',
    'google/gemma-4-e4b',
    baseUrl
  )
);
