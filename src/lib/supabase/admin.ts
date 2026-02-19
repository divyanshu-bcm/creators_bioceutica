import { createClient } from "@supabase/supabase-js";

/**
 * Raw supabase-js client with service role — exposes auth.admin.* methods.
 * Only used server-side (API routes). Never import in client components.
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
