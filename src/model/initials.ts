import type { Person } from "./types";

// Displayed inside a person's avatar circle: first letter of the given
// name plus first letter of the last name, or just the given name's letter
// when no last name is known.
export function getInitials(person: Person): string {
  const first = person.name.trim().charAt(0);
  const last = person.lastName.trim().charAt(0);
  return (last ? first + last : first).toUpperCase();
}
