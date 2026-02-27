import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import {
  updateGenericRecord,
  deleteGenericRecord,
} from "@/lib/prospects-api";

const TABLE_NAME = "content";
const PRIMARY_KEY = "content_id";

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
  { params }: { params: Promise<{ contentId: string }> },
) {
  try {
    await requireAuth();
    const { contentId } = await params;
    const db = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db.from(TABLE_NAME) as any)
      .select("*, creators(creator_id, NAME)")
      .eq(PRIMARY_KEY, contentId)
      .single();
    if (error) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const creatorRel = (data as Record<string, unknown>).creators as Record<string, unknown> | null;
    const flat = {
      ...(data as Record<string, unknown>),
      creator_name: creatorRel?.NAME ?? null,
      creator_link_id: creatorRel?.creator_id ?? null,
      creators: undefined,
    };
    return NextResponse.json(flat);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> },
) {
  try {
    await requireAuth();
    const { contentId } = await params;
    const { record } = await req.json();
    // Remove virtual fields before writing
    const { creator_name: _cn, creator_link_id: _cl, creators: _cr, ...cleanRecord } = record as Record<string, unknown>;
    void _cn; void _cl; void _cr;
    const updated = await updateGenericRecord(TABLE_NAME, PRIMARY_KEY, contentId, cleanRecord);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ contentId: string }> },
) {
  try {
    await requireAuth();
    const { contentId } = await params;
    await deleteGenericRecord(TABLE_NAME, PRIMARY_KEY, contentId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}