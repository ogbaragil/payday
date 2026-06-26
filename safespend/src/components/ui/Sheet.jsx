import { useEffect } from "react";
import { X } from "lucide-react";

// A mobile-first bottom sheet. On wider screens it centers as a dialog.
export default function Sheet({ open, onClose, title, children, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/65 backdrop-blur-[2px] animate-[fade-up_0.2s_ease]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-4xl border-t border-line/70 bg-surface animate-sheet-up sm:max-w-md sm:rounded-4xl sm:border"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-line sm:hidden" />
          <h2 className="hidden font-display text-lg font-bold tracking-tight sm:block">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="hidden h-9 w-9 items-center justify-center rounded-full bg-elevated text-muted transition hover:text-ink sm:flex"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex items-center justify-between px-5 pb-1 sm:hidden">
          <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-elevated text-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-2">{children}</div>

        {footer && (
          <div className="safe-bottom border-t border-line bg-surface px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
