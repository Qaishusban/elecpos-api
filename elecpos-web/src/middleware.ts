// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// لا نعمل أي توجيه إطلاقاً
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

// نجعل الميدل وير غير مُفعّل عملياً
export const config = { matcher: [] };
