import { useState } from "react";
import { gedcomToTree } from "../model/gedcom/gedcomToTree";
import { useTreeStore } from "../store/treeStore";

type GedcomImportStatus = "idle" | "loading" | "error";

interface UseGedcomImportResult {
  status: GedcomImportStatus;
  error?: string;
  importFile: (file: File) => Promise<void>;
}

const GENERIC_ERROR_MESSAGE =
  "This file could not be read as GEDCOM. Choose a .ged file exported from your genealogy software.";

export function useGedcomImport(): UseGedcomImportResult {
  const [status, setStatus] = useState<GedcomImportStatus>("idle");
  const [error, setError] = useState<string>();
  const loadTree = useTreeStore((s) => s.loadTree);

  async function importFile(file: File) {
    setStatus("loading");
    try {
      const buffer = await file.arrayBuffer();
      const tree = gedcomToTree(buffer);
      loadTree(tree);
      setStatus("idle");
    } catch (err) {
      setError(err instanceof Error ? err.message : GENERIC_ERROR_MESSAGE);
      setStatus("error");
    }
  }

  return { status, error, importFile };
}
