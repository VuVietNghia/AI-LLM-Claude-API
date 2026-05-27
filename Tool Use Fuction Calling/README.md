# Claude Tool Use / Function Calling

> Hướng dẫn toàn diện về **Tool Use**, **Input Validation**, **Error Handling** và cầu nối với **MCP Protocol**

---

## 📁 Cấu trúc Project

```
Tool Use Function Calling/
├── src/
│   ├── types.ts                          ← Interfaces & Type definitions
│   ├── ToolRegistry.ts                   ← Quản lý tools (Registry Pattern)
│   ├── ClaudeToolAgent.ts                ← Agentic Loop Engine
│   ├── tools/
│   │   └── toolDefinitions.ts            ← Tool definitions (4 tools mẫu)
│   ├── examples/
│   │   ├── 01_basic_tool_use.ts          ← Tool use cơ bản
│   │   ├── 02_multi_tool_parallel.ts     ← Parallel tool calls
│   │   ├── 03_input_validation.ts        ← Validation với Zod
│   │   ├── 04_error_handling.ts          ← Error handling strategies
│   │   └── 05_agentic_loop.ts            ← Multi-step agentic loop
│   └── index.ts                          ← Entry point
├── .env.example
├── tsconfig.json
└── package.json
```

---

## ⚙️ Setup

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env
cp .env.example .env
# Điền API key: ANTHROPIC_API_KEY=sk-ant-...

# 3. Chạy examples
npm run example:basic-tool
npm run example:multi-tool
npm run example:validation
npm run example:error-handling
npm run example:agent-loop
```

---

## 🔧 Phần 1 — Tool Use / Function Calling là gì?

### Vấn đề: LLM không biết thông tin thực tế

Claude (và tất cả LLM) có **kiến thức tĩnh** — được train đến một thời điểm cố định. Claude **không thể**:
- Biết thời tiết hôm nay
- Truy vấn database của bạn
- Thực hiện tính toán phức tạp chính xác 100%
- Gửi email, gọi API bên ngoài

**Tool Use** (còn gọi là **Function Calling**) giải quyết điều này.

### Cơ chế hoạt động

```
┌─────────────────────────────────────────────────────────┐
│                    TOOL USE FLOW                         │
└─────────────────────────────────────────────────────────┘

  [1] Bạn định nghĩa tools với JSON Schema
      ↓
  [2] Gửi user prompt + tools[] lên Claude API
      ↓
  [3] Claude phân tích và quyết định:
      ├── Có thể trả lời trực tiếp? → trả về text (end_turn)
      └── Cần dùng tool?            → trả về tool_use block
            ↓
  [4] Client nhận tool_use, thực thi tool thật
      ↓
  [5] Gửi tool_result về Claude
      ↓
  [6] Claude compose câu trả lời cuối cùng
