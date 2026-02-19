import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.storage
      .from("form_library")
      .list("", {
        limit: 200,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const files = (data ?? [])
      .filter((f) => f.name !== ".emptyFolderPlaceholder")
      .map((f) => {
        const { data: urlData } = supabase.storage
          .from("form_library")
          .getPublicUrl(f.name);
        return {
          name: f.name,
          url: urlData.publicUrl,
          size: f.metadata?.size ?? 0,
          createdAt: f.created_at,
        };
      });

    return NextResponse.json({ files });
  } catch (err) {
    console.error("Library route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
