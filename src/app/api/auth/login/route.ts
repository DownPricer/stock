import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import {
  checkLoginRateLimit,
  resetLoginRateLimit,
} from "@/lib/auth/rate-limit";
import {
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/token";

const bodySchema = z.object({
  password: z.string().min(1),
});

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limit = checkLoginRateLimit(ip);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `Trop de tentatives. Réessaie dans ${limit.retryAfterSec}s.`,
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 });
  }

  const ok = await verifyPassword(parsed.data.password);
  if (!ok) {
    return NextResponse.json(
      { error: "Mot de passe incorrect" },
      { status: 401 },
    );
  }

  resetLoginRateLimit(ip);
  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  const cookie = sessionCookieOptions(token);
  response.cookies.set(cookie);
  return response;
}
