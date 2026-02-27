import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Routes that never require authentication
const PUBLIC_PREFIXES = [
  "/login",
  "/f/",
  "/_next",
  "/favicon",
  "/api/auth/",
  "/auth/", // callback + update-password
  "/accept-invitation", // token-based invite acceptance
  "/api/accept-invitation", // accept-invitation API
];

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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (isPublicApiRoute(request)) {
    return NextResponse.next();
  }

  // Build a response we can attach refreshed session cookies to
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write refreshed cookies back onto both request and response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
