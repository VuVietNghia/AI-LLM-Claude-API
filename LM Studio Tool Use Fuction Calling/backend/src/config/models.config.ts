import { ModelRegistry } from '../models/ModelRegistry.js';
import { LMStudioProvider } from '../models/LMStudioProvider.js';
import { MockProvider } from '../models/MockProvider.js';
import dotenv from 'dotenv';

dotenv.config();

const baseUrl = process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234';

// Setup Model Registry DI Container
export const modelRegistry = new ModelRegistry();

// Mock Provider for testing UI and fallback (no vision)
modelRegistry.register(new MockProvider());

// LM Studio: Qwen Uncensored Vision
// supportsVision = true vì model hỗ trợ multimodal
modelRegistry.register(
  new LMStudioProvider(
    'qwen-uncensored',
    'Qwen Uncensored Vision (LM Studio)',
    'qwen3.5-9b-uncensored-hauhaucs-aggressive',
    baseUrl,
    true  // supportsVision
  )
);

// LM Studio: Gemma 4 Vision
// supportsVision = true vì google/gemma-4 hỗ trợ multimodal
modelRegistry.register(
  new LMStudioProvider(
    'gemma-4',
    'Gemma 4 Vision (LM Studio)',
    'google/gemma-4-e4b',
    baseUrl,
    true  // supportsVision
  )
);

