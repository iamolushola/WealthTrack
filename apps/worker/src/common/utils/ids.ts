import { randomBytes } from 'node:crypto';

/**
 * Generates a UUID v7 (RFC 9562) — time-sortable, CHAR(36) compatible.
 * See apps/api/src/common/utils/ids.ts for full documentation.
 *
 * EXTERNAL ID RULE:
 *   Only use createId() for internally owned records.
 *   Identifiers that arrive from CSV files or external APIs (e.g. customer_id,
 *   sourceRecordIdentifier) must be stored as-is in their dedicated columns.
 */
export function createId(): string {
  const ms = BigInt(Date.now());
  const rand = randomBytes(10);

  const buf = Buffer.allocUnsafe(16);

  buf[0] = Number((ms >> 40n) & 0xffn);
  buf[1] = Number((ms >> 32n) & 0xffn);
  buf[2] = Number((ms >> 24n) & 0xffn);
  buf[3] = Number((ms >> 16n) & 0xffn);
  buf[4] = Number((ms >> 8n) & 0xffn);
  buf[5] = Number(ms & 0xffn);

  buf[6] = 0x70 | (rand[0] & 0x0f);
  buf[7] = rand[1];

  buf[8] = 0x80 | (rand[2] & 0x3f);
  rand.copy(buf, 9, 3, 10);

  const h = buf.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function nowIso(): string {
  return new Date().toISOString().slice(0, 23).replace('T', ' ');
}
