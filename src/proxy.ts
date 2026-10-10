import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/token";

const PUBLIC_PATHS = [
  "/login",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/robots.txt",
];

const STATIC_ROOT_FILES = new Set([
  "/favicon.ico",
  "/manifest.webmanifest",
  "/robots.txt",
  "/file.svg",
  "/globe.svg",
  "/next.svg",
  "/vercel.svg",
  "/window.svg",
]);

function isPublic(pathname: string) {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return true;
  }
  if (pathname.startsWith("/api/auth/login")) return true;
  if (pathname.startsWith("/icons/") || pathname.startsWith("/brand/")) {
    return true;
  }
  return false;
}

/** Assets publics connus uniquement (pas n'importe quel .png / .svg). */
function isKnownStaticAsset(pathname: string) {
  if (pathname.startsWith("/_next")) return true;
  if (STATIC_ROOT_FILES.has(pathname)) return true;
  if (
    (pathname.startsWith("/icons/") || pathname.startsWith("/brand/")) &&
    /\.(png|svg|ico|webp|webmanifest)$/i.test(pathname)
  ) {
    return true;
  }
  return false;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isKnownStaticAsset(pathname)) {
    return NextResponse.next();
  }

  if (isPublic(pathname)) {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    if (pathname === "/login" && token && (await verifySessionToken(token))) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const valid = token ? await verifySessionToken(token) : false;

  if (!valid) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
