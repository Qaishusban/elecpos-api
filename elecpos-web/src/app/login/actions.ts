'use server';

import { redirect } from 'next/navigation'; // تقدر تشيل revalidatePath لو مش محتاجها
import { supabaseServer } from '@/lib/supabase-server';

export async function loginAction(_prev: any, formData: FormData) {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const sb = supabaseServer();
  const { error } = await sb.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: error.message };
  }

  // لو حابب تحدّث كاش صفحة معينة (اختياري):
  // revalidatePath('/pos');

  // بعد نجاح الدخول: تحويل لصفحة نقطة البيع
  redirect('/pos');
}