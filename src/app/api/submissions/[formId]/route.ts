// GET /api/submissions/[formId] — fetch all submissions for a form (PROTECTED)
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ formId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("form_submissions")
    .select("*")
    .eq("form_id", formId)
    .order("submitted_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
