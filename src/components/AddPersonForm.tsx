import { useState } from "react";
import type { SubmitEvent } from "react";
import type { Person } from "../model/types";
import { useTreeStore } from "../store/treeStore";

interface Props {
  onClose: () => void;
}

type FormState = Pick<
  Person,
  "name" | "middleName" | "lastName" | "dateOfBirth" | "placeOfBirth"
>;

const INITIAL_FORM: FormState = {
  name: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  placeOfBirth: "",
};

const FIELDS: {
  key: keyof FormState;
  placeholder?: string;
  type?: string;
  required?: boolean;
}[] = [
  { key: "name", placeholder: "First name", required: true },
  { key: "middleName", placeholder: "Middle name" },
  { key: "lastName", placeholder: "Last name", required: true },
  { key: "dateOfBirth", type: "date" },
  { key: "placeOfBirth", placeholder: "Place of birth" },
];

function AddPersonForm({ onClose }: Props) {
  const addPerson = useTreeStore((s) => s.addPerson);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    addPerson({
      ...form,
      dateOfBirth: form.dateOfBirth || undefined,
      placeOfBirth: form.placeOfBirth || undefined,
    });
    onClose();
  }

  return (
    <form
      className="absolute top-[calc(100%+6px)] left-0 z-10 flex w-[220px] flex-col gap-2 rounded-xl border border-parchment-border bg-parchment-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
      onSubmit={handleSubmit}
    >
      {FIELDS.map((field, index) => (
        <input
          key={field.key}
          className="rounded-lg border border-parchment-border bg-parchment-panel px-2.5 py-2 font-serif text-xs text-parchment-text focus:outline-2 focus:outline-offset-1 focus:outline-parchment-border"
          type={field.type ?? "text"}
          placeholder={field.placeholder}
          value={form[field.key]}
          onChange={(e) => updateField(field.key, e.target.value)}
          required={field.required}
          autoFocus={index === 0}
        />
      ))}
      <button
        type="submit"
        className="cursor-pointer rounded-full border border-parchment-border bg-parchment-text px-4 py-2 font-serif text-xs text-parchment-card hover:bg-parchment-text-strong"
      >
        Add
      </button>
    </form>
  );
}

export default AddPersonForm;
