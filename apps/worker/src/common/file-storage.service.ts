import { Injectable } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

@Injectable()
export class FileStorageService {
  async readCsv(fileUrl: string): Promise<string> {
    const resolvedPath = fileUrl.startsWith('file://') ? new URL(fileUrl) : fileUrl;
    return readFile(resolvedPath, 'utf8');
  }

  async writeReport(reportId: string, content: string, extension: string): Promise<{ filePath: string; size: number }> {
    const outputDir = path.join(process.cwd(), 'tmp', 'reports');
    await mkdir(outputDir, { recursive: true });
    const filePath = path.join(outputDir, `${reportId}.${extension}`);
    await writeFile(filePath, content, 'utf8');
    return { filePath, size: Buffer.byteLength(content, 'utf8') };
  }
}