```

### Ví dụ cụ thể

**User:** *"Thời tiết Hà Nội hôm nay?"*

**Round 1 — Client → Claude:**
```json
{
  "messages": [{ "role": "user", "content": "Thời tiết Hà Nội hôm nay?" }],
  "tools": [
    {
      "name": "get_weather",
      "description": "Lấy thông tin thời tiết",
      "input_schema": {
        "type": "object",
        "properties": {
          "city": { "type": "string", "description": "Tên thành phố" }
        },
        "required": ["city"]
      }
    }
  ]
}
```

**Round 1 — Claude → Client:** *(stop_reason = "tool_use")*
```json
{
  "stop_reason": "tool_use",
  "content": [
    {
      "type": "tool_use",
      "id": "tool_abc123",
      "name": "get_weather",
      "input": { "city": "Hanoi" }
    }
  ]
}
```

**Client thực thi tool:**
```typescript
const result = await getWeather({ city: "Hanoi" });
// → { temperature: "32°C", humidity: "75%", description: "Sunny" }
```

**Round 2 — Client → Claude:**
```json
{
  "messages": [
    { "role": "user", "content": "Thời tiết Hà Nội hôm nay?" },
    { "role": "assistant", "content": [{ "type": "tool_use", "id": "tool_abc123", ... }] },
    {
      "role": "user",
      "content": [{
        "type": "tool_result",
        "tool_use_id": "tool_abc123",
        "content": "{\"temperature\":\"32°C\",\"humidity\":\"75%\"}"
      }]
    }
  ]
}
```

**Round 2 — Claude → Client:** *(stop_reason = "end_turn")*
```
"Hôm nay Hà Nội trời nắng, nhiệt độ 32°C, độ ẩm 75%. Khá nóng, bạn nên mặc quần áo thoáng mát!"
```

---

## 📐 Phần 2 — Tool Schema (JSON Schema)

Tool Schema là **"hợp đồng"** giữa Claude và tool của bạn. Claude dùng schema để:
1. Hiểu tool làm gì
2. Biết cần gửi input gì
3. Tạo ra input đúng format

### Cấu trúc ToolDefinition

```typescript
interface ToolDefinition {
  name: string;           // Tên tool (snake_case)
  description: string;    // Mô tả rõ ràng → Claude đọc để quyết định có dùng không
  input_schema: {
    type: "object";
    properties: {
      [key: string]: {
        type: "string" | "number" | "integer" | "boolean" | "array" | "object";
        description: string;   // Quan trọng: giúp Claude hiểu field này là gì
        enum?: string[];        // Giới hạn giá trị cho phép
        minimum?: number;       // Số tối thiểu
        maximum?: number;       // Số tối đa
        items?: { ... };        // Schema cho từng element (nếu type = "array")
      };
    };
    required?: string[];  // Các field bắt buộc
  };
}
```

### Ví dụ thực tế — Calculator Tool

```typescript
const calculatorToolDef: ToolDefinition = {
  name: "calculate",
  description:
    "Thực hiện phép tính toán học. Hỗ trợ: add, subtract, multiply, divide, power, sqrt.",
  input_schema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Phép tính cần thực hiện",
        enum: ["add", "subtract", "multiply", "divide", "power", "sqrt"],
      },
      a: {
        type: "number",
        description: "Số thứ nhất (operand a)",
      },
      b: {
        type: "number",
        description: "Số thứ hai. Không cần với operation='sqrt'.",
      },
    },
    required: ["operation", "a"],
  },
};
```

### Tips viết Schema tốt

| ❌ Schema kém | ✅ Schema tốt |
|--------------|---------------|
| `description: "city"` | `description: "Tên thành phố cần lấy thông tin (ví dụ: Hanoi, New York)"` |
| Không dùng `enum` khi có giá trị cố định | Dùng `enum: ["celsius", "fahrenheit"]` |
| Không có `required` | Rõ ràng field nào bắt buộc |
| Không có `minimum`/`maximum` | Thêm constraints cho số |

---

## 🛡️ Phần 3 — Input Validation với Zod

### Tại sao cần validate input từ Claude?

Claude thông minh nhưng **có thể tạo ra input sai** vì:
- Schema không đủ chặt chẽ
- Model hiểu nhầm yêu cầu của user
- Edge cases không được cover trong description

**Validate trước khi thực thi** = tránh runtime errors và security issues.

### Zod — TypeScript-first Validation

```typescript
import { z } from "zod";

// Định nghĩa schema một lần
const calculatorSchema = z.object({
  operation: z.enum(["add", "subtract", "multiply", "divide", "sqrt"]),
  a: z.number().finite("Number must be finite"),
  b: z.number().finite().optional(),
})
.refine(
  (data) => data.operation === "sqrt" || data.b !== undefined,
  { message: "Operand 'b' is required for this operation" }
)
.refine(
  (data) => !(data.operation === "divide" && data.b === 0),
  { message: "Cannot divide by zero" }
);

// TypeScript infers type automatically
type CalculatorInput = z.infer<typeof calculatorSchema>;
// → { operation: "add" | "subtract" | ..., a: number, b?: number }
```

### safeParse vs parse

```typescript
// safeParse — KHÔNG throw, trả về { success, data/error }
const result = schema.safeParse(rawInput);
if (result.success) {
  // result.data là type-safe
  console.log(result.data.operation); // TypeScript biết đây là string
} else {
  // result.error là ZodError
  result.error.issues.forEach(issue =>
    console.log(`${issue.path}: ${issue.message}`)
  );
}

