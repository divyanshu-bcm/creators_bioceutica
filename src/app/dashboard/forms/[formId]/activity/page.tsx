import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { FormActivityEntry } from "@/lib/types";

type Props = { params: Promise<{ formId: string }> };

function formatAction(action: string): string {
  return action
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDetails(
  details: Record<string, unknown> | null | undefined,
): string {
  if (!details) return "";
  const detailKeys = Object.keys(details);
  if (detailKeys.length === 0) return "";
  return JSON.stringify(details, null, 2);
}

export default async function FormActivityPage({ params }: Props) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();

  // Only admins may view activity
  const session = await createSessionClient();
  const {
    data: { user },
  } = await session.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin")
    redirect(`/dashboard/forms/${formId}`);

  const { data: form } = await supabase
    .from("forms")
    .select("id, title, activity")
    .eq("id", formId)
    .single();

  if (!form) notFound();

  const history = Array.isArray(form.activity)
    ? ([...form.activity] as FormActivityEntry[]).sort((a, b) =>
        b.at.localeCompare(a.at),
      )
    : [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button asChild variant="ghost" size="icon">
          <Link href={`/dashboard/forms/${formId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Form Activity
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {form.title}
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
          <p className="text-lg font-medium">No activity yet</p>
          <p className="text-sm mt-1">
            Actions on this form will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const detailText = formatDetails(entry.details ?? null);

            return (
              <Card key={entry.id}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatAction(entry.action)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(entry.at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {entry.actor.full_name ||
                      entry.actor.email ||
                      "Unknown user"}
                    {entry.actor.email && entry.actor.full_name
                      ? ` (${entry.actor.email})`
                      : ""}
                  </p>

                  {detailText && (
                    <pre className="mt-3 text-[11px] leading-4 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md p-3 overflow-x-auto">
                      {detailText}
                    </pre>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
