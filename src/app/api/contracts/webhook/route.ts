import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import type { ContractSubmitter } from "@/lib/types";

// DocuSeal webhook events we care about:
//   - form.viewed / form.started       → opened
//   - form.completed                   → per-submitter completion (has role)
//   - form.declined                    → declined
//   - submission.created               → sent
//   - submission.completed             → all parties done
//   - submission.expired               → expired
interface DocuSealWebhookPayload {
  event_type: string;
  timestamp: string;
  data: {
    id?: number;
    submission_id?: number;
    status?: string;
    completed_at?: string | null;
    declined_at?: string | null;
    opened_at?: string | null;
    expired_at?: string | null;
    role?: string;
    email?: string;
    slug?: string;
    submission?: { id: number; status?: string };
  };
}

function mapOverallStatus(eventType: string): string | null {
  switch (eventType) {
    case "form.viewed":
    case "form.started":
      return "opened";
    case "submission.completed":
      return "completed";
    case "form.declined":
      return "declined";
    case "submission.expired":
      return "expired";
    case "submission.created":
      return "sent";
    default:
      return null;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const events: DocuSealWebhookPayload[] = Array.isArray(body) ? body : [body];

    const supabase = createServiceRoleClient();

    for (const event of events) {
      const submissionId =
        event.data?.submission_id ??
        event.data?.submission?.id ??
        event.data?.id;

      if (!submissionId) continue;

      const key = String(submissionId);

      // Fetch the contract so we can update per-submitter state too
      const { data: contract } = await supabase
        .from("contracts")
        .select("id, our_role, our_signed_at, submitters, status")
        .eq("docuseal_submission_id", key)
        .maybeSingle();

      if (!contract) continue;

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      // Per-submitter completion: update submitters[] + our_signed_at if role matches
      if (event.event_type === "form.completed" && event.data?.role) {
        const existing = Array.isArray(contract.submitters)
          ? (contract.submitters as ContractSubmitter[])
          : [];
        const completedAt =
          event.data.completed_at ?? new Date().toISOString();
        const nextSubmitters = existing.map((s) =>
          s.role === event.data.role
            ? { ...s, status: "completed", completed_at: completedAt }
            : s,
        );
        updates.submitters = nextSubmitters;

        if (
          contract.our_role &&
          event.data.role === contract.our_role &&
          !contract.our_signed_at
        ) {
          updates.our_signed_at = completedAt;
        }
      }

      // Overall submission status transitions
      const overall = mapOverallStatus(event.event_type);
      if (overall) {
        // don't downgrade a completed contract back to "opened"
        if (contract.status === "completed" && overall !== "completed") {
          // skip
        } else {
          updates.status = overall;
        }
      }

      if (Object.keys(updates).length > 1) {
        await supabase
          .from("contracts")
          .update(updates)
          .eq("docuseal_submission_id", key);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
