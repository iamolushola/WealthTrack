export interface ParsedCsvRecord {
  rowNumber: number;
  values: Record<string, string>;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += character;
  }

  cells.push(current.trim());
  return cells;
}

export function parseCsv(content: string): ParsedCsvRecord[] {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map((value) => value.trim());
  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
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
