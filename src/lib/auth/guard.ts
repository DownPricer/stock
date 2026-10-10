import { NextResponse } from "next/server";
import { getSession } from "./session";

export async function requireSession() {
  const ok = await getSession();
  if (!ok) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  return null;
}
