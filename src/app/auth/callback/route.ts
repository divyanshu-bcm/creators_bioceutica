import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "invite"
    | "email"
    | "recovery"
    | "magiclink"
    | null;
  const next = searchParams.get("next") ?? "/auth/update-password";

  // ── Implicit flow: tokens come as URL hash fragments (#access_token=...)
  // Hash is browser-only — server cannot read it. Serve a tiny HTML page
  // that bounces the browser to the destination with the hash intact so
  // the Supabase client-side library can exchange it automatically.
  if (!code && !token_hash) {
    const destination = encodeURIComponent(next);
    return new NextResponse(
      `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Signing you in…</title>
  </head>
  <body>
    <script>
      // Preserve the hash fragment (contains access_token for implicit flow)
      var dest = decodeURIComponent(${JSON.stringify(destination)});
      window.location.replace(dest + window.location.hash);
    </script>
  </body>
</html>`,
      { headers: { "content-type": "text/html; charset=utf-8" } },
    );
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) =>
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          ),
      },
    },
  );

  let authSuccess = false;

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) authSuccess = true;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) authSuccess = true;
  }

  if (authSuccess) {
    // Mark invitation as accepted
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        const service = createServiceRoleClient();
        await service
          .from("invitations")
          .update({ status: "accepted" })
          .eq("email", user.email)
          .eq("status", "pending");
      }
    } catch {
      // Non-fatal
    }

    return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", request.url),
  );
}
