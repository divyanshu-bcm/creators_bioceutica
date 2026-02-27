import { NextRequest, NextResponse } from "next/server";
import { createSessionClient } from "@/lib/supabase/server";
import {
  fetchProspectsPage,
  createProspect,
  PageCursor,
} from "@/lib/prospects-api";

const TABLE_NAME = "prospects_experts";
const SEARCH_FIELDS = ["Name", "Email"];

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
    const result = await fetchProspectsPage(TABLE_NAME, {
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
    const created = await createProspect(TABLE_NAME, record);
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    const e = err as Error & { status?: number };
    return NextResponse.json({ error: e.message }, { status: e.status ?? 500 });
  }
}
