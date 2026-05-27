import crypto from 'crypto';

interface CacheEntry {
  response: string;
  timestamp: number;
}

/**
 * In-memory response cache sử dụng Map + SHA-256 hash làm key.
 * Tự động expire entry theo TTL.
 * Chỉ cache các request KHÔNG sử dụng tools (webSearch / fileReadWrite).
 */
export class ResponseCache {
  private store = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMinutes = 10) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  /**
   * Tạo cache key từ modelId, messages và features.
   * Dùng SHA-256 để giữ key ngắn gọn và nhất quán.
   */
  buildKey(modelId: string, messages: unknown[], features: unknown): string {
    const raw = JSON.stringify({ modelId, messages, features });
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Lấy response từ cache. Trả về null nếu không có hoặc đã hết hạn.
   */
  get(key: string): string | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.response;
  }

  /**
   * Lưu response vào cache.
   */
  set(key: string, response: string): void {
    this.store.set(key, { response, timestamp: Date.now() });
  }

  /**
   * Xóa tất cả entry đã hết hạn (gọi định kỳ để tránh memory leak).
   */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now - entry.timestamp > this.ttlMs) {
        this.store.delete(key);
      }
    }
  }

  getStats(): { size: number; ttlMinutes: number } {
    return {
      size: this.store.size,
      ttlMinutes: this.ttlMs / 60_000,
    };
  }
}

// Singleton dùng chung toàn backend
export const responseCache = new ResponseCache(10);
