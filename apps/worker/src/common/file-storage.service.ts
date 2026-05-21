import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

@Injectable()
export class FileStorageService implements OnModuleInit {
  private readonly logger = new Logger(FileStorageService.name);

  private readonly serviceUrl: string;
  private readonly apiKey: string;
  private readonly useMock: boolean;

  constructor() {
    this.serviceUrl = (process.env.CREDPAL_FILE_SERVICE_URL ?? 'https://fileservice.credpal.com').replace(/\/$/, '');
    this.apiKey = process.env.CREDPAL_FILE_SERVICE_API_KEY ?? '';
    this.useMock = process.env.USE_MOCK_FILE_STORAGE === 'true' || !this.apiKey;
  }

  onModuleInit(): void {
    if (this.useMock) {
      this.logger.warn('FileStorageService: running in MOCK mode — files are stored on local disk');
    } else {
      this.logger.log(`FileStorageService: cloud mode — ${this.serviceUrl}`);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Upload a buffer to the file service (or local disk in mock mode).
   * Returns the canonical URL that can be stored in the DB and used to retrieve the file.
   */
  async uploadFile(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    if (this.useMock) {
      return this.writeLocal(buffer, 'uploads', fileName);
    }
    return this.uploadToCloud(buffer, fileName, contentType);
  }

  /**
   * Read a CSV from either a cloud URL or a local file:// URL (mock mode).
   */
  async readCsv(fileUrl: string): Promise<string> {
    if (fileUrl.startsWith('file://')) {
      const resolvedPath = new URL(fileUrl);
      return readFile(resolvedPath, 'utf8');
    }
    // Cloud URL — download with auth header
    const response = await fetch(fileUrl, {
      headers: { 'x-api-key': this.apiKey },
    });
    if (!response.ok) {
      throw new Error(`Failed to download CSV from ${fileUrl}: HTTP ${response.status}`);
    }
    return response.text();
  }

  /**
   * Write a generated report. Returns the public file URL and byte size.
   */
  async writeReport(reportId: string, content: string, extension: string): Promise<{ filePath: string; size: number }> {
    const buffer = Buffer.from(content, 'utf8');
    const fileName = `${reportId}.${extension}`;

    if (this.useMock) {
      const localPath = await this.writeLocal(buffer, 'reports', fileName);
      return { filePath: localPath, size: buffer.byteLength };
    }

    const url = await this.uploadToCloud(buffer, fileName, extension === 'pdf' ? 'application/pdf' : 'text/csv');
    return { filePath: url, size: buffer.byteLength };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async uploadToCloud(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(buffer)], { type: contentType });
    formData.append('file', blob, fileName);

    const response = await fetch(`${this.serviceUrl}/upload`, {
      method: 'POST',
      headers: { 'x-api-key': this.apiKey },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`CredPal File Service upload failed (HTTP ${response.status}): ${text}`);
    }

    const data = await response.json() as { url?: string; fileUrl?: string; data?: { url?: string } };
    const url = data.url ?? data.fileUrl ?? data.data?.url;
    if (!url) {
      throw new Error(`CredPal File Service returned no URL. Response: ${JSON.stringify(data)}`);
    }
    return url;
  }

  private async writeLocal(buffer: Buffer, subDir: string, fileName: string): Promise<string> {
    const dir = path.join(process.cwd(), 'tmp', subDir);
    await mkdir(dir, { recursive: true });
    const filePath = path.join(dir, fileName);
    await writeFile(filePath, buffer);
    return `file://${filePath}`;
  }
}
