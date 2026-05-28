import { ITool, ToolResult } from './ITool.js';
import * as cheerio from 'cheerio';
import { config } from '../config/app.config.js';

export class WebFetcherTool implements ITool {
  name = 'web_fetch';
  description = 'Tải nội dung của một URL (trang web hoặc API) và trả về nội dung dạng văn bản.';
  parameters = {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL cần lấy nội dung (vd: https://example.com)',
      },
    },
    required: ['url'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const targetUrl = typeof args.url === 'string' ? args.url : '';
    if (!targetUrl) {
      return { success: false, data: '', error: { code: 'MISSING_URL', message: 'URL is missing.', userFriendly: 'Thiếu URL.' } };
    }

    try {
      new URL(targetUrl);
    } catch {
      return { success: false, data: '', error: { code: 'INVALID_URL', message: 'Invalid URL format.', userFriendly: 'Định dạng URL không hợp lệ.' } };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.limits.webFetchTimeoutMs);

    try {
      const response = await fetch(targetUrl, { signal: controller.signal });
      clearTimeout(timeout);

      if (!response.ok) {
        return { success: false, data: '', error: { code: 'HTTP_ERROR', message: `HTTP status ${response.status}`, userFriendly: `Lỗi HTTP ${response.status} khi tải trang.` } };
      }

      const contentType = response.headers.get('content-type') || '';
      let textContent = await response.text();

      if (contentType.includes('text/html')) {
        const $ = cheerio.load(textContent);
        $('script, style, noscript, nav, footer, header, iframe').remove();
        textContent = $('body').text().replace(/\s+/g, ' ').trim();
      } else if (contentType.includes('application/json')) {
        try {
          const parsed = JSON.parse(textContent);
          textContent = JSON.stringify(parsed, null, 2);
        } catch (e) {
          // ignore
        }
      }

      if (textContent.length > config.limits.webFetchLimitChars) {
        textContent = textContent.substring(0, config.limits.webFetchLimitChars) + '... (truncated)';
      }

      return { success: true, data: textContent };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
         return { success: false, data: '', error: { code: 'TIMEOUT', message: 'Request timed out.', userFriendly: 'Quá thời gian tải trang.' } };
      }
      return { success: false, data: '', error: { code: 'FETCH_ERROR', message: err.message, userFriendly: `Lỗi tải trang: ${err.message}` } };
    }
  }
}
