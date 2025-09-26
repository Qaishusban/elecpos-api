import { NextResponse } from "next/server";
import { getServerSupabase } from "../../../lib/supabase-server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const supabaseClient = createRouteHandlerClient({ cookies });

export async function GET() {
  const supabase = getServerSupabase();
  const { data, error } = await supabase
    .from("purchases")
    .select(
      "id, supplier_name, sub_total, tax_total, grand_total, created_at, invoice_no"
    )
    .order("id", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ data });
}

/** استخراج رقم الفاتورة القادم بشكل بسيط (آخر رقم + 1) */
async function getNextInvoiceNo(supabase: ReturnType<typeof getServerSupabase>) {
  const { data, error } = await supabase
    .from("purchases")
    .select("invoice_no")
    .order("id", { ascending: false })
    .limit(1);

  if (error) throw error;

  let next = 1;
  if (data && data.length) {
    // نحاول تحويل الـ invoice_no لرقم (لو كان نص، نأخذ الجزء الرقمي)
    const raw = String(data[0].invoice_no ?? "");
    const numeric = parseInt(raw.replace(/\D/g, "") || "0", 10);
    next = (isNaN(numeric) ? 0 : numeric) + 1;
  }

  return String(next);
}

export async function POST(req: Request) {
  const supabase = getServerSupabase();

  // تحقّق جلسة المستخدم (RLS)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Auth session missing!" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const items = (body?.items || []) as Array<{
    product_id: number;
    qty: number;
    unit_cost: number;
    tax_rate: number;
  }>;
  const supplier_name = body?.supplier_name ?? null;

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "no items" }, { status: 400 });
  }

  const sub_total = items.reduce((s, i) => s + i.qty * i.unit_cost, 0);
  const tax_total = items.reduce((s, i) => s + i.qty * i.unit_cost * (i.tax_rate || 0), 0);
  const grand_total = sub_total + tax_total;

  // نحاول إدراج الفاتورة مع توليد رقم فريد للفاتورة (مع إعادة المحاولة عند التكرار)
  let createdId: number | null = null;
  let lastError: any = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const invoice_no = await getNextInvoiceNo(supabase);

    const { data: created, error: insErr } = await supabase
      .from("purchases")
      .insert({
        supplier_name,
        sub_total,
        tax_total,
        grand_total,
        invoice_no, // ← رقم الفاتورة المتولِّد
      })
      .select("id")
      .single();

    if (!insErr && created) {
      createdId = created.id as number;
      lastError = null;
      break;
    }

    lastError = insErr;
    // إن كان الخطأ بسبب تكرار رقم الفاتورة، نعيد المحاولة
    const msg = (insErr?.message || "").toLowerCase();
    const isDup =
      msg.includes("duplicate key") && msg.includes("invoice_no");
    if (!isDup) break; // خطأ آخر غير التكرار → نخرج فورًا
  }

  if (!createdId) {
    return NextResponse.json(
      { error: lastError?.message || "Create failed" },
      { status: 400 }
    );
  }

  // إدخال البنود
  const payload = items.map((i) => ({
    purchase_id: createdId!,
    product_id: i.product_id,
    qty: i.qty,
    unit_cost: i.unit_cost,
    tax_rate: i.tax_rate,
  }));

  const { error: itemsErr } = await supabase.from("purchase_items").insert(payload);
  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, id: createdId });
}
