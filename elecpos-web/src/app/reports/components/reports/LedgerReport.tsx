"use client";
import useSWR from "swr";
import { useState } from "react";
import ReportShell from "./ReportShell";
import { FiltersBar } from "./FiltersBar";
import TableLite from "./TableLite";
import { asDateISO } from "../../../../lib/utils";
import { exportExcel, exportPDF } from "./ExportButtons";


const fetcher = (url:string)=> fetch(url).then(r=>r.json());


export default function LedgerReport(){
const [from,setFrom] = useState(asDateISO());
const [to,setTo] = useState(asDateISO());
const { data } = useSWR(`/api/reports/ledger?from=${from}&to=${to}`, fetcher);
const rows = data?.rows ?? [];
const columns = [
{ key:'trx_date', label:'Date' },
{ key:'account_code', label:'Code' },
{ key:'account_name', label:'Account' },
{ key:'debit', label:'Debit', align:'right' as const },
{ key:'credit', label:'Credit', align:'right' as const },
{ key:'memo', label:'Memo' },
];
return (
<ReportShell
titleAr="دفتر الأستاذ"
titleEn="General Ledger"
filters={<FiltersBar from={from} to={to} setFrom={setFrom} setTo={setTo} />}
table={<TableLite columns={columns} rows={rows} />}
onExportExcel={()=>exportExcel('ledger', rows)}
onExportPDF={()=>exportPDF('Ledger', columns.map(c=>({header:c.label, dataKey:c.key})), rows)}
/>
);
}