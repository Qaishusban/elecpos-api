"use client";
import useSWR from "swr";
import { useState } from "react";
import ReportShell from "./ReportShell";
import { FiltersBar } from "./FiltersBar";
import TableLite from "./TableLite";
import { asDateISO } from "../../../../lib/utils";
import { exportExcel, exportPDF } from "./ExportButtons";


const fetcher = (url:string)=> fetch(url).then(r=>r.json());


export default function MovementReport(){
const [from,setFrom] = useState(asDateISO());
const [to,setTo] = useState(asDateISO());
const [sku,setSku] = useState("");
const { data } = useSWR(`/api/reports/movement?from=${from}&to=${to}&sku=${encodeURIComponent(sku)}`, fetcher);
const rows = data?.rows ?? [];
const columns = [
{ key:'trx_date', label:'Date' },
{ key:'sku', label:'SKU' },
{ key:'name_ar', label:'الاسم' },
{ key:'direction', label:'Dir' },
{ key:'qty', label:'Qty', align:'right' as const },
{ key:'note', label:'Note' },
];
return (
<ReportShell
titleAr="حركة مادة"
titleEn="Item Movement"
filters={
<FiltersBar from={from} to={to} setFrom={setFrom} setTo={setTo} extra={
<label className="flex flex-col text-sm">
<span className="mb-1">SKU</span>
<input value={sku} onChange={e=>setSku(e.target.value)} className="border rounded px-3 py-2" placeholder="SKU or name" />
</label>
} />
}
table={<TableLite columns={columns} rows={rows} />}
onExportExcel={()=>exportExcel('movement', rows)}
onExportPDF={()=>exportPDF('Movement', columns.map(c=>({header:c.label, dataKey:c.key})), rows)}
/>
);
}