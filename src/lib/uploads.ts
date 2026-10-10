import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export function getUploadDir() {
  const dir = process.env.UPLOAD_DIR;
  if (!dir) {
    throw new Error("UPLOAD_DIR manquant.");
  }
  return path.isAbsolute(dir)
    ? dir
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), dir);
}

export async function saveBagPhoto(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length === 0) {
    throw new Error("Fichier vide.");
  }
  if (bytes.length > 5 * 1024 * 1024) {
    throw new Error("Photo trop lourde (max 5 Mo).");
  }

  const mime = file.type || "image/jpeg";
  const ext =
    mime === "image/png"
      ? "png"
      : mime === "image/webp"
        ? "webp"
        : "jpg";

  const uploadDir = getUploadDir();
  await mkdir(uploadDir, { recursive: true });

  const filename = `${randomUUID()}.${ext}`;
  await writeFile(
    path.join(/* turbopackIgnore: true */ uploadDir, filename),
    bytes,
  );
  return filename;
}

export function resolveUploadPath(filename: string): string | null {
  if (
    !filename ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  ) {
    return null;
  }
  return path.join(/* turbopackIgnore: true */ getUploadDir(), filename);
}
