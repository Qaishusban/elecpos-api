"use client";
import useSWR from "swr";
import { useState } from "react";
import ReportShell from "./ReportShell";
import { FiltersBar } from "./FiltersBar";
import TableLite from "./TableLite";
import { asDateISO } from "../../../../lib/utils";
import { exportExcel, exportPDF } from "./ExportButtons";


const fetcher = (url:string)=> fetch(url).then(r=>r.json());


export default function CashReport(){
const [from,setFrom] = useState(asDateISO());
const [to,setTo] = useState(asDateISO());
const { data } = useSWR(`/api/reports/cash?from=${from}&to=${to}`, fetcher);
const rows = data?.rows ?? [];
const columns = [
{ key:'trx_date', label:'Date' },
{ key:'ref_no', label:'Ref' },
{ key:'description', label:'Description' },
{ key:'in_amount', label:'In', align:'right' as const },
{ key:'out_amount', label:'Out', align:'right' as const },
{ key:'balance', label:'Balance', align:'right' as const },
];
return (
<ReportShell
titleAr="حركة الصندوق"
titleEn="Cash Movement"
filters={<FiltersBar from={from} to={to} setFrom={setFrom} setTo={setTo} />}
table={<TableLite columns={columns} rows={rows} />}
onExportExcel={()=>exportExcel('cash', rows)}
onExportPDF={()=>exportPDF('Cash Movement', columns.map(c=>({header:c.label, dataKey:c.key})), rows)}
/>
);
}