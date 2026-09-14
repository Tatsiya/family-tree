import type { Person } from "./types";

export function formatFullName(person: Person) {
  return (
    person.name +
    " " +
    (person.middleName ? person.middleName + " " : "") +
    person.lastName
  );
}
