"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase";

export default function LoginPage() {
  const sb = supabaseBrowser();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email"));
    const password = String(fd.get("password"));
    setBusy(true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr(error.message);
    location.href = "/movement";
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
      <form onSubmit={onSubmit} className="space-y-3 border rounded-2xl p-4 bg-white">
        <input name="email" type="email" required placeholder="البريد الإلكتروني" className="w-full border rounded p-2" />
        <input name="password" type="password" required placeholder="كلمة المرور" className="w-full border rounded p-2" />
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button disabled={busy} className="w-full border rounded p-2 bg-gray-100">{busy ? "..." : "دخول"}</button>
      </form>
    </div>
  );
}
