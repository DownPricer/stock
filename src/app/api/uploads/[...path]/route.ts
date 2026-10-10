import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/guard";
import { resolveUploadPath } from "@/lib/uploads";

type Params = { params: Promise<{ path: string[] }> };

const mimeByExt: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireSession();
  if (denied) return denied;

  const { path: parts } = await params;
  const filename = parts.join("/");
  const full = resolveUploadPath(filename);
  if (!full) {
    return NextResponse.json({ error: "Fichier invalide" }, { status: 400 });
  }

  try {
    const data = await readFile(full);
    const ext = filename.split(".").pop()?.toLowerCase() || "jpg";
    return new NextResponse(data, {
      headers: {
        "Content-Type": mimeByExt[ext] || "application/octet-stream",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }
}
