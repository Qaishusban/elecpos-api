"use client";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


export function exportExcel(filename: string, rows: any[]) {
const ws = XLSX.utils.json_to_sheet(rows);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Data");
XLSX.writeFile(wb, `${filename}.xlsx`);
}


export function exportPDF(title: string, columns: {header:string, dataKey:string}[], rows: any[]) {
const doc = new jsPDF();
doc.text(title, 14, 12);
(autoTable as any)(doc, { columns, body: rows, startY: 20 });
doc.save(title.replace(/\s+/g,'_')+".pdf");
}