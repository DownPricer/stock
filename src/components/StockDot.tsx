import { getStockStatus, type StockStatus } from "@/lib/bag-status";

const colors: Record<StockStatus, string> = {
  ok: "bg-ok",
  low: "bg-warn",
  out: "bg-danger",
};

export function StockDot({
  quantity,
  threshold,
}: {
  quantity: number;
  threshold: number;
}) {
  const status = getStockStatus(quantity, threshold);
  return (
    <span
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${colors[status]}`}
      aria-hidden
    />
  );
}
