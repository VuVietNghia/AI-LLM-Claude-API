import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";

dotenv.config();

// ============================================================
// DEMO 5: KẾT HỢP PROMPT CACHING + VISION
// ============================================================
// Đây là use case thực tế: Cache system prompt lớn (hướng dẫn,
// ruleset, context) trong khi vẫn phân tích ảnh mới mỗi lần.
//
// Ví dụ thực tế: Hệ thống kiểm tra ảnh sản phẩm E-commerce
//   - Cache: Bộ tiêu chuẩn kiểm tra ảnh (dài, tốn kém)
//   - Vision: Phân tích từng ảnh sản phẩm mới upload
//   → Tiết kiệm ~90% chi phí cho phần system prompt
// ============================================================

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Ruleset kiểm tra ảnh sản phẩm rất chi tiết (sẽ được cache)
const PRODUCT_IMAGE_RULESET = `
Bạn là hệ thống AI kiểm tra ảnh sản phẩm cho sàn thương mại điện tử.

=== TIÊU CHUẨN KIỂM TRA ẢNH SẢN PHẨM ===

1. CHẤT LƯỢNG ẢNH:
   - Độ phân giải tối thiểu: 800x800 pixels
   - Không được mờ, nhiễu (blur/noise)
   - Ánh sáng đồng đều, không bóng đổ mạnh
   - Nền trắng hoặc nền trung tính cho ảnh chính

2. THÀNH PHẦN TRONG ẢNH:
   - Sản phẩm phải chiếm 70-90% diện tích ảnh
   - Không có watermark thương hiệu khác
   - Không có người trong ảnh chính (trừ category thời trang)
   - Không có đồ vật không liên quan

3. GÓC CHỤP:
   - Ảnh chính: góc trực diện (front view)
   - Ảnh phụ: góc 45 độ, góc bên, góc sau
   - Với sản phẩm 3D: phải có ít nhất 4 góc khác nhau

4. MÀU SẮC:
   - Màu sắc phải trung thực, không chỉnh sửa thái quá
   - Saturation không vượt quá 20% so với thực tế
   - Không dùng filter làm thay đổi màu sản phẩm

5. NỘI DUNG:
   - Không có nội dung nhạy cảm, vi phạm chính sách
   - Không có logo/thương hiệu đối thủ
   - Không có giá tiền hoặc thông tin khuyến mãi trong ảnh

6. ĐỊNH DẠNG YÊU CẦU:
   - Chấp nhận: JPEG, PNG, WebP
   - Tỷ lệ khung hình: 1:1 (vuông) hoặc 4:3
   - Không chấp nhận GIF động

=== FORMAT TRẢ LỜI ===
Khi kiểm tra ảnh, luôn trả lời theo format JSON:
{
  "status": "APPROVED" | "REJECTED" | "NEEDS_REVIEW",
  "score": 0-100,
  "issues": ["danh sách vấn đề nếu có"],
  "suggestions": ["gợi ý cải thiện"],
  "summary": "tóm tắt ngắn bằng tiếng Việt"
}
`.repeat(3); // Lặp để tăng kích thước, mô phỏng ruleset thực tế

// Các ảnh sản phẩm cần kiểm tra (URLs công khai)
const PRODUCT_IMAGES = [
  {
    name: "Sản phẩm 1: Logo Python",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/200px-Python-logo-notext.svg.png",
    context: "Logo của ngôn ngữ lập trình Python",
  },
  {
    name: "Sản phẩm 2: Logo JavaScript",
    url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Unofficial_JavaScript_logo_2.svg/200px-Unofficial_JavaScript_logo_2.svg.png",
    context: "Logo JavaScript với nền vàng",
  },
];

async function runCacheWithVisionDemo() {
  console.log("=".repeat(60));
  console.log("DEMO: PROMPT CACHING + VISION KẾT HỢP");
  console.log("=".repeat(60));
  console.log("\n🎯 Use Case: Hệ thống kiểm tra ảnh sản phẩm E-commerce");
  console.log(
    `📋 Ruleset size: ${PRODUCT_IMAGE_RULESET.length} characters (sẽ được cache)\n`
  );

  for (let i = 0; i < PRODUCT_IMAGES.length; i++) {
    const product = PRODUCT_IMAGES[i];
    console.log(`\n${"─".repeat(50)}`);
    console.log(`🛍️  Kiểm tra: ${product.name}`);
    console.log(`🖼️  URL: ${product.url}`);

    const startTime = Date.now();

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: PRODUCT_IMAGE_RULESET,
          // 🔑 Cache ruleset - phần này sẽ được tái sử dụng
          // cho mỗi ảnh sản phẩm mới mà không mất thêm chi phí
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: [
            // Vision: gửi ảnh cần kiểm tra
            {
              type: "image",
              source: {
                type: "url",
                url: product.url,
              },
            },
            // Yêu cầu kiểm tra
            {
              type: "text",
              text: `Kiểm tra ảnh sản phẩm này theo tiêu chuẩn. Context: ${product.context}
Trả về JSON theo format đã định nghĩa trong system prompt.`,
            },
          ],
        },
      ],
    });

    const elapsed = Date.now() - startTime;
    const usage = response.usage as any;

    console.log(`\n⏱️  Thời gian xử lý: ${elapsed}ms`);

    // Parse và hiển thị kết quả
    const resultText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Thử parse JSON từ response
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const result = JSON.parse(jsonMatch[0]);
        const statusEmoji =
          result.status === "APPROVED"
            ? "✅"
            : result.status === "REJECTED"
              ? "❌"
              : "⚠️";
        console.log(
          `${statusEmoji} Kết quả: ${result.status} (Score: ${result.score}/100)`
        );
        if (result.issues?.length > 0) {
          console.log(`   Issues: ${result.issues.join(", ")}`);
        }
        console.log(`   Tóm tắt: ${result.summary}`);
      } catch {
        console.log(`📝 Raw response:\n${resultText}`);
      }
    } else {
      console.log(`📝 Response:\n${resultText}`);
    }

    // Hiển thị cache stats
    console.log(`\n📊 Cache Statistics:`);
    console.log(`   Input tokens:              ${usage.input_tokens}`);
    if (usage.cache_creation_input_tokens) {
      console.log(
        `   Cache CREATED:             ${usage.cache_creation_input_tokens} tokens`
      );
    }
    if (usage.cache_read_input_tokens) {
      const savings = Math.round(
        (usage.cache_read_input_tokens /
          (usage.input_tokens + usage.cache_read_input_tokens)) *
          100
      );
      console.log(
        `   Cache READ (tiết kiệm):    ${usage.cache_read_input_tokens} tokens (~${savings}% tiết kiệm!)`
      );
    }
    console.log(`   Output tokens:             ${usage.output_tokens}`);

    if (i < PRODUCT_IMAGES.length - 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ Demo Cache + Vision hoàn thành!");
  console.log("\n💡 Phân tích chi phí:");
  console.log("   Không cache: Mỗi request = X tokens đầy đủ");
  console.log("   Có cache:    Request đầu = X tokens (tạo cache)");
  console.log("               Request sau = Y tokens nhỏ (image + question)");
  console.log("   → Tiết kiệm ~90% cho phần system prompt!");
}

export { runCacheWithVisionDemo };
