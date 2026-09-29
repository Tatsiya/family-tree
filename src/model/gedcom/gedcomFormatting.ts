const MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

export function splitGivenNames(given: string | undefined): {
  name: string;
  middleName: string;
} {
  const tokens = (given ?? "").trim().split(/\s+/).filter(Boolean);
  const [name, ...rest] = tokens;
  return { name: name ?? "", middleName: rest.join(" ") };
}

export function formatGedcomDate(
  raw: string | null | undefined,
): string | undefined {
  if (!raw) return undefined;

  const exact = raw.match(/(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/);
  if (exact) {
    const [, day, month, year] = exact;
    const monthNumber = MONTHS[month];
    if (monthNumber) return `${year}-${monthNumber}-${day.padStart(2, "0")}`;
  }

  const yearOnly = raw.match(/\b(\d{4})\b/);
  return yearOnly ? yearOnly[1] : undefined;
}
