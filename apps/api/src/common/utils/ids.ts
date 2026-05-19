import { createHash, randomBytes } from 'node:crypto';

/**
 * Generates a UUID v7 (RFC 9562).
 *
 * Format: xxxxxxxx-xxxx-7xxx-[89ab]xxx-xxxxxxxxxxxx
 *   - Bits 0-47  : Unix timestamp in milliseconds (time-sortable, good for MySQL B-tree indexes)
 *   - Bits 48-51 : Version = 7
 *   - Bits 52-63 : 12 random bits
 *   - Bits 64-65 : Variant = 0b10
 *   - Bits 66-127: 62 random bits
 *
 * Drop-in replacement for UUID v4 — same CHAR(36) column type, no schema migration.
 *
 * EXTERNAL ID RULE:
 *   Only use createId() for records that WealthTrack owns internally.
 *   Data imported from CSV files or external APIs must preserve whatever
 *   identifier the source provides (e.g. customer_id, source_record_hash).
 *   The internal row `id` is still generated here, but external identifiers
 *   are stored in their own dedicated columns untouched.
 */
export function createId(): string {
  const ms = BigInt(Date.now());
  const rand = randomBytes(10);

  const buf = Buffer.allocUnsafe(16);

  // Bytes 0-5: 48-bit millisecond timestamp (MSB first)
  buf[0] = Number((ms >> 40n) & 0xffn);
  buf[1] = Number((ms >> 32n) & 0xffn);
  buf[2] = Number((ms >> 24n) & 0xffn);
  buf[3] = Number((ms >> 16n) & 0xffn);
  buf[4] = Number((ms >> 8n) & 0xffn);
  buf[5] = Number(ms & 0xffn);

  // Byte 6: version nibble (0x7) | upper 4 bits of rand_a
  buf[6] = 0x70 | (rand[0] & 0x0f);
  // Byte 7: lower 8 bits of rand_a
  buf[7] = rand[1];

  // Byte 8: variant bits (0b10xx_xxxx) | 6 random bits
  buf[8] = 0x80 | (rand[2] & 0x3f);
  // Bytes 9-15: remaining 56 random bits
  rand.copy(buf, 9, 3, 10);

  const h = buf.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function nowIso(date = new Date()): string {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
