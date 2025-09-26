"use client";
import useSWR from "swr";
import { useState } from "react";
import ReportShell from "./ReportShell";
import { FiltersBar } from "./FiltersBar";
import TableLite from "./TableLite";
import { asDateISO } from "../../../../lib/utils";
import { exportExcel, exportPDF } from "./ExportButtons";


const fetcher = (url:string)=> fetch(url).then(r=>r.json());


export default function SalesReport(){
const [from,setFrom] = useState(asDateISO());
const [to,setTo] = useState(asDateISO());
const { data } = useSWR(`/api/reports/sales?from=${from}&to=${to}` , fetcher);
const rows = data?.rows ?? [];
const columns = [
{ key:'inv_no', label:'Invoice' },
{ key:'inv_date', label:'Date' },
{ key:'customer', label:'Customer' },
{ key:'subtotal', label:'Subtotal', align:'right' as const },
{ key:'tax', label:'Tax', align:'right' as const },
{ key:'total', label:'Total', align:'right' as const },
];
return (
<ReportShell
titleAr="فواتير البيع"
titleEn="Sales Invoices"
filters={<FiltersBar from={from} to={to} setFrom={setFrom} setTo={setTo} />}
table={<TableLite columns={columns} rows={rows} />}
onExportExcel={()=>exportExcel('sales', rows)}
onExportPDF={()=>exportPDF('Sales', columns.map(c=>({header:c.label, dataKey:c.key})), rows)}
/>
);
}