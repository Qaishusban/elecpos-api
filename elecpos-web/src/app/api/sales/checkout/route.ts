export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing SUPABASE envs");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Payload:
 * {
 *   customer_name?: string,
 *   items: [{ product_id:number, qty:number, unit_price:number, tax_rate:number }]
 * }
 */
export async function POST(req: Request) {
  try {
    const sb = admin();
    const body = await req.json();

    const items: Array<{product_id:number; qty:number; unit_price:number; tax_rate:number}> = body.items || [];
    const customer_name: string = body.customer_name || null;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    // حساب المبالغ
    const sub_total = items.reduce((s, it) => s + it.qty * it.unit_price, 0);
    const tax_total = items.reduce((s, it) => s + it.qty * it.unit_price * (it.tax_rate ?? 0), 0);
    const grand_total = sub_total + tax_total;

    // أدخل الرأس
    const { data: sale, error: saleErr } = await sb
      .from("sales")
      .insert({
        customer_name,
        sub_total,
        tax_total,
        grand_total,
        created_by: null,
      })
      .select("*")
      .single();

    if (saleErr) return NextResponse.json({ error: saleErr.message }, { status: 400 });

    // أدخل التفاصيل
    const rows = items.map((i) => ({
      sale_id: sale.id,
      product_id: i.product_id,
      qty: i.qty,
      unit_price: i.unit_price,
      tax_rate: i.tax_rate,
      line_total: i.qty * i.unit_price,
      line_tax: i.qty * i.unit_price * (i.tax_rate ?? 0),
    }));

    const { error: itemsErr } = await sb.from("sale_items").insert(rows);
    if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, sale, items: rows });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Checkout failed" }, { status: 500 });
  }
}