// parse — THROW ZodError nếu invalid
try {
  const data = schema.parse(rawInput); // throws nếu lỗi
} catch (err) {
  if (err instanceof z.ZodError) { ... }
}
```

### Pipeline Validate → Execute trong ToolRegistry

```
rawInput từ Claude
      ↓
  Zod safeParse()
      ├── Fail → trả về { is_error: true, content: "Validation error: ..." }
      └── Pass → typedInput (đã validate + typed)
                    ↓
              handler(typedInput)
                    ├── Throw → trả về { is_error: true, content: "Execution error: ..." }
                    └── Success → { is_error: false, content: "result JSON" }
```

---

## ⚠️ Phần 4 — Error Handling

### 3 loại lỗi trong Tool Use

#### Loại 1: Validation Error
```typescript
// Claude gửi input không hợp lệ
const toolUse = {
  id: "tool_1",
  name: "calculate",
  input: { operation: "divide", a: 10, b: 0 }  // chia cho 0!
};

const result = await registry.execute(toolUseBlock);
// result = { is_error: true, content: "Validation error: Cannot divide by zero" }

// Claude nhận kết quả này và tự điều chỉnh response
```

#### Loại 2: Execution Error
```typescript
// Tool throw exception trong quá trình thực thi
async function unreliableHandler(input) {
  const response = await fetch("https://api.example.com");  // có thể timeout!
  // Nếu fetch throw → ToolRegistry bắt → trả về is_error: true
}

// ToolRegistry.execute() wrap handler trong try/catch:
try {
  const result = await entry.handler(validation.data);
  return { type: "tool_result", tool_use_id: id, content: result };
} catch (err) {
  return {
    type: "tool_result",
    tool_use_id: id,
    content: `Execution error: ${err}`,
    is_error: true   // Claude biết tool thất bại
  };
}
```

#### Loại 3: MaxIterations Error
```typescript
// Ngăn agentic loop chạy vô hạn
const agent = new ClaudeToolAgent(registry, {
  maxIterations: 10,  // Tối đa 10 vòng
});

// Nếu vượt quá → throw MaxIterationsError
// Client bắt và xử lý phù hợp
try {
  const result = await agent.run(prompt);
} catch (err) {
  if (err instanceof MaxIterationsError) {
    console.log("Đã đạt giới hạn vòng lặp");
  }
}
```

### Nguyên tắc: Tool KHÔNG BAO GIỜ throw lên Claude

```typescript
// ❌ Sai — throw exception
async function badHandler(input) {
  throw new Error("Something went wrong");
  // → Claude không biết tool có kết quả gì → conversation bị break
}

// ✅ Đúng — trả về error message
async function goodHandler(input) {
  try {
    const result = await riskyOperation(input);
    return JSON.stringify({ success: true, data: result });
  } catch (err) {
    return JSON.stringify({ success: false, error: String(err) });
    // Claude đọc được và tự điều chỉnh response
  }
}
```

---

## 🤖 Phần 5 — Agentic Loop

### Khái niệm

**Agentic Loop** = Claude tự quyết định cần làm gì để hoàn thành task phức tạp, thực hiện nhiều bước liên tiếp.

```
Không phải: User → 1 tool call → Claude trả lời
Mà là:      User → Claude suy nghĩ → tool call 1 → đọc kết quả
                 → suy nghĩ tiếp → tool call 2 → đọc kết quả
                 → suy nghĩ tiếp → tool call N → Final answer
```

### Ví dụ thực tế

**Prompt:** *"Tìm sách TypeScript rẻ nhất, rồi tính 3 lần giá cuốn đó"*

```
Iteration 1:
  Claude: "Tôi cần tìm sách TypeScript trước"
  Tool: search_database({ query: "TypeScript", sort_by: "price_asc", limit: 1 })
  Result: [{ name: "TypeScript Handbook", price: 30 }]

Iteration 2:
  Claude: "Giá rẻ nhất là $30, giờ cần nhân 3"
  Tool: calculate({ operation: "multiply", a: 30, b: 3 })
  Result: { result: 90, expression: "30 multiply 3 = 90" }

Iteration 3:
  Claude: stop_reason = "end_turn"
  Final: "Cuốn TypeScript Handbook giá $30. 3 lần giá = $90"
```

### ClaudeToolAgent — Agentic Loop Implementation

```typescript
// Sử dụng
const registry = new ToolRegistry();
registerAllTools(registry);

const agent = new ClaudeToolAgent(registry, {
  model: "claude-haiku-3-5",
  maxTokens: 2048,
  maxIterations: 10,     // Bảo vệ khỏi infinite loop
  systemPrompt: "...",
});

