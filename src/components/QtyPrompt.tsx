"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (qty: number) => void;
};

export function QtyPrompt({ open, title, onClose, onConfirm }: Props) {
  const [qty, setQty] = useState("2");

  useEffect(() => {
    if (open) setQty("2");
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sr-overlay)] sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div className="relative w-full max-w-sm rounded-t-[var(--sr-radius-card)] bg-surface p-5 shadow-[var(--sr-shadow)] sm:rounded-[var(--sr-radius-card)]">
        <h2 className="mb-3 font-display text-lg font-black">{title}</h2>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          className="focus-ring mb-4 min-h-14 w-full rounded-[var(--sr-radius-control)] border border-border bg-background px-3 text-2xl font-bold"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          className="focus-ring flex min-h-14 w-full items-center justify-center rounded-[var(--sr-radius-pill)] bg-brand font-bold text-brand-fg"
          onClick={() => {
            const n = Number(qty);
            if (Number.isInteger(n) && n > 0) onConfirm(n);
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  );
}
