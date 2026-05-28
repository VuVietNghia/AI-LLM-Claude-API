import { describe, it, expect } from 'vitest';
import { ToolRegistry } from '../src/tools/ToolRegistry.js';
import { CalculatorTool } from '../src/tools/CalculatorTool.js';

describe('ToolRegistry', () => {
  it('should register and execute tools', async () => {
    const registry = new ToolRegistry();
    const calc = new CalculatorTool();
    registry.register(calc);

    const definitions = registry.getOpenAIToolDefinitions();
    expect(definitions.length).toBe(1);
    expect(definitions[0].function.name).toBe('calculator');

    const result = await registry.execute('calculator', { expression: '1+1', mode: 'basic' });
    expect(result.success).toBe(true);
    expect(result.data).toBe('2');
  });

  it('should return error for unknown tool', async () => {
    const registry = new ToolRegistry();
    const result = await registry.execute('unknown_tool', {});
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('TOOL_NOT_FOUND');
  });
});
