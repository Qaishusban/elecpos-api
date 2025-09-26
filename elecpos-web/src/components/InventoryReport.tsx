"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Row = {
  sku: string;
  name_ar: string;
  cost_price: number;
  qty: number;
  stock_value: number;
};

export default function InventoryReport({
  rows,
  meta,
}: {
  rows: Row[];
  meta: { asof: string };
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter(
      (r) =>
        (r.sku || "").toLowerCase().includes(t) ||
        (r.name_ar || "").toLowerCase().includes(t)
    );
  }, [rows, q]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        acc.qty += Number(r.qty || 0);
        acc.value += Number(r.stock_value || 0);
        return acc;
      },
      { qty: 0, value: 0 }
    );
  }, [filtered]);

  function exportExcel() {
    const data = filtered.map((r) => ({
      SKU: r.sku,
      Name: r.name_ar,
      "Cost Price": Number(r.cost_price || 0),
      Qty: Number(r.qty || 0),
      "Stock Value": Number(r.stock_value || 0),
    }));
    data.push({
      SKU: "",
      Name: "TOTAL",
      "Cost Price": "",
      Qty: totals.qty,
      "Stock Value": totals.value,
    } as any);

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "inventory");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    download(new Blob([buf], { type: "application/octet-stream" }), fileName("xlsx"));
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text(`Inventory as of ${meta.asof}`, 14, 16);

    autoTable(doc, {
      startY: 22,
      head: [["SKU", "Name", "Cost Price", "Qty", "Stock Value"]],
      body: filtered.map((r) => [
        r.sku,
        r.name_ar,
        Number(r.cost_price || 0).toLocaleString(),
        Number(r.qty || 0).toLocaleString(),
        Number(r.stock_value || 0).toLocaleString(),
      ]),
      styles: { font: "Helvetica", fontSize: 10 },
      headStyles: { fillColor: [240, 240, 240] },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
    });

    const y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(11);
    doc.text(`TOTAL Qty: ${totals.qty.toLocaleString()}`, 14, y);
    doc.text(`TOTAL Value: ${totals.value.toLocaleString()}`, 90, y);

    doc.save(fileName("pdf"));
  }

  function download(blob: Blob, name: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  function fileName(ext: string) {
    return `inventory_${meta.asof}.${ext}`;
  }

  return (
    <div className="rounded-2xl border p-3 bg-white overflow-auto space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="border rounded-2xl px-3 py-2 w-72"
          placeholder="بحث SKU/اسم"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="ml-auto flex gap-2">
          <button className="px-3 py-2 border rounded-2xl" onClick={exportExcel}>
            تصدير Excel
          </button>
          <button className="px-3 py-2 border rounded-2xl" onClick={exportPDF}>
            تصدير PDF
          </button>
        </div>
      </div>

      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-3 py-2 text-left">SKU</th>
            <th className="px-3 py-2 text-left">الاسم</th>
            <th className="px-3 py-2 text-right">الكلفة</th>
            <th className="px-3 py-2 text-right">الكمية</th>
            <th className="px-3 py-2 text-right">قيمة المخزون</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr><td colSpan={5} className="text-center text-gray-500 p-4">لا توجد بيانات</td></tr>
          ) : (
            filtered.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-2">{r.sku}</td>
                <td className="px-3 py-2">{r.name_ar}</td>
                <td className="px-3 py-2 text-right">{Number(r.cost_price || 0).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{Number(r.qty || 0).toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{Number(r.stock_value || 0).toLocaleString()}</td>
              </tr>
            ))
          )}
          {filtered.length > 0 && (
            <tr className="border-t bg-slate-50 font-semibold">
              <td className="px-3 py-2" colSpan={3}>الإجمالي</td>
              <td className="px-3 py-2 text-right">{totals.qty.toLocaleString()}</td>
              <td className="px-3 py-2 text-right">{totals.value.toLocaleString()}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
