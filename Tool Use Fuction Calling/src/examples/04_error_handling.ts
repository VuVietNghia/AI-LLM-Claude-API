import "dotenv/config";
import { z } from "zod";
import { ToolRegistry } from "../ToolRegistry";
import { ClaudeToolAgent } from "../ClaudeToolAgent";
import type { ToolDefinition } from "../types";
import { registerAllTools } from "../tools/toolDefinitions";

// ============================================================
// EXAMPLE 4 — Error Handling Strategy
// ============================================================
//
// Khái niệm: Error Handling trong Tool Use
//
// Có 3 loại lỗi cần xử lý:
//
// 1. VALIDATION ERROR (trước khi thực thi)
//    - Tool input không khớp schema
//    - is_error: true → Claude sẽ thử lại hoặc báo lỗi
//
// 2. EXECUTION ERROR (trong khi thực thi)
//    - API call thất bại, timeout, network error
//    - is_error: true → Claude nhận biết và adjust response
//
// 3. AGENT LOOP ERROR (cấp độ cao hơn)
//    - MaxIterationsError → vòng lặp vô hạn
//    - Xử lý ở tầng ClaudeToolAgent
//
// Nguyên tắc: Tool KHÔNG BAO GIỜ throw exception lên Claude.
//   Thay vào đó, trả về { is_error: true, content: "error message" }
//   để Claude có thể xử lý gracefully.
//
// ============================================================

// ----------------------------------------------------------
// Tool cố tình gây ra lỗi — để test error handling
// ----------------------------------------------------------

const flakyApiDef: ToolDefinition = {
  name: "flaky_api",
  description: "Một API không ổn định — có thể thành công hoặc thất bại.",
  input_schema: {
    type: "object",
    properties: {
      endpoint: {
        type: "string",
        description: "URL endpoint cần gọi",
      },
      fail_rate: {
        type: "number",
        description: "Xác suất thất bại (0.0 - 1.0)",
        minimum: 0,
        maximum: 1,
      },
    },
    required: ["endpoint"],
  },
};

const flakySchema = z.object({
  endpoint: z.string().url("Must be a valid URL"),
  fail_rate: z.number().min(0).max(1).default(0.5),
});

async function flakyHandler({ endpoint, fail_rate }: z.infer<typeof flakySchema>): Promise<string> {
  await new Promise((r) => setTimeout(r, 100));

  if (Math.random() < fail_rate) {
    throw new Error(`Network timeout connecting to ${endpoint}`);
  }

  return JSON.stringify({
    status: 200,
    endpoint,
    data: { message: "Success!", timestamp: new Date().toISOString() },
  });
}

// ----------------------------------------------------------
// Tool trả về is_error: true — cách recommended
// ----------------------------------------------------------

const safeFlakyDef: ToolDefinition = {
  name: "safe_flaky_api",
  description: "Giống flaky_api nhưng xử lý lỗi gracefully.",
  input_schema: {
    type: "object",
    properties: {
      endpoint: { type: "string", description: "URL endpoint" },
    },
    required: ["endpoint"],
  },
};

const safeFlakySchema = z.object({
  endpoint: z.string().url(),
});

async function safeFlakyHandler({ endpoint }: z.infer<typeof safeFlakySchema>): Promise<string> {
  await new Promise((r) => setTimeout(r, 100));

  // Simulate 50% failure
  if (Math.random() < 0.5) {
    // Không throw! Trả về error message
    return JSON.stringify({
      success: false,
      error: "connection_timeout",
      message: `Failed to connect to ${endpoint}`,
      retry_after: 30,
    });
  }

  return JSON.stringify({
    success: true,
    endpoint,
    data: "API response data",
  });
}

