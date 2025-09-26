"use client";
import { useRef, useState } from "react";


export default function BackupButton(){
const fileRef = useRef<HTMLInputElement>(null);
const [busy, setBusy] = useState(false);


async function doBackup(){
setBusy(true);
const res = await fetch('/api/backup/export');
const json = await res.json();
const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = `elecpos-backup-${new Date().toISOString().slice(0,10)}.json`;
a.click();
setBusy(false);
}


async function onChoose(e: React.ChangeEvent<HTMLInputElement>){
const file = e.target.files?.[0];
if(!file) return;
setBusy(true);
const text = await file.text();
const payload = JSON.parse(text);
const res = await fetch('/api/backup/import', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)});
const j = await res.json();
alert(j?.message || 'Imported');
setBusy(false);
}


return (
<div className="flex gap-2">
<button onClick={doBackup} disabled={busy} className="px-3 py-2 rounded-2xl shadow border">{busy? '...' : 'Backup'}</button>
<button onClick={()=>fileRef.current?.click()} disabled={busy} className="px-3 py-2 rounded-2xl shadow border">Restore</button>
<input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={onChoose} />
</div>
);
}