# 🧠 Claude: Prompt Caching & Vision

> **Học Claude nâng cao**: Tối ưu chi phí với Prompt Caching và khám phá khả năng phân tích hình ảnh với Vision API.

---

## 📚 Mục lục

1. [Prompt Caching là gì?](#1-prompt-caching-là-gì)
2. [Vision là gì?](#2-claude-vision-là-gì)
3. [Cấu trúc Project](#3-cấu-trúc-project)
4. [Cài đặt & Chạy Demo](#4-cài-đặt--chạy-demo)
5. [Chi tiết từng Demo](#5-chi-tiết-từng-demo)
6. [So sánh Chi phí & Hiệu suất](#6-so-sánh-chi-phí--hiệu-suất)
7. [Best Practices](#7-best-practices)

---

## 1. Prompt Caching là gì?

### 🧩 Khái niệm cơ bản

**Prompt Caching** là tính năng cho phép Claude **lưu trữ tạm thời (cache)** một phần của prompt — thường là system prompt hoặc context dài — để tái sử dụng trong các request tiếp theo.

```
Không có Cache:
┌─────────────────────────────────────────┐
│ Request 1: [System (1000 tokens)] + [Q1] │  → Xử lý 1000 + Q1 tokens
│ Request 2: [System (1000 tokens)] + [Q2] │  → Xử lý 1000 + Q2 tokens
│ Request 3: [System (1000 tokens)] + [Q3] │  → Xử lý 1000 + Q3 tokens
│ Chi phí:   3 × (1000 tokens × full price) │
└─────────────────────────────────────────┘

Có Cache:
┌──────────────────────────────────────────────────────┐
│ Request 1: [System (1000 tokens) → TẠO CACHE] + [Q1] │  → Tốn 1000 tokens (cache write)
│ Request 2: [Đọc cache] + [Q2]                         │  → Chỉ tốn Q2 tokens
│ Request 3: [Đọc cache] + [Q3]                         │  → Chỉ tốn Q3 tokens
│ Chi phí:   1 × cache_write + 2 × cache_read (~10%)    │
└──────────────────────────────────────────────────────┘
```

### 💡 Tại sao cần Prompt Caching?

| Tình huống | Vấn đề | Giải pháp |
|---|---|---|
| Chatbot có rulebook dài | Mỗi message lại gửi lại 10,000 token rules | Cache rules, chỉ gửi câu hỏi mới |
| RAG (Retrieval Augmented) | Gửi cùng document nhiều lần | Cache document context |
| Few-shot examples | Repeat 50 ví dụ mỗi request | Cache examples, thêm câu hỏi mới |
| Multi-turn conversation | Context dài lên theo từng turn | Cache đoạn đầu conversation |

### 🔧 Cách hoạt động kỹ thuật

#### Cache Control Header

```typescript
// Kích hoạt cache bằng cách thêm cache_control vào content block
const response = await client.messages.create({
  model: "claude-opus-4-5",
  system: [
    {
      type: "text",
      text: "System prompt rất dài...",
      cache_control: { type: "ephemeral" }  // ← ĐÂY là chìa khoá!
    }
  ],
  messages: [{ role: "user", content: "Câu hỏi" }]
});
```

#### Các loại cache_control

| Loại | Mô tả | TTL |
|---|---|---|
| `ephemeral` | Cache tạm thời (duy nhất loại hiện tại) | 5 phút |

> **Lưu ý**: Claude hiện chỉ hỗ trợ `ephemeral` cache. TTL 5 phút nghĩa là cache sẽ tự xoá sau 5 phút không dùng.

### 📊 Cache Usage trong Response

```typescript
const usage = response.usage;

console.log(usage.input_tokens);              // Tokens nhận từ input (không cached)
console.log(usage.cache_creation_input_tokens); // Tokens dùng để TẠO cache (lần đầu)
console.log(usage.cache_read_input_tokens);     // Tokens ĐỌC từ cache (tiết kiệm!)
console.log(usage.output_tokens);              // Tokens sinh ra trong response
```

### 💰 Chi phí Prompt Caching

| Loại | Chi phí (claude-opus-4-5) |
|---|---|
| Cache Write (tạo cache) | 25% phí bổ sung so với input bình thường |
| Cache Read (đọc cache) | **90% rẻ hơn** so với input bình thường |
| Input bình thường | 100% (baseline) |

**Ví dụ tính toán:**
```
System prompt: 10,000 tokens
Câu hỏi trung bình: 50 tokens
Số lần hỏi: 100

❌ Không cache: 100 × 10,050 tokens = 1,005,000 tokens @ full price
✅ Có cache:   1 × 10,050 (write) + 99 × 50 (read) + 99 × 10,000 (cache read @ 10%)
             = 10,050 + 4,950 + 99,000 = 114,000 "effective" tokens
→ Tiết kiệm ~88% chi phí!
```

### 🎯 TTL Strategies (Chiến lược thời gian sống)

**5 phút TTL** — Phù hợp cho:
- ✅ Conversational AI (user hỏi liên tục)
- ✅ Batch processing trong thời gian ngắn
- ✅ Interactive applications

**Khi cache hết hạn:**
- Cache tự động được tạo lại ở lần request tiếp theo
- Bạn không cần code xử lý thêm gì — SDK tự lo!

**Chiến lược tối ưu:**
```typescript
// Đặt cache_control ở điểm "ổn định" nhất trong prompt
// Phần thường KHÔNG thay đổi → cache
// Phần thường THAY ĐỔI → không cache

system: [
  {
    type: "text",
    text: "PHẦN CỐ ĐỊNH: Rules, context, document...",
    cache_control: { type: "ephemeral" }  // ← Cache phần này
  },
  {
    type: "text",
    text: "PHẦN ĐỘNG: User preferences, current date..."
    // Không cache phần này vì nó thay đổi
  }
]
```

---

## 2. Claude Vision là gì?

### 🖼️ Khái niệm

**Claude Vision** là khả năng cho phép Claude **"nhìn"** và **hiểu nội dung hình ảnh**. Claude có thể:

- 📝 Mô tả nội dung ảnh
- 🔍 Trích xuất thông tin (text, số liệu, bảng biểu)
- 🆚 So sánh nhiều ảnh
- 📊 Phân tích biểu đồ và đồ thị
- 💡 Trả lời câu hỏi về ảnh
- 🔎 Nhận diện vật thể, màu sắc, bố cục

### 📐 Thông số kỹ thuật

| Thông số | Giá trị |
|---|---|
| Định dạng hỗ trợ | JPEG, PNG, GIF, WebP |
| Kích thước tối đa | 5MB / ảnh |
| Số ảnh tối đa / request | 20 ảnh |
| Độ phân giải tối đa | 8,000 × 8,000 px |

### 🔌 2 Cách gửi ảnh cho Claude

#### Cách 1: URL (Khuyến nghị cho ảnh công khai)

```typescript
{
  type: "image",
  source: {
    type: "url",           // ← Loại: URL
    url: "https://..."     // ← URL công khai, Claude tự tải
  }
}
```

**Ưu điểm:** Không tốn payload size, không cần upload ảnh.  
**Yêu cầu:** URL phải public, Claude server phải truy cập được.

#### Cách 2: Base64 (Cho ảnh local/private)

```typescript
import * as fs from "fs";

const imageData = fs.readFileSync("image.png").toString("base64");

{
  type: "image",
  source: {
    type: "base64",          // ← Loại: Base64
    media_type: "image/png", // ← MIME type: image/jpeg | image/png | image/gif | image/webp
    data: imageData          // ← Chuỗi Base64
  }
}
```

**Ưu điểm:** Bảo mật hơn, không cần URL public.  
**Nhược điểm:** Payload lớn hơn ~33%.

### 📏 Cách Claude đếm Tokens cho ảnh

Claude xử lý ảnh theo **tiles (ô)** 512×512 pixel:

```
Ảnh nhỏ (≤ 512×512):   1 tile   = 1,334 tokens (minimum)
Ảnh trung bình:         Tính theo số tiles cần thiết
Ảnh lớn (2000×2000):   ~5,000 tokens

Công thức:
  tiles = ceil(width/512) × ceil(height/512)
  tokens = max(1334, tiles × 750)
```

**Tip tối ưu**: Resize ảnh về kích thước hợp lý trước khi gửi để tiết kiệm tokens.

### 🎭 Các Use Cases thực tế

| Use Case | Mô tả |
|---|---|
| OCR thông minh | Đọc text từ ảnh có ngữ cảnh |
| Kiểm tra sản phẩm | Validate ảnh upload của user |
| Phân tích giao diện | Review UI/UX từ screenshot |
| Đọc biểu đồ | Trích xuất data từ chart/graph |
| Phân loại ảnh | Categorize ảnh theo nội dung |
| Medical imaging | Hỗ trợ đọc hình ảnh y tế |

---

## 3. Cấu trúc Project

```
Prompt Caching & Vision/
├── .env.example                        # Template biến môi trường
├── package.json                        # Dependencies & scripts
├── tsconfig.json                       # TypeScript config
├── README.md                           # Tài liệu này
└── src/
    ├── index.ts                        # Entry point chạy tất cả demos
    └── examples/
        ├── 01_prompt_caching.ts        # Demo: Cache với system prompt lớn
        ├── 02_vision_url.ts            # Demo: Phân tích ảnh qua URL
        ├── 03_vision_base64.ts         # Demo: Phân tích ảnh qua Base64
        ├── 04_vision_multi_image.ts    # Demo: So sánh nhiều ảnh
        └── 05_cache_with_vision.ts     # Demo: Kết hợp Cache + Vision
```

---

## 4. Cài đặt & Chạy Demo

### Bước 1: Cài đặt dependencies

```bash
cd "Prompt Caching & Vision"
npm install
```

### Bước 2: Cấu hình API key

```bash
# Copy file template
copy .env.example .env

# Chỉnh sửa .env, thêm API key của bạn
# ANTHROPIC_API_KEY=sk-ant-...
```

Lấy API key tại: https://console.anthropic.com/

### Bước 3: Chạy demos

```bash
# Chạy tất cả demos
npm run demo:all

# Hoặc chạy từng demo riêng
npm run demo:caching          # Demo 1: Prompt Caching
npm run demo:vision:url       # Demo 2: Vision qua URL
npm run demo:vision:base64    # Demo 3: Vision qua Base64
npm run demo:vision:multi     # Demo 4: Nhiều ảnh
npm run demo:cache-vision     # Demo 5: Cache + Vision kết hợp
```

---

## 5. Chi tiết từng Demo

### Demo 1: `01_prompt_caching.ts` — Prompt Caching cơ bản

**Mục tiêu**: Hiểu cách `cache_control` hoạt động khi hỏi nhiều câu hỏi với cùng một system prompt.

**Kịch bản**: Chuyên gia lịch sử Việt Nam với tài liệu tham khảo dài → hỏi 3 câu hỏi khác nhau.

**Output mong đợi**:
```
--- Câu hỏi 1 ---
Cache creation tokens: 2540   ← Tạo cache lần đầu
Cache read tokens:     0      ← Chưa đọc cache

--- Câu hỏi 2 ---
Cache creation tokens: 0      ← Không tạo cache mới
Cache read tokens:     2540   ← ĐỌC từ cache! Tiết kiệm 90%!

--- Câu hỏi 3 ---
Cache read tokens:     2540   ← Tiếp tục đọc từ cache!
```

**Code key:**
```typescript
system: [{
  type: "text",
  text: LARGE_DOCUMENT,
  cache_control: { type: "ephemeral" }  // ← Kích hoạt cache
}]
```

---

### Demo 2: `02_vision_url.ts` — Vision qua URL

**Mục tiêu**: Gửi URL ảnh công khai và nhận phân tích từ Claude.

**Kịch bản**: Phân tích ảnh PNG transparency từ Wikipedia.

**Code key:**
```typescript
content: [
  {
    type: "image",
    source: { type: "url", url: "https://example.com/image.png" }
  },
  { type: "text", text: "Mô tả ảnh này..." }
]
```

---

### Demo 3: `03_vision_base64.ts` — Vision qua Base64

**Mục tiêu**: Encode ảnh thành Base64 và gửi trực tiếp trong request.

**Kịch bản**: Phân tích ảnh local (hoặc ảnh inline) mà không cần URL public.

**Code key:**
```typescript
import * as fs from "fs";

const imageData = fs.readFileSync("./image.png").toString("base64");

source: {
  type: "base64",
  media_type: "image/png",
  data: imageData
}
```

---

### Demo 4: `04_vision_multi_image.ts` — Nhiều ảnh cùng lúc

**Mục tiêu**: Gửi nhiều ảnh và yêu cầu Claude so sánh, phân tích.

**Kịch bản**: So sánh logo Python, JavaScript, TypeScript — tư vấn chọn công nghệ.

**Code key:**
```typescript
content: [
  { type: "image", source: { type: "url", url: url1 } },  // ảnh 1
  { type: "image", source: { type: "url", url: url2 } },  // ảnh 2
  { type: "image", source: { type: "url", url: url3 } },  // ảnh 3
  { type: "text", text: "So sánh 3 logo này..." }
]
```

---

### Demo 5: `05_cache_with_vision.ts` — Cache + Vision kết hợp ⭐

**Mục tiêu**: Kết hợp cả 2 tính năng — cache ruleset lớn + phân tích ảnh mới mỗi lần.

**Kịch bản thực tế**: Hệ thống kiểm tra ảnh sản phẩm E-commerce.
- **Cache**: Bộ tiêu chuẩn kiểm tra ảnh (cố định, không đổi)
- **Vision**: Từng ảnh sản phẩm mới cần kiểm tra

**Tại sao đây là pattern tốt nhất**:
```
Request 1: Cache(Ruleset 3000 tokens) + Vision(Product1)
  → cache_creation: 3000 tokens
  
Request 2: Cache(READ!) + Vision(Product2)
  → cache_read: 3000 tokens (90% rẻ hơn!)
  → Chỉ trả tiền cho ảnh mới!
```

---

## 6. So sánh Chi phí & Hiệu suất

### Prompt Caching — So sánh Token Cost

```
Giả sử: System prompt = 5,000 tokens, 50 requests/ngày

Không cache:
  50 requests × 5,000 tokens = 250,000 input tokens/ngày
  Chi phí: 250,000 × $15/1M = $3.75/ngày = ~$112/tháng

Có cache (5000 tokens > 1024 min):
  1 cache write: 5,000 × $18.75/1M = $0.094 (25% phụ phí)
  49 cache reads: 49 × 5,000 × $1.50/1M = $0.368 (90% giảm giá)
  Chi phí: $0.094 + $0.368 = ~$0.46/ngày = ~$14/tháng

→ Tiết kiệm ~87.5% chi phí mỗi tháng! ($112 → $14)
```

> **Lưu ý**: Giá trên là ví dụ minh hoạ. Kiểm tra giá thực tế tại [Anthropic Pricing](https://www.anthropic.com/pricing).

### Vision — Token Cost theo kích thước ảnh

| Kích thước ảnh | Số Tiles | Tokens xấp xỉ |
|---|---|---|
| 100×100 | 1 | ~1,334 tokens |
| 512×512 | 1 | ~1,334 tokens |
| 1024×1024 | 4 | ~3,000 tokens |
| 2048×2048 | 16 | ~12,000 tokens |
| 4096×4096 | 64 | ~48,000 tokens |

**Tip**: Resize ảnh về ≤ 1024×1024 để cân bằng chất lượng và chi phí.

---

## 7. Best Practices

### ✅ Prompt Caching — Nên làm

```typescript
// ✅ Cache các phần CỐ ĐỊNH và DÀI
system: [{
  type: "text",
  text: longDocument,           // Dài, ít thay đổi
  cache_control: { type: "ephemeral" }
}]

// ✅ Đặt cache_control ở breakpoint ổn định
// ✅ Cache phần đầu prefix (không phải cuối)
// ✅ Tối thiểu 1024 tokens mới có lợi khi cache

// ❌ Không cache phần động (timestamp, user-specific data)
// ❌ Không cache prompt ngắn < 1024 tokens
```

### ✅ Vision — Nên làm

```typescript
// ✅ Resize ảnh về kích thước phù hợp trước khi gửi
// ✅ Dùng URL cho ảnh public (tiết kiệm bandwidth)
// ✅ Dùng Base64 cho ảnh nhạy cảm/private
// ✅ Cung cấp context về ảnh trong text prompt

// ❌ Không gửi ảnh > 5MB
// ❌ Không gửi > 20 ảnh / request
// ❌ Không dùng GIF động (chỉ frame đầu được xử lý)
```

### ✅ Kết hợp Cache + Vision

```typescript
// ✅ Pattern tối ưu cho production:
messages.create({
  system: [{
    type: "text",
    text: STABLE_CONTEXT,         // Rules, knowledge base
    cache_control: { type: "ephemeral" }  // Cache cái này
  }],
  messages: [{
    role: "user",
    content: [
      { type: "image", source: { type: "url", url: newImageUrl } },  // Ảnh mới
      { type: "text", text: "Phân tích ảnh theo rules trên..." }
    ]
  }]
})
```

---

## 📖 Tài liệu tham khảo

- [Anthropic Prompt Caching Docs](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching)
- [Anthropic Vision Docs](https://docs.anthropic.com/en/docs/build-with-claude/vision)
- [Claude Pricing](https://www.anthropic.com/pricing)
- [Anthropic Cookbook - Caching](https://github.com/anthropics/anthropic-cookbook/tree/main/misc/prompt_caching.ipynb)

---

## 🔗 Các project liên quan

- [`../Anthropic SDK`](../Anthropic%20SDK) — Cơ bản về Messages API, Streaming, Multi-turn
- [`../Tool Use Fuction Calling`](../Tool%20Use%20Fuction%20Calling) — Function Calling với Claude
- [`../LM Studio Tool Use Fuction Calling`](../LM%20Studio%20Tool%20Use%20Fuction%20Calling) — Tool Use với LM Studio (local LLM)
