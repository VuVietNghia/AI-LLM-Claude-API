import { IModelProvider } from './IModelProvider.js';
import { ModelInfo } from '../types/index.js';

export class ModelRegistry {
  private providers: Map<string, IModelProvider> = new Map();

  register(provider: IModelProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): IModelProvider {
    const provider = this.providers.get(id);
    if (!provider) {
      throw new Error(`Model provider with id '${id}' not found in registry.`);
    }
    return provider;
  }

  getAll(): ModelInfo[] {
    return Array.from(this.providers.values()).map(p => ({
      id: p.id,
      name: p.name,
      supportsToolCalling: p.supportsToolCalling,
    }));
  }
}
