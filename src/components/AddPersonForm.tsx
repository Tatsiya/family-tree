import { useState } from "react";
import type { SubmitEvent } from "react";
import type { Person } from "../model/types";
import { useTreeStore } from "../store/treeStore";
import "../styles/AddPersonForm.css";

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
    <form className="addPersonForm" onSubmit={handleSubmit}>
      {FIELDS.map((field, index) => (
        <input
          key={field.key}
          className="addPersonInput"
          type={field.type ?? "text"}
          placeholder={field.placeholder}
          value={form[field.key]}
          onChange={(e) => updateField(field.key, e.target.value)}
          required={field.required}
          autoFocus={index === 0}
        />
      ))}
      <button type="submit" className="addPersonSubmit">
        Add
      </button>
    </form>
  );
}

export default AddPersonForm;
