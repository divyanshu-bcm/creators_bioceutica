// POST /api/forms/[formId]/publish — generate slug, mark as published
// DELETE /api/forms/[formId]/publish — unpublish
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { generateSlug } from "@/lib/slugify";

type Params = { params: Promise<{ formId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();

  // Get current form
  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .single();
  if (formError)
    return NextResponse.json({ error: "Form not found" }, { status: 404 });

  // Reuse slug or generate new one
  let slug = form.slug;
  if (!slug) {
    let candidate = generateSlug(form.title);
    const { data: existing } = await supabase
      .from("forms")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();
    if (existing) candidate = generateSlug(form.title);
    slug = candidate;
  }

  // ── 1. Promote draft fields ──────────────────────────────────────────────
  const { data: draftFields } = await supabase
    .from("form_fields")
    .select("*")
    .eq("form_id", formId)
    .eq("is_draft", true);

  for (const draft of draftFields ?? []) {
    if (draft.draft_parent_id) {
      // Edit-draft → copy content into the published parent row, delete draft
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const {
        id: _id,
        is_draft: _d,
        draft_parent_id: _dp,
        created_at: _ca,
        ...content
      } = draft;
      await supabase
        .from("form_fields")
        .update({ ...content, pending_delete: false })
        .eq("id", draft.draft_parent_id);
      await supabase.from("form_fields").delete().eq("id", draft.id);
    } else {
      // New draft → promote to published
      await supabase
        .from("form_fields")
        .update({ is_draft: false })
        .eq("id", draft.id);
    }
  }

  // ── 2. Hard-delete pending_delete fields ─────────────────────────────────
  await supabase
    .from("form_fields")
    .delete()
    .eq("form_id", formId)
    .eq("pending_delete", true);

  // ── 3. Promote draft steps (new steps only — renames are immediate) ───────
  await supabase
    .from("form_steps")
    .update({ is_draft: false })
    .eq("form_id", formId)
    .eq("is_draft", true);

  // ── 4. Hard-delete pending_delete steps (and their fields) ───────────────
  const { data: pendingSteps } = await supabase
    .from("form_steps")
    .select("id")
    .eq("form_id", formId)
    .eq("pending_delete", true);
  for (const step of pendingSteps ?? []) {
    await supabase.from("form_fields").delete().eq("step_id", step.id);
    await supabase.from("form_steps").delete().eq("id", step.id);
  }

  // ── 5. Mark form published ────────────────────────────────────────────────
  const { data, error } = await supabase
    .from("forms")
    .update({ slug, is_published: true })
    .eq("id", formId)
    .select()
    .single();
  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  const origin =
    request.headers.get("origin") ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://localhost:3000";

  return NextResponse.json({ ...data, publicUrl: `${origin}/f/${slug}` });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("forms")
    .update({ is_published: false })
    .eq("id", formId)
    .select()
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
