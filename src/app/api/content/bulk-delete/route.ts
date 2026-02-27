import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { bulkDeleteGenericRecords } from "@/lib/prospects-api";

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

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { ids } = await req.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No IDs provided." }, { status: 400 });
    }
    const count = await bulkDeleteGenericRecords(TABLE_NAME, PRIMARY_KEY, ids);
    return NextResponse.json({ deleted: count });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
