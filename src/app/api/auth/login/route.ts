// POST /api/auth/login
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const AUTH_COOKIE = "bc_auth";
const AUTH_VALUE = process.env.AUTH_COOKIE_VALUE ?? "bioceutica-auth-v1";
const DASHBOARD_PASSWORD =
  process.env.DASHBOARD_PASSWORD ?? "creatorsBioceutica";

export async function POST(request: Request) {
  const { password } = await request.json();

  if (password !== DASHBOARD_PASSWORD) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, AUTH_VALUE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // 1 year — "stays logged in"
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ ok: true });
}
