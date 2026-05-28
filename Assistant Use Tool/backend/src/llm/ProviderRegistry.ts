import { ILLMProvider } from './ILLMProvider.js';
import { LMStudioProvider } from './LMStudioProvider.js';
import { ZhipuProvider } from './ZhipuProvider.js';

export class ProviderRegistry {
  private providers: Map<string, ILLMProvider> = new Map();

  constructor() {
    this.register(new LMStudioProvider());
    
    const glm45 = new ZhipuProvider('glm-4.5');
    glm45.id = 'glm-4.5';
    glm45.name = 'Zhipu GLM 4.5';
    this.register(glm45);

    const glm46 = new ZhipuProvider('glm-4.6');
    glm46.id = 'glm-4.6';
    glm46.name = 'Zhipu GLM 4.6';
    this.register(glm46);

    const glm47 = new ZhipuProvider('glm-4.7');
    glm47.id = 'glm-4.7';
    glm47.name = 'Zhipu GLM 4.7';
    this.register(glm47);
  }

  register(provider: ILLMProvider) {
    this.providers.set(provider.id, provider);
  }

  get(id: string): ILLMProvider | undefined {
    return this.providers.get(id);
  }

  getDefault(): ILLMProvider {
    return this.providers.get('lm-studio')!;
  }

  async list() {
    const list = Array.from(this.providers.values());
    const result = [];
    
    for (const provider of list) {
      const isAvailable = await provider.isAvailable();
      result.push({
        id: provider.id,
        name: provider.name,
        modelId: provider.modelId,
        available: isAvailable
      });
    }
    
    return result;
  }
}
