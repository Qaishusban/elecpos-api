"use client";
import useSWR from "swr";
import { useState } from "react";
import ReportShell from "./ReportShell";
import { FiltersBar } from "./FiltersBar";
import TableLite from "./TableLite";
import { asDateISO } from "../../../../lib/utils";
import { exportExcel, exportPDF } from "./ExportButtons";


const fetcher = (url:string)=> fetch(url).then(r=>r.json());


export default function PurchasesReport(){
const [from,setFrom] = useState(asDateISO());
const [to,setTo] = useState(asDateISO());
const { data } = useSWR(`/api/reports/purchases?from=${from}&to=${to}` , fetcher);
const rows = data?.rows ?? [];
const columns = [
{ key:'bill_no', label:'Bill' },
{ key:'bill_date', label:'Date' },
{ key:'supplier', label:'Supplier' },
{ key:'subtotal', label:'Subtotal', align:'right' as const },
{ key:'tax', label:'Tax', align:'right' as const },
{ key:'total', label:'Total', align:'right' as const },
];
return (
<ReportShell
titleAr="فواتير الشراء"
titleEn="Purchase Invoices"
filters={<FiltersBar from={from} to={to} setFrom={setFrom} setTo={setTo} />}
table={<TableLite columns={columns} rows={rows} />}
onExportExcel={()=>exportExcel('purchases', rows)}
onExportPDF={()=>exportPDF('Purchases', columns.map(c=>({header:c.label, dataKey:c.key})), rows)}
/>
);
}