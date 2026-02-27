import { getCreatorTableConfig } from "@/lib/creators-config";
import { ProspectListView } from "@/components/dashboard/ProspectListView";
import { notFound } from "next/navigation";

export default function CreatorsPage() {
  const config = getCreatorTableConfig("creators");
  if (!config) notFound();

  return <ProspectListView slug="creators" config={config} />;
}
