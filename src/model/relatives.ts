import type { Person, Tree } from "./types";

export interface Relatives {
  parents: Person[];
  siblings: Person[];
  halfSiblings: Person[];
  spouses: Person[];
  children: Person[];
}

export function getRelatives(tree: Tree, personId: string): Relatives {
  const families = Object.values(tree.families ?? {});

  const parents: Person[] = [];
  const spouses: Person[] = [];
  const children: Person[] = [];

  const parentFamilyIds = new Set<string>();
  const parentIds = new Set<string>();
  for (const family of families) {
    if (family.partners.includes(personId)) {
      for (const partnerId of family.partners) {
        const partner = tree.persons[partnerId];
        if (partnerId !== personId && partner) spouses.push(partner);
      }
      for (const child of family.children ?? []) {
        const person = tree.persons[child.id];
        if (person) children.push(person);
      }
    }

    if (family.children?.some((child) => child.id === personId)) {
      parentFamilyIds.add(family.id);
      for (const partnerId of family.partners) {
        parentIds.add(partnerId);
        const partner = tree.persons[partnerId];
        if (partner) parents.push(partner);
      }
    }
  }

  const siblingIds = new Set<string>();
  const halfSiblingIds = new Set<string>();

  for (const family of families) {
    const isParentFamily = parentFamilyIds.has(family.id);
    if (!isParentFamily && !family.partners.some((id) => parentIds.has(id))) continue;

    for (const child of family.children ?? []) {
      if (child.id === personId) continue;
      if (isParentFamily) siblingIds.add(child.id);
      else halfSiblingIds.add(child.id);
    }
  }
  for (const id of siblingIds) halfSiblingIds.delete(id);

  const siblings = [...siblingIds].map((id) => tree.persons[id]).filter((p): p is Person => !!p);
  const halfSiblings = [...halfSiblingIds]
    .map((id) => tree.persons[id])
    .filter((p): p is Person => !!p);

  return { parents, siblings, halfSiblings, spouses, children };
}
