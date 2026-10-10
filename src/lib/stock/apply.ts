import type { Movement, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  applyListingDelta,
  applyStockDelta,
  listingDeltaForMovement,
  reverseMovementType,
  reverseQuantity,
  stockDeltaForMovement,
} from "./rules";
import { StockError, type ApplyMovementInput } from "./types";

type Tx = Prisma.TransactionClient;

async function getBagOrThrow(tx: Tx, bagId: string) {
  const bag = await tx.bag.findUnique({ where: { id: bagId } });
  if (!bag || bag.archivedAt) {
    throw new StockError("Sac introuvable.");
  }
  return bag;
}

async function syncListing(
  tx: Tx,
  bagId: string,
  accountId: string,
  delta: number,
) {
  if (delta === 0) return;

  const existing = await tx.listing.findUnique({
    where: { bagId_accountId: { bagId, accountId } },
  });
  const current = existing?.quantity ?? 0;
  const next = applyListingDelta(current, delta);

  if (next === 0) {
    if (existing) {
      await tx.listing.delete({ where: { id: existing.id } });
    }
    return;
  }

  await tx.listing.upsert({
    where: { bagId_accountId: { bagId, accountId } },
    create: { bagId, accountId, quantity: next },
    update: { quantity: next },
  });
}

function storedQuantity(
  type: ApplyMovementInput["type"],
  quantity: number,
): number {
  // AJUSTEMENT conserve le signe ; les autres types stockent une quantité positive.
  if (type === "AJUSTEMENT") return quantity;
  return Math.abs(quantity);
}

export async function applyMovement(
  input: ApplyMovementInput,
): Promise<Movement> {
  const {
    type,
    bagId,
    accountId = null,
    quantity,
    unitPrice = null,
    note = null,
  } = input;

  if (
    (type === "VENTE" ||
      type === "MISE_EN_VENTE" ||
      type === "RETRAIT_VENTE") &&
    !accountId
  ) {
    throw new StockError("Un compte est requis pour cette action.");
  }

  if (type === "VENTE" && (unitPrice === null || unitPrice === undefined)) {
    throw new StockError("Un prix de vente est requis.");
  }

  return prisma.$transaction(async (tx) => {
    const bag = await getBagOrThrow(tx, bagId);
    const stockDelta = stockDeltaForMovement(type, quantity);
    const nextStock = applyStockDelta(bag.quantityOnHand, stockDelta);

    if (accountId) {
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (!account || account.archivedAt) {
        throw new StockError("Compte introuvable.");
      }

      if (type === "VENTE") {
        const listing = await tx.listing.findUnique({
          where: { bagId_accountId: { bagId, accountId } },
        });
        const listed = listing?.quantity ?? 0;
        const remove = Math.min(listed, Math.abs(quantity));
        if (remove > 0) {
          await syncListing(tx, bagId, accountId, -remove);
        }
      } else {
        const listingDelta = listingDeltaForMovement(type, Math.abs(quantity));
        if (listingDelta !== 0) {
          await syncListing(tx, bagId, accountId, listingDelta);
        }
      }
    }

    await tx.bag.update({
      where: { id: bagId },
      data: { quantityOnHand: nextStock },
    });

    return tx.movement.create({
      data: {
        type,
        bagId,
        accountId,
        quantity: storedQuantity(type, quantity),
        unitPrice,
        note,
      },
    });
  });
}

export async function undoMovement(movementId: string): Promise<Movement> {
  return prisma.$transaction(async (tx) => {
    const original = await tx.movement.findUnique({
      where: { id: movementId },
    });

    if (!original) {
      throw new StockError("Mouvement introuvable.");
    }
    if (original.undoneAt) {
      throw new StockError("Ce mouvement est déjà annulé.");
    }

    const alreadyUndone = await tx.movement.findFirst({
      where: { undoesMovementId: movementId },
    });
    if (alreadyUndone) {
      throw new StockError("Ce mouvement est déjà annulé.");
    }

    const bag = await getBagOrThrow(tx, original.bagId);
    const originalStockDelta = stockDeltaForMovement(
      original.type,
      original.quantity,
    );
    const nextStock = applyStockDelta(bag.quantityOnHand, -originalStockDelta);

    await tx.bag.update({
      where: { id: original.bagId },
      data: { quantityOnHand: nextStock },
    });

    if (original.accountId) {
      if (original.type === "VENTE") {
        await syncListing(
          tx,
          original.bagId,
          original.accountId,
          original.quantity,
        );
      } else {
        const listingDelta = listingDeltaForMovement(
          original.type,
          Math.abs(original.quantity),
        );
        if (listingDelta !== 0) {
          await syncListing(
            tx,
            original.bagId,
            original.accountId,
            -listingDelta,
          );
        }
      }
    }

    await tx.movement.update({
      where: { id: movementId },
      data: { undoneAt: new Date() },
    });

    const reverseType = reverseMovementType(original.type);
    const reverseQty = reverseQuantity(original.type, original.quantity);

    return tx.movement.create({
      data: {
        type: reverseType,
        bagId: original.bagId,
        accountId: original.accountId,
        quantity: storedQuantity(reverseType, reverseQty),
        unitPrice: original.unitPrice,
        note: original.note
          ? `Annulation : ${original.note}`
          : "Annulation",
        undoesMovementId: movementId,
      },
    });
  });
}
