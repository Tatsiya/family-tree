const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatDate(date: string): string {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return date;

  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return date;

  return `${Number(day)} ${monthName} ${year}`;
}
