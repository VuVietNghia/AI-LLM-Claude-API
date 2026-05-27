# Anthropic TypeScript SDK — Hướng dẫn Toàn diện

> Giải thích Messages API, Streaming SSE, Multi-Turn Conversations  
> Áp dụng **Dependency Injection** để chuyển đổi model linh hoạt

---

## 📁 Cấu trúc Project

```
Anthropic SDK/
├── src/
│   ├── types.ts                    ← Interfaces & Types (DI contracts)
│   ├── AnthropicClient.ts          ← Concrete implementation
│   ├── index.ts                    ← Entry point
│   └── examples/
│       ├── 01_basic_message.ts     ← Messages API cơ bản
│       ├── 02_streaming_sse.ts     ← Streaming SSE
│       ├── 03_multi_turn.ts        ← Multi-turn conversations
│       ├── 04_system_prompt.ts     ← System prompts & personas
│       └── 05_token_counting.ts    ← Token counting & cost
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
# Điền API key vào .env:  ANTHROPIC_API_KEY=sk-ant-...

# 3. Chạy example
npm run example:basic
npm run example:streaming
npm run example:multiturn
npm run example:system
npm run example:tokens
```

---

## 🧩 Phần 1 — Dependency Injection Pattern

### Tại sao cần Dependency Injection?

Không có DI (❌):
```typescript
// Business logic tự tạo dependency → bị khoá cứng với claude-haiku-3-5
class ChatService {
  private client = new Anthropic();

  async chat(msg: string) {
    return this.client.messages.create({
      model: "claude-haiku-3-5", // ← hardcode, muốn đổi phải sửa code
      ...
    });
  }
}
```

Có DI (✅):
```typescript
// Business logic nhận dependency từ bên ngoài → linh hoạt hoàn toàn
class ChatService {
  constructor(private client: IAIClient) {} // ← inject từ ngoài

  async chat(msg: string) {
    return this.client.sendMessage(msg); // không biết model là gì
  }
}

// Tại nơi khởi tạo (composition root):
const service = new ChatService(
  new AnthropicClient({ model: "claude-opus-4-5", maxTokens: 1024 })
  // Đổi model? Chỉ thay 1 dòng này!
);
```

### Interface IAIClient — "Hợp đồng" DI

```typescript
// src/types.ts
export interface IAIClient {
  sendMessage(userMessage: string): Promise<MessageResult>;
  sendMessageStream(msg: string, onChunk: (chunk: string) => void): Promise<MessageResult>;
  sendConversation(messages: ConversationMessage[]): Promise<MessageResult>;
  sendConversationStream(messages: ConversationMessage[], onChunk: (chunk: string) => void): Promise<MessageResult>;
  getConfig(): AIClientConfig;
  setModel(model: ClaudeModel): void;
}
```

### Chuyển đổi Model — 3 cách

**Cách 1: Constructor Injection** (khuyến nghị)
```typescript
// Tạo client với model muốn dùng
const client: IAIClient = new AnthropicClient({
  model: "claude-opus-4-5",   // ← chỉ đổi dòng này
  maxTokens: 1024,
});
```

**Cách 2: Hot-swap lúc runtime**
```typescript
const client = new AnthropicClient({ model: "claude-haiku-3-5", maxTokens: 512 });
client.setModel("claude-sonnet-4-5"); // switch ngay lập tức
```

**Cách 3: Factory function**
```typescript
function createClient(model: ClaudeModel): IAIClient {
  return new AnthropicClient({ model, maxTokens: 1024 });
}

const haiku  = createClient("claude-haiku-3-5");
const sonnet = createClient("claude-sonnet-4-5");
const opus   = createClient("claude-opus-4-5");
```

---

## 📨 Phần 2 — Messages API

### Khái niệm

Messages API là endpoint chính của Anthropic (`POST /v1/messages`).

| Tham số | Mô tả | Bắt buộc |
|---------|-------|----------|
| `model` | Model Claude muốn dùng | ✅ |
| `max_tokens` | Số tokens tối đa cho **output** | ✅ |
| `messages` | Mảng các tin nhắn (lịch sử hội thoại) | ✅ |
| `system` | System prompt (hướng dẫn ngầm cho model) | ❌ |
| `temperature` | Độ sáng tạo: 0.0 (deterministic) → 1.0 (creative) | ❌ |

### Response Object

```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "Hello! How can I help you?" }
  ],
  "model": "claude-haiku-3-5-20241022",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 25,
    "output_tokens": 13
  }
}
```

### stop_reason

| Giá trị | Ý nghĩa |
|---------|---------|
| `"end_turn"` | Model hoàn thành response tự nhiên ✅ |
| `"max_tokens"` | Response bị cắt vì chạm `max_tokens` ⚠️ |
| `"stop_sequence"` | Gặp stop sequence tùy chỉnh |
| `"tool_use"` | Model muốn gọi tool |

