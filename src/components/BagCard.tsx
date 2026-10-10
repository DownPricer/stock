"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { IconMinus, IconPlus } from "@/components/icons";
import { StockDot } from "./StockDot";

export type BagCardData = {
  id: string;
  name: string;
  photoPath: string | null;
  quantityOnHand: number;
  lowStockThreshold: number;
  targetPrice: number;
  purchasePrice?: number;
  colorVariant: string | null;
  listings?: {
    quantity: number;
    account: { id: string; name: string; color: string };
  }[];
};

type Props = {
  bag: BagCardData;
  onPlus: () => void;
  onPlusLong: () => void;
  onMinus: () => void;
  onOpen: () => void;
};

export function BagCard({ bag, onPlus, onPlusLong, onMinus, onOpen }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longFired = useRef(false);
  const [pop, setPop] = useState(false);
  const prevQty = useRef(bag.quantityOnHand);

  useEffect(() => {
    if (prevQty.current !== bag.quantityOnHand) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 350);
      prevQty.current = bag.quantityOnHand;
      return () => clearTimeout(t);
    }
  }, [bag.quantityOnHand]);

  const startLong = () => {
    longFired.current = false;
    timer.current = setTimeout(() => {
      longFired.current = true;
      onPlusLong();
    }, 450);
  };

  const endLong = () => {
    if (timer.current) clearTimeout(timer.current);
  };

  const src = bag.photoPath ? `/api/uploads/${bag.photoPath}` : null;

  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--sr-radius-card)] border border-border bg-surface shadow-[var(--sr-shadow-sm)] transition-shadow hover:shadow-[var(--sr-shadow)]">
      <button
        type="button"
        onClick={onOpen}
        className="focus-ring relative aspect-square w-full overflow-hidden bg-border text-left"
      >
        {src ? (
          <Image
            src={src}
            alt=""
            fill
            sizes="(max-width:640px) 100vw, (max-width:1024px) 33vw, 20vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            unoptimized={src.startsWith("/api/")}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-sm text-muted">
            Pas de photo
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <button type="button" onClick={onOpen} className="focus-ring text-left">
          <div className="flex items-center gap-2">
            <StockDot
              quantity={bag.quantityOnHand}
              threshold={bag.lowStockThreshold}
            />
            <h2 className="truncate font-display text-base font-extrabold tracking-tight">
              {bag.name}
            </h2>
          </div>
          {bag.colorVariant ? (
            <p className="mt-0.5 truncate text-sm text-muted">
              {bag.colorVariant}
            </p>
          ) : null}
        </button>

        <div className="mt-auto flex items-end justify-between gap-2">
          <p
            className={`font-display text-[var(--sr-text-stat)] font-black tabular-nums leading-none ${
              pop ? "qty-pop" : ""
            }`}
          >
            {bag.quantityOnHand}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Retirer"
              className="focus-ring flex h-12 w-12 items-center justify-center rounded-[var(--sr-radius-control)] border border-border bg-background text-foreground transition-colors hover:bg-border"
              onClick={onMinus}
            >
              <IconMinus size={20} />
            </button>
            <button
              type="button"
              aria-label="Ajouter"
              className="focus-ring flex h-12 w-12 items-center justify-center rounded-[var(--sr-radius-control)] bg-brand text-brand-fg transition-transform hover:scale-105"
              onPointerDown={startLong}
              onPointerUp={() => {
                endLong();
                if (!longFired.current) onPlus();
              }}
              onPointerLeave={endLong}
              onPointerCancel={endLong}
            >
              <IconPlus size={20} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
