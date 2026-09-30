export interface SplitPlace {
  headline: string;
  detail?: string;
}

// Splits a place string into its leading segment (the specific place --
// town, village) and everything after the first comma (region, country),
// so the panel can give the two different visual weight.
export function splitPlace(placeOfBirth: string): SplitPlace {
  const [first, ...rest] = placeOfBirth.split(",");
  const detail = rest.join(",").trim();
  return { headline: first.trim(), detail: detail || undefined };
}
