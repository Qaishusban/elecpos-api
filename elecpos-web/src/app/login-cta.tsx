"use client";

import { useRouter } from "next/navigation";
import React from "react";

export default function LoginCta({ children }:{ children: React.ReactNode }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push("/login")}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-black"
    >
      {children}
    </button>
  );
}
