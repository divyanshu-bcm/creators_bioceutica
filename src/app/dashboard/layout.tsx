import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ThemeToggle } from "@/components/ThemeToggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) redirect("/login");

  const admin = createServiceRoleClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, role, email")
    .eq("id", user.id)
    .single();

  const userRole = (profile?.role ?? "user") as "admin" | "user";
  const userName = profile?.full_name ?? "";
  const userEmail = profile?.email ?? user.email ?? "";

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <Sidebar userRole={userRole} userName={userName} userEmail={userEmail} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 h-14 flex items-center justify-end px-6 shrink-0">
          <ThemeToggle />
        </header>
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