const result = await agent.run("Complex multi-step task...");
console.log(result.finalResponse);   // Câu trả lời cuối
console.log(result.toolCallsCount);  // Đã gọi bao nhiêu tool
console.log(result.iterations);      // Bao nhiêu vòng lặp
```

### Pseudocode của Agentic Loop

```
function agenticLoop(prompt):
  messages = [{ role: "user", content: prompt }]
  iterations = 0

  loop:
    iterations++
    if iterations > maxIterations: throw MaxIterationsError

    response = callClaude(messages, tools)

    if response.stop_reason == "end_turn":
      return extractText(response.content)

    if response.stop_reason == "tool_use":
      toolCalls = extractToolUses(response.content)
      toolResults = executeCalls(toolCalls)   // validate + execute

      // Thêm vào message history
      messages.push({ role: "assistant", content: response.content })
      messages.push({ role: "user", content: toolResults })

      continue  // Gọi Claude lại
```

---

## 🌉 Phần 6 — Cầu nối với MCP Protocol

### MCP là gì?

**MCP (Model Context Protocol)** là giao thức chuẩn hóa giúp LLMs kết nối với data sources và tools bên ngoài. Được phát triển bởi Anthropic.

### Tool Use vs MCP

| Khía cạnh | Tool Use (trực tiếp) | MCP |
|-----------|----------------------|-----|
| Nơi định nghĩa tools | Trong code của bạn | MCP Server riêng biệt |
| Khám phá tools | Hardcode trong API call | Dynamic discovery |
| Giao tiếp | Anthropic API | stdio / HTTP+SSE |
| Tái sử dụng | Phải copy-paste giữa projects | Share MCP Server |
| Loại resource | Chỉ tools (functions) | Tools + Resources + Prompts |

### MCP Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCP ARCHITECTURE                      │
└─────────────────────────────────────────────────────────┘

  ┌──────────────┐     JSON-RPC      ┌──────────────────┐
  │  MCP Client  │ ◄──────────────► │   MCP Server     │
  │ (Your App /  │   stdio or SSE   │ (Tool Provider)  │
  │  Claude IDE) │                  │                  │
  └──────────────┘                  │  - Tools         │
         │                          │  - Resources     │
         │ Anthropic API            │  - Prompts       │
         ▼                          └──────────────────┘
  ┌──────────────┐
  │    Claude    │
  │   (LLM)     │
  └──────────────┘
```

### MCP Primitives

```
Tools     → Functions mà Claude có thể gọi (giống Tool Use)
            Ví dụ: search_web(), read_file(), query_db()

Resources → Data mà Claude có thể đọc (read-only)
            Ví dụ: file://./config.json, db://users/all

Prompts   → Templates prompt có thể tái sử dụng
            Ví dụ: "Analyze this code: {{code}}"
```

### ToolRegistry → MCP Server mapping

```typescript
// Hiện tại: Tool Use trực tiếp (trong project này)
const registry = new ToolRegistry();
registry.register(weatherToolDef, weatherSchema, weatherHandler);

// Tương đương với MCP Server:
// server.setRequestHandler(ListToolsRequestSchema, async () => ({
//   tools: registry.getDefinitions()
// }));
//
// server.setRequestHandler(CallToolRequestSchema, async (request) => ({
//   content: [{ type: "text", text: await registry.execute(request.params) }]
// }));
```

### Lộ trình học

```
Tool Use (project này)
    ↓
Hiểu: JSON Schema, Agentic Loop, Error Handling
    ↓
MCP SDK (@modelcontextprotocol/sdk)
    ↓
Tạo MCP Server → đăng ký cùng tools này
    ↓
Kết nối với Claude Desktop / Cursor / Cline
```

---

## 📊 Phần 7 — Tool Choice & Control

### tool_choice parameter

```typescript
// Bắt buộc Claude dùng tool (any)
{ tool_choice: { type: "any" } }

// Bắt buộc dùng tool cụ thể
{ tool_choice: { type: "tool", name: "get_weather" } }

// Để Claude tự quyết (mặc định)
{ tool_choice: { type: "auto" } }

// Không dùng tool nào
{ tool_choice: { type: "none" } }
```

### stop_reason values

