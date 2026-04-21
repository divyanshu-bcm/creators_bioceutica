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
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    <div className="bc-aurora flex h-screen overflow-hidden">
      <Sidebar userRole={userRole} userName={userName} userEmail={userEmail} />
      <div className="flex-1 flex flex-col min-w-0 h-full relative">
        <div className="absolute top-3 right-4 z-20">
          <ThemeToggle />
        </div>
        <main className="flex-1 px-8 pt-8 pb-8 overflow-auto bc-scroll">{children}</main>
      </div>
    </div>
  );
}
