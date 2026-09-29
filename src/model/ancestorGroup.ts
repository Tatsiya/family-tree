import type { Family, Person, Tree } from "./types";
import { NODE_WIDTH, SIBLING_GAP } from "./treeLayoutConstants";

export interface ExtraMarriage {
  spouseId: string;
  childIds: string[];
}

// A row is a family's full sibling group (birth order), any half-siblings
// from a parent's other marriage (see halfSiblingIds), plus any other
// marriages the traced person themself had -- that spouse sits right next
// to them in the same row, so the existing flextree pass reserves their
// slot and nothing else can ever collide with them. `tracedId` marks the
// one member whose own ancestry continues via `parentGroup`. One
// AncestorGroupNode holds 1 chunk (the anchor, with no partner) or 2 (a
// couple) -- keeping both partners in the same flextree node is what keeps
// them adjacent regardless of how different their own ancestries are.
export interface RowChunk {
  row: string[];
  // Subset of `row` that are half-siblings rather than full siblings or the
  // traced person -- kept separate only so the connector up to parentGroup
  // can be drawn dashed for this group, same as any other second-marriage
  // relationship.
  halfSiblingIds: string[];
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

// A person can have more than one family-as-child link in GEDCOM -- e.g. a
// blood family plus a foster/step family they later moved to. The blood
// family is what should drive the ancestry chart, so it's preferred over
// whichever family record happens to appear first in the source file.
function familyOfChild(tree: Tree, personId: string): Family | undefined {
  const families = Object.values(tree.families ?? {}).filter((f) =>
    (f.children ?? []).some((c) => c.id === personId),
  );
  if (families.length <= 1) return families[0];
  return (
    families.find((f) => f.children?.find((c) => c.id === personId)?.relationType === "blood") ?? families[0]
  );
}

// Some imported records have no name at all (privacy-redacted living people
// export as e.g. an empty NAME field). A card with an icon and no text reads
// as broken, so these are dropped from the tree entirely rather than shown.
// Exported so gedcomToTree can apply the same rule when picking a root.
export function hasName(person: Person): boolean {
  return Boolean(person.name || person.lastName);
}

// Builds one row chunk per traced person: their full sibling group (birth
// order) from their own parent family, any half-siblings from a parent's
// other marriage, any other marriages they themself had (each one's spouse
// placed right in the row beside them), and that person's own parents as a
// combined chunk continuing upward. personIds is [anchor] at the very
// bottom, or a couple (up to 2) at every level above.
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
    // top of them. Their children are that spouse's OTHER parent's
    // children too, i.e. half-siblings of whoever's row they show up in --
    // see the parentGroup/halfSiblingIds handling below, one level down
    // from here, which is where they actually get placed.
    const extraSpouseIds = extraMarriages.map((m) => m.spouseId);

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

    // Half-siblings: children from any OTHER marriage either parent had.
    // parentGroup (just built above) already worked out each parent's own
    // extra marriages -- reading childIds back out here, one level down
    // from where they were found, is what places them in personId's own
    // row instead of trying to position them relative to a spouse who may
    // be laid out anywhere once the rest of the tree is positioned.
    const halfSiblingIds = parentGroup
      ? parentGroup.chunks.flatMap((c) => c.extraMarriages.flatMap((m) => m.childIds))
      : [];

    // Keep a couple adjacent in the middle: the first partner's own extras,
    // siblings and half-siblings lead into them, the second partner's trail
    // after them.
    let row: string[];
    if (!isCouple) {
      row = [...siblingIds, ...halfSiblingIds, personId, ...extraSpouseIds];
    } else if (index === 0) {
      row = [...extraSpouseIds, ...siblingIds, ...halfSiblingIds, personId];
    } else {
      row = [personId, ...siblingIds, ...halfSiblingIds, ...extraSpouseIds];
    }

    return { row, halfSiblingIds, tracedId: personId, parentGroup, extraMarriages };
  });

  return { chunks };
}
