import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { computeOverlistingAlerts } from "@/lib/stock";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireSession();
  if (denied) return denied;

  const { id } = await params;
  const bag = await prisma.bag.findUnique({
    where: { id },
    include: {
      listings: { include: { account: true } },
      movements: {
        include: { account: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });

  if (!bag) {
    return NextResponse.json({ error: "Sac introuvable" }, { status: 404 });
  }

  const alerts = computeOverlistingAlerts(
    bag.id,
    bag.quantityOnHand,
    bag.listings.map((l) => ({
      accountId: l.accountId,
      accountName: l.account.name,
      quantity: l.quantity,
    })),
  );

  return NextResponse.json({ bag, alerts });
}

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  colorVariant: z.string().max(80).nullable().optional(),
  purchasePrice: z.number().min(0).optional(),
  targetPrice: z.number().min(0).optional(),
  lowStockThreshold: z.number().int().min(0).optional(),
  notes: z.string().max(2000).nullable().optional(),
  archive: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const denied = await requireSession();
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const data = parsed.data;
  const bag = await prisma.bag.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.colorVariant !== undefined
        ? { colorVariant: data.colorVariant }
        : {}),
      ...(data.purchasePrice !== undefined
        ? { purchasePrice: data.purchasePrice }
        : {}),
      ...(data.targetPrice !== undefined
        ? { targetPrice: data.targetPrice }
        : {}),
      ...(data.lowStockThreshold !== undefined
        ? { lowStockThreshold: data.lowStockThreshold }
        : {}),
      ...(data.notes !== undefined ? { notes: data.notes } : {}),
      ...(data.archive === true ? { archivedAt: new Date() } : {}),
      ...(data.archive === false ? { archivedAt: null } : {}),
    },
  });

  return NextResponse.json({ bag });
}
