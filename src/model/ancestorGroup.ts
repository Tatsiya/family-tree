import type { Family, Person, Tree } from "./types";
import { NODE_WIDTH, SIBLING_GAP } from "./treeLayoutConstants";

export interface ExtraMarriage {
  spouseId: string;
  childIds: string[];
}

// A row is a family's full sibling group (birth order), plus any other
// marriages the traced person had -- that spouse sits right next to them in
// the same row, so the existing flextree pass positions them and nothing
// else can ever collide with them. `tracedId` marks the one member whose
// own ancestry continues via `parentGroup`. One AncestorGroupNode holds 1
// chunk (the anchor, with no partner) or 2 (a couple) -- keeping both
// partners in the same flextree node is what keeps them adjacent regardless
// of how different their own ancestries are.
export interface RowChunk {
  row: string[];
  tracedId: string;
  parentGroup: AncestorGroupNode | null;
  extraMarriages: ExtraMarriage[];
}

export interface AncestorGroupNode {
  chunks: RowChunk[];
}

export function fullRow(node: AncestorGroupNode): string[] {
  return node.chunks.flatMap((c) => c.row);
}

export function rowWidth(row: string[]): number {
  return row.length * NODE_WIDTH + (row.length - 1) * SIBLING_GAP;
}

function familyOfChild(tree: Tree, personId: string): Family | undefined {
  return Object.values(tree.families ?? {}).find((f) => (f.children ?? []).some((c) => c.id === personId));
}

// Some imported records have no name at all (privacy-redacted living people
// export as e.g. an empty NAME field). A card with an icon and no text reads
// as broken, so these are dropped from the tree entirely rather than shown.
// Exported so gedcomToTree can apply the same rule when picking a root.
export function hasName(person: Person): boolean {
  return Boolean(person.name || person.lastName);
}

// Builds one row chunk per traced person: their full sibling group (birth
// order) from their own parent family, any other marriages they had (each
// one's spouse placed right in the row beside them), and that person's own
// parents as a combined chunk continuing upward. personIds is [anchor] at
// the very bottom, or a couple (up to 2) at every level above.
//
// primaryFamilyId is the family that produced this exact chunk -- null only
// for the anchor's own chunk, since it isn't produced by any shown marriage
// (so the anchor's own marriages, if any, aren't shown as "second" ones;
// there's nothing "first" to compare them against here). Every other family
// a chunk member partnered in counts as an extra marriage. seenExtraFamilyIds
// guards a family being picked up twice if both its partners independently
// show up elsewhere in the chart (e.g. a cousin marriage).
//
// ancestorPath holds every traced person from the anchor down to this chunk
// along THIS branch only (each branch gets its own copy, so a shared
// ancestor reached via two different lines -- e.g. a cousin marriage -- is
// still drawn on both). Imported GEDCOM data isn't guaranteed acyclic, so a
// parent already on this branch's path is treated as unknown rather than
// recursed into, which guarantees termination instead of an infinite loop.
export function buildAncestorGroup(
  tree: Tree,
  personIds: string[],
  familiesByPartnerId: Map<string, Family[]>,
  seenExtraFamilyIds: Set<string>,
  primaryFamilyId: string | null,
  ancestorPath: Set<string> = new Set(),
): AncestorGroupNode {
  const isCouple = personIds.length > 1;

  const chunks: RowChunk[] = personIds.map((personId, index) => {
    const family = familyOfChild(tree, personId);
    const siblingIds = family
      ? (family.children ?? [])
          .map((c) => c.id)
          .filter((id) => tree.persons[id] && hasName(tree.persons[id]) && id !== personId)
      : [];

    const extraMarriages: ExtraMarriage[] = [];
    if (primaryFamilyId !== null) {
      for (const otherFamily of familiesByPartnerId.get(personId) ?? []) {
        if (otherFamily.id === primaryFamilyId || seenExtraFamilyIds.has(otherFamily.id)) continue;
        const spouseId = otherFamily.partners.find(
          (id) => id !== personId && tree.persons[id] && hasName(tree.persons[id]),
        );
        if (!spouseId) continue;
        seenExtraFamilyIds.add(otherFamily.id);
        const childIds = (otherFamily.children ?? [])
          .map((c) => c.id)
          .filter((id) => tree.persons[id] && hasName(tree.persons[id]));
        extraMarriages.push({ spouseId, childIds });
      }
    }
    // Each extra marriage's spouse sits right in the row -- so the existing
    // flextree pass reserves space for them and nothing can ever land on
    // top of them. Their children still render one generation below, like
    // any other parent/child pair; placeSecondMarriageChildren (in
    // treeLayout.ts) places those in a second pass, once every row
    // (including this spouse) has a position, so it can check for and
    // avoid any collision.
    const extraSpouseIds = extraMarriages.map((m) => m.spouseId);

    // Keep a couple adjacent in the middle: the first partner's own extras
    // and siblings lead into them, the second partner's trail after them.
    let row: string[];
    if (!isCouple) {
      row = [...siblingIds, personId, ...extraSpouseIds];
    } else if (index === 0) {
      row = [...extraSpouseIds, ...siblingIds, personId];
    } else {
      row = [personId, ...siblingIds, ...extraSpouseIds];
    }

    let parentGroup: AncestorGroupNode | null = null;
    if (family) {
      const parentIds = family.partners.filter(
        (id) => tree.persons[id] && hasName(tree.persons[id]) && !ancestorPath.has(id),
      );
      if (parentIds.length > 0) {
        const nextPath = new Set(ancestorPath);
        nextPath.add(personId);
        parentGroup = buildAncestorGroup(
          tree,
          parentIds,
          familiesByPartnerId,
          seenExtraFamilyIds,
          family.id,
          nextPath,
        );
      }
    }

    return { row, tracedId: personId, parentGroup, extraMarriages };
  });

  return { chunks };
}
