// PUT /api/admin/users/[userId]  — update a user's role (admin <-> user)
// DELETE /api/admin/users/[userId]  — delete a user (nulls their forms first)
import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });

  const service = createServiceRoleClient();
  const { data: profile } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin")
    throw Object.assign(new Error("Forbidden"), { status: 403 });

  return { service, callerId: user.id };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const { service } = await requireAdmin();
    const { role } = await request.json();

    if (!["admin", "user"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    const { error } = await service
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;
    const { service, callerId } = await requireAdmin();

    if (userId === callerId) {
      return NextResponse.json(
        { error: "You cannot delete your own account." },
        { status: 400 },
      );
    }

    // 1. Null out forms created by this user so they are not lost
    await service.from("forms").update({ user_id: null }).eq("user_id", userId);

    // 2. Remove the invitation row so the email can be re-invited later
    const { data: profile } = await service
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();
    if (profile?.email) {
      await service.from("invitations").delete().eq("email", profile.email);
    }

    // 3. Delete from auth.users — cascades to profiles automatically
    const { error } = await service.auth.admin.deleteUser(userId);
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
