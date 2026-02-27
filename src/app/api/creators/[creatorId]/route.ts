import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import {
  fetchGenericById,
  updateGenericRecord,
  deleteGenericRecord,
} from "@/lib/prospects-api";

const TABLE_NAME = "creators";
const PRIMARY_KEY = "creator_id";

async function requireAuth() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return user;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> },
) {
  try {
    await requireAuth();
    const { creatorId } = await params;
    const record = await fetchGenericById(TABLE_NAME, PRIMARY_KEY, creatorId);
    if (!record)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(record);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> },
) {
  try {
    await requireAuth();
    const { creatorId } = await params;
    const { record } = await req.json();
    const updated = await updateGenericRecord(
      TABLE_NAME,
      PRIMARY_KEY,
      creatorId,
      record,
    );
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ creatorId: string }> },
) {
  try {
    await requireAuth();
    const { creatorId } = await params;
    await deleteGenericRecord(TABLE_NAME, PRIMARY_KEY, creatorId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
