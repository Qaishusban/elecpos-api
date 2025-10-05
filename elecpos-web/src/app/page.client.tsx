// src/app/page.client.tsx  (Client)
'use client';
import { useLang } from '@/context/LangContext';

export default function HomeClient() {
  const { lang } = useLang();
  return <div>{lang === 'ar' ? 'مرحباً' : 'Welcome'}</div>;
}
