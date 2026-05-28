import { describe, it, expect, vi } from 'vitest';
import { CalculatorTool } from '../src/tools/CalculatorTool.js';

describe('CalculatorTool', () => {
  it('should calculate basic expression', async () => {
    const calc = new CalculatorTool();
    const result = await calc.execute({ expression: '2 + 3 * 4', mode: 'basic' });
    expect(result.success).toBe(true);
    expect(result.data).toBe('14');
  });

  it('should calculate advanced expression', async () => {
    const calc = new CalculatorTool();
    const result = await calc.execute({ expression: 'sin(pi/2)', mode: 'advanced' });
    expect(result.success).toBe(true);
    expect(result.data).toBe('1');
  });

  it('should fail on missing expression', async () => {
    const calc = new CalculatorTool();
    const result = await calc.execute({ mode: 'basic' });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('MISSING_EXPRESSION');
  });

  it('should fail basic mode with letters', async () => {
    const calc = new CalculatorTool();
    const result = await calc.execute({ expression: 'x + 2', mode: 'basic' });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_BASIC_EXPRESSION');
  });

  it('should execute ai mode with mock executor', async () => {
    const mockExecutor = vi.fn().mockResolvedValue('5');
    const calc = new CalculatorTool(mockExecutor);
    const result = await calc.execute({ expression: 'Một cộng bốn bằng mấy?', mode: 'ai' });
    
    expect(mockExecutor).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.data).toBe('5');
  });

  it('should fail ai mode if executor is missing', async () => {
    const calc = new CalculatorTool();
    const result = await calc.execute({ expression: '1+1', mode: 'ai' });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('CALCULATION_ERROR');
  });
});
