import type { MovementType } from "@prisma/client";
import { StockError, type ListingSnapshot, type OverlistingAlert } from "./types";

/** Delta appliqué au stock physique (quantityOnHand). */
export function stockDeltaForMovement(
  type: MovementType,
  quantity: number,
): number {
  if (!Number.isInteger(quantity) || quantity === 0) {
    throw new StockError("La quantité doit être un entier non nul.");
  }

  switch (type) {
    case "RECEPTION":
      if (quantity < 0) {
        throw new StockError("Une réception doit avoir une quantité positive.");
      }
      return quantity;
    case "VENTE":
    case "PERTE":
      if (quantity < 0) {
        throw new StockError("La quantité doit être positive.");
      }
      return -quantity;
    case "AJUSTEMENT":
      // Quantité signée : positive = +stock, négative = −stock
      return quantity;
    case "MISE_EN_VENTE":
    case "RETRAIT_VENTE":
      if (quantity < 0) {
        throw new StockError("La quantité doit être positive.");
      }
      return 0;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function applyStockDelta(current: number, delta: number): number {
  const next = current + delta;
  if (next < 0) {
    throw new StockError("Stock insuffisant : le stock ne peut pas être négatif.");
  }
  return next;
}

export function listingDeltaForMovement(
  type: MovementType,
  quantity: number,
): number {
  switch (type) {
    case "MISE_EN_VENTE":
      return quantity;
    case "RETRAIT_VENTE":
      return -quantity;
    case "VENTE":
      // Une vente retire aussi 1 de la quantité listée sur le compte si présent
      return -Math.abs(quantity);
    default:
      return 0;
  }
}

export function applyListingDelta(current: number, delta: number): number {
  const next = current + delta;
  if (next < 0) {
    throw new StockError(
      "Quantité en vente insuffisante sur ce compte.",
    );
  }
  return next;
}

export function reverseMovementType(type: MovementType): MovementType {
  switch (type) {
    case "RECEPTION":
      return "AJUSTEMENT";
    case "VENTE":
      return "RECEPTION";
    case "PERTE":
      return "AJUSTEMENT";
    case "AJUSTEMENT":
      return "AJUSTEMENT";
    case "MISE_EN_VENTE":
      return "RETRAIT_VENTE";
    case "RETRAIT_VENTE":
      return "MISE_EN_VENTE";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

/** Quantité (signée pour AJUSTEMENT) pour le mouvement d'annulation. */
export function reverseQuantity(
  type: MovementType,
  quantity: number,
): number {
  switch (type) {
    case "RECEPTION":
      // Annuler une réception = ajustement négatif
      return -quantity;
    case "VENTE":
    case "PERTE":
      return quantity;
    case "AJUSTEMENT":
      return -quantity;
    case "MISE_EN_VENTE":
    case "RETRAIT_VENTE":
      return quantity;
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function computeOverlistingAlerts(
  bagId: string,
  stockQuantity: number,
  listings: ListingSnapshot[],
): OverlistingAlert[] {
  return listings
    .filter((l) => l.quantity > stockQuantity)
    .map((l) => ({
      bagId,
      accountId: l.accountId,
      accountName: l.accountName,
      listedQuantity: l.quantity,
      stockQuantity,
      excess: l.quantity - stockQuantity,
    }));
}