### Code (xem `src/examples/01_basic_message.ts`)

```typescript
// IAIClient.sendMessage() → gọi SDK bên dưới:
const response = await this.sdk.messages.create({
  model: this.config.model,
  max_tokens: this.config.maxTokens,
  system: this.config.systemPrompt,  // optional
  messages: [
    { role: "user", content: "Hello!" }
  ],
});

// Extract text từ content array
const text = response.content.find(b => b.type === "text")?.text ?? "";
```

---

## ⚡ Phần 3 — Streaming SSE (Server-Sent Events)

### Khái niệm

Thay vì chờ toàn bộ response rồi nhận một lúc, **streaming** cho phép server gửi từng phần nhỏ (chunk) ngay khi tạo ra.

```
Không streaming:  [===== đợi 3-5 giây =====] → nhận toàn bộ text
Có streaming:     [t][y][p][e][s][ ][l][i][k][e][ ][t][h][i][s] → xuất hiện dần
```

### SSE Event Flow

```
Client                              Server
  │                                   │
  │──── POST /v1/messages (stream) ──▶│
  │                                   │
  │◀─── event: message_start ─────────│  {"type":"message_start","message":{...}}
  │◀─── event: content_block_start ───│  {"type":"content_block_start","index":0}
  │◀─── event: content_block_delta ───│  {"delta":{"type":"text_delta","text":"Hello"}}
  │◀─── event: content_block_delta ───│  {"delta":{"type":"text_delta","text":", "}}
  │◀─── event: content_block_delta ───│  {"delta":{"type":"text_delta","text":"world!"}}
  │◀─── event: content_block_stop ────│
  │◀─── event: message_delta ─────────│  {"usage":{...},"stop_reason":"end_turn"}
  │◀─── event: message_stop ──────────│
```

### Các cách dùng streaming trong SDK

```typescript
// Cách A: for-await (recommended — dùng trong project này)
const stream = await sdk.messages.stream({ ... });
for await (const chunk of stream) {
  if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
    process.stdout.write(chunk.delta.text);
  }
}
const finalMsg = await stream.finalMessage(); // lấy metadata sau khi xong

// Cách B: Event-based
sdk.messages.stream({ ... })
  .on("text", (text) => process.stdout.write(text))
  .on("finalMessage", (msg) => console.log("done", msg.usage));

// Cách C: Stream + toReadableStream() → pipe vào HTTP response
const stream = await sdk.messages.stream({ ... });
stream.toReadableStream().pipe(res); // Express.js
```

### Code (xem `src/examples/02_streaming_sse.ts`)

```typescript
// AnthropicClient.sendMessageStream() — simplified:
const stream = await this.sdk.messages.stream({
  model: this.config.model,
  max_tokens: this.config.maxTokens,
  messages: [{ role: "user", content: userMessage }],
});

for await (const chunk of stream) {
  if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
    onChunk(chunk.delta.text); // callback được inject từ bên ngoài
  }
}

const finalMessage = await stream.finalMessage(); // đầy đủ metadata
```

---

## 💬 Phần 4 — Multi-Turn Conversations

### Khái niệm

**Anthropic API là STATELESS** — server không lưu lịch sử hội thoại.

Client (bạn) phải:
1. Lưu lịch sử hội thoại (`ConversationMessage[]`)
2. Gửi **toàn bộ lịch sử** kèm mỗi request mới
3. Thêm response của assistant vào lịch sử

```
Request 1: messages = [ {user: "Hi!"} ]
Response 1: {assistant: "Hello!"}

Request 2: messages = [
  {user: "Hi!"},           ← lịch sử từ trước
  {assistant: "Hello!"},   ← response trước
  {user: "My name is Nghia"} ← tin nhắn mới
]
Response 2: {assistant: "Nice to meet you, Nghia!"}
```

### Quy tắc bắt buộc

```
✅ user → assistant → user → assistant  (đúng)
❌ user → user → assistant              (lỗi: 2 user liên tiếp)
❌ assistant → user                     (lỗi: phải bắt đầu bằng user)
❌ (empty)                              (lỗi: messages không được rỗng)
```

### ConversationManager Pattern

```typescript
class ConversationManager {
  private history: ConversationMessage[] = [];

  constructor(private client: IAIClient) {} // ← inject client

  async chat(userMessage: string): Promise<string> {
    // 1. Thêm tin nhắn user vào history
    this.history.push({ role: "user", content: userMessage });

    // 2. Gửi TOÀN BỘ history lên API
    const result = await this.client.sendConversation(this.history);

    // 3. Thêm response vào history để lần sau dùng
    this.history.push({ role: "assistant", content: result.content });

    return result.content;
  }
}
```

