"use client";
import { T } from "../../../../lib/i18n";
import { asDateISO } from "../../../../lib/utils";
import { useLang } from "../../../../context/LangContext";


export function FiltersBar({
from, to, setFrom, setTo, extra
}: {
from: string; to: string; setFrom: (v:string)=>void; setTo:(v:string)=>void; extra?: React.ReactNode
}){
const { lang } = useLang();
const L = T[lang];
return (
<div className="grid md:grid-cols-4 gap-3">
<label className="flex flex-col text-sm">
<span className="mb-1">{L.from}</span>
<input type="date" className="border rounded px-3 py-2" value={from} onChange={e=>setFrom(e.target.value)} />
</label>
<label className="flex flex-col text-sm">
<span className="mb-1">{L.to}</span>
<input type="date" className="border rounded px-3 py-2" value={to} onChange={e=>setTo(e.target.value)} />
</label>
{extra}
</div>
);
}