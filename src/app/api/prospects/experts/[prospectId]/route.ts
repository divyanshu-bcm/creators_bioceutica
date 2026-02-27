import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { updateProspect, deleteProspect } from "@/lib/prospects-api";

const TABLE_NAME = "prospects_experts";

async function requireAuth() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return user;
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> },
) {
  try {
    await requireAuth();
    const { prospectId } = await params;
    const { record } = await req.json();
    const updated = await updateProspect(TABLE_NAME, prospectId, record);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ prospectId: string }> },
) {
  try {
    await requireAuth();
    const { prospectId } = await params;
    await deleteProspect(TABLE_NAME, prospectId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
