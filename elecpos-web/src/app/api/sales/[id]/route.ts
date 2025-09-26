export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing SUPABASE envs");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** GET /api/sales/[id] => { sale, items } (مع اسم + صورة المنتج) */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const sb = admin();
    const saleId = Number(params.id);

    const { data: sale, error: e1 } = await sb
      .from("sales").select("*").eq("id", saleId).single();
    if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });

    const { data: items, error: e2 } = await sb
      .from("sale_items")
      .select("product_id, qty, unit_price, tax_rate, products(name_ar, image_url)")
      .eq("sale_id", saleId)
      .order("id");
    if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

    return NextResponse.json({ sale, items });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Fetch failed" }, { status: 500 });
  }
}

/** PUT /api/sales/[id] => تعديل فاتورة بالكامل */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const saleId = Number(params.id);
    const body = await req.json();
    const items = (body.items || []) as Array<{product_id:number; qty:number; unit_price:number; tax_rate:number}>;
    const customer_name = body.customer_name ?? null;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    const sub_total = items.reduce((s,i)=>s+i.qty*i.unit_price, 0);
    const tax_total = items.reduce((s,i)=>s+i.qty*i.unit_price*(i.tax_rate??0), 0);
    const grand_total = sub_total + tax_total;

    const sb = admin();

    const { error: uErr } = await sb.from("sales")
      .update({ customer_name, sub_total, tax_total, grand_total })
      .eq("id", saleId);
    if (uErr) return NextResponse.json({ error: uErr.message }, { status: 400 });

    await sb.from("sale_items").delete().eq("sale_id", saleId);

    const rows = items.map(i => ({
      sale_id: saleId,
      product_id: i.product_id,
      qty: i.qty,
      unit_price: i.unit_price,
      tax_rate: i.tax_rate,
      line_total: i.qty * i.unit_price,
      line_tax: i.qty * i.unit_price * (i.tax_rate ?? 0),
    }));
    const { error: iErr } = await sb.from("sale_items").insert(rows);
    if (iErr) return NextResponse.json({ error: iErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, sale_id: saleId, sub_total, tax_total, grand_total });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Update failed" }, { status: 500 });
  }
}

/** DELETE /api/sales/[id] => حذف فاتورة محددة (احتياطي) */
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const saleId = Number(params.id);
    const sb = admin();
    await sb.from("sale_items").delete().eq("sale_id", saleId);
    const { error } = await sb.from("sales").delete().eq("id", saleId);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true, deleted_id: saleId });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Delete failed" }, { status: 500 });
  }
}
