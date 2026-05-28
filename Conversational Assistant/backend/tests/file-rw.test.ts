import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ReadFileTool, WriteFileTool, ListDirectoryTool } from '../src/tools/FileReaderWriterTool.js';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../src/config/app.config.js';

describe('FileReaderWriterTool', () => {
  const testFileName = 'test_file.txt';
  const testSubDir = 'sub';
  
  beforeAll(async () => {
    await fs.mkdir(config.sandboxDirectory, { recursive: true });
  });

  it('should write a file successfully', async () => {
    const writeTool = new WriteFileTool();
    const result = await writeTool.execute({ path: testFileName, content: 'Hello World' });
    expect(result.success).toBe(true);
  });

  it('should read the written file', async () => {
    const readTool = new ReadFileTool();
    const result = await readTool.execute({ path: testFileName });
    expect(result.success).toBe(true);
    expect(result.data).toBe('Hello World');
  });

  it('should block path traversal', async () => {
    const readTool = new ReadFileTool();
    const result = await readTool.execute({ path: '../../../etc/passwd' });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('READ_ERROR');
  });

  it('should block invalid extensions', async () => {
    const writeTool = new WriteFileTool();
    const result = await writeTool.execute({ path: 'malicious.exe', content: 'MZ' });
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('INVALID_EXTENSION');
  });

  it('should list directory', async () => {
    const listTool = new ListDirectoryTool();
    const result = await listTool.execute({ path: '.' });
    expect(result.success).toBe(true);
    expect(result.data).toContain(testFileName);
  });
});
