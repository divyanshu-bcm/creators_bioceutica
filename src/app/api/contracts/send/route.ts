import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createSessionClient } from "@/lib/supabase/server";

const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!;
const DOCUSEAL_BASE_URL = process.env.DOCUSEAL_BASE_URL!;

interface SubmitterInput {
  role: string;
  email: string;
  name?: string;
}

interface SendBody {
  template_id: number | string;
  template_name: string;
  our_role: string;
  submitters: SubmitterInput[];
}

interface DocuSealSubmitter {
  id: number;
  submission_id: number;
  uuid: string;
  email: string;
  slug: string;
  status: string;
  sent_at: string | null;
  opened_at: string | null;
  completed_at: string | null;
  declined_at: string | null;
  name: string | null;
  role: string;
  embed_src: string | null;
}

// POST /api/contracts/send — create a DocuSeal submission with N submitters
// Body: { template_id, template_name, our_role, submitters: [{ role, email, name }] }
export async function POST(request: Request) {
  try {
    if (!DOCUSEAL_API_KEY || !DOCUSEAL_BASE_URL) {
      return NextResponse.json(
        { error: "DOCUSEAL_API_KEY or DOCUSEAL_BASE_URL is not configured" },
        { status: 500 },
      );
    }

    const supabase = await createSessionClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = (await request.json().catch(() => ({}))) as Partial<SendBody>;
    const { template_id, template_name, our_role, submitters } = body;

    if (!template_id || !our_role || !Array.isArray(submitters) || submitters.length === 0) {
      return NextResponse.json(
        { error: "template_id, our_role, and submitters are required" },
        { status: 400 },
      );
    }

    for (const s of submitters) {
      if (!s.role || !s.email) {
        return NextResponse.json(
          { error: "every submitter needs a role and email" },
          { status: 400 },
        );
      }
    }

    const ourSubmitter = submitters.find((s) => s.role === our_role);
    if (!ourSubmitter) {
      return NextResponse.json(
        { error: `our_role "${our_role}" not present in submitters` },
        { status: 400 },
      );
    }

    const counterparties = submitters.filter((s) => s.role !== our_role);
    const primary = counterparties[0] ?? ourSubmitter;
    const docName = `${template_name ?? "Contract"} — ${primary.name?.trim() || primary.email}`;

    // Create submission (order is inherited from the template settings)
    const createRes = await fetch(`${DOCUSEAL_BASE_URL}/api/submissions`, {
      method: "POST",
      headers: {
        "X-Auth-Token": DOCUSEAL_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        template_id: Number(template_id),
        send_email: true,
        message: {
          subject: "Your Contract from Bioceutica",
          body: "Please review and sign the attached contract.",
        },
        submitters: submitters.map((s) => ({
          role: s.role,
          email: s.email,
          name: s.name ?? "",
        })),
        metadata: {
          sent_by: user?.id ?? null,
          our_role,
          source: "bioceutica_creators",
        },
      }),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text();
      return NextResponse.json(
        { error: `DocuSeal create failed: ${createRes.status} — ${errBody}` },
        { status: createRes.status },
      );
    }

    const responseSubmitters = (await createRes.json()) as DocuSealSubmitter[];
    const first = responseSubmitters[0];

    if (!first?.submission_id) {
      return NextResponse.json(
        { error: "DocuSeal returned no submission_id" },
        { status: 500 },
      );
    }

    const ours = responseSubmitters.find((s) => s.role === our_role);
    const storedSubmitters = responseSubmitters.map((s) => ({
      role: s.role,
      email: s.email,
      name: s.name,
      slug: s.slug,
      embed_src: s.embed_src,
      status: s.status,
      completed_at: s.completed_at,
    }));

    const admin = createServiceRoleClient();
    const { data: contract, error: dbErr } = await admin
      .from("contracts")
      .insert({
        docuseal_submission_id: String(first.submission_id),
        template_id: String(template_id),
        template_name: template_name ?? "Unknown Template",
        recipient_email: primary.email,
        recipient_name: primary.name ?? null,
        document_name: docName,
        status: first.status ?? "sent",
        sent_by: user?.id ?? null,
        our_role,
        our_slug: ours?.slug ?? null,
        our_embed_src: ours?.embed_src ?? null,
        our_signed_at: ours?.completed_at ?? null,
        submitters: storedSubmitters,
        metadata: {
          source: "bioceutica_creators",
          submitter_slug: first.slug,
          submitter_uuid: first.uuid,
        },
      })
      .select()
      .single();

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json(contract, { status: 201 });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
