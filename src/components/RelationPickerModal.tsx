import type { Person } from "../model/types";
import type { RelativeRelation } from "../model/linkNewRelative";
import { formatShortName } from "../model/formatShortName";
import { Modal } from "./Modal";

export interface RelationPickerModalProps {
  anchor: Person;
  onSelect: (relation: RelativeRelation) => void;
  onClose: () => void;
}

const RELATION_OPTIONS: { value: RelativeRelation; label: string }[] = [
  { value: "parent", label: "Parent" },
  { value: "sibling", label: "Sibling" },
];

export function RelationPickerModal({ anchor, onSelect, onClose }: RelationPickerModalProps) {
  return (
    <Modal title={`Add relative to ${formatShortName(anchor)}`} onClose={onClose}>
      <div className="flex flex-col gap-2">
        {RELATION_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSelect(option.value)}
            className="flex h-12 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-ink transition-colors hover:bg-hover-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {option.label}
          </button>
        ))}
      </div>
    </Modal>
  );
}
