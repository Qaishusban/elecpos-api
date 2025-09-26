// مثال: src/app/admin/page.tsx
"use client";
import React, { useState } from "react";
import RestoreButton from "../../../components/RestoreButton";
export default function AdminPage() {
  const [busy, setBusy] = useState(false);

  async function backupNow(opts?: { files?: boolean; signed?: boolean }) {
    try {
      setBusy(true);
      const params = new URLSearchParams();
      if (opts?.files) params.set("files", "1");
      if (opts?.signed) params.set("signed", "1");

      const r = await fetch(`/api/backup?${params.toString()}`, { method: "GET" });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        alert(j.error || "Backup failed");
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `elecpos-backup-${new Date().toISOString().slice(0,10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h1 className="h-title">لوحة الإدارة</h1>
      <div className="flex flex-wrap gap-2">
        <button className="btn" disabled={busy} onClick={() => backupNow()}>
          {busy ? "جاري إنشاء النسخة..." : "نسخة احتياطية (سريعة)"}
        </button>
        <button className="btn" disabled={busy} onClick={() => backupNow({ signed: true })}>
          {busy ? "..." : "نسخة + روابط صور مؤقتة"}
        </button>
        <button className="btn" disabled={busy} onClick={() => backupNow({ files: true })}>
          {busy ? "..." : "نسخة مع الصور (قد يكون كبير)"}
          className="surface flex flex-col sm:flex-row gap-3"
        <RestoreButton />
   
        </button>
      </div>
    </div>
  );
}
