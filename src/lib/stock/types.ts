import type { MovementType } from "@prisma/client";

export type { MovementType };

export class StockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockError";
  }
}

export type ApplyMovementInput = {
  type: MovementType;
  bagId: string;
  accountId?: string | null;
  quantity: number;
  unitPrice?: number | null;
  note?: string | null;
};

export type ListingSnapshot = {
  accountId: string;
  accountName: string;
  quantity: number;
};

export type OverlistingAlert = {
  bagId: string;
  accountId: string;
  accountName: string;
  listedQuantity: number;
  stockQuantity: number;
  excess: number;
};
