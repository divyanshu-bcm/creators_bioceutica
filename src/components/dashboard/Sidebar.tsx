"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  FileText,
  BookOpen,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  UserSearch,
  Video,
  Clapperboard,
  MessageSquare,
  Package,
  ChartPie,
  FileSignature,
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    { label: "Responses", href: "/dashboard/responses", icon: MessageSquare },
    { label: "Products", href: "/dashboard/products", icon: Package },
    { label: "Prospects", href: "/dashboard/prospects", icon: UserSearch },
    { label: "Creators", href: "/dashboard/creators", icon: Video },
    { label: "Content", href: "/dashboard/content", icon: Clapperboard },
    { label: "Contracts", href: "/dashboard/contracts", icon: FileSignature },
    ...(userRole === "admin"
      ? [{ label: "Users", href: "/dashboard/users", icon: Users }]
      : []),
    { label: "Analytics", href: "/dashboard/analytics", icon: ChartPie },
  ];

  const forceExpanded = pathname?.startsWith("/dashboard/docs") ?? false;
  const isCollapsed = mounted ? (forceExpanded ? false : collapsed) : false;

  return (
    <aside
      className={cn(
        "h-full flex flex-col shrink-0 transition-all duration-300 overflow-visible relative",
        "m-3 mr-0 rounded-2xl glass-strong",
        isCollapsed ? "w-[68px]" : "w-60",
      )}
    >
      <button
        onClick={toggle}
        className={cn(
          "absolute -right-3 top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full",
          "bg-[#003D45] text-white shadow-md hover:bg-[#002A30] transition-all",
          "dark:bg-[#A1AD97] dark:text-[#002A30] dark:hover:bg-[#BEC5BA]",
        )}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>

      {/* Brand */}
      <div className="h-16 flex items-center px-4 overflow-hidden">
        <Link
          href="/dashboard"
          className="shrink-0 flex items-center gap-2.5 min-w-0"
        >
          <div className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-[#003D45] text-white shadow-[0_8px_20px_-8px_rgba(0,61,69,0.55)]">
            <Image
              src="/Small_logo.svg"
              alt="Bioceutica"
              width={20}
              height={20}
              className="object-contain invert brightness-0"
              style={{ filter: "invert(1) brightness(2)" }}
              priority
            />
          </div>
          {!isCollapsed && (
            <div className="min-w-0">
              <p className="font-display text-[15px] leading-none text-[#002A30] dark:text-[#F0EAE1] tracking-tight truncate">
                Bioceutica
              </p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#4A4740] dark:text-[#A1AD97] mt-1 truncate">
                Creators
              </p>
            </div>
          )}
        </Link>
      </div>

      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-[#003D45]/15 to-transparent dark:via-white/10" />

      {/* Nav */}
      <nav className="flex-1 py-4 px-2.5 space-y-1 overflow-y-auto overflow-x-hidden bc-scroll">
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
                "group flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap relative",
                active
                  ? "bg-[#003D45] text-white shadow-[0_6px_18px_-6px_rgba(0,61,69,0.5)] dark:bg-[#A1AD97] dark:text-[#002A30]"
                  : "text-[#4A4740] dark:text-[#BEC5BA] hover:bg-white/55 dark:hover:bg-white/5 hover:text-[#002A30] dark:hover:text-[#F0EAE1]",
                isCollapsed && "justify-center px-0",
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!isCollapsed && <span className="truncate">{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 h-px bg-gradient-to-r from-transparent via-[#003D45]/15 to-transparent dark:via-white/10" />

      {/* Footer */}
      <div className="p-2.5 space-y-1">
        <Link
          href="/dashboard/docs"
          title={isCollapsed ? "Docs" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap",
            pathname === "/dashboard/docs"
              ? "bg-[#003D45] text-white dark:bg-[#A1AD97] dark:text-[#002A30]"
              : "text-[#4A4740] dark:text-[#BEC5BA] hover:bg-white/55 dark:hover:bg-white/5 hover:text-[#002A30] dark:hover:text-[#F0EAE1]",
            isCollapsed && "justify-center px-0",
          )}
        >
          <BookOpen className="h-[18px] w-[18px] shrink-0" />
          {!isCollapsed && <span className="truncate">Docs</span>}
        </Link>

        {!isCollapsed && (
          <div className="px-2.5 py-2 mt-1 rounded-xl bg-white/35 dark:bg-white/5 border border-white/40 dark:border-white/10">
            <p className="text-[13px] font-semibold text-[#002A30] dark:text-[#F0EAE1] truncate leading-tight">
              {userName || userEmail}
            </p>
            {userName && (
              <p className="text-[11px] text-[#706C63] dark:text-[#A1AD97]/80 truncate mt-0.5">
                {userEmail}
              </p>
            )}
            <span
              className={cn(
                "inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider",
                userRole === "admin"
                  ? "bg-[#F77646]/15 text-[#E25E2E] border border-[#F77646]/25"
                  : "bg-[#A1AD97]/20 text-[#4A4740] dark:text-[#BEC5BA] border border-[#A1AD97]/30",
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
            "w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl text-sm font-medium transition-colors",
            "text-[#706C63] dark:text-[#A1AD97] hover:bg-[#FEF0EE] hover:text-[#A82E22] dark:hover:bg-[#A82E22]/15 dark:hover:text-[#F8D2CE]",
            isCollapsed && "justify-center px-0",
          )}
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          {!isCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
