"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  FileText,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  userRole: "admin" | "user";
  userName: string;
  userEmail: string;
}

export function Sidebar({ userRole, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  // avoid hydration mismatch — read localStorage after mount
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) setCollapsed(stored === "true");
  }, []);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const navItems = [
    { label: "Forms", href: "/dashboard", icon: FileText },
    ...(userRole === "admin"
      ? [{ label: "Users", href: "/dashboard/users", icon: Users }]
      : []),
  ];

  // Before mount, render expanded to avoid layout shift
  const isCollapsed = mounted ? collapsed : false;

  return (
    <aside
      className={cn(
        "h-screen sticky top-0 flex flex-col shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-200 overflow-hidden",
        isCollapsed ? "w-14" : "w-56",
      )}
    >
      {/* Header */}
      <div className="h-14 flex items-center px-3 border-b border-slate-200 dark:border-slate-800 gap-2">
        {!isCollapsed && (
          <span className="font-bold text-slate-900 dark:text-slate-100 text-base truncate flex-1 pl-1">
            Bioceutica Creators
          </span>
        )}
        <button
          onClick={toggle}
          className={cn(
            "p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors shrink-0",
            isCollapsed && "mx-auto",
          )}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map(({ label, href, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              title={isCollapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                active
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer: user info + sign out */}
      <div className="border-t border-slate-200 dark:border-slate-800 p-2 space-y-1">
        {!isCollapsed && (
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate leading-tight">
              {userName || userEmail}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {userName ? userEmail : ""}
            </p>
            <span
              className={cn(
                "inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium",
                userRole === "admin"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
              )}
            >
              {userRole}
            </span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          disabled={signingOut}
          title={isCollapsed ? "Sign out" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors",
            isCollapsed && "justify-center",
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!isCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
