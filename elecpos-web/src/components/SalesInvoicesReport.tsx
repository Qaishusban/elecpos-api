"use client";

import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type DetailRow = {
  inv_id: number;
  inv_date: string;
  sku: string;
  name_ar: string;
  qty: number;
  unit_price: number;
  tax: number;
  line_total: number;
};

export default function SalesInvoicesReport({
  rows,
  meta,
  detailsDefault,
}: {
  rows: DetailRow[];
  meta: { from: string; to: string };
  detailsDefault: boolean;
}) {
  const [showDetails, setShowDetails] = useState(detailsDefault);

  // تجميع سطور الأصناف إلى فواتير
  const summary = useMemo(() => {
    const map = new Map<number, { inv_id: number; inv_date: string; subtotal: number; tax: number; total: number; lines: number }>();
    for (const r of rows) {
      const price = Number(r.unit_price || 0);
      const qty   = Number(r.qty || 0);
      const tax   = Number(r.tax || 0);
      const lineSubtotal = qty * price;
      const lineTax      = tax;
      const lineTotal    = lineSubtotal + lineTax;

      const ex = map.get(r.inv_id);
      if (!ex) {
        map.set(r.inv_id, {
          inv_id: r.inv_id,
          inv_date: r.inv_date,
          subtotal: lineSubtotal,
          tax: lineTax,
          total: lineTotal,
          lines: 1,
        });
      } else {
        ex.subtotal += lineSubtotal;
        ex.tax      += lineTax;
        ex.total    += lineTotal;
        ex.lines    += 1;
      }
    }
    const arr = Array.from(map.values()).sort((a,b) =>
      a.inv_date.localeCompare(b.inv_date) || a.inv_id - b.inv_id
    );
    const totals = arr.reduce(
      (acc, r) => {
        acc.subtotal += r.subtotal;
        acc.tax      += r.tax;
        acc.total    += r.total;
        acc.invoices += 1;
        return acc;
      },
      { subtotal: 0, tax: 0, total: 0, invoices: 0 }
    );
    return { invoices: arr, totals };
  }, [rows]);

  // ========== Excel ==========
  function exportExcel() {
    if (showDetails) {
      const data = rows.map((r) => ({
        "Inv ID": r.inv_id,
        "Date": r.inv_date,
        "SKU": r.sku,
        "Name": r.name_ar,
        "Qty": Number(r.qty || 0),
        "Unit Price": Number(r.unit_price || 0),
        "Tax": Number(r.tax || 0),
        "Line Total": Number(r.line_total || 0),
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "sales_details");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      downloadBlob(new Blob([buf], { type: "application/octet-stream" }), fileName("xlsx"));
    } else {
      const data = summary.invoices.map((r) => ({
        "Inv ID": r.inv_id,
        "Date": r.inv_date,
        "Subtotal": r.subtotal,
        "Tax": r.tax,
        "Total": r.total,
        "Lines": r.lines,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "sales_summary");
      const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
      downloadBlob(new Blob([buf], { type: "application/octet-stream" }), fileName("xlsx"));
    }
  }

  // ========== PDF ==========
  function exportPDF() {
    const doc = new jsPDF({ orientation: showDetails ? "landscape" : "portrait" });
    const title = `Sales Invoices (${meta.from} → ${meta.to}) ${showDetails ? "- Details" : "- Summary"}`;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, 14, 16);

    if (showDetails) {
      autoTable(doc, {
        startY: 22,
        head: [["Inv ID", "Date", "SKU", "Name", "Qty", "Unit Price", "Tax", "Line Total"]],
        body: rows.map((r) => [
          r.inv_id,
          r.inv_date,
          r.sku,
          r.name_ar,
          Number(r.qty || 0).toLocaleString(),
          Number(r.unit_price || 0).toLocaleString(),
          Number(r.tax || 0).toLocaleString(),
          Number(r.line_total || 0).toLocaleString(),
        ]),
        styles: { font: "Helvetica", fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
        columnStyles: { 4: { halign: "right" }, 5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right" } },
      });
    } else {
      autoTable(doc, {
        startY: 22,
        head: [["Inv ID", "Date", "Subtotal", "Tax", "Total", "Lines"]],
        body: summary.invoices.map((r) => [
          r.inv_id,
          r.inv_date,
          r.subtotal.toLocaleString(),
          r.tax.toLocaleString(),
          r.total.toLocaleString(),
          r.lines,
        ]),
        styles: { font: "Helvetica", fontSize: 10 },
        headStyles: { fillColor: [240, 240, 240] },
        columnStyles: { 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" } },
      });

      const y = (doc as any).lastAutoTable.finalY + 6;
      doc.setFontSize(11);
      doc.setFont("Helvetica", "bold");
      doc.text(`Invoices: ${summary.totals.invoices}`, 14, y);
      doc.text(`Subtotal: ${summary.totals.subtotal.toLocaleString()}`, 70, y);
      doc.text(`Tax: ${summary.totals.tax.toLocaleString()}`, 140, y);
      doc.text(`Total: ${summary.totals.total.toLocaleString()}`, 200, y);
    }

    doc.save(fileName("pdf"));
  }

  function downloadBlob(blob: Blob, name: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function fileName(ext: string) {
    return `sales_${meta.from}_${meta.to}_${showDetails ? "details" : "summary"}.${ext}`;
  }

  // ========== UI ==========
  return (
    <div className="rounded-2xl border p-3 bg-white overflow-auto space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showDetails}
            onChange={(e) => setShowDetails(e.target.checked)}
          />
          <span>عرض التفاصيل</span>
        </label>

        <div className="ml-auto flex gap-2">
          <button className="px-3 py-2 border rounded-2xl" onClick={exportExcel}>
            تصدير Excel
          </button>
          <button className="px-3 py-2 border rounded-2xl" onClick={exportPDF}>
            تصدير PDF
          </button>
        </div>
      </div>

      {showDetails ? (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left">رقم</th>
              <th className="px-3 py-2 text-left">التاريخ</th>
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-left">الاسم</th>
              <th className="px-3 py-2 text-right">الكمية</th>
              <th className="px-3 py-2 text-right">سعر مفرد</th>
              <th className="px-3 py-2 text-right">ضريبة</th>
              <th className="px-3 py-2 text-right">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-gray-500 p-4">لا توجد بيانات</td></tr>
            ) : (
              rows.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2">{r.inv_id}</td>
                  <td className="px-3 py-2">{r.inv_date}</td>
                  <td className="px-3 py-2">{r.sku}</td>
                  <td className="px-3 py-2">{r.name_ar}</td>
                  <td className="px-3 py-2 text-right">{Number(r.qty || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(r.unit_price || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(r.tax || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{Number(r.line_total || 0).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      ) : (
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left">رقم</th>
              <th className="px-3 py-2 text-left">التاريخ</th>
              <th className="px-3 py-2 text-right">الإجمالي قبل الضريبة</th>
              <th className="px-3 py-2 text-right">الضريبة</th>
              <th className="px-3 py-2 text-right">الإجمالي</th>
              <th className="px-3 py-2 text-right">عدد السطور</th>
            </tr>
          </thead>
          <tbody>
            {summary.invoices.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-gray-500 p-4">لا توجد بيانات</td></tr>
            ) : (
              summary.invoices.map((r) => (
                <tr key={r.inv_id} className="border-t">
                  <td className="px-3 py-2">{r.inv_id}</td>
                  <td className="px-3 py-2">{r.inv_date}</td>
                  <td className="px-3 py-2 text-right">{r.subtotal.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{r.tax.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{r.total.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{r.lines}</td>
                </tr>
              ))
            )}
            {summary.invoices.length > 0 && (
              <tr className="border-t bg-slate-50 font-semibold">
                <td className="px-3 py-2" colSpan={2}>الإجمالي</td>
                <td className="px-3 py-2 text-right">{summary.totals.subtotal.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{summary.totals.tax.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{summary.totals.total.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{summary.totals.invoices}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