| stop_reason | Ý nghĩa | Action |
|-------------|---------|--------|
| `"end_turn"` | Claude hoàn thành ✅ | Lấy text response |
| `"tool_use"` | Claude muốn dùng tool 🔧 | Execute tool → gửi kết quả |
| `"max_tokens"` | Response bị cắt ⚠️ | Tăng max_tokens hoặc xử lý partial |
| `"stop_sequence"` | Gặp stop sequence | Xử lý custom |

---

## 🔄 Phần 8 — ToolRegistry Pattern

### Tại sao dùng Registry Pattern?

```typescript
// ❌ Không có registry — phải if/else cho mỗi tool
async function executeTool(name: string, input: unknown) {
  if (name === "get_weather") {
    const validated = weatherSchema.parse(input);
    return weatherHandler(validated);
  } else if (name === "calculate") {
    const validated = calculatorSchema.parse(input);
    return calculatorHandler(validated);
  } else if (name === "search_database") {
    // ...
  }
  // → Code dài, khó maintain, không extensible
}

// ✅ Có registry — mọi thứ tự động
const registry = new ToolRegistry();
registry.register(weatherToolDef, weatherSchema, weatherHandler);
registry.register(calculatorToolDef, calculatorSchema, calculatorHandler);

// Execute bất kỳ tool nào — không cần biết tên
const result = await registry.execute(toolUseBlock);
```

### Thêm tool mới chỉ cần 1 bước

```typescript
// Bước 1: Thêm definition
const myTool: ToolDefinition = {
  name: "my_tool",
  description: "...",
  input_schema: { ... }
};

// Bước 2: Thêm Zod schema
const mySchema = z.object({ ... });

// Bước 3: Viết handler
const myHandler = async (input: z.infer<typeof mySchema>) => {
  return "result";
};

// Bước 4: Đăng ký — xong!
registry.register(myTool, mySchema, myHandler);
// → Tự động available cho Claude trong API call tiếp theo
```

---

## 📈 Best Practices

### 1. Viết description rõ ràng

```typescript
// ❌ Mơ hồ
description: "Get weather"

// ✅ Rõ ràng và có ví dụ
description: "Lấy thông tin thời tiết hiện tại tại một thành phố cụ thể. " +
             "Trả về nhiệt độ, độ ẩm, tốc độ gió và mô tả thời tiết. " +
             "Ví dụ: get_weather({ city: 'Hanoi', unit: 'celsius' })"
```

### 2. Dùng enum thay vì string tự do

```typescript
// ❌
unit: { type: "string", description: "celsius or fahrenheit" }

// ✅
unit: { type: "string", enum: ["celsius", "fahrenheit"] }
```

### 3. Luôn có maxIterations trong agentic loop

```typescript
// ❌ Nguy hiểm — có thể loop vô hạn
const agent = new ClaudeToolAgent(registry, { maxTokens: 1024 });

// ✅ An toàn
const agent = new ClaudeToolAgent(registry, {
  maxTokens: 1024,
  maxIterations: 10  // Giới hạn tối đa
});
```

### 4. Tool results nên là JSON string

```typescript
// ❌ Plain text — khó parse
return "Temperature is 32 degrees";

// ✅ JSON — Claude dễ xử lý hơn
return JSON.stringify({
  temperature: 32,
  unit: "celsius",
  city: "Hanoi"
});
```

### 5. Set appropriate max_tokens

```typescript
// Tool use cần nhiều token hơn chat thông thường
// vì phải chứa cả tool_use blocks và tool_result blocks
const agent = new ClaudeToolAgent(registry, {
  maxTokens: 4096,  // Tăng lên cho agentic tasks phức tạp
});
```

---

## 🚀 Tổng kết

```
Tool Use Foundation
├── JSON Schema → Claude hiểu tool
├── Zod Validation → Validate input trước khi chạy
├── Error Handling → is_error pattern, MaxIterations guard
└── Agentic Loop → Multi-step reasoning

        ↓ (nền tảng cho)

MCP Protocol
├── MCP Server → đóng gói tools thành service
├── MCP Client → consume tools từ server
├── Resources → read-only data access
└── Prompts → reusable prompt templates

        ↓ (cho phép)

Production AI Agents
├── Database queries
├── Web search
├── Code execution
├── File system access
└── API integrations
```

---

*Built with TypeScript + Anthropic SDK + Zod*
