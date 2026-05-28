import { ITool, ToolResult } from './ITool.js';
import * as math from 'mathjs';

export class CalculatorTool implements ITool {
  name = 'calculator';
  description = 'Perform mathematical calculations. Supports 2 modes: basic (simple arithmetic) and advanced (using mathjs for complex functions). Use advanced for trigonometry, algebra, or unit conversion.';
  parameters = {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'The mathematical expression to evaluate.',
      },
      mode: {
        type: 'string',
        enum: ['basic', 'advanced'],
        description: 'Calculation mode: basic (default) or advanced.',
      },
    },
    required: ['expression'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const expression = typeof args.expression === 'string' ? args.expression : '';
    const mode = typeof args.mode === 'string' ? args.mode : 'basic';

    if (!expression) {
      return {
        success: false,
        data: '',
        error: {
          code: 'MISSING_EXPRESSION',
          message: 'Missing or empty expression.',
          userFriendly: 'Bạn cần cung cấp biểu thức để tính toán.',
        },
      };
    }

    try {
      let resultStr = '';

      if (mode === 'advanced') {
        const res = math.evaluate(expression);
        resultStr = math.format(res, { precision: 14 });
      } else {
        if (!/^[0-9+\-*/%^().\s]+$/.test(expression)) {
          return {
            success: false,
            data: '',
            error: {
              code: 'INVALID_BASIC_EXPRESSION',
              message: 'Basic mode only supports simple arithmetic. Use advanced mode for complex expressions.',
              userFriendly: 'Chế độ basic chỉ hỗ trợ phép tính đơn giản. Xin dùng chế độ advanced.',
            },
          };
        }
        
        const res = math.evaluate(expression);
        resultStr = math.format(res, { precision: 14 });
      }

      return {
        success: true,
        data: resultStr,
      };
    } catch (err: any) {
      return {
        success: false,
        data: '',
        error: {
          code: 'CALCULATION_ERROR',
          message: err.message || 'Unknown calculation error.',
          userFriendly: `Không thể tính toán biểu thức: ${err.message}`,
        },
      };
    }
  }
}
