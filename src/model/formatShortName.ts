import type { Person } from "./types";

// Given name + last name, no middle name -- used wherever the panel shows a
// person's name on one line (the header, a relative row).
export function formatShortName(person: Person): string {
  return [person.name, person.lastName].filter(Boolean).join(" ");
}
