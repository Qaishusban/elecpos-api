// src/app/login/LoginForm.tsx
"use client";

import { useState, useTransition } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const sb = supabaseBrowser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); return; }
    startTransition(() => router.replace("/")); // بعد النجاح
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
      <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button className="btn" disabled={pending}>{pending ? "..." : "تسجيل الدخول"}</button>
    </form>
  );
}
