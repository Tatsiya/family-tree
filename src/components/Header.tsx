import { useRef, useState } from "react";
import type { RefObject } from "react";
import { Download, Upload, UserPlus } from "lucide-react";
import { ExportDialog } from "./ExportDialog";
import { GedcomImportInput } from "./import/GedcomImportInput";
import { useGedcomImport } from "../hooks/useGedcomImport";
import { useTreeStore } from "../store/treeStore";

export interface HeaderProps {
  svgRef: RefObject<SVGSVGElement | null>;
}

const primaryButton =
  "flex h-11 items-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-surface transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton =
  "flex h-11 items-center gap-2 rounded-full border border-border-strong bg-transparent px-4 text-sm font-semibold text-secondary-text transition-colors hover:bg-hover-tint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

function Header({ svgRef }: HeaderProps) {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const hasTree = useTreeStore((s) => Object.keys(s.tree.persons).length > 0);
  const openAddPerson = useTreeStore((s) => s.openAddPerson);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importFile, status, error } = useGedcomImport();

  function handleImport() {
    fileInputRef.current?.click();
  }

  return (
    <header className="flex h-18 items-center justify-between border-b border-border-soft bg-surface px-7">
      <h1 className="m-0 font-serif text-[28px] leading-none font-bold text-ink">
        My Family Tree
      </h1>
      <div className="flex gap-3">
        {!hasTree && (
          <button className={primaryButton} onClick={openAddPerson}>
            <UserPlus size={16} />
            Add Person
          </button>
        )}
        <div className="relative">
          <button
            className={secondaryButton}
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
            className={secondaryButton}
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