### Xem code: `src/examples/03_multi_turn.ts`

---

## 🎭 Phần 5 — System Prompts

### Khái niệm

System prompt là hướng dẫn ưu tiên cao nhất cho model, truyền qua field `system` (không phải trong `messages`).

```typescript
sdk.messages.create({
  model: "claude-haiku-3-5",
  max_tokens: 1024,
  system: "Bạn là một chuyên gia TypeScript. Luôn trả lời bằng tiếng Việt.",
  messages: [{ role: "user", content: "What is a generic?" }],
  // → model sẽ trả lời bằng tiếng Việt
});
```

### Dùng DI để tạo nhiều "Persona"

```typescript
// Mỗi persona = 1 AnthropicClient với systemPrompt khác nhau
const teacher: IAIClient   = new AnthropicClient({ model: "...", systemPrompt: "Bạn là giáo viên..." });
const devBot: IAIClient    = new AnthropicClient({ model: "...", systemPrompt: "You are a senior dev..." });
const copyBot: IAIClient   = new AnthropicClient({ model: "...", systemPrompt: "You are a marketer..." });

// Business logic dùng chung, persona inject từ ngoài
await myFunction(teacher);
await myFunction(devBot);
await myFunction(copyBot);
```

---

## 💰 Phần 6 — Token Counting & Pricing

### Tokens là gì?

```
Text:    "Hello, TypeScript!"
Tokens:  ["Hello", ",", " Type", "Script", "!"]  → 5 tokens
```

| Rule of thumb | Giá trị |
|--------------|---------|
| 1 token | ≈ 4 ký tự tiếng Anh |
| 1 token | ≈ 0.75 từ tiếng Anh |
| 100 tokens | ≈ 75 từ |

### Bảng Giá Models (tháng 5/2026, USD/1M tokens)

| Model | Input | Output | Tốc độ | Dùng khi |
|-------|-------|--------|--------|---------|
| claude-haiku-3-5 | $0.25 | $1.25 | Nhanh nhất | Chatbot, tasks đơn giản |
| claude-sonnet-4-5 | $3 | $15 | Cân bằng | Đa số production use cases |
| claude-opus-4-5 | $15 | $75 | Chậm nhất | Tasks phức tạp, cần reasoning cao |

### Ước tính chi phí

```typescript
function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = { "claude-haiku-3-5": { in: 0.25, out: 1.25 }, ... };
  return (inputTokens / 1e6) * pricing[model].in
       + (outputTokens / 1e6) * pricing[model].out;
}

const result = await client.sendMessage("Hello!");
console.log(`Cost: $${estimateCost(result.model, result.inputTokens, result.outputTokens)}`);
```

---

## 🔄 Quick Reference — Chuyển đổi Model

```typescript
import { AnthropicClient } from "./AnthropicClient";
import type { IAIClient, ClaudeModel } from "./types";

// ─── Cách 1: Đổi model khi khởi tạo ──────────────────────────
const client: IAIClient = new AnthropicClient({
  model: "claude-sonnet-4-5",  // ← thay đổi ở đây
  maxTokens: 1024,
});

// ─── Cách 2: Hot-swap lúc runtime ────────────────────────────
client.setModel("claude-haiku-3-5");      // switch sang Haiku (rẻ hơn)
client.setModel("claude-opus-4-5");       // switch sang Opus (mạnh hơn)

// ─── Cách 3: Tạo nhiều client song song ──────────────────────
const clients: Record<string, IAIClient> = {
  fast:     new AnthropicClient({ model: "claude-haiku-3-5",  maxTokens: 256 }),
  balanced: new AnthropicClient({ model: "claude-sonnet-4-5", maxTokens: 1024 }),
  powerful: new AnthropicClient({ model: "claude-opus-4-5",   maxTokens: 4096 }),
};

// Chọn client phù hợp với task
const result = await clients["fast"].sendMessage("Quick question");
```

---

## 📊 Tổng kết so sánh

| Feature | Non-Streaming | Streaming |
|---------|--------------|-----------|
| Khi nào dùng | Response ngắn, batch processing | Chatbot, UX real-time |
| Latency cảm nhận | Cao (đợi toàn bộ) | Thấp (thấy text ngay) |
| Độ phức tạp code | Thấp | Trung bình |
| Final metadata | Trong response | `stream.finalMessage()` |

| Feature | Single-Turn | Multi-Turn |
|---------|------------|------------|
| Stateful | ❌ API stateless | ✅ Client quản lý |
| Context | Chỉ 1 message | Toàn bộ lịch sử |
| Token usage | Thấp | Tăng dần theo lịch sử |
| Reset | N/A | `manager.clearHistory()` |
