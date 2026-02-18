import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "bc_auth";
const AUTH_VALUE = process.env.AUTH_COOKIE_VALUE ?? "bioceutica-auth-v1";

// Routes that are ALWAYS public — no cookie check
const PUBLIC_PREFIXES = ["/login", "/f/", "/_next", "/favicon", "/api/auth/"];

// POST /api/submissions is public (form submit from public form)
function isPublicApiRoute(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const m = request.method;
  return (
    (pathname.startsWith("/api/submissions") && m === "POST") ||
    (pathname.startsWith("/api/forms/") &&
      pathname.endsWith("/public") &&
      m === "GET")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public prefixes
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow certain API routes to be public
  if (isPublicApiRoute(request)) {
    return NextResponse.next();
  }

  // Check auth cookie
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (token !== AUTH_VALUE) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
