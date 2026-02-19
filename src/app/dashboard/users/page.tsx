import { redirect } from "next/navigation";
import { createSessionClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { UsersTable } from "@/components/dashboard/UsersTable";

interface InvitationRow {
  email: string;
  full_name: string | null;
  role: "admin" | "user";
  created_at: string;
  expires_at: string;
  status: "pending" | "accepted" | "expired";
}

export default async function UsersPage() {
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) redirect("/login");

  const service = createServiceRoleClient();

  // Verify admin role
  const { data: self } = await service
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!self || self.role !== "admin") redirect("/dashboard");

  // Fetch all profiles
  const { data: profiles, error } = await service
    .from("profiles")
    .select("id, email, full_name, role, created_at")
    .order("created_at", { ascending: true });

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
        Failed to load users: {error.message}
      </div>
    );
  }

  // Fetch pending invitations
  const { data: pendingInvites } = await service
    .from("invitations")
    .select("email, full_name, role, created_at, expires_at, status")
    .eq("status", "pending");

  const users = (profiles ?? []).map((p) => ({
    ...p,
    status: "active" as const,
  }));

  return (
    <UsersTable
      initialUsers={users}
      initialInvitations={(pendingInvites ?? []) as InvitationRow[]}
      currentUserId={user.id}
    />
  );
}
