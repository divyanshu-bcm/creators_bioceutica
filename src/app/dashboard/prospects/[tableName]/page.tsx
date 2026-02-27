import { notFound } from "next/navigation";
import { getTableConfig } from "@/lib/prospects-config";
import { ProspectListView } from "@/components/dashboard/ProspectListView";

interface PageProps {
  params: Promise<{ tableName: string }>;
}

export default async function ProspectTablePage({ params }: PageProps) {
  const { tableName } = await params;
  const config = getTableConfig(tableName);

  if (!config) notFound();

  return <ProspectListView slug={tableName} config={config} />;
}

export async function generateStaticParams() {
  return [
    { tableName: "standardcreators" },
    { tableName: "bigcreators" },
    { tableName: "celebrities" },
    { tableName: "experts" },
    { tableName: "old" },
    { tableName: "youtube" },
  ];
}
