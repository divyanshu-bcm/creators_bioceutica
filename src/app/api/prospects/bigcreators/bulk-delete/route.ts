import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { bulkDeleteProspects } from "@/lib/prospects-api";

const TABLE_NAME = "prospects_bigcreators";

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
    const count = await bulkDeleteProspects(TABLE_NAME, ids);
    return NextResponse.json({ deleted: count });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
