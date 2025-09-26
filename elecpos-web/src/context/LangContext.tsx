"use client";
import React, { createContext, useContext, useEffect, useState } from "react";

type Lang = "ar" | "en";

const LangContext = createContext<{
  lang: Lang;
  setLang: (lang: Lang) => void;
}>({
  lang: "ar",
  setLang: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");

  useEffect(() => {
    // جلب القيمة من localStorage إذا موجودة
    const savedLang = localStorage.getItem("lang") as Lang | null;
    if (savedLang) {
      setLang(savedLang);
      document.documentElement.setAttribute("lang", savedLang);
    } else {
      document.documentElement.setAttribute("lang", "ar");
    }
  }, []);

  useEffect(() => {
    // تحديث القيمة في localStorage لما تتغير اللغة
    localStorage.setItem("lang", lang);
    document.documentElement.setAttribute("lang", lang);
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
