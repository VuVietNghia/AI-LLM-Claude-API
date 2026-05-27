import { z } from "zod";
import type { ZodTypeAny } from "zod";
import type {
  ToolDefinition,
  ToolHandler,
  ToolRegistryEntry,
  ToolValidator,
  ValidationResult,
  ToolUseBlock,
  ToolResult,
} from "./types";
import {
  ToolValidationError,
  ToolExecutionError,
} from "./types";

// ============================================================
// TOOL REGISTRY — Quản lý danh sách tools
// ============================================================
//
// ToolRegistry là "kho" chứa tất cả tools với:
//   - definition: JSON Schema để Claude biết cách gọi
//   - validator: Zod schema để validate input trước khi thực thi
//   - handler: async function thực thi tool logic
//
// Pattern: Registry Pattern + Strategy Pattern
// ============================================================

export class ToolRegistry {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private tools = new Map<string, ToolRegistryEntry<any>>();

  /**
   * Đăng ký một tool mới vào registry.
   *
   * @param definition - JSON Schema definition (truyền cho Claude)
   * @param validator  - Zod schema để validate input
   * @param handler    - Async function thực thi tool
   *
   * @example
   *   registry.register(
   *     { name: "get_weather", description: "...", input_schema: { ... } },
   *     z.object({ city: z.string(), unit: z.enum(["celsius", "fahrenheit"]) }),
   *     async ({ city, unit }) => `Weather in ${city}: 25°${unit === "celsius" ? "C" : "F"}`
   *   );
   */
  register<T>(
    definition: ToolDefinition,
    validator: ToolValidator<T>,
    handler: ToolHandler<T>,
  ): this {
    this.tools.set(definition.name, { definition, validator, handler });
    return this; // chainable
  }

  /**
   * Trả về mảng ToolDefinition để truyền vào API field "tools".
   */
  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((e) => e.definition);
  }

  /**
   * Lấy tool entry theo tên.
   */
  get<T>(name: string): ToolRegistryEntry<T> | undefined {
    return this.tools.get(name);
  }

  /**
   * Kiểm tra tool có tồn tại không.
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Danh sách tên tools đã đăng ký.
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  // ----------------------------------------------------------
  // Validate + Execute — dùng khi Claude gọi tool
  // ----------------------------------------------------------

  /**
   * Validate input theo Zod schema của tool.
   *
   * @returns ValidationResult — success hoặc error với message
   */
  validate<T>(name: string, rawInput: unknown): ValidationResult<T> {
    const entry = this.tools.get(name);
    if (!entry) {
      return { success: false, error: `Tool "${name}" not found in registry` };
    }

    const result = (entry.validator as ZodTypeAny).safeParse(rawInput);
    if (!result.success) {
      const messages = result.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      );
      return { success: false, error: messages.join("; ") };
    }

    return { success: true, data: result.data };
  }

  /**
   * Thực thi tool: validate → execute → trả về ToolResult.
   *
   * Đây là hàm chính được gọi khi Claude yêu cầu sử dụng tool.
   * Luôn trả về ToolResult (không throw) — lỗi được encode trong is_error.
   */
  async execute(toolUse: ToolUseBlock): Promise<ToolResult> {
    const { id, name, input } = toolUse;

    // Step 1: Kiểm tra tool tồn tại
    if (!this.has(name)) {
      return {
        type: "tool_result",
        tool_use_id: id,
        content: `Tool "${name}" is not registered`,
        is_error: true,
      };
    }

    // Step 2: Validate input
    const validation = this.validate(name, input);
    if (!validation.success) {
      const error = new ToolValidationError(name, [validation.error]);
      console.error(`  ❌ Validation failed for "${name}": ${validation.error}`);
      return {
        type: "tool_result",
        tool_use_id: id,
        content: `Validation error: ${validation.error}`,
        is_error: true,
      };
    }

    // Step 3: Execute handler
    try {
      const entry = this.tools.get(name)!;
      console.log(`  🔧 Executing tool: "${name}"`);
      console.log(`     Input: ${JSON.stringify(input, null, 2)}`);

      const result = await entry.handler(validation.data);
      console.log(`  ✅ Tool result: ${result.substring(0, 100)}...`);

      return {
        type: "tool_result",
        tool_use_id: id,
        content: result,
      };
    } catch (err) {
      const error = new ToolExecutionError(name, err);
      console.error(`  ❌ Execution failed for "${name}": ${err}`);
      return {
        type: "tool_result",
        tool_use_id: id,
        content: `Execution error: ${error.message}`,
        is_error: true,
      };
    }
  }
}
