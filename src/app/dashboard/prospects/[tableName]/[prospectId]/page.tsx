import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTableConfig } from "@/lib/prospects-config";
import { fetchProspectById } from "@/lib/prospects-api";
import { ProspectDetailPage } from "@/components/dashboard/ProspectDetailPage";

interface PageProps {
  params: Promise<{ tableName: string; prospectId: string }>;
}

export default async function ProspectDetailPageRoute({ params }: PageProps) {
  const { tableName, prospectId } = await params;
  const config = getTableConfig(tableName);

  if (!config) notFound();

  const record = await fetchProspectById(config.tableName, prospectId);
  if (!record) notFound();

  return (
    <div>
      <Link
        href={`/dashboard/prospects/${tableName}`}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to {config.displayLabel}
      </Link>

      <ProspectDetailPage
        initialData={record}
        config={config}
        slug={tableName}
      />
    </div>
  );
}
