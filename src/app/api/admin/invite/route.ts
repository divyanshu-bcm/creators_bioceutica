// POST /api/admin/invite — generate a token-based invite link (no email sent)
import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });

  const admin = createServiceRoleClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin")
    throw Object.assign(new Error("Forbidden"), { status: 403 });

  return user;
}

export async function POST(request: NextRequest) {
  try {
    const invitedBy = await requireAdmin();

    const { email, full_name = "", role = "user" } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!["admin", "user"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ??
      request.headers.get("origin") ??
      "http://localhost:3000";

    const service = createServiceRoleClient();

    // Check if a user with this email already exists in auth
    const { data: existingUsers } = await service.auth.admin.listUsers();
    const alreadyExists = existingUsers?.users?.some((u) => u.email === email);
    if (alreadyExists) {
      return NextResponse.json(
        { error: "A user with this email already exists." },
        { status: 409 },
      );
    }

    // Generate a unique token and 7-day expiry
    const token = crypto.randomUUID();
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // Upsert into invitations (reset token if re-inviting same email)
    const { error: dbError } = await service.from("invitations").upsert(
      {
        email,
        full_name,
        role,
        token,
        expires_at: expiresAt,
        accepted_at: null,
        status: "pending",
        invited_by: invitedBy.id,
      },
      { onConflict: "email" },
    );

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    const inviteUrl = `${siteUrl}/accept-invitation?token=${token}`;
    return NextResponse.json({ ok: true, inviteUrl });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
