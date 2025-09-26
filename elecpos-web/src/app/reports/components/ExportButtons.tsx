"use client";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type Props = { data: any[]; filename: string; lang: "ar" | "en" };

export default function ExportButtons({ data, filename, lang }: Props) {
  if (!data || data.length === 0) return null;

  function exportExcel() {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }

  function exportPDF() {
    const doc = new jsPDF(lang === "ar" ? { orientation: "l" } : undefined);
    const headers = Object.keys(data[0] ?? {});
    const rows = data.map((r) => headers.map((h) => r[h]));

    autoTable(doc, {
      head: [headers],
      body: rows,
      styles: { font: "helvetica", fontSize: 9 },
      margin: { top: 10 },
      theme: "grid",
    });
    doc.save(`${filename}.pdf`);
  }

  return (
    <div className="flex gap-2">
      <button className="btn" onClick={exportExcel}>
        {lang === "ar" ? "تصدير Excel" : "Export Excel"}
      </button>
      <button className="btn" onClick={exportPDF}>
        {lang === "ar" ? "تصدير PDF" : "Export PDF"}
      </button>
    </div>
  );
}
