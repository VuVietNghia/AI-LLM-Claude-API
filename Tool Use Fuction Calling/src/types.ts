import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ZodTypeAny } from "zod";

// ============================================================
// TYPES & INTERFACES — Tool Use / Function Calling
// ============================================================

// ----------------------------------------------------------
// 1. Tool Definition Types (JSON Schema format)
// ----------------------------------------------------------

/**
 * JSON Schema cho input của một tool.
 * Claude đọc schema này để biết cách gọi tool đúng cách.
 */
export interface ToolInputSchema {
  type: "object";
  properties: Record<string, ToolProperty>;
  required?: string[];
}

export interface ToolProperty {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  description: string;
  enum?: string[] | number[];
  items?: ToolProperty;            // Cho type: "array"
  properties?: Record<string, ToolProperty>; // Cho type: "object"
  minimum?: number;
  maximum?: number;
  pattern?: string;
}

/**
 * Định nghĩa hoàn chỉnh của một tool.
 * Truyền vào API field "tools".
 */
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: ToolInputSchema;
}

// ----------------------------------------------------------
// 2. Tool Execution Types
// ----------------------------------------------------------

/**
 * Kết quả thực thi tool — trả về cho Claude.
 */
export interface ToolResult {
  type: "tool_result";
  tool_use_id: string;
  content: string;        // Luôn là string (JSON.stringify nếu cần)
  is_error?: boolean;     // true nếu tool thực thi thất bại
}

/**
 * Một lần gọi tool từ Claude (trong response).
 */
export interface ToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// ----------------------------------------------------------
// 3. Validation Types (Zod integration)
// ----------------------------------------------------------

/**
 * Schema Zod để validate input trước khi thực thi tool.
 * Dùng ZodTypeAny thay vì ZodSchema<T> để tránh lỗi với ZodDefault (input vs output type).
 */
export type ToolValidator<T> = ZodTypeAny & { _output: T };

/**
 * Kết quả validation.
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ----------------------------------------------------------
// 4. Tool Handler Types
// ----------------------------------------------------------

/**
 * Handler function cho một tool.
 * Nhận input đã được validate, trả về string result.
 */
export type ToolHandler<T> = (input: T) => Promise<string>;

/**
 * Registry entry — gom definition + validator + handler.
 */
export interface ToolRegistryEntry<T = unknown> {
  definition: ToolDefinition;
  validator: ToolValidator<T>;
  handler: ToolHandler<T>;
}

// ----------------------------------------------------------
// 5. Agent Loop Types
// ----------------------------------------------------------

/**
 * Config cho một phiên Tool Use.
 */
export interface ToolUseConfig {
  model: string;
  maxTokens: number;
  maxIterations: number;   // Giới hạn vòng lặp agentic loop
  systemPrompt?: string;
}

/**
 * Kết quả cuối cùng của một agentic loop.
 */
export interface AgentLoopResult {
  finalResponse: string;
  toolCallsCount: number;
  iterations: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

// ----------------------------------------------------------
// 6. Error Types
// ----------------------------------------------------------

export class ToolValidationError extends Error {
  constructor(
    public toolName: string,
    public fieldErrors: string[],
  ) {
    super(`Tool "${toolName}" validation failed: ${fieldErrors.join(", ")}`);
    this.name = "ToolValidationError";
  }
}

export class ToolExecutionError extends Error {
  constructor(
    public toolName: string,
    public cause: unknown,
  ) {
    super(`Tool "${toolName}" execution failed: ${cause}`);
    this.name = "ToolExecutionError";
  }
}

export class MaxIterationsError extends Error {
  constructor(public iterations: number) {
    super(`Exceeded max iterations: ${iterations}`);
    this.name = "MaxIterationsError";
  }
}

// ----------------------------------------------------------
// Re-export Anthropic types for convenience
// ----------------------------------------------------------
export type { Anthropic };
