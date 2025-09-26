export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing SUPABASE envs");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** GET: يرجّع آخر فاتورة */
export async function GET() {
  try {
    const sb = admin();
    const { data, error } = await sb
      .from("sales")
      .select("id, customer_name, grand_total, created_at")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Fetch failed" }, { status: 500 });
  }
}

/** DELETE: يحذف آخر فاتورة (مع تفاصيلها) */
export async function DELETE() {
  try {
    const sb = admin();
    const { data: last, error: e1 } = await sb
      .from("sales")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (e1) return NextResponse.json({ error: e1.message }, { status: 400 });
    if (!last) return NextResponse.json({ error: "لا يوجد فواتير" }, { status: 404 });

    // احذف التفاصيل أولاً (لو ما عندك ON DELETE CASCADE)
    await sb.from("sale_items").delete().eq("sale_id", last.id);
    const { error: e2 } = await sb.from("sales").delete().eq("id", last.id);
    if (e2) return NextResponse.json({ error: e2.message }, { status: 400 });

    return NextResponse.json({ ok: true, deleted_id: last.id });
  } catch (e:any) {
    return NextResponse.json({ error: e.message || "Delete failed" }, { status: 500 });
  }
}
