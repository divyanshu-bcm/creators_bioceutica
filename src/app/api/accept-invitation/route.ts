// GET  /api/accept-invitation?token=xxx  — validate token, return invitation details
// POST /api/accept-invitation             — create user account and accept invitation
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const { data: invitation, error } = await service
    .from("invitations")
    .select("id, email, full_name, role, expires_at, accepted_at")
    .eq("token", token)
    .single();

  if (error || !invitation) {
    return NextResponse.json(
      { error: "Invalid invitation link." },
      { status: 404 },
    );
  }

  if (invitation.accepted_at) {
    return NextResponse.json(
      { error: "This invitation has already been accepted. Please sign in." },
      { status: 410 },
    );
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return NextResponse.json(
      {
        error:
          "This invitation link has expired. Ask your admin for a new one.",
      },
      { status: 410 },
    );
  }

  return NextResponse.json({
    email: invitation.email,
    full_name: invitation.full_name,
    role: invitation.role,
  });
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const service = createServiceRoleClient();

    // Validate token again on submit
    const { data: invitation, error: lookupError } = await service
      .from("invitations")
      .select("*")
      .eq("token", token)
      .is("accepted_at", null)
      .single();

    if (lookupError || !invitation) {
      return NextResponse.json(
        { error: "Invalid invitation link." },
        { status: 404 },
      );
    }

    if (new Date(invitation.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "This invitation link has expired." },
        { status: 410 },
      );
    }

    // Create the user — email_confirm:true skips the confirmation email
    const { data: userData, error: createError } =
      await service.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: invitation.full_name,
          role: invitation.role,
        },
      });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Explicitly upsert profile (belt-and-suspenders alongside the DB trigger)
    await service.from("profiles").upsert(
      {
        id: userData.user.id,
        email: invitation.email,
        full_name: invitation.full_name,
        role: invitation.role,
      },
      { onConflict: "id" },
    );

    // Mark invitation as accepted
    await service
      .from("invitations")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("token", token);

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
