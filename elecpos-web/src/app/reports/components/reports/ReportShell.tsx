"use client";
import { ReactNode, useState } from "react";
import { useLang } from "../../../../context/LangContext"; // لديك مسبقًا
import { T } from "../../../../lib/i18n";
import { asDateISO } from "../../../../lib/utils";


export default function ReportShell({
titleAr,
titleEn,
filters,
table,
onExportExcel,
onExportPDF,
}: {
titleAr: string;
titleEn: string;
filters: ReactNode;
table: ReactNode;
onExportExcel?: () => void;
onExportPDF?: () => void;
}) {
const { lang } = useLang();
const L = T[lang];
return (
<div className="space-y-4">
<div className="flex items-center justify-between">
<h1 className="text-2xl font-bold">
{lang === "ar" ? titleAr : titleEn}
</h1>
<div className="flex gap-2">
{onExportExcel && (
<button onClick={onExportExcel} className="px-3 py-2 rounded-2xl shadow border">
{L.exportExcel}
</button>
)}
{onExportPDF && (
<button onClick={onExportPDF} className="px-3 py-2 rounded-2xl shadow border">
{L.exportPDF}
</button>
)}
</div>
</div>
<div className="rounded-2xl border p-3 bg-white">{filters}</div>
<div className="rounded-2xl border p-3 bg-white overflow-auto">{table}</div>
</div>
);
}