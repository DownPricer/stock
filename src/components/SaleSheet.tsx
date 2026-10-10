"use client";

import { useEffect, useState } from "react";
import { IconClose } from "@/components/icons";
import { formatEuro } from "@/lib/money";

export type AccountOption = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  open: boolean;
  bagName: string;
  targetPrice: number;
  accounts: AccountOption[];
  lastAccountId?: string | null;
  onClose: () => void;
  onSell: (accountId: string, unitPrice: number) => void;
  onOther: (kind: "PERTE" | "AJUSTEMENT", note: string) => void;
};

export function SaleSheet({
  open,
  bagName,
  targetPrice,
  accounts,
  lastAccountId,
  onClose,
  onSell,
  onOther,
}: Props) {
  const [accountId, setAccountId] = useState("");
  const [price, setPrice] = useState(String(targetPrice));
  const [mode, setMode] = useState<"sell" | "other">("sell");
  const [otherKind, setOtherKind] = useState<"PERTE" | "AJUSTEMENT">("PERTE");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    const preferred =
      (lastAccountId && accounts.find((a) => a.id === lastAccountId)?.id) ||
      accounts[0]?.id ||
      "";
    setAccountId(preferred);
    setPrice(String(targetPrice));
    setMode("sell");
    setOtherKind("PERTE");
    setNote("");
  }, [open, accounts, lastAccountId, targetPrice]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--sr-overlay)] p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Fermer"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-title"
        className="relative w-full max-w-lg rounded-t-[var(--sr-radius-card)] bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--sr-shadow)] sm:rounded-[var(--sr-radius-card)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-danger">
              Vendu ?
            </p>
            <h2
              id="sale-title"
              className="font-display text-xl font-black text-foreground"
            >
              {bagName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-background"
            aria-label="Fermer"
          >
            <IconClose size={18} />
          </button>
        </div>

        {mode === "sell" ? (
          <>
            <label className="mb-3 block text-sm text-muted">
              Compte
              <select
                className="focus-ring mt-1 min-h-12 w-full rounded-[var(--sr-radius-control)] border border-border bg-background px-3 text-base text-foreground"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              >
                {accounts.length === 0 ? (
                  <option value="">Aucun compte</option>
                ) : (
                  accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))
                )}
              </select>
            </label>

            <label className="mb-4 block text-sm text-muted">
              Prix ({formatEuro(targetPrice)} visé)
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="focus-ring mt-1 min-h-12 w-full rounded-[var(--sr-radius-control)] border border-border bg-background px-3 text-base"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </label>

            <button
              type="button"
              disabled={!accountId || Number.isNaN(Number(price))}
              className="focus-ring mb-3 flex min-h-14 w-full items-center justify-center rounded-[var(--sr-radius-pill)] bg-brand text-base font-bold text-brand-fg disabled:opacity-40"
              onClick={() => onSell(accountId, Number(price))}
            >
              Valider la vente
            </button>

            <button
              type="button"
              className="focus-ring min-h-12 w-full text-sm font-semibold text-muted underline underline-offset-2"
              onClick={() => setMode("other")}
            >
              Autre raison
            </button>
          </>
        ) : (
          <>
            <div className="mb-3 grid grid-cols-2 gap-2">
              {(
                [
                  ["PERTE", "Perte / cadeau"],
                  ["AJUSTEMENT", "Correction"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={`focus-ring min-h-12 rounded-[var(--sr-radius-control)] border text-sm font-semibold ${
                    otherKind === value
                      ? "border-night bg-night text-cream dark:border-cream dark:bg-cream dark:text-night"
                      : "border-border text-foreground"
                  }`}
                  onClick={() => setOtherKind(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="mb-4 block text-sm text-muted">
              Note (optionnel)
              <input
                className="focus-ring mt-1 min-h-12 w-full rounded-[var(--sr-radius-control)] border border-border bg-background px-3 text-base"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <button
              type="button"
              className="focus-ring mb-3 flex min-h-14 w-full items-center justify-center rounded-[var(--sr-radius-pill)] bg-danger text-base font-bold text-cream"
              onClick={() => onOther(otherKind, note)}
            >
              Retirer 1 du stock
            </button>
            <button
              type="button"
              className="focus-ring min-h-12 w-full text-sm font-semibold text-muted underline"
              onClick={() => setMode("sell")}
            >
              Retour vente
            </button>
          </>
        )}
      </div>
    </div>
  );
}
