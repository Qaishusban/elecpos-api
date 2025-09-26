import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../../lib/supabase-server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const id = Number(params.id);

  const { data: purchase, error: pErr } = await supabase
    .from("purchases")
    .select("*")
    .eq("id", id)
    .single();

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 400 });
  }

  const { data: items, error: iErr } = await supabase
    .from("purchase_items")
    .select("*, products(name_ar, image_url)")
    .eq("purchase_id", id);

  if (iErr) {
    return NextResponse.json({ error: iErr.message }, { status: 400 });
  }

  return NextResponse.json({ purchase, items });
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const id = Number(params.id);

  const body = await req.json().catch(() => null);
  const items = (body?.items || []) as Array<{
    product_id: number;
    qty: number;
    unit_cost: number;
    tax_rate: number;
  }>;
  const supplier_name = body?.supplier_name ?? null;

  const sub_total = items.reduce((s, i) => s + i.qty * i.unit_cost, 0);
  const tax_total = items.reduce((s, i) => s + i.qty * i.unit_cost * (i.tax_rate || 0), 0);
  const grand_total = sub_total + tax_total;

  // نعدل الفاتورة (نترك invoice_no كما هو)
  const { error: upErr } = await supabase
    .from("purchases")
    .update({ supplier_name, sub_total, tax_total, grand_total })
    .eq("id", id);

  if (upErr) {
    return NextResponse.json({ error: upErr.message }, { status: 400 });
  }

  // إعادة كتابة البنود
  await supabase.from("purchase_items").delete().eq("purchase_id", id);

  const payload = items.map((i) => ({
    purchase_id: id,
    product_id: i.product_id,
    qty: i.qty,
    unit_cost: i.unit_cost,
    tax_rate: i.tax_rate,
  }));

  const { error: insErr } = await supabase.from("purchase_items").insert(payload);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const supabase = getServerSupabase();
  const id = Number(params.id);

  const { error } = await supabase.from("purchases").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
