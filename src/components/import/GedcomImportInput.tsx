import type { ChangeEvent, RefObject } from "react";

export interface GedcomImportInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  error?: string;
  onFileSelected: (file: File) => void;
}

export function GedcomImportInput({
  inputRef,
  error,
  onFileSelected,
}: GedcomImportInputProps) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) onFileSelected(file);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".ged"
        className="hidden"
        onChange={handleChange}
      />
      {error && (
        <p className="absolute top-[calc(100%+6px)] right-0 z-10 w-[240px] rounded-xl border border-parchment-border bg-parchment-card p-3 font-serif text-xs text-parchment-text shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
          {error}
        </p>
      )}
    </>
  );
}
