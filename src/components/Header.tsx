import { useRef, useState } from "react";
import { Download, Upload, UserPlus } from "lucide-react";
import AddPersonForm from "./AddPersonForm";
import { useClickOutside } from "../hooks/useClickOutside";
import "../styles/Header.css";

function Header() {
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const addRef = useRef<HTMLDivElement>(null);
  useClickOutside(addRef, () => setIsAddPersonOpen(false), isAddPersonOpen);

  // Import and Export aren't implemented yet - placeholders for future features.
  function handleImport() {}
  function handleExport() {}

  return (
    <header className="appHeader">
      <h1 className="appTitle">My Family Tree</h1>
      <div className="toolbar">
        <div className="addPersonMenu" ref={addRef}>
          <button
            className="toolbarButton"
            onClick={() => setIsAddPersonOpen((open) => !open)}
          >
            <UserPlus size={16} />
            Add Person
          </button>
          {isAddPersonOpen && (
            <AddPersonForm onClose={() => setIsAddPersonOpen(false)} />
          )}
        </div>
        <button className="toolbarButton" onClick={handleImport}>
          <Upload size={16} />
          Import
        </button>
        <button className="toolbarButton" onClick={handleExport}>
          <Download size={16} />
          Export
        </button>
      </div>
    </header>
  );
}

export default Header;
