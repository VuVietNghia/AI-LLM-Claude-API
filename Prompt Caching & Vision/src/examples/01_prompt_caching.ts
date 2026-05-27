import Anthropic from "@anthropic-ai/sdk";
import * as dotenv from "dotenv";

dotenv.config();

// ============================================================
// DEMO 1: PROMPT CACHING
// ============================================================
// Prompt Caching cho phép Claude cache (lưu trữ tạm thời)
// phần prefix của prompt để tái sử dụng, giảm chi phí và
// tăng tốc độ phản hồi.
//
// Cách hoạt động:
//   - Lần đầu: Claude xử lý toàn bộ prompt (cache MISS)
//   - Lần sau: Claude dùng lại phần đã cache (cache HIT)
//              → Tiết kiệm ~90% chi phí input tokens
//              → Tốc độ nhanh hơn đáng kể
// ============================================================

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Đây là một "system prompt" rất dài (mô phỏng việc
// truyền tài liệu/kiến thức lớn vào Claude)
const LARGE_SYSTEM_DOCUMENT = `
Bạn là một chuyên gia về lịch sử Việt Nam với kiến thức sâu rộng.
Dưới đây là tài liệu tham khảo chi tiết về các triều đại Việt Nam:

=== TÀI LIỆU THAM KHẢO: LỊCH SỬ VIỆT NAM ===

1. THỜI KỲ DỰNG NƯỚC (2879 TCN - 179 TCN)
   - Hồng Bàng Thị: 18 đời Hùng Vương, kéo dài từ 2879 TCN đến 258 TCN
   - Nhà nước Văn Lang: kinh đô ở Phong Châu (Phú Thọ ngày nay)
   - Âu Lạc: Thục Phán - An Dương Vương, kinh đô Cổ Loa

2. THỜI KỲ BẮC THUỘC (179 TCN - 938 SCN)
   - Bắc thuộc lần 1: Triệu, Hán (179 TCN - 40 SCN)
   - Khởi nghĩa Hai Bà Trưng: năm 40 SCN, kéo dài 3 năm
   - Bắc thuộc lần 2: Đông Hán (43 SCN - 544 SCN)
   - Nhà tiền Lý (Lý Nam Đế): 544 - 602 SCN
   - Bắc thuộc lần 3: Tuỳ, Đường (602 - 938 SCN)
   - Khởi nghĩa Mai Thúc Loan (722), Phùng Hưng (766-791)

3. THỜI KỲ ĐỘC LẬP TỰ CHỦ
   a) Ngô Quyền (938-944): Chiến thắng Bạch Đằng 938, chấm dứt Bắc thuộc
   b) Đinh Triều (968-980): Đinh Bộ Lĩnh thống nhất 12 sứ quân
   c) Tiền Lê (980-1009): Lê Hoàn đánh bại quân Tống (981)
   d) Nhà Lý (1009-1225):
      - Lý Thái Tổ dời đô về Thăng Long (1010)
      - Lý Thường Kiệt - Chiến thắng quân Tống (1075-1077)
      - Bài thơ "Nam quốc sơn hà" - tuyên ngôn độc lập đầu tiên
   e) Nhà Trần (1225-1400):
      - 3 lần kháng chiến chống quân Mông-Nguyên (1258, 1285, 1288)
      - Chiến thắng Bạch Đằng 1288 - Trần Hưng Đạo
      - Hội nghị Diên Hồng - ý chí toàn dân
   f) Nhà Hồ (1400-1407): Hồ Quý Ly, cải cách tiền tệ
   g) Thời Minh thuộc (1407-1427): Nhà Minh đô hộ
   h) Nhà Lê Sơ (1428-1527):
      - Lê Lợi - Nguyễn Trãi: Khởi nghĩa Lam Sơn
      - Bình Ngô Đại Cáo (1428) - tuyên ngôn độc lập thứ 2
      - Lê Thánh Tông: thời kỳ cực thịnh
   i) Nhà Mạc - Nam Bắc Triều (1527-1592)
   j) Nhà Lê Trung Hưng (1533-1789): Chúa Trịnh - Chúa Nguyễn phân tranh
   k) Nhà Tây Sơn (1778-1802):
      - Nguyễn Huệ - Quang Trung đại phá 20 vạn quân Thanh (1789)
      - Chiến thắng Đống Đa - mùng 5 Tết Kỷ Dậu
   l) Nhà Nguyễn (1802-1945):
      - Gia Long thống nhất đất nước
      - Pháp xâm lược (1858), mất Nam Kỳ (1862)
      - Tự Đức - Chiếu Cần vương

4. THỜI KỲ HIỆN ĐẠI
   - Phong trào Cần Vương (1885-1896)
   - Đông Kinh Nghĩa Thục (1907)
   - Việt Nam Quốc Dân Đảng (1927)
   - Đảng Cộng sản Việt Nam thành lập (3/2/1930)
   - Cách mạng tháng Tám 1945
   - Tuyên ngôn Độc lập 2/9/1945 - Hồ Chí Minh
   - Kháng chiến chống Pháp (1945-1954) - Điện Biên Phủ
   - Kháng chiến chống Mỹ (1954-1975) - Thống nhất 30/4/1975
   - Đổi Mới (1986) - Phát triển kinh tế thị trường

Hãy trả lời các câu hỏi dựa trên tài liệu trên một cách chính xác và chi tiết.
`.repeat(2); // Lặp 2 lần để tăng kích thước (mô phỏng tài liệu lớn)

async function runPromptCachingDemo() {
  console.log("=".repeat(60));
  console.log("DEMO: PROMPT CACHING");
  console.log("=".repeat(60));
  console.log(
    `\n📄 System prompt size: ${LARGE_SYSTEM_DOCUMENT.length} characters\n`
  );

  const questions = [
    "Ngô Quyền chiến thắng Bạch Đằng vào năm nào?",
    "Hội nghị Diên Hồng là gì?",
    "Quang Trung đại phá quân Thanh vào dịp gì?",
  ];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    console.log(`\n--- Câu hỏi ${i + 1}: "${question}" ---`);

    const startTime = Date.now();

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 300,
      system: [
        {
          type: "text",
          text: LARGE_SYSTEM_DOCUMENT,
          // 🔑 ĐÂY LÀ CHỖ KÍCH HOẠT PROMPT CACHING
          // cache_control: { type: "ephemeral" } đánh dấu phần này
          // sẽ được cache lại sau lần gọi API đầu tiên
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: question }],
    });

    const elapsed = Date.now() - startTime;

    console.log(`⏱️  Thời gian: ${elapsed}ms`);
    console.log(`💬 Trả lời: ${response.content[0].type === "text" ? response.content[0].text : ""}`);

    // Hiển thị thông tin cache usage
    const usage = response.usage as any;
    console.log(`\n📊 Token Usage:`);
    console.log(`   Input tokens:              ${usage.input_tokens}`);
    console.log(`   Output tokens:             ${usage.output_tokens}`);
    if (usage.cache_creation_input_tokens !== undefined) {
      console.log(
        `   Cache creation tokens:     ${usage.cache_creation_input_tokens} (lần đầu tạo cache)`
      );
    }
    if (usage.cache_read_input_tokens !== undefined) {
      console.log(
        `   Cache read tokens:         ${usage.cache_read_input_tokens} (đọc từ cache - tiết kiệm ~90%!)`
      );
    }

    // Nhỏ delay giữa các request
    if (i < questions.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log("\n✅ Demo Prompt Caching hoàn thành!");
  console.log(
    "💡 Lưu ý: Câu hỏi đầu tiên tạo cache, các câu hỏi sau đọc từ cache"
  );
}

export { runPromptCachingDemo };
