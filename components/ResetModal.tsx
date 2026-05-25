"use client";

import { useEffect, useRef } from "react";
import { T, type Lang } from "@/lib/i18n";

interface Props {
  open: boolean;
  language: Lang;
  resetting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ResetModal({ open, language, resetting, error, onConfirm, onCancel }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (open) {
      cancelRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="modal-scrim fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-void/80 px-4 py-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <div className="settings-panel w-full max-w-sm rounded-lg border border-edge/60 bg-deep/95 p-5 shadow-2xl shadow-black/70 sm:p-6">
        <div className="mb-4">
          <h2
            id="reset-modal-title"
            className="font-serif text-lg font-semibold leading-snug text-prose sm:text-xl"
          >
            {T("resetModal.title", language)}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-prose-muted/68 sm:text-sm">
            {T("resetModal.description", language)}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs text-crimson-bright/90">
            {T("resetModal.error", language)}: {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={resetting}
            className="settings-close inline-flex h-9 shrink-0 items-center justify-center rounded border border-edge/50 px-4 text-xs font-medium text-prose-muted/72 transition hover:border-edge/80 disabled:opacity-50"
          >
            {T("resetModal.cancel", language)}
          </button>
          <button
            type="button"
            id="reset-modal-confirm"
            onClick={onConfirm}
            disabled={resetting}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded border border-crimson/40 bg-crimson/20 px-4 text-xs font-medium text-crimson-bright/90 transition hover:border-crimson/70 hover:bg-crimson/30 disabled:opacity-50"
          >
            {resetting ? T("resetModal.clearing", language) : T("resetModal.confirm", language)}
          </button>
        </div>
      </div>
    </div>
  );
}