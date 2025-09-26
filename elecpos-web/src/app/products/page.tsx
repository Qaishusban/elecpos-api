'use client';
import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "../../lib/supabase-browser"; // ✅ المسار النسبي من app/products
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const sb = supabaseBrowser(); // ✅ instance وحيد نستخدمه بالصفحة

/** ---------- Types ---------- */
type Product = {
  id: number;
  sku?: string | null;
  name_ar: string;
  name_en: string | null;
  sale_price: number;
  cost_price: number;
  tax_rate: number;
  is_active: boolean;
  image_url?: string | null;
  qty?: number; // from view products_with_stock
  category_id?: number | null;
};

const ProductSchema = z.object({
  name_ar: z.string().min(1, "الاسم العربي مطلوب"),
  name_en: z.string().optional().nullable(),
  cost_price: z.coerce.number().min(0),
  sale_price: z.coerce.number().min(0),
  tax_rate: z.coerce.number().min(0).max(1), // 0.16 = 16%
  sku: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
});
type ProductForm = z.infer<typeof ProductSchema>;

/** ---------- Page ---------- */
export default function AdminProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);

  // صورة بعد الحفظ
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(null);

  // استيراد اكسل
  const fileRef = useRef<HTMLInputElement | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductForm>({
    resolver: zodResolver(ProductSchema) as Resolver<ProductForm>,
    defaultValues: {
      name_ar: "",
      name_en: null,
      sku: null,
      cost_price: 0,
      sale_price: 0,
      tax_rate: 0.16,
      is_active: true,
    },
  });

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data, error } = await sb
      .from("products_with_stock")
      .select("*")
      .order("name_ar");
    if (error) {
      alert(error.message);
      return;
    }
    setItems((data as Product[]) || []);
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter(
      (p) =>
        (p.sku || "").toLowerCase().includes(t) ||
        p.name_ar.toLowerCase().includes(t) ||
        ((p.name_en || "").toLowerCase().includes(t))
    );
  }, [items, q]);

  function resetForm() {
    reset({
      name_ar: "",
      name_en: null,
      sku: null,
      cost_price: 0,
      sale_price: 0,
      tax_rate: 0.16,
      is_active: true,
    });
    setEditing(null);
    setImgFile(null);
    setImgPreview(null);
  }

  async function uploadImageIfAny(productId: number) {
    if (!imgFile) return;
    const fd = new FormData();
    fd.append("product_id", String(productId));
    fd.append("file", imgFile);
    const res = await fetch("/api/upload/product-image", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "فشل رفع الصورة");
    }
  }

  async function onSubmit(values: ProductForm) {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { alert("يلزم تسجيل الدخول أولاً"); return; }

    const payload = {
      ...values,
      name_en: values.name_en ?? null,
      sku: values.sku ?? null,
      is_active: values.is_active ?? true,
    };

    if (editing) {
      const { error } = await sb.from("products").update(payload).eq("id", editing.id);
      if (error) return alert(error.message);
      await uploadImageIfAny(editing.id);
    } else {
      const { data, error } = await sb.from("products").insert(payload).select("id").single();
      if (error) return alert(error.message);
      await uploadImageIfAny((data as any).id);
    }
    resetForm();
    await load();
  }

  async function remove(p: Product) {
    if (!confirm(`حذف ${p.name_ar}؟`)) return;
    const { error } = await sb.from("products").delete().eq("id", p.id);
    if (error) return alert(error.message);
    await load();
  }

  function exportExcel() {
    const data = items.map((p) => ({
      sku: p.sku || "",
      name_ar: p.name_ar,
      name_en: p.name_en || "",
      cost_price: p.cost_price,
      sale_price: p.sale_price,
      tax_rate: p.tax_rate,
      qty: p.qty,
      is_active: p.is_active ? 1 : 0,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "products");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "products.xlsx");
  }

  async function importExcel(file: File) {
    const ab = await file.arrayBuffer();
    const wb = XLSX.read(ab);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<any>(ws);

    const payload = rows.map((r: any) => ({
      sku: r.sku?.toString() || null,
      name_ar: String(r.name_ar || ""),
      name_en:
        r.name_en != null && String(r.name_en) !== "" ? String(r.name_en) : null,
      cost_price: Number(r.cost_price || 0),
      sale_price: Number(r.sale_price || 0),
      tax_rate: Number(r.tax_rate || 0),
      is_active: Number(r.is_active ?? 1) === 1,
    }));

    if (payload.length) {
      const { error } = await sb.from("products").upsert(payload, { onConflict: "sku" });
      if (error) return alert(error.message);
      await load();
      alert("تم الاستيراد بنجاح ✅");
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className="h-title">إدارة الأصناف</h1>
          <div className="flex items-center gap-2">
            <input
              className="input w-64"
              placeholder="بحث بالاسم/الكود"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <button className="btn" onClick={resetForm}>جديد</button>
            <button className="btn" onClick={exportExcel}>تصدير Excel</button>
            <input
              hidden
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => e.target.files && importExcel(e.target.files[0])}
            />
            <button className="btn" onClick={() => fileRef.current?.click()}>
              استيراد Excel
            </button>
          </div>
        </div>

        {/* فورم إضافة/تعديل */}
        <form className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3" onSubmit={handleSubmit(onSubmit)}>
          <input className="input" placeholder="SKU (اختياري)" {...register("sku")} />
          <input className="input" placeholder="الاسم العربي" {...register("name_ar")} />
          <input className="input" placeholder="English name" {...register("name_en")} />
          <input className="input" placeholder="Cost price" type="number" step="0.001" {...register("cost_price")} />
          <input className="input" placeholder="Sale price" type="number" step="0.001" {...register("sale_price")} />
          <input className="input" placeholder="Tax rate e.g. 0.16" type="number" step="0.01" {...register("tax_rate")} />
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register("is_active")} /> فعال
          </label>

          {/* صورة الصنف */}
          <div className="md:col-span-3">
            <div className="surface flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-28 h-28 rounded-2xl overflow-hidden bg-slate-100 border">
                {imgPreview ? (
                  <img src={imgPreview} alt="" className="w-full h-full object-cover" />
                ) : editing?.image_url ? (
                  <img src={editing.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-slate-400">No Image</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setImgFile(f);
                    setImgPreview(f ? URL.createObjectURL(f) : null);
                  }}
                />
                <span className="subtle">* سيتم رفعها بعد الحفظ</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-3 flex gap-2">
            <button className="btn" type="submit">
              {editing ? "تعديل" : "إضافة"}
            </button>
            {editing && (
              <button type="button" className="btn" onClick={resetForm}>إلغاء</button>
            )}
          </div>
        </form>

        {(errors.name_ar || errors.name_en) && (
          <p className="text-red-600 mt-2 text-sm">تأكد من تعبئة الأسماء بشكل صحيح.</p>
        )}
      </div>

      {/* جدول الأصناف */}
      <div className="card">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2">صورة</th>
                <th className="text-left p-2">SKU</th>
                <th className="text-left p-2">الاسم</th>
                <th className="text-left p-2">Name</th>
                <th className="text-right p-2">Cost</th>
                <th className="text-right p-2">Price</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-right p-2">VAT</th>
                <th className="text-center p-2">نشِط</th>
                <th className="text-center p-2">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">
                    <img
                      src={p.image_url ?? "/favicon.ico"}
                      alt=""
                      className="w-12 h-12 rounded-xl object-cover border"
                    />
                  </td>
                  <td className="p-2">{p.sku || "-"}</td>
                  <td className="p-2">{p.name_ar}</td>
                  <td className="p-2">{p.name_en}</td>
                  <td className="p-2 text-right">{(p.cost_price ?? 0).toFixed(3)}</td>
                  <td className="p-2 text-right">{(p.sale_price ?? 0).toFixed(3)}</td>
                  <td className="p-2 text-right">{Number(p.qty ?? 0).toFixed(3)}</td>
                  <td className="p-2 text-right">{((p.tax_rate ?? 0) * 100).toFixed(0)}%</td>
                  <td className="p-2 text-center">{p.is_active ? "✓" : "✗"}</td>
                  <td className="p-2 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        className="btn"
                        onClick={() => {
                          setEditing(p);
                          reset({
                            sku: p.sku ?? null,
                            name_ar: p.name_ar,
                            name_en: p.name_en ?? null,
                            cost_price: p.cost_price,
                            sale_price: p.sale_price,
                            tax_rate: p.tax_rate,
                            is_active: p.is_active,
                          });
                          setImgFile(null);
                          setImgPreview(null);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        تعديل
                      </button>
                      <button className="btn" onClick={() => remove(p)}>حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td className="p-6 text-center opacity-60" colSpan={10}>لا نتائج</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
