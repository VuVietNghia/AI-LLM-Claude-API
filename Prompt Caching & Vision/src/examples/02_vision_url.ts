import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";

dotenv.config();

// ============================================================
// DEMO 2: VISION - PHÂN TÍCH ẢNH QUA URL
// ============================================================
// Claude Vision cho phép mô hình "nhìn" và phân tích hình ảnh.
// Cách truyền ảnh: dùng URL công khai (source.type = "url")
// Supported formats: JPEG, PNG, GIF, WebP
// Max image size: 5MB
// ============================================================

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function runVisionUrlDemo() {
  console.log("=".repeat(60));
  console.log("DEMO: VISION - PHÂN TÍCH ẢNH QUA URL");
  console.log("=".repeat(60));

  // Sử dụng ảnh công khai từ Wikipedia
  const imageUrl =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/PNG_transparency_demonstration_1.png/280px-PNG_transparency_demonstration_1.png";

  console.log(`\n🖼️  URL ảnh: ${imageUrl}`);
  console.log("\n⏳ Đang phân tích ảnh...\n");

  // -------------------------------------------------------
  // Cách 1: Dùng URL trực tiếp
  // -------------------------------------------------------
  const response = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "url",           // ← Loại nguồn: URL
              url: imageUrl,         // ← URL công khai của ảnh
            },
          },
          {
            type: "text",
            text: "Hãy mô tả chi tiết những gì bạn thấy trong ảnh này bằng tiếng Việt. Bao gồm: màu sắc, hình dạng, và bất kỳ chi tiết đáng chú ý nào.",
          },
        ],
      },
    ],
  });

  console.log("📝 Kết quả phân tích:");
  console.log(
    response.content[0].type === "text" ? response.content[0].text : ""
  );

  console.log(`\n📊 Token sử dụng:`);
  console.log(`   Input:  ${response.usage.input_tokens}`);
  console.log(`   Output: ${response.usage.output_tokens}`);

  // -------------------------------------------------------
  // Thêm ví dụ: phân tích nhiều góc độ khác nhau
  // -------------------------------------------------------
  console.log("\n" + "-".repeat(40));
  console.log("🔍 Phân tích thêm: Hỏi về kỹ thuật ảnh...\n");

  const technicalResponse = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "url",
              url: imageUrl,
            },
          },
          {
            type: "text",
            text: "Ảnh này được dùng để minh hoạ kỹ thuật gì trong đồ hoạ máy tính? Giải thích ngắn gọn.",
          },
        ],
      },
    ],
  });

  console.log("📝 Phân tích kỹ thuật:");
  console.log(
    technicalResponse.content[0].type === "text"
      ? technicalResponse.content[0].text
      : ""
  );

  console.log("\n✅ Demo Vision URL hoàn thành!");
}

export { runVisionUrlDemo };
