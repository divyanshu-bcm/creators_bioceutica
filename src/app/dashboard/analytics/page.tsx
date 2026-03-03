import { createServiceRoleClient } from "@/lib/supabase/admin";
import { PROSPECT_TABLES } from "@/lib/prospects-config";
import { AnalyticsDashboard } from "@/components/dashboard/AnalyticsDashboard";

type RawAnalyticsData = {
  creatorsAdded: string[];
  prospectsAdded: string[];
  formsFilled: string[];
  ordersReceived: string[];
  contentPublished: string[];
};

async function fetchColumnTimestamps(
  tableName: string,
  columnName: string,
): Promise<string[]> {
  const db = createServiceRoleClient();
  const { data, error } = await (db as any)
    .from(tableName)
    .select(columnName)
    .not(columnName, "is", null);

  if (error) {
    console.error(`Failed to load ${tableName}.${columnName}:`, error.message);
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[])
    .map((row) => row[columnName])
    .filter((value): value is string => typeof value === "string");
}

export default async function AnalyticsPage() {
  const prospectTables = [
    ...new Set(PROSPECT_TABLES.map((table) => table.tableName)),
  ];

  const [creatorsAdded, formsFilled, campaigns, prospectsResults] =
    await Promise.all([
      fetchColumnTimestamps("creators", "created_at"),
      fetchColumnTimestamps("form_submissions", "submitted_at"),
      (async () => {
        const db = createServiceRoleClient();
        const { data, error } = await db
          .from("creator_campaigns")
          .select("order_received_at, content_published_at")
          .or("order_received_at.not.is.null,content_published_at.not.is.null");

        if (error) {
          console.error("Failed to load creator_campaigns:", error.message);
          return {
            ordersReceived: [] as string[],
            contentPublished: [] as string[],
          };
        }

        const rows = (data ?? []) as Array<{
          order_received_at: string | null;
          content_published_at: string | null;
        }>;

        return {
          ordersReceived: rows
            .map((row) => row.order_received_at)
            .filter((value): value is string => typeof value === "string"),
          contentPublished: rows
            .map((row) => row.content_published_at)
            .filter((value): value is string => typeof value === "string"),
        };
      })(),
      Promise.all(
        prospectTables.map((tableName) =>
          fetchColumnTimestamps(tableName, "created_at"),
        ),
      ),
    ]);

  const prospectsAdded = prospectsResults.flat();

  const rawData: RawAnalyticsData = {
    creatorsAdded,
    prospectsAdded,
    formsFilled,
    ordersReceived: campaigns.ordersReceived,
    contentPublished: campaigns.contentPublished,
  };

  return <AnalyticsDashboard rawData={rawData} />;
}
