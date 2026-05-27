import "dotenv/config";
import { z } from "zod";
import { ToolRegistry } from "../ToolRegistry";
import {
  weatherSchema,
  calculatorSchema,
  weatherToolDef,
  calculatorToolDef,
  weatherHandler,
  calculatorHandler,
} from "../tools/toolDefinitions";

// ============================================================
// EXAMPLE 3 — Input Validation với Zod
// ============================================================
//
// Khái niệm: Input Validation
//
// Tại sao cần validate input từ Claude?
//   - Claude có thể gọi tool với input KHÔNG ĐÚNG format
//   - Claude có thể thiếu field bắt buộc
//   - Claude có thể gửi giá trị nằm ngoài range cho phép
//   - Cần validate TRƯỚC KHI thực thi để tránh runtime errors
//
// Zod là thư viện validate TypeScript-first:
//   - Định nghĩa schema một lần → vừa runtime validate, vừa type-safe
//   - safeParse() → không throw, trả về { success, data/error }
//   - parse()     → throw ZodError nếu invalid
//
// ============================================================

async function runValidationExample(): Promise<void> {
  console.log("=".repeat(60));
  console.log("🛡️  EXAMPLE 3: Input Validation với Zod");
  console.log("=".repeat(60));

  const registry = new ToolRegistry();
  registry
    .register(weatherToolDef, weatherSchema, weatherHandler)
    .register(calculatorToolDef, calculatorSchema, calculatorHandler);

  // ----------------------------------------------------------
  // 3a. Valid inputs — tất cả đều pass
  // ----------------------------------------------------------
  console.log("\n[3a] Valid inputs (should all PASS):\n");

  const validCases = [
    {
      tool: "get_weather",
      input: { city: "Hanoi", unit: "celsius" },
      desc: "Basic weather request",
    },
    {
      tool: "get_weather",
      input: { city: "London" },
      desc: "Without unit (uses default)",
    },
    {
      tool: "calculate",
      input: { operation: "add", a: 10, b: 20 },
      desc: "Simple addition",
    },
    {
      tool: "calculate",
      input: { operation: "sqrt", a: 16 },
      desc: "Square root (no b needed)",
    },
    {
      tool: "calculate",
      input: { operation: "divide", a: 100, b: 4 },
      desc: "Division",
    },
  ];

  for (const { tool, input, desc } of validCases) {
    const result = registry.validate(tool, input);
    console.log(`  ✅ [${tool}] ${desc}`);
    console.log(`     Input:  ${JSON.stringify(input)}`);
    if (result.success) {
      console.log(`     Parsed: ${JSON.stringify(result.data)}`);
    }
    console.log();
  }

  // ----------------------------------------------------------
  // 3b. Invalid inputs — kiểm tra từng loại lỗi
  // ----------------------------------------------------------
  console.log("\n[3b] Invalid inputs (should all FAIL with clear errors):\n");

  const invalidCases = [
    {
      tool: "get_weather",
      input: { city: "" },
      desc: "Empty city name",
    },
    {
      tool: "get_weather",
      input: { city: "Hanoi", unit: "kelvin" },
      desc: "Invalid unit (not in enum)",
    },
    {
      tool: "calculate",
      input: { operation: "add", a: 10 },
      desc: "Missing 'b' for non-sqrt operation",
    },
    {
      tool: "calculate",
      input: { operation: "divide", a: 10, b: 0 },
      desc: "Division by zero",
    },
    {
      tool: "calculate",
      input: { operation: "sqrt", a: -4 },
      desc: "Square root of negative number",
    },
    {
      tool: "calculate",
      input: { operation: "power", a: Infinity, b: 2 },
      desc: "Infinite number",
    },
    {
      tool: "nonexistent_tool",
      input: { foo: "bar" },
      desc: "Tool not found in registry",
    },
  ];

  for (const { tool, input, desc } of invalidCases) {
    const result = registry.validate(tool, input);
    console.log(`  ❌ [${tool}] ${desc}`);
    console.log(`     Input: ${JSON.stringify(input)}`);
    if (!result.success) {
      console.log(`     Error: ${result.error}`);
    }
    console.log();
  }

  // ----------------------------------------------------------
  // 3c. Thử validate trực tiếp với Zod schema (không qua registry)
  // ----------------------------------------------------------
  console.log("\n[3c] Zod schema — chứng minh type safety:\n");

  // safeParse — không throw
  const safeResult = calculatorSchema.safeParse({ operation: "add", a: 5, b: 3 });
  if (safeResult.success) {
    // TypeScript biết safeResult.data là CalculatorInput
    console.log("  safeParse (valid):", safeResult.data);
    console.log(`  operation: ${safeResult.data.operation} (typed)`);
  }

  // parse — throw nếu invalid
  try {
    calculatorSchema.parse({ operation: "divide", a: 10, b: 0 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.log("\n  parse (invalid) threw ZodError:");
      err.issues.forEach((issue) =>
        console.log(`     - ${issue.path.join(".")}: ${issue.message}`),
      );
    }
  }

  // ----------------------------------------------------------
  // 3d. Thực thi tool với validated input
  // ----------------------------------------------------------
  console.log("\n[3d] Execute tool với validated input:\n");

  const toolUseBlock = {
    type: "tool_use" as const,
    id: "tool_1",
    name: "calculate",
    input: { operation: "power", a: 2, b: 10 },
  };

  const execResult = await registry.execute(toolUseBlock);
  console.log("  Tool result:", execResult);
}

runValidationExample().catch(console.error);
