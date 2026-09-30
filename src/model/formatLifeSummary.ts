import { formatDate } from "./formatDate";

function parseIsoDate(date: string): Date | undefined {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return undefined;
  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

function calculateAge(dateOfBirth: string, asOf: Date): number | undefined {
  const birth = parseIsoDate(dateOfBirth);
  if (!birth) return undefined;

  let age = asOf.getFullYear() - birth.getFullYear();
  const hadBirthdayByNow =
    asOf.getMonth() > birth.getMonth() ||
    (asOf.getMonth() === birth.getMonth() && asOf.getDate() >= birth.getDate());
  if (!hadBirthdayByNow) age -= 1;

  return age >= 0 ? age : undefined;
}

// The person panel's single date line: "10 April 1933 – 16 March 2016 · 82 y."
// Age is measured at death when known, otherwise as of `today`. Returns
// undefined when neither date is known, so the panel can skip the line.
export function formatLifeSummary(
  dateOfBirth: string | undefined,
  dateOfDeath: string | undefined,
  today: Date = new Date(),
): string | undefined {
  if (!dateOfBirth && !dateOfDeath) return undefined;

  const dateText =
    dateOfBirth && dateOfDeath
      ? `${formatDate(dateOfBirth)} – ${formatDate(dateOfDeath)}`
      : formatDate(dateOfBirth ?? dateOfDeath ?? "");

  const asOf = dateOfDeath ? parseIsoDate(dateOfDeath) : today;
  const age = dateOfBirth && asOf ? calculateAge(dateOfBirth, asOf) : undefined;

  return age !== undefined ? `${dateText} · ${age} y.` : dateText;
}
