import { getCreatorTableConfig } from "@/lib/creators-config";
import { ProspectListView } from "@/components/dashboard/ProspectListView";
import { notFound } from "next/navigation";

export default function ContentPage() {
  const config = getCreatorTableConfig("content");
  if (!config) notFound();

  return <ProspectListView slug="content" config={config} />;
}
