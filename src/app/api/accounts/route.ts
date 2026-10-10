import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";

export async function GET() {
  const denied = await requireSession();
  if (denied) return denied;

  const accounts = await prisma.account.findMany({
    where: { archivedAt: null },
    include: {
      listings: {
        where: { quantity: { gt: 0 } },
        include: { bag: true },
      },
      _count: {
        select: {
          movements: { where: { type: "VENTE", undoneAt: null } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ accounts });
}

const createSchema = z.object({
  name: z.string().min(1).max(80),
  platform: z.string().max(80).optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  commissionPercent: z.number().min(0).max(100).nullable().optional(),
});

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  const account = await prisma.account.create({
    data: {
      name: parsed.data.name.trim(),
      platform: parsed.data.platform?.trim() || null,
      color: parsed.data.color || "#64748b",
      commissionPercent: parsed.data.commissionPercent ?? null,
    },
  });

  return NextResponse.json({ account }, { status: 201 });
}
