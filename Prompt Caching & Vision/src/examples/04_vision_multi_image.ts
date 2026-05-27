import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";

dotenv.config();

// ============================================================
// DEMO 4: VISION - PHÂN TÍCH NHIỀU ẢNH CÙNG LÚC
// ============================================================
// Claude có thể nhận NHIỀU ảnh trong một request và so sánh,
// phân tích chúng đồng thời. Rất hữu ích cho:
//   - So sánh sản phẩm
//   - Phân tích trước/sau (before/after)
//   - Đánh giá nhiều lựa chọn thiết kế
//   - Nhận dạng sự khác biệt giữa các ảnh
// ============================================================

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Các URL ảnh công khai từ Unsplash để demo
const IMAGE_SAMPLES = {
  // Ảnh logo Python từ Wikipedia
  logo1: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Python-logo-notext.svg/200px-Python-logo-notext.svg.png",
  // Ảnh logo JavaScript từ Wikipedia
  logo2: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/99/Unofficial_JavaScript_logo_2.svg/200px-Unofficial_JavaScript_logo_2.svg.png",
  // Ảnh TypeScript logo
  logo3: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Typescript_logo_2020.svg/200px-Typescript_logo_2020.svg.png",
};

async function runMultiImageDemo() {
  console.log("=".repeat(60));
  console.log("DEMO: VISION - PHÂN TÍCH NHIỀU ẢNH");
  console.log("=".repeat(60));

  // -------------------------------------------------------
  // Ví dụ 1: So sánh 2 ảnh logo lập trình
  // -------------------------------------------------------
  console.log("\n📸 Ví dụ 1: So sánh 2 logo ngôn ngữ lập trình");
  console.log(`   Ảnh 1: ${IMAGE_SAMPLES.logo1}`);
  console.log(`   Ảnh 2: ${IMAGE_SAMPLES.logo2}`);
  console.log("\n⏳ Đang phân tích...\n");

  const compareResponse = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 500,
    messages: [
      {
        role: "user",
        content: [
          // ← Ảnh 1
          {
            type: "image",
            source: {
              type: "url",
              url: IMAGE_SAMPLES.logo1,
            },
          },
          // ← Ảnh 2
          {
            type: "image",
            source: {
              type: "url",
              url: IMAGE_SAMPLES.logo2,
            },
          },
          // ← Câu hỏi về cả 2 ảnh
          {
            type: "text",
            text: `Tôi vừa gửi cho bạn 2 ảnh logo của 2 ngôn ngữ lập trình.
Hãy:
1. Nhận dạng mỗi logo là ngôn ngữ gì
2. Mô tả màu sắc và thiết kế của từng logo
3. So sánh phong cách thiết kế của 2 logo
Trả lời bằng tiếng Việt.`,
          },
        ],
      },
    ],
  });

  console.log("📝 Kết quả so sánh 2 logo:");
  console.log(
    compareResponse.content[0].type === "text"
      ? compareResponse.content[0].text
      : ""
  );

  // -------------------------------------------------------
  // Ví dụ 2: Phân tích 3 ảnh và chọn cái phù hợp nhất
  // -------------------------------------------------------
  console.log("\n" + "-".repeat(50));
  console.log("\n📸 Ví dụ 2: Chọn logo phù hợp nhất cho dự án web");
  console.log(
    `   (3 ảnh: Python, JavaScript, TypeScript logos)\n`
  );

  const selectResponse = await client.messages.create({
    model: "claude-opus-4-5",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: IMAGE_SAMPLES.logo1 },
          },
          {
            type: "image",
            source: { type: "url", url: IMAGE_SAMPLES.logo2 },
          },
          {
            type: "image",
            source: { type: "url", url: IMAGE_SAMPLES.logo3 },
          },
          {
            type: "text",
            text: `Tôi gửi 3 logo của 3 công nghệ khác nhau (theo thứ tự ảnh 1, 2, 3).
Nếu tôi đang xây dựng một web app hiện đại cần type safety (kiểm tra kiểu dữ liệu),
logo nào đại diện cho công nghệ phù hợp nhất?
Giải thích lý do bằng tiếng Việt.`,
          },
        ],
      },
    ],
  });

  console.log("📝 Tư vấn lựa chọn công nghệ:");
  console.log(
    selectResponse.content[0].type === "text"
      ? selectResponse.content[0].text
      : ""
  );

  console.log("\n✅ Demo Multi-Image Vision hoàn thành!");
  console.log("💡 Claude có thể xử lý tối đa 20 ảnh trong một request");
}

export { runMultiImageDemo };
