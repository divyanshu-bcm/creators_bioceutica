import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCreatorTableConfig } from "@/lib/creators-config";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ContentDetailPage } from "@/components/dashboard/ContentDetailPage";

interface PageProps {
  params: Promise<{ contentId: string }>;
}

export default async function ContentDetailPageRoute({ params }: PageProps) {
  const { contentId } = await params;

  // Auth guard
  const session = await createSessionClient();
  const {
    data: { session: userSession },
  } = await session.auth.getSession();
  if (!userSession) redirect("/login");

  const config = getCreatorTableConfig("content");
  if (!config) notFound();

  const db = createServiceRoleClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db.from("content") as any)
    .select("*, creators(creator_id, NAME)")
    .eq("content_id", contentId)
    .single();

  if (error || !data) notFound();

  const creatorRel = (data as Record<string, unknown>).creators as Record<
    string,
    unknown
  > | null;
  const record = {
    ...(data as Record<string, unknown>),
    creator_name: creatorRel?.NAME ?? null,
    creator_link_id: creatorRel?.creator_id ?? null,
    creators: undefined,
  };

  return (
    <div>
      <Link
        href="/dashboard/creators/content"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Content
      </Link>

      <ContentDetailPage initialData={record} config={config} slug="content" />
    </div>
  );
}
