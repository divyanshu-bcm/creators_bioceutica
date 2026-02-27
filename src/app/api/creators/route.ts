import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { fetchGenericPage, PageCursor } from "@/lib/prospects-api";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const TABLE_NAME = "creators";
const PRIMARY_KEY = "creator_id";
const SEARCH_FIELDS = ["NAME", "CODICE SCONTO"];

async function requireAuth() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return user;
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = req.nextUrl;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "20"), 1),
      1000,
    );
    const cursorParam = searchParams.get("cursor");
    const cursor: PageCursor | null = cursorParam
      ? (JSON.parse(cursorParam) as PageCursor)
      : null;
    const search = searchParams.get("search") ?? undefined;
    const result = await fetchGenericPage(TABLE_NAME, PRIMARY_KEY, {
      limit,
      cursor,
      search,
      searchFields: SEARCH_FIELDS,
    });
    return NextResponse.json(result);
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth();
    const { record } = await req.json();
    const db = createServiceRoleClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (db.from(TABLE_NAME) as any)
      .insert(record)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json(data, { status: 201 });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
