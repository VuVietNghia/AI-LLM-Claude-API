import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

// ============================================================
// DEMO 3: VISION - PHÂN TÍCH ẢNH QUA BASE64
// ============================================================
// Khi không có URL công khai, bạn có thể encode ảnh thành
// chuỗi Base64 và gửi trực tiếp trong request.
//
// Ưu điểm Base64:
//   ✅ Không cần server/URL công khai
//   ✅ Bảo mật hơn (ảnh không lộ ra internet)
//   ✅ Dùng được với file local
//
// Nhược điểm:
//   ⚠️ Kích thước payload lớn hơn (~33%)
//   ⚠️ Tốn nhiều input tokens hơn
// ============================================================

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Tạo một ảnh PNG đơn giản dạng base64 (ảnh 8x8 pixel red-blue gradient)
// Trong thực tế, bạn đọc file ảnh từ disk
function createSampleBase64Image(): string {
  // Đây là một file PNG nhỏ được encode sẵn (8x8 pixel)
  // Trong thực tế: fs.readFileSync("image.png").toString("base64")
  return (
    "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAAXNSR0IArs4c6QAA" +
    "AARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABnSURBVChTY/j/" +
    "/z8DJZiBgYFBnIGBgZGBgYGRQZyBgYGJgYGBiYGBgYmBgYGZgYGBhYGBgYWBgY" +
    "GFgYGBhYGBgYWBgYGFgYGBhYGBgYWBgYGFgYGBhYGBgQEAAAD//wMAVH0I0QAAA" +
    "AASUVORK5CYII="
  );
}

// Hàm đọc ảnh từ file local (nếu có)
function readImageAsBase64(filePath: string): string | null {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath).toString("base64");
    }
    return null;
  } catch {
    return null;
  }
}

async function runVisionBase64Demo() {
  console.log("=".repeat(60));
  console.log("DEMO: VISION - PHÂN TÍCH ẢNH QUA BASE64");
  console.log("=".repeat(60));

  // Thử đọc từ file local trước, nếu không có thì dùng sample
  const localImagePath = path.join(__dirname, "../../assets/sample.png");
  const base64Image = readImageAsBase64(localImagePath) ?? createSampleBase64Image();
  const mediaType = "image/png";

  console.log(
    `\n📁 Nguồn ảnh: ${fs.existsSync(localImagePath) ? "File local" : "Sample Base64 inline"}`
  );
  console.log(
    `📏 Base64 length: ${base64Image.length} ký tự\n`
  );

  // -------------------------------------------------------
  // Gửi ảnh dạng base64
  // -------------------------------------------------------
  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",          // ← Loại nguồn: Base64
              media_type: mediaType,   // ← MIME type của ảnh
              data: base64Image,       // ← Chuỗi base64 của ảnh
            },
          },
          {
            type: "text",
            text: "Mô tả ảnh này. Nếu đây là ảnh đơn giản hoặc placeholder, hãy giải thích những pixel và màu sắc bạn thấy.",
          },
        ],
      },
    ],
  });

  console.log("📝 Kết quả phân tích ảnh Base64:");
  console.log(
    response.content[0].type === "text" ? response.content[0].text : ""
  );

  // -------------------------------------------------------
  // Ví dụ: Hỏi follow-up trong cùng conversation
  // -------------------------------------------------------
  console.log("\n" + "-".repeat(40));
  console.log("💬 Hỏi follow-up về ảnh...\n");

  const followUpResponse = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 200,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: "text",
            text: "Ảnh này phù hợp dùng cho mục đích gì?",
          },
        ],
      },
    ],
  });

  console.log("📝 Trả lời follow-up:");
  console.log(
    followUpResponse.content[0].type === "text"
      ? followUpResponse.content[0].text
      : ""
  );

  console.log(`\n📊 Token sử dụng (ảnh + text):`);
  console.log(`   Input:  ${response.usage.input_tokens}`);
  console.log(`   Output: ${response.usage.output_tokens}`);
  console.log(
    "\n💡 Tip: Mỗi ảnh tốn khoảng 1,334-8,000+ tokens tuỳ kích thước"
  );
  console.log("✅ Demo Vision Base64 hoàn thành!");
}

export { runVisionBase64Demo };
