"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";
import React, { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Row = {
  trx_date: string;  // "YYYY-MM-DD"
  sku: string;
  name_ar: string;
  direction: "in" | "out";
  qty: number;
  note?: string | null;
};

type ProductOpt = { sku: string; name: string };

export default function ItemMovementTable({
  rows,
  meta,
}: {
  rows: Row[];
  meta: { from: string; to: string };
}) {
  const sb = supabaseBrowser();

  // ====== Multi-select للمنتجات ======
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<ProductOpt[]>([]);
  const [selected, setSelected] = useState<ProductOpt[]>([]);

  // بحث ديناميكي عن منتجات
  useEffect(() => {
    let alive = true;
    (async () => {
      const q = query.trim();
      if (!q) { setOptions([]); return; }
      // ابحث بالـ sku أو الاسم
      const { data, error } = await sb
        .from("products")
        .select("sku,name_ar")
        .or(`sku.ilike.%${q}%,name_ar.ilike.%${q}%`)
        .order("name_ar")
        .limit(20);
      if (!alive) return;
      if (error) { setOptions([]); return; }
      setOptions((data ?? []).map(d => ({ sku: d.sku ?? "", name: d.name_ar })));
    })();
    return () => { alive = false; };
  }, [query]); // eslint-disable-line

  const addOpt = (o: ProductOpt) => {
    if (!o.sku) return;
    if (selected.find(s => s.sku === o.sku)) return;
    setSelected(prev => [...prev, o]);
    setQuery("");
    setOptions([]);
  };
  const removeOpt = (sku: string) => setSelected(prev => prev.filter(s => s.sku !== sku));

  // طبّق الفلترة حسب المِلتي سيليكت (إن لم يُحدد شيء نعرض الكل)
  const filteredRows = useMemo(() => {
    if (!selected.length) return rows;
    const skus = new Set(selected.map(s => s.sku));
    return rows.filter(r => skus.has(r.sku));
  }, [rows, selected]);

  // ====== تجهيز الكميات الموقعة + المجاميع + الرصيد التراكمي ======
  const { signedRows, totalIn, totalOut, balance } = useMemo(() => {
    let running = 0;
    let tin = 0;
    let tout = 0;

    const signed = filteredRows.map((r) => {
      const qty = Number(r.qty || 0);
      const signedQty = r.direction === "in" ? +qty : -qty;
      if (signedQty >= 0) tin += signedQty; else tout += Math.abs(signedQty);
      running += signedQty;
      return { ...r, signedQty, running };
    });

    return { signedRows: signed, totalIn: tin, totalOut: tout, balance: tin - tout };
  }, [filteredRows]);

  // ====== Export: Excel ======
  function exportExcel() {
    const data = signedRows.map((r) => ({
      Date: r.trx_date,
      SKU: r.sku,
      Name: r.name_ar,
      Direction: r.direction === "in" ? "IN" : "OUT",
      "Signed Qty": r.signedQty,
      "Running Balance": r.running,
      Note: r.note || "",
    }));

    data.push({
      Date: "",
      SKU: "",
      Name: "",
      Direction: "TOTAL",
      "Signed Qty": balance,
      "Running Balance": "",
      Note: `IN: ${totalIn} | OUT: ${totalOut} | BAL: ${balance}`,
    } as any);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "movement");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([buf], { type: "application/octet-stream" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = buildFileName("xlsx");
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ====== Export: PDF (labels EN لسلامة الخط الافتراضي) ======
  function exportPDF() {
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      const title = `Item Movement  (${meta.from} → ${meta.to})${selected.length ? `  |  SKUs: ${selected.map(s=>s.sku).join(", ")}` : ""}`;
      doc.setFont("Helvetica", "bold");
      doc.setFontSize(14);
      doc.text(title, 14, 16);

      // @ts-ignore autotable موجودة من الحزمة
      doc.autoTable({
        startY: 22,
        head: [["Date", "SKU", "Name", "Direction", "Signed Qty", "Running Balance", "Note"]],
        body: signedRows.map((r) => [
          r.trx_date,
          r.sku,
          r.name_ar,
          r.direction === "in" ? "IN" : "OUT",
          r.signedQty.toLocaleString(),
          r.running.toLocaleString(),
          r.note || "",
        ]),
        styles: { font: "Helvetica", fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
        columnStyles: { 4: { halign: "right" }, 5: { halign: "right" } },
      });

      // Footer totals
      const y = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text(`IN: ${totalIn.toLocaleString()}`, 14, y);
      doc.text(`OUT: ${totalOut.toLocaleString()}`, 70, y);
      doc.text(`BAL: ${balance.toLocaleString()}`, 130, y);

      doc.save(buildFileName("pdf"));
    } catch (e: any) {
      alert(`PDF export failed: ${e?.message || e}`);
    }
  }

  function buildFileName(ext: string) {
    const part = selected.length ? `_sku-${selected.map(s=>s.sku).join("-")}` : "";
    return `movement_${meta.from}_${meta.to}${part}.${ext}`;
  }

  return (
    <div className="rounded-2xl border p-3 bg-white overflow-auto space-y-4">

      {/* شريط اختيار المنتجات بالبحث (multi-select) */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث SKU أو اسم وأضِف"
              className="border rounded-2xl px-3 py-2 w-72"
            />
            {!!options.length && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-xl max-h-64 overflow-auto shadow">
                {options.map((o) => (
                  <button
                    key={o.sku}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-50"
                    onClick={() => addOpt(o)}
                  >
                    <b className="mr-2">{o.sku}</b> {o.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* التوكِنز المختارة */}
          {selected.map((s) => (
            <span key={s.sku} className="px-2 py-1 rounded-xl border bg-slate-50">
              {s.sku}
              <button
                type="button"
                onClick={() => removeOpt(s.sku)}
                className="ml-2 text-red-600"
                aria-label="remove"
              >
                ×
              </button>
            </span>
          ))}

          <div className="ml-auto flex gap-2">
            <button className="px-3 py-2 border rounded-2xl" onClick={exportExcel}>
              تصدير Excel
            </button>
            <button className="px-3 py-2 border rounded-2xl" onClick={exportPDF}>
              تصدير PDF
            </button>
          </div>
        </div>

        {/* ملخص المجاميع */}
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded-xl border bg-green-50">
            مجموع الإدخال: <b>{totalIn.toLocaleString()}</b>
          </span>
          <span className="px-3 py-1 rounded-xl border bg-red-50">
            مجموع الإخراج: <b>{totalOut.toLocaleString()}</b>
          </span>
          <span className="px-3 py-1 rounded-xl border bg-slate-50">
            الرصيد: <b>{balance.toLocaleString()}</b>
          </span>
        </div>
      </div>

      {/* الجدول */}
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left">التاريخ</th>
            <th className="px-3 py-2 text-left">SKU</th>
            <th className="px-3 py-2 text-left">الاسم</th>
            <th className="px-3 py-2 text-left">الاتجاه</th>
            <th className="px-3 py-2 text-right">الكمية (موقعة)</th>
            <th className="px-3 py-2 text-right">الرصيد التراكمي</th>
            <th className="px-3 py-2 text-left">ملاحظة</th>
          </tr>
        </thead>
        <tbody>
          {signedRows.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center text-gray-500 p-4">
                لا توجد بيانات
              </td>
            </tr>
          ) : (
            signedRows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2">{r.trx_date}</td>
                <td className="px-3 py-2">{r.sku}</td>
                <td className="px-3 py-2">{r.name_ar}</td>
                <td className="px-3 py-2">{r.direction === "in" ? "دخول" : "خروج"}</td>
                <td className="px-3 py-2 text-right">{r.signedQty.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{r.running.toLocaleString()}</td>
                <td className="px-3 py-2">{r.note || ""}</td>
              </tr>
            ))
          )}
          {signedRows.length > 0 && (
            <tr className="border-t bg-slate-50 font-semibold">
              <td className="px-3 py-2" colSpan={4}>الإجمالي</td>
              <td className="px-3 py-2 text-right">{balance.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">—</td>
              <td className="px-3 py-2">
                مجموع دخول: {totalIn.toLocaleString()} | مجموع خروج: {totalOut.toLocaleString()}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
