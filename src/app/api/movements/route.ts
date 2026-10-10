import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guard";
import { applyMovement, StockError } from "@/lib/stock";

const schema = z.object({
  type: z.enum([
    "RECEPTION",
    "MISE_EN_VENTE",
    "RETRAIT_VENTE",
    "VENTE",
    "AJUSTEMENT",
    "PERTE",
  ]),
  bagId: z.string().min(1),
  accountId: z.string().min(1).optional().nullable(),
  quantity: z.number().int(),
  unitPrice: z.number().min(0).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Données invalides" }, { status: 400 });
  }

  try {
    const movement = await applyMovement(parsed.data);
    return NextResponse.json({ movement }, { status: 201 });
  } catch (e) {
    const message = e instanceof StockError ? e.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
