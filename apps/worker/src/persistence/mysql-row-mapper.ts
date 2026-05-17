function toCamelCaseKey(key: string): string {
  return key.replace(/_([a-z])/g, (_match, group: string) => group.toUpperCase());
}

function toSnakeCaseKey(key: string): string {
  return key.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`);
}

function normalizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }

  if (value && typeof value === 'object' && !(value instanceof Date)) {
    return JSON.stringify(value);
  }

  return value;
}

export function toCamelCaseRow<T>(row: Record<string, unknown>): T {
  const mapped = Object.entries(row).reduce<Record<string, unknown>>((result, [key, value]) => {
    result[toCamelCaseKey(key)] = value;
    return result;
  }, {});

  return mapped as T;
}

export function toCamelCaseRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((row) => toCamelCaseRow<T>(row));
}

export function toSnakeCaseRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(record).reduce<Record<string, unknown>>((result, [key, value]) => {
    result[toSnakeCaseKey(key)] = normalizeValue(value);
    return result;
  }, {});
}
