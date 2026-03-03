import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// ──────────────────────────────────────────────────────────────
// GET /api/campaigns?prospect_id=xxx
//   → returns all campaigns for a creator (with joined form title)
//
// GET /api/campaigns?phase=form_filled|order_received|content_published
//   → returns { prospect_ids: string[] } for phase-filter chip in list view
// ──────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const prospectId = searchParams.get("prospect_id");
  const phase = searchParams.get("phase");

  const supabase = await createAdminClient();

  // Phase filter query — returns unique prospect_ids that have a campaign at this phase
  if (phase) {
    const validPhases = ["form_filled", "order_received", "content_published"];
    if (!validPhases.includes(phase)) {
      return NextResponse.json({ error: "Invalid phase" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("creator_campaigns")
      .select("prospect_id")
      .eq("phase", phase);

    if (error) {
      console.error("GET /api/campaigns (phase):", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const prospect_ids = [...new Set((data ?? []).map((r) => r.prospect_id))];
    return NextResponse.json({ prospect_ids });
  }

  // Per-creator query — returns full campaign objects with form info
  if (!prospectId) {
    return NextResponse.json(
      { error: "prospect_id or phase is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("creator_campaigns")
    .select(
      `
      *,
      form:forms(id, title, slug)
    `,
    )
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("GET /api/campaigns (prospect):", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ campaigns: data ?? [] });
}

// ──────────────────────────────────────────────────────────────
// POST /api/campaigns
// Called by n8n after a form is filled.
// Protected by X-API-Key header matching CAMPAIGN_API_KEY env var.
//
// Body: { prospect_id, form_id, form_submission_id }
// ──────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey || apiKey !== process.env.CAMPAIGN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    prospect_id?: string;
    form_id?: string;
    form_submission_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { prospect_id, form_id, form_submission_id } = body;
  if (!prospect_id) {
    return NextResponse.json(
      { error: "prospect_id is required" },
      { status: 400 },
    );
  }

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("creator_campaigns")
    .insert({
      prospect_id,
      form_id: form_id ?? null,
      form_submission_id: form_submission_id ?? null,
      phase: "form_filled",
      form_filled_at: new Date().toISOString(),
    })
    .select(
      `
      *,
      form:forms(id, title, slug)
    `,
    )
    .single();

  if (error) {
    console.error("POST /api/campaigns:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
