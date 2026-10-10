import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;

  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);

  const sales = await prisma.movement.findMany({
    where: {
      type: "VENTE",
      undoneAt: null,
      createdAt: { gte: start },
    },
    select: { unitPrice: true, quantity: true },
  });

  const monthSalesTotal = sales.reduce(
    (sum, s) => sum + (s.unitPrice ?? 0) * s.quantity,
    0,
  );

  return NextResponse.json({ monthSalesTotal });
}
