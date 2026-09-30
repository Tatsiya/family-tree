import { useEffect, useState } from "react";
import { getJson } from "../lib/api";
import {
  buildPlaceSearchUrl,
  parsePlaceSearchResults,
} from "../model/geocoding";
import type { PhotonSearchResponse, PlaceSuggestion } from "../model/geocoding";

const DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;

type PlaceSearchStatus = "idle" | "loading" | "error";

interface UsePlaceSearchResult {
  suggestions: PlaceSuggestion[];
  status: PlaceSearchStatus;
}

// The query a completed (or failed) search belongs to, alongside its
// result -- so "loading" can be derived by comparing the current query
// against this at render time, rather than needing a synchronous setState
// at the start of the debounced effect (which would otherwise leave status
// at "idle" -- and the UI reporting "no matches" -- for the whole debounce
// window before a request is even sent).
interface CompletedSearch {
  query: string;
  suggestions: PlaceSuggestion[];
  status: "idle" | "error";
}

const EMPTY_COMPLETED_SEARCH: CompletedSearch = { query: "", suggestions: [], status: "idle" };

export function usePlaceSearch(query: string): UsePlaceSearchResult {
  const [completed, setCompleted] = useState<CompletedSearch>(EMPTY_COMPLETED_SEARCH);

  const trimmed = query.trim();
  const isQueryTooShort = trimmed.length < MIN_QUERY_LENGTH;
  const isPending = !isQueryTooShort && trimmed !== completed.query;

  useEffect(() => {
    if (isQueryTooShort) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      getJson<PhotonSearchResponse>(buildPlaceSearchUrl(trimmed), controller.signal)
        .then((response) => {
          setCompleted({ query: trimmed, suggestions: parsePlaceSearchResults(response), status: "idle" });
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") return;
          setCompleted({ query: trimmed, suggestions: [], status: "error" });
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [trimmed, isQueryTooShort]);

  return {
    suggestions: isQueryTooShort ? [] : completed.suggestions,
    status: isQueryTooShort ? "idle" : isPending ? "loading" : completed.status,
  };
}
