export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!url || !key) throw new Error("Missing SUPABASE envs");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const sb = admin();
    const form = await req.formData();
    const productId = Number(form.get("product_id"));
    const file = form.get("file") as File | null;

    if (!productId || !file)
      return NextResponse.json({ error: "Missing product_id or file" }, { status: 400 });

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `p_${productId}/${Date.now()}.${ext}`;

    const { error: upErr } = await sb
      .storage.from("product-images")
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });

    const { data: pub } = sb.storage.from("product-images").getPublicUrl(path);
    const image_url = pub.publicUrl;

    const { error: updErr } = await sb.from("products").update({ image_url }).eq("id", productId);
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

    return NextResponse.json({ ok: true, image_url });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}
