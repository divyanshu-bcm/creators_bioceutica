import { NextResponse } from "next/server";

const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY!;
const DOCUSEAL_BASE_URL = process.env.DOCUSEAL_BASE_URL!;

interface DocuSealTemplateRaw {
  id: number;
  slug: string;
  name: string;
  folder_name: string | null;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
}

// GET /api/contracts/templates — fetch templates from DocuSeal
export async function GET() {
  try {
    if (!DOCUSEAL_API_KEY || !DOCUSEAL_BASE_URL) {
      return NextResponse.json(
        { error: "DOCUSEAL_API_KEY or DOCUSEAL_BASE_URL is not configured" },
        { status: 500 },
      );
    }

    const res = await fetch(`${DOCUSEAL_BASE_URL}/api/templates?limit=100`, {
      headers: { "X-Auth-Token": DOCUSEAL_API_KEY },
      next: { revalidate: 300 }, // cache for 5 min
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `DocuSeal API error: ${res.status} — ${body}` },
        { status: res.status },
      );
    }

    const json = (await res.json()) as { data: DocuSealTemplateRaw[] };

    // Filter out archived templates and trim to fields the UI uses
    const templates = (json.data ?? [])
      .filter((t) => !t.archived_at)
      .map((t) => ({
        id: t.id,
        slug: t.slug,
        name: t.name,
        folder_name: t.folder_name,
        created_at: t.created_at,
        updated_at: t.updated_at,
      }));

    return NextResponse.json(templates);
  } catch (err) {
    const e = err as Error;
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
