import { z } from "zod";
import type { ToolDefinition } from "../types";
import type { ToolRegistry } from "../ToolRegistry";

// ============================================================
// TOOL DEFINITIONS — Bộ tools mẫu
// ============================================================
//
// File này định nghĩa tất cả tools với:
//   1. ToolDefinition (JSON Schema) → truyền cho Claude
//   2. Zod validator              → validate input
//   3. Handler function           → logic thực tế
//
// ============================================================

// ----------------------------------------------------------
// TOOL 1: get_weather
// ----------------------------------------------------------
// Giả lập API thời tiết — minh họa basic tool use

export const weatherToolDef: ToolDefinition = {
  name: "get_weather",
  description:
    "Lấy thông tin thời tiết hiện tại tại một thành phố. " +
    "Trả về nhiệt độ, độ ẩm, tốc độ gió và mô tả thời tiết.",
  input_schema: {
    type: "object",
    properties: {
      city: {
        type: "string",
        description: "Tên thành phố cần lấy thông tin thời tiết (ví dụ: Hanoi, Ho Chi Minh City)",
      },
      unit: {
        type: "string",
        description: "Đơn vị nhiệt độ",
        enum: ["celsius", "fahrenheit"],
      },
    },
    required: ["city"],
  },
};

export const weatherSchema = z.object({
  city: z.string().min(1, "City name cannot be empty").max(100),
  unit: z.enum(["celsius", "fahrenheit"]).default("celsius"),
});
export type WeatherInput = z.infer<typeof weatherSchema>;

export async function weatherHandler(input: WeatherInput): Promise<string> {
  // Simulate API call delay
  await new Promise((r) => setTimeout(r, 100));

  // Mock weather data
  const mockData: Record<string, { temp: number; humidity: number; wind: number; desc: string }> = {
    "hanoi":           { temp: 32, humidity: 75, wind: 12, desc: "Partly cloudy" },
    "ho chi minh city":{ temp: 35, humidity: 80, wind: 8,  desc: "Sunny" },
    "hcmc":            { temp: 35, humidity: 80, wind: 8,  desc: "Sunny" },
    "da nang":         { temp: 30, humidity: 70, wind: 15, desc: "Clear sky" },
    "london":          { temp: 15, humidity: 85, wind: 20, desc: "Overcast" },
    "new york":        { temp: 22, humidity: 60, wind: 18, desc: "Windy" },
    "tokyo":           { temp: 28, humidity: 65, wind: 10, desc: "Humid" },
  };

  const key = input.city.toLowerCase();
  const data = mockData[key] ?? { temp: 25, humidity: 60, wind: 10, desc: "Clear" };

  let temp = data.temp;
  let unit = input.unit;
  if (unit === "fahrenheit") {
    temp = Math.round(temp * 9 / 5 + 32);
  }

  return JSON.stringify({
    city: input.city,
    temperature: `${temp}°${unit === "celsius" ? "C" : "F"}`,
    humidity: `${data.humidity}%`,
    wind_speed: `${data.wind} km/h`,
    description: data.desc,
    timestamp: new Date().toISOString(),
  });
}

// ----------------------------------------------------------
// TOOL 2: calculate
// ----------------------------------------------------------
// Calculator tool — minh họa input validation phức tạp

export const calculatorToolDef: ToolDefinition = {
  name: "calculate",
  description:
    "Thực hiện phép tính toán học. Hỗ trợ: add, subtract, multiply, divide, power, sqrt, modulo.",
  input_schema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        description: "Phép tính cần thực hiện",
        enum: ["add", "subtract", "multiply", "divide", "power", "sqrt", "modulo"],
      },
      a: {
        type: "number",
        description: "Số thứ nhất (operand a)",
      },
      b: {
        type: "number",
        description:
          "Số thứ hai (operand b). Không cần với operation='sqrt'.",
      },
    },
    required: ["operation", "a"],
  },
};

export const calculatorSchema = z
  .object({
    operation: z.enum(["add", "subtract", "multiply", "divide", "power", "sqrt", "modulo"]),
    a: z.number().finite("Number must be finite"),
    b: z.number().finite().optional(),
  })
  .refine(
    (data) => {
      // sqrt không cần b
      if (data.operation === "sqrt") return true;
      // Các phép còn lại cần b
      return data.b !== undefined;
    },
    { message: "Operand 'b' is required for this operation" },
  )
  .refine(
    (data) => {
      // Không được chia cho 0
      if (data.operation === "divide" && data.b === 0) return false;
      return true;
    },
    { message: "Cannot divide by zero" },
  )
  .refine(
    (data) => {
      // sqrt không âm
      if (data.operation === "sqrt" && data.a < 0) return false;
      return true;
    },
    { message: "Cannot take square root of a negative number" },
  );
export type CalculatorInput = z.infer<typeof calculatorSchema>;

export async function calculatorHandler(input: CalculatorInput): Promise<string> {
  let result: number;
  const { operation, a, b } = input;

  switch (operation) {
    case "add":      result = a + b!; break;
    case "subtract": result = a - b!; break;
    case "multiply": result = a * b!; break;
    case "divide":   result = a / b!; break;
    case "power":    result = Math.pow(a, b!); break;
    case "sqrt":     result = Math.sqrt(a); break;
    case "modulo":   result = a % b!; break;
    default:         throw new Error(`Unknown operation: ${operation}`);
  }

  return JSON.stringify({
    operation,
    a,
    b: b ?? null,
    result,
    expression: operation === "sqrt"
      ? `√${a} = ${result}`
      : `${a} ${operation} ${b} = ${result}`,
  });
}

