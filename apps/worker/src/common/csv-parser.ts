export interface ParsedCsvRecord {
  rowNumber: number;
  values: Record<string, string>;
}

export function parseCsv(content: string): ParsedCsvRecord[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = lines[0].split(',').map((value) => value.trim());
  return lines.slice(1).map((line, index) => {
    const cells = line.split(',').map((value) => value.trim());
    const values = headers.reduce<Record<string, string>>((result, header, headerIndex) => {
      result[header] = cells[headerIndex] ?? '';
      return result;
    }, {});
    return {
      rowNumber: index + 2,
      values,
    };
  });
}
