import { describe, expect, it } from "vitest";
import {
  applyListingDelta,
  applyStockDelta,
  computeOverlistingAlerts,
  reverseMovementType,
  reverseQuantity,
  stockDeltaForMovement,
} from "./rules";
import { StockError } from "./types";

describe("stockDeltaForMovement", () => {
  it("augmente le stock pour une réception", () => {
    expect(stockDeltaForMovement("RECEPTION", 3)).toBe(3);
  });

  it("diminue le stock pour une vente", () => {
    expect(stockDeltaForMovement("VENTE", 2)).toBe(-2);
  });

  it("diminue le stock pour une perte", () => {
    expect(stockDeltaForMovement("PERTE", 1)).toBe(-1);
  });

  it("accepte un ajustement signé", () => {
    expect(stockDeltaForMovement("AJUSTEMENT", -2)).toBe(-2);
    expect(stockDeltaForMovement("AJUSTEMENT", 4)).toBe(4);
  });

  it("ne change pas le stock pour mise/retrait en vente", () => {
    expect(stockDeltaForMovement("MISE_EN_VENTE", 2)).toBe(0);
    expect(stockDeltaForMovement("RETRAIT_VENTE", 2)).toBe(0);
  });
});

describe("applyStockDelta", () => {
  it("refuse un stock négatif", () => {
    expect(() => applyStockDelta(1, -2)).toThrow(StockError);
  });

  it("autorise un stock à zéro", () => {
    expect(applyStockDelta(2, -2)).toBe(0);
  });
});

describe("annulation", () => {
  it("calcule le type et la quantité inverses", () => {
    expect(reverseMovementType("RECEPTION")).toBe("AJUSTEMENT");
    expect(reverseQuantity("RECEPTION", 3)).toBe(-3);
    expect(reverseMovementType("VENTE")).toBe("RECEPTION");
    expect(reverseQuantity("VENTE", 1)).toBe(1);
    expect(reverseQuantity("AJUSTEMENT", -2)).toBe(2);
  });

  it("annuler une réception restaure le stock d'origine", () => {
    const afterReception = applyStockDelta(5, stockDeltaForMovement("RECEPTION", 3));
    expect(afterReception).toBe(8);
    const afterUndo = applyStockDelta(
      afterReception,
      -stockDeltaForMovement("RECEPTION", 3),
    );
    expect(afterUndo).toBe(5);
  });

  it("annuler une vente restaure le stock", () => {
    const afterSale = applyStockDelta(5, stockDeltaForMovement("VENTE", 2));
    expect(afterSale).toBe(3);
    const afterUndo = applyStockDelta(
      afterSale,
      -stockDeltaForMovement("VENTE", 2),
    );
    expect(afterUndo).toBe(5);
  });
});

describe("listings", () => {
  it("augmente / diminue la quantité listée", () => {
    expect(applyListingDelta(0, 2)).toBe(2);
    expect(applyListingDelta(3, -1)).toBe(2);
    expect(() => applyListingDelta(1, -2)).toThrow(StockError);
  });

  it("détecte les alertes de sur-mise en vente", () => {
    const alerts = computeOverlistingAlerts("bag1", 1, [
      { accountId: "a1", accountName: "Vinted", quantity: 3 },
      { accountId: "a2", accountName: "LBC", quantity: 1 },
    ]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0]).toMatchObject({
      accountName: "Vinted",
      excess: 2,
      stockQuantity: 1,
    });
  });

  it("pas d'alerte si le listé ≤ stock", () => {
    const alerts = computeOverlistingAlerts("bag1", 5, [
      { accountId: "a1", accountName: "Vinted", quantity: 2 },
    ]);
    expect(alerts).toHaveLength(0);
  });
});
