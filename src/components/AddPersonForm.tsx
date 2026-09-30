import { useState } from "react";
import type { SubmitEvent } from "react";
import type { Person } from "../model/types";
import { useTreeStore } from "../store/treeStore";

interface Props {
  onClose: () => void;
}

type FormState = Pick<
  Person,
  "name" | "middleName" | "lastName" | "dateOfBirth" | "placeOfBirth" | "sex"
>;

const INITIAL_FORM: FormState = {
  name: "",
  middleName: "",
  lastName: "",
  dateOfBirth: "",
  placeOfBirth: "",
  sex: undefined,
};

const SEX_OPTIONS: { value: "M" | "F"; label: string }[] = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
];

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
      className="absolute top-[calc(100%+6px)] left-0 z-10 flex w-[220px] flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
      onSubmit={handleSubmit}
    >
      {FIELDS.map((field, index) => (
        <input
          key={field.key}
          className="rounded-lg border border-border bg-surface px-2.5 py-2 text-xs text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent"
          type={field.type ?? "text"}
          placeholder={field.placeholder}
          value={form[field.key]}
          onChange={(e) => updateField(field.key, e.target.value)}
          required={field.required}
          autoFocus={index === 0}
        />
      ))}
      <div className="flex gap-2">
        {SEX_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() =>
              updateField("sex", form.sex === option.value ? undefined : option.value)
            }
            className={`flex-1 rounded-lg border px-2.5 py-2 text-xs font-semibold transition-colors focus:outline-2 focus:outline-offset-2 focus:outline-accent ${
              form.sex === option.value
                ? "border-primary bg-primary text-surface"
                : "border-border bg-surface text-ink hover:bg-bg"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <button
        type="submit"
        className="cursor-pointer rounded-full border border-primary bg-primary px-4 py-2 text-xs font-semibold text-surface hover:bg-primary-hover focus:outline-2 focus:outline-offset-2 focus:outline-accent"
      >
        Add
      </button>
    </form>
  );
}

export default AddPersonForm;
