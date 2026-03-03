import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { trackFormActivity } from "@/lib/form-activity";

type Params = { params: Promise<{ formId: string }> };

// POST /api/forms/[formId]/reset — discard draft step/field changes
export async function POST(_request: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();

  const { data: form, error: formErr } = await supabase
    .from("forms")
    .select("id, is_published")
    .eq("id", formId)
    .single();

  if (formErr || !form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }

  if (!form.is_published) {
    return NextResponse.json(
      { error: "Reset is only available for published forms" },
      { status: 400 },
    );
  }

  // 1) Remove all draft field rows (new + shadow edits)
  const { error: deleteDraftFieldsErr } = await supabase
    .from("form_fields")
    .delete()
    .eq("form_id", formId)
    .eq("is_draft", true);

  if (deleteDraftFieldsErr) {
    return NextResponse.json(
      { error: deleteDraftFieldsErr.message },
      { status: 500 },
    );
  }

  // 2) Restore published fields marked pending_delete
  const { error: restoreFieldsErr } = await supabase
    .from("form_fields")
    .update({ pending_delete: false })
    .eq("form_id", formId)
    .eq("is_draft", false)
    .eq("pending_delete", true);

  if (restoreFieldsErr) {
    return NextResponse.json(
      { error: restoreFieldsErr.message },
      { status: 500 },
    );
  }

  // 3) Remove all draft step rows (new + shadow edits)
  const { error: deleteDraftStepsErr } = await supabase
    .from("form_steps")
    .delete()
    .eq("form_id", formId)
    .eq("is_draft", true);

  if (deleteDraftStepsErr) {
    return NextResponse.json(
      { error: deleteDraftStepsErr.message },
      { status: 500 },
    );
  }

  // 4) Restore published steps marked pending_delete
  const { error: restoreStepsErr } = await supabase
    .from("form_steps")
    .update({ pending_delete: false })
    .eq("form_id", formId)
    .eq("is_draft", false)
    .eq("pending_delete", true);

  if (restoreStepsErr) {
    return NextResponse.json(
      { error: restoreStepsErr.message },
      { status: 500 },
    );
  }

  await trackFormActivity({
    formId,
    action: "form_changes_reset",
    details: null,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
