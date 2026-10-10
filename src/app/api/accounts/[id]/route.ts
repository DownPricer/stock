import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  platform: z.string().max(80).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  commissionPercent: z.number().min(0).max(100).nullable().optional(),
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
  const account = await prisma.account.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.platform !== undefined ? { platform: data.platform } : {}),
      ...(data.color !== undefined ? { color: data.color } : {}),
      ...(data.commissionPercent !== undefined
        ? { commissionPercent: data.commissionPercent }
        : {}),
      ...(data.archive === true ? { archivedAt: new Date() } : {}),
      ...(data.archive === false ? { archivedAt: null } : {}),
    },
  });

  return NextResponse.json({ account });
}
