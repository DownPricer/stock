import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { StockError, undoMovement } from "@/lib/stock";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const denied = await requireSession();
  if (denied) return denied;

  const { id } = await params;
  try {
    const movement = await undoMovement(id);
    return NextResponse.json({ movement });
  } catch (e) {
    const message = e instanceof StockError ? e.message : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
