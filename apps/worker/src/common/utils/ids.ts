import { randomUUID } from 'node:crypto';

export function createId(): string {
  return randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString().slice(0, 23).replace('T', ' ');
}
