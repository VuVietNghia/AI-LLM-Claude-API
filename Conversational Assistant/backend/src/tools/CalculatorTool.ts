import { ITool, ToolResult } from './ITool.js';
import * as math from 'mathjs';

export type AIExecutor = (prompt: string) => Promise<string>;

export class CalculatorTool implements ITool {
  name = 'calculator';
  description = 'Thực hiện các phép tính toán học. Hỗ trợ 3 chế độ: basic (cơ bản), advanced (nâng cao dùng mathjs), và ai (gọi AI giải quyết bài toán chữ hoặc logic).';
  parameters = {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Biểu thức hoặc bài toán cần tính.',
      },
      mode: {
        type: 'string',
        enum: ['basic', 'advanced', 'ai'],
        description: 'Chế độ tính: basic (mặc định), advanced, hoặc ai.',
      },
    },
    required: ['expression'],
  };

  private aiExecutor?: AIExecutor;

  constructor(aiExecutor?: AIExecutor) {
    this.aiExecutor = aiExecutor;
  }

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const expression = typeof args.expression === 'string' ? args.expression : '';
    const mode = typeof args.mode === 'string' ? args.mode : 'basic';

    if (!expression) {
      return {
        success: false,
        data: '',
        error: {
          code: 'MISSING_EXPRESSION',
          message: 'Trường "expression" bị thiếu hoặc rỗng.',
          userFriendly: 'Bạn cần cung cấp biểu thức để tính toán.',
        },
      };
    }

    try {
      let resultStr = '';

      if (mode === 'ai') {
        if (!this.aiExecutor) {
          throw new Error('AI executor không được cấu hình cho chế độ AI.');
        }
        const prompt = `Hãy tính toán và giải quyết bài toán sau. Chỉ trả về kết quả số hoặc lời giải ngắn gọn nhất:\n\n${expression}`;
        resultStr = await this.aiExecutor(prompt);
      } else if (mode === 'advanced') {
        // Sử dụng mathjs cho các phép tính phức tạp (algebra, trigonometry, unit conversion)
        const res = math.evaluate(expression);
        // Định dạng kết quả (VD: làm tròn nếu cần)
        resultStr = math.format(res, { precision: 14 });
      } else {
        // Basic mode: hạn chế chỉ các phép tính cơ bản
        // Sử dụng regex để kiểm tra tính hợp lệ của expression cơ bản (ngăn chặn code execution qua eval)
        if (!/^[0-9+\-*/%^().\s]+$/.test(expression)) {
          return {
            success: false,
            data: '',
            error: {
              code: 'INVALID_BASIC_EXPRESSION',
              message: 'Chế độ basic chỉ hỗ trợ số và các toán tử: +, -, *, /, %, ^, (, ). Sử dụng chế độ advanced cho phép tính phức tạp hơn.',
              userFriendly: 'Chế độ basic chỉ hỗ trợ các phép tính cơ bản. Vui lòng thử chế độ advanced.',
            },
          };
        }
        
        // Mặc dù là basic, dùng mathjs evaluate an toàn hơn eval() để tránh mọi lỗ hổng
        // Chúng ta vẫn có regex bảo vệ ở trên.
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
          message: err.message || 'Lỗi không xác định khi tính toán.',
          userFriendly: `Không thể tính toán biểu thức: ${err.message}`,
        },
      };
    }
  }
}
