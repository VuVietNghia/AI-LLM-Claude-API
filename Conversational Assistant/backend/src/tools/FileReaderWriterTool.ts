import { ITool, ToolResult } from './ITool.js';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config/app.config.js';

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.js', '.ts', '.py', '.html', '.css'];

function resolveAndValidatePath(relativePath: string): string {
  // Normalize path to prevent path traversal
  const normalizedRelativePath = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
  
  const absolutePath = path.resolve(config.sandboxDirectory, normalizedRelativePath);
  
  if (!absolutePath.startsWith(config.sandboxDirectory)) {
    throw new Error('Path traversal detected. Truy cập ra ngoài thư mục sandbox bị từ chối.');
  }
  return absolutePath;
}

export class ReadFileTool implements ITool {
  name = 'read_file';
  description = 'Đọc nội dung của một file trong thư mục sandbox.';
  parameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Đường dẫn tương đối của file cần đọc (vd: "data.txt").',
      },
    },
    required: ['path'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const relativePath = typeof args.path === 'string' ? args.path : '';
    if (!relativePath) {
      return {
        success: false, data: '', error: { code: 'MISSING_PATH', message: 'Missing path argument.', userFriendly: 'Thiếu đường dẫn file.' }
      };
    }

    try {
      const absolutePath = resolveAndValidatePath(relativePath);
      const ext = path.extname(absolutePath).toLowerCase();
      
      if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
        return {
          success: false, data: '', error: { code: 'INVALID_EXTENSION', message: `Extension ${ext} not allowed.`, userFriendly: `Không được phép đọc file định dạng ${ext}.` }
        };
      }

      const stat = await fs.stat(absolutePath);
      if (stat.size > config.limits.fileReadLimitBytes) {
         return {
          success: false, data: '', error: { code: 'FILE_TOO_LARGE', message: `File size exceeds ${config.limits.fileReadLimitBytes} bytes.`, userFriendly: `File quá lớn, vượt quá giới hạn cho phép.` }
        };
      }

      const content = await fs.readFile(absolutePath, 'utf-8');
      return { success: true, data: content };
    } catch (err: any) {
      return {
        success: false, data: '', error: { code: 'READ_ERROR', message: err.message, userFriendly: `Không thể đọc file: ${err.message}` }
      };
    }
  }
}

export class WriteFileTool implements ITool {
  name = 'write_file';
  description = 'Ghi nội dung vào một file trong thư mục sandbox (có thể tạo mới hoặc ghi đè).';
  parameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Đường dẫn tương đối của file cần ghi.',
      },
      content: {
        type: 'string',
        description: 'Nội dung cần ghi vào file.',
      },
    },
    required: ['path', 'content'],
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const relativePath = typeof args.path === 'string' ? args.path : '';
    const content = typeof args.content === 'string' ? args.content : '';
    if (!relativePath) {
       return { success: false, data: '', error: { code: 'MISSING_PATH', message: 'Missing path', userFriendly: 'Thiếu đường dẫn file.' } };
    }

    try {
      const absolutePath = resolveAndValidatePath(relativePath);
      const ext = path.extname(absolutePath).toLowerCase();
      
      if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
         return { success: false, data: '', error: { code: 'INVALID_EXTENSION', message: `Extension ${ext} not allowed.`, userFriendly: `Không được phép ghi file định dạng ${ext}.` } };
      }

      // Đảm bảo thư mục cha tồn tại
      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, content, 'utf-8');

      return { success: true, data: `Đã ghi thành công file tại ${relativePath}` };
    } catch (err: any) {
       return { success: false, data: '', error: { code: 'WRITE_ERROR', message: err.message, userFriendly: `Không thể ghi file: ${err.message}` } };
    }
  }
}

export class ListDirectoryTool implements ITool {
  name = 'list_directory';
  description = 'Liệt kê danh sách các file và thư mục con trong thư mục sandbox.';
  parameters = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Đường dẫn tương đối của thư mục cần xem (mặc định là ".")',
      },
    },
  };

  async execute(args: Record<string, unknown>): Promise<ToolResult> {
    const relativePath = typeof args.path === 'string' ? args.path : '.';
    try {
      const absolutePath = resolveAndValidatePath(relativePath);
      const items = await fs.readdir(absolutePath, { withFileTypes: true });
      
      const result = items.map(item => ({
        name: item.name,
        isDirectory: item.isDirectory(),
      }));

      return { success: true, data: JSON.stringify(result, null, 2) };
    } catch (err: any) {
      return { success: false, data: '', error: { code: 'LIST_ERROR', message: err.message, userFriendly: `Không thể liệt kê thư mục: ${err.message}` } };
    }
  }
}
