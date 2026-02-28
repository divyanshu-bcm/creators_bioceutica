import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Service-role client — full DB access, bypasses RLS. Use in trusted API routes only. */
export async function createAdminClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* read-only context */
          }
        },
      },
    },
  );
}

/**
 * Session-aware anon client — reads user's auth cookie.
 * Use in Server Components / Route Handlers that need the current user's identity.
 */
export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* read-only context */
          }
        },
      },
    },
  );
}

/**
 * Fast auth guard for API routes — reads session from cookie (no network call).
 * Throws a 401 error if no valid session exists.
 * The proxy already verified the session on every request, so this is safe.
 */
export async function requireAuth(): Promise<{ userId: string }> {
  const client = await createSessionClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return { userId: user.id };
}

/** Anon client without a user session — for public form rendering. */
export async function createAnonClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* read-only context */
          }
        },
      },
    },
  );
}
