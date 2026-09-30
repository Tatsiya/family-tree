import type { Tree } from "./types";
import { familyOfChild } from "./ancestorGroup";

// Distinct from Child.relationType ('blood'|'adopted'|'foster' in types.ts) --
// this is which relative-picker option the user chose.
export type RelativeRelation = "parent" | "sibling";

// Links a newly created person into an existing person's family graph.
// Reuses the anchor's existing parent-family when there's exactly one
// unambiguous place to attach the new relative, and only creates a new
// Family record when reusing one would be a guess (no parent-family yet, or
// the existing one's two partner slots are already filled).
export function linkNewRelative(
  tree: Tree,
  anchorId: string,
  relation: RelativeRelation,
  newPersonId: string,
): Tree {
  const next = structuredClone(tree);
  const families = next.families ?? {};
  next.families = families;

  const parentFamily = familyOfChild(next, anchorId);

  if (relation === "parent") {
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
  } else {
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
  }

  return next;
}
