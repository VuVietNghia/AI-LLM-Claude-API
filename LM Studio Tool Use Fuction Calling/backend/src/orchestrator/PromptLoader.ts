import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PromptLoader {
  static async load(promptName: string): Promise<string> {
    try {
      const filePath = path.join(__dirname, '../prompts', `${promptName}.md`);
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      console.warn(`[PromptLoader] Could not load prompt ${promptName}`, error);
      return '';
    }
  }

  static async buildSystemPrompt(features: { webSearch: boolean; fileReadWrite: boolean }): Promise<string> {
    let finalPrompt = await this.load('base_prompt');
    
    if (features.webSearch) {
      finalPrompt += '\n\n' + await this.load('web_search_prompt');
    }
    
    if (features.fileReadWrite) {
      let rwPrompt = await this.load('file_rw_prompt');
      const allowedDirs = process.env.ALLOWED_DIRECTORIES || 'Không có thư mục nào được cấp quyền.';
      rwPrompt = rwPrompt.replace('{{ALLOWED_DIRS}}', allowedDirs);
      finalPrompt += '\n\n' + rwPrompt;
    }
    
    return finalPrompt;
  }
}
