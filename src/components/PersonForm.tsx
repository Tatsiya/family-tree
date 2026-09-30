import { useState } from "react";
import type { SubmitEvent } from "react";
import type { Person } from "../model/types";
import { Modal } from "./Modal";
import { PlaceAutocomplete } from "./PlaceAutocomplete";
import type { PlaceValue } from "./PlaceAutocomplete";

export interface PersonFormProps {
  person?: Person;
  title: string;
  submitLabel: string;
  onSubmit: (draft: Omit<Person, "id">) => void;
  onClose: () => void;
}

type FormState = Pick<
  Person,
  | "name"
  | "middleName"
  | "lastName"
  | "maidenName"
  | "dateOfBirth"
  | "dateOfDeath"
  | "placeOfBirth"
  | "placeOfBirthLat"
  | "placeOfBirthLng"
  | "sex"
>;

const BLANK_FORM: FormState = {
  name: "",
  middleName: "",
  lastName: "",
  maidenName: "",
  dateOfBirth: "",
  dateOfDeath: "",
  placeOfBirth: "",
  placeOfBirthLat: undefined,
  placeOfBirthLng: undefined,
  sex: undefined,
};

function toFormState(person: Person | undefined): FormState {
  if (!person) return BLANK_FORM;
  return {
    name: person.name,
    middleName: person.middleName,
    lastName: person.lastName,
    maidenName: person.maidenName ?? "",
    dateOfBirth: person.dateOfBirth ?? "",
    dateOfDeath: person.dateOfDeath ?? "",
    placeOfBirth: person.placeOfBirth ?? "",
    placeOfBirthLat: person.placeOfBirthLat,
    placeOfBirthLng: person.placeOfBirthLng,
    sex: person.sex,
  };
}

const SEX_OPTIONS: { value: "M" | "F"; label: string }[] = [
  { value: "M", label: "Male" },
  { value: "F", label: "Female" },
];

const TEXT_FIELDS: { key: keyof FormState; label: string; required?: boolean }[] = [
  { key: "name", label: "First name", required: true },
  { key: "middleName", label: "Middle name" },
  { key: "lastName", label: "Last name", required: true },
  { key: "maidenName", label: "Maiden name" },
];

const DATE_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "dateOfDeath", label: "Date of death" },
];

const inputClassName =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent";

export function PersonForm({ person, title, submitLabel, onSubmit, onClose }: PersonFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(person));

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updatePlace(place: PlaceValue) {
    setForm((prev) => ({
      ...prev,
      placeOfBirth: place.name,
      placeOfBirthLat: place.lat,
      placeOfBirthLng: place.lng,
    }));
  }

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    onSubmit({
      ...form,
      maidenName: form.maidenName || undefined,
      dateOfBirth: form.dateOfBirth || undefined,
      dateOfDeath: form.dateOfDeath || undefined,
      placeOfBirth: form.placeOfBirth || undefined,
    });
    onClose();
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          {TEXT_FIELDS.map((field) => (
            <label key={field.key} className="flex flex-col gap-1 text-xs font-semibold text-ink-2">
              {field.label}
              <input
                className={inputClassName}
                type="text"
                value={form[field.key] ?? ""}
                onChange={(e) => updateField(field.key, e.target.value)}
                required={field.required}
              />
            </label>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-xs font-semibold text-ink-2">
          Place of birth
          <PlaceAutocomplete
            label="Place of birth"
            value={{ name: form.placeOfBirth ?? "", lat: form.placeOfBirthLat, lng: form.placeOfBirthLng }}
            onChange={updatePlace}
            inputClassName={inputClassName}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          {DATE_FIELDS.map((field) => (
            <label key={field.key} className="flex flex-col gap-1 text-xs font-semibold text-ink-2">
              {field.label}
              <input
                className={inputClassName}
                type="date"
                value={form[field.key] ?? ""}
                onChange={(e) => updateField(field.key, e.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="flex gap-2">
          {SEX_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateField("sex", form.sex === option.value ? undefined : option.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                form.sex === option.value
                  ? "border-primary bg-primary text-surface"
                  : "border-border bg-surface text-ink hover:bg-bg"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-full border border-border-strong bg-transparent px-4 text-sm font-semibold text-secondary-text transition-colors hover:bg-hover-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="h-11 rounded-full bg-primary px-5 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
