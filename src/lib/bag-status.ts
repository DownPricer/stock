export type StockStatus = "ok" | "low" | "out";

export function getStockStatus(
  quantity: number,
  threshold: number,
): StockStatus {
  if (quantity <= 0) return "out";
  if (quantity <= threshold) return "low";
  return "ok";
}

export const stockStatusLabel: Record<StockStatus, string> = {
  ok: "OK",
  low: "Bas",
  out: "Rupture",
};
