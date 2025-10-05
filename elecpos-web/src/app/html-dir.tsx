'use client';
import { useEffect } from 'react';
import { useLang } from '@/context/LangContext';

export default function HtmlDir() {
  const { lang } = useLang();
  useEffect(() => {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang]);
  return null;
}
