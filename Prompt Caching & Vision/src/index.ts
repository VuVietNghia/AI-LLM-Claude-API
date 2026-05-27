import * as dotenv from "dotenv";

dotenv.config();

import { runPromptCachingDemo } from "./examples/01_prompt_caching";
import { runVisionUrlDemo } from "./examples/02_vision_url";
import { runVisionBase64Demo } from "./examples/03_vision_base64";
import { runMultiImageDemo } from "./examples/04_vision_multi_image";
import { runCacheWithVisionDemo } from "./examples/05_cache_with_vision";

async function main() {
  console.log("\n" + "🚀".repeat(20));
  console.log("   CLAUDE - PROMPT CACHING & VISION DEMOS");
  console.log("🚀".repeat(20) + "\n");

  const args = process.argv.slice(2);
  const demo = args[0];

  const demos: Record<string, () => Promise<void>> = {
    "1": runPromptCachingDemo,
    "2": runVisionUrlDemo,
    "3": runVisionBase64Demo,
    "4": runMultiImageDemo,
    "5": runCacheWithVisionDemo,
  };

  if (demo && demos[demo]) {
    await demos[demo]();
  } else {
    // Chạy tất cả
    console.log("Chạy tất cả demos...\n");

    const allDemos = [
      { name: "Prompt Caching", fn: runPromptCachingDemo },
      { name: "Vision URL", fn: runVisionUrlDemo },
      { name: "Vision Base64", fn: runVisionBase64Demo },
      { name: "Vision Multi-Image", fn: runMultiImageDemo },
      { name: "Cache + Vision Combined", fn: runCacheWithVisionDemo },
    ];

    for (const { name, fn } of allDemos) {
      try {
        console.log(`\n${"═".repeat(60)}`);
        console.log(`▶ Running: ${name}`);
        console.log("═".repeat(60));
        await fn();
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        console.error(`❌ Error in ${name}:`, err);
      }
    }
  }

  console.log("\n" + "✨".repeat(20));
  console.log("   TẤT CẢ DEMOS HOÀN THÀNH!");
  console.log("✨".repeat(20) + "\n");
}

main().catch(console.error);
