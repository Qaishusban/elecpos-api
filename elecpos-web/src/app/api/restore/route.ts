export const runtime = "nodejs";

import { NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@supabase/supabase-js";

// ⚠️ عدّل قائمة الجداول حسب قاعدة بياناتك
const TABLES_IN_BACKUP = [
  "products",
  "purchases",
  "purchase_items",
  "sales",
  "sale_items",
  "roles",
  "users" // إذا عامل export لها
];

// غالباً الـ PK = id؛ لو بدك onConflict مخصص لكل جدول عدل هنا:
const ON_CONFLICT: Record<string, string | undefined> = {
  products: "id",
  purchases: "id",
  purchase_items: "id",
  sales: "id",
  sale_items: "id",
  roles: "id",
  users: "id",
};

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const applyStorage = form.get("storage") === "1"; // اختياري: استرجاع صور التخزين

    if (!file) {
      return NextResponse.json({ error: "الرجاء اختيار ملف ZIP" }, { status: 400 });
    }

    const ab = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(ab);
    const supabase = getServiceClient();

    // 1) استرجاع الجداول (data/*.json)
    for (const table of TABLES_IN_BACKUP) {
      const entry = zip.file(`data/${table}.json`);
      if (!entry) continue;

      const text = await entry.async("string");
      if (!text.trim()) continue;

      let rows: any[] = [];
      try {
        rows = JSON.parse(text);
      } catch {
        return NextResponse.json({ error: `ملف معطوب: data/${table}.json` }, { status: 400 });
      }
      if (!Array.isArray(rows) || rows.length === 0) continue;

      // upsert مع onConflict إن وجد، وإلا insert عادي
      const onConflict = ON_CONFLICT[table];
      const q = supabase.from(table);
      const { error } = onConflict
        ? await q.upsert(rows, { onConflict, ignoreDuplicates: false })
        : await q.insert(rows);

      if (error) {
        return NextResponse.json(
          { error: `Restore failed for ${table}: ${error.message}` },
          { status: 400 }
        );
      }
    }

    // 2) استرجاع الصور/الملفات (storage/<bucket>/<path>)
    if (applyStorage) {
      const storageFolder = zip.folder("storage");
      if (storageFolder) {
        const files = storageFolder.filter((path) => !path.endsWith("/"));
        for (const f of files) {
          // path مثال: storage/product-images/123.png
          const parts = f.name.split("/");
          const bucket = parts[1]; // بعد storage
          const objectPath = parts.slice(2).join("/");

          const blob = await f.async("blob");
          const { error } = await supabase.storage
            .from(bucket)
            .upload(objectPath, blob, { upsert: true });

          if (error) {
            return NextResponse.json(
              { error: `Storage restore failed (${bucket}/${objectPath}): ${error.message}` },
              { status: 400 }
            );
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Restore error" }, { status: 500 });
  }
}
