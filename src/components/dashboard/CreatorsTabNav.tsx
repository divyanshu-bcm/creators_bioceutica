"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const CREATOR_TABS = [
  { label: "Creators", href: "/dashboard/creators" },
  { label: "Content", href: "/dashboard/creators/content" },
];

export function CreatorsTabNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-none">
        <div className="flex items-center gap-1 px-0.5">
          {CREATOR_TABS.map((tab) => {
            // "Creators" tab is active only when NOT on /content
            // "Content" tab is active on /content and below
            const isActive =
              tab.href === "/dashboard/creators"
                ? pathname === "/dashboard/creators" ||
                  (pathname.startsWith("/dashboard/creators/") &&
                    !pathname.startsWith("/dashboard/creators/content"))
                : pathname === tab.href || pathname.startsWith(`${tab.href}/`);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
                )}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 dark:bg-slate-100 rounded-t-full" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
