import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import { PageCursor } from "@/lib/prospects-api";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const TABLE_NAME = "content";
const PRIMARY_KEY = "content_id";
const SEARCH_FIELDS = ["NAME", "Codice video"];

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
    const db = createServiceRoleClient();
    const { searchParams } = req.nextUrl;
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") ?? "20"), 1),
      1000,
    );
    const cursorParam = searchParams.get("cursor");
    const cursor: PageCursor | null = cursorParam
      ? (JSON.parse(cursorParam) as PageCursor)
      : null;
    const search = searchParams.get("search")?.trim() ?? "";

    // Fetch content with creator name joined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (db.from(TABLE_NAME) as any)
      .select(`*, creators(NAME)`)
      .order("created_at", { ascending: false })
      .order(PRIMARY_KEY, { ascending: false });

    if (cursor) {
      query = query.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},${PRIMARY_KEY}.lt.${cursor.prospect_id})`,
      );
    }

    if (search && SEARCH_FIELDS.length > 0) {
      const ilikeParts = SEARCH_FIELDS.map(
        (f) => `"${f}".ilike.%${search}%`,
      ).join(",");
      query = query.or(ilikeParts);
    }

    const fetchLimit = limit + 1;
    query = query.limit(fetchLimit);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    // Flatten creator name into each row
    const rows = ((data ?? []) as Record<string, unknown>[]).map(
      (row): Record<string, unknown> => ({
        ...row,
        creator_name:
          (row.creators as Record<string, unknown> | null)?.NAME ?? null,
      }),
    );

    const hasNext = rows.length > limit;
    const trimmed = hasNext ? rows.slice(0, limit) : rows;

    const lastRow = trimmed[trimmed.length - 1];
    const nextCursor: PageCursor | null =
      hasNext && lastRow
        ? {
            created_at: lastRow.created_at as string,
            prospect_id: lastRow[PRIMARY_KEY] as string,
          }
        : null;

    return NextResponse.json({ data: trimmed, nextCursor, hasNext });
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
