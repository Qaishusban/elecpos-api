"use client";
import React, { useRef, useState } from "react";

export default function RestoreButton() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [applyStorage, setApplyStorage] = useState(true);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (applyStorage) fd.append("storage", "1");

      const r = await fetch("/api/restore", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        alert(j.error || "فشل الاسترجاع");
        return;
      }
      alert("تم الاسترجاع بنجاح ✅");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".zip"
        hidden
        onChange={(e) => e.target.files && handleFile(e.target.files[0])}
      />
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={applyStorage}
          onChange={(e) => setApplyStorage(e.target.checked)}
        />
        استرجاع ملفات التخزين (صور/مرفقات)
      </label>
      <button
        className="btn"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? "جاري الاسترجاع..." : "استرجاع Backup"}
      </button>
    </div>
  );
}
