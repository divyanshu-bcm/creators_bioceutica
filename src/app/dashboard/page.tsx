import Link from "next/link";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NewFormButton } from "@/components/dashboard/NewFormButton";
import { DuplicateFormButton } from "@/components/dashboard/DuplicateFormButton";
import type { Form } from "@/lib/types";
import { FileText, Eye, User } from "lucide-react";

export default async function DashboardPage() {
  const supabase = createServiceRoleClient();

  const [{ data: forms, error }, { data: profiles }] = await Promise.all([
    supabase
      .from("forms")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("id, email, full_name"),
  ]);

  if (error) {
    return (
      <div className="text-[#A82E22] bg-[#FEF0EE] border border-[#F8D2CE] rounded-xl p-4">
        Failed to load forms: {error.message}
      </div>
    );
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const publishedCount = (forms ?? []).filter((f) => f.is_published).length;
  const draftCount = (forms?.length ?? 0) - publishedCount;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-6 mb-8 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#4A4740] dark:text-[#A1AD97] mb-2">
            Workspace
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-[#002A30] dark:text-[#F0EAE1] tracking-tight leading-[1.05]">
            Your <em className="not-italic italic font-display text-[#F77646]">forms</em>
          </h1>
          <p className="text-[#4A4740] dark:text-[#BEC5BA] mt-2 text-sm">
            {forms?.length ?? 0} total · {publishedCount} published · {draftCount} draft
          </p>
        </div>
        <NewFormButton />
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="glass rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-[#4A4740] dark:text-[#A1AD97] font-semibold">Total Forms</p>
          <p className="font-display text-3xl text-[#002A30] dark:text-[#F0EAE1] mt-2">{forms?.length ?? 0}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-[#4A4740] dark:text-[#A1AD97] font-semibold">Published</p>
          <p className="font-display text-3xl text-[#002A30] dark:text-[#F0EAE1] mt-2">{publishedCount}</p>
        </div>
        <div className="glass rounded-2xl p-5">
          <p className="text-xs uppercase tracking-[0.12em] text-[#4A4740] dark:text-[#A1AD97] font-semibold">Drafts</p>
          <p className="font-display text-3xl text-[#002A30] dark:text-[#F0EAE1] mt-2">{draftCount}</p>
        </div>
      </div>

      {!forms?.length ? (
        <div className="glass rounded-3xl text-center py-20 px-6">
          <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#003D45]/8 text-[#003D45] dark:bg-white/5 dark:text-[#A1AD97]">
            <FileText className="h-6 w-6" />
          </div>
          <h2 className="font-display text-2xl text-[#002A30] dark:text-[#F0EAE1] tracking-tight">
            No forms <em className="not-italic italic text-[#F77646]">yet</em>
          </h2>
          <p className="text-sm text-[#4A4740] dark:text-[#BEC5BA] mt-2 mb-5">
            Create your first form to start collecting submissions.
          </p>
          <NewFormButton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {forms.map((form: Form) => {
            const creator = form.user_id ? profileMap.get(form.user_id) : null;
            return (
              <Card
                key={form.id}
                className="group hover:-translate-y-0.5 hover:shadow-[0_18px_50px_-18px_rgba(0,61,69,0.28)] transition-all duration-300"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h2 className="font-display text-lg text-[#002A30] dark:text-[#F0EAE1] leading-snug line-clamp-2 tracking-tight">
                      {form.title}
                    </h2>
                    <Badge
                      variant={form.is_published ? "success" : "secondary"}
                    >
                      {form.is_published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  {form.description && (
                    <p className="text-sm text-[#4A4740] dark:text-[#BEC5BA] mb-4 line-clamp-2 leading-relaxed">
                      {form.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mb-3">
                    <User className="h-3 w-3 text-[#706C63] dark:text-[#A1AD97] shrink-0" />
                    <span className="text-xs text-[#706C63] dark:text-[#A1AD97] truncate">
                      {creator
                        ? creator.full_name
                          ? `${creator.full_name} · ${creator.email}`
                          : creator.email
                        : "Unknown"}
                    </span>
                  </div>
                  <p className="text-[11px] uppercase tracking-wider text-[#9C978C] dark:text-[#706C63] mb-5">
                    {new Date(form.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                  <div className="flex gap-2 pt-4 border-t border-[#003D45]/8 dark:border-white/8">
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
            );
          })}
        </div>
      )}
    </div>
  );
}
