import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createSessionClient } from "@/lib/supabase/server";
import type { CampaignPhase } from "@/lib/types";

// ──────────────────────────────────────────────────────────────
// PATCH /api/campaigns/[id]
// Advances a campaign to the next phase.
// Requires an authenticated admin session.
//
// Body: { phase: "order_received", order_id: "..." }
//    or { phase: "content_published" }
// ──────────────────────────────────────────────────────────────
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // Auth check
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: { phase?: CampaignPhase; order_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { phase, order_id } = body;
  const validPhases: CampaignPhase[] = ["order_received", "content_published"];
  if (!phase || !validPhases.includes(phase)) {
    return NextResponse.json(
      { error: "phase must be 'order_received' or 'content_published'" },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();
  const updates: Record<string, unknown> = {
    phase,
    updated_at: now,
  };

  if (phase === "order_received") {
    if (!order_id?.trim()) {
      return NextResponse.json(
        { error: "order_id is required when advancing to order_received" },
        { status: 400 },
      );
    }
    updates.order_id = order_id.trim();
    updates.order_received_at = now;
  } else if (phase === "content_published") {
    updates.content_published_at = now;
  }

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("creator_campaigns")
    .update(updates)
    .eq("id", id)
    .select(
      `
      *,
      form:forms(id, title, slug)
    `,
    )
    .single();

  if (error) {
    console.error("PATCH /api/campaigns/[id]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