// ----------------------------------------------------------
// TOOL 3: search_database
// ----------------------------------------------------------
// Giả lập tìm kiếm database — minh họa phức tạp hơn

export const searchDbToolDef: ToolDefinition = {
  name: "search_database",
  description:
    "Tìm kiếm thông tin sản phẩm trong cơ sở dữ liệu. " +
    "Hỗ trợ filter theo category và sắp xếp kết quả.",
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Từ khóa tìm kiếm (tên sản phẩm, mô tả)",
      },
      category: {
        type: "string",
        description: "Lọc theo danh mục",
        enum: ["electronics", "clothing", "food", "books", "all"],
      },
      limit: {
        type: "integer",
        description: "Số kết quả tối đa (1-20)",
        minimum: 1,
        maximum: 20,
      },
      sort_by: {
        type: "string",
        description: "Sắp xếp theo",
        enum: ["price_asc", "price_desc", "name", "rating"],
      },
    },
    required: ["query"],
  },
};

export const searchDbSchema = z.object({
  query: z.string().min(1).max(200),
  category: z.enum(["electronics", "clothing", "food", "books", "all"]).default("all"),
  limit: z.number().int().min(1).max(20).default(5),
  sort_by: z.enum(["price_asc", "price_desc", "name", "rating"]).default("rating"),
});
export type SearchDbInput = z.infer<typeof searchDbSchema>;

const MOCK_PRODUCTS = [
  { id: 1, name: "MacBook Pro M3", category: "electronics", price: 1999, rating: 4.8 },
  { id: 2, name: "iPhone 15 Pro", category: "electronics", price: 999, rating: 4.7 },
  { id: 3, name: "Clean Code Book", category: "books", price: 35, rating: 4.9 },
  { id: 4, name: "Design Patterns", category: "books", price: 45, rating: 4.8 },
  { id: 5, name: "Nike Air Max", category: "clothing", price: 120, rating: 4.5 },
  { id: 6, name: "Organic Coffee", category: "food", price: 25, rating: 4.6 },
  { id: 7, name: "TypeScript Handbook", category: "books", price: 30, rating: 4.7 },
  { id: 8, name: "Sony Headphones", category: "electronics", price: 350, rating: 4.6 },
];

export async function searchDbHandler(input: SearchDbInput): Promise<string> {
  await new Promise((r) => setTimeout(r, 50));

  let results = MOCK_PRODUCTS.filter((p) => {
    const matchesQuery = p.name.toLowerCase().includes(input.query.toLowerCase());
    const matchesCategory = input.category === "all" || p.category === input.category;
    return matchesQuery && matchesCategory;
  });

  // Sort
  switch (input.sort_by) {
    case "price_asc":  results.sort((a, b) => a.price - b.price); break;
    case "price_desc": results.sort((a, b) => b.price - a.price); break;
    case "name":       results.sort((a, b) => a.name.localeCompare(b.name)); break;
    case "rating":     results.sort((a, b) => b.rating - a.rating); break;
  }

  results = results.slice(0, input.limit);

  return JSON.stringify({
    query: input.query,
    total_found: results.length,
    results,
  });
}

// ----------------------------------------------------------
// TOOL 4: send_notification (minh họa side effect tool)
// ----------------------------------------------------------

export const notificationToolDef: ToolDefinition = {
  name: "send_notification",
  description: "Gửi thông báo đến người dùng qua email hoặc SMS.",
  input_schema: {
    type: "object",
    properties: {
      recipient: {
        type: "string",
        description: "Email hoặc số điện thoại người nhận",
      },
      channel: {
        type: "string",
        description: "Kênh gửi thông báo",
        enum: ["email", "sms"],
      },
      message: {
        type: "string",
        description: "Nội dung thông báo (tối đa 500 ký tự)",
      },
      priority: {
        type: "string",
        description: "Mức độ ưu tiên",
        enum: ["low", "normal", "high", "urgent"],
      },
    },
    required: ["recipient", "channel", "message"],
  },
};

export const notificationSchema = z.object({
  recipient: z.string().min(1),
  channel: z.enum(["email", "sms"]),
  message: z.string().min(1).max(500, "Message too long (max 500 chars)"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});
export type NotificationInput = z.infer<typeof notificationSchema>;

export async function notificationHandler(input: NotificationInput): Promise<string> {
  // Simulate sending
  await new Promise((r) => setTimeout(r, 200));

  const notificationId = `notif_${Date.now()}`;
  console.log(`     [MOCK] Sending ${input.channel.toUpperCase()} to ${input.recipient}`);

  return JSON.stringify({
    success: true,
    notification_id: notificationId,
    recipient: input.recipient,
    channel: input.channel,
    priority: input.priority,
    sent_at: new Date().toISOString(),
    message_preview: input.message.substring(0, 50) + "...",
  });
}

// ----------------------------------------------------------
// HELPER: Đăng ký tất cả tools vào registry
// ----------------------------------------------------------

export function registerAllTools(registry: ToolRegistry): void {
  registry
    .register(weatherToolDef,      weatherSchema,      weatherHandler)
    .register(calculatorToolDef,   calculatorSchema,   calculatorHandler)
    .register(searchDbToolDef,     searchDbSchema,     searchDbHandler)
    .register(notificationToolDef, notificationSchema, notificationHandler);
}
