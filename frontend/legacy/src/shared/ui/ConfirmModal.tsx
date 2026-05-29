import { useEffect } from "react";
import type { ReactNode } from "react";

import "./confirm-modal.css";

export type ConfirmModalProps = {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" colors confirm in red; "primary" in blue (default). */
  variant?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "OK",
  cancelLabel = "Anuluj",
  variant = "primary",
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="confirm-backdrop" onClick={onCancel} />
      <div className="confirm-dialog">
        <h3 id="confirm-title" className="confirm-title">{title}</h3>
        {body && <div className="confirm-body">{body}</div>}
        <div className="confirm-actions">
          <button type="button" className="confirm-btn confirm-btn-secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-btn ${variant === "danger" ? "confirm-btn-danger" : "confirm-btn-primary"}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
