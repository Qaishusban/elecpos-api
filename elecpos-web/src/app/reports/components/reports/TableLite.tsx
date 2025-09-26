"use client";
import { fmt } from "../../../../lib/utils";


export default function TableLite({
columns,
rows,
}: {
columns: { key: string; label: string; align?: "left"|"right"|"center" }[];
rows: any[];
}){
return (
<table className="min-w-full text-sm">
<thead>
<tr className="bg-gray-50">
{columns.map(c=> (
<th key={c.key} className={`px-3 py-2 font-semibold ${c.align==='right'?'text-right':c.align==='center'?'text-center':'text-left'}`}>{c.label}</th>
))}
</tr>
</thead>
<tbody>
{(!rows || rows.length===0) && (
<tr><td className="px-3 py-3 text-center text-gray-500" colSpan={columns.length}>No data</td></tr>
)}
{rows?.map((r,i)=> (
<tr key={i} className="border-t">
{columns.map(c=> (
<td key={c.key} className={`px-3 py-2 ${c.align==='right'?'text-right':c.align==='center'?'text-center':'text-left'}`}>
{typeof r[c.key] === 'number' ? fmt(r[c.key]) : String(r[c.key] ?? '')}
</td>
))}
</tr>
))}
</tbody>
</table>
);
}