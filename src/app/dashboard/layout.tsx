import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="font-semibold text-slate-900 dark:text-slate-100 text-lg"
          >
            Bioceutica Forms
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
            >
              <a href="/api/auth/logout">Sign Out</a>
            </Button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
