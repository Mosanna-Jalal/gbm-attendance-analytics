// Parse free-form handwritten lists like:
//   17/02/26 - 17
//   18/02/26 — 56
//   19-02-2026: 58
//   2026-02-20, 37
// Returns { entries, errors } with normalized ISO dateKeys.

export type ParsedRow = { dateKey: string; count: number; raw: string };
export type ParseResult = { entries: ParsedRow[]; errors: { raw: string; reason: string }[] };

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function normalizeYear(y: number): number {
  if (y < 100) return 2000 + y;
  return y;
}

export function parseGateBulk(input: string): ParseResult {
  const entries: ParsedRow[] = [];
  const errors: { raw: string; reason: string }[] = [];

  const lines = input
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  for (const raw of lines) {
    // Split date from count. Tolerate -, —, :, , or multiple spaces.
    const m =
      raw.match(/^([\d/\-.]+)\s*[-—:,]\s*(\d+)\s*$/) ??
      raw.match(/^([\d/\-.]+)\s+(\d+)\s*$/);
    if (!m) {
      errors.push({ raw, reason: "Could not parse line" });
      continue;
    }
    const [, datePart, countStr] = m;
    const count = Number(countStr);
    if (!Number.isFinite(count) || count < 0) {
      errors.push({ raw, reason: "Invalid count" });
      continue;
    }

    // Try to extract day, month, year from common formats.
    const parts = datePart.split(/[/\-.]/).map((x) => Number(x));
    if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) {
      errors.push({ raw, reason: "Invalid date" });
      continue;
    }
    let day: number, month: number, year: number;
    if (parts[0] > 31) {
      // YYYY-MM-DD
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      // DD/MM/YY or DD/MM/YYYY
      day = parts[0];
      month = parts[1];
      year = normalizeYear(parts[2]);
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      errors.push({ raw, reason: "Invalid date" });
      continue;
    }
    const dateKey = `${year}-${pad(month)}-${pad(day)}`;
    entries.push({ dateKey, count: Math.round(count), raw });
  }

  return { entries, errors };
}
