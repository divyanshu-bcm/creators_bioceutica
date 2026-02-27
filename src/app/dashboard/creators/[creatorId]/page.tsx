import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCreatorTableConfig } from "@/lib/creators-config";
import { fetchGenericById } from "@/lib/prospects-api";
import { ProspectDetailPage } from "@/components/dashboard/ProspectDetailPage";

interface PageProps {
  params: Promise<{ creatorId: string }>;
}

export default async function CreatorDetailPageRoute({ params }: PageProps) {
  const { creatorId } = await params;
  const config = getCreatorTableConfig("creators");
  if (!config) notFound();

  const record = await fetchGenericById("creators", "creator_id", creatorId);
  if (!record) notFound();

  return (
    <div>
      <Link
        href="/dashboard/creators"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Creators
      </Link>

      <ProspectDetailPage
        initialData={record}
        config={config}
        slug="creators"
      />
    </div>
  );
}
