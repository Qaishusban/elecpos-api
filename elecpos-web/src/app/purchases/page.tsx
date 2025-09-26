'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

/** -------- Types -------- */
type Product = {
  id: number;
  sku?: string | null;
  name_ar: string;
  name_en: string | null;
  image_url?: string | null;
  tax_rate: number;
  sale_price: number;
};

type PItem = {
  product_id: number;
  name: string;
  image_url?: string | null;
  qty: number;
  unit_cost: number;
  tax_rate: number;
};

type PurchaseRow = {
  id: number;
  invoice_no?: number | null;
  supplier_name: string | null;
  grand_total: number;
  sub_total?: number | null;
  tax_total?: number | null;
  created_at: string;
  items_count?: number | null;
};

type PurchaseDetails = {
  purchase: {
    id: number;
    invoice_no?: number | null;
    supplier_name: string | null;
    created_at: string;
    sub_total?: number | null;
    tax_total?: number | null;
    grand_total?: number | null;
  };
  items: Array<{
    product_id: number;
    qty: number;
    unit_cost: number;
    tax_rate: number;
    products?: { name_ar?: string | null; image_url?: string | null; sku?: string | null } | null;
  }>;
};

export default function PurchasesPage() {
  /** Products & search */
  const [products, setProducts] = useState<Product[]>([]);
  const [q, setQ] = useState("");

  /** Current invoice (create / edit) */
  const [items, setItems] = useState<PItem[]>([]);
  const [supplier, setSupplier] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  /** Purchases list + details cache for expand rows */
  const [list, setList] = useState<PurchaseRow[]>([]);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [detailsCache, setDetailsCache] = useState<Record<number, PurchaseDetails | undefined>>({});

  /** Excel input ref */
  const importRef = useRef<HTMLInputElement | null>(null);

  /** ---------- Loaders ---------- */
  useEffect(() => {
    loadProducts();
    loadList();
  }, []);

  async function loadProducts() {
    const r = await fetch("/api/products");
    const j = await r.json();
    if (!r.ok) return alert(j.error || "Load products failed");
    setProducts(j.data || []);
  }

  async function loadList() {
    // يُفضّل أن يرجّع السيرفر المنظور purchases_with_totals
    const r = await fetch("/api/purchases");
    const j = await r.json();
    if (!r.ok) return alert(j.error || "Load purchases failed");
    setList(j.data || []);
  }

  /** ---------- Helpers ---------- */
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return products;
    return products.filter((p) =>
      (p.sku || "").toLowerCase().includes(t) ||
      p.name_ar.toLowerCase().includes(t) ||
      (p.name_en || "").toLowerCase().includes(t)
    );
  }, [products, q]);

  function addProduct(p: Product) {
    setItems((prev) => {
      const ix = prev.findIndex((x) => x.product_id === p.id);
      if (ix >= 0) {
        const a = [...prev];
        a[ix] = { ...a[ix], qty: a[ix].qty + 1 };
        return a;
      }
      return [
        ...prev,
        {
          product_id: p.id,
          name: p.name_ar,
          image_url: p.image_url ?? null,
          qty: 1,
          unit_cost: p.sale_price, // افتراضياً
          tax_rate: p.tax_rate ?? 0,
        },
      ];
    });
  }

  function setQty(i: number, v: number) {
    setItems((prev) => prev.map((r, ix) => (ix === i ? { ...r, qty: Math.max(0, v) } : r)));
  }
  function setCost(i: number, v: number) {
    setItems((prev) => prev.map((r, ix) => (ix === i ? { ...r, unit_cost: Math.max(0, v) } : r)));
  }
  function setTax(i: number, v: number) {
    setItems((prev) =>
      prev.map((r, ix) => (ix === i ? { ...r, tax_rate: Math.max(0, Math.min(1, v)) } : r))
    );
  }
  function remove(i: number) {
    setItems((prev) => prev.filter((_, ix) => ix !== i));
  }

  function resetForm() {
    setItems([]);
    setSupplier("");
    setEditingId(null);
  }

  const subTotal = items.reduce((s, r) => s + r.qty * r.unit_cost, 0);
  const taxTotal = items.reduce((s, r) => s + r.qty * r.unit_cost * (r.tax_rate ?? 0), 0);
  const grand = subTotal + taxTotal;

  /** لو ما رجّع السيرفر next invoice_no؛ بنحسب تقريبي من القائمة */
  const nextInvoiceNo =
    (list.length ? Math.max(...list.map((x) => Number(x.invoice_no || 0))) : 0) + 1;

  /** ---------- Create / Update / Delete ---------- */
  async function saveNew() {
    if (items.length === 0) return alert("لا توجد بنود");
    const payload = {
      supplier_name: supplier || null,
      items: items.map((i) => ({
        product_id: i.product_id,
        qty: i.qty,
        unit_cost: i.unit_cost,
        tax_rate: i.tax_rate,
      })),
    };
    const r = await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) return alert(j.error || "Create failed");
    resetForm();
    await loadList();
    window.print();
  }

  async function openToEdit(id: number) {
    const r = await fetch(`/api/purchases/${id}`);
    const j: PurchaseDetails = await r.json();
    if (!r.ok) return alert((j as any).error || "Fetch failed");
    const its = (j.items || []).map((x: any) => ({
      product_id: x.product_id,
      name: x.products?.name_ar || "Item",
      image_url: x.products?.image_url ?? null,
      qty: Number(x.qty || 0),
      unit_cost: Number(x.unit_cost || 0),
      tax_rate: Number(x.tax_rate || 0),
    }));
    setItems(its);
    setSupplier(j.purchase?.supplier_name || "");
    setEditingId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEdit() {
    if (!editingId) return;
    if (items.length === 0) return alert("لا توجد بنود");
    const payload = {
      supplier_name: supplier || null,
      items: items.map((i) => ({
        product_id: i.product_id,
        qty: i.qty,
        unit_cost: i.unit_cost,
        tax_rate: i.tax_rate,
      })),
    };
    const r = await fetch(`/api/purchases/${editingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) return alert(j.error || "Update failed");
    resetForm();
    await loadList();
    window.print();
  }

  async function deletePurchase(id: number) {
    if (!confirm("حذف الفاتورة؟")) return;
    const r = await fetch(`/api/purchases/${id}`, { method: "DELETE" });
    const j = await r.json();
    if (!r.ok) return alert(j.error || "Delete failed");
    if (editingId === id) resetForm();
    await loadList();
  }

  /** ---------- Expand row (details) ---------- */
  async function toggleExpand(id: number) {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
    if (!detailsCache[id]) {
      const r = await fetch(`/api/purchases/${id}`);
      const j: PurchaseDetails = await r.json();
      if (!r.ok) return alert((j as any).error || "Load details failed");
      setDetailsCache((c) => ({ ...c, [id]: j }));
    }
  }

  /** ---------- Excel: قالب + استيراد + تصدير ---------- */
  function downloadTemplate() {
    const rows = [
      { sku: "SKU-001", name_ar: "مثال منتج", qty: 2, unit_cost: 1.75, tax_rate: 0.16 },
    ];
    const ws = XLSX.utils.json_to_sheet(rows, {
      header: ["sku", "name_ar", "qty", "unit_cost", "tax_rate"],
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "items");
    const notes = XLSX.utils.aoa_to_sheet([
      ["القالب يدعم مطابقة المنتج عبر sku أولاً، وإن كان فارغًا نطابق على name_ar."],
      ["tax_rate مثال: 0.16 يعني 16%."],
      ["اترك name_ar فارغًا إذا تستخدم sku فقط."],
    ]);
    XLSX.utils.book_append_sheet(wb, notes, "notes");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "purchase_template.xlsx");
  }

  async function importFromExcel(file: File) {
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws);

      const imported: PItem[] = [];
      const warnings: string[] = [];

      for (const r of rows) {
        const sku = r.sku != null ? String(r.sku).trim() : "";
        const name = r.name_ar != null ? String(r.name_ar).trim() : "";
        const qty = Number(r.qty || 0);
        const unit_cost = Number(r.unit_cost || 0);
        const tax_rate = Number(r.tax_rate || 0);

        if (qty <= 0 || unit_cost < 0) {
          warnings.push(`سطر بقيم غير صالحة (qty/unit_cost).`);
          continue;
        }

        let p: Product | undefined;
        if (sku) p = products.find((x) => (x.sku || "").toLowerCase() === sku.toLowerCase());
        if (!p && name) p = products.find((x) => x.name_ar.trim() === name);

        if (!p) {
          warnings.push(`لم يتم العثور على منتج لـ sku='${sku}' / name_ar='${name}'.`);
          continue;
        }

        imported.push({
          product_id: p.id,
          name: p.name_ar,
          image_url: p.image_url ?? null,
          qty,
          unit_cost,
          tax_rate: Math.max(0, Math.min(1, tax_rate || (p.tax_rate ?? 0))),
        });
      }

      if (imported.length === 0) {
        alert("لم يتم استيراد أي صف. تحقّق من الأعمدة والقيم.");
        return;
      }

      setItems(imported);
      if (warnings.length) alert(`استيراد مع تحذيرات:\n- ${warnings.join("\n- ")}`);
    } catch (e: any) {
      alert(e.message || "فشل الاستيراد");
    }
  }

  function exportCurrentInvoice() {
    if (items.length === 0) {
      alert("لا توجد بنود لتصديرها");
      return;
    }
    const rows = items.map((i) => ({
      sku: products.find((p) => p.id === i.product_id)?.sku || "",
      name_ar: i.name,
      qty: i.qty,
      unit_cost: i.unit_cost,
      tax_rate: i.tax_rate,
      line_total: i.qty * i.unit_cost,
      line_tax: i.qty * i.unit_cost * (i.tax_rate || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "items");
    const totals = XLSX.utils.aoa_to_sheet([
      ["supplier_name", supplier || ""],
      ["sub_total", subTotal],
      ["tax_total", taxTotal],
      ["grand_total", grand],
      ["invoice_no_print", editingId ? list.find((x) => x.id === editingId)?.invoice_no ?? "" : `~${nextInvoiceNo}`],
    ]);
    XLSX.utils.book_append_sheet(wb, totals, "totals");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(
      new Blob([buf], { type: "application/octet-stream" }),
      `purchase_invoice_${editingId ?? "new"}.xlsx`
    );
  }

  function exportPurchasesList() {
    if (list.length === 0) {
      alert("لا توجد فواتير");
      return;
    }
    const rows = list.map((r) => ({
      id: r.id,
      invoice_no: r.invoice_no ?? "",
      supplier_name: r.supplier_name || "",
      created_at: new Date(r.created_at).toLocaleString(),
      items_count: r.items_count ?? "",
      sub_total: Number(r.sub_total || 0),
      tax_total: Number(r.tax_total || 0),
      grand_total: Number(r.grand_total || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "purchases");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), "purchases_list.xlsx");
  }

  function openImportPicker() {
    importRef.current?.click();
  }
  function printCurrent() {
    window.print();
  }

  /** ---------- UI ---------- */
  return (
    <div className="space-y-6">
      {/* فورم إنشاء/تعديل */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="h-title">
            {editingId
              ? `تعديل فاتورة شراء #${list.find((x) => x.id === editingId)?.invoice_no ?? editingId}`
              : `فاتورة شراء جديدة ${list.length ? `(رقم متوقع: ${nextInvoiceNo})` : ""}`}
          </h1>
          <div className="flex flex-wrap gap-2">
            <button className="btn" onClick={downloadTemplate}>
              تنزيل قالب Excel
            </button>
            <button className="btn" onClick={openImportPicker}>
              استيراد Excel
            </button>
            <input
              ref={importRef}
              hidden
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => e.target.files && importFromExcel(e.target.files[0])}
            />
            <button className="btn" onClick={exportCurrentInvoice}>
              تصدير الفاتورة
            </button>

            {editingId ? (
              <>
                <button className="btn" onClick={saveEdit}>
                  حفظ التعديلات & طباعة
                </button>
                <button className="btn" onClick={resetForm}>
                  إلغاء
                </button>
              </>
            ) : (
              <>
                <button className="btn" onClick={saveNew}>
                  حفظ & طباعة
                </button>
                <button className="btn" onClick={resetForm}>
                  تفريغ
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            className="input md:col-span-2"
            placeholder="اسم المورّد (اختياري)"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
          <button className="btn" onClick={printCurrent}>
            طباعة حالية
          </button>
        </div>

        {/* اختيار منتجات */}
        <div className="surface">
          <div className="flex items-center justify-between gap-3">
            <div className="font-medium">المنتجات</div>
            <input
              className="input w-72"
              placeholder="بحث عن منتج (SKU/اسم)..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 mt-3">
            {filtered.map((p) => (
              <button key={p.id} className="surface text-left" onClick={() => addProduct(p)}>
                <div className="h-28 w-full rounded-xl overflow-hidden bg-slate-100 border">
                  <img
                    src={p.image_url ?? "/favicon.ico"}
                    className="w-full h-full object-cover"
                    alt=""
                  />
                </div>
                <div className="mt-2 font-medium">{p.name_ar}</div>
                <div className="text-xs text-slate-500">{p.name_en}</div>
                <div className="mt-1 text-xs text-slate-500">SKU: {p.sku || "-"}</div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-slate-500">لا نتائج</div>
            )}
          </div>
        </div>

        {/* بنود الفاتورة */}
        <div className="surface overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left">صورة</th>
                <th className="p-2 text-left">الصنف</th>
                <th className="p-2 text-right">الكمية</th>
                <th className="p-2 text-right">الكلفة</th>
                <th className="p-2 text-right">الضريبة</th>
                <th className="p-2 text-right">إجمالي السطر</th>
                <th className="p-2 text-center">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">
                    <img
                      src={r.image_url ?? "/favicon.ico"}
                      className="w-12 h-12 rounded-lg object-cover border"
                      alt=""
                    />
                  </td>
                  <td className="p-2">{r.name}</td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      step="0.001"
                      className="input w-24 text-right"
                      value={r.qty}
                      onChange={(e) => setQty(i, Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      step="0.001"
                      className="input w-28 text-right"
                      value={r.unit_cost}
                      onChange={(e) => setCost(i, Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      className="input w-20 text-right"
                      value={r.tax_rate}
                      onChange={(e) => setTax(i, Number(e.target.value))}
                    />
                  </td>
                  <td className="p-2 text-right">
                    {(r.qty * r.unit_cost * (1 + (r.tax_rate || 0))).toFixed(3)}
                  </td>
                  <td className="p-2 text-center">
                    <button className="btn" onClick={() => remove(i)}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    لا بنود
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* الإجماليات */}
        <div className="surface">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-2">
              المجموع قبل الضريبة: <b>{subTotal.toFixed(3)}</b>
            </div>
            <div className="p-2">
              الضريبة: <b>{taxTotal.toFixed(3)}</b>
            </div>
            <div className="p-2">
              الإجمالي: <b>{grand.toFixed(3)}</b>
            </div>
          </div>
        </div>
      </div>

      {/* قائمة فواتير الشراء + تصدير القائمة + تفاصيل الفاتورة */}
      <div className="card">
        <div className="flex items-center justify-between">
          <h2 className="h-subtitle">فواتير الشراء</h2>
          <button className="btn" onClick={exportPurchasesList}>
            تصدير قائمة الفواتير
          </button>
        </div>

        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="p-2 text-left">#</th>
                <th className="p-2 text-left">رقم</th>
                <th className="p-2 text-left">المورّد</th>
                <th className="p-2 text-left">التاريخ</th>
                <th className="p-2 text-right">البنود</th>
                <th className="p-2 text-right">الإجمالي</th>
                <th className="p-2 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <React.Fragment key={r.id}>
                  <tr className="border-t">
                    <td className="p-2">{r.id}</td>
                    <td className="p-2">{r.invoice_no ?? "-"}</td>
                    <td className="p-2">{r.supplier_name || "-"}</td>
                    <td className="p-2">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="p-2 text-right">{r.items_count ?? "-"}</td>
                    <td className="p-2 text-right">{Number(r.grand_total || 0).toFixed(3)}</td>
                    <td className="p-2 text-center">
                      <div className="flex justify-center gap-2">
                        <button className="btn" onClick={() => toggleExpand(r.id)}>
                          {expanded[r.id] ? "إخفاء" : "تفاصيل"}
                        </button>
                        <button className="btn" onClick={() => openToEdit(r.id)}>
                          تعديل
                        </button>
                        <button className="btn" onClick={() => deletePurchase(r.id)}>
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expanded[r.id] && (
                    <tr className="border-b bg-slate-50/40">
                      <td colSpan={7} className="p-3">
                        {!detailsCache[r.id] ? (
                          <div className="opacity-60">تحميل التفاصيل…</div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">
                                تفاصيل الفاتورة #{detailsCache[r.id]?.purchase?.invoice_no ?? r.id}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  className="btn"
                                  onClick={() => {
                                    const det = detailsCache[r.id];
                                    if (!det) return;
                                    const rows = (det.items || []).map((x) => ({
                                      sku: x.products?.sku || "",
                                      name_ar: x.products?.name_ar || "",
                                      qty: x.qty,
                                      unit_cost: x.unit_cost,
                                      tax_rate: x.tax_rate,
                                      line_total: x.qty * x.unit_cost,
                                      line_tax: x.qty * x.unit_cost * (x.tax_rate || 0),
                                    }));
                                    const ws = XLSX.utils.json_to_sheet(rows);
                                    const wb = XLSX.utils.book_new();
                                    XLSX.utils.book_append_sheet(wb, ws, "items");
                                    const totals = XLSX.utils.aoa_to_sheet([
                                      ["supplier_name", det.purchase?.supplier_name || ""],
                                      ["sub_total", det.purchase?.sub_total ?? ""],
                                      ["tax_total", det.purchase?.tax_total ?? ""],
                                      ["grand_total", det.purchase?.grand_total ?? ""],
                                      ["invoice_no", det.purchase?.invoice_no ?? ""],
                                      ["date", new Date(det.purchase?.created_at || r.created_at).toLocaleString()],
                                    ]);
                                    XLSX.utils.book_append_sheet(wb, totals, "totals");
                                    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
                                    saveAs(
                                      new Blob([buf], { type: "application/octet-stream" }),
                                      `purchase_${det.purchase?.invoice_no ?? r.id}.xlsx`
                                    );
                                  }}
                                >
                                  تصدير الفاتورة
                                </button>
                                <button
                                  className="btn"
                                  onClick={() => {
                                    // تحميل البنود إلى النموذج (للطباعة السريعة)
                                    const det = detailsCache[r.id];
                                    if (!det) return;
                                    const its = (det.items || []).map((x) => ({
                                      product_id: x.product_id,
                                      name: x.products?.name_ar || "",
                                      image_url: x.products?.image_url ?? null,
                                      qty: Number(x.qty || 0),
                                      unit_cost: Number(x.unit_cost || 0),
                                      tax_rate: Number(x.tax_rate || 0),
                                    }));
                                    setItems(its);
                                    setSupplier(det.purchase?.supplier_name || "");
                                    setEditingId(null); // طباعة كعرض فقط
                                    window.scrollTo({ top: 0, behavior: "smooth" });
                                    setTimeout(() => window.print(), 200);
                                  }}
                                >
                                  طباعة
                                </button>
                              </div>
                            </div>

                            <div className="overflow-auto">
                              <table className="min-w-full text-xs">
                                <thead>
                                  <tr>
                                    <th className="p-1 text-left">الصنف</th>
                                    <th className="p-1 text-right">الكمية</th>
                                    <th className="p-1 text-right">الكلفة</th>
                                    <th className="p-1 text-right">الضريبة</th>
                                    <th className="p-1 text-right">الإجمالي</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detailsCache[r.id]?.items?.map((x, i) => (
                                    <tr key={i}>
                                      <td className="p-1">{x.products?.name_ar || "-"}</td>
                                      <td className="p-1 text-right">{x.qty}</td>
                                      <td className="p-1 text-right">{x.unit_cost.toFixed(3)}</td>
                                      <td className="p-1 text-right">
                                        {(x.qty * x.unit_cost * (x.tax_rate || 0)).toFixed(3)}
                                      </td>
                                      <td className="p-1 text-right">
                                        {(x.qty * x.unit_cost * (1 + (x.tax_rate || 0))).toFixed(3)}
                                      </td>
                                    </tr>
                                  ))}
                                  {(!detailsCache[r.id]?.items ||
                                    detailsCache[r.id]!.items.length === 0) && (
                                    <tr>
                                      <td className="p-2 opacity-60" colSpan={5}>
                                        لا بنود
                                      </td>
                                    </tr>
                                  )}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-500">
                    لا فواتير
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* إيصال الطباعة (مضغوط ومُرتّب) */}
      <div className="hidden print:block">
        <div style={{ width: "72mm", margin: "0 auto", fontSize: 12 }}>
          <div style={{ textAlign: "center", fontWeight: 700 }}>ElecPOS</div>
          <div style={{ textAlign: "center", color: "#666" }}>Purchase Invoice</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <div>
              Supplier: <b>{supplier || "-"}</b>
            </div>
            <div>{new Date().toLocaleString()}</div>
          </div>
          <div style={{ marginTop: 4 }}>
            رقم الفاتورة:{" "}
            <b>
              {editingId
                ? list.find((x) => x.id === editingId)?.invoice_no ?? editingId
                : `~${nextInvoiceNo}`}
            </b>
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr style={{ borderBottom: "1px dashed #999" }}>
                <th style={{ textAlign: "left" }}>الصنف</th>
                <th>كمية</th>
                <th>كلفة</th>
                <th style={{ textAlign: "right" }}>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c, i) => (
                <tr key={i}>
                  <td style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <img
                      src={c.image_url ?? "/favicon.ico"}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        objectFit: "cover",
                        border: "1px solid #ddd",
                      }}
                      alt=""
                    />
                    <div>{c.name}</div>
                  </td>
                  <td style={{ textAlign: "center" }}>{c.qty}</td>
                  <td style={{ textAlign: "center" }}>{c.unit_cost.toFixed(3)}</td>
                  <td style={{ textAlign: "right" }}>{(c.qty * c.unit_cost).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px dashed #999" }}>
                <td colSpan={3}>Subtotal</td>
                <td style={{ textAlign: "right" }}>{subTotal.toFixed(3)}</td>
              </tr>
              <tr>
                <td colSpan={3}>VAT</td>
                <td style={{ textAlign: "right" }}>{taxTotal.toFixed(3)}</td>
              </tr>
              <tr>
                <td colSpan={3} style={{ fontWeight: 700 }}>
                  Total
                </td>
                <td style={{ textAlign: "right", fontWeight: 700 }}>{grand.toFixed(3)}</td>
              </tr>
            </tfoot>
          </table>
          <div style={{ textAlign: "center", marginTop: 8 }}>شكراً لكم</div>
        </div>
      </div>
    </div>
  );
}
