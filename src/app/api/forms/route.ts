// GET /api/forms — list all forms
// POST /api/forms — create a new form
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("forms")
    .select("*")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  // Get the current user so we can stamp user_id on the form
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  const supabase = createServiceRoleClient();
  const { title = "Untitled Form", description = "" } = await request
    .json()
    .catch(() => ({}));

  // Create the form
  const { data: form, error: formError } = await supabase
    .from("forms")
    .insert({ title, description, user_id: user?.id ?? null })
    .select()
    .single();

  if (formError)
    return NextResponse.json({ error: formError.message }, { status: 500 });

  // Create a default first step
  const { error: stepError } = await supabase
    .from("form_steps")
    .insert({ form_id: form.id, title: "Step 1", step_order: 0 });

  if (stepError)
    return NextResponse.json({ error: stepError.message }, { status: 500 });

  return NextResponse.json(form, { status: 201 });
}
