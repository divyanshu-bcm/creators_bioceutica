"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InviteUserModal } from "@/components/dashboard/InviteUserModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  ShieldOff,
  Loader2,
  MoreHorizontal,
  Trash2,
} from "lucide-react";

interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: "admin" | "user";
  status: "active" | "pending";
  created_at: string;
}

interface Invitation {
  email: string;
  full_name: string | null;
  role: "admin" | "user";
  created_at: string;
  expires_at: string;
  status: "pending" | "accepted" | "expired";
}

interface UsersTableProps {
  initialUsers: Profile[];
  initialInvitations: Invitation[];
  currentUserId: string;
}

export function UsersTable({
  initialUsers,
  initialInvitations,
  currentUserId,
}: UsersTableProps) {
  const router = useRouter();
  const [users, setUsers] = useState<Profile[]>(initialUsers);
  const [activeTab, setActiveTab] = useState<"users" | "invitations">("users");
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function toggleRole(userId: string, currentRole: "admin" | "user") {
    setToggling(userId);
    setError("");
    const newRole = currentRole === "admin" ? "user" : "admin";
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setToggling(null);
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to update role.");
    }
  }

  function handleNewUser() {
    // Refresh server component data to show the new pending user
    router.refresh();
  }

  async function deleteUser(userId: string) {
    setDeleting(userId);
    setError("");
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== userId));
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to delete user.");
    }
  }

  const usersCount = users.length;
  const pendingCount = initialInvitations.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Users
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {usersCount} users | {pendingCount} pending
          </p>
        </div>
        <InviteUserModal onSuccess={handleNewUser} />
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md px-4 py-3">
          {error}
        </div>
      )}

      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "users" | "invitations")}
      >
        <TabsList className="mb-4 dark:bg-slate-800/70 dark:text-slate-300">
          <TabsTrigger value="users">Users ({usersCount})</TabsTrigger>
          <TabsTrigger value="invitations">
            Invitations ({pendingCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-0">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 w-full">
                    User
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    Joined
                  </th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={cn(
                      "transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40",
                      user.id === currentUserId &&
                        "bg-slate-50/80 dark:bg-slate-800/20",
                    )}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100 leading-tight">
                          {user.full_name || (
                            <span className="text-slate-400 italic">
                              No name
                            </span>
                          )}
                          {user.id === currentUserId && (
                            <span className="ml-2 text-xs text-slate-400">
                              (you)
                            </span>
                          )}
                        </p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {user.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          user.role === "admin" ? "default" : "secondary"
                        }
                        className={cn(
                          user.role === "admin" &&
                            "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                        )}
                      >
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-sm">
                      {new Date(user.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      {user.id !== currentUserId && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              disabled={
                                toggling === user.id || deleting === user.id
                              }
                            >
                              {toggling === user.id || deleting === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => toggleRole(user.id, user.role)}
                              className={
                                user.role === "admin"
                                  ? "text-slate-700 dark:text-slate-300"
                                  : "text-amber-600 dark:text-amber-400"
                              }
                            >
                              {user.role === "admin" ? (
                                <ShieldOff className="h-4 w-4" />
                              ) : (
                                <Shield className="h-4 w-4" />
                              )}
                              {user.role === "admin"
                                ? "Remove Admin"
                                : "Make Admin"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => deleteUser(user.id)}
                              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/30"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <p>No users yet. Invite someone to get started.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="invitations" className="mt-0">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 w-full">
                    Invitation
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    Invited
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    Expires
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {initialInvitations.map((invite) => (
                  <tr
                    key={invite.email}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100 leading-tight">
                          {invite.full_name || (
                            <span className="text-slate-400 italic">
                              No name
                            </span>
                          )}
                        </p>
                        <p className="text-slate-400 text-xs mt-0.5">
                          {invite.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          invite.role === "admin" ? "default" : "secondary"
                        }
                        className={cn(
                          invite.role === "admin" &&
                            "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                        )}
                      >
                        {invite.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-sm">
                      {new Date(invite.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-sm">
                      {new Date(invite.expires_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {initialInvitations.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <p>No pending invitations.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
