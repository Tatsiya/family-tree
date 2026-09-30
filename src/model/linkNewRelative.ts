import type { Family, Tree } from "./types";
import { familyOfChild } from "./ancestorGroup";

// Distinct from Child.relationType ('blood'|'adopted'|'foster' in types.ts) --
// this is which relative-picker option the user chose.
export type RelativeRelation = "parent" | "sibling" | "spouse" | "child";

function familiesAsPartner(tree: Tree, personId: string): Family[] {
  return Object.values(tree.families ?? {}).filter((f) => f.partners.includes(personId));
}

// Links a newly created person into an existing person's family graph.
// Reuses the anchor's existing family when there's exactly one unambiguous
// place to attach the new relative, and only creates a new Family record
// when reusing one would be a guess (no family yet, or an existing one's
// slot is already filled/ambiguous).
export function linkNewRelative(
  tree: Tree,
  anchorId: string,
  relation: RelativeRelation,
  newPersonId: string,
): Tree {
  const next = structuredClone(tree);
  const families = next.families ?? {};
  next.families = families;

  if (relation === "parent") {
    const parentFamily = familyOfChild(next, anchorId);
    if (parentFamily && parentFamily.partners.length < 2) {
      parentFamily.partners.push(newPersonId);
    } else {
      const id = crypto.randomUUID();
      // Already has two known parents recorded elsewhere (or none at all,
      // in which case this is exactly as much a guess) -- when there's an
      // existing blood family, this new one is a second/step family, so it
      // must not also claim "blood": familyOfChild prefers a blood match,
      // and two blood families for the same person would make that pick
      // arbitrary, silently changing which parents the tree traces upward.
      const relationType = parentFamily ? "foster" : "blood";
      families[id] = { id, partners: [newPersonId], children: [{ id: anchorId, relationType }] };
    }
    return next;
  }

  if (relation === "sibling") {
    const parentFamily = familyOfChild(next, anchorId);
    if (parentFamily) {
      parentFamily.children = [...(parentFamily.children ?? []), { id: newPersonId, relationType: "blood" }];
    } else {
      const id = crypto.randomUUID();
      families[id] = {
        id,
        partners: [],
        children: [
          { id: anchorId, relationType: "blood" },
          { id: newPersonId, relationType: "blood" },
        ],
      };
    }
    return next;
  }

  if (relation === "spouse") {
    // Always a new family: a person can have more than one marriage on
    // record, so there's never an existing one to safely reuse for "the"
    // new spouse.
    const id = crypto.randomUUID();
    families[id] = { id, partners: [anchorId, newPersonId] };
    return next;
  }

  // relation === "child"
  const spouseFamilies = familiesAsPartner(next, anchorId);
  if (spouseFamilies.length === 1) {
    const family = spouseFamilies[0];
    family.children = [...(family.children ?? []), { id: newPersonId, relationType: "blood" }];
  } else {
    // Zero or multiple marriages on record -- attaching to a specific one
    // would be a guess, so this child gets their own single-known-parent
    // family instead of guessing which spouse is the other parent.
    const id = crypto.randomUUID();
    families[id] = { id, partners: [anchorId], children: [{ id: newPersonId, relationType: "blood" }] };
  }
  return next;
}
