// POST /api/forms/[formId]/publish — generate slug, mark as published
// DELETE /api/forms/[formId]/publish — unpublish
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateSlug } from "@/lib/slugify";

type Params = { params: Promise<{ formId: string }> };

export async function POST(request: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = await createAdminClient();

  // Get current form
  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("*")
    .eq("id", formId)
    .single();

  if (formError)
    return NextResponse.json({ error: "Form not found" }, { status: 404 });

  // Reuse existing slug if already published; generate a new one otherwise
  let slug = form.slug;
  if (!slug) {
    let candidate = generateSlug(form.title);
    // Check uniqueness — retry once on collision
    const { data: existing } = await supabase
      .from("forms")
      .select("id")
      .eq("slug", candidate)
      .maybeSingle();

    if (existing) {
      candidate = generateSlug(form.title); // second attempt with new nanoid
    }
    slug = candidate;
  }

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

  return NextResponse.json({
    ...data,
    publicUrl: `${origin}/f/${slug}`,
  });
}

export async function DELETE(_req: Request, { params }: Params) {
  const { formId } = await params;
  const supabase = await createAdminClient();

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
