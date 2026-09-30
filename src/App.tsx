import { useRef } from "react";
import { useTreeStore } from "./store/treeStore";
import { TreeCanvas } from "./components/tree/TreeCanvas";
import PersonPanel from "./components/PersonPanel";
import Header from "./components/Header";
import { PersonForm } from "./components/PersonForm";
import { RelationPickerModal } from "./components/RelationPickerModal";
import type { RelativeRelation } from "./model/linkNewRelative";

const RELATIVE_FORM_TITLE: Record<RelativeRelation, string> = {
  parent: "Add parent",
  spouse: "Add spouse",
  child: "Add child",
  sibling: "Add sibling",
};

export default function App() {
  const tree = useTreeStore((s) => s.tree);
  const personFormState = useTreeStore((s) => s.personFormState);
  const addPerson = useTreeStore((s) => s.addPerson);
  const updatePerson = useTreeStore((s) => s.updatePerson);
  const addRelative = useTreeStore((s) => s.addRelative);
  const selectRelationType = useTreeStore((s) => s.selectRelationType);
  const closePersonForm = useTreeStore((s) => s.closePersonForm);
  const svgRef = useRef<SVGSVGElement>(null);

  return (
    <div className="flex h-screen flex-col">
      <Header svgRef={svgRef} />
      <div className="flex min-h-0 flex-1 justify-between">
        <TreeCanvas tree={tree} svgRef={svgRef} />
        <PersonPanel />
      </div>

      {personFormState.kind === "add" && (
        <PersonForm title="Add person" submitLabel="Add" onSubmit={addPerson} onClose={closePersonForm} />
      )}

      {personFormState.kind === "edit" && tree.persons[personFormState.personId] && (
        <PersonForm
          key={personFormState.personId}
          person={tree.persons[personFormState.personId]}
          title="Edit person"
          submitLabel="Save"
          onSubmit={(draft) => updatePerson({ ...tree.persons[personFormState.personId], ...draft })}
          onClose={closePersonForm}
        />
      )}

      {personFormState.kind === "relationPicker" && tree.persons[personFormState.anchorId] && (
        <RelationPickerModal
          anchor={tree.persons[personFormState.anchorId]}
          onSelect={selectRelationType}
          onClose={closePersonForm}
        />
      )}

      {personFormState.kind === "addRelative" && tree.persons[personFormState.anchorId] && (
        <PersonForm
          title={RELATIVE_FORM_TITLE[personFormState.relation]}
          submitLabel="Add"
          onSubmit={(draft) => addRelative(personFormState.anchorId, personFormState.relation, draft)}
          onClose={closePersonForm}
        />
      )}
    </div>
  );
}
