/**
 * Server-only utility — all Supabase queries for prospects live here.
 * Each API route is a thin wrapper that calls these helpers.
 * Never import in client components.
 */
import { createServiceRoleClient } from "@/lib/supabase/admin";

export interface PageCursor {
  created_at: string;
  /**
   * Holds the primary key value of the last row on the page.
   * For non-prospect tables the value is the actual PK (e.g. creator_id)
   * stored here for transport — the API resolves the real column name.
   */
  prospect_id: string;
}

export interface FetchPageOptions {
  limit?: number;
  cursor?: PageCursor | null;
  search?: string;
  searchFields?: string[];
}

export interface PageResult<T = Record<string, unknown>> {
  data: T[];
  nextCursor: PageCursor | null;
  hasNext: boolean;
}

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function fetchProspectsPage(
  tableName: string,
  options: FetchPageOptions = {},
): Promise<PageResult> {
  const { limit = 20, cursor, search, searchFields = [] } = options;
  const db = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db.from(tableName) as any)
    .select("*")
    .order("created_at", { ascending: false })
    .order("prospect_id", { ascending: false });

  // Keyset pagination — fetch rows that come after the cursor
  if (cursor) {
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},prospect_id.lt.${cursor.prospect_id})`,
    );
  }

  // Full-DB search across the two searchable fields
  if (search && search.trim() && searchFields.length > 0) {
    const ilikeParts = searchFields
      .map((f) => `"${f}".ilike.%${search.trim()}%`)
      .join(",");
    query = query.or(ilikeParts);
  }

  // Fetch one extra to determine if there's a next page
  const fetchLimit = limit + 1;
  query = query.limit(fetchLimit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  const hasNext = rows.length > limit;
  const trimmed = hasNext ? rows.slice(0, limit) : rows;

  const lastRow = trimmed[trimmed.length - 1];
  const nextCursor: PageCursor | null =
    hasNext && lastRow
      ? {
          created_at: lastRow.created_at as string,
          prospect_id: lastRow.prospect_id as string,
        }
      : null;

  return { data: trimmed, nextCursor, hasNext };
}

export async function fetchProspectById(
  tableName: string,
  prospectId: string,
): Promise<Record<string, unknown> | null> {
  const db = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from(tableName) as any)
    .select("*")
    .eq("prospect_id", prospectId)
    .single();

  if (error) return null;
  return data as Record<string, unknown>;
}

// ─── Write ────────────────────────────────────────────────────────────────────

export async function createProspect(
  tableName: string,
  record: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const db = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from(tableName) as any)
    .insert(record)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function updateProspect(
  tableName: string,
  prospectId: string,
  record: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const db = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from(tableName) as any)
    .update(record)
    .eq("prospect_id", prospectId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function deleteProspect(
  tableName: string,
  prospectId: string,
): Promise<void> {
  const db = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from(tableName) as any)
    .delete()
    .eq("prospect_id", prospectId);

  if (error) throw new Error(error.message);
}

export async function bulkDeleteProspects(
  tableName: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const db = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (db.from(tableName) as any)
    .delete()
    .in("prospect_id", ids)
    .select("prospect_id", { count: "exact", head: true });

  if (error) throw new Error(error.message);
  return count ?? ids.length;
}

// ─── Generic helpers (non-prospect tables) ────────────────────────────────────

/**
 * Paginated fetch for any table that has `created_at` + a UUID primary key.
 * The cursor.prospect_id field is reused to transport the primary-key value.
 */
export async function fetchGenericPage(
  tableName: string,
  primaryKey: string,
  options: FetchPageOptions = {},
): Promise<PageResult> {
  const { limit = 20, cursor, search, searchFields = [] } = options;
  const db = createServiceRoleClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (db.from(tableName) as any)
    .select("*")
    .order("created_at", { ascending: false })
    .order(primaryKey, { ascending: false });

  if (cursor) {
    // cursor.prospect_id holds the actual primary key value
    query = query.or(
      `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},${primaryKey}.lt.${cursor.prospect_id})`,
    );
  }

  if (search && search.trim() && searchFields.length > 0) {
    const ilikeParts = searchFields
      .map((f) => `"${f}".ilike.%${search.trim()}%`)
      .join(",");
    query = query.or(ilikeParts);
  }

  const fetchLimit = limit + 1;
  query = query.limit(fetchLimit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Record<string, unknown>[];
  const hasNext = rows.length > limit;
  const trimmed = hasNext ? rows.slice(0, limit) : rows;

  const lastRow = trimmed[trimmed.length - 1];
  const nextCursor: PageCursor | null =
    hasNext && lastRow
      ? {
          created_at: lastRow.created_at as string,
          // store the real PK value in prospect_id for cursor transport
          prospect_id: lastRow[primaryKey] as string,
        }
      : null;

  return { data: trimmed, nextCursor, hasNext };
}

export async function fetchGenericById(
  tableName: string,
  primaryKey: string,
  id: string,
): Promise<Record<string, unknown> | null> {
  const db = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from(tableName) as any)
    .select("*")
    .eq(primaryKey, id)
    .single();

  if (error) return null;
  return data as Record<string, unknown>;
}

export async function updateGenericRecord(
  tableName: string,
  primaryKey: string,
  id: string,
  record: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const db = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from(tableName) as any)
    .update(record)
    .eq(primaryKey, id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

export async function deleteGenericRecord(
  tableName: string,
  primaryKey: string,
  id: string,
): Promise<void> {
  const db = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (db.from(tableName) as any)
    .delete()
    .eq(primaryKey, id);

  if (error) throw new Error(error.message);
}

export async function bulkDeleteGenericRecords(
  tableName: string,
  primaryKey: string,
  ids: string[],
): Promise<number> {
  if (ids.length === 0) return 0;
  const db = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error, count } = await (db.from(tableName) as any)
    .delete()
    .in(primaryKey, ids)
    .select(primaryKey, { count: "exact", head: true });

  if (error) throw new Error(error.message);
  return count ?? ids.length;
}
