// GET  /api/admin/users  — list all users with their profiles
// (admin only)
import { NextResponse } from "next/server";
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

  return admin;
}

export async function GET() {
  try {
    await requireAdmin();

    const service = createServiceRoleClient();

    // Fetch all profiles
    const { data: profiles, error } = await service
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: true });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch pending invitations to annotate status
    const { data: pendingInvites } = await service
      .from("invitations")
      .select("email")
      .eq("status", "pending");

    const pendingEmails = new Set(
      (pendingInvites ?? []).map((i: { email: string }) => i.email),
    );

    const users = (profiles ?? []).map((p) => ({
      ...p,
      status: pendingEmails.has(p.email) ? "pending" : "active",
    }));

    return NextResponse.json(users);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
