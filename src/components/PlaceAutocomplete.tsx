import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { MapPin } from "lucide-react";
import { useClickOutside } from "../hooks/useClickOutside";
import { usePlaceSearch } from "../hooks/usePlaceSearch";
import type { PlaceSuggestion } from "../model/geocoding";

export interface PlaceValue {
  name: string;
  lat?: number;
  lng?: number;
}

export interface PlaceAutocompleteProps {
  value: PlaceValue;
  onChange: (value: PlaceValue) => void;
  label: string;
  placeholder?: string;
  inputClassName?: string;
}

const MIN_CHARS_TO_SHOW_DROPDOWN = 3;

const DEFAULT_INPUT_CLASS_NAME =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:outline-2 focus:outline-offset-2 focus:outline-accent";

// Search-as-you-type place picker backed by OpenStreetMap's Nominatim
// geocoder. Selecting a suggestion attaches lat/lng to the value so a future
// map view can place a pin; freely typed text is kept as a name-only place
// with no coordinates.
export function PlaceAutocomplete({
  value,
  onChange,
  label,
  placeholder,
  inputClassName = DEFAULT_INPUT_CLASS_NAME,
}: PlaceAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const { suggestions, status } = usePlaceSearch(isOpen ? value.name : "");
  const showDropdown = isOpen && value.name.trim().length >= MIN_CHARS_TO_SHOW_DROPDOWN;

  useClickOutside(containerRef, () => setIsOpen(false), isOpen);

  function selectSuggestion(suggestion: PlaceSuggestion) {
    onChange({ name: suggestion.name, lat: suggestion.lat, lng: suggestion.lng });
    setIsOpen(false);
  }

  function handleChange(text: string) {
    onChange({ name: text, lat: undefined, lng: undefined });
    setIsOpen(true);
    setHighlightedIndex(0);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      selectSuggestion(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-label={label}
        autoComplete="off"
        className={inputClassName}
        placeholder={placeholder ?? label}
        value={value.name}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
      />
      {showDropdown && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="absolute top-[calc(100%+4px)] left-0 z-10 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
        >
          {status === "loading" && <li className="px-3 py-2 text-xs text-muted">Searching…</li>}
          {status === "error" && (
            <li className="px-3 py-2 text-xs text-muted">
              Couldn&rsquo;t reach place search — you can still type a place name.
            </li>
          )}
          {status === "idle" && suggestions.length === 0 && (
            <li className="px-3 py-2 text-xs text-muted">No matching places found.</li>
          )}
          {suggestions.map((suggestion, index) => (
            <li key={`${suggestion.lat},${suggestion.lng}`} role="option" aria-selected={index === highlightedIndex}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectSuggestion(suggestion)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`flex w-full items-start gap-2 px-3 py-2 text-left text-sm text-ink transition-colors ${
                  index === highlightedIndex ? "bg-hover-tint" : ""
                }`}
              >
                <MapPin size={14} className="mt-0.5 shrink-0 stroke-gold" />
                <span className="truncate">{suggestion.name}</span>
              </button>
            </li>
          ))}
          {suggestions.length > 0 && (
            <li className="border-t border-border-soft px-3 pt-1.5 text-[10px] text-muted">
              Search by OpenStreetMap
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
