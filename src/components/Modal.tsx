import { useEffect } from "react";
import type { MouseEvent, ReactNode } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function stopPropagation(e: MouseEvent) {
    e.stopPropagation();
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm rounded-2xl border border-parchment-border bg-parchment-card p-6 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
        onClick={stopPropagation}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-parchment-text">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-full p-1 text-parchment-text transition-colors hover:bg-parchment-bg focus:outline-2 focus:outline-offset-1 focus:outline-parchment-border"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
