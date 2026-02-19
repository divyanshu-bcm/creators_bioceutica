// This route is no longer used — login is handled directly via Supabase Auth.
// Kept as a stub to avoid 404s from any old bookmarks.
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Use Supabase Auth (email + password) to sign in." },
    { status: 410 },
  );
}
