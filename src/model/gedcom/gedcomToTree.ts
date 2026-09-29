import { readGedcom } from "read-gedcom";
import type { SelectionGedcom } from "read-gedcom";
import type { Child, Family, Person, Tree } from "../types";
import { hasName } from "../ancestorGroup";
import { formatGedcomDate, splitGivenNames } from "./gedcomFormatting";

const UNREADABLE_FILE_MESSAGE =
  "This file could not be read as GEDCOM. Choose a .ged file exported from your genealogy software.";
const NO_PEOPLE_MESSAGE =
  "No people were found in this file. Choose a .ged file exported from your genealogy software.";

export function gedcomToTree(buffer: ArrayBuffer): Tree {
  const gedcom = parseWithRepair(buffer);

  const persons = buildPersons(gedcom);
  if (Object.keys(persons).length === 0) {
    throw new Error(NO_PEOPLE_MESSAGE);
  }

  const pedigree = buildPedigreeLookup(gedcom);
  const families = buildFamilies(gedcom, pedigree);
  const rootPersonId = pickRootPersonId(persons, families);

  return { rootPersonId, persons, families };
}

// Some exporters (e.g. MyHeritage) write long NOTE text as raw line breaks
// instead of proper GEDCOM CONT/CONC lines, which breaks strict parsing.
// We don't read NOTE fields at all, so it's safe to fold those orphan lines
// into the previous line and retry once before giving up.
const GEDCOM_LINE_PATTERN = /^\d+ (@[^@]*@ )?\S/;

function parseWithRepair(buffer: ArrayBuffer): SelectionGedcom {
  try {
    return readGedcom(buffer);
  } catch {
    try {
      return readGedcom(repairOrphanLines(buffer));
    } catch {
      throw new Error(UNREADABLE_FILE_MESSAGE);
    }
  }
}

function repairOrphanLines(buffer: ArrayBuffer): ArrayBuffer {
  const lines = new TextDecoder().decode(buffer).split(/\r\n|\r|\n/);
  const repaired: string[] = [];

  for (const line of lines) {
    if (repaired.length === 0 || GEDCOM_LINE_PATTERN.test(line)) {
      repaired.push(line);
    } else {
      repaired[repaired.length - 1] += " " + line;
    }
  }

  return new TextEncoder().encode(repaired.join("\n")).buffer;
}

function buildPersons(gedcom: SelectionGedcom): Record<string, Person> {
  const persons: Record<string, Person> = {};

  for (const individual of gedcom.getIndividualRecord().arraySelect()) {
    const id = individual.pointer()[0];
    if (!id) continue;

    const [given, surname] = individual.getName().valueAsParts()[0] ?? [];
    const { name, middleName } = splitGivenNames(given);

    persons[id] = {
      id,
      name,
      middleName,
      lastName: surname ?? "",
      sex: mapSex(individual.getSex().value()[0]),
      dateOfBirth: formatGedcomDate(individual.getEventBirth().getDate().value()[0]),
      dateOfDeath: formatGedcomDate(individual.getEventDeath().getDate().value()[0]),
      placeOfBirth: individual.getEventBirth().getPlace().value()[0] ?? undefined,
    };
  }

  return persons;
}

function mapSex(value: string | null | undefined): Person["sex"] {
  if (value === "M" || value === "F") return value;
  return undefined;
}

function buildPedigreeLookup(
  gedcom: SelectionGedcom,
): Map<string, Map<string, Child["relationType"]>> {
  const lookup = new Map<string, Map<string, Child["relationType"]>>();

  for (const individual of gedcom.getIndividualRecord().arraySelect()) {
    const childId = individual.pointer()[0];
    if (!childId) continue;

    for (const link of individual.getChildFamilyLink().arraySelect()) {
      const familyId = link.getFamilyRecord().pointer()[0];
      if (!familyId) continue;

      if (!lookup.has(familyId)) lookup.set(familyId, new Map());
      lookup
        .get(familyId)
        ?.set(childId, mapPedigree(link.getPedigreeLinkageType().value()[0]));
    }
  }

  return lookup;
}

function mapPedigree(value: string | null | undefined): Child["relationType"] {
  switch (value?.toLowerCase()) {
    case "adopted":
      return "adopted";
    case "foster":
      return "foster";
    default:
      return "blood";
  }
}

function buildFamilies(
  gedcom: SelectionGedcom,
  pedigree: Map<string, Map<string, Child["relationType"]>>,
): Record<string, Family> {
  const families: Record<string, Family> = {};

  for (const family of gedcom.getFamilyRecord().arraySelect()) {
    const id = family.pointer()[0];
    if (!id) continue;

    const partners = [
      ...family.getHusband().valueNonNull(),
      ...family.getWife().valueNonNull(),
    ];
    const familyPedigree = pedigree.get(id);
    const children: Child[] = family.getChild().valueNonNull().map((childId) => ({
      id: childId,
      relationType: familyPedigree?.get(childId) ?? "blood",
    }));

    families[id] = {
      id,
      partners,
      children: children.length > 0 ? children : undefined,
      dateOfMarriage: formatGedcomDate(family.getEventMarriage().getDate().value()[0]),
      areDivorced: family.getEventDivorce().length > 0,
    };
  }

  return families;
}

// The tree is rendered as a pedigree chart anchored on one person, with
// their ancestors fanning upward. The best anchor is whoever has the most
// known ancestors on record -- typically the person the research is about.
function pickRootPersonId(
  persons: Record<string, Person>,
  families: Record<string, Family>,
): string {
  const parentsOf = new Map<string, string[]>();
  for (const family of Object.values(families)) {
    for (const child of family.children ?? []) {
      if (!persons[child.id]) continue;
      const parentIds = family.partners.filter((id) => persons[id]);
      const existing = parentsOf.get(child.id) ?? [];
      parentsOf.set(child.id, [...existing, ...parentIds]);
    }
  }

  function ancestorCount(id: string): number {
    const seen = new Set<string>();
    const stack = [id];
    while (stack.length > 0) {
      const current = stack.pop() as string;
      for (const parentId of parentsOf.get(current) ?? []) {
        if (!seen.has(parentId)) {
          seen.add(parentId);
          stack.push(parentId);
        }
      }
    }
    return seen.size;
  }

  // A nameless (e.g. privacy-redacted) person is dropped from the rendered
  // tree everywhere else (see hasName in ancestorGroup.ts), so picking one as
  // the anchor -- often exactly the record with the deepest known ancestry
  // -- would render a blank, broken-looking root card. Only named people are
  // eligible; fall back to anyone if the file somehow has no named people.
  const namedIds = Object.keys(persons).filter((id) => hasName(persons[id]));
  const candidateIds = namedIds.length > 0 ? namedIds : Object.keys(persons);

  let bestId = candidateIds[0];
  let bestCount = -1;
  for (const id of candidateIds) {
    const count = ancestorCount(id);
    if (count > bestCount) {
      bestCount = count;
      bestId = id;
    }
  }
  return bestId;
}
