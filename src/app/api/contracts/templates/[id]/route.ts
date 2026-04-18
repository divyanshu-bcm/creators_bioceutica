import { NextResponse } from "next/server";

const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!;
const DOCUSEAL_BASE_URL = process.env.DOCUSEAL_BASE_URL!;

interface DocuSealTemplateDetail {
  id: number;
  name: string;
  submitters: { name: string; uuid: string }[];
}

// GET /api/contracts/templates/[id] — returns the ordered list of roles
// defined on a DocuSeal template. Used by the Send modal to branch
// between 2-party and 3+ party flows.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!DOCUSEAL_API_KEY || !DOCUSEAL_BASE_URL) {
      return NextResponse.json(
        { error: "DOCUSEAL_API_KEY or DOCUSEAL_BASE_URL is not configured" },
        { status: 500 },
      );
    }

    const { id } = await params;

    const res = await fetch(`${DOCUSEAL_BASE_URL}/api/templates/${id}`, {
      headers: { "X-Auth-Token": DOCUSEAL_API_KEY },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `DocuSeal API error: ${res.status} — ${body}` },
        { status: res.status },
      );
    }

    const json = (await res.json()) as DocuSealTemplateDetail;

    return NextResponse.json({
      id: json.id,
      name: json.name,
      submitters: json.submitters ?? [],
    });
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
