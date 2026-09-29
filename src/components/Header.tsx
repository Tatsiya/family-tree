import { useRef, useState } from "react";
import type { RefObject } from "react";
import { Download, Upload, UserPlus } from "lucide-react";
import AddPersonForm from "./AddPersonForm";
import { ExportDialog } from "./ExportDialog";
import { GedcomImportInput } from "./import/GedcomImportInput";
import { useClickOutside } from "../hooks/useClickOutside";
import { useGedcomImport } from "../hooks/useGedcomImport";
import { useTreeStore } from "../store/treeStore";

export interface HeaderProps {
  svgRef: RefObject<SVGSVGElement | null>;
}

const toolbarButton =
  "flex items-center gap-2 rounded-full border border-parchment-border bg-parchment-card px-4 py-2 font-serif text-xs text-parchment-text transition-colors hover:bg-parchment-bg disabled:cursor-not-allowed disabled:opacity-50";

function Header({ svgRef }: HeaderProps) {
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  useClickOutside(addRef, () => setIsAddPersonOpen(false), isAddPersonOpen);

  const [isExportOpen, setIsExportOpen] = useState(false);
  const hasTree = useTreeStore((s) => Object.keys(s.tree.persons).length > 0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importFile, status, error } = useGedcomImport();

  function handleImport() {
    fileInputRef.current?.click();
  }

  return (
    <header className="flex items-center justify-between border-b border-parchment-border bg-parchment-panel px-10 py-5">
      <h1 className="m-0 font-serif text-[22px] font-semibold text-parchment-text">
        My Family Tree
      </h1>
      <div className="flex gap-3">
        <div className="relative" ref={addRef}>
          <button
            className={toolbarButton}
            onClick={() => setIsAddPersonOpen((open) => !open)}
          >
            <UserPlus size={16} />
            Add Person
          </button>
          {isAddPersonOpen && (
            <AddPersonForm onClose={() => setIsAddPersonOpen(false)} />
          )}
        </div>
        <div className="relative">
          <button
            className={toolbarButton}
            onClick={handleImport}
            disabled={status === "loading"}
          >
            <Upload size={16} />
            {status === "loading" ? "Importing…" : "Import"}
          </button>
          <GedcomImportInput
            inputRef={fileInputRef}
            error={status === "error" ? error : undefined}
            onFileSelected={importFile}
          />
        </div>
        <div className="relative">
          <button
            className={toolbarButton}
            onClick={() => setIsExportOpen(true)}
            disabled={!hasTree}
          >
            <Download size={16} />
            Export
          </button>
          {isExportOpen && (
            <ExportDialog svgRef={svgRef} onClose={() => setIsExportOpen(false)} />
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
