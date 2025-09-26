export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Admin client (يتجاوز RLS في السيرفر فقط)
function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!; // لازم موجود في .env.local
  if (!url || !key) throw new Error("Missing SUPABASE envs");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** GET: رجّع منتجات مع الكميات من view products_with_stock */
export async function GET() {
  try {
    const sb = admin();
    const { data, error } = await sb.from("products_with_stock").select("*").order("name_ar");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Fetch failed" }, { status: 500 });
  }
}

/** POST: إدخال منتج جديد */
export async function POST(req: Request) {
  try {
    const body = await req.json();     // { name_ar, ... }
    const sb = admin();
    const { data, error } = await sb.from("products").insert(body).select("*").single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Insert failed" }, { status: 500 });
  }
}

/** PUT: تعديل منتج */
export async function PUT(req: Request) {
  try {
    const body = await req.json();     // { id, ...fields }
    const { id, ...payload } = body;
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const sb = admin();
    const { data, error } = await sb
      .from("products")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Update failed" }, { status: 500 });
  }
}

/** DELETE: حذف منتج */
export async function DELETE(req: Request) {
  try {
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const sb = admin();
    // لو عندك علاقات (purchase_items/sale_items) لازم تحذفها أو تمنع FK
    const { error } = await sb.from("products").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Delete failed" }, { status: 500 });
  }
}
