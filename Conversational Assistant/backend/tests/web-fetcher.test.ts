import { describe, it, expect } from 'vitest';
import { WebFetcherTool } from '../src/tools/WebFetcherTool.js';

describe('WebFetcherTool', () => {
  it('should fetch a valid URL and extract text', async () => {
    const fetcher = new WebFetcherTool();
    const result = await fetcher.execute({ url: 'https://example.com' });
    expect(result.success).toBe(true);
    expect(result.data).toContain('Example Domain');
  });

  it('should fail on invalid URL', async () => {
    const fetcher = new WebFetcherTool();
    const result = await fetcher.execute({ url: 'not-a-url' });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_URL');
  });

  it('should fetch JSON and format it', async () => {
    const fetcher = new WebFetcherTool();
    const result = await fetcher.execute({ url: 'https://jsonplaceholder.typicode.com/todos/1' });
    expect(result.success).toBe(true);
    expect(result.data).toContain('"userId":');
  });
});
