import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export async function GET() {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const supabase = createServiceRoleClient();
  const body = await request.json().catch(() => ({}));

  const product_name =
    typeof body.product_name === "string" ? body.product_name.trim() : "";
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";

  if (!product_name) {
    return NextResponse.json(
      { error: "product_name is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      product_name,
      sku: sku || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function PUT(request: Request) {
  const supabase = createServiceRoleClient();
  const body = await request.json().catch(() => ({}));

  const product_id =
    typeof body.product_id === "string" ? body.product_id.trim() : "";
  const product_name =
    typeof body.product_name === "string" ? body.product_name.trim() : "";
  const sku = typeof body.sku === "string" ? body.sku.trim() : "";

  if (!product_id) {
    return NextResponse.json(
      { error: "product_id is required" },
      { status: 400 },
    );
  }

  if (!product_name) {
    return NextResponse.json(
      { error: "product_name is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("products")
    .update({
      product_name,
      sku: sku || null,
    })
    .eq("product_id", product_id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
