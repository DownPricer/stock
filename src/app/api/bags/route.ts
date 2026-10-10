import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/lib/auth/guard";
import { prisma } from "@/lib/db";
import { applyMovement, StockError } from "@/lib/stock";
import { saveBagPhoto } from "@/lib/uploads";

export async function GET(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() || "";
  const filter = searchParams.get("filter") || "all";

  const bags = await prisma.bag.findMany({
    where: { archivedAt: null },
    include: {
      listings: {
        include: { account: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  let filtered = bags;
  if (q) {
    filtered = filtered.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.colorVariant?.toLowerCase().includes(q) ?? false),
    );
  }

  if (filter === "low") {
    filtered = filtered.filter(
      (b) => b.quantityOnHand > 0 && b.quantityOnHand <= b.lowStockThreshold,
    );
  } else if (filter === "out") {
    filtered = filtered.filter((b) => b.quantityOnHand <= 0);
  }

  return NextResponse.json({ bags: filtered });
}

const createSchema = z.object({
  name: z.string().min(1).max(120),
  quantity: z.coerce.number().int().min(0),
  purchasePrice: z.coerce.number().min(0),
  targetPrice: z.coerce.number().min(0),
  colorVariant: z.string().max(80).optional(),
  notes: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const denied = await requireSession();
  if (denied) return denied;

  try {
    const form = await request.formData();
    const parsed = createSchema.safeParse({
      name: form.get("name"),
      quantity: form.get("quantity"),
      purchasePrice: form.get("purchasePrice"),
      targetPrice: form.get("targetPrice"),
      colorVariant: form.get("colorVariant") || undefined,
      notes: form.get("notes") || undefined,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    let photoPath: string | undefined;
    const photo = form.get("photo");
    if (photo instanceof File && photo.size > 0) {
      photoPath = await saveBagPhoto(photo);
    }

    const bag = await prisma.bag.create({
      data: {
        name: parsed.data.name.trim(),
        purchasePrice: parsed.data.purchasePrice,
        targetPrice: parsed.data.targetPrice,
        quantityOnHand: 0,
        colorVariant: parsed.data.colorVariant?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        photoPath: photoPath ?? null,
      },
    });

    if (parsed.data.quantity > 0) {
      await applyMovement({
        type: "RECEPTION",
        bagId: bag.id,
        quantity: parsed.data.quantity,
        note: "Stock initial",
      });
    }

    const fresh = await prisma.bag.findUnique({
      where: { id: bag.id },
      include: { listings: { include: { account: true } } },
    });

    return NextResponse.json({ bag: fresh }, { status: 201 });
  } catch (e) {
    const message =
      e instanceof StockError
        ? e.message
        : e instanceof Error
          ? e.message
          : "Erreur serveur";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
