import { createHash, randomUUID } from 'node:crypto';

export function createId(): string {
  return randomUUID();
}

export function nowIso(date = new Date()): string {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
