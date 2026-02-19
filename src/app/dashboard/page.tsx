import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NewFormButton } from "@/components/dashboard/NewFormButton";
import { DuplicateFormButton } from "@/components/dashboard/DuplicateFormButton";
import type { Form } from "@/lib/types";
import { FileText, Eye } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createAdminClient();
  const { data: forms, error } = await supabase
    .from("forms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
        Failed to load forms: {error.message}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Forms
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            {forms?.length ?? 0} form{forms?.length !== 1 ? "s" : ""}
          </p>
        </div>
        <NewFormButton />
      </div>

      {!forms?.length ? (
        <div className="text-center py-20 text-slate-400">
          <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="text-lg font-medium">No forms yet</p>
          <p className="text-sm mt-1">Create your first form to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map((form: Form) => (
            <Card key={form.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <h2 className="font-semibold text-slate-900 dark:text-slate-100 leading-tight line-clamp-2 flex-1 mr-2">
                    {form.title}
                  </h2>
                  <Badge variant={form.is_published ? "success" : "secondary"}>
                    {form.is_published ? "Published" : "Draft"}
                  </Badge>
                </div>
                {form.description && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                    {form.description}
                  </p>
                )}
                <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                  {new Date(form.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
                <div className="flex gap-2">
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="flex-1"
                  >
                    <Link href={`/dashboard/forms/${form.id}`}>Edit</Link>
                  </Button>
                  <DuplicateFormButton formId={form.id} />
                  <Button asChild size="sm" variant="ghost">
                    <Link href={`/dashboard/forms/${form.id}/responses`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
