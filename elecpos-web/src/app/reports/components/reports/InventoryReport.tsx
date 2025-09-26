"use client";

import useSWR from "swr";
import { useMemo } from "react";

// جدول بسيط
function TableLite({
  columns,
  rows,
}: {
  columns: { key: string; label: string; align?: "left" | "right" | "center" }[];
  rows: any[];
}) {
  return (
    <table className="min-w-full text-sm">
      <thead>
        <tr className="bg-gray-50">
          {columns.map((c) => (
            <th
              key={c.key}
              className={`px-3 py-2 font-semibold ${
                c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
              }`}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {!rows?.length ? (
          <tr>
            <td className="px-3 py-3 text-center text-gray-500" colSpan={columns.length}>
              No data
            </td>
          </tr>
        ) : (
          rows.map((r: any, i: number) => (
            <tr key={i} className="border-t">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 ${
                    c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {typeof r[c.key] === "number"
                    ? formatNumber(r[c.key])
                    : String(r[c.key] ?? "")}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

const fetcher = async (url: string) => {
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error || "Request failed");
  return j;
};

function formatNumber(n: number) {
  const v = Math.round(Math.abs(n));
  const s = v.toLocaleString();
  return n < 0 ? `(${s})` : s;
}

export default function InventoryReport() {
  const { data, error } = useSWR("/api/reports/inventory", fetcher, { revalidateOnFocus: false });
  if (error) return <div className="text-red-600">API Error: {String(error.message)}</div>;

  // لو الـ View رجّعت أسماء مختلفة، نطبّعها هنا
  const rows = useMemo(() => {
    const arr = data?.rows ?? [];
    return arr.map((r: any) => ({
      sku: r.sku ?? r.SKU ?? "",
      name_ar: r.name_ar ?? r.product_name_ar ?? r.name ?? "",
      name_en: r.name_en ?? r.product_name_en ?? "",
      on_hand: Number(r.on_hand ?? r.qty_on_hand ?? 0),
    }));
  }, [data]);

  const columns = [
    { key: "sku", label: "SKU" },
    { key: "name_ar", label: "الاسم" },
    { key: "name_en", label: "Name EN" },
    { key: "on_hand", label: "On Hand", align: "right" as const },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">تقرير الجرد / Inventory</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportExcel("inventory", rows)}
            className="px-3 py-2 rounded-2xl shadow border"
          >
            Export Excel
          </button>
          <button
            onClick={() =>
              exportPDF(
                "Inventory",
                columns.map((c) => ({ header: c.label, dataKey: c.key })),
                rows
              )
            }
            className="px-3 py-2 rounded-2xl shadow border"
          >
            Export PDF
          </button>
        </div>
      </div>

      <div className="rounded-2xl border p-3 bg-white overflow-auto">
        <TableLite columns={columns} rows={rows} />
      </div>
    </div>
  );
}

/** أدوات التصدير */
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function exportExcel(filename: string, rows: any[]) {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function exportPDF(title: string, columns: { header: string; dataKey: string }[], rows: any[]) {
  const doc = new jsPDF();
  doc.text(title, 14, 12);
  (autoTable as any)(doc, { columns, body: rows, startY: 20 });
  doc.save(title.replace(/\s+/g, "_") + ".pdf");
}
