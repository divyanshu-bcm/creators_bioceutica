"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROSPECT_TABLES } from "@/lib/prospects-config";
import { cn } from "@/lib/utils";

export function ProspectTabNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-none">
        <div className="flex items-center gap-1 px-0.5">
          {PROSPECT_TABLES.map((table) => {
            const href = `/dashboard/prospects/${table.slug}`;
            // Active if we're on this table's list OR on a detail page under this table
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={table.slug}
                href={href}
                className={cn(
                  "relative px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "text-slate-900 dark:text-slate-100"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300",
                )}
              >
                {table.displayLabel}
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