async function runErrorHandlingExample(): Promise<void> {
  console.log("=".repeat(60));
  console.log("⚠️  EXAMPLE 4: Error Handling");
  console.log("=".repeat(60));

  // ----------------------------------------------------------
  // 4a. Validation Error (invalid Zod schema)
  // ----------------------------------------------------------
  console.log("\n[4a] Validation Error — invalid URL:\n");

  const registry = new ToolRegistry();
  registry.register(flakyApiDef, flakySchema, flakyHandler);

  const validationErrorResult = await registry.execute({
    type: "tool_use",
    id: "tool_1",
    name: "flaky_api",
    input: { endpoint: "not-a-valid-url" }, // Invalid URL
  });

  console.log("  Result:", validationErrorResult);
  console.log(`  is_error: ${validationErrorResult.is_error}`);

  // ----------------------------------------------------------
  // 4b. Execution Error (tool throws exception)
  // ----------------------------------------------------------
  console.log("\n[4b] Execution Error — tool throws exception:\n");

  const executionErrorResult = await registry.execute({
    type: "tool_use",
    id: "tool_2",
    name: "flaky_api",
    input: { endpoint: "https://api.example.com/data", fail_rate: 1.0 }, // Always fails
  });

  console.log("  Result:", executionErrorResult);
  console.log(`  is_error: ${executionErrorResult.is_error}`);

  // ----------------------------------------------------------
  // 4c. Success case
  // ----------------------------------------------------------
  console.log("\n[4c] Success case:\n");

  const successResult = await registry.execute({
    type: "tool_use",
    id: "tool_3",
    name: "flaky_api",
    input: { endpoint: "https://api.example.com/data", fail_rate: 0.0 }, // Never fails
  });

  console.log("  Result:", successResult);
  console.log(`  is_error: ${successResult.is_error ?? false}`);

  // ----------------------------------------------------------
  // 4d. MaxIterations Error trong agentic loop
  // ----------------------------------------------------------
  console.log("\n[4d] MaxIterations Error (loop guard):\n");

  // Tool luôn trả về "cần thêm thông tin" → Claude sẽ gọi lại mãi
  const infiniteLoopDef: ToolDefinition = {
    name: "always_needs_more",
    description: "Tool này luôn báo cần thêm thông tin",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Query" },
      },
      required: ["query"],
    },
  };

  const infiniteRegistry = new ToolRegistry();
  infiniteRegistry.register(
    infiniteLoopDef,
    z.object({ query: z.string() }),
    async () => "I need more information. Please call this tool again with more details.",
  );

  const infiniteAgent = new ClaudeToolAgent(infiniteRegistry, {
    model: "claude-haiku-3-5",
    maxTokens: 512,
    maxIterations: 3, // Giới hạn chỉ 3 vòng
  });

  try {
    await infiniteAgent.run("Keep calling the tool");
  } catch (err) {
    if (err instanceof Error && err.name === "MaxIterationsError") {
      console.log(`  ✅ MaxIterationsError caught: ${err.message}`);
      console.log("  ✅ Loop guard working correctly!");
    } else {
      console.error("  ❌ Unexpected error:", err);
    }
  }

  // ----------------------------------------------------------
  // 4e. Claude with tools — error recovery trong real conversation
  // ----------------------------------------------------------
  console.log("\n[4e] Claude error recovery — is_error feedback:\n");

  const mainRegistry = new ToolRegistry();
  registerAllTools(mainRegistry);
  mainRegistry.register(safeFlakyDef, safeFlakySchema, safeFlakyHandler);

  const mainAgent = new ClaudeToolAgent(mainRegistry, {
    model: "claude-haiku-3-5",
    maxTokens: 1024,
    maxIterations: 5,
    systemPrompt:
      "Khi tool báo lỗi (is_error), hãy thông báo cho user biết và cố gắng giải quyết bằng cách khác nếu có thể.",
  });

  try {
    const result = await mainAgent.run("Tính căn bậc 2 của 144 cho tôi");
    console.log(`\n💬 Response: ${result.finalResponse}`);
  } catch (err) {
    console.error("Agent error:", err);
  }
}

runErrorHandlingExample().catch(console.error);
